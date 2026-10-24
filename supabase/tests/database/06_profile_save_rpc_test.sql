begin;

select plan(8);

-- --------------------------------------------------------------------------
-- Test fixtures
-- --------------------------------------------------------------------------

insert into auth.users (id, email)
values
  (
    '88888888-8888-4888-8888-888888888881',
    'rpc-owner@reviewbranch.test'
  ),
  (
    '88888888-8888-4888-8888-888888888882',
    'rpc-other-user@reviewbranch.test'
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
  '99999999-9999-4999-8999-999999999991',
  '88888888-8888-4888-8888-888888888881',
  'Original RPC Business',
  'original-rpc-business',
  'ORB',
  'Original welcome message.',
  'Original invitation message.',
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
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1',
  '99999999-9999-4999-8999-999999999991',
  'Yell',
  'https://www.yell.com/reviews/original-rpc-business',
  0
);

-- --------------------------------------------------------------------------
-- Owner saves an updated profile
-- --------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub = '88888888-8888-4888-8888-888888888881';

select is(
  public.save_business_profile_v3(
    '99999999-9999-4999-8999-999999999991',
    'Updated RPC Business',
    'URB',
    'Updated welcome message.',
    'Updated invitation message.',
    jsonb_build_array(
      jsonb_build_object(
        'platform', 'Trustpilot',
        'url', 'https://www.trustpilot.com/review/updated-rpc-business.com'
      ),
      jsonb_build_object(
        'id', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1',
        'platform', 'Google',
        'url', 'https://g.page/updated-rpc-business/review'
      )
    ),
    false
  ),
  false,
  'saving an unpublished profile does not auto-unpublish it'
);

select results_eq(
  $$
    select name
    from public.businesses
    where id = '99999999-9999-4999-8999-999999999991'
  $$,
  array['Updated RPC Business'::text],
  'the RPC updates business details'
);

select results_eq(
  $$
    select count(*)
    from public.review_links
    where business_id = '99999999-9999-4999-8999-999999999991'
  $$,
  array[2::bigint],
  'the RPC saves the submitted destination set'
);

select results_eq(
  $$
    select platform
    from public.review_links
    where business_id = '99999999-9999-4999-8999-999999999991'
    order by display_order
  $$,
  array['Trustpilot'::text, 'Google'::text],
  'the RPC preserves submitted destination order'
);

select results_eq(
  $$
    select platform
    from public.review_links
    where id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1'
  $$,
  array['Google'::text],
  'an existing destination ID is updated rather than duplicated'
);

-- Save again with only the existing Google destination.
select is(
  public.save_business_profile_v3(
    '99999999-9999-4999-8999-999999999991',
    'Updated RPC Business',
    'URB',
    'Updated welcome message.',
    'Updated invitation message.',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1',
        'platform', 'Google',
        'url', 'https://g.page/updated-rpc-business/review'
      )
    ),
    false
  ),
  false,
  'saving a reduced destination set succeeds without auto-unpublishing'
);

select results_eq(
  $$
    select count(*)
    from public.review_links
    where business_id = '99999999-9999-4999-8999-999999999991'
  $$,
  array[1::bigint],
  'destinations omitted from a later save are deleted'
);

-- --------------------------------------------------------------------------
-- Another authenticated user must not be able to save this business
-- --------------------------------------------------------------------------

set local request.jwt.claim.sub = '88888888-8888-4888-8888-888888888882';

select throws_ok(
  $$
    select public.save_business_profile_v3(
      '99999999-9999-4999-8999-999999999991',
      'Unauthorized Change',
      'BAD',
      'Unauthorized.',
      'Unauthorized.',
      '[]'::jsonb,
      false
    )
  $$,
  '42501',
  'Business not found or not authorised',
  'another authenticated user cannot save someone else''s business'
);

select * from finish();

rollback;
