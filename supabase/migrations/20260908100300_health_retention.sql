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
create or replace function health.purge_patient(pid uuid, reason text) returns void
language plpgsql security definer set search_path = health, public as $$
begin
  perform set_config('health.suppress_log', 'on', true);
  delete from health.readings_archive where patient_id = pid;
  delete from health.water_intake_archive where patient_id = pid;
  delete from health.exercise_sessions_archive where patient_id = pid;
  delete from health.patients where patient_id = pid;   -- cascades to every live table
  insert into health.access_log (actor_user_id, actor_role, patient_id, action, resource, ip, user_agent)
    values (auth.uid(), case when auth.uid() is null then 'system' else 'patient' end,
            pid, reason, 'patients', health.request_ip(), health.request_user_agent());
end $$;

create or replace function health.delete_my_health_data() returns void
language plpgsql security definer set search_path = health, public as $$
declare pid uuid := health.current_patient_id();
begin
  if pid is null then raise exception 'no health record'; end if;
  perform health.purge_patient(pid, 'purge');
end $$;

create or replace function health.purge_withdrawn() returns int
language plpgsql security definer set search_path = health, public as $$
declare r record; n int := 0;
begin
  for r in
    select p.patient_id from health.patients p
    where not exists (
      select 1 from health.consents c
      where c.patient_id = p.patient_id and c.superseded_at is null and c.withdrawn_at is null)
    and (
      select c.delete_after from health.consents c
      where c.patient_id = p.patient_id
      order by c.granted_at desc limit 1
    ) < now()
  loop
    perform health.purge_patient(r.patient_id, 'purge');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ── 12-month archive ────────────────────────────────────────────────
create or replace function health.archive_old() returns void
language plpgsql security definer set search_path = health, public as $$
begin
  perform set_config('health.suppress_log', 'on', true);

  with moved as (
    delete from health.readings where recorded_at < now() - interval '12 months' returning *
  ), ins as (
    insert into health.readings_archive select moved.*, now() from moved returning patient_id
  )
  insert into health.access_log (actor_role, patient_id, action, resource)
    select distinct 'system', patient_id, 'archive', 'readings' from ins;

  with moved as (
    delete from health.water_intake where recorded_at < now() - interval '12 months' returning *
  ), ins as (
    insert into health.water_intake_archive select moved.*, now() from moved returning patient_id
  )
  insert into health.access_log (actor_role, patient_id, action, resource)
    select distinct 'system', patient_id, 'archive', 'water_intake' from ins;

  with moved as (
    delete from health.exercise_sessions where recorded_at < now() - interval '12 months' returning *
  ), ins as (
    insert into health.exercise_sessions_archive select moved.*, now() from moved returning patient_id
  )
  insert into health.access_log (actor_role, patient_id, action, resource)
    select distinct 'system', patient_id, 'archive', 'exercise_sessions' from ins;
end $$;

-- Archive rows have no FK (they must survive nothing — a deleted account
-- takes its archives with it). Cascade them from the patient row.
create or replace function health.purge_archives_for_patient() returns trigger
language plpgsql security definer set search_path = health, public as $$
begin
  delete from health.readings_archive where patient_id = old.patient_id;
  delete from health.water_intake_archive where patient_id = old.patient_id;
  delete from health.exercise_sessions_archive where patient_id = old.patient_id;
  return old;
end $$;
create trigger patients_purge_archives before delete on health.patients
  for each row execute function health.purge_archives_for_patient();

revoke execute on function
  health.purge_patient(uuid, text), health.delete_my_health_data(),
  health.purge_withdrawn(), health.archive_old(), health.purge_archives_for_patient()
from public, anon;
grant execute on function health.delete_my_health_data() to authenticated;
-- The RLS proof script and the dashboard run the jobs with the service key.
grant execute on all functions in schema health to service_role;
