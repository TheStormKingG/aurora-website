-- ── Audit trigger (spec §7): every write on a clinical table ────────
create or replace function health.log_change() returns trigger
language plpgsql security definer set search_path = health, public, pg_temp as $$
declare rec jsonb; pid uuid; rid uuid; role_name text;
begin
  -- Bulk jobs (archive/purge) log one summary row instead of per-row noise.
  if current_setting('health.suppress_log', true) = 'on' then return null; end if;
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  pid := (rec->>'patient_id')::uuid;
  rid := (rec->>'id')::uuid;
  role_name := case
    when auth.uid() is null or auth.role() = 'service_role' then 'system'
    else 'patient' end;
  insert into health.access_log
    (actor_user_id, actor_role, patient_id, action, resource, resource_id, ip, user_agent)
  values
    (auth.uid(), role_name, pid, lower(tg_op), tg_table_name, rid,
     health.request_ip(), health.request_user_agent());
  return null;
end $$;

create trigger readings_log after insert or update or delete on health.readings
  for each row execute function health.log_change();
create trigger water_log after insert or update or delete on health.water_intake
  for each row execute function health.log_change();
create trigger exercise_log after insert or update or delete on health.exercise_sessions
  for each row execute function health.log_change();
create trigger profile_log after insert or update or delete on health.profile_entries
  for each row execute function health.log_change();
create trigger settings_log after insert or update or delete on health.settings
  for each row execute function health.log_change();

-- ── RPCs called by the app ──────────────────────────────────────────

-- Status for the client guard: patient_id, active consent version, pending deletion.
create or replace function health.my_status() returns jsonb
language sql stable security definer set search_path = health, public, pg_temp as $$
  select coalesce((
    select jsonb_build_object(
      'patient_id', p.patient_id,
      'active_version', (
        select notice_version from health.consents c
        where c.patient_id = p.patient_id and c.superseded_at is null and c.withdrawn_at is null
        order by granted_at desc, id desc limit 1),
      'delete_after', (
        select delete_after from health.consents c
        where c.patient_id = p.patient_id order by granted_at desc, id desc limit 1)
    )
    from health.patients p where p.user_id = auth.uid()
  ), '{}'::jsonb)
$$;

-- Consent: creates the patient row on first use, supersedes any open
-- consent, records the new one, seeds settings, logs the event.
create or replace function health.grant_consent(notice_version text, scope jsonb) returns uuid
language plpgsql security definer set search_path = health, public, pg_temp as $$
declare uid uuid := auth.uid(); pid uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  insert into health.patients (user_id) values (uid) on conflict (user_id) do nothing;
  select patient_id into pid from health.patients where user_id = uid;
  update health.consents set superseded_at = now()
    where patient_id = pid and superseded_at is null and withdrawn_at is null;
  -- Re-consenting after a withdrawal cancels the pending deletion because
  -- purge_withdrawn() keys off the LATEST consent row; history is never rewritten.
  insert into health.consents (patient_id, notice_version, scope)
    values (pid, grant_consent.notice_version, grant_consent.scope);
  insert into health.settings (patient_id) values (pid) on conflict (patient_id) do nothing;
  insert into health.access_log (actor_user_id, actor_role, patient_id, action, resource, ip, user_agent)
    values (uid, 'patient', pid, 'consent_granted', 'consents',
            health.request_ip(), health.request_user_agent());
  return pid;
end $$;

create or replace function health.withdraw_consent() returns void
language plpgsql security definer set search_path = health, public, pg_temp as $$
declare pid uuid := health.current_patient_id();
begin
  if pid is null then return; end if;
  update health.consents
    set withdrawn_at = now(), delete_after = now() + interval '30 days'
    where patient_id = pid and superseded_at is null and withdrawn_at is null;
  insert into health.access_log (actor_user_id, actor_role, patient_id, action, resource, ip, user_agent)
    values (auth.uid(), 'patient', pid, 'consent_withdrawn', 'consents',
            health.request_ip(), health.request_user_agent());
end $$;

-- One row per browser session: who opened the app, when, from where.
create or replace function health.log_app_open() returns void
language plpgsql security definer set search_path = health, public, pg_temp as $$
declare pid uuid := health.current_patient_id();
begin
  if pid is null then return; end if;
  -- One row per session; a misbehaving client cannot flood the log.
  if exists (select 1 from health.access_log
             where patient_id = pid and action = 'app_open' and at > now() - interval '1 hour') then
    return;
  end if;
  insert into health.access_log (actor_user_id, actor_role, patient_id, action, resource, ip, user_agent)
    values (auth.uid(), 'patient', pid, 'app_open', 'app',
            health.request_ip(), health.request_user_agent());
end $$;

create or replace function health.log_export() returns void
language plpgsql security definer set search_path = health, public, pg_temp as $$
declare pid uuid := health.current_patient_id();
begin
  if pid is null then return; end if;
  if exists (select 1 from health.access_log
             where patient_id = pid and action = 'export' and at > now() - interval '1 minute') then
    return;
  end if;
  insert into health.access_log (actor_user_id, actor_role, patient_id, action, resource, ip, user_agent)
    values (auth.uid(), 'patient', pid, 'export', 'all',
            health.request_ip(), health.request_user_agent());
end $$;

revoke execute on function
  health.log_change(), health.my_status(), health.grant_consent(text, jsonb),
  health.withdraw_consent(), health.log_app_open(), health.log_export()
from public, anon;
grant execute on function
  health.my_status(), health.grant_consent(text, jsonb),
  health.withdraw_consent(), health.log_app_open(), health.log_export()
to authenticated;
