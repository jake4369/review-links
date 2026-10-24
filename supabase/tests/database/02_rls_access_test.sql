begin;

select plan(8);

-- --------------------------------------------------------------------------
-- Test fixtures
-- --------------------------------------------------------------------------

insert into auth.users (id, email)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'owner-a@reviewbranch.test'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'owner-b@reviewbranch.test'
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
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'Owner A Private',
    'owner-a-private',
    'A',
    'Owner A private test page.',
    'Please leave a review.',
    false
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    '22222222-2222-4222-8222-222222222222',
    'Owner B Private',
    'owner-b-private',
    'B',
    'Owner B private test page.',
    'Please leave a review.',
    false
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    '22222222-2222-4222-8222-222222222222',
    'Owner B Public',
    'owner-b-public',
    'B',
    'Owner B public test page.',
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
values
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Other',
    'https://www.yell.com/reviews/owner-a-private',
    0
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'Other',
    'https://www.yell.com/reviews/owner-b-private',
    0
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'Other',
    'https://www.yell.com/reviews/owner-b-public',
    0
  );

-- Publishing happens after its review destination exists because the
-- production database correctly prevents publishing an empty review page.
update public.businesses
set is_published = true
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';

-- --------------------------------------------------------------------------
-- Authenticated owner A
-- --------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$
    select count(*)
    from public.businesses
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  $$,
  array[1::bigint],
  'owner A can read their own private business'
);

select results_eq(
  $$
    select count(*)
    from public.businesses
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
  $$,
  array[0::bigint],
  'owner A cannot read owner B private business'
);

select results_eq(
  $$
    select count(*)
    from public.review_links
    where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
  $$,
  array[1::bigint],
  'owner A can read their own private review link'
);

select results_eq(
  $$
    select count(*)
    from public.review_links
    where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
  $$,
  array[0::bigint],
  'owner A cannot read owner B private review link'
);

-- --------------------------------------------------------------------------
-- Anonymous visitor
-- --------------------------------------------------------------------------

set local role anon;
set local request.jwt.claim.sub = '';

select results_eq(
  $$
    select count(*)
    from public.businesses
    where id in (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
    )
  $$,
  array[0::bigint],
  'anonymous visitors cannot read private businesses'
);

select results_eq(
  $$
    select count(*)
    from public.review_links
    where id in (
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
    )
  $$,
  array[0::bigint],
  'anonymous visitors cannot read private review links'
);

select results_eq(
  $$
    select count(*)
    from public.businesses
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
  $$,
  array[1::bigint],
  'anonymous visitors can read published businesses'
);

select results_eq(
  $$
    select count(*)
    from public.review_links
    where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2'
  $$,
  array[1::bigint],
  'anonymous visitors can read review links for published businesses'
);

select * from finish();

rollback;
