-- Twice-daily digest scheduling. Ticks every 15 minutes; the edge function
-- itself decides whether the morning/evening cycle is actually due based on
-- mgmt_settings, so admins can change send times without touching SQL.
--
-- The cron job's Authorization header comes from Vault, not this file, so
-- the secret value is never committed to git. Before this migration will
-- work, run once in the SQL editor (the CLI already has the edge function
-- secret CRON_SECRET set to the same value):
--
--   select vault.create_secret('<the CRON_SECRET value>', 'cron_secret');

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'management-digest-tick',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://zjoikrdcqltwrxykyhms.supabase.co/functions/v1/send-management-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
