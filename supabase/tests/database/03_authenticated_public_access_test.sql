begin;

select plan(2);

-- --------------------------------------------------------------------------
-- Test fixtures
-- --------------------------------------------------------------------------

insert into auth.users (id, email)
values
  (
    '33333333-3333-4333-8333-333333333333',
    'signed-in-visitor@reviewbranch.test'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'published-owner@reviewbranch.test'
  );

insert into public.businesses (
  id,
  owner_id,
  name,
  slug,
  logo_text,
  welcome_message,
  invitation_message,
  is_published
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  '44444444-4444-4444-8444-444444444444',
  'Published Test Business',
  'published-test-business',
  'PTB',
  'Published test page.',
  'Please leave a review.',
  false
);

insert into public.review_links (
  id,
  business_id,
  platform,
  url,
  display_order
)
values (
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  'Other',
  'https://www.yell.com/reviews/published-test-business',
  0
);

update public.businesses
set is_published = true
where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';

-- --------------------------------------------------------------------------
-- Signed-in visitor who does NOT own the published business
-- --------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

-- Authenticated database clients must not read another
-- owner's business records, even when published.
-- Public review pages use the independent anon client.

select results_eq(
  $$
    select count(*)
    from public.businesses
    where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'
  $$,
  array[0::bigint],
  'authenticated non-owners cannot directly read another published business'
);

select results_eq(
  $$
    select count(*)
    from public.review_links
    where id = 'ffffffff-ffff-4fff-8fff-fffffffffff1'
  $$,
  array[0::bigint],
  'authenticated non-owners cannot directly read another published business review links'
);

select * from finish();

rollback;
