-- ==============================================================================
-- Migration 005: One-Time Tester Access System for Campus Testing Event
-- MRU ICCF - Institutional Competency Certification Framework
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Approved Student Testing Roster
CREATE TABLE IF NOT EXISTS public.tester_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    department TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    email TEXT NOT NULL,
    team_id TEXT,
    is_authorized BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT tester_roster_roll_unique UNIQUE (roll_number),
    CONSTRAINT tester_roster_email_unique UNIQUE (email),
    CONSTRAINT tester_roster_email_lowercase
        CHECK (email = lower(trim(email)))
);

-- 2. Single-Use Hashed Tester Invitations
CREATE TABLE IF NOT EXISTS public.tester_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roster_id UUID NOT NULL
        REFERENCES public.tester_roster(id) ON DELETE RESTRICT,
    code_hash TEXT NOT NULL UNIQUE,
    issued_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,

    CONSTRAINT tester_invitation_expiry
        CHECK (expires_at > created_at)
);

-- 3. Non-Secret Audit Trail for Tester Access Events
CREATE TABLE IF NOT EXISTS public.tester_access_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roster_id UUID REFERENCES public.tester_roster(id)
        ON DELETE SET NULL,
    invitation_id UUID REFERENCES public.tester_invitations(id)
        ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'invitation_issued',
            'invitation_redeemed',
            'invitation_revoked',
            'redemption_denied',
            'tester_authorized',
            'tester_deauthorized'
        )
    ),
    actor_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for fast query lookup & concurrency-safe validation
CREATE INDEX IF NOT EXISTS idx_tester_roster_team ON public.tester_roster(team_id);
CREATE INDEX IF NOT EXISTS idx_tester_roster_email ON public.tester_roster(email);
CREATE INDEX IF NOT EXISTS idx_tester_invitations_roster ON public.tester_invitations(roster_id);
CREATE INDEX IF NOT EXISTS idx_tester_invitations_expiry ON public.tester_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_tester_access_events_created ON public.tester_access_events(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tester_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tester_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tester_access_events ENABLE ROW LEVEL SECURITY;

-- Deny direct public client access (All operations routed via Express backend service-role)
CREATE POLICY "Deny direct public access to tester_roster" ON public.tester_roster FOR ALL USING (false);
CREATE POLICY "Deny direct public access to tester_invitations" ON public.tester_invitations FOR ALL USING (false);
CREATE POLICY "Deny direct public access to tester_access_events" ON public.tester_access_events FOR ALL USING (false);
