-- Returns TRUE if the given email belongs to a *different* active user in auth.users.
-- Used by the client after OAuth sign-in to detect duplicate-email registrations
-- when Supabase creates a new account instead of auto-linking an existing one.
-- SECURITY DEFINER is required because auth.users is not accessible via RLS.
CREATE OR REPLACE FUNCTION public.is_email_registered_by_other(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE lower(email) = lower(p_email)
      AND id != auth.uid()
  );
$$;
