create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table public.monitored_opportunities (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id bigint references public.monitored_studios(id) on delete cascade,
  title text not null,
  organization text not null,
  area text not null default 'work'
    check (area in ('work', 'art', 'graffiti', 'photography')),
  category text,
  summary text,
  location text,
  country text,
  remote_policy text,
  opportunity_type text,
  seniority_level smallint check (seniority_level is null or seniority_level between 1 and 6),
  detected_profession_ids uuid[] not null default '{}'::uuid[],
  canonical_url text not null,
  source_url text not null,
  application_url text,
  deadline date,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  live_status text not null default 'LIVE'
    check (live_status in ('LIVE', 'TO_VERIFY', 'CLOSED')),
  is_current boolean not null default true,
  is_new boolean not null default true,
  change_type text not null default 'NEW'
    check (change_type in ('NEW', 'UPDATED', 'UNCHANGED', 'REMOVED')),
  content_hash text not null,
  raw_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(raw_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monitored_opportunities_title_not_blank
    check (char_length(btrim(title)) between 2 and 500),
  constraint monitored_opportunities_url_not_blank
    check (char_length(btrim(canonical_url)) > 0)
);

comment on table public.monitored_opportunities is
  'Private normalized opportunities discovered from the public URLs added by each user.';

create unique index monitored_opportunities_user_url_unique
  on public.monitored_opportunities (user_id, lower(rtrim(canonical_url, '/')));
create index monitored_opportunities_user_current_idx
  on public.monitored_opportunities (user_id, is_current, last_seen desc);
create index monitored_opportunities_source_current_idx
  on public.monitored_opportunities (source_id, is_current, last_seen desc);

create table public.monitoring_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_run_date date not null,
  run_kind text not null check (run_kind in ('scheduled', 'manual', 'test')),
  status text not null default 'running'
    check (status in ('running', 'completed', 'partial', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  sources_total integer not null default 0 check (sources_total >= 0),
  sources_succeeded integer not null default 0 check (sources_succeeded >= 0),
  sources_failed integer not null default 0 check (sources_failed >= 0),
  opportunities_found integer not null default 0 check (opportunities_found >= 0),
  matches_found integer not null default 0 check (matches_found >= 0),
  message text,
  created_at timestamptz not null default now()
);

create unique index monitoring_runs_scheduled_once_daily
  on public.monitoring_runs (user_id, local_run_date)
  where run_kind = 'scheduled';
create index monitoring_runs_user_started_idx
  on public.monitoring_runs (user_id, started_at desc);

create table public.monitoring_source_runs (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.monitoring_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id bigint references public.monitored_studios(id) on delete set null,
  source_name text not null,
  source_url text not null,
  status text not null check (status in ('completed', 'failed', 'skipped')),
  http_status integer,
  candidates_found integer not null default 0 check (candidates_found >= 0),
  opportunities_saved integer not null default 0 check (opportunities_saved >= 0),
  matches_found integer not null default 0 check (matches_found >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);

create index monitoring_source_runs_run_idx
  on public.monitoring_source_runs (run_id, created_at);
create index monitoring_source_runs_user_created_idx
  on public.monitoring_source_runs (user_id, created_at desc);

create table public.monitoring_runtime_config (
  id boolean primary key default true check (id),
  cron_token_hash text not null,
  updated_at timestamptz not null default now()
);

comment on table public.monitoring_runtime_config is
  'Internal one-row configuration. No browser role receives access.';

alter table public.monitored_opportunities enable row level security;
alter table public.monitoring_runs enable row level security;
alter table public.monitoring_source_runs enable row level security;
alter table public.monitoring_runtime_config enable row level security;

create policy monitored_opportunities_select_own
  on public.monitored_opportunities for select to authenticated
  using ((select auth.uid()) = user_id);

create policy monitoring_runs_select_own
  on public.monitoring_runs for select to authenticated
  using ((select auth.uid()) = user_id);

create policy monitoring_source_runs_select_own
  on public.monitoring_source_runs for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.monitored_opportunities from anon, authenticated;
revoke all on table public.monitoring_runs from anon, authenticated;
revoke all on table public.monitoring_source_runs from anon, authenticated;
revoke all on table public.monitoring_runtime_config from anon, authenticated;
grant select on table public.monitored_opportunities to authenticated;
grant select on table public.monitoring_runs to authenticated;
grant select on table public.monitoring_source_runs to authenticated;
