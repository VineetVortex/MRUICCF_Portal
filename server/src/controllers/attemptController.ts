import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getDb } from '../db/index.js';
import { calculateAssessmentAttempt } from '../services/scoringService.js';
import { issueCertificate } from '../services/certificateService.js';
import { logAuditEvent } from '../services/auditService.js';
import { BASELINE_COMPETENCIES } from './competencyController.js';
import { Question, AttemptResult } from '../types/index.js';

export async function submitAssessmentAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    assessmentId,
    assessmentName,
    answers,
    timeSpentSeconds,
    timeTakenFormatted,
  } = req.body;

  if (!answers || typeof answers !== 'object') {
    res.status(400).json({ success: false, error: 'Answers map is required.' });
    return;
  }

  const userId = req.user?.id || req.body.userId || 'usr_riya_sharma';
  const studentName = req.user?.name || req.body.studentName || 'Riya Sharma';
  const rollNo = req.user?.rollNo || req.body.rollNo || '22CSE0002';
  const department = req.user?.department || req.body.department || 'Computer Science & Engineering';

  try {
    const db = getDb();

    // 1. Fetch approved questions to grade against
    const { data: dbQuestions } = await db
      .from('questions')
      .select('*')
      .eq('approval_status', 'approved');

    let questions: Question[] = [];
    if (dbQuestions && dbQuestions.length > 0) {
      questions = dbQuestions.map((d: any) => ({
        id: Number(d.id),
        skillId: Number(d.skill_id),
        skillName: d.skill_name,
        text: d.text,
        isReverse: Boolean(d.is_reverse),
        difficulty: d.difficulty || 'Intermediate',
        approvalStatus: 'approved',
        createdBy: d.created_by,
      }));
    }

    // 2. Fetch competencies or fallback to baseline
    const { data: dbCompetencies } = await db.from('competencies').select('*');
    const competencies = (dbCompetencies && dbCompetencies.length > 0)
      ? dbCompetencies.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          univAvg: Number(c.univ_avg || 72),
        }))
      : BASELINE_COMPETENCIES;

    // If no questions in DB yet, construct dummy evaluation questions from answered IDs
    if (questions.length === 0) {
      questions = Object.keys(answers).map((qid) => {
        const idNum = Number(qid);
        const compId = (idNum % 15) + 1;
        const comp = competencies.find((c) => c.id === compId) || competencies[0];
        return {
          id: idNum,
          skillId: comp.id,
          skillName: comp.name,
          text: `Question ${qid}`,
          isReverse: false,
          difficulty: 'Intermediate',
          approvalStatus: 'approved',
          createdBy: 'System',
        };
      });
    }

    // 3. Perform robust server-side scoring calculation
    const scoring = calculateAssessmentAttempt(questions, answers, competencies);

    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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
      totalQuestions: questions.length,
      answers,
      competencyScores: scoring.competencyScores,
      strengths: scoring.strengths,
      developmentAreas: scoring.developmentAreas,
      createdAt: new Date().toISOString(),
    };

    // 4. Persist attempt record to Supabase
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
    }]);

    // 5. Issue certificate if passing (score >= 65.0%)
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

    logAuditEvent('ASSESSMENT_LOG', `Assessment submitted by ${attempt.studentName}: Score ${attempt.overallScore}% (${attempt.certificationStatus})`, attempt.userId, {
      attemptId: attempt.id,
      overallScore: attempt.overallScore,
      isCertified: attempt.isCertified,
      certificateNumber: certificate?.certificateNumber,
    });

    res.status(201).json({
      success: true,
      message: 'Assessment evaluated and persisted successfully.',
      data: {
        attempt,
        certificate,
      },
    });
  } catch (err: any) {
    console.error('[AttemptController] Error evaluating attempt:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to evaluate assessment attempt.' });
  }
}

export async function getUserAttempts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.params.userId || req.user?.id || 'usr_riya_sharma';

  try {
    const db = getDb();
    const { data, error } = await db
      .from('attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted: AttemptResult[] = (data || []).map((d: any) => ({
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
      timeSpentSeconds: Number(d.time_spent_seconds || 0),
      timeTakenFormatted: d.time_taken_formatted,
      totalQuestions: Number(d.total_questions || 0),
      answers: d.answers || {},
      competencyScores: d.competency_scores || [],
      strengths: d.strengths || [],
      developmentAreas: d.development_areas || [],
      createdAt: d.created_at,
    }));

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch user attempts.' });
  }
}

