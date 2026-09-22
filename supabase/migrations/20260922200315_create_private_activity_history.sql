create table public.activity_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('application', 'material', 'studio')),
  entity_id text not null,
  event_type text not null check (
    event_type in (
      'application_created', 'application_status_changed', 'application_deleted',
      'material_created', 'material_updated', 'material_deleted',
      'studio_created', 'studio_checked', 'studio_archived',
      'studio_reactivated', 'studio_updated', 'studio_deleted'
    )
  ),
  subject_label text not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now()
);

comment on table public.activity_history is
  'Private immutable history of meaningful user actions generated automatically from applications, materials and monitored studios.';

create index activity_history_user_occurred_idx
  on public.activity_history (user_id, occurred_at desc);

alter table public.activity_history enable row level security;

create policy activity_history_select_own
  on public.activity_history for select to authenticated
  using ((select auth.uid()) = user_id);

create policy activity_history_insert_own
  on public.activity_history for insert to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on table public.activity_history to authenticated;
grant usage, select on sequence public.activity_history_id_seq to authenticated;

create or replace function public.log_grim_activity_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  history_user_id uuid;
  history_entity_id text;
  history_event_type text;
  history_subject text;
  history_metadata jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'applications' then
    history_user_id := coalesce(new.user_id, old.user_id);
    history_entity_id := coalesce(new.opportunity_id, old.opportunity_id);
    history_subject := history_entity_id;

    if tg_op = 'INSERT' then
      history_event_type := 'application_created';
      history_metadata := jsonb_build_object('status', new.status);
    elsif tg_op = 'DELETE' then
      history_event_type := 'application_deleted';
      history_metadata := jsonb_build_object('status', old.status);
    elsif new.status is distinct from old.status then
      history_event_type := 'application_status_changed';
      history_metadata := jsonb_build_object('from_status', old.status, 'to_status', new.status);
    else
      return new;
    end if;

  elsif tg_table_name = 'materials' then
    history_user_id := coalesce(new.user_id, old.user_id);
    history_entity_id := coalesce(new.id, old.id)::text;
    history_subject := coalesce(new.name, old.name);

    if tg_op = 'INSERT' then
      history_event_type := 'material_created';
      history_metadata := jsonb_build_object('material_type', new.material_type, 'areas', new.areas);
    elsif tg_op = 'DELETE' then
      history_event_type := 'material_deleted';
      history_metadata := jsonb_build_object('material_type', old.material_type, 'areas', old.areas);
    elsif (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
      history_event_type := 'material_updated';
      history_metadata := jsonb_build_object('material_type', new.material_type, 'areas', new.areas);
    else
      return new;
    end if;

  elsif tg_table_name = 'monitored_studios' then
    history_user_id := coalesce(new.user_id, old.user_id);
    history_entity_id := coalesce(new.id, old.id)::text;
    history_subject := coalesce(new.name, old.name);

    if tg_op = 'INSERT' then
      history_event_type := 'studio_created';
    elsif tg_op = 'DELETE' then
      history_event_type := 'studio_deleted';
    elsif new.last_checked_at is distinct from old.last_checked_at then
      history_event_type := 'studio_checked';
    elsif new.is_active is distinct from old.is_active then
      history_event_type := case when new.is_active then 'studio_reactivated' else 'studio_archived' end;
    elsif (to_jsonb(new) - array['updated_at', 'last_checked_at', 'is_active']) is distinct from
          (to_jsonb(old) - array['updated_at', 'last_checked_at', 'is_active']) then
      history_event_type := 'studio_updated';
    else
      return new;
    end if;

    history_metadata := jsonb_build_object(
      'location', coalesce(new.location, old.location),
      'focus_areas', coalesce(new.focus_areas, old.focus_areas)
    );
  else
    return coalesce(new, old);
  end if;

  insert into public.activity_history (
    user_id, entity_type, entity_id, event_type, subject_label, metadata
  ) values (
    history_user_id,
    case tg_table_name
      when 'applications' then 'application'
      when 'materials' then 'material'
      else 'studio'
    end,
    history_entity_id,
    history_event_type,
    history_subject,
    history_metadata
  );

  return coalesce(new, old);
end;
$$;

revoke all on function public.log_grim_activity_history() from public, anon, authenticated;

create trigger applications_activity_history
after insert or update or delete on public.applications
for each row execute function public.log_grim_activity_history();

create trigger materials_activity_history
after insert or update or delete on public.materials
for each row execute function public.log_grim_activity_history();

create trigger monitored_studios_activity_history
after insert or update or delete on public.monitored_studios
for each row execute function public.log_grim_activity_history();
