create index monitoring_source_runs_source_idx
  on public.monitoring_source_runs (source_id, created_at desc);

create policy monitoring_runtime_config_deny_browser
  on public.monitoring_runtime_config for select to authenticated
  using (false);
