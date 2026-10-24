begin;

select plan(6);

select has_table(
  'public',
  'businesses',
  'businesses table should exist'
);

select has_table(
  'public',
  'review_links',
  'review_links table should exist'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    join pg_namespace
      on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'businesses'
  ),
  'businesses should have RLS enabled'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    join pg_namespace
      on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'review_links'
  ),
  'review_links should have RLS enabled'
);

select policies_are(
  'public',
  'businesses',
  array[
    'Owners can create businesses',
    'Owners can delete businesses',
    'Owners can read their businesses',
    'Owners can update businesses',
    'Published businesses are public'
  ],
  'businesses should have exactly the expected RLS policies'
);

select policies_are(
  'public',
  'review_links',
  array[
    'Owners can create review links',
    'Owners can delete review links',
    'Owners can read their review links',
    'Owners can update review links',
    'Published review links are public'
  ],
  'review_links should have exactly the expected RLS policies'
);

select * from finish();

rollback;
