
-- ReviewBranch
-- First-time onboarding completion
-- Applied manually through the Supabase SQL Editor:
-- 19 October 2026
--
-- STATUS: ALREADY APPLIED TO HOSTED DATABASE.
-- This file documents the change for source control.
-- Do not execute again without checking the existing
-- database schema and migration history.
--
-- Purpose:
-- Record successful first-time publication permanently,
-- so unpublishing does not restart onboarding.
--
-- Existing publication validation triggers and RLS
-- policies are not modified.

BEGIN;

-- Add the permanent completion timestamp.

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Mark businesses currently published at migration time
-- as having completed onboarding.
--
-- This is the migration timestamp, not the historical
-- time of their first publication.

UPDATE public.businesses
SET onboarding_completed_at = NOW()
WHERE is_published = TRUE
  AND onboarding_completed_at IS NULL;

-- Record successful publication and preserve completion.

CREATE OR REPLACE FUNCTION public.record_onboarding_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN

    NEW.onboarding_completed_at :=
      CASE
        WHEN NEW.is_published = TRUE THEN NOW()
        ELSE NULL
      END;

  ELSE

    IF OLD.onboarding_completed_at IS NOT NULL THEN

      NEW.onboarding_completed_at :=
        OLD.onboarding_completed_at;

    ELSIF NEW.is_published = TRUE THEN

      NEW.onboarding_completed_at := NOW();

    ELSE

      NEW.onboarding_completed_at := NULL;

    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Attach an independent trigger to businesses.
-- The existing review destination safeguard is preserved.

CREATE TRIGGER reviewbranch_record_onboarding_completion
BEFORE INSERT OR UPDATE
ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.record_onboarding_completion();

COMMIT;
