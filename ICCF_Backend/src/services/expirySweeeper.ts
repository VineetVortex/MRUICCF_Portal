/**
 * Exam Expiry Sweeper
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs every 60 seconds to auto-finalize any 'active' attempts whose
 * deadline_at has passed, even if no HTTP request came in to trigger it.
 * This ensures abandoned exams never remain in limbo.
 */

import { getDb } from '../db/index.js';
import { calculateAssessmentAttempt } from './scoringService.js';
import { issueCertificate } from './certificateService.js';
import { logAuditEvent } from './auditService.js';
import { BASELINE_COMPETENCIES } from '../controllers/competencyController.js';
import { Question } from '../types/index.js';

const SWEEP_INTERVAL_MS = 60_000; // 60 seconds

async function sweepExpiredAttempts(): Promise<void> {
  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    // DB not configured — skip sweep cycle
    return;
  }

  try {
    const now = new Date();

    // Find all attempts that are 'active' but past their deadline
    const { data: expired, error } = await db
      .from('attempts')
      .select('*')
      .eq('status', 'active')
      .lt('deadline_at', now.toISOString());

    if (error || !expired || expired.length === 0) return;

    console.log(`[ExpirySweeeper] Sweeping ${expired.length} expired attempt(s) at ${now.toISOString()}`);

    // Load competencies once
    const { data: dbCompetencies } = await db.from('competencies').select('*');
    const competencies =
      dbCompetencies && dbCompetencies.length > 0
        ? dbCompetencies.map((c: any) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            univAvg: Number(c.univ_avg || 72),
          }))
        : BASELINE_COMPETENCIES;

    // Load approved questions once
    const { data: dbQuestions } = await db
      .from('questions')
      .select('*')
      .eq('approval_status', 'approved');
    const baseQuestions: Question[] =
      dbQuestions && dbQuestions.length > 0
        ? dbQuestions.map((d: any) => ({
            id: Number(d.id),
            skillId: Number(d.skill_id),
            skillName: d.skill_name,
            text: d.text,
            isReverse: Boolean(d.is_reverse),
            difficulty: (d.difficulty || 'Intermediate') as 'Standard' | 'Intermediate' | 'Advanced',
            approvalStatus: 'approved' as const,
            createdBy: d.created_by,
          }))
        : [];

    for (const attempt of expired) {
      try {
        const mergedAnswers = attempt.answers || {};

        // Build question list for this attempt
        const questions: Question[] =
          baseQuestions.length > 0
            ? baseQuestions
            : Object.keys(mergedAnswers).map((qid) => {
                const idNum = Number(qid);
                const compId = (idNum % 15) + 1;
                const comp = competencies.find((c: any) => c.id === compId) || competencies[0];
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

        const scoring = calculateAssessmentAttempt(questions as Question[], mergedAnswers, competencies);

        // Issue certificate if passing
        let certificate = null;
        if (scoring.isCertified) {
          try {
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
          } catch (certErr) {
            console.warn(`[ExpirySweeeper] Certificate issue error for ${attempt.id}:`, certErr);
          }
        }

        const deadline = new Date(attempt.deadline_at);
        const startedAt = new Date(attempt.started_at);
        const timeSpent = Math.max(0, Math.round((deadline.getTime() - startedAt.getTime()) / 1000));
        const m = Math.floor(timeSpent / 60);
        const s = timeSpent % 60;

        // Atomic conditional update — only updates if still 'active'
        const { data: updated } = await db
          .from('attempts')
          .update({
            status: 'expired',
            overall_score: scoring.compositeScore,
            certification_status: scoring.certificationStatus,
            is_certified: scoring.isCertified,
            time_spent_seconds: timeSpent,
            time_taken_formatted: `${m}m ${s}s`,
            total_questions: questions.length,
            answers: mergedAnswers,
            competency_scores: scoring.competencyScores,
            strengths: scoring.strengths,
            development_areas: scoring.developmentAreas,
            submitted_at: now.toISOString(),
            last_activity_at: now.toISOString(),
          })
          .eq('id', attempt.id)
          .eq('status', 'active')
          .select('id');

        if (updated && updated.length > 0) {
          logAuditEvent(
            'ASSESSMENT_LOG',
            `[Sweeper] Attempt ${attempt.id} auto-expired: Score ${scoring.compositeScore}%`,
            attempt.user_id,
            { attemptId: attempt.id, score: scoring.compositeScore, certificate: certificate?.certificateNumber }
          );
          console.log(`[ExpirySweeeper] ✓ Expired attempt ${attempt.id} — Score: ${scoring.compositeScore}%`);
        } else {
          console.log(`[ExpirySweeeper] Attempt ${attempt.id} already finalized by another process — skipped.`);
        }
      } catch (attemptErr) {
        console.error(`[ExpirySweeeper] Error sweeping attempt ${attempt.id}:`, attemptErr);
      }
    }
  } catch (err) {
    console.error('[ExpirySweeeper] Sweep cycle error:', err);
  }
}

let _sweeperInterval: NodeJS.Timeout | null = null;

export function startExpirySweeeper(): void {
  if (_sweeperInterval) return; // Already running
  console.log('[ExpirySweeeper] Starting — sweep interval: 60s');
  // Run once immediately on startup
  sweepExpiredAttempts().catch(console.error);
  _sweeperInterval = setInterval(() => {
    sweepExpiredAttempts().catch(console.error);
  }, SWEEP_INTERVAL_MS);
}

export function stopExpirySweeeper(): void {
  if (_sweeperInterval) {
    clearInterval(_sweeperInterval);
    _sweeperInterval = null;
    console.log('[ExpirySweeeper] Stopped.');
  }
}
