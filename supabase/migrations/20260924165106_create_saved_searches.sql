create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  include_keywords text[] not null default '{}'::text[],
  exclude_keywords text[] not null default '{}'::text[],
  locations text[] not null default '{}'::text[],
  work_modes text[] not null default '{}'::text[],
  days_of_week smallint[] not null default '{1,2,3,4,5,6,7}'::smallint[],
  use_all_sources boolean not null default true,
  priority smallint not null default 3,
  is_active boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_searches_name_not_blank check (char_length(btrim(name)) between 2 and 160),
  constraint saved_searches_priority_valid check (priority between 1 and 5),
  constraint saved_searches_days_valid check (
    cardinality(days_of_week) > 0
    and days_of_week <@ '{1,2,3,4,5,6,7}'::smallint[]
  ),
  constraint saved_searches_work_modes_valid check (
    work_modes <@ '{remote,hybrid,on_site}'::text[]
  )
);

create unique index saved_searches_user_name_unique
  on public.saved_searches (user_id, lower(btrim(name)));
create index saved_searches_user_active_idx
  on public.saved_searches (user_id, is_active, priority desc, updated_at desc);

create table public.saved_search_professions (
  search_id uuid not null references public.saved_searches(id) on delete cascade,
  profession_id uuid not null references public.monitored_professions(id) on delete cascade,
  seniority_level smallint,
  created_at timestamptz not null default now(),
  primary key (search_id, profession_id),
  constraint saved_search_professions_seniority_valid
    check (seniority_level is null or seniority_level between 1 and 6)
);

create index saved_search_professions_profession_idx
  on public.saved_search_professions (profession_id, search_id);

create table public.saved_search_sources (
  search_id uuid not null references public.saved_searches(id) on delete cascade,
  source_id bigint not null references public.monitored_studios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (search_id, source_id)
);

create index saved_search_sources_source_idx
  on public.saved_search_sources (source_id, search_id);

create table public.saved_search_matches (
  search_id uuid not null references public.saved_searches(id) on delete cascade,
  opportunity_id text not null,
  is_current boolean not null default true,
  first_matched_at timestamptz not null default now(),
  last_matched_at timestamptz not null default now(),
  primary key (search_id, opportunity_id)
);

create index saved_search_matches_search_current_idx
  on public.saved_search_matches (search_id, is_current, last_matched_at desc);

alter table public.saved_searches enable row level security;
alter table public.saved_search_professions enable row level security;
alter table public.saved_search_sources enable row level security;
alter table public.saved_search_matches enable row level security;

create policy saved_searches_select_own on public.saved_searches
  for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_searches_insert_own on public.saved_searches
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy saved_searches_update_own on public.saved_searches
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy saved_searches_delete_own on public.saved_searches
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy saved_search_professions_select_own on public.saved_search_professions
  for select to authenticated using (exists (
    select 1 from public.saved_searches s
    where s.id = search_id and s.user_id = (select auth.uid())
  ));
create policy saved_search_professions_insert_own on public.saved_search_professions
  for insert to authenticated with check (
    exists (select 1 from public.saved_searches s where s.id = search_id and s.user_id = (select auth.uid()))
    and exists (select 1 from public.monitored_professions p where p.id = profession_id and p.user_id = (select auth.uid()))
  );
create policy saved_search_professions_update_own on public.saved_search_professions
  for update to authenticated
  using (exists (select 1 from public.saved_searches s where s.id = search_id and s.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.saved_searches s where s.id = search_id and s.user_id = (select auth.uid()))
    and exists (select 1 from public.monitored_professions p where p.id = profession_id and p.user_id = (select auth.uid()))
  );
create policy saved_search_professions_delete_own on public.saved_search_professions
  for delete to authenticated using (exists (
    select 1 from public.saved_searches s
    where s.id = search_id and s.user_id = (select auth.uid())
  ));

create policy saved_search_sources_select_own on public.saved_search_sources
  for select to authenticated using (exists (
    select 1 from public.saved_searches s
    where s.id = search_id and s.user_id = (select auth.uid())
  ));
create policy saved_search_sources_insert_own on public.saved_search_sources
  for insert to authenticated with check (
    exists (select 1 from public.saved_searches s where s.id = search_id and s.user_id = (select auth.uid()))
    and exists (select 1 from public.monitored_studios source where source.id = source_id and source.user_id = (select auth.uid()))
  );
create policy saved_search_sources_delete_own on public.saved_search_sources
  for delete to authenticated using (exists (
    select 1 from public.saved_searches s
    where s.id = search_id and s.user_id = (select auth.uid())
  ));

create policy saved_search_matches_select_own on public.saved_search_matches
  for select to authenticated using (exists (
    select 1 from public.saved_searches s
    where s.id = search_id and s.user_id = (select auth.uid())
  ));
create policy saved_search_matches_delete_own on public.saved_search_matches
  for delete to authenticated using (exists (
    select 1 from public.saved_searches s
    where s.id = search_id and s.user_id = (select auth.uid())
  ));

revoke all on table public.saved_searches from anon;
revoke all on table public.saved_search_professions from anon;
revoke all on table public.saved_search_sources from anon;
revoke all on table public.saved_search_matches from anon;
grant select, insert, update, delete on table public.saved_searches to authenticated;
grant select, insert, update, delete on table public.saved_search_professions to authenticated;
grant select, insert, delete on table public.saved_search_sources to authenticated;
grant select, delete on table public.saved_search_matches to authenticated;

insert into public.saved_searches (user_id, name, description, priority)
select id, 'Radar VFX generale', 'Tutte le professioni VFX, CGI e AI attive e tutte le fonti monitorate.', 5
from auth.users
on conflict do nothing;

insert into public.saved_search_professions (search_id, profession_id, seniority_level)
select search.id, profession.id, profession.seniority_level
from public.saved_searches search
join public.monitored_professions profession on profession.user_id = search.user_id
where search.name = 'Radar VFX generale' and profession.is_active
on conflict do nothing;
