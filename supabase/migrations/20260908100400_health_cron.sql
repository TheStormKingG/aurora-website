-- ── Schedules (spec §8) — own migration so a pg_cron refusal cannot roll
-- back the archive tables and purge functions in 20260908100300.
-- pg_cron runs in UTC: 03:00 UTC is 23:00 GYT the previous evening.
create extension if not exists pg_cron;
do $$ begin
  execute 'grant usage on schema cron to postgres';
exception when insufficient_privilege then null; end $$;
select cron.schedule('health-archive-old', '0 3 1 * *', $$select health.archive_old()$$);
select cron.schedule('health-purge-withdrawn', '15 3 * * *', $$select health.purge_withdrawn()$$);
