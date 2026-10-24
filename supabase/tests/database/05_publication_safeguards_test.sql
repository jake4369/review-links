begin;

select plan(8);

-- --------------------------------------------------------------------------
-- Test fixture user
-- --------------------------------------------------------------------------

insert into auth.users (id, email)
values (
  '11111111-1111-4111-8111-111111111111',
  'publication-tests@reviewbranch.test'
);

-- --------------------------------------------------------------------------
-- Publishing requires at least one review destination
-- --------------------------------------------------------------------------

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
  '55555555-5555-4555-8555-555555555551',
  '11111111-1111-4111-8111-111111111111',
  'Publication Safeguard Test',
  'publication-safeguard-test',
  'PST',
  'Publication safeguard test page.',
  'Please leave a review.',
  false
);

select throws_ok(
  $$
    update public.businesses
    set is_published = true
    where id = '55555555-5555-4555-8555-555555555551'
  $$,
  '23514',
  'Published profiles must have at least one review destination',
  'an empty review page cannot be published'
);

insert into public.review_links (
  id,
  business_id,
  platform,
  url,
  display_order
)
values (
  '66666666-6666-4666-8666-666666666661',
  '55555555-5555-4555-8555-555555555551',
  'Yell',
  'https://www.yell.com/reviews/publication-safeguard-test',
  0
);

select lives_ok(
  $$
    update public.businesses
    set is_published = true
    where id = '55555555-5555-4555-8555-555555555551'
  $$,
  'a review page with a destination can be published'
);

select results_eq(
  $$
    select is_published
    from public.businesses
    where id = '55555555-5555-4555-8555-555555555551'
  $$,
  array[true],
  'the business remains published after a successful publication'
);

-- --------------------------------------------------------------------------
-- A published page must keep at least one destination
-- --------------------------------------------------------------------------

select throws_ok(
  $$
    delete from public.review_links
    where id = '66666666-6666-4666-8666-666666666661'
  $$,
  '23514',
  'Published profiles must have at least one review destination',
  'the final review destination cannot be deleted while published'
);

insert into public.review_links (
  id,
  business_id,
  platform,
  url,
  display_order
)
values (
  '66666666-6666-4666-8666-666666666662',
  '55555555-5555-4555-8555-555555555551',
  'Trustpilot',
  'https://www.trustpilot.com/review/publication-safeguard-test.com',
  1
);

select lives_ok(
  $$
    delete from public.review_links
    where id = '66666666-6666-4666-8666-666666666661'
  $$,
  'one destination may be removed when another destination remains'
);

select results_eq(
  $$
    select count(*)
    from public.review_links
    where business_id = '55555555-5555-4555-8555-555555555551'
  $$,
  array[1::bigint],
  'exactly one destination remains after removing a non-final destination'
);

update public.businesses
set is_published = false
where id = '55555555-5555-4555-8555-555555555551';

select lives_ok(
  $$
    delete from public.review_links
    where id = '66666666-6666-4666-8666-666666666662'
  $$,
  'the final destination may be removed after the page is unpublished'
);

-- --------------------------------------------------------------------------
-- Maximum of 10 review destinations per business
-- --------------------------------------------------------------------------

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
  '55555555-5555-4555-8555-555555555552',
  '11111111-1111-4111-8111-111111111111',
  'Destination Limit Test',
  'destination-limit-test',
  'DLT',
  'Destination limit test page.',
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
select
  (
    '77777777-7777-4777-8777-' ||
    lpad(n::text, 12, '0')
  )::uuid,
  '55555555-5555-4555-8555-555555555552'::uuid,
  'Custom',
  'https://reviews' || n || '.yell.com/review',
  n - 1
from generate_series(1, 10) as n;

-- The maximum-destination trigger is deferred by design. Make it immediate
-- after the first 10 valid rows so the next INSERT is checked immediately.
set constraints reviewlinks_max_ten_destinations immediate;

select throws_ok(
  $$
    insert into public.review_links (
      id,
      business_id,
      platform,
      url,
      display_order
    )
    values (
      '77777777-7777-4777-8777-000000000011',
      '55555555-5555-4555-8555-555555555552',
      'Custom',
      'https://reviews11.yell.com/review',
      10
    )
  $$,
  '23514',
  'Maximum of 10 review destinations per business',
  'an eleventh review destination is rejected'
);

select * from finish();

rollback;
