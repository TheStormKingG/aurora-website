-- Two grants the earlier files left open.
--
-- 1. touch_updated_at() was created after the `alter default privileges`
--    line but still carries PostgreSQL's default PUBLIC EXECUTE. It is a
--    trigger function (uncallable directly), so this is tidiness rather
--    than a hole — but every other function in the schema is revoked.
revoke execute on function health.touch_updated_at() from public, anon;

-- 2. `grant all on all tables ... to service_role` handed out TRUNCATE on
--    the audit trail. UPDATE/DELETE were already revoked; TRUNCATE would
--    empty it just as effectively. Definer functions INSERT as the table
--    owner, so nothing needs it.
revoke truncate on health.access_log from service_role;
