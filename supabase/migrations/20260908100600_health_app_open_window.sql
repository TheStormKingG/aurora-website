-- The app_open guard was an hour, which is longer than the thing it records.
--
-- Spec §9.1 wants one row per browser session and §7 shows the patient
-- "who, when, from where". An hour-wide guard silently drops the second
-- session — reopening the app 30 minutes later, or opening it on a second
-- device — so the history under-reports real access. The guard exists only
-- to stop a broken or hostile client flooding the log, and two minutes
-- bounds that to 30 rows an hour while leaving genuine sessions intact.
-- The client's own per-patient sessionStorage flag remains the primary
-- control; this is the backstop.
create or replace function health.log_app_open() returns void
language plpgsql security definer set search_path = health, public, pg_temp as $$
declare pid uuid := health.current_patient_id();
begin
  if pid is null then return; end if;
  if exists (select 1 from health.access_log
             where patient_id = pid and action = 'app_open' and at > now() - interval '2 minutes') then
    return;
  end if;
  insert into health.access_log (actor_user_id, actor_role, patient_id, action, resource, ip, user_agent)
    values (auth.uid(), 'patient', pid, 'app_open', 'app',
            health.request_ip(), health.request_user_agent());
end $$;

revoke execute on function health.log_app_open() from public, anon;
grant execute on function health.log_app_open() to authenticated;
