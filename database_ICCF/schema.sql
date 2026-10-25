-- ==============================================================================
-- Manav Rachna ICCF Portal - Enterprise Supabase & PostgreSQL Schema
-- Optimized for High Throughput (60k+ DAU), SaaS Multi-Tenancy & Integrity
-- ==============================================================================

-- 1. Users Table (SaaS User Accounts & Role-Based Access Control)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student', -- 'student', 'dept_head', 'core_team', 'system_admin'
  department TEXT,
  dept_code TEXT,
  year TEXT,
  roll_no TEXT,
  designation TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Competencies Table
CREATE TABLE IF NOT EXISTS public.competencies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  univ_avg NUMERIC DEFAULT 72,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Questions Table (Includes Moderation Workflow)
CREATE TABLE IF NOT EXISTS public.questions (
  id BIGINT PRIMARY KEY,
  skill_id INTEGER NOT NULL,
  skill_name TEXT NOT NULL,
  text TEXT NOT NULL,
  is_reverse BOOLEAN DEFAULT FALSE,
  difficulty TEXT DEFAULT 'Intermediate',
  approval_status TEXT DEFAULT 'approved', -- 'approved', 'pending', 'rejected'
  created_by TEXT DEFAULT 'System Seed',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Assessments Table (Configuration)
CREATE TABLE IF NOT EXISTS public.assessments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT DEFAULT 'All Departments',
  department_id TEXT DEFAULT 'dept_all',
  time_limit INTEGER DEFAULT 45,
  questions_per_competency INTEGER DEFAULT 10,
  total_questions INTEGER DEFAULT 150,
  active BOOLEAN DEFAULT TRUE,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  created_by TEXT DEFAULT 'Core Team',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Student Attempts Table
CREATE TABLE IF NOT EXISTS public.attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  roll_no TEXT,
  department TEXT,
  assessment_id TEXT,
  assessment_name TEXT,
  overall_score NUMERIC NOT NULL,
  certification_status TEXT NOT NULL, -- 'Certified', 'Needs Improvement'
  is_certified BOOLEAN NOT NULL,
  time_spent_seconds INTEGER,
  time_taken_formatted TEXT,
  total_questions INTEGER,
  answers JSONB DEFAULT '{}'::jsonb,
  competency_scores JSONB DEFAULT '[]'::jsonb,
  strengths JSONB DEFAULT '[]'::jsonb,
  development_areas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Verified Certifications Table (SaaS Credential Verification)
CREATE TABLE IF NOT EXISTS public.certificates (
  id TEXT PRIMARY KEY,
  certificate_number TEXT UNIQUE NOT NULL,
  attempt_id TEXT REFERENCES public.attempts(id) ON DELETE SET NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  roll_no TEXT,
  department TEXT,
  assessment_id TEXT,
  assessment_name TEXT,
  overall_score NUMERIC NOT NULL,
  competency_scores JSONB DEFAULT '[]'::jsonb,
  verification_hash TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Structured Audit Logs Table (Security & Activity)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id TEXT DEFAULT 'system',
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Official Faculty Directory Table (Pre-loaded from MRU Telephone Directory)
CREATE TABLE IF NOT EXISTS public.faculty_directory (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  designation TEXT,
  department TEXT NOT NULL,
  dept_code TEXT NOT NULL,
  role TEXT DEFAULT 'dept_head',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- High-Performance Indexes for 60k+ Daily Active Users
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_questions_skill_id ON public.questions(skill_id);
CREATE INDEX IF NOT EXISTS idx_questions_approval ON public.questions(approval_status);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON public.attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_assessment_id ON public.attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_created_at ON public.attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_cert_no ON public.certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON public.certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_cat ON public.audit_logs(user_id, category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_directory ENABLE ROW LEVEL SECURITY;

-- Allow anon read & write operations (can be locked down in production with service role key)
CREATE POLICY "Allow anon all users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Allow anon insert departments" ON public.departments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon read competencies" ON public.competencies FOR SELECT USING (true);
CREATE POLICY "Allow anon insert competencies" ON public.competencies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon read questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Allow anon write questions" ON public.questions FOR ALL USING (true);
CREATE POLICY "Allow anon read assessments" ON public.assessments FOR SELECT USING (true);
CREATE POLICY "Allow anon write assessments" ON public.assessments FOR ALL USING (true);
CREATE POLICY "Allow anon read attempts" ON public.attempts FOR SELECT USING (true);
CREATE POLICY "Allow anon write attempts" ON public.attempts FOR ALL USING (true);
CREATE POLICY "Allow anon read certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Allow anon write certificates" ON public.certificates FOR ALL USING (true);
CREATE POLICY "Allow anon read audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow anon write audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon read faculty_directory" ON public.faculty_directory FOR SELECT USING (true);
CREATE POLICY "Allow anon write faculty_directory" ON public.faculty_directory FOR ALL USING (true);

-- ==============================================================================
-- 10. Refresh Sessions Table (Session Management, 30s JWT Rotation & Reuse Detection)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.refresh_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  token_family UUID NOT NULL DEFAULT gen_random_uuid(),
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_id ON public.refresh_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_sessions_token_hash ON public.refresh_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_sessions_family ON public.refresh_sessions(token_family);
CREATE INDEX IF NOT EXISTS idx_refresh_sessions_expires_at ON public.refresh_sessions(expires_at);

-- 11. Password Reset Tokens Table (Secure Self-Service Recovery for Existing Accounts)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON public.password_reset_tokens(user_id);

ALTER TABLE public.refresh_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access to refresh_sessions" ON public.refresh_sessions FOR ALL USING (false);
CREATE POLICY "Deny anon access to password_reset_tokens" ON public.password_reset_tokens FOR ALL USING (false);
