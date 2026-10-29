import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/index.js';

const router = Router();
const FEEDBACK_FILE = path.resolve(process.cwd(), 'data', 'feedbacks.json');

// Ensure data dir exists
const dataDir = path.dirname(FEEDBACK_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readFeedbacks(): any[] {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const content = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
      return JSON.parse(content || '[]');
    }
  } catch (e) {
    console.error('[Feedback] Read error:', e);
  }
  return [];
}

function writeFeedbacks(feedbacks: any[]) {
  try {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Feedback] Write error:', e);
  }
}

/**
 * POST /api/feedback
 * Submit beta test student feedback regarding exam and dashboard improvements
 */
router.post('/', async (req, res) => {
  try {
    const {
      studentName,
      rollNo,
      email,
      department,
      rating,
      examFeedback,
      dashboardFeedback,
      generalFeedback,
      userId
    } = req.body;

    const feedbackEntry = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: userId || 'anonymous',
      studentName: studentName || 'MRU Student',
      rollNo: rollNo || 'N/A',
      email: email || 'student@mru.edu.in',
      department: department || 'General Engineering',
      rating: Number(rating) || 5,
      examFeedback: examFeedback || '',
      dashboardFeedback: dashboardFeedback || '',
      generalFeedback: generalFeedback || '',
      isBetaTest: true,
      createdAt: new Date().toISOString()
    };

    // 1. Persist to local JSON file
    const currentList = readFeedbacks();
    currentList.unshift(feedbackEntry);
    writeFeedbacks(currentList);

    // 2. Persist to Supabase audit_logs & feedbacks table if available
    try {
      const sb = getDb();
      if (sb) {
        // Log to audit_logs (authoritative logging table)
        try {
          await sb.from('audit_logs').insert([{
            id: `audit_${feedbackEntry.id}`,
            category: 'BETA_FEEDBACK',
            action: 'STUDENT_BETA_FEEDBACK',
            user_id: feedbackEntry.email,
            metadata: feedbackEntry,
            created_at: feedbackEntry.createdAt
          }]);
        } catch (_) {}

        // Attempt write to feedbacks table
        try {
          await sb.from('feedbacks').insert([{
            id: feedbackEntry.id,
            user_id: feedbackEntry.userId,
            student_name: feedbackEntry.studentName,
            roll_no: feedbackEntry.rollNo,
            email: feedbackEntry.email,
            department: feedbackEntry.department,
            rating: feedbackEntry.rating,
            exam_feedback: feedbackEntry.examFeedback,
            dashboard_feedback: feedbackEntry.dashboardFeedback,
            general_feedback: feedbackEntry.generalFeedback,
            is_beta_test: true,
            created_at: feedbackEntry.createdAt
          }]);
        } catch (_) {}
      }
    } catch (dbErr) {
      console.warn('[Feedback] Supabase persistence notice (fallback active):', dbErr);
    }

    console.log(`[Feedback] Beta submission received from ${feedbackEntry.studentName} (${feedbackEntry.rollNo})`);
    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: feedbackEntry
    });
  } catch (err: any) {
    console.error('[Feedback] Submission error:', err);
    return res.status(500).json({
      error: 'Failed to record feedback',
      message: err.message
    });
  }
});

/**
 * GET /api/feedback
 * Retrieve all beta test feedbacks for Admin Portal
 */
router.get('/', async (req, res) => {
  try {
    let feedbacks = readFeedbacks();

    // Try reading directly from Supabase if available
    try {
      const sb = getDb();
      if (sb) {
        const { data: dbData, error } = await sb
          .from('feedbacks')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(dbData) && dbData.length > 0) {
          const mapped = dbData.map(d => ({
            id: d.id,
            userId: d.user_id,
            studentName: d.student_name,
            rollNo: d.roll_no,
            email: d.email,
            department: d.department,
            rating: d.rating,
            examFeedback: d.exam_feedback,
            dashboardFeedback: d.dashboard_feedback,
            generalFeedback: d.general_feedback,
            isBetaTest: d.is_beta_test,
            createdAt: d.created_at
          }));
          // Merge with unique IDs
          const existingIds = new Set(mapped.map(m => m.id));
          feedbacks.forEach(f => {
            if (!existingIds.has(f.id)) mapped.push(f);
          });
          feedbacks = mapped;
        }
      }
    } catch (e) {
      // Fallback to local list
    }

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks
    });
  } catch (err: any) {
    console.error('[Feedback] Fetch error:', err);
    return res.status(500).json({
      error: 'Failed to fetch feedback records',
      message: err.message
    });
  }
});

export default router;
