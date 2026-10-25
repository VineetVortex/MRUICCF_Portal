-- ==============================================================================
-- Migration 001: Production Authentication, Refresh Sessions & Password Recovery
-- MRU SkillCert - Institutional Competency Certification Framework
-- ==============================================================================

-- 1. Ensure columns on public.users for password authentication and active status
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Refresh Sessions Table (Cryptographic session management with rotation & reuse detection)
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

-- 3. Password Reset Tokens Table (Short-lived, single-use, verified tokens)
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

-- 4. Enable RLS on newly created tables
ALTER TABLE public.refresh_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies for refresh_sessions and password_reset_tokens:
-- Only backend service-role or trusted server can manage sessions
CREATE POLICY "Deny public access to refresh_sessions" 
  ON public.refresh_sessions FOR ALL 
  USING (false);

CREATE POLICY "Deny public access to password_reset_tokens" 
  ON public.password_reset_tokens FOR ALL 
  USING (false);
