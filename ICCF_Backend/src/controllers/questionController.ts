import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getDb } from '../db/index.js';
import { Question, ApprovalStatus } from '../types/index.js';
import { logAuditEvent } from '../services/auditService.js';
import fs from 'fs';
import path from 'path';

let cachedInitialQuestions: Question[] = [];

function loadFallbackQuestions(): Question[] {
  if (cachedInitialQuestions.length > 0) return cachedInitialQuestions;

  try {
    const rawPath = path.resolve(process.cwd(), '../skills_data.json');
    if (fs.existsSync(rawPath)) {
      const skills = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
      const list: Question[] = [];
      skills.forEach((s: any) => {
        (s.questions || []).forEach((q: any) => {
          list.push({
            id: Number(q.id),
            skillId: Number(q.skillId),
            skillName: q.skillName,
            text: q.text,
            isReverse: Boolean(q.isReverse),
            difficulty: q.isReverse ? 'Intermediate' : 'Standard',
            approvalStatus: 'approved',
            createdBy: 'System Seed',
            createdAt: new Date().toISOString(),
          });
        });
      });
      cachedInitialQuestions = list;
      return cachedInitialQuestions;
    }
  } catch (e) {
    console.warn('[QuestionController] Error reading fallback skills_data.json:', e);
  }

  return [];
}

export async function getQuestions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { status, skillId } = req.query;

  try {
    const db = getDb();
    let query = db.from('questions').select('*');

    if (status && status !== 'all') {
      query = query.eq('approval_status', String(status));
    }
    if (skillId) {
      query = query.eq('skill_id', Number(skillId));
    }

    const { data, error } = await query.order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      let fallback = loadFallbackQuestions();
      if (status && status !== 'all') {
        fallback = fallback.filter((q) => q.approvalStatus === status);
      }
      if (skillId) {
        fallback = fallback.filter((q) => q.skillId === Number(skillId));
      }
      res.status(200).json({ success: true, count: fallback.length, data: fallback });
      return;
    }

    const formatted: Question[] = data.map((d: any) => ({
      id: Number(d.id),
      skillId: Number(d.skill_id),
      skillName: d.skill_name,
      text: d.text,
      isReverse: Boolean(d.is_reverse),
      difficulty: d.difficulty || 'Intermediate',
      approvalStatus: d.approval_status as ApprovalStatus,
      createdBy: d.created_by,
      reviewedBy: d.reviewed_by,
      reviewedAt: d.reviewed_at,
      createdAt: d.created_at,
    }));

    // Optional text search filter
    const search = req.query.search ? String(req.query.search).toLowerCase().trim() : null;
    const finalData = search 
      ? formatted.filter(q => q.text.toLowerCase().includes(search) || q.skillName.toLowerCase().includes(search))
      : formatted;

    res.status(200).json({ success: true, count: finalData.length, data: finalData });
  } catch (err: any) {
    let fallback = loadFallbackQuestions();
    if (status && status !== 'all') {
      fallback = fallback.filter((q) => q.approvalStatus === status);
    }
    res.status(200).json({ success: true, count: fallback.length, data: fallback });
  }
}

/**
 * Admin-only: Question Bank Overview Stats
 */
export async function getQuestionBankStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const db = getDb();

    const [
      { count: totalCount },
      { count: approvedCount },
      { count: pendingCount },
      { count: rejectedCount },
      { count: reverseCount },
      { count: compCount }
    ] = await Promise.all([
      db.from('questions').select('*', { count: 'exact', head: true }),
      db.from('questions').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
      db.from('questions').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
      db.from('questions').select('*', { count: 'exact', head: true }).eq('approval_status', 'rejected'),
      db.from('questions').select('*', { count: 'exact', head: true }).eq('is_reverse', true),
      db.from('competencies').select('*', { count: 'exact', head: true })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalQuestions: totalCount || 0,
        approvedQuestions: approvedCount || 0,
        pendingReview: pendingCount || 0,
        rejectedQuestions: rejectedCount || 0,
        reverseScoredQuestions: reverseCount || 0,
        totalCompetencies: compCount || 15,
        version: 'v1.0.0-institutional',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch question bank stats.' });
  }
}

