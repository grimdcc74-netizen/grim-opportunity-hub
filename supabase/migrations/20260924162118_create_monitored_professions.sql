create table public.monitored_professions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  seniority_level smallint,
  seniority_locked boolean not null default false,
  is_direction boolean not null default false,
  is_active boolean not null default true,
  notes text,
  sort_order integer not null default 999,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monitored_professions_name_not_blank
    check (char_length(btrim(name)) between 2 and 200),
  constraint monitored_professions_category_valid
    check (category in (
      'direction_supervision',
      'preproduction',
      'assets_surfacing',
      'environment',
      'fx_lighting_render',
      'shot_postproduction',
      'ai_crossfunctional'
    )),
  constraint monitored_professions_seniority_valid
    check (seniority_level is null or seniority_level between 1 and 6)
);

comment on table public.monitored_professions is
  'Private profession targets added to the daily GRIM opportunity radar.';

create unique index monitored_professions_user_name_unique
  on public.monitored_professions (user_id, lower(btrim(name)));

create index monitored_professions_user_active_order_idx
  on public.monitored_professions (user_id, is_active, sort_order, name);

alter table public.monitored_professions enable row level security;

create policy monitored_professions_select_own
  on public.monitored_professions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy monitored_professions_insert_own
  on public.monitored_professions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy monitored_professions_update_own
  on public.monitored_professions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy monitored_professions_delete_own
  on public.monitored_professions for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.monitored_professions from anon;
grant select, insert, update, delete on table public.monitored_professions to authenticated;

with profession_catalog (
  name,
  category,
  seniority_level,
  seniority_locked,
  is_direction,
  sort_order
) as (
  values
    ('Creative Director', 'direction_supervision', null, true, true, 1),
    ('Senior Creative Art Director', 'direction_supervision', 3, true, false, 2),
    ('Creative Supervisor', 'direction_supervision', null, true, true, 3),
    ('Senior VFX Supervisor', 'direction_supervision', 5, true, false, 4),
    ('VFX Supervisor', 'direction_supervision', 5, true, false, 5),
    ('Compositing Supervisor', 'direction_supervision', 5, true, false, 6),
    ('Creative Technical Lead', 'direction_supervision', 4, true, false, 7),
    ('Visual Development Artist', 'preproduction', null, false, false, 8),
    ('Character Designer', 'preproduction', null, false, false, 9),
    ('Illustrator', 'preproduction', null, false, false, 10),
    ('Storyboard Artist', 'preproduction', null, false, false, 11),
    ('Visualizer', 'preproduction', null, false, false, 12),
    ('Senior CG Artist', 'assets_surfacing', 3, true, false, 13),
    ('CG Artist', 'assets_surfacing', null, false, false, 14),
    ('3D Artist', 'assets_surfacing', null, false, false, 15),
    ('3D Modeler', 'assets_surfacing', null, false, false, 16),
    ('Look Dev Artist', 'assets_surfacing', null, false, false, 17),
    ('Texture Artist', 'assets_surfacing', null, false, false, 18),
    ('3D Texture Artist', 'assets_surfacing', null, false, false, 19),
    ('Texture Painter', 'assets_surfacing', null, false, false, 20),
    ('Environment Generalist TD', 'environment', null, false, false, 21),
    ('Matte Painter / Environment Generalist', 'environment', null, false, false, 22),
    ('Real-Time Environment Artist', 'environment', null, false, false, 23),
    ('FX TD', 'fx_lighting_render', null, false, false, 24),
    ('Houdini FX Operator', 'fx_lighting_render', null, false, false, 25),
    ('Lighting TD', 'fx_lighting_render', null, false, false, 26),
    ('VFX 3D/Render Operator', 'fx_lighting_render', null, false, false, 27),
    ('Senior VFX Artist', 'shot_postproduction', 3, true, false, 28),
    ('Matte Painter', 'shot_postproduction', null, false, false, 29),
    ('Compositor', 'shot_postproduction', null, false, false, 30),
    ('Rotoscope Artist', 'shot_postproduction', null, false, false, 31),
    ('Video Maker', 'shot_postproduction', null, false, false, 32),
    ('Lead Generative AI Artist', 'ai_crossfunctional', 4, true, false, 33),
    ('AI Creative Specialist', 'ai_crossfunctional', null, false, false, 34),
    ('Visual Development Artist, AI & Generative Tools', 'ai_crossfunctional', null, false, false, 35),
    ('AI Workflow Specialist', 'ai_crossfunctional', null, false, false, 36),
    ('AI Integrator', 'ai_crossfunctional', null, false, false, 37),
    ('AI-Enhanced VFX Specialist', 'ai_crossfunctional', null, false, false, 38)
)
insert into public.monitored_professions (
  user_id,
  name,
  category,
  seniority_level,
  seniority_locked,
  is_direction,
  sort_order
)
select
  users.id,
  catalog.name,
  catalog.category,
  catalog.seniority_level,
  catalog.seniority_locked,
  catalog.is_direction,
  catalog.sort_order
from auth.users as users
cross join profession_catalog as catalog
on conflict do nothing;
