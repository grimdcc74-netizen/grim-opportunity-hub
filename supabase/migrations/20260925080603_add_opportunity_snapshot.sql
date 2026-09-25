alter table public.opportunity_user_state
  add column if not exists opportunity_snapshot jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.opportunity_user_state'::regclass
      and conname = 'opportunity_user_state_snapshot_object'
  ) then
    alter table public.opportunity_user_state
      add constraint opportunity_user_state_snapshot_object
      check (
        opportunity_snapshot is null
        or jsonb_typeof(opportunity_snapshot) = 'object'
      );
  end if;
end
$$;

comment on column public.opportunity_user_state.opportunity_snapshot is
  'Private compact snapshot preserved when the user classifies an opportunity.';
