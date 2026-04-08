-- =============================================================================
-- PennyWise 2.0 — Password Reset OTPs
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor → New Query → paste & run
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  otp_hash    text        NOT NULL,
  reset_token text,                         -- issued after successful OTP verify
  expires_at  timestamptz NOT NULL,
  attempts    int         NOT NULL DEFAULT 0,
  used        boolean     NOT NULL DEFAULT FALSE,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prot_email      ON public.password_reset_otps (email);
CREATE INDEX IF NOT EXISTS idx_prot_expires_at ON public.password_reset_otps (expires_at);

-- Block all direct user access — Edge Functions use the service-role key
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;
-- No RLS policies intentionally: only service role can read/write this table

-- Auto-purge rows older than 24 hours (optional: run via pg_cron or periodic cleanup)
-- SELECT cron.schedule('purge-otps', '0 * * * *',
--   $$DELETE FROM public.password_reset_otps WHERE created_at < NOW() - INTERVAL '24 hours'$$);