export async function getAttemptById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const db = getDb();
    const { data, error } = await db
      .from('attempts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ success: false, error: 'Attempt not found.' });
      return;
    }

    const formatted: AttemptResult = {
      id: data.id,
      userId: data.user_id,
      studentName: data.student_name,
      rollNo: data.roll_no,
      department: data.department,
      assessmentId: data.assessment_id,
      assessmentName: data.assessment_name,
      overallScore: Number(data.overall_score),
      certificationStatus: data.certification_status,
      isCertified: Boolean(data.is_certified),
      timeSpentSeconds: Number(data.time_spent_seconds || 0),
      timeTakenFormatted: data.time_taken_formatted,
      totalQuestions: Number(data.total_questions || 0),
      answers: data.answers || {},
      competencyScores: data.competency_scores || [],
      strengths: data.strengths || [],
      developmentAreas: data.development_areas || [],
      createdAt: data.created_at,
    };

    res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch attempt.' });
  }
}

export async function getAllAttempts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const db = getDb();
    const { data, error } = await db
      .from('attempts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted: AttemptResult[] = (data || []).map((d: any) => ({
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
      timeSpentSeconds: Number(d.time_spent_seconds || 0),
      timeTakenFormatted: d.time_taken_formatted,
      totalQuestions: Number(d.total_questions || 0),
      answers: d.answers || {},
      competencyScores: d.competency_scores || [],
      strengths: d.strengths || [],
      developmentAreas: d.development_areas || [],
      createdAt: d.created_at,
    }));

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch all attempts.' });
  }
}

/**
 * Phase 2.1 & 2.2: Start or Resume an Authoritative Timed Attempt
 * Guaranteed deadline enforcement, idempotent resume
 */
