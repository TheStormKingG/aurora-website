-- Aurora Digital Health Platform v0 (spec §4, §6).
-- Clinical data lives in its own schema, keyed by a pseudonymous
-- patient_id. No name, email or DOB sits beside a reading.
create schema if not exists health;

revoke all on schema health from public, anon;
grant usage on schema health to authenticated, service_role;

-- Functions created later in this schema must not be callable by anon.
alter default privileges in schema health revoke execute on functions from public;

-- ── Identity mapping ────────────────────────────────────────────────
create table health.patients (
  patient_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
comment on table health.patients is
  'Pseudonymous mapping auth user -> patient_id. Clinical tables reference patient_id only.';

-- ── Consent (GDPR Art. 9(2)(a)) ─────────────────────────────────────
create table health.consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references health.patients (patient_id) on delete cascade,
  notice_version text not null check (length(notice_version) between 1 and 40),
  scope jsonb not null check (jsonb_typeof(scope) = 'object' and pg_column_size(scope) < 2048),
  -- clock_timestamp(), not now(): two consents in one transaction must not
  -- tie, or "the latest consent" becomes ambiguous.
  granted_at timestamptz not null default clock_timestamp(),
  superseded_at timestamptz,   -- closed by a re-consent on a newer notice version
  withdrawn_at timestamptz,    -- closed by the patient withdrawing
  delete_after timestamptz     -- withdrawn_at + 30 days; purge job acts on it
);
create index consents_patient_active
  on health.consents (patient_id) where superseded_at is null and withdrawn_at is null;
-- my_status() and purge_withdrawn() read the latest consent row.
create index consents_patient_granted on health.consents (patient_id, granted_at desc, id desc);

-- ── Per-patient settings ────────────────────────────────────────────
create table health.settings (
  patient_id uuid primary key references health.patients (patient_id) on delete cascade,
  glucose_unit text not null default 'mg/dL' check (glucose_unit in ('mg/dL','mmol/L')),
  cholesterol_unit text not null default 'mg/dL' check (cholesterol_unit in ('mg/dL','mmol/L')),
  water_goal_ml int not null default 2000 check (water_goal_ml between 500 and 6000),
  updated_at timestamptz not null default now()
);
comment on table health.settings is
  'Seeded by health.grant_consent(); clients UPDATE only — there is no INSERT policy.';

-- ── Clinical readings (one row per measurement) ─────────────────────
create table health.readings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references health.patients (patient_id) on delete cascade,
  kind text not null check (kind in ('blood_pressure','glucose','cholesterol')),
  recorded_at timestamptz not null,
  systolic int check (systolic between 60 and 260),
  diastolic int check (diastolic between 30 and 160),
  pulse int check (pulse between 25 and 250),
  glucose_mgdl numeric(6,1) check (glucose_mgdl between 20 and 600),
  glucose_context text check (glucose_context in ('fasting','after_meal','random','bedtime')),
  -- Lipids come from lab panels: allow the extreme values a nurse most needs to see.
  chol_total_mgdl numeric(6,1) check (chol_total_mgdl between 20 and 1000),
  chol_ldl_mgdl numeric(6,1) check (chol_ldl_mgdl between 5 and 1000),
  chol_hdl_mgdl numeric(6,1) check (chol_hdl_mgdl between 5 and 300),
  chol_trig_mgdl numeric(6,1) check (chol_trig_mgdl between 10 and 5000),
  entered_unit text check (entered_unit in ('mg/dL','mmol/L')),
  note text check (length(note) <= 300),
  created_at timestamptz not null default now(),
  constraint readings_not_future check (recorded_at <= now() + interval '5 minutes'),
  constraint readings_shape check (
    (kind = 'blood_pressure' and systolic is not null and diastolic is not null
      and entered_unit is null and glucose_mgdl is null and glucose_context is null and chol_total_mgdl is null
      and chol_ldl_mgdl is null and chol_hdl_mgdl is null and chol_trig_mgdl is null)
    or (kind = 'glucose' and glucose_mgdl is not null and glucose_context is not null
      and systolic is null and diastolic is null and pulse is null and chol_total_mgdl is null
      and chol_ldl_mgdl is null and chol_hdl_mgdl is null and chol_trig_mgdl is null)
    or (kind = 'cholesterol' and chol_total_mgdl is not null
      and systolic is null and diastolic is null and pulse is null
      and glucose_mgdl is null and glucose_context is null)
  )
);
create index readings_patient_kind_time on health.readings (patient_id, kind, recorded_at desc);

-- ── Lifestyle entries ───────────────────────────────────────────────
create table health.water_intake (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references health.patients (patient_id) on delete cascade,
  ml int not null check (ml between 50 and 3000),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint water_not_future check (recorded_at <= now() + interval '5 minutes')
);
create index water_patient_time on health.water_intake (patient_id, recorded_at desc);

create table health.exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references health.patients (patient_id) on delete cascade,
  activity text not null check (activity in ('walk','run','cycle','swim','strength','rehab','other')),
  minutes int not null check (minutes between 1 and 600),
  intensity text check (intensity in ('light','moderate','vigorous')),
  note text check (length(note) <= 300),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint exercise_not_future check (recorded_at <= now() + interval '5 minutes')
);
create index exercise_patient_time on health.exercise_sessions (patient_id, recorded_at desc);

-- ── Health record (nursing checklist) ───────────────────────────────
create table health.profile_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references health.patients (patient_id) on delete cascade,
  category text not null
    check (category in ('condition','surgery','medication','allergy','family_history')),
  label text not null check (length(label) between 1 and 120),
  detail text check (length(detail) <= 500),
  occurred_on date,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profile_patient_cat on health.profile_entries (patient_id, category);

-- ── Audit log (PDR §11.3) — append-only, survives patient deletion ──
create table health.access_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor_user_id uuid,
  actor_role text not null check (actor_role in ('patient','staff','system')),
  patient_id uuid,             -- deliberately NOT a foreign key
  action text not null check (action in ('app_open','insert','update','delete','export',
    'consent_granted','consent_withdrawn','archive','purge','read')),
  resource text,
  resource_id uuid,
  ip inet,
  user_agent text
);
create index access_log_patient_time on health.access_log (patient_id, at desc);
comment on table health.access_log is
  'Append-only audit trail written by security definer functions as the table owner. Never FORCE ROW LEVEL SECURITY here: owner-run inserts have no policy to satisfy and every clinical write would fail.';

-- ── updated_at maintenance ──────────────────────────────────────────
create or replace function health.touch_updated_at() returns trigger
language plpgsql set search_path = health, public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger settings_touch before update on health.settings
  for each row execute function health.touch_updated_at();
create trigger profile_touch before update on health.profile_entries
  for each row execute function health.touch_updated_at();

-- ── RLS on, table grants (RLS narrows rows; anon gets nothing) ──────
alter table health.patients enable row level security;
alter table health.consents enable row level security;
alter table health.settings enable row level security;
alter table health.readings enable row level security;
alter table health.water_intake enable row level security;
alter table health.exercise_sessions enable row level security;
alter table health.profile_entries enable row level security;
alter table health.access_log enable row level security;

grant select on health.patients, health.consents, health.access_log to authenticated;
grant select, update on health.settings to authenticated;
grant select, insert, update, delete
  on health.readings, health.water_intake, health.exercise_sessions, health.profile_entries
  to authenticated;
grant all on all tables in schema health to service_role;
grant usage, select on all sequences in schema health to service_role;
-- The audit trail is append-only for everyone, the service key included;
-- definer functions insert as the table owner and need no grant.
revoke update, delete on health.access_log from service_role;
