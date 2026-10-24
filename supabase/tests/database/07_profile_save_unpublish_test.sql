begin;

select plan(7);

-- --------------------------------------------------------------------------
-- Test fixture
-- --------------------------------------------------------------------------

insert into auth.users (id, email)
values (
  '12121212-1212-4212-8212-121212121212',
  'rpc-unpublish-owner@reviewbranch.test'
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
  '13131313-1313-4313-8313-131313131313',
  '12121212-1212-4212-8212-121212121212',
  'RPC Unpublish Test',
  'rpc-unpublish-test',
  'RUT',
  'RPC unpublish test page.',
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
  '14141414-1414-4414-8414-141414141414',
  '13131313-1313-4313-8313-131313131313',
  'Google',
  'https://g.page/rpc-unpublish-test/review',
  0
);

update public.businesses
set is_published = true
where id = '13131313-1313-4313-8313-131313131313';

-- --------------------------------------------------------------------------
-- Authenticated owner
-- --------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub = '12121212-1212-4212-8212-121212121212';

select throws_like(
  $$
    select public.save_business_profile_v3(
      '13131313-1313-4313-8313-131313131313',
      'RPC Unpublish Test',
      'RUT',
      'RPC unpublish test page.',
      'Please leave a review.',
      '[]'::jsonb,
      false
    )
  $$,
  '%Explicit confirmation required%',
  'removing the final destination from a published page requires explicit confirmation'
);

select results_eq(
  $$
    select is_published
    from public.businesses
    where id = '13131313-1313-4313-8313-131313131313'
  $$,
  array[true],
  'a rejected save leaves the business published'
);

select results_eq(
  $$
    select count(*)
    from public.review_links
    where business_id = '13131313-1313-4313-8313-131313131313'
  $$,
  array[1::bigint],
  'a rejected save leaves the final destination intact'
);

select is(
  public.save_business_profile_v3(
    '13131313-1313-4313-8313-131313131313',
    'RPC Unpublish Test',
    'RUT',
    'RPC unpublish test page.',
    'Please leave a review.',
    '[]'::jsonb,
    true
  ),
  true,
  'confirmed final-destination removal reports automatic unpublish'
);

select results_eq(
  $$
    select is_published
    from public.businesses
    where id = '13131313-1313-4313-8313-131313131313'
  $$,
  array[false],
  'confirmed removal automatically unpublishes the business'
);

select results_eq(
  $$
    select count(*)
    from public.review_links
    where business_id = '13131313-1313-4313-8313-131313131313'
  $$,
  array[0::bigint],
  'confirmed removal deletes the final destination'
);

select results_eq(
  $$
    select onboarding_completed_at is not null
    from public.businesses
    where id = '13131313-1313-4313-8313-131313131313'
  $$,
  array[true],
  'onboarding completion remains recorded after automatic unpublish'
);

select * from finish();

rollback;
