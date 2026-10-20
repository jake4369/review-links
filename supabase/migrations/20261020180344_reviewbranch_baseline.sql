

-- ============================================================================
-- ReviewBranch database baseline
-- ============================================================================
--
-- Purpose:
--   Reproduce the verified ReviewBranch production database structure and
--   security configuration used by application commit 812bfa2.
--
-- Intended target:
--   A fresh Supabase project.
--
-- IMPORTANT:
--   Do not run this baseline against the existing production database.
--
-- This migration intentionally contains no:
--   - business/customer data
--   - auth users
--   - environment variables
--   - API keys
--   - Vercel configuration
--   - historical onboarding backfill
--
-- The MVP interface currently limits an account to one business, but the
-- database intentionally does not enforce UNIQUE(owner_id).
-- ============================================================================


-- ============================================================================
-- 1. Core tables
-- ============================================================================

CREATE TABLE public.businesses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  logo_text text NOT NULL DEFAULT ''::text,
  welcome_message text NOT NULL DEFAULT ''::text,
  invitation_message text NOT NULL DEFAULT ''::text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  onboarding_completed_at timestamp with time zone,

  CONSTRAINT businesses_pkey
    PRIMARY KEY (id),

  CONSTRAINT businesses_owner_id_fkey
    FOREIGN KEY (owner_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  CONSTRAINT businesses_name_check
    CHECK (
      length(TRIM(BOTH FROM name)) >= 1
      AND length(TRIM(BOTH FROM name)) <= 120
    ),

  CONSTRAINT businesses_slug_check
    CHECK (
      length(slug) >= 3
      AND length(slug) <= 60
      AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text
    ),

  CONSTRAINT businesses_slug_key
    UNIQUE (slug),

  CONSTRAINT businesses_logo_text_check
    CHECK (length(logo_text) <= 12),

  CONSTRAINT businesses_welcome_message_check
    CHECK (length(welcome_message) <= 500),

  CONSTRAINT businesses_invitation_message_check
    CHECK (length(invitation_message) <= 500)
);


CREATE TABLE public.review_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  platform text NOT NULL,
  url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT review_links_pkey
    PRIMARY KEY (id),

  CONSTRAINT review_links_business_id_fkey
    FOREIGN KEY (business_id)
    REFERENCES public.businesses(id)
    ON DELETE CASCADE,

  CONSTRAINT review_links_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT review_links_platform_check
    CHECK (
      length(TRIM(BOTH FROM platform)) >= 1
      AND length(TRIM(BOTH FROM platform)) <= 40
    ),

  CONSTRAINT review_links_url_check
    CHECK (
      length(url) <= 2048
      AND url ~ '^https://[^[:space:]]+$'::text
    )
);


-- ============================================================================
-- 2. Additional indexes
-- ============================================================================

CREATE INDEX businesses_owner_id_idx
  ON public.businesses USING btree (owner_id);

CREATE INDEX review_links_business_order_idx
  ON public.review_links USING btree (business_id, display_order);


-- ============================================================================
-- 3. Review destination validator
-- ============================================================================