export async function startOrResumeAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { assessmentId, assessmentName, timeLimitMinutes, totalQuestions } = req.body;
  const userId = req.user?.id || req.body.userId || 'usr_anonymous';
  const studentName = req.user?.name || req.body.studentName || 'Student';
  const rollNo = req.user?.rollNo || req.body.rollNo || '2024-CST-001';
  const department = req.user?.department || req.body.department || 'Computer Science & Technology';

  const asmtId = assessmentId || 'asmt-2026-core';
  const asmtName = assessmentName || 'Human-Centric Skills Assessment 2026';
  const durationMinutes = Number(timeLimitMinutes || 45);
  const durationSeconds = durationMinutes * 60;
  const now = new Date();

  try {
    const db = getDb();

    // 1. Check for existing in_progress attempt
    const { data: existingAttempts, error: fetchErr } = await db
      .from('attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', asmtId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.warn('[AttemptController] Check existing attempt notice:', fetchErr.message);
    }

    if (existingAttempts && existingAttempts.length > 0) {
      const active = existingAttempts[0];
      const deadline = new Date(active.deadline_at);

      // If still within valid deadline window, resume seamlessly
      if (deadline.getTime() > now.getTime()) {
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
            status: active.status,
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
      } else {
        // Authoritative deadline expired while away: auto-submit it
        console.log(`[AttemptController] Attempt ${active.id} deadline expired. Triggering auto-submission.`);
        await db
          .from('attempts')
          .update({
            status: 'auto_submitted',
            submitted_at: now.toISOString(),
            certification_status: 'Expired',
          })
          .eq('id', active.id);
      }
    }

    // 2. Start a fresh, authoritative attempt session
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startedAt = now.toISOString();
    const deadlineAt = new Date(now.getTime() + durationSeconds * 1000).toISOString();

    const newRecord = {
      id: attemptId,
      user_id: userId,
      student_name: studentName,
      roll_no: rollNo,
      department: department,
      assessment_id: asmtId,
      assessment_name: asmtName,
      status: 'in_progress',
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

    logAuditEvent('ASSESSMENT_LOG', `Started examination session: ${asmtName} (${durationMinutes}m)`, userId, {
      attemptId,
      deadlineAt,
      durationSeconds,
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
        status: 'in_progress',
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

/**
 * Phase 2.4: Get Current Active Attempt for student
 */
export async function getActiveAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id || req.query.userId as string;
  if (!userId) {
    res.status(400).json({ success: false, error: 'User ID is required' });
    return;
  }

  try {
    const db = getDb();
    const now = new Date();

    const { data: attempts, error } = await db
      .from('attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!attempts || attempts.length === 0) {
      res.status(200).json({ success: true, active: false, data: null });
      return;
    }

    const active = attempts[0];
    const deadline = new Date(active.deadline_at);

    if (deadline.getTime() <= now.getTime()) {
      // Auto-expire
      await db
        .from('attempts')
        .update({ status: 'auto_submitted', certification_status: 'Expired', submitted_at: now.toISOString() })
        .eq('id', active.id);

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
        status: active.status,
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

/**
 * Phase 2.3: Reliable Answer Autosave with Deadline Validation
 */
export async function autosaveAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const {
    answers,
    answeredQuestionIds,
    flaggedQuestionIds,
    currentIndex,
    version,
    lastActivityAt,
  } = req.body;

  const now = new Date();

  try {
    const db = getDb();

    // 1. Fetch current attempt to verify status and deadline
    const { data: attempt, error: fetchErr } = await db
      .from('attempts')
      .select('id, user_id, status, deadline_at, version, answers')
      .eq('id', id)
      .single();

    if (fetchErr || !attempt) {
      res.status(404).json({ success: false, error: 'Attempt record not found.' });
      return;
    }

    // Verify ownership
    if (req.user?.id && attempt.user_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'Unauthorized attempt access.' });
      return;
    }

    if (attempt.status !== 'in_progress') {
      res.status(409).json({
        success: false,
        finalized: true,
        error: `Attempt is already finalized with status: ${attempt.status}.`,
      });
      return;
    }

    // Authoritative Deadline Enforcement
    const deadline = new Date(attempt.deadline_at);
    if (now.getTime() > deadline.getTime()) {
      await db
        .from('attempts')
        .update({
          status: 'auto_submitted',
          submitted_at: now.toISOString(),
          certification_status: 'Expired',
        })
        .eq('id', id);

      res.status(410).json({
        success: false,
        expired: true,
        message: 'Authoritative examination deadline expired. Assessment auto-submitted.',
      });
      return;
    }

    // Merge answers safely in case of rapid async updates
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
        last_activity_at: lastActivityAt || saveTimestamp,
        version: nextVersion,
      })
      .eq('id', id);

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

/**
 * Phase 3: Integrity Event Logger (Tab Switch & Fullscreen Monitoring)
 */
export async function logIntegrityEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { type, note } = req.body;
  const now = new Date();

  try {
    const db = getDb();
    const { data: attempt, error: fetchErr } = await db
      .from('attempts')
      .select('id, user_id, focus_lost_count, integrity_events')
      .eq('id', id)
      .single();

    if (fetchErr || !attempt) {
      res.status(404).json({ success: false, error: 'Attempt not found.' });
      return;
    }

    const currentCount = Number(attempt.focus_lost_count || 0) + 1;
    const existingEvents = Array.isArray(attempt.integrity_events) ? attempt.integrity_events : [];
    const newEvent = {
      type: type || 'TAB_SWITCH',
      timestamp: now.toISOString(),
      count: currentCount,
      note: note || 'Tab switched or window lost focus',
    };
    const updatedEvents = [...existingEvents, newEvent];

    await db
      .from('attempts')
      .update({
        focus_lost_count: currentCount,
        integrity_events: updatedEvents,
        last_activity_at: now.toISOString(),
      })
      .eq('id', id);

    logAuditEvent('SECURITY_LOG', `Exam Integrity event: ${type} on attempt #${id} (Event #${currentCount})`, attempt.user_id, {
      attemptId: id,
      type,
      currentCount,
    });

    res.status(200).json({
      success: true,
      focusLostCount: currentCount,
      serverTime: now.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to log integrity event.' });
  }
}

/**
 * Phase 2.6: Authoritative Idempotent Submission and Finalization
 */
export async function finalizeAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { answers: finalAnswers, timeSpentSeconds, timeTakenFormatted } = req.body;
  const now = new Date();

  try {
    const db = getDb();

    // 1. Fetch attempt record
    const { data: attempt, error: fetchErr } = await db
      .from('attempts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !attempt) {
      res.status(404).json({ success: false, error: 'Attempt record not found.' });
      return;
    }

    // Idempotency: If already submitted or auto_submitted, return stored result
    if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
      res.status(200).json({
        success: true,
        alreadyFinalized: true,
        message: 'Attempt is already finalized.',
        data: {
          attempt: {
            id: attempt.id,
            userId: attempt.user_id,
            studentName: attempt.student_name,
            rollNo: attempt.roll_no,
            department: attempt.department,
            assessmentId: attempt.assessment_id,
            assessmentName: attempt.assessment_name,
            overallScore: Number(attempt.overall_score),
            certificationStatus: attempt.certification_status,
            isCertified: Boolean(attempt.is_certified),
            status: attempt.status,
            answers: attempt.answers || {},
            competencyScores: attempt.competency_scores || [],
            strengths: attempt.strengths || [],
            developmentAreas: attempt.development_areas || [],
            createdAt: attempt.created_at,
            submittedAt: attempt.submitted_at,
          },
        },
      });
      return;
    }

    // Merge latest submitted answers with existing autosaved answers
    const answers = { ...(attempt.answers || {}), ...(finalAnswers || {}) };

    // 2. Fetch approved questions to grade against
    const { data: dbQuestions } = await db
      .from('questions')
      .select('*')
      .eq('approval_status', 'approved');

    let questions: Question[] = [];
    if (dbQuestions && dbQuestions.length > 0) {
      questions = dbQuestions.map((d: any) => ({
        id: Number(d.id),
        skillId: Number(d.skill_id),
        skillName: d.skill_name,
        text: d.text,
        isReverse: Boolean(d.is_reverse),
        difficulty: d.difficulty || 'Intermediate',
        approvalStatus: 'approved',
        createdBy: d.created_by,
      }));
    }

    // 3. Fetch competencies
    const { data: dbCompetencies } = await db.from('competencies').select('*');
    const competencies = (dbCompetencies && dbCompetencies.length > 0)
      ? dbCompetencies.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          univAvg: Number(c.univ_avg || 72),
        }))
      : BASELINE_COMPETENCIES;

    // Fallback if no questions in DB yet
    if (questions.length === 0) {
      questions = Object.keys(answers).map((qid) => {
        const idNum = Number(qid);
        const compId = (idNum % 15) + 1;
        const comp = competencies.find((c) => c.id === compId) || competencies[0];
        return {
          id: idNum,
          skillId: comp.id,
          skillName: comp.name,
          text: `Question ${qid}`,
          isReverse: false,
          difficulty: 'Intermediate',
          approvalStatus: 'approved',
          createdBy: 'System',
        };
      });
    }

    // 4. Score calculation
    const scoring = calculateAssessmentAttempt(questions, answers, competencies);
    const deadline = new Date(attempt.deadline_at);
    const isExpired = deadline.getTime() < now.getTime();
    const finalStatus = isExpired ? 'auto_submitted' : 'submitted';

    // 5. Issue certificate if passing (score >= 65.0%)
    let certificate = null;
    if (scoring.isCertified) {
      certificate = await issueCertificate({
        attemptId: attempt.id,
        studentId: attempt.user_id,
        studentName: attempt.student_name,
        rollNo: attempt.roll_no,
        department: attempt.department,
        assessmentId: attempt.assessment_id,
        assessmentName: attempt.assessment_name,
        overallScore: scoring.compositeScore,
        competencyScores: scoring.competencyScores,
      });
    }

    // 6. Update attempt record in Supabase
    await db
      .from('attempts')
      .update({
        status: finalStatus,
        overall_score: scoring.compositeScore,
        certification_status: scoring.certificationStatus,
        is_certified: scoring.isCertified,
        time_spent_seconds: Number(timeSpentSeconds) || attempt.duration_seconds || 0,
        time_taken_formatted: timeTakenFormatted || '42m 15s',
        total_questions: questions.length,
        answers,
        competency_scores: scoring.competencyScores,
        strengths: scoring.strengths,
        development_areas: scoring.developmentAreas,
        submitted_at: now.toISOString(),
      })
      .eq('id', id);

    logAuditEvent('ASSESSMENT_LOG', `Assessment finalized (#${id}) for ${attempt.student_name}: Score ${scoring.compositeScore}% (${scoring.certificationStatus})`, attempt.user_id, {
      attemptId: id,
      status: finalStatus,
      overallScore: scoring.compositeScore,
      isCertified: scoring.isCertified,
      certificateNumber: certificate?.certificateNumber,
    });

    const finalizedAttempt: AttemptResult = {
      id: attempt.id,
      userId: attempt.user_id,
      studentName: attempt.student_name,
      rollNo: attempt.roll_no,
      department: attempt.department,
      assessmentId: attempt.assessment_id,
      assessmentName: attempt.assessment_name,
      overallScore: scoring.compositeScore,
      certificationStatus: scoring.certificationStatus as 'Certified' | 'Needs Improvement',
      isCertified: scoring.isCertified,
      timeSpentSeconds: Number(timeSpentSeconds) || 0,
      timeTakenFormatted: timeTakenFormatted || '42m 15s',
      totalQuestions: questions.length,
      answers,
      competencyScores: scoring.competencyScores,
      strengths: scoring.strengths,
      developmentAreas: scoring.developmentAreas,
      status: finalStatus,
      submittedAt: now.toISOString(),
      createdAt: attempt.created_at,
    };

    res.status(200).json({
      success: true,
      message: 'Assessment finalized successfully with authoritative server grading.',
      data: {
        attempt: finalizedAttempt,
        certificate,
      },
    });
  } catch (err: any) {
    console.error('[AttemptController] Error finalizing attempt:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to finalize assessment attempt.' });
  }
}

