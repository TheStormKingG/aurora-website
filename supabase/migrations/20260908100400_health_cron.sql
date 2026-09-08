-- ── Schedules (spec §8) — own migration so a pg_cron refusal cannot roll
-- back the archive tables and purge functions in 20260908100300.
create extension if not exists pg_cron;
grant usage on schema cron to postgres;
select cron.schedule('health-archive-old', '0 3 1 * *', $$select health.archive_old()$$);
select cron.schedule('health-purge-withdrawn', '15 3 * * *', $$select health.purge_withdrawn()$$);