CREATE FUNCTION public.review_destination_is_valid(
  p_platform text,
  p_url text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $function$
DECLARE
  v_platform text;
  v_host text;
  v_path text;
BEGIN
  IF p_platform IS NULL
     OR length(btrim(p_platform)) NOT BETWEEN 1 AND 40
     OR p_url IS NULL
     OR length(p_url) > 2048
  THEN
    RETURN FALSE;
  END IF;

  v_platform := lower(btrim(p_platform));

  -- HTTPS is mandatory.
  IF left(p_url, 8) <> 'https://' THEN
    RETURN FALSE;
  END IF;

  -- Reject whitespace, control characters and backslashes that can
  -- cause URL ambiguity.
  IF p_url ~ '[[:space:][:cntrl:]]'
     OR strpos(p_url, chr(92)) > 0
  THEN
    RETURN FALSE;
  END IF;

  -- Extract the authority / hostname.
  v_host := lower(
    substring(p_url FROM '^https://([^/?#]+)')
  );

  -- Require a normal public DNS hostname.
  -- Excludes IP literals, ports, userinfo, localhost and malformed domains.
  IF v_host IS NULL
     OR v_host !~
       '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
     OR v_host !~ '\.[a-z]{2,63}$'
  THEN
    RETURN FALSE;
  END IF;

  -- Reject local/reserved destinations.
  IF v_host ~
    '(^|\.)(local|localhost|internal|lan|test|invalid|example|onion)$'
  THEN
    RETURN FALSE;
  END IF;

  -- Known Google destinations.
  IF strpos(v_platform, 'google') > 0 THEN

    IF NOT (
      v_host = 'google.com'
      OR v_host LIKE '%.google.com'
      OR v_host = 'google.co.uk'
      OR v_host LIKE '%.google.co.uk'
      OR v_host = 'g.page'
      OR v_host = 'maps.app.goo.gl'
    ) THEN
      RETURN FALSE;
    END IF;

  ELSIF strpos(v_platform, 'trustpilot') > 0 THEN

    IF NOT (
      v_host = 'trustpilot.com'
      OR v_host LIKE '%.trustpilot.com'
    ) THEN
      RETURN FALSE;
    END IF;

  ELSIF strpos(v_platform, 'facebook') > 0 THEN

    IF NOT (
      v_host = 'facebook.com'
      OR v_host LIKE '%.facebook.com'
      OR v_host = 'fb.com'
      OR v_host LIKE '%.fb.com'
    ) THEN
      RETURN FALSE;
    END IF;

  END IF;

  -- Avoid known external redirect endpoints.
  v_path := lower(
    coalesce(
      substring(
        p_url FROM '^https://[^/?#]+([^?#]*)'
      ),
      ''
    )
  );

  IF (
    v_host = 'google.com'
    OR v_host LIKE '%.google.com'
    OR v_host = 'google.co.uk'
    OR v_host LIKE '%.google.co.uk'
  ) AND v_path = '/url' THEN
    RETURN FALSE;
  END IF;

  IF v_host IN ('l.facebook.com', 'lm.facebook.com')
     OR (
       (
         v_host = 'facebook.com'
         OR v_host LIKE '%.facebook.com'
       )
       AND v_path = '/l.php'
     )
  THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$function$;


-- Database-level destination validation.
ALTER TABLE public.review_links
  ADD CONSTRAINT review_links_destination_valid
  CHECK (
    public.review_destination_is_valid(platform, url)
  );


-- ============================================================================
-- 4. Publication and destination safeguard functions
-- ============================================================================

CREATE FUNCTION public.require_review_link_before_publishing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN

  IF NEW.is_published = TRUE
     AND NOT EXISTS (
       SELECT 1
       FROM public.review_links AS r
       WHERE r.business_id = NEW.id
     )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE =
        'Published profiles must have at least one review destination';
  END IF;

  RETURN NEW;

END;
$function$;


CREATE FUNCTION public.prevent_final_review_link_removal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_published boolean;
BEGIN

  -- If an update does not move the link to another business,
  -- no destination is being lost.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.business_id = OLD.business_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Coordinate publication and destination removal using the
  -- parent business row.
  SELECT b.is_published
  INTO v_published
  FROM public.businesses AS b
  WHERE b.id = OLD.business_id
  FOR UPDATE;

  -- If the business still exists and is published, a different
  -- destination must remain.
  IF COALESCE(v_published, FALSE) THEN

    IF NOT EXISTS (
      SELECT 1
      FROM public.review_links AS r
      WHERE r.business_id = OLD.business_id
        AND r.id <> OLD.id
    )
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE =
          'Published profiles must have at least one review destination';
    END IF;

  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;

END;
$function$;


CREATE FUNCTION public.enforce_review_destination_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_count integer;
BEGIN

  -- Coordinate checks for the same business.
  -- If the parent was deleted within the transaction, there is
  -- no remaining business to validate.
  PERFORM 1
  FROM public.businesses
  WHERE id = NEW.business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM public.review_links
  WHERE business_id = NEW.business_id;

  IF v_count > 10 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE =
        'Maximum of 10 review destinations per business';
  END IF;

  RETURN NULL;

END;
$function$;


-- ============================================================================
-- 5. Publication and destination safeguard triggers
-- ============================================================================

CREATE TRIGGER reviewlinks_require_link_before_publishing
BEFORE INSERT OR UPDATE OF is_published
ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.require_review_link_before_publishing();


CREATE TRIGGER reviewlinks_prevent_final_link_removal
BEFORE DELETE OR UPDATE OF business_id
ON public.review_links
FOR EACH ROW
EXECUTE FUNCTION public.prevent_final_review_link_removal();


CREATE CONSTRAINT TRIGGER reviewlinks_max_ten_destinations
AFTER INSERT OR UPDATE OF business_id
ON public.review_links
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.enforce_review_destination_limit();


-- ============================================================================
-- 6. Transactional business-profile save RPC
-- ============================================================================

CREATE FUNCTION public.save_business_profile_v3(
  p_business_id uuid,
  p_name text,
  p_logo_text text,
  p_welcome_message text,
  p_invitation_message text,
  p_review_links jsonb,
  p_confirm_unpublish boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_link jsonb;
  v_id uuid;
  v_id_text text;
  v_platform text;
  v_url text;
  v_order integer := 0;
  v_updated integer;
  v_kept_ids uuid[] := ARRAY[]::uuid[];
  v_was_published boolean;
  v_will_unpublish boolean;
BEGIN
  -- Validate the JSON type before evaluating jsonb_array_length.
  IF pg_catalog.jsonb_typeof(p_review_links) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid review destinations';
  END IF;

  IF pg_catalog.jsonb_array_length(p_review_links) > 10 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Maximum of 10 review destinations';
  END IF;

  -- Lock only the authenticated owner's business.
  -- This serialises saves and publication changes before checking
  -- the live publication state.
  SELECT is_published
  INTO v_was_published
  FROM public.businesses
  WHERE id = p_business_id
    AND owner_id = (SELECT auth.uid())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Business not found or not authorised';
  END IF;

  v_will_unpublish :=
    v_was_published
    AND pg_catalog.jsonb_array_length(p_review_links) = 0;

  -- Explicit consent is required when saving a published business
  -- with zero destinations.
  IF v_will_unpublish
     AND p_confirm_unpublish IS DISTINCT FROM true
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE =
        'Explicit confirmation required to unpublish and remove the final review destination';
  END IF;

  -- Unpublish first while holding the parent lock.
  -- Any later exception rolls this change back with the transaction.
  UPDATE public.businesses
  SET
    name = p_name,
    logo_text = p_logo_text,
    welcome_message = p_welcome_message,
    invitation_message = p_invitation_message,
    is_published =
      CASE
        WHEN v_will_unpublish THEN false
        ELSE is_published
      END
  WHERE id = p_business_id
    AND owner_id = (SELECT auth.uid());

  FOR v_link IN
    SELECT value
    FROM pg_catalog.jsonb_array_elements(p_review_links)
      AS items(value)
  LOOP
    IF pg_catalog.jsonb_typeof(v_link) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Invalid destination object';
    END IF;

    v_platform := pg_catalog.btrim(v_link->>'platform');
    v_url := pg_catalog.btrim(v_link->>'url');
    v_id_text := v_link->>'id';

    IF public.review_destination_is_valid(
      v_platform,
      v_url
    ) IS DISTINCT FROM true
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Invalid review destination';
    END IF;

    IF v_id_text IS NULL OR v_id_text = '' THEN

      INSERT INTO public.review_links (
        business_id,
        platform,
        url,
        display_order
      )
      VALUES (
        p_business_id,
        v_platform,
        v_url,
        v_order
      )
      RETURNING id INTO v_id;

    ELSE

      v_id := v_id_text::uuid;

      IF v_id = ANY(v_kept_ids) THEN
        RAISE EXCEPTION USING
          ERRCODE = '22023',
          MESSAGE = 'Duplicate destination ID';
      END IF;

      UPDATE public.review_links
      SET
        platform = v_platform,
        url = v_url,
        display_order = v_order
      WHERE id = v_id
        AND business_id = p_business_id;

      GET DIAGNOSTICS v_updated = ROW_COUNT;

      IF v_updated <> 1 THEN
        RAISE EXCEPTION USING
          ERRCODE = '42501',
          MESSAGE =
            'Review destination not found or not authorised';
      END IF;

    END IF;

    v_kept_ids :=
      pg_catalog.array_append(v_kept_ids, v_id);

    v_order := v_order + 1;
  END LOOP;

  DELETE FROM public.review_links
  WHERE business_id = p_business_id
    AND NOT (id = ANY(v_kept_ids));

  RETURN v_will_unpublish;
END;
$function$;


-- ============================================================================
-- 7. Persistent onboarding completion
-- ============================================================================

CREATE FUNCTION public.record_onboarding_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN

    NEW.onboarding_completed_at :=
      CASE
        WHEN NEW.is_published = TRUE THEN NOW()
        ELSE NULL
      END;

  ELSE

    -- Once completed, onboarding is not reset by later editing
    -- or unpublishing.
    IF OLD.onboarding_completed_at IS NOT NULL THEN

      NEW.onboarding_completed_at :=
        OLD.onboarding_completed_at;

    ELSIF NEW.is_published = TRUE THEN

      -- First successful publication.
      NEW.onboarding_completed_at := NOW();

    ELSE

      NEW.onboarding_completed_at := NULL;

    END IF;

  END IF;

  RETURN NEW;
END;
$function$;


CREATE TRIGGER reviewbranch_record_onboarding_completion
BEFORE INSERT OR UPDATE
ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.record_onboarding_completion();


-- ============================================================================
-- 8. Row Level Security
-- ============================================================================

ALTER TABLE public.businesses
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.review_links
  ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 9. businesses RLS policies
-- ============================================================================

CREATE POLICY "Owners can create businesses"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = (SELECT auth.uid())
);


CREATE POLICY "Owners can delete businesses"
ON public.businesses
FOR DELETE
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
);


