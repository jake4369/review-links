begin;

select plan(18);

-- --------------------------------------------------------------------------
-- Valid destinations
-- --------------------------------------------------------------------------

select is(
  public.review_destination_is_valid(
    'Google',
    'https://g.page/example-business/review'
  ),
  true,
  'Google g.page review links are accepted'
);

select is(
  public.review_destination_is_valid(
    'Google Reviews',
    'https://maps.app.goo.gl/AbCdEf123'
  ),
  true,
  'Google Maps app links are accepted'
);

select is(
  public.review_destination_is_valid(
    'Trustpilot',
    'https://uk.trustpilot.com/review/example.com'
  ),
  true,
  'Trustpilot subdomains are accepted'
);

select is(
  public.review_destination_is_valid(
    'Facebook',
    'https://www.facebook.com/example/reviews'
  ),
  true,
  'Facebook review pages are accepted'
);

select is(
  public.review_destination_is_valid(
    'Yell',
    'https://www.yell.com/reviews/example-business'
  ),
  true,
  'custom platforms may use other public HTTPS domains'
);

-- --------------------------------------------------------------------------
-- Transport and hostname restrictions
-- --------------------------------------------------------------------------

select is(
  public.review_destination_is_valid(
    'Yell',
    'http://www.yell.com/reviews/example-business'
  ),
  false,
  'HTTP destinations are rejected'
);

select is(
  public.review_destination_is_valid(
    'Yell',
    'https://www.yell.com:443/reviews/example-business'
  ),
  false,
  'destinations containing explicit ports are rejected'
);

select is(
  public.review_destination_is_valid(
    'Yell',
    'https://user@example.com/reviews'
  ),
  false,
  'destinations containing userinfo are rejected'
);

select is(
  public.review_destination_is_valid(
    'Custom',
    'https://192.168.1.10/review'
  ),
  false,
  'IP address destinations are rejected'
);

select is(
  public.review_destination_is_valid(
    'Custom',
    'https://reviews.example.test/review'
  ),
  false,
  'reserved test domains are rejected'
);

select is(
  public.review_destination_is_valid(
    'Custom',
    'https://example.com/review path'
  ),
  false,
  'destinations containing whitespace are rejected'
);

select is(
  public.review_destination_is_valid(
    'Custom',
    'https://example.com\review'
  ),
  false,
  'destinations containing backslashes are rejected'
);

-- --------------------------------------------------------------------------
-- Platform/domain matching
-- --------------------------------------------------------------------------

select is(
  public.review_destination_is_valid(
    'Google',
    'https://example.com/review'
  ),
  false,
  'Google-labelled destinations must use an approved Google domain'
);

select is(
  public.review_destination_is_valid(
    'Trustpilot',
    'https://example.com/review'
  ),
  false,
  'Trustpilot-labelled destinations must use trustpilot.com'
);

select is(
  public.review_destination_is_valid(
    'Facebook',
    'https://example.com/review'
  ),
  false,
  'Facebook-labelled destinations must use an approved Facebook domain'
);

-- --------------------------------------------------------------------------
-- Redirect protection
-- --------------------------------------------------------------------------

select is(
  public.review_destination_is_valid(
    'Google',
    'https://www.google.com/url?q=https%3A%2F%2Fexample.com'
  ),
  false,
  'Google external redirect URLs are rejected'
);

select is(
  public.review_destination_is_valid(
    'Facebook',
    'https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com'
  ),
  false,
  'Facebook external redirect URLs are rejected'
);

-- --------------------------------------------------------------------------
-- Platform validation
-- --------------------------------------------------------------------------

select is(
  public.review_destination_is_valid(
    '   ',
    'https://example.com/review'
  ),
  false,
  'blank platform names are rejected'
);

select * from finish();

rollback;
