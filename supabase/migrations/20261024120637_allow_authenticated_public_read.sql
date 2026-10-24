-- Published review pages are public regardless of whether the visitor
-- is signed out or already authenticated with ReviewBranch.
--
-- Keep the existing publication predicates unchanged; only extend the
-- policies so they also apply to the authenticated role.

ALTER POLICY "Published businesses are public"
ON public.businesses
TO anon, authenticated;

ALTER POLICY "Published review links are public"
ON public.review_links
TO anon, authenticated;
