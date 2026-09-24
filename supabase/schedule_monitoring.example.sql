-- Run only after deploying the monitor-opportunities Edge Function.
-- Replace the two placeholders locally. Never commit their real values.

select vault.create_secret(
  'REPLACE_WITH_A_LONG_RANDOM_TOKEN',
  'grim_monitor_cron_token',
  'Authenticates the private daily GRIM monitoring job'
);

insert into public.monitoring_runtime_config (id, cron_token_hash)
values (
  true,
  encode(extensions.digest('REPLACE_WITH_A_LONG_RANDOM_TOKEN', 'sha256'), 'hex')
)
on conflict (id) do update
set cron_token_hash = excluded.cron_token_hash,
    updated_at = now();

select cron.schedule(
  'grim-daily-monitor',
  '35 5,6 * * *',
  $schedule$
  select net.http_post(
    url := 'https://REPLACE_WITH_PROJECT_REF.supabase.co/functions/v1/monitor-opportunities',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-grim-cron-token', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'grim_monitor_cron_token'
        limit 1
      )
    ),
    body := jsonb_build_object('trigger', 'scheduled', 'requested_at', now()),
    timeout_milliseconds := 120000
  );
  $schedule$
);