CREATE POLICY "Owners can read their businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
);


CREATE POLICY "Owners can update businesses"
ON public.businesses
FOR UPDATE
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
)
WITH CHECK (
  owner_id = (SELECT auth.uid())
);


CREATE POLICY "Published businesses are public"
ON public.businesses
FOR SELECT
TO anon
USING (
  is_published = true
);


-- ============================================================================
-- 10. review_links RLS policies
-- ============================================================================

CREATE POLICY "Owners can create review links"
ON public.review_links
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.businesses AS b
    WHERE b.id = review_links.business_id
      AND b.owner_id = (SELECT auth.uid())
  )
);


CREATE POLICY "Owners can delete review links"
ON public.review_links
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.businesses AS b
    WHERE b.id = review_links.business_id
      AND b.owner_id = (SELECT auth.uid())
  )
);


CREATE POLICY "Owners can read their review links"
ON public.review_links
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.businesses AS b
    WHERE b.id = review_links.business_id
      AND b.owner_id = (SELECT auth.uid())
  )
);


CREATE POLICY "Owners can update review links"
ON public.review_links
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.businesses AS b
    WHERE b.id = review_links.business_id
      AND b.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.businesses AS b
    WHERE b.id = review_links.business_id
      AND b.owner_id = (SELECT auth.uid())
  )
);


