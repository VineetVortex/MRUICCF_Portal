import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getDb, getPgPool } from '../db/index.js';
import { calculateAssessmentAttempt } from '../services/scoringService.js';
import { issueCertificate } from '../services/certificateService.js';
import { logAuditEvent } from '../services/auditService.js';
import { BASELINE_COMPETENCIES } from './competencyController.js';
import { Question, AttemptResult } from '../types/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Attempt Status Constants (matches migration 003 CHECK constraint)
// ─────────────────────────────────────────────────────────────────────────────
const STATUS = {
  ACTIVE: 'active',
  SUBMITTED: 'submitted',
  EXPIRED: 'expired',
} as const;

type AttemptStatus = (typeof STATUS)[keyof typeof STATUS];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch approved questions from DB, fallback to answer-key stub list */
async function fetchQuestions(db: ReturnType<typeof getDb>, _answers: Record<string, number>): Promise<Question[]> {
  const { data: dbQuestions } = await db
    .from('questions')
    .select('*')
    .eq('approval_status', 'approved');

  if (dbQuestions && dbQuestions.length > 0) {
    return dbQuestions.map((d: any) => ({
      id: Number(d.id),
      skillId: Number(d.skill_id),
      skillName: d.skill_name,
      text: d.text,
      isReverse: Boolean(d.is_reverse),
      difficulty: (d.difficulty || 'Intermediate') as 'Standard' | 'Intermediate' | 'Advanced',
      approvalStatus: 'approved' as const,
      createdBy: d.created_by,
    }));
  }
  return [];
}

/** Fetch competencies from DB, fallback to baseline list */
async function fetchCompetencies(db: ReturnType<typeof getDb>) {
  const { data: dbCompetencies } = await db.from('competencies').select('*');
  if (dbCompetencies && dbCompetencies.length > 0) {
    return dbCompetencies.map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      univAvg: Number(c.univ_avg || 72),
    }));
  }
  return BASELINE_COMPETENCIES;
}

/** Build a stub questions list when no questions exist in DB yet */
function buildStubQuestions(answers: Record<string, number>, competencies: any[]): Question[] {
  return Object.keys(answers).map((qid) => {
    const idNum = Number(qid);
    const compId = (idNum % 15) + 1;
    const comp = competencies.find((c) => c.id === compId) || competencies[0];
    return {
      id: idNum,
      skillId: comp.id,
      skillName: comp.name,
      text: `Question ${qid}`,
      isReverse: false,
      difficulty: 'Intermediate' as const,
      approvalStatus: 'approved' as const,
      createdBy: 'System',
    };
  });
}

/**
 * Score + finalize an attempt atomically.
 * Uses conditional UPDATE: WHERE id = $id AND status = 'active'
 * Returns null if rowCount === 0 (already finalized by a concurrent request).
 */
