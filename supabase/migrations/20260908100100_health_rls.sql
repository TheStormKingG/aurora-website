-- Helpers (spec §7). security definer + fixed search_path so they can
-- read health.patients/consents regardless of the caller's policies.
create or replace function health.current_patient_id() returns uuid
language sql stable security definer set search_path = health, public as $$
  select patient_id from health.patients where user_id = auth.uid()
$$;

create or replace function health.has_active_consent(pid uuid) returns boolean
language sql stable security definer set search_path = health, public as $$
  select exists (
    select 1 from health.consents
    where patient_id = pid and superseded_at is null and withdrawn_at is null
  )
$$;

-- Request metadata from PostgREST ("from where" in the audit log).
create or replace function health.request_ip() returns inet
language plpgsql stable security definer set search_path = health, public as $$
declare h json; raw text;
begin
  h := nullif(current_setting('request.headers', true), '')::json;
  if h is null then return null; end if;
  raw := coalesce(h->>'x-forwarded-for', h->>'x-real-ip', h->>'cf-connecting-ip');
  if raw is null then return null; end if;
  return trim(split_part(raw, ',', 1))::inet;
exception when others then return null;
end $$;

create or replace function health.request_user_agent() returns text
language plpgsql stable security definer set search_path = health, public as $$
declare h json;
begin
  h := nullif(current_setting('request.headers', true), '')::json;
  return left(h->>'user-agent', 300);
exception when others then return null;
end $$;

revoke execute on function
  health.current_patient_id(), health.has_active_consent(uuid),
  health.request_ip(), health.request_user_agent()
from public, anon;
grant execute on function health.current_patient_id(), health.has_active_consent(uuid)
  to authenticated;

-- ── Policies (authenticated only; anon has no grants at all) ───────
create policy "patients: read own" on health.patients
  for select to authenticated using (user_id = auth.uid());

create policy "consents: read own" on health.consents
  for select to authenticated using (patient_id = health.current_patient_id());

create policy "settings: read own" on health.settings
  for select to authenticated using (patient_id = health.current_patient_id());
create policy "settings: update own" on health.settings
  for update to authenticated
  using (patient_id = health.current_patient_id())
  with check (patient_id = health.current_patient_id() and health.has_active_consent(patient_id));

-- Clinical + lifestyle + record tables: read/insert/update/delete own;
-- inserts and updates additionally require an active consent.
create policy "readings: read own" on health.readings
  for select to authenticated using (patient_id = health.current_patient_id());
create policy "readings: insert own" on health.readings
  for insert to authenticated
  with check (patient_id = health.current_patient_id() and health.has_active_consent(patient_id));
create policy "readings: update own" on health.readings
  for update to authenticated
  using (patient_id = health.current_patient_id())
  with check (patient_id = health.current_patient_id() and health.has_active_consent(patient_id));
create policy "readings: delete own" on health.readings
  for delete to authenticated using (patient_id = health.current_patient_id());

create policy "water: read own" on health.water_intake
  for select to authenticated using (patient_id = health.current_patient_id());
create policy "water: insert own" on health.water_intake
  for insert to authenticated
  with check (patient_id = health.current_patient_id() and health.has_active_consent(patient_id));
create policy "water: update own" on health.water_intake
  for update to authenticated
  using (patient_id = health.current_patient_id())
  with check (patient_id = health.current_patient_id() and health.has_active_consent(patient_id));
create policy "water: delete own" on health.water_intake
  for delete to authenticated using (patient_id = health.current_patient_id());

create policy "exercise: read own" on health.exercise_sessions
  for select to authenticated using (patient_id = health.current_patient_id());
create policy "exercise: insert own" on health.exercise_sessions
  for insert to authenticated
  with check (patient_id = health.current_patient_id() and health.has_active_consent(patient_id));
create policy "exercise: update own" on health.exercise_sessions
  for update to authenticated
  using (patient_id = health.current_patient_id())
  with check (patient_id = health.current_patient_id() and health.has_active_consent(patient_id));
create policy "exercise: delete own" on health.exercise_sessions
  for delete to authenticated using (patient_id = health.current_patient_id());

create policy "profile: read own" on health.profile_entries
  for select to authenticated using (patient_id = health.current_patient_id());
create policy "profile: insert own" on health.profile_entries
  for insert to authenticated
  with check (patient_id = health.current_patient_id() and health.has_active_consent(patient_id));
create policy "profile: update own" on health.profile_entries
  for update to authenticated
  using (patient_id = health.current_patient_id())
  with check (patient_id = health.current_patient_id() and health.has_active_consent(patient_id));
create policy "profile: delete own" on health.profile_entries
  for delete to authenticated using (patient_id = health.current_patient_id());

-- Audit log: patients read their own history; nobody but definer
-- functions writes it (no insert/update/delete policies exist).
create policy "access_log: read own" on health.access_log
  for select to authenticated using (patient_id = health.current_patient_id());
