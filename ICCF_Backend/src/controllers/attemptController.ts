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