async function scoreAndFinalizeAttempt(
  db: ReturnType<typeof getDb>,
  attemptId: string,
  rawAttempt: any,
  mergedAnswers: Record<string, number>,
  finalStatus: AttemptStatus,
  timeSpentSeconds: number,
  timeTakenFormatted: string
): Promise<{ scoring: any; certificate: any } | null> {
  // 1. Score calculation
  const questions = await fetchQuestions(db, mergedAnswers);
  const competencies = await fetchCompetencies(db);
  const resolvedQuestions = questions.length > 0
    ? questions
    : buildStubQuestions(mergedAnswers, competencies);

  const scoring = calculateAssessmentAttempt(resolvedQuestions, mergedAnswers, competencies);

  // 2. Issue certificate if certified
  let certificate = null;
  if (scoring.isCertified) {
    certificate = await issueCertificate({
      attemptId,
      studentId: rawAttempt.user_id,
      studentName: rawAttempt.student_name,
      rollNo: rawAttempt.roll_no,
      department: rawAttempt.department,
      assessmentId: rawAttempt.assessment_id,
      assessmentName: rawAttempt.assessment_name,
      overallScore: scoring.compositeScore,
      competencyScores: scoring.competencyScores,
    });
  }

  const now = new Date().toISOString();

  // 3. Atomic conditional update — only succeeds if status is still 'active'
  const { data: updatedRows, error: updateErr } = await db
    .from('attempts')
    .update({
      status: finalStatus,
      overall_score: scoring.compositeScore,
      certification_status: scoring.certificationStatus,
      is_certified: scoring.isCertified,
      time_spent_seconds: timeSpentSeconds,
      time_taken_formatted: timeTakenFormatted,
      total_questions: resolvedQuestions.length,
      answers: mergedAnswers,
      competency_scores: scoring.competencyScores,
      strengths: scoring.strengths,
      development_areas: scoring.developmentAreas,
      submitted_at: now,
      last_activity_at: now,
    })
    .eq('id', attemptId)
    .eq('status', STATUS.ACTIVE)
    .select('id');

  if (updateErr) throw updateErr;

  // If no rows were updated another concurrent request already finalized this attempt
  if (!updatedRows || updatedRows.length === 0) return null;

  return { scoring, certificate };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2.1 & 2.2: Start or Resume an Authoritative Timed Attempt
// ─────────────────────────────────────────────────────────────────────────────
export async function startOrResumeAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { assessmentId, assessmentName, timeLimitMinutes, totalQuestions } = req.body;
  const userId    = req.user?.id || 'usr_anonymous';
  const studentName = req.user?.name || req.body.studentName || 'Student';
  const rollNo    = req.user?.rollNo || req.body.rollNo || '2024-CST-001';
  const department = req.user?.department || req.body.department || 'Computer Science & Technology';

  const asmtId         = assessmentId || 'asmt-2026-core';
  const asmtName       = assessmentName || 'Human-Centric Skills Assessment 2026';
  const durationMinutes = Number(timeLimitMinutes || 45);
  const durationSeconds = durationMinutes * 60;
  const now = new Date();

  try {
    const db = getDb();

    // 1. Check for existing ACTIVE attempt
    const { data: existing, error: fetchErr } = await db
      .from('attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', asmtId)
      .eq('status', STATUS.ACTIVE)
      .order('started_at', { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.warn('[AttemptController] Fetch existing attempt warning:', fetchErr.message);
    }

    if (existing && existing.length > 0) {
      const active = existing[0];
      const deadline = new Date(active.deadline_at);

      if (deadline.getTime() > now.getTime()) {
        // Valid active session — resume it, return immutable deadline
        const remainingSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
        res.status(200).json({
          success: true,
          resumed: true,
          message: 'Active examination session resumed.',
          data: {
            id: active.id,
            userId: active.user_id,
            studentName: active.student_name,
            rollNo: active.roll_no,
            department: active.department,
            assessmentId: active.assessment_id,
            assessmentName: active.assessment_name,
            status: STATUS.ACTIVE,
            startedAt: active.started_at,
            deadlineAt: active.deadline_at,
            durationSeconds: active.duration_seconds || durationSeconds,
            remainingSeconds,
            answers: active.answers || {},
            answeredQuestionIds: active.answered_question_ids || [],
            flaggedQuestionIds: active.flagged_question_ids || [],
            currentIndex: active.current_index || 0,
            focusLostCount: active.focus_lost_count || 0,
            lastSavedAt: active.last_saved_at,
            version: active.version || 1,
            serverTime: now.toISOString(),
          },
        });
        return;
      }

      // Deadline expired while student was away — sweep it to 'expired'
      console.log(`[AttemptController] Attempt ${active.id} deadline lapsed. Auto-expiring.`);
      const mergedAnswers = active.answers || {};
      const timeSpent = Math.round((deadline.getTime() - new Date(active.started_at).getTime()) / 1000);
      await scoreAndFinalizeAttempt(db, active.id, active, mergedAnswers, STATUS.EXPIRED, timeSpent, `${durationMinutes}m 0s`);
      logAuditEvent('ASSESSMENT_LOG', `Attempt ${active.id} auto-expired on reconnect`, userId, { attemptId: active.id });
    }

    // 2. No active session found — create a fresh one
    const attemptId  = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startedAt  = now.toISOString();
    const deadlineAt = new Date(now.getTime() + durationSeconds * 1000).toISOString();

    const newRecord = {
      id: attemptId,
      user_id: userId,
      student_name: studentName,
      roll_no: rollNo,
      department,
      assessment_id: asmtId,
      assessment_name: asmtName,
      status: STATUS.ACTIVE,
      started_at: startedAt,
      deadline_at: deadlineAt,
      duration_seconds: durationSeconds,
      total_questions: Number(totalQuestions || 45),
      answers: {},
      answered_question_ids: [],
      flagged_question_ids: [],
      current_index: 0,
      focus_lost_count: 0,
      integrity_events: [],
      last_saved_at: startedAt,
      last_activity_at: startedAt,
      version: 1,
      overall_score: 0,
      certification_status: 'In Progress',
      is_certified: false,
      competency_scores: [],
      strengths: [],
      development_areas: [],
      created_at: startedAt,
    };

    const { error: insertErr } = await db.from('attempts').insert([newRecord]);
    if (insertErr) throw insertErr;

    logAuditEvent('ASSESSMENT_LOG', `New exam session started: ${asmtName} (${durationMinutes}m)`, userId, {
      attemptId,
      deadlineAt,
    });

    res.status(201).json({
      success: true,
      resumed: false,
      message: 'Examination session initiated with authoritative server deadline.',
      data: {
        id: attemptId,
        userId,
        studentName,
        rollNo,
        department,
        assessmentId: asmtId,
        assessmentName: asmtName,
        status: STATUS.ACTIVE,
        startedAt,
        deadlineAt,
        durationSeconds,
        remainingSeconds: durationSeconds,
        answers: {},
        answeredQuestionIds: [],
        flaggedQuestionIds: [],
        currentIndex: 0,
        focusLostCount: 0,
        version: 1,
        serverTime: startedAt,
      },
    });
  } catch (err: any) {
    console.error('[AttemptController] Error starting examination session:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to initialize examination session.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2.4: Get Current Active Attempt (for resume on reconnect)
// ─────────────────────────────────────────────────────────────────────────────
export async function getActiveAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(400).json({ success: false, error: 'User ID is required.' });
    return;
  }

  try {
    const db  = getDb();
    const now = new Date();

    const { data: attempts, error } = await db
      .from('attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', STATUS.ACTIVE)
      .order('started_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!attempts || attempts.length === 0) {
      res.status(200).json({ success: true, active: false, data: null });
      return;
    }

    const active   = attempts[0];
    const deadline = new Date(active.deadline_at);

    if (deadline.getTime() <= now.getTime()) {
      // Auto-sweep expired attempt
      const mergedAnswers = active.answers || {};
      const timeSpent = Math.round((deadline.getTime() - new Date(active.started_at).getTime()) / 1000);
      const duration  = active.duration_seconds || 2700;
      const m = Math.floor(duration / 60);
      await scoreAndFinalizeAttempt(db, active.id, active, mergedAnswers, STATUS.EXPIRED, timeSpent, `${m}m 0s`);
      res.status(200).json({ success: true, active: false, data: null, expired: true });
      return;
    }

    const remainingSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));

    res.status(200).json({
      success: true,
      active: true,
      data: {
        id: active.id,
        userId: active.user_id,
        studentName: active.student_name,
        rollNo: active.roll_no,
        department: active.department,
        assessmentId: active.assessment_id,
        assessmentName: active.assessment_name,
        status: STATUS.ACTIVE,
        startedAt: active.started_at,
        deadlineAt: active.deadline_at,
        durationSeconds: active.duration_seconds,
        remainingSeconds,
        answers: active.answers || {},
        answeredQuestionIds: active.answered_question_ids || [],
        flaggedQuestionIds: active.flagged_question_ids || [],
        currentIndex: active.current_index || 0,
        focusLostCount: active.focus_lost_count || 0,
        version: active.version || 1,
        serverTime: now.toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch active attempt.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2.3: Reliable Answer Autosave (deadline-validated, ownership-checked)
// ─────────────────────────────────────────────────────────────────────────────
export async function autosaveAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { answers, answeredQuestionIds, flaggedQuestionIds, currentIndex, version: clientVersion } = req.body;
  const now = new Date();

  try {
    const db = getDb();

    // Verify attempt exists and is owned by authenticated student
    const { data: attempt, error: fetchErr } = await db
      .from('attempts')
      .select('id, user_id, status, deadline_at, version, answers, started_at, duration_seconds')
      .eq('id', id)
      .single();

    if (fetchErr || !attempt) {
      res.status(404).json({ success: false, error: 'Attempt record not found.' });
      return;
    }

    // Ownership check
    if (req.user?.id && attempt.user_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'Unauthorized: attempt belongs to a different student.' });
      return;
    }

    // If already finalized, reject gracefully
    if (attempt.status !== STATUS.ACTIVE) {
      res.status(409).json({
        success: false,
        finalized: true,
        status: attempt.status,
        error: `Attempt is already finalized (${attempt.status}). No further modifications allowed.`,
      });
      return;
    }

    // Deadline enforcement — auto-sweep if expired
    const deadline = new Date(attempt.deadline_at);
    if (now.getTime() > deadline.getTime()) {
      const mergedAnswers = { ...(attempt.answers || {}), ...(answers || {}) };
      const duration = attempt.duration_seconds || 2700;
      const m = Math.floor(duration / 60);
      const sweepResult = await scoreAndFinalizeAttempt(
        db, id, attempt, mergedAnswers, STATUS.EXPIRED,
        Math.round((deadline.getTime() - new Date(attempt.started_at).getTime()) / 1000),
        `${m}m 0s`
      );
      logAuditEvent('ASSESSMENT_LOG', `Attempt ${id} auto-expired on autosave`, attempt.user_id, { attemptId: id });
      res.status(410).json({
        success: false,
        expired: true,
        message: 'Examination deadline has passed. Assessment has been automatically submitted with your received answers.',
        data: sweepResult ? { status: STATUS.EXPIRED, score: sweepResult.scoring.compositeScore } : undefined,
      });
      return;
    }

    // Merge answers safely
    const mergedAnswers = { ...(attempt.answers || {}), ...(answers || {}) };
    const nextVersion = (attempt.version || 0) + 1;
    const saveTimestamp = now.toISOString();

    const { error: updateErr } = await db
      .from('attempts')
      .update({
        answers: mergedAnswers,
        answered_question_ids: answeredQuestionIds || Object.keys(mergedAnswers),
        flagged_question_ids: flaggedQuestionIds || [],
        current_index: typeof currentIndex === 'number' ? currentIndex : 0,
        last_saved_at: saveTimestamp,
        last_activity_at: saveTimestamp,
        version: nextVersion,
      })
      .eq('id', id)
      .eq('status', STATUS.ACTIVE); // Extra guard: only update if still active

    if (updateErr) throw updateErr;

    res.status(200).json({
      success: true,
      lastSavedAt: saveTimestamp,
      version: nextVersion,
      serverTime: saveTimestamp,
      answeredCount: Object.keys(mergedAnswers).length,
    });
  } catch (err: any) {
    console.error('[AttemptController] Autosave error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to persist autosave.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: Integrity Event Logger
// ─────────────────────────────────────────────────────────────────────────────
export async function logIntegrityEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { type, note } = req.body;
  const now = new Date();

  try {
    const db = getDb();
    const { data: attempt, error: fetchErr } = await db
      .from('attempts')
      .select('id, user_id, status, focus_lost_count, integrity_events, answers, started_at, duration_seconds, assessment_id, assessment_name, student_name, roll_no, department')
      .eq('id', id)
      .single();

    if (fetchErr || !attempt) {
      res.status(404).json({ success: false, error: 'Attempt not found.' });
      return;
    }

    // Ownership
    if (req.user?.id && attempt.user_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const currentCount = Number(attempt.focus_lost_count || 0) + 1;
    const existingEvents = Array.isArray(attempt.integrity_events) ? attempt.integrity_events : [];
    const newEvent = {
      type: type || 'TAB_SWITCH',
      timestamp: now.toISOString(),
      count: currentCount,
      note: note || 'Tab switched, minimized, or window lost focus',
    };

    // If 3 or more strikes reached, immediately auto-finalize attempt!
    if (currentCount >= 3 && attempt.status === STATUS.ACTIVE) {
      const mergedAnswers = attempt.answers || {};
      const duration = attempt.duration_seconds || 2700;
      const spentSeconds = Math.max(1, Math.round((now.getTime() - new Date(attempt.started_at).getTime()) / 1000));
      const m = Math.floor(spentSeconds / 60);
      const s = spentSeconds % 60;
      const formatted = `${m}m ${s}s`;

      await db
        .from('attempts')
        .update({
          focus_lost_count: currentCount,
          integrity_events: [...existingEvents, newEvent],
          last_activity_at: now.toISOString(),
        })
        .eq('id', id);

      const sweepResult = await scoreAndFinalizeAttempt(
        db,
        id,
        attempt,
        mergedAnswers,
        STATUS.SUBMITTED,
        spentSeconds,
        formatted
      );

      logAuditEvent('SECURITY_LOG', `CRITICAL: Attempt #${id} automatically submitted after 3 integrity violations.`, attempt.user_id, {
        attemptId: id,
        totalViolations: currentCount,
        action: 'AUTO_SUBMIT_ON_INTEGRITY_BREACH'
      });

      res.status(200).json({
        success: true,
        autoSubmitted: true,
        breachExceeded: true,
        focusLostCount: currentCount,
        message: 'Academic integrity threshold exceeded (3 warnings). Examination automatically finalized and submitted.',
        data: sweepResult ? { score: sweepResult.scoring?.compositeScore } : undefined
      });
      return;
    }

    await db
      .from('attempts')
      .update({
        focus_lost_count: currentCount,
        integrity_events: [...existingEvents, newEvent],
        last_activity_at: now.toISOString(),
      })
      .eq('id', id);

    logAuditEvent('SECURITY_LOG', `Integrity event: ${type} on attempt #${id} (count: ${currentCount})`, attempt.user_id, {
      attemptId: id,
      type,
      currentCount,
    });

    res.status(200).json({
      success: true,
      autoSubmitted: false,
      focusLostCount: currentCount,
      remainingWarnings: Math.max(0, 3 - currentCount),
      serverTime: now.toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to log integrity event.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2.6: Idempotent, Atomic Finalization — concurrent-safe
// ─────────────────────────────────────────────────────────────────────────────
export async function finalizeAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { answers: submittedAnswers, timeSpentSeconds, timeTakenFormatted } = req.body;
  const now = new Date();

  try {
    const db = getDb();

    // 1. Fetch latest attempt state
    const { data: attempt, error: fetchErr } = await db
      .from('attempts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !attempt) {
      res.status(404).json({ success: false, error: 'Attempt record not found.' });
      return;
    }

    // Ownership
    if (req.user?.id && attempt.user_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'Unauthorized: attempt belongs to a different student.' });
      return;
    }

    // 2. Idempotency — if already finalized return stored result without re-scoring
    if (attempt.status === STATUS.SUBMITTED || attempt.status === STATUS.EXPIRED) {
      res.status(200).json({
        success: true,
        alreadyFinalized: true,
        message: `Attempt was already finalized with status: ${attempt.status}.`,
        data: {
          attempt: formatFinalizedAttempt(attempt),
        },
      });
      return;
    }

    // 3. Merge submitted answers on top of autosaved answers
    const mergedAnswers = { ...(attempt.answers || {}), ...(submittedAnswers || {}) };

    // Determine final status
    const deadline   = new Date(attempt.deadline_at);
    const isExpired  = deadline.getTime() < now.getTime();
    const finalStatus: AttemptStatus = isExpired ? STATUS.EXPIRED : STATUS.SUBMITTED;

    const spentSeconds = Number(timeSpentSeconds) || Math.round((now.getTime() - new Date(attempt.started_at).getTime()) / 1000);
    const m = Math.floor(spentSeconds / 60);
    const s = spentSeconds % 60;
    const formatted = timeTakenFormatted || `${m}m ${s}s`;

    // 4. Atomic finalization (only proceeds if status is still 'active')
    const result = await scoreAndFinalizeAttempt(db, id, attempt, mergedAnswers, finalStatus, spentSeconds, formatted);

    if (!result) {
      // Concurrent request already finalized — fetch fresh record and return it
      const { data: fresh } = await db.from('attempts').select('*').eq('id', id).single();
      res.status(200).json({
        success: true,
        alreadyFinalized: true,
        message: 'Attempt was finalized by a concurrent request.',
        data: { attempt: fresh ? formatFinalizedAttempt(fresh) : null },
      });
      return;
    }

    const { scoring, certificate } = result;

    logAuditEvent('ASSESSMENT_LOG', `Assessment finalized (#${id}): Score ${scoring.compositeScore}% (${scoring.certificationStatus})`, attempt.user_id, {
      attemptId: id,
      status: finalStatus,
      overallScore: scoring.compositeScore,
      isCertified: scoring.isCertified,
      certificateNumber: certificate?.certificateNumber,
    });

    res.status(200).json({
      success: true,
      message: 'Assessment finalized successfully with authoritative server grading.',
      data: {
        attempt: {
          id: attempt.id,
          userId: attempt.user_id,
          studentName: attempt.student_name,
          rollNo: attempt.roll_no,
          department: attempt.department,
          assessmentId: attempt.assessment_id,
          assessmentName: attempt.assessment_name,
          overallScore: scoring.compositeScore,
          certificationStatus: scoring.certificationStatus,
          isCertified: scoring.isCertified,
          status: finalStatus,
          timeSpentSeconds: spentSeconds,
          timeTakenFormatted: formatted,
          answers: mergedAnswers,
          competencyScores: scoring.competencyScores,
          strengths: scoring.strengths,
          developmentAreas: scoring.developmentAreas,
          submittedAt: now.toISOString(),
          createdAt: attempt.created_at,
        },
        certificate,
      },
    });
  } catch (err: any) {
    console.error('[AttemptController] Error finalizing attempt:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to finalize assessment attempt.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for read routes
// ─────────────────────────────────────────────────────────────────────────────
function formatFinalizedAttempt(d: any): AttemptResult {
  return {
    id: d.id,
    userId: d.user_id,
    studentName: d.student_name,
    rollNo: d.roll_no,
    department: d.department,
    assessmentId: d.assessment_id,
    assessmentName: d.assessment_name,
    overallScore: Number(d.overall_score),
    certificationStatus: d.certification_status,
    isCertified: Boolean(d.is_certified),
    status: d.status,
    timeSpentSeconds: Number(d.time_spent_seconds || 0),
    timeTakenFormatted: d.time_taken_formatted,
    totalQuestions: Number(d.total_questions || 0),
    answers: d.answers || {},
    competencyScores: d.competency_scores || [],
    strengths: d.strengths || [],
    developmentAreas: d.development_areas || [],
    startedAt: d.started_at,
    deadlineAt: d.deadline_at,
    submittedAt: d.submitted_at,
    createdAt: d.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy read/write endpoints — unchanged behaviour, refreshed helper usage
// ─────────────────────────────────────────────────────────────────────────────
export async function submitAssessmentAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { assessmentId, assessmentName, answers, timeSpentSeconds, timeTakenFormatted } = req.body;

  if (!answers || typeof answers !== 'object') {
    res.status(400).json({ success: false, error: 'Answers map is required.' });
    return;
  }

  const userId      = req.user?.id || 'usr_anonymous';
  const studentName = req.user?.name || req.body.studentName || 'Student';
  const rollNo      = req.user?.rollNo || req.body.rollNo || '2024-CST-001';
  const department  = req.user?.department || req.body.department || 'Computer Science & Technology';

  try {
    const db = getDb();
    const questions    = await fetchQuestions(db, answers);
    const competencies = await fetchCompetencies(db);
    const resolvedQs   = questions.length > 0 ? questions : buildStubQuestions(answers, competencies);
    const scoring      = calculateAssessmentAttempt(resolvedQs, answers, competencies);

    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now       = new Date().toISOString();

    const attempt: AttemptResult = {
      id: attemptId,
      userId,
      studentName,
      rollNo,
      department,
      assessmentId: assessmentId || 'asmt-2026-core',
      assessmentName: assessmentName || 'Human-Centric Skills Assessment 2026',
      overallScore: scoring.compositeScore,
      certificationStatus: scoring.certificationStatus as 'Certified' | 'Needs Improvement',
      isCertified: scoring.isCertified,
      timeSpentSeconds: Number(timeSpentSeconds) || 0,
      timeTakenFormatted: timeTakenFormatted || '42m 15s',
      totalQuestions: resolvedQs.length,
      answers,
      competencyScores: scoring.competencyScores,
      strengths: scoring.strengths,
      developmentAreas: scoring.developmentAreas,
      createdAt: now,
    };

    await db.from('attempts').insert([{
      id: attempt.id,
      user_id: attempt.userId,
      student_name: attempt.studentName,
      roll_no: attempt.rollNo,
      department: attempt.department,
      assessment_id: attempt.assessmentId,
      assessment_name: attempt.assessmentName,
      overall_score: attempt.overallScore,
      certification_status: attempt.certificationStatus,
      is_certified: attempt.isCertified,
      time_spent_seconds: attempt.timeSpentSeconds,
      time_taken_formatted: attempt.timeTakenFormatted,
      total_questions: attempt.totalQuestions,
      answers: attempt.answers,
      competency_scores: attempt.competencyScores,
      strengths: attempt.strengths,
      development_areas: attempt.developmentAreas,
      status: STATUS.SUBMITTED,
      submitted_at: now,
    }]);

    let certificate = null;
    if (attempt.isCertified) {
      certificate = await issueCertificate({
        attemptId: attempt.id,
        studentId: attempt.userId,
        studentName: attempt.studentName,
        rollNo: attempt.rollNo,
        department: attempt.department,
        assessmentId: attempt.assessmentId,
        assessmentName: attempt.assessmentName,
        overallScore: attempt.overallScore,
        competencyScores: attempt.competencyScores,
      });
    }

    logAuditEvent('ASSESSMENT_LOG', `Assessment submitted: Score ${attempt.overallScore}% (${attempt.certificationStatus})`, attempt.userId, {
      attemptId: attempt.id,
      overallScore: attempt.overallScore,
      isCertified: attempt.isCertified,
    });

    res.status(201).json({ success: true, message: 'Assessment evaluated and persisted.', data: { attempt, certificate } });
  } catch (err: any) {
    console.error('[AttemptController] Legacy submit error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to evaluate assessment.' });
  }
}

export async function getUserAttempts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = (req.params.userId as string) || req.user?.id || 'usr_anonymous';
  try {
    const db = getDb();
    const { data, error } = await db
      .from('attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, count: (data || []).length, data: (data || []).map(formatFinalizedAttempt) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch user attempts.' });
  }
}

export async function getAttemptById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const db = getDb();
    const { data, error } = await db.from('attempts').select('*').eq('id', id).single();
    if (error || !data) {
      res.status(404).json({ success: false, error: 'Attempt not found.' });
      return;
    }
    res.status(200).json({ success: true, data: formatFinalizedAttempt(data) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch attempt.' });
  }
}

export async function getAllAttempts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const db = getDb();
    const { data, error } = await db.from('attempts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json({ success: true, count: (data || []).length, data: (data || []).map(formatFinalizedAttempt) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch all attempts.' });
  }
}
