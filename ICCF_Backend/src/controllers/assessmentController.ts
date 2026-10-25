import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getDb } from '../db/index.js';
import { AssessmentConfig } from '../types/index.js';
import { logAuditEvent } from '../services/auditService.js';

export const BASELINE_ASSESSMENTS: AssessmentConfig[] = [
  {
    id: 'asmt-2026-core',
    name: 'Human-Centric Skills Assessment 2026',
    department: 'All Departments',
    departmentId: 'dept_all',
    timeLimit: 45,
    questionsPerCompetency: 10,
    totalQuestions: 150,
    active: true,
    scheduledAt: '2026-10-15T09:00:00Z',
    description: 'Comprehensive institutional evaluation across all 15 human-centric competencies.',
    createdBy: 'Core Team',
  },
  {
    id: 'asmt-2026-cse-mid',
    name: 'FET CSE Mid-Term Competency Benchmark',
    department: 'Computer Science & Engineering',
    departmentId: 'dept_cse',
    timeLimit: 30,
    questionsPerCompetency: 4,
    totalQuestions: 60,
    active: true,
    scheduledAt: '2026-10-20T10:30:00Z',
    description: 'Targeted assessment for CSE cohorts focusing on communication, collaboration, and ethics.',
    createdBy: 'Dr. Arvind Mehta (FET)',
  },
];

export async function getAssessments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const db = getDb();
    const { data, error } = await db.from('assessments').select('*').order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      res.status(200).json({ success: true, data: BASELINE_ASSESSMENTS });
      return;
    }

    const formatted: AssessmentConfig[] = data.map((d: any) => ({
      id: d.id,
      name: d.name,
      department: d.department,
      departmentId: d.department_id || 'dept_all',
      timeLimit: Number(d.time_limit || 45),
      questionsPerCompetency: Number(d.questions_per_competency || 10),
      totalQuestions: Number(d.total_questions || 150),
      active: Boolean(d.active),
      scheduledAt: d.scheduled_at || d.created_at,
      description: d.description || '',
      createdBy: d.created_by || 'Admin',
      createdAt: d.created_at,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(200).json({ success: true, data: BASELINE_ASSESSMENTS });
  }
}

export async function createAssessment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { name, department, departmentId, timeLimit, questionsPerCompetency, description } = req.body;

  if (!name) {
    res.status(400).json({ success: false, error: 'Assessment name is required.' });
    return;
  }

  const qPerComp = Number(questionsPerCompetency) || 10;
  const newAssessment: AssessmentConfig = {
    id: `asmt-${Date.now()}`,
    name: String(name).trim(),
    department: department || 'All Departments',
    departmentId: departmentId || 'dept_all',
    timeLimit: Number(timeLimit) || 45,
    questionsPerCompetency: qPerComp,
    totalQuestions: qPerComp * 15,
    active: true,
    scheduledAt: new Date().toISOString(),
    description: description || 'Configured via ICCF Assessment Management.',
    createdBy: req.user?.name || 'Core Team',
    createdAt: new Date().toISOString(),
  };

  try {
    const db = getDb();
    await db.from('assessments').insert([{
      id: newAssessment.id,
      name: newAssessment.name,
      department: newAssessment.department,
      department_id: newAssessment.departmentId,
      time_limit: newAssessment.timeLimit,
      questions_per_competency: newAssessment.questionsPerCompetency,
      total_questions: newAssessment.totalQuestions,
      active: newAssessment.active,
      scheduled_at: newAssessment.scheduledAt,
      description: newAssessment.description,
      created_by: newAssessment.createdBy,
    }]);

    logAuditEvent('ADMIN_ACTION_LOG', `Created assessment: ${newAssessment.name}`, req.user?.id || 'admin', {
      assessmentId: newAssessment.id,
      timeLimit: newAssessment.timeLimit,
    });

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully.',
      data: newAssessment,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create assessment.' });
  }
}
