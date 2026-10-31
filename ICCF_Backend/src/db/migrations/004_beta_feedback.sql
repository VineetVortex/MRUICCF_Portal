-- Migration 004: Beta Feedback & Improvement Submissions
-- Allows students to submit suggestions on the exam and dashboard during Beta Testing.

CREATE TABLE IF NOT EXISTS public.feedbacks (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  student_name TEXT NOT NULL,
  roll_no TEXT,
  email TEXT,
  department TEXT,
  rating INTEGER DEFAULT 5,
  category TEXT DEFAULT 'Beta Feedback',
  exam_feedback TEXT,
  dashboard_feedback TEXT,
  general_feedback TEXT,
  is_beta_test BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON public.feedbacks(user_id);