export async function submitQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { skillId, skillName, text, isReverse, difficulty, approvalStatus } = req.body;

  if (!skillId || !text || !String(text).trim()) {
    res.status(400).json({ success: false, error: 'Competency skillId and question text are required.' });
    return;
  }

  const isAdmin = req.user?.role === 'core_team' || req.user?.role === 'system_admin';
  const creatorName = req.user?.name || (isAdmin ? 'Admin' : 'Faculty Member');

  // If Admin specifies approvalStatus, honor it; otherwise default to pending for moderation
  const finalStatus: ApprovalStatus = (isAdmin && approvalStatus) ? approvalStatus : (isAdmin ? 'approved' : 'pending');

  const newQuestion: Question = {
    id: Date.now(),
    skillId: Number(skillId),
    skillName: skillName || `Competency ${skillId}`,
    text: String(text).trim(),
    isReverse: Boolean(isReverse),
    difficulty: difficulty || (isReverse ? 'Intermediate' : 'Standard'),
    approvalStatus: finalStatus,
    createdBy: creatorName,
    createdAt: new Date().toISOString(),
  };

  try {
    const db = getDb();
    await db.from('questions').insert([{
      id: newQuestion.id,
      skill_id: newQuestion.skillId,
      skill_name: newQuestion.skillName,
      text: newQuestion.text,
      is_reverse: newQuestion.isReverse,
      difficulty: newQuestion.difficulty,
      approval_status: newQuestion.approvalStatus,
      created_by: newQuestion.createdBy,
    }]);

    logAuditEvent('ADMIN_ACTION_LOG', `Created question #${newQuestion.id} (Status: ${newQuestion.approvalStatus})`, req.user?.id || 'system', {
      questionId: newQuestion.id,
      skillId: newQuestion.skillId,
      status: newQuestion.approvalStatus
    });

    res.status(201).json({
      success: true,
      message: `Question #${newQuestion.id} successfully created.`,
      data: newQuestion,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to save question.' });
  }
}

/**
 * Admin-only: Update Question details
 */
export async function updateQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { skillId, skillName, text, isReverse, difficulty, approvalStatus } = req.body;

  const questionId = Number(id);
  if (!questionId || isNaN(questionId)) {
    res.status(400).json({ success: false, error: 'Valid numeric question ID required.' });
    return;
  }

  try {
    const db = getDb();
    
    // Check if question exists
    const { data: existing, error: fetchErr } = await db.from('questions').select('*').eq('id', questionId).maybeSingle();
    if (fetchErr || !existing) {
      res.status(404).json({ success: false, error: `Question #${questionId} not found.` });
      return;
    }

    const updates: Record<string, any> = {};
    if (text && typeof text === 'string') updates.text = text.trim();
    if (skillId !== undefined) updates.skill_id = Number(skillId);
    if (skillName) updates.skill_name = skillName;
    if (isReverse !== undefined) updates.is_reverse = Boolean(isReverse);
    if (difficulty) updates.difficulty = difficulty;
    if (approvalStatus) updates.approval_status = approvalStatus;

    const { data, error } = await db
      .from('questions')
      .update(updates)
      .eq('id', questionId)
      .select()
      .single();

    if (error) throw error;

    logAuditEvent('ADMIN_ACTION_LOG', `Updated question #${questionId}`, req.user?.id || 'admin', {
      questionId,
      updates
    });

    res.status(200).json({
      success: true,
      message: `Question #${questionId} updated successfully.`,
      data: {
        id: Number(data.id),
        skillId: Number(data.skill_id),
        skillName: data.skill_name,
        text: data.text,
        isReverse: Boolean(data.is_reverse),
        difficulty: data.difficulty,
        approvalStatus: data.approval_status,
        createdBy: data.created_by,
        reviewedBy: data.reviewed_by,
        reviewedAt: data.reviewed_at,
        createdAt: data.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update question.' });
  }
}

/**
 * Admin-only: Safely Delete or Retire a question
 */
export async function deleteQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const questionId = Number(id);

  if (!questionId || isNaN(questionId)) {
    res.status(400).json({ success: false, error: 'Valid numeric question ID required.' });
    return;
  }

  try {
    const db = getDb();
    const { error } = await db.from('questions').delete().eq('id', questionId);

    if (error) throw error;

    logAuditEvent('ADMIN_ACTION_LOG', `Deleted question #${questionId}`, req.user?.id || 'admin', {
      questionId
    });

    res.status(200).json({
      success: true,
      message: `Question #${questionId} deleted successfully.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete question.' });
  }
}

export async function approveQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const reviewerName = req.user?.name || 'Administrator';
  const reviewedAt = new Date().toISOString();

  try {
    const db = getDb();
    const { data, error } = await db
      .from('questions')
      .update({
        approval_status: 'approved',
        reviewed_by: reviewerName,
        reviewed_at: reviewedAt,
      })
      .eq('id', Number(id))
      .select()
      .single();

    if (error) throw error;

    logAuditEvent('ADMIN_ACTION_LOG', `Approved question #${id}`, req.user?.id || 'admin', {
      questionId: id,
      reviewer: reviewerName,
    });

    res.status(200).json({
      success: true,
      message: `Question #${id} approved successfully.`,
      data,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to approve question.' });
  }
}

export async function rejectQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const reviewerName = req.user?.name || 'Administrator';
  const reviewedAt = new Date().toISOString();

  try {
    const db = getDb();
    const { data, error } = await db
      .from('questions')
      .update({
        approval_status: 'rejected',
        reviewed_by: reviewerName,
        reviewed_at: reviewedAt,
      })
      .eq('id', Number(id))
      .select()
      .single();

    if (error) throw error;

    logAuditEvent('ADMIN_ACTION_LOG', `Rejected question #${id}`, req.user?.id || 'admin', {
      questionId: id,
      reviewer: reviewerName,
    });

    res.status(200).json({
      success: true,
      message: `Question #${id} rejected.`,
      data,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to reject question.' });
  }
}

/**
 * Admin-only: Dry-run preview and validate questionnaire import payload
 */
export async function previewImportQuestions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: 'A non-empty "items" array is required for preview.' });
    return;
  }

  try {
    const db = getDb();

    // Fetch existing question IDs and texts for duplicate checks
    const { data: existingQuestions } = await db.from('questions').select('id, text');
    const existingIdSet = new Set((existingQuestions || []).map((q: any) => Number(q.id)));
    const existingTextSet = new Set((existingQuestions || []).map((q: any) => String(q.text).toLowerCase().trim()));

    const { data: competencies } = await db.from('competencies').select('id, name');
    const compMap = new Map((competencies || []).map((c: any) => [c.id, c.name]));

    const errors: string[] = [];
    const validItems: any[] = [];
    let duplicateCount = 0;

    items.forEach((item: any, index: number) => {
      const rowNum = index + 1;
      const text = item.text || item.questionText || item.question;
      const skillId = Number(item.skillId || item.competencyId || item.skill_id);
      const isReverse = Boolean(item.isReverse ?? item.is_reverse ?? false);
      const difficulty = item.difficulty || (isReverse ? 'Intermediate' : 'Standard');
      const providedId = item.id ? Number(item.id) : null;

      if (!text || String(text).trim().length < 5) {
        errors.push(`Row ${rowNum}: Question text is too short or missing.`);
        return;
      }

      if (!skillId || isNaN(skillId) || skillId < 1 || skillId > 15) {
        errors.push(`Row ${rowNum}: Invalid competency ID (${skillId}). Must be between 1 and 15.`);
        return;
      }

      const textNormalized = String(text).toLowerCase().trim();
      const isDuplicate = (providedId && existingIdSet.has(providedId)) || existingTextSet.has(textNormalized);

      if (isDuplicate) {
        duplicateCount++;
        errors.push(`Row ${rowNum}: Duplicate question detected (already exists in question bank).`);
        return;
      }

      validItems.push({
        id: providedId || (Date.now() + index),
        skillId,
        skillName: compMap.get(skillId) || `Competency ${skillId}`,
        text: String(text).trim(),
        isReverse,
        difficulty,
        approvalStatus: 'approved' as ApprovalStatus,
        createdBy: req.user?.name || 'Admin Import'
      });
    });

    res.status(200).json({
      success: true,
      summary: {
        totalSubmitted: items.length,
        validCount: validItems.length,
        invalidCount: errors.length - duplicateCount,
        duplicateCount,
        hasErrors: errors.length > 0
      },
      errors: errors.slice(0, 20), // Top 20 errors
      previewSample: validItems.slice(0, 10),
      canCommit: validItems.length > 0
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Validation failed.' });
  }
}

/**
 * Admin-only: Commit validated import items into database
 */
export async function commitImportQuestions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: 'A non-empty "items" array is required.' });
    return;
  }

  try {
    const db = getDb();

    // Re-verify duplicate IDs to prevent race condition or accidental overwrite
    const incomingIds = items.map(it => Number(it.id)).filter(id => !isNaN(id) && id > 0);
    if (incomingIds.length > 0) {
      const { data: dups } = await db.from('questions').select('id').in('id', incomingIds);
      if (dups && dups.length > 0) {
        res.status(409).json({
          success: false,
          error: `Import aborted: ${dups.length} question IDs already exist. Overwriting existing live data is strictly prohibited.`
        });
        return;
      }
    }

    const recordsToInsert = items.map((it: any, index: number) => ({
      id: Number(it.id) || (Date.now() + index),
      skill_id: Number(it.skillId || it.skill_id),
      skill_name: it.skillName || it.skill_name || `Competency ${it.skillId}`,
      text: String(it.text).trim(),
      is_reverse: Boolean(it.isReverse ?? it.is_reverse ?? false),
      difficulty: it.difficulty || 'Intermediate',
      approval_status: 'approved',
      created_by: `Admin Import (${req.user?.name || 'Administrator'})`,
      created_at: new Date().toISOString()
    }));

    // Insert in batches of 50
    let inserted = 0;
    for (let i = 0; i < recordsToInsert.length; i += 50) {
      const batch = recordsToInsert.slice(i, i + 50);
      const { error: insErr } = await db.from('questions').insert(batch);
      if (insErr) throw insErr;
      inserted += batch.length;
    }

    logAuditEvent('ADMIN_ACTION_LOG', `Imported ${inserted} questions into master Question Bank`, req.user?.id || 'admin', {
      totalImported: inserted,
      adminName: req.user?.name
    });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted} questions into master Question Bank without duplicating existing records.`,
      importedCount: inserted
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Import failed.' });
  }
}
