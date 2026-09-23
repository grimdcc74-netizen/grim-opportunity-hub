create unique index monitored_studios_user_website_unique
  on public.monitored_studios (
    user_id,
    lower(rtrim(website_url, '/'))
  )
  where website_url is not null and btrim(website_url) <> '';

comment on index public.monitored_studios_user_website_unique is
  'Prevents the same monitoring source URL from being saved more than once per user.';
