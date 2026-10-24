-- Restrict published review profile reads to the anonymous database role.
--
-- The earlier migration 20261024120637 extended these SELECT policies to
-- authenticated, but authenticated has full-column SELECT grants for owner
-- management. That unintentionally exposed non-public fields of other
-- businesses' published rows to signed-in API clients.
--
-- Public /r/[slug] pages use an independent, unauthenticated Supabase client,
-- even when a visitor is signed into ReviewBranch. Owner-specific policies
-- continue to allow authenticated users to manage only their own records.
--
-- Keep the existing publication predicates and table grants unchanged.

ALTER POLICY "Published businesses are public"
ON public.businesses
TO anon;

ALTER POLICY "Published review links are public"
ON public.review_links
TO anon;
