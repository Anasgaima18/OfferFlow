-- =============================================================================
-- OfferFlow — auth/compliance hardening
-- Date: 2026-05-06
-- Adds persistent fields for email verification, password reset, and soft delete
-- =============================================================================

BEGIN;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local' CHECK (auth_provider IN ('local', 'google', 'github')),
    ADD COLUMN IF NOT EXISTS provider_id TEXT,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verification_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reset_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Existing OAuth users are already identity-verified by providers.
UPDATE public.users
SET email_verified = TRUE
WHERE auth_provider IN ('google', 'github');

CREATE INDEX IF NOT EXISTS idx_users_verification_token_hash
    ON public.users (verification_token_hash)
    WHERE verification_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_reset_token_hash
    ON public.users (reset_token_hash)
    WHERE reset_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at
    ON public.users (deleted_at);

COMMIT;
