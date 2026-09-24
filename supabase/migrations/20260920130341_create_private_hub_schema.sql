create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_user_state (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id text not null check (length(btrim(opportunity_id)) > 0),
  personal_status text not null default 'da_valutare' check (personal_status in (
    'da_valutare', 'monitorata', 'in_preparazione', 'inviata', 'follow_up',
    'colloquio', 'risposta_ricevuta', 'archiviata', 'scartata'
  )),
  priority smallint check (priority between 1 and 5),
  notes text,
  next_action text,
  follow_up_date date,
  material_readiness smallint check (material_readiness between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

comment on column public.opportunity_user_state.opportunity_id is
  'Stable public opportunity ID from grim-opportunity-data; public opportunity data is not duplicated here.';

create table public.applications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id text not null check (length(btrim(opportunity_id)) > 0),
  status text not null default 'in_preparazione' check (status in (
    'in_preparazione', 'inviata', 'follow_up', 'colloquio',
    'risposta_ricevuta', 'accettata', 'rifiutata', 'archiviata'
  )),
  priority smallint check (priority between 1 and 5),
  notes text,
  application_date date,
  deadline date,
  follow_up_date date,
  application_url text,
  contact_name text,
  contact_email text,
  material_ids bigint[] not null default '{}'::bigint[],
  missing_materials text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

create table public.materials (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  material_type text not null check (length(btrim(material_type)) > 0),
  areas text[] not null check (
    cardinality(areas) > 0 and
    areas <@ array['vfx_cgi_ai', 'art', 'street_art_graffiti', 'photography']::text[]
  ),
  url text,
  storage_path text,
  version_label text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.materials.areas is
  'One material can belong to multiple areas without duplicating the file. Allowed: vfx_cgi_ai, art, street_art_graffiti, photography.';

create table public.monitored_studios (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  website_url text,
  focus_areas text[] not null default '{}'::text[] check (
    focus_areas <@ array['vfx_cgi_ai', 'art', 'street_art_graffiti', 'photography']::text[]
  ),
  location text,
  notes text,
  is_active boolean not null default true,
  last_checked_at timestamptz,
  next_check_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  backup_version integer not null default 1 check (backup_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_opportunity_id_idx on public.applications (opportunity_id);
create index applications_user_status_idx on public.applications (user_id, status);
create index applications_user_follow_up_idx on public.applications (user_id, follow_up_date)
  where follow_up_date is not null;
create index materials_user_id_idx on public.materials (user_id);
create index materials_areas_gin_idx on public.materials using gin (areas);
create index monitored_studios_user_next_check_idx
  on public.monitored_studios (user_id, next_check_date) where is_active = true;

alter table public.profiles enable row level security;
alter table public.opportunity_user_state enable row level security;
alter table public.applications enable row level security;
alter table public.materials enable row level security;
alter table public.monitored_studios enable row level security;
alter table public.settings enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy profiles_delete_own on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy opportunity_state_select_own on public.opportunity_user_state for select to authenticated using ((select auth.uid()) = user_id);
create policy opportunity_state_insert_own on public.opportunity_user_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy opportunity_state_update_own on public.opportunity_user_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy opportunity_state_delete_own on public.opportunity_user_state for delete to authenticated using ((select auth.uid()) = user_id);

create policy applications_select_own on public.applications for select to authenticated using ((select auth.uid()) = user_id);
create policy applications_insert_own on public.applications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy applications_update_own on public.applications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy applications_delete_own on public.applications for delete to authenticated using ((select auth.uid()) = user_id);

create policy materials_select_own on public.materials for select to authenticated using ((select auth.uid()) = user_id);
create policy materials_insert_own on public.materials for insert to authenticated with check ((select auth.uid()) = user_id);
create policy materials_update_own on public.materials for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy materials_delete_own on public.materials for delete to authenticated using ((select auth.uid()) = user_id);

create policy monitored_studios_select_own on public.monitored_studios for select to authenticated using ((select auth.uid()) = user_id);
create policy monitored_studios_insert_own on public.monitored_studios for insert to authenticated with check ((select auth.uid()) = user_id);
create policy monitored_studios_update_own on public.monitored_studios for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy monitored_studios_delete_own on public.monitored_studios for delete to authenticated using ((select auth.uid()) = user_id);

create policy settings_select_own on public.settings for select to authenticated using ((select auth.uid()) = user_id);
create policy settings_insert_own on public.settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy settings_update_own on public.settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy settings_delete_own on public.settings for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.profiles, public.opportunity_user_state, public.applications,
  public.materials, public.monitored_studios, public.settings from anon;
grant select, insert, update, delete on table public.profiles, public.opportunity_user_state,
  public.applications, public.materials, public.monitored_studios, public.settings to authenticated;
grant usage, select on sequence public.opportunity_user_state_id_seq,
  public.applications_id_seq, public.materials_id_seq, public.monitored_studios_id_seq to authenticated;

insert into public.profiles (user_id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', raw_user_meta_data ->> 'full_name', 'Grim')
from auth.users
on conflict (user_id) do nothing;

insert into public.settings (user_id, preferences)
select id, '{"start_view":"today","reminder_window_days":3}'::jsonb
from auth.users
on conflict (user_id) do nothing;
