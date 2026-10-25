-- ==============================================================================
-- Migration 002: Faculty Portal & Department Head Workflow Schema
-- MRU SkillCert - Institutional Competency Certification Framework
-- Backward-compatible: Preserves all existing seeded data & tables
-- ==============================================================================

-- 1. Enhance public.assessments for Faculty Lifecycle & Approval Workflow
ALTER TABLE public.assessments 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published', -- 'draft', 'submitted', 'under_review', 'approved', 'published', 'rejected', 'archived'
  ADD COLUMN IF NOT EXISTS faculty_id TEXT,
  ADD COLUMN IF NOT EXISTS intended_group TEXT DEFAULT 'All Students',
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS selected_question_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Enhance public.questions for Question Drafting & Moderation History
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS faculty_id TEXT,
  ADD COLUMN IF NOT EXISTS explanation TEXT,
  ADD COLUMN IF NOT EXISTS review_comments TEXT,
  ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'approved', -- 'draft', 'submitted', 'returned', 'approved', 'rejected'
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Notifications Table for Real Institutional Events
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'action_required'
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 4. Faculty Cohort Assignments Table (Tracks faculty-student cohort mappings)
CREATE TABLE IF NOT EXISTS public.faculty_course_assignments (
  id TEXT PRIMARY KEY,
  faculty_id TEXT NOT NULL,
  department TEXT NOT NULL,
  dept_code TEXT NOT NULL,
  course_code TEXT,
  course_name TEXT,
  cohort_year TEXT,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faculty_assignments_faculty ON public.faculty_course_assignments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_assignments_dept ON public.faculty_course_assignments(dept_code);

-- 5. RLS Configuration for New Tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_course_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read notifications" 
  ON public.notifications FOR SELECT 
  USING (true);

CREATE POLICY "Allow authenticated write notifications" 
  ON public.notifications FOR ALL 
  USING (true);

CREATE POLICY "Allow read faculty assignments" 
  ON public.faculty_course_assignments FOR SELECT 
  USING (true);
