begin;

select plan(7);

-- --------------------------------------------------------------------------
-- Test fixtures
-- --------------------------------------------------------------------------

insert into auth.users (id, email)
values
  (
    '15151515-1515-4515-8515-151515151515',
    'rpc-validation-owner@reviewbranch.test'
  ),
  (
    '16161616-1616-4616-8616-161616161616',
    'rpc-validation-other@reviewbranch.test'
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
    '17171717-1717-4717-8717-171717171717',
    '15151515-1515-4515-8515-151515151515',
    'RPC Validation Original',
    'rpc-validation-original',
    'RVO',
    'Original welcome message.',
    'Original invitation message.',
    false
  ),
  (
    '18181818-1818-4818-8818-181818181818',
    '16161616-1616-4616-8616-161616161616',
    'Other RPC Business',
    'other-rpc-business',
    'ORB',
    'Other welcome message.',
    'Other invitation message.',
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
    '19191919-1919-4919-8919-191919191911',
    '17171717-1717-4717-8717-171717171717',
    'Yell',
    'https://www.yell.com/reviews/rpc-validation-original',
    0
  ),
  (
    '19191919-1919-4919-8919-191919191912',
    '18181818-1818-4818-8818-181818181818',
    'Yell',
    'https://www.yell.com/reviews/other-rpc-business',
    0
  );

set local role authenticated;
set local request.jwt.claim.sub = '15151515-1515-4515-8515-151515151515';

-- --------------------------------------------------------------------------
-- Invalid payload type
-- --------------------------------------------------------------------------

select throws_ok(
  $$
    select public.save_business_profile_v3(
      '17171717-1717-4717-8717-171717171717',
      'Should Not Persist',
      'BAD',
      'Should not persist.',
      'Should not persist.',
      '{}'::jsonb,
      false
    )
  $$,
  '22023',
  'Invalid review destinations',
  'the RPC rejects a non-array destination payload'
);

-- --------------------------------------------------------------------------
-- More than 10 destinations
-- --------------------------------------------------------------------------

select throws_ok(
  $$
    select public.save_business_profile_v3(
      '17171717-1717-4717-8717-171717171717',
      'Should Not Persist',
      'BAD',
      'Should not persist.',
      'Should not persist.',
      (
        select jsonb_agg(
          jsonb_build_object(
            'platform', 'Custom',
            'url', 'https://reviews' || n || '.yell.com/review'
          )
        )
        from generate_series(1, 11) as n
      ),
      false
    )
  $$,
  '23514',
  'Maximum of 10 review destinations',
  'the RPC rejects more than 10 destinations'
);

-- --------------------------------------------------------------------------
-- Invalid destination
-- --------------------------------------------------------------------------

select throws_ok(
  $$
    select public.save_business_profile_v3(
      '17171717-1717-4717-8717-171717171717',
      'Should Not Persist',
      'BAD',
      'Should not persist.',
      'Should not persist.',
      jsonb_build_array(
        jsonb_build_object(
          'platform', 'Google',
          'url', 'https://example.com/not-google'
        )
      ),
      false
    )
  $$,
  '23514',
  'Invalid review destination',
  'the RPC rejects invalid review destinations'
);

-- --------------------------------------------------------------------------
-- Duplicate destination ID
-- --------------------------------------------------------------------------

select throws_ok(
  $$
    select public.save_business_profile_v3(
      '17171717-1717-4717-8717-171717171717',
      'Should Not Persist',
      'BAD',
      'Should not persist.',
      'Should not persist.',
      jsonb_build_array(
        jsonb_build_object(
          'id', '19191919-1919-4919-8919-191919191911',
          'platform', 'Google',
          'url', 'https://g.page/rpc-validation/review'
        ),
        jsonb_build_object(
          'id', '19191919-1919-4919-8919-191919191911',
          'platform', 'Trustpilot',
          'url', 'https://www.trustpilot.com/review/rpc-validation.com'
        )
      ),
      false
    )
  $$,
  '22023',
  'Duplicate destination ID',
  'the RPC rejects duplicate destination IDs'
);

-- --------------------------------------------------------------------------
-- Destination ID belonging to another business
-- --------------------------------------------------------------------------

select throws_ok(
  $$
    select public.save_business_profile_v3(
      '17171717-1717-4717-8717-171717171717',
      'Should Not Persist',
      'BAD',
      'Should not persist.',
      'Should not persist.',
      jsonb_build_array(
        jsonb_build_object(
          'id', '19191919-1919-4919-8919-191919191912',
          'platform', 'Yell',
          'url', 'https://www.yell.com/reviews/unauthorised'
        )
      ),
      false
    )
  $$,
  '42501',
  'Review destination not found or not authorised',
  'the RPC cannot update a destination belonging to another business'
);

-- --------------------------------------------------------------------------
-- Failed saves must be atomic
-- --------------------------------------------------------------------------

select results_eq(
  $$
    select name
    from public.businesses
    where id = '17171717-1717-4717-8717-171717171717'
  $$,
  array['RPC Validation Original'::text],
  'failed RPC saves do not partially update the business'
);

select results_eq(
  $$
    select platform || '|' || url
    from public.review_links
    where id = '19191919-1919-4919-8919-191919191911'
  $$,
  array[
    'Yell|https://www.yell.com/reviews/rpc-validation-original'::text
  ],
  'failed RPC saves do not partially update destinations'
);

select * from finish();

rollback;
