-- ==============================================================================
-- Migration 003: Strict Examination Mode — Server-Authoritative Attempt Lifecycle
-- MRU SkillCert ICCF Portal
-- Applied: 2026-10-29
-- ==============================================================================
-- SAFE: Uses IF NOT EXISTS, COALESCE backfill, and conditional constraint creation.
-- Existing finalized attempt rows are preserved exactly as-is.
-- ==============================================================================

-- Step 1: Add all lifecycle columns if they don't already exist
ALTER TABLE public.attempts 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT 45,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 2700,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS answered_question_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS flagged_question_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS focus_lost_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS integrity_events JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS skill_id INTEGER,
  ADD COLUMN IF NOT EXISTS skill_name TEXT;

-- Step 2: Backfill legacy finalized records so they satisfy the new status constraint
-- All pre-migration rows that are not in_progress will become 'submitted'
UPDATE public.attempts 
SET 
  status = 'submitted',
  started_at = COALESCE(started_at, created_at, NOW()),
  submitted_at = COALESCE(submitted_at, created_at, NOW()),
  deadline_at = COALESCE(deadline_at, created_at + INTERVAL '45 minutes')
WHERE status IS NULL 
   OR status NOT IN ('active', 'submitted', 'expired');

-- Step 3: Migrate any orphaned 'in_progress' rows (should not exist after the old code ran)
UPDATE public.attempts
SET 
  status = 'expired',
  submitted_at = COALESCE(submitted_at, NOW()),
  deadline_at = COALESCE(deadline_at, started_at + INTERVAL '45 minutes', NOW())
WHERE status = 'in_progress' AND deadline_at IS NOT NULL AND deadline_at < NOW();

-- Step 4: Enforce check constraint on status values
-- Drop stale constraint if it exists from a prior migration attempt, then recreate
ALTER TABLE public.attempts DROP CONSTRAINT IF EXISTS chk_attempts_status;
ALTER TABLE public.attempts 
  ADD CONSTRAINT chk_attempts_status 
  CHECK (status IN ('active', 'submitted', 'expired'));

-- Step 5: High-performance composite indexes for authoritative session lookup
CREATE INDEX IF NOT EXISTS idx_attempts_active_user_asmt
  ON public.attempts(user_id, assessment_id, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_attempts_deadline_sweep
  ON public.attempts(deadline_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_attempts_status_created
  ON public.attempts(status, created_at DESC);

-- Step 6: RLS policies remain unchanged (existing allow-all policies cover new columns)
-- No changes needed to pg_policy entries.

-- ==============================================================================
-- Migration 003 Complete
-- ==============================================================================