CREATE POLICY "Published review links are public"
ON public.review_links
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.businesses AS b
    WHERE b.id = review_links.business_id
      AND b.is_published = true
  )
);


-- ============================================================================
-- 11. Explicit table permissions
-- ============================================================================

-- Remove any broad permissions inherited from Supabase defaults before
-- establishing the verified ReviewBranch permission model.
REVOKE ALL PRIVILEGES
ON TABLE public.businesses
FROM PUBLIC, anon, authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.review_links
FROM PUBLIC, anon, authenticated;


-- Authenticated owners may read, insert and delete rows.
-- RLS controls which rows are accessible.
GRANT SELECT, INSERT, DELETE
ON TABLE public.businesses
TO authenticated;

GRANT SELECT, INSERT, DELETE
ON TABLE public.review_links
TO authenticated;


-- Authenticated business updates are deliberately column-scoped.
GRANT UPDATE (
  name,
  logo_text,
  welcome_message,
  invitation_message,
  is_published
)
ON TABLE public.businesses
TO authenticated;


-- Authenticated destination updates are deliberately column-scoped.
GRANT UPDATE (
  platform,
  url,
  display_order
)
ON TABLE public.review_links
TO authenticated;


-- Anonymous visitors may read only the fields required by the public page.
GRANT SELECT (
  id,
  name,
  slug,
  logo_text,
  welcome_message,
  is_published
)
ON TABLE public.businesses
TO anon;


GRANT SELECT (
  id,
  business_id,
  platform,
  url,
  display_order
)
ON TABLE public.review_links
TO anon;


-- Supabase service role retains full table access.
GRANT ALL PRIVILEGES
ON TABLE public.businesses
TO service_role;

GRANT ALL PRIVILEGES
ON TABLE public.review_links
TO service_role;


-- ============================================================================
-- 12. Explicit function permissions
-- ============================================================================

-- --------------------------------------------------------------------------
-- Destination validator
-- --------------------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON FUNCTION public.review_destination_is_valid(text, text)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.review_destination_is_valid(text, text)
TO authenticated, service_role;


-- --------------------------------------------------------------------------
-- Transactional save RPC
-- --------------------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON FUNCTION public.save_business_profile_v3(
  uuid,
  text,
  text,
  text,
  text,
  jsonb,
  boolean
)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.save_business_profile_v3(
  uuid,
  text,
  text,
  text,
  text,
  jsonb,
  boolean
)
TO authenticated, service_role;


-- --------------------------------------------------------------------------
-- Internal trigger functions
-- --------------------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON FUNCTION public.require_review_link_before_publishing()
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.require_review_link_before_publishing()
TO service_role;


REVOKE ALL PRIVILEGES
ON FUNCTION public.prevent_final_review_link_removal()
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.prevent_final_review_link_removal()
TO service_role;


REVOKE ALL PRIVILEGES
ON FUNCTION public.enforce_review_destination_limit()
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.enforce_review_destination_limit()
TO service_role;


-- --------------------------------------------------------------------------
-- Onboarding trigger function
--
-- This deliberately reproduces the verified production ACL.
-- Tightening it, if desired, should be a separate reviewed migration.
-- --------------------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON FUNCTION public.record_onboarding_completion()
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.record_onboarding_completion()
TO PUBLIC, anon, authenticated, service_role;
