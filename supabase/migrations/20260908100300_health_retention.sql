-- ── Archive tables (spec §8): same shape + archived_at; no client policies ──
create table health.readings_archive
  (like health.readings including defaults including constraints including indexes);
alter table health.readings_archive add column archived_at timestamptz not null default now();
create table health.water_intake_archive
  (like health.water_intake including defaults including constraints including indexes);
alter table health.water_intake_archive add column archived_at timestamptz not null default now();
create table health.exercise_sessions_archive
  (like health.exercise_sessions including defaults including constraints including indexes);
alter table health.exercise_sessions_archive add column archived_at timestamptz not null default now();

alter table health.readings_archive enable row level security;
alter table health.water_intake_archive enable row level security;
alter table health.exercise_sessions_archive enable row level security;
grant all on health.readings_archive, health.water_intake_archive, health.exercise_sessions_archive
  to service_role;
-- No grants to authenticated: the app never reads archives.

-- ── Purge (used by delete-now and by the 30-day job) ────────────────
create or replace function health.purge_patient(pid uuid) returns void
language plpgsql security definer set search_path = health, public, pg_temp as $$
begin
  -- Deleting the patient row cascades to every live table; the before-delete
  -- trigger below removes archive rows and writes the single 'purge' audit row.
  delete from health.patients where patient_id = pid;
end $$;

create or replace function health.delete_my_health_data() returns void
language plpgsql security definer set search_path = health, public, pg_temp as $$
declare pid uuid := health.current_patient_id();
begin
  if pid is null then raise exception 'no health record'; end if;
  perform health.purge_patient(pid);
end $$;

create or replace function health.purge_withdrawn() returns int
language plpgsql security definer set search_path = health, public, pg_temp as $$
declare r record; n int := 0;
begin
  for r in
    select p.patient_id from health.patients p
    where not exists (
      select 1 from health.consents c
      where c.patient_id = p.patient_id and c.superseded_at is null and c.withdrawn_at is null)
    -- max(): the most recent scheduled deletion governs, and it cannot tie.
    and (select max(c.delete_after) from health.consents c
         where c.patient_id = p.patient_id) < now()
  loop
    perform health.purge_patient(r.patient_id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ── 12-month archive ────────────────────────────────────────────────
create or replace function health.archive_old() returns int
language plpgsql security definer set search_path = health, public, pg_temp as $$
declare n int := 0; m int;
begin
  perform set_config('health.suppress_log', 'on', true);

  with moved as (
    delete from health.readings where recorded_at < now() - interval '12 months' returning *
  ), ins as (
    insert into health.readings_archive
      (id, patient_id, kind, recorded_at, systolic, diastolic, pulse, glucose_mgdl, glucose_context,
       chol_total_mgdl, chol_ldl_mgdl, chol_hdl_mgdl, chol_trig_mgdl, entered_unit, note, created_at, archived_at)
    select id, patient_id, kind, recorded_at, systolic, diastolic, pulse, glucose_mgdl, glucose_context,
           chol_total_mgdl, chol_ldl_mgdl, chol_hdl_mgdl, chol_trig_mgdl, entered_unit, note, created_at, now()
    from moved returning patient_id
  ), logged as (
    insert into health.access_log (actor_role, patient_id, action, resource)
      select distinct 'system', patient_id, 'archive', 'readings' from ins returning 1
  )
  select count(*) into m from ins;
  n := n + m;

  with moved as (
    delete from health.water_intake where recorded_at < now() - interval '12 months' returning *
  ), ins as (
    insert into health.water_intake_archive (id, patient_id, ml, recorded_at, created_at, archived_at)
    select id, patient_id, ml, recorded_at, created_at, now() from moved returning patient_id
  ), logged as (
    insert into health.access_log (actor_role, patient_id, action, resource)
      select distinct 'system', patient_id, 'archive', 'water_intake' from ins returning 1
  )
  select count(*) into m from ins;
  n := n + m;

  with moved as (
    delete from health.exercise_sessions where recorded_at < now() - interval '12 months' returning *
  ), ins as (
    insert into health.exercise_sessions_archive
      (id, patient_id, activity, minutes, intensity, note, recorded_at, created_at, archived_at)
    select id, patient_id, activity, minutes, intensity, note, recorded_at, created_at, now()
    from moved returning patient_id
  ), logged as (
    insert into health.access_log (actor_role, patient_id, action, resource)
      select distinct 'system', patient_id, 'archive', 'exercise_sessions' from ins returning 1
  )
  select count(*) into m from ins;
  n := n + m;

  return n;
end $$;

-- Archive rows have no FK, so they are removed here when the patient row goes
-- (delete-now, the 30-day purge, or an account deletion cascading from auth.users).
-- One summary audit row replaces the per-row noise the cascade would otherwise log.
create or replace function health.purge_archives_for_patient() returns trigger
language plpgsql security definer set search_path = health, public, pg_temp as $$
begin
  perform set_config('health.suppress_log', 'on', true);
  delete from health.readings_archive where patient_id = old.patient_id;
  delete from health.water_intake_archive where patient_id = old.patient_id;
  delete from health.exercise_sessions_archive where patient_id = old.patient_id;
  insert into health.access_log (actor_user_id, actor_role, patient_id, action, resource, ip, user_agent)
    values (auth.uid(), case when auth.uid() is null then 'system' else 'patient' end,
            old.patient_id, 'purge', 'patients', health.request_ip(), health.request_user_agent());
  return old;
end $$;
create trigger patients_purge_archives before delete on health.patients
  for each row execute function health.purge_archives_for_patient();

revoke execute on function
  health.purge_patient(uuid), health.delete_my_health_data(),
  health.purge_withdrawn(), health.archive_old(), health.purge_archives_for_patient()
from public, anon;
grant execute on function health.delete_my_health_data() to authenticated;
-- The RLS proof script and the dashboard run the two jobs with the service key.
grant execute on function health.archive_old(), health.purge_withdrawn() to service_role;
