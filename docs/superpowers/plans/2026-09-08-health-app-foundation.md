# Aurora Health App — Plan 1 of 2: Clinical Foundation + Consent + Today + Log

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `health` schema (pseudonymous clinical tables, RLS, audit log, consent gating, retention jobs) and the first three screens of the mobile app at `/app/`: the consent gate, Today, and the Log sheet for blood pressure, blood sugar, cholesterol, water and exercise.

**Architecture:** Static Next.js 15 export on GitHub Pages; the app is client-rendered under `/app/` with its own shell (no marketing nav/footer) and talks to Supabase through the existing browser client, addressing a new `health` schema via `getSupabase().schema("health")`. Postgres is the security boundary: RLS keyed to `health.current_patient_id()`, writes gated by `health.has_active_consent()`, every write and app-open logged by `security definer` triggers/RPCs, `pg_cron` jobs for the 12-month archive and the 30-day post-withdrawal purge. Client guards are UX only.

**Tech Stack:** Next.js 15.5 App Router (`output: "export"`, `trailingSlash: true`), TypeScript strict, Tailwind v4 (brand tokens in `src/app/globals.css`), Zod v4, `@supabase/supabase-js` 2.110, Vitest 2, Playwright + axe-playwright, Supabase CLI 2.75 (project linked: `gmvrkzumvwhrkqzqwcnu`), Supabase Management API (token in macOS keychain).

**Spec:** `docs/superpowers/specs/2026-09-08-health-app-design.md`. **Plan 2** (written after this plan lands) covers Trends, Record, More (withdraw/resume, access history, FHIR export, units/goals), PWA manifest + service worker + icons, the PDR/privacy-notice/PLAN.md updates, and the remaining e2e coverage.

**Spec deviations (deliberate, tiny):** (1) `health.consents` gains a `superseded_at` column so a re-consent on a newer notice version closes the old row without pretending it was withdrawn. (2) The database only enforces `recorded_at` not in the future (+5 min skew); the 30-day backdating limit is client-side, so editing a note on an old row never fails. (3) Lipid ranges are wider than spec §11's original 20–600 (total 20–1000, LDL 5–1000, HDL 5–300, triglycerides 10–5000 mg/dL) because lab panels legitimately report the extremes; spec §11 was amended to match. (4) `access_log` IP capture prefers `cf-connecting-ip`, then the last `x-forwarded-for` hop, then `x-real-ip`, so a client cannot forge its own audit IP.

---

## Conventions every task follows

- Work on branch `feat/health-app` (Task 0). Commit after every task with the message shown.
- Migrations live in `supabase/migrations/` and are applied with `source .env.secrets && supabase db push -p "$SUPABASE_DB_PASSWORD"` (the same path Plan 1 of the accounts work used). `.env.secrets` holds `SUPABASE_DB_PASSWORD`; `.env.local` holds `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Never wrap a `router.replace/push` path in `asset()` (the router already adds basePath); `asset()` is only for `next/image` string src.
- Brand: cyan is the only CTA colour; error colour is `#ff9db0`; "watch" status uses `#f5c451`. Tailwind colour names: `navy`, `navy-soft`, `indigo`, `cyan`, `blue`, `silver`, `starlight`, `line-dark`. Fonts: `font-heading`, `font-body`.
- Run `npm run verify` (lint + typecheck + unit + build) before the final commit of any task that touches `src/`.
- **SQL execution helper** for one-off checks (already on this machine): `python3 "/private/tmp/claude-501/-Users-stefangravesande-Documents-Projects-Routines-Claude/bf2da734-279e-4699-b244-1b1a654d1d69/scratchpad/sbq.py" "select 1"` runs SQL on the live project via the Management API. If the scratchpad is gone, recreate it from Task 5 Step 4.

---

### Task 0: Branch and environment check

**Files:** none

- [ ] **Step 1: Create the branch**

```bash
cd "/Users/stefangravesande/Documents/Projects/HM AURORA/aurora-website" && git checkout main && git pull --ff-only && git checkout -b feat/health-app
```
Expected: `Switched to a new branch 'feat/health-app'`

- [ ] **Step 2: Confirm the toolchain and the linked project**

```bash
supabase --version && cat supabase/.temp/project-ref && node --version && npm run verify
```
Expected: `2.75.0`, `gmvrkzumvwhrkqzqwcnu`, Node ≥ 20, and verify ends with the Next build summary (no errors).

- [ ] **Step 3: Confirm the Supabase project is awake**

```bash
TOK=$(security find-generic-password -s "Supabase CLI" -w | sed 's/^go-keyring-base64://' | base64 -d); curl -s -H "Authorization: Bearer $TOK" https://api.supabase.com/v1/projects/gmvrkzumvwhrkqzqwcnu | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```
Expected: `ACTIVE_HEALTHY`. If `INACTIVE`, run `curl -s -X POST -H "Authorization: Bearer $TOK" https://api.supabase.com/v1/projects/gmvrkzumvwhrkqzqwcnu/restore` and poll the status command until `ACTIVE_HEALTHY` (a few minutes).

---

### Task 1: Migration — `health` schema and tables

**Files:**
- Create: `supabase/migrations/20260908100000_health_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
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
  granted_at timestamptz not null default now(),
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260908100000_health_schema.sql && git commit -m "feat(health): schema, tables, checks and grants"
```

---

### Task 2: Migration — helpers and RLS policies

**Files:**
- Create: `supabase/migrations/20260908100100_health_rls.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Helpers (spec §7). security definer + fixed search_path so they can
-- read health.patients/consents regardless of the caller's policies.
create or replace function health.current_patient_id() returns uuid
language sql stable security definer set search_path = health, public, pg_temp as $$
  select patient_id from health.patients where user_id = auth.uid()
$$;

create or replace function health.has_active_consent(pid uuid) returns boolean
language sql stable security definer set search_path = health, public, pg_temp as $$
  select exists (
    select 1 from health.consents
    where patient_id = pid and superseded_at is null and withdrawn_at is null
  )
$$;

-- Request metadata from PostgREST ("from where" in the audit log).
create or replace function health.request_ip() returns inet
language plpgsql stable security definer set search_path = health, public, pg_temp as $$
declare h json; raw text; hops text[];
begin
  h := nullif(current_setting('request.headers', true), '')::json;
  if h is null then return null; end if;
  -- Prefer the edge-set header a client cannot forge. x-forwarded-for is
  -- appended to by each proxy, so only its LAST hop is trustworthy.
  raw := h->>'cf-connecting-ip';
  if raw is null and h->>'x-forwarded-for' is not null then
    hops := string_to_array(h->>'x-forwarded-for', ',');
    raw := hops[array_length(hops, 1)];
  end if;
  raw := coalesce(raw, h->>'x-real-ip');
  if raw is null then return null; end if;
  return trim(raw)::inet;
exception when others then return null;
end $$;

create or replace function health.request_user_agent() returns text
language plpgsql stable security definer set search_path = health, public, pg_temp as $$
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260908100100_health_rls.sql && git commit -m "feat(health): helper functions and RLS policies"
```

---

### Task 3: Migration — audit trigger and RPCs

**Files:**
- Create: `supabase/migrations/20260908100200_health_audit.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260908100200_health_audit.sql && git commit -m "feat(health): audit trigger, consent and logging RPCs"
```

---

### Task 4: Migration — archive tables, purge, pg_cron jobs

**Files:**
- Create: `supabase/migrations/20260908100300_health_retention.sql`

- [ ] **Step 1: Write the migration**

```sql
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
    and (
      select c.delete_after from health.consents c
      where c.patient_id = p.patient_id
      order by c.granted_at desc, c.id desc limit 1
    ) < now()
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
```

- [ ] **Step 2: Write the schedules as their own migration** — `supabase/migrations/20260908100400_health_cron.sql` (a pg_cron refusal must not roll back the archive tables):

```sql
-- ── Schedules (spec §8) — own migration so a pg_cron refusal cannot roll
-- back the archive tables and purge functions in 20260908100300.
-- pg_cron runs in UTC: 03:00 UTC is 23:00 GYT the previous evening.
create extension if not exists pg_cron;
do $$ begin
  execute 'grant usage on schema cron to postgres';
exception when insufficient_privilege then null; end $$;
select cron.schedule('health-archive-old', '0 3 1 * *', $$select health.archive_old()$$);
select cron.schedule('health-purge-withdrawn', '15 3 * * *', $$select health.purge_withdrawn()$$);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260908100300_health_retention.sql supabase/migrations/20260908100400_health_cron.sql && git commit -m "feat(health): archive tables, purge and pg_cron jobs"
```

---

### Task 5: Apply migrations, expose the schema, prove the API posture

**Files:** none (live project configuration)

- [ ] **Step 1: Push the four migrations**

```bash
cd "/Users/stefangravesande/Documents/Projects/HM AURORA/aurora-website" && source .env.secrets && supabase db push -p "$SUPABASE_DB_PASSWORD"
```
Expected: the five `20260908…` migrations listed, then `Finished supabase db push.` If `create extension pg_cron` is refused, enable pg_cron in the Supabase Dashboard (Database → Extensions → pg_cron → enable), then re-run the push.

- [ ] **Step 2: Expose `health` to PostgREST**

```bash
TOK=$(security find-generic-password -s "Supabase CLI" -w | sed 's/^go-keyring-base64://' | base64 -d); curl -s -X PATCH -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" https://api.supabase.com/v1/projects/gmvrkzumvwhrkqzqwcnu/postgrest -d '{"db_schema":"public,graphql_public,health"}'
```
Expected: JSON echo whose `db_schema` is `public,graphql_public,health`.

- [ ] **Step 3: Prove anon is locked out and the jobs exist**

```bash
cd "/Users/stefangravesande/Documents/Projects/HM AURORA/aurora-website" && set -a && source .env.local && set +a && curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/readings?select=id" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Accept-Profile: health"; echo
```
Expected: an error body containing `permission denied for schema health` (code `42501`). Then:

```bash
python3 "/private/tmp/claude-501/-Users-stefangravesande-Documents-Projects-Routines-Claude/bf2da734-279e-4699-b244-1b1a654d1d69/scratchpad/sbq.py" "select jobname, schedule from cron.job order by 1"
```
Expected: two rows, `health-archive-old` `0 3 1 * *` and `health-purge-withdrawn` `15 3 * * *`.

- [ ] **Step 4: (Only if the scratchpad helper is missing) recreate it**

```python
#!/usr/bin/env python3
"""Run SQL on the HM-Aurora Supabase project via the Management API.
Usage: python3 sbq.py "select 1"   |   python3 sbq.py -f file.sql"""
import sys, json, base64, subprocess, urllib.request
REF = "gmvrkzumvwhrkqzqwcnu"
raw = subprocess.check_output(["security", "find-generic-password", "-s", "Supabase CLI", "-w"]).decode().strip()
tok = base64.b64decode(raw.split("go-keyring-base64:", 1)[1]).decode() if raw.startswith("go-keyring-base64:") else raw
sql = open(sys.argv[2]).read() if sys.argv[1] == "-f" else sys.argv[1]
req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{REF}/database/query",
    data=json.dumps({"query": sql}).encode(), method="POST",
    headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json", "User-Agent": "curl/8.7.1"})
try:
    with urllib.request.urlopen(req, timeout=120) as r:
        print(r.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()); sys.exit(1)
```
(The `User-Agent` header matters: Cloudflare rejects Python's default UA with error 1010.)

---

### Task 6: RLS proof script for `health`

**Files:**
- Create: `tests/rls/health.mjs`
- Modify: `package.json` (scripts.test:rls)

- [ ] **Step 1: Write the script**

```js
// Proves the health schema's security posture (spec §15): own-rows only,
// consent-gated writes, tamper-proof audit log, anon locked out, archive
// unreachable, withdrawal blocks writes, delete-now purges but keeps the log.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) throw new Error("missing env");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const stamp = process.env.RLS_STAMP || String(Date.now());
const fail = (m) => { console.error("✗ " + m); process.exitCode = 1; };
const ok = (m) => console.log("✓ " + m);

async function makeUser(tag) {
  const email = `rls-health+${tag}.${stamp}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: "Test-passw0rd!", email_confirm: true,
    user_metadata: { full_name: `RLS ${tag}`, dob: "1990-01-01" },
  });
  if (error) throw error;
  return { id: data.user.id, email };
}
async function signedIn(user) {
  const c = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: user.email, password: "Test-passw0rd!" });
  if (error) throw error;
  return c;
}
const bp = (patient_id, extra = {}) => ({
  patient_id, kind: "blood_pressure", recorded_at: new Date().toISOString(),
  systolic: 128, diastolic: 82, pulse: 72, ...extra,
});

const a = await makeUser("a");
const b = await makeUser("b");
try {
  const ca = await signedIn(a);
  const H = (c) => c.schema("health");

  // 1. Before consent: reads are empty, writes are refused.
  const pre = await H(ca).from("readings").select("id");
  if (!pre.error && pre.data.length === 0) ok("no health rows before consent");
  else fail("unexpected pre-consent read: " + JSON.stringify(pre.error ?? pre.data));

  const noPid = await H(ca).from("readings").insert(bp("00000000-0000-0000-0000-000000000000"));
  if (noPid.error) ok("insert refused without a patient row/consent");
  else fail("LEAK: inserted without consent");

  // 2. Consent creates the patient + settings and returns patient_id.
  const grant = await H(ca).rpc("grant_consent", { notice_version: "test-1", scope: { readings: true } });
  if (grant.error || !grant.data) throw grant.error ?? new Error("no patient id");
  const pidA = grant.data;
  const st = await H(ca).rpc("my_status");
  if (st.data && st.data.patient_id === pidA && st.data.active_version === "test-1") ok("my_status reports the active consent");
  else fail("my_status wrong: " + JSON.stringify(st));

  // 3. Own rows: insert, read, update.
  const ins = await H(ca).from("readings").insert(bp(pidA)).select("id").single();
  if (!ins.error) ok("inserts own reading after consent"); else fail("insert failed: " + ins.error.message);
  const upd = await H(ca).from("readings").update({ note: "after breakfast" }).eq("id", ins.data.id).select("note").single();
  if (upd.data && upd.data.note === "after breakfast") ok("updates own reading"); else fail("update failed");

  // 4. Shape + range CHECKs hold.
  const badShape = await H(ca).from("readings").insert(bp(pidA, { glucose_mgdl: 100 }));
  if (badShape.error) ok("shape CHECK rejects mixed columns"); else fail("shape CHECK missing");
  const badRange = await H(ca).from("readings").insert(bp(pidA, { systolic: 400 }));
  if (badRange.error) ok("range CHECK rejects systolic 400"); else fail("range CHECK missing");

  // 5. Another patient sees and touches nothing of A's.
  const cb = await signedIn(b);
  const grantB = await H(cb).rpc("grant_consent", { notice_version: "test-1", scope: { readings: true } });
  const pidB = grantB.data;
  const bRead = await H(cb).from("readings").select("id");
  if (bRead.data && bRead.data.length === 0) ok("B reads none of A's readings"); else fail("LEAK: B read A's readings");
  const bSpoof = await H(cb).from("readings").insert(bp(pidA));
  if (bSpoof.error) ok("B cannot insert under A's patient_id"); else fail("LEAK: B inserted as A");
  await H(cb).from("readings").update({ note: "tampered" }).eq("id", ins.data.id);
  const check = await H(ca).from("readings").select("note").eq("id", ins.data.id).single();
  if (check.data && check.data.note === "after breakfast") ok("B cannot update A's reading"); else fail("LEAK: B updated A's reading");
  const bOwn = await H(cb).from("readings").insert(bp(pidB));
  if (!bOwn.error) ok("B inserts own reading"); else fail("B insert failed: " + bOwn.error.message);
  const aCount = await H(ca).from("readings").select("id");
  if (aCount.data && aCount.data.length === 1) ok("A still sees exactly own row"); else fail("A sees " + aCount.data?.length);

  // 6. Anonymous key: nothing.
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const anonRead = await H(anon).from("readings").select("id");
  if (anonRead.error || anonRead.data.length === 0) ok("anon cannot read health"); else fail("LEAK: anon read health rows");

  // 7. Audit log: written by the system, readable by A, untouchable by A.
  await H(ca).rpc("log_app_open");
  const log = await H(ca).from("access_log").select("action, resource").order("at", { ascending: true });
  const actions = (log.data ?? []).map((r) => `${r.action}:${r.resource}`);
  const expectLog = ["consent_granted:consents", "insert:settings", "insert:readings", "update:readings", "app_open:app"];
  const missing = expectLog.filter((e) => !actions.includes(e));
  if (missing.length === 0) ok("access_log holds consent, settings, insert, update, app_open");
  else fail("access_log missing " + missing.join(", ") + " (have " + actions.join(", ") + ")");
  const logIns = await H(ca).from("access_log").insert({ actor_role: "patient", patient_id: pidA, action: "read" });
  if (logIns.error) ok("A cannot write access_log"); else fail("TAMPER: A inserted an access_log row");
  const before = log.data.length;
  await H(ca).from("access_log").delete().eq("patient_id", pidA);
  const after = await H(ca).from("access_log").select("id");
  if (after.data && after.data.length === before) ok("A cannot delete access_log rows"); else fail("TAMPER: A deleted log rows");

  // 8. Archive tables are unreachable by patients; archive job moves old rows.
  const arch = await H(ca).from("readings_archive").select("id");
  if (arch.error) ok("A cannot read readings_archive"); else fail("LEAK: A read the archive");
  const old = new Date(); old.setMonth(old.getMonth() - 13);
  const oldIns = await H(admin).from("readings").insert(bp(pidA, { recorded_at: old.toISOString() }));
  if (oldIns.error) throw oldIns.error;
  await H(admin).rpc("archive_old");
  const live = await H(ca).from("readings").select("id");
  const archived = await H(admin).from("readings_archive").select("id").eq("patient_id", pidA);
  if (live.data.length === 1 && archived.data.length === 1) ok("archive_old moved the 13-month-old reading");
  else fail(`archive_old: live=${live.data?.length} archived=${archived.data?.length}`);

  // 9. Withdrawal blocks new writes and schedules deletion.
  await H(ca).rpc("withdraw_consent");
  const postWd = await H(ca).from("readings").insert(bp(pidA));
  if (postWd.error) ok("withdrawal blocks inserts"); else fail("LEAK: inserted after withdrawal");
  const st2 = await H(ca).rpc("my_status");
  if (st2.data && st2.data.active_version === null && st2.data.delete_after) ok("my_status shows pending deletion");
  else fail("my_status after withdrawal wrong: " + JSON.stringify(st2.data));

  // 10. Delete-now purges everything but keeps the audit trail.
  await H(ca).rpc("delete_my_health_data");
  const gone = await H(admin).from("patients").select("patient_id").eq("patient_id", pidA);
  const goneArch = await H(admin).from("readings_archive").select("id").eq("patient_id", pidA);
  const trail = await H(admin).from("access_log").select("action").eq("patient_id", pidA);
  if (gone.data.length === 0 && goneArch.data.length === 0) ok("purge removed patient, live and archive rows");
  else fail("purge incomplete");
  if (trail.data.some((r) => r.action === "purge")) ok("access_log keeps the trail incl. purge"); else fail("purge not logged");
} finally {
  await admin.auth.admin.deleteUser(a.id);
  await admin.auth.admin.deleteUser(b.id);
}
if (process.exitCode) console.error("HEALTH RLS CHECKS FAILED"); else console.log("ALL HEALTH RLS CHECKS PASSED");
```

- [ ] **Step 2: Wire the script into `test:rls`**

In `package.json`, change the `test:rls` line to:

```json
    "test:rls": "node --env-file=.env.local tests/rls/profiles.mjs && node --env-file=.env.local tests/rls/health.mjs",
```

- [ ] **Step 3: Run it**

```bash
cd "/Users/stefangravesande/Documents/Projects/HM AURORA/aurora-website" && npm run test:rls
```
Expected: `ALL RLS CHECKS PASSED` then every `✓` line of the health script and `ALL HEALTH RLS CHECKS PASSED`. If a check fails, fix the migration with a new migration file (never edit an applied one), push, re-run.

- [ ] **Step 4: Commit**

```bash
git add tests/rls/health.mjs package.json && git commit -m "test(health): RLS proof for the health schema"
```

---

### Task 7: Types, notice content, reference ranges (TDD)

**Files:**
- Create: `src/lib/health/types.ts`
- Create: `src/content/health-notice.ts`
- Create: `src/content/health-ranges.ts`
- Create: `src/lib/health/ranges.ts`
- Test: `src/lib/health/ranges.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "vitest";
import {
  bpBand, glucoseBand, cholesterolBand, ldlBand, hdlBand, triglyceridesBand,
} from "@/lib/health/ranges";

test("blood pressure bands at the AHA edges", () => {
  expect(bpBand(118, 76)).toMatchObject({ label: "Normal", tone: "good" });
  expect(bpBand(120, 79)).toMatchObject({ label: "Elevated", tone: "watch" });
  expect(bpBand(129, 79).label).toBe("Elevated");
  expect(bpBand(130, 79)).toMatchObject({ label: "High (stage 1)", tone: "high" });
  expect(bpBand(125, 80).label).toBe("High (stage 1)");
  expect(bpBand(140, 85).label).toBe("High (stage 2)");
  expect(bpBand(120, 90).label).toBe("High (stage 2)");
  expect(bpBand(181, 100)).toMatchObject({ label: "Very high", tone: "urgent" });
  expect(bpBand(150, 121).tone).toBe("urgent");
  expect(bpBand(181, 100).urgent).toContain("emergency");
});

test("glucose bands depend on context and flag lows", () => {
  expect(glucoseBand(95, "fasting").label).toBe("Normal");
  expect(glucoseBand(100, "fasting")).toMatchObject({ label: "Slightly high", tone: "watch" });
  expect(glucoseBand(126, "fasting")).toMatchObject({ label: "High", tone: "high" });
  expect(glucoseBand(130, "after_meal").label).toBe("Normal");
  expect(glucoseBand(140, "after_meal").label).toBe("Slightly high");
  expect(glucoseBand(200, "random").label).toBe("High");
  expect(glucoseBand(69, "bedtime")).toMatchObject({ label: "Low", tone: "urgent" });
  expect(glucoseBand(300, "fasting")).toMatchObject({ label: "Very high", tone: "urgent" });
});

test("cholesterol bands", () => {
  expect(cholesterolBand(199).label).toBe("Desirable");
  expect(cholesterolBand(200)).toMatchObject({ label: "Borderline", tone: "watch" });
  expect(cholesterolBand(240)).toMatchObject({ label: "High", tone: "high" });
  expect(ldlBand(99).label).toBe("Optimal");
  expect(ldlBand(130).label).toBe("Borderline");
  expect(ldlBand(190).label).toBe("Very high");
  expect(hdlBand(39).tone).toBe("watch");
  expect(hdlBand(60).label).toBe("Protective");
  expect(triglyceridesBand(149).label).toBe("Normal");
  expect(triglyceridesBand(500).label).toBe("Very high");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/health/ranges.test.ts`
Expected: FAIL — cannot resolve `@/lib/health/ranges`.

- [ ] **Step 3: Write the types**

`src/lib/health/types.ts`:

```ts
/** Row and insert shapes for the `health` schema (spec §6). Values are
 *  stored canonically in mg/dL; display units live in `Settings`. */
export type ReadingKind = "blood_pressure" | "glucose" | "cholesterol";
export type LogKind = ReadingKind | "water" | "exercise";
export type GlucoseContext = "fasting" | "after_meal" | "random" | "bedtime";
export type Unit = "mg/dL" | "mmol/L";
export type Activity = "walk" | "run" | "cycle" | "swim" | "strength" | "rehab" | "other";
export type Intensity = "light" | "moderate" | "vigorous";

export type Reading = {
  id: string;
  kind: ReadingKind;
  recorded_at: string;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  glucose_mgdl: number | null;
  glucose_context: GlucoseContext | null;
  chol_total_mgdl: number | null;
  chol_ldl_mgdl: number | null;
  chol_hdl_mgdl: number | null;
  chol_trig_mgdl: number | null;
  entered_unit: Unit | null;
  note: string | null;
};

export type ReadingInsert = {
  patient_id: string;
  kind: ReadingKind;
  recorded_at: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number | null;
  glucose_mgdl?: number;
  glucose_context?: GlucoseContext;
  chol_total_mgdl?: number;
  chol_ldl_mgdl?: number | null;
  chol_hdl_mgdl?: number | null;
  chol_trig_mgdl?: number | null;
  entered_unit?: Unit;
  note?: string | null;
};

export type WaterInsert = { patient_id: string; ml: number; recorded_at: string };

export type ExerciseInsert = {
  patient_id: string;
  activity: Activity;
  minutes: number;
  intensity?: Intensity | null;
  note?: string | null;
  recorded_at: string;
};

export type Settings = { glucose_unit: Unit; cholesterol_unit: Unit; water_goal_ml: number };
```

- [ ] **Step 4: Write the consent notice content**

`src/content/health-notice.ts`:

```ts
/**
 * Health-data consent notice shown at /app/consent (spec §5).
 * GDPR Art. 9(2)(a): explicit consent naming the data categories and
 * purposes. Bump HEALTH_NOTICE_VERSION whenever the text changes — the
 * app re-asks for consent when the stored version differs.
 */
export const HEALTH_NOTICE_VERSION = "1.0-2026-09-08";
export const HEALTH_NOTICE_SCOPE = { readings: true, lifestyle: true, record: true } as const;

export const healthNotice = {
  title: "Before you start",
  intro:
    "The Aurora app stores health information about you. Health data is sensitive, so we ask for your clear permission first.",
  sections: [
    {
      heading: "What we store",
      body: "Blood pressure, blood sugar and cholesterol readings you enter; water and exercise entries; and the health record you keep here — conditions, surgeries, medications, allergies and family history.",
    },
    {
      heading: "Why",
      body: "So you can monitor your own health at home, so Aurora nurses can care for you using accurate information, and so diet and exercise plans can be based on real readings.",
    },
    {
      heading: "Where and how",
      body: "In Aurora's database, encrypted, in the cloud. Your readings are stored under a code, not your name. Only you can see them today. In future, Aurora staff on your care team will be able to, and every access is logged where you can see it.",
    },
    {
      heading: "How long",
      body: "Readings stay in the app for 12 months, then move to Aurora's archive. If you withdraw, tracking stops at once and your health data is deleted after 30 days unless you change your mind.",
    },
    {
      heading: "Your choice",
      body: "You can download or delete your data, or withdraw this permission, at any time from More.",
    },
  ],
  checkbox: "I agree to Aurora storing and using my health information as described above.",
  button: "I agree — open the app",
} as const;
```

- [ ] **Step 5: Write the reference-range content**

`src/content/health-ranges.ts`:

```ts
/**
 * Informational reference bands (spec §10). NOT a diagnosis — every
 * badge carries the disclaimer below. Aurora's clinicians complete
 * reviewedBy/reviewedOn before launch; thresholds are theirs to edit.
 * Units: mg/dL for glucose and lipids, mmHg for blood pressure.
 */
export const rangesMeta = {
  reviewedBy: "",
  reviewedOn: "",
  disclaimer: "Reference ranges are general guidance, not a diagnosis. Talk to your care team.",
} as const;

export const bpThresholds = {
  source: "AHA/ACC 2017",
  urgentSystolic: 180, urgentDiastolic: 120,   // above either => urgent
  stage2Systolic: 140, stage2Diastolic: 90,    // at/above either => stage 2
  stage1Systolic: 130, stage1Diastolic: 80,    // at/above either => stage 1
  elevatedSystolic: 120,                       // 120–129 with diastolic < 80
} as const;

export const glucoseThresholds = {
  source: "ADA",
  low: 70,
  urgentHigh: 300,
  fasting: { normalBelow: 100, highFrom: 126 },
  other: { normalBelow: 140, highFrom: 200 },   // after meal / random / bedtime
} as const;

export const cholesterolThresholds = {
  source: "NCEP ATP III",
  total: { desirableBelow: 200, highFrom: 240 },
  ldl: [100, 130, 160, 190] as const,           // optimal | near optimal | borderline | high | very high
  hdl: { lowBelow: 40, protectiveFrom: 60 },
  triglycerides: [150, 200, 500] as const,      // normal | borderline | high | very high
} as const;

export const urgentMessages = {
  bp: "This reading is very high. If you have chest pain, shortness of breath, weakness, vision changes or trouble speaking, seek emergency care now. Otherwise rest for five minutes, measure again, and contact your care team today.",
  glucoseHigh: "This reading is very high. If you feel very thirsty, sick, drowsy or confused, seek emergency care now. Otherwise drink water, re-test in an hour, and contact your care team today.",
  glucoseLow: "This reading is low. Take fast-acting sugar now (juice, glucose tablets or sweets), re-test in 15 minutes, and seek emergency care if you feel faint or confused.",
} as const;
```

- [ ] **Step 6: Write the band functions**

`src/lib/health/ranges.ts`:

```ts
import {
  bpThresholds as bp, glucoseThresholds as g, cholesterolThresholds as c,
  urgentMessages, rangesMeta,
} from "@/content/health-ranges";
import type { GlucoseContext } from "./types";

export type Tone = "good" | "watch" | "high" | "urgent";
export type Band = { label: string; tone: Tone; urgent?: string };
export const DISCLAIMER = rangesMeta.disclaimer;

export function bpBand(systolic: number, diastolic: number): Band {
  if (systolic > bp.urgentSystolic || diastolic > bp.urgentDiastolic)
    return { label: "Very high", tone: "urgent", urgent: urgentMessages.bp };
  if (systolic >= bp.stage2Systolic || diastolic >= bp.stage2Diastolic)
    return { label: "High (stage 2)", tone: "high" };
  if (systolic >= bp.stage1Systolic || diastolic >= bp.stage1Diastolic)
    return { label: "High (stage 1)", tone: "high" };
  if (systolic >= bp.elevatedSystolic) return { label: "Elevated", tone: "watch" };
  return { label: "Normal", tone: "good" };
}

export function glucoseBand(mgdl: number, context: GlucoseContext): Band {
  if (mgdl < g.low) return { label: "Low", tone: "urgent", urgent: urgentMessages.glucoseLow };
  if (mgdl >= g.urgentHigh) return { label: "Very high", tone: "urgent", urgent: urgentMessages.glucoseHigh };
  const t = context === "fasting" ? g.fasting : g.other;
  if (mgdl >= t.highFrom) return { label: "High", tone: "high" };
  if (mgdl >= t.normalBelow) return { label: "Slightly high", tone: "watch" };
  return { label: "Normal", tone: "good" };
}

export function cholesterolBand(totalMgdl: number): Band {
  if (totalMgdl >= c.total.highFrom) return { label: "High", tone: "high" };
  if (totalMgdl >= c.total.desirableBelow) return { label: "Borderline", tone: "watch" };
  return { label: "Desirable", tone: "good" };
}

export function ldlBand(mgdl: number): Band {
  const [nearOptimal, borderline, high, veryHigh] = c.ldl;
  if (mgdl >= veryHigh) return { label: "Very high", tone: "high" };
  if (mgdl >= high) return { label: "High", tone: "high" };
  if (mgdl >= borderline) return { label: "Borderline", tone: "watch" };
  if (mgdl >= nearOptimal) return { label: "Near optimal", tone: "good" };
  return { label: "Optimal", tone: "good" };
}

export function hdlBand(mgdl: number): Band {
  if (mgdl < c.hdl.lowBelow) return { label: "Low", tone: "watch" };
  if (mgdl >= c.hdl.protectiveFrom) return { label: "Protective", tone: "good" };
  return { label: "Normal", tone: "good" };
}

export function triglyceridesBand(mgdl: number): Band {
  const [borderline, high, veryHigh] = c.triglycerides;
  if (mgdl >= veryHigh) return { label: "Very high", tone: "high" };
  if (mgdl >= high) return { label: "High", tone: "high" };
  if (mgdl >= borderline) return { label: "Borderline", tone: "watch" };
  return { label: "Normal", tone: "good" };
}
```

- [ ] **Step 7: Run the test**

Run: `npx vitest run src/lib/health/ranges.test.ts`
Expected: 3 passed.

- [ ] **Step 8: Commit**

```bash
git add src/lib/health/types.ts src/content/health-notice.ts src/content/health-ranges.ts src/lib/health/ranges.ts src/lib/health/ranges.test.ts && git commit -m "feat(health): types, consent notice content, reference bands"
```

---

### Task 8: Unit conversion and formatting helpers (TDD)

**Files:**
- Create: `src/lib/health/units.ts`
- Create: `src/lib/health/format.ts`
- Test: `src/lib/health/units.test.ts`, `src/lib/health/format.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/health/units.test.ts`:

```ts
import { test, expect } from "vitest";
import { GLUCOSE_FACTOR, CHOLESTEROL_FACTOR, toMgdl, fromMgdl, formatValue } from "@/lib/health/units";

test("mmol/L converts to mg/dL and back, rounded to one decimal", () => {
  expect(toMgdl(5.5, "mmol/L", GLUCOSE_FACTOR)).toBe(99.1);
  expect(fromMgdl(99.1, "mmol/L", GLUCOSE_FACTOR)).toBe(5.5);
});

test("mg/dL passes through (rounded)", () => {
  expect(toMgdl(104.26, "mg/dL", GLUCOSE_FACTOR)).toBe(104.3);
  expect(fromMgdl(182.4, "mg/dL", CHOLESTEROL_FACTOR)).toBe(182);
});

test("formatValue renders the display unit", () => {
  expect(formatValue(182, "mmol/L", CHOLESTEROL_FACTOR)).toBe("4.7");
  expect(formatValue(182.4, "mg/dL", CHOLESTEROL_FACTOR)).toBe("182");
});
```

`src/lib/health/format.test.ts`:

```ts
import { test, expect } from "vitest";
import {
  relativeTime, toDatetimeLocal, fromDatetimeLocal, startOfToday, startOfWeek,
  initials, firstName, greeting,
} from "@/lib/health/format";

test("relativeTime buckets", () => {
  const now = new Date("2026-09-08T12:00:00Z");
  expect(relativeTime("2026-09-08T11:59:40Z", now)).toBe("Just now");
  expect(relativeTime("2026-09-08T11:35:00Z", now)).toBe("25 min ago");
  expect(relativeTime("2026-09-08T08:00:00Z", now)).toBe("4 h ago");
  expect(relativeTime("2026-09-07T10:00:00Z", now)).toBe("Yesterday");
  expect(relativeTime("2026-09-04T10:00:00Z", now)).toBe("4 days ago");
  expect(relativeTime("2026-08-12T10:00:00Z", now)).toBe("12 Aug");
});

test("datetime-local round trip is local time", () => {
  const d = new Date(2026, 8, 8, 9, 12);
  expect(toDatetimeLocal(d)).toBe("2026-09-08T09:12");
  expect(new Date(fromDatetimeLocal("2026-09-08T09:12")).getTime()).toBe(d.getTime());
  expect(fromDatetimeLocal("")).toBe("");
});

test("startOfToday and startOfWeek (weeks start Monday)", () => {
  const wed = new Date(2026, 8, 9, 15, 30);
  expect(startOfToday(wed).getTime()).toBe(new Date(2026, 8, 9).getTime());
  expect(startOfWeek(wed).getTime()).toBe(new Date(2026, 8, 7).getTime());
  const sun = new Date(2026, 8, 13, 8);
  expect(startOfWeek(sun).getTime()).toBe(new Date(2026, 8, 7).getTime());
});

test("name helpers", () => {
  expect(initials("Stefan Gravesande")).toBe("SG");
  expect(initials("hannah")).toBe("H");
  expect(initials("")).toBe("A");
  expect(firstName("Stefan Gravesande")).toBe("Stefan");
  expect(greeting(new Date(2026, 8, 8, 9))).toBe("Good morning");
  expect(greeting(new Date(2026, 8, 8, 14))).toBe("Good afternoon");
  expect(greeting(new Date(2026, 8, 8, 19))).toBe("Good evening");
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/health/units.test.ts src/lib/health/format.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `units.ts`**

```ts
import type { Unit } from "./types";

/** mmol/L → mg/dL multipliers (spec §11). */
export const GLUCOSE_FACTOR = 18.016;
export const CHOLESTEROL_FACTOR = 38.67;
export const TRIGLYCERIDE_FACTOR = 88.57;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Convert a value the patient typed into the canonical mg/dL. */
export function toMgdl(value: number, unit: Unit, factor: number): number {
  return unit === "mg/dL" ? round1(value) : round1(value * factor);
}

/** Convert a stored mg/dL value into the display unit. */
export function fromMgdl(mgdl: number, unit: Unit, factor: number): number {
  return unit === "mg/dL" ? Math.round(mgdl) : round1(mgdl / factor);
}

export function formatValue(mgdl: number, unit: Unit, factor: number): string {
  const v = fromMgdl(mgdl, unit, factor);
  return unit === "mg/dL" ? String(v) : v.toFixed(1);
}
```

- [ ] **Step 4: Write `format.ts`**

```ts
/** Small pure helpers for the app's screens. All take an optional `now`
 *  so they are testable without faking timers. */

const pad = (n: number) => String(n).padStart(2, "0");

export function relativeTime(iso: string, now: Date = new Date()): string {
  const sec = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)} h ago`;
  const days = Math.floor(sec / 86_400);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** "YYYY-MM-DDTHH:mm" in local time, for <input type="datetime-local">. */
export function toDatetimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local string (local time) → ISO 8601; "" when unparseable. */
export function fromDatetimeLocal(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Monday 00:00 local of the week containing `now`. */
export function startOfWeek(now: Date = new Date()): Date {
  const d = startOfToday(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/health/units.test.ts src/lib/health/format.test.ts`
Expected: 7 passed. (The "12 Aug" case formats in UTC on purpose so the test is timezone-independent; the UI passes real timestamps, and a one-day drift at midnight is acceptable for a "12 Aug" label.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/health/units.ts src/lib/health/format.ts src/lib/health/units.test.ts src/lib/health/format.test.ts && git commit -m "feat(health): unit conversion and formatting helpers"
```

---

### Task 9: Validation schemas (TDD)

**Files:**
- Create: `src/lib/validation/health.ts`
- Test: `src/lib/validation/health.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "vitest";
import {
  bpReadingSchema, glucoseReadingSchema, cholesterolReadingSchema,
  waterSchema, exerciseSchema, healthConsentSchema,
} from "@/lib/validation/health";

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

test("blood pressure: accepts a normal reading, rejects inverted and out-of-range", () => {
  expect(bpReadingSchema.safeParse({ systolic: 128, diastolic: 82, recordedAt: now() }).success).toBe(true);
  const inverted = bpReadingSchema.safeParse({ systolic: 80, diastolic: 120, recordedAt: now() });
  expect(inverted.success).toBe(false);
  expect(bpReadingSchema.safeParse({ systolic: 400, diastolic: 82, recordedAt: now() }).success).toBe(false);
  expect(bpReadingSchema.safeParse({ systolic: 128, diastolic: 82, pulse: 10, recordedAt: now() }).success).toBe(false);
});

test("glucose: converts mmol/L before the range check", () => {
  expect(glucoseReadingSchema.safeParse({ value: 5.5, unit: "mmol/L", context: "fasting", recordedAt: now() }).success).toBe(true);
  expect(glucoseReadingSchema.safeParse({ value: 40, unit: "mmol/L", context: "fasting", recordedAt: now() }).success).toBe(false);
  expect(glucoseReadingSchema.safeParse({ value: 104, unit: "mg/dL", context: "nope", recordedAt: now() }).success).toBe(false);
});

test("cholesterol: total required, optional parts range-checked", () => {
  expect(cholesterolReadingSchema.safeParse({ total: 182, unit: "mg/dL", recordedAt: now() }).success).toBe(true);
  expect(cholesterolReadingSchema.safeParse({ total: 182, ldl: 2000, unit: "mg/dL", recordedAt: now() }).success).toBe(false);
  expect(cholesterolReadingSchema.safeParse({ unit: "mg/dL", recordedAt: now() }).success).toBe(false);
});

test("recordedAt: not in the future, not older than 30 days", () => {
  expect(waterSchema.safeParse({ ml: 250, recordedAt: daysAgo(-1) }).success).toBe(false);
  expect(waterSchema.safeParse({ ml: 250, recordedAt: daysAgo(31) }).success).toBe(false);
  expect(waterSchema.safeParse({ ml: 250, recordedAt: daysAgo(29) }).success).toBe(true);
});

test("water and exercise ranges", () => {
  expect(waterSchema.safeParse({ ml: 20, recordedAt: now() }).success).toBe(false);
  expect(exerciseSchema.safeParse({ activity: "walk", minutes: 30, recordedAt: now() }).success).toBe(true);
  expect(exerciseSchema.safeParse({ activity: "walk", minutes: 0, recordedAt: now() }).success).toBe(false);
});

test("consent requires the box ticked", () => {
  expect(healthConsentSchema.safeParse({ agree: true }).success).toBe(true);
  expect(healthConsentSchema.safeParse({ agree: false }).success).toBe(false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/validation/health.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the schemas**

`src/lib/validation/health.ts`:

```ts
/**
 * Client-side zod schemas for the health app (spec §11). The database
 * mirrors every range as a CHECK constraint; this layer gives humans a
 * readable message first. Data minimisation (PDR §8.1): only the fields
 * the 31 Aug meeting named.
 */
import { z } from "zod";
import { CHOLESTEROL_FACTOR, GLUCOSE_FACTOR, TRIGLYCERIDE_FACTOR, toMgdl } from "@/lib/health/units";

const MAX_BACKDATE_DAYS = 30;

export const recordedAtSchema = z.string().refine((iso) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  return t <= now + 5 * 60_000 && t >= now - MAX_BACKDATE_DAYS * 86_400_000;
}, "Choose a time within the last 30 days, not in the future.");

const note = z.string().trim().max(300, "Keep the note under 300 characters.").optional().or(z.literal(""));
export const unitSchema = z.enum(["mg/dL", "mmol/L"], { error: "Choose a unit." });
const within = (lo: number, hi: number) => (mgdl: number) => mgdl >= lo && mgdl <= hi;
const glucoseRange = within(20, 600);
const totalRange = within(20, 1000);
const ldlRange = within(5, 1000);
const hdlRange = within(5, 300);
const trigRange = within(10, 5000);

export const bpReadingSchema = z
  .object({
    systolic: z.number({ error: "Enter the top number." }).int()
      .min(60, "Systolic looks too low (60–260).").max(260, "Systolic looks too high (60–260)."),
    diastolic: z.number({ error: "Enter the bottom number." }).int()
      .min(30, "Diastolic looks too low (30–160).").max(160, "Diastolic looks too high (30–160)."),
    pulse: z.number({ error: "Enter a whole number." }).int()
      .min(25, "Pulse looks too low (25–250).").max(250, "Pulse looks too high (25–250).").optional(),
    recordedAt: recordedAtSchema,
    note,
  })
  .refine((r) => r.systolic > r.diastolic, {
    message: "The top number should be higher than the bottom number.",
    path: ["systolic"],
  });
export type BpReadingInput = z.infer<typeof bpReadingSchema>;

export const glucoseReadingSchema = z
  .object({
    value: z.number({ error: "Enter your reading." }).positive("Enter your reading."),
    unit: unitSchema,
    context: z.enum(["fasting", "after_meal", "random", "bedtime"], { error: "Choose when you tested." }),
    recordedAt: recordedAtSchema,
    note,
  })
  .refine((r) => glucoseRange(toMgdl(r.value, r.unit, GLUCOSE_FACTOR)), {
    message: "That reading is outside the range the app accepts (20–600 mg/dL).",
    path: ["value"],
  });
export type GlucoseReadingInput = z.infer<typeof glucoseReadingSchema>;

export const cholesterolReadingSchema = z
  .object({
    total: z.number({ error: "Enter your total cholesterol." }).positive("Enter your total cholesterol."),
    ldl: z.number({ error: "Enter a number." }).positive().optional(),
    hdl: z.number({ error: "Enter a number." }).positive().optional(),
    triglycerides: z.number({ error: "Enter a number." }).positive().optional(),
    unit: unitSchema,
    recordedAt: recordedAtSchema,
    note,
  })
  .refine(
    (r) =>
      totalRange(toMgdl(r.total, r.unit, CHOLESTEROL_FACTOR)) &&
      (r.ldl === undefined || ldlRange(toMgdl(r.ldl, r.unit, CHOLESTEROL_FACTOR))) &&
      (r.hdl === undefined || hdlRange(toMgdl(r.hdl, r.unit, CHOLESTEROL_FACTOR))) &&
      (r.triglycerides === undefined || trigRange(toMgdl(r.triglycerides, r.unit, TRIGLYCERIDE_FACTOR))),
    { message: "A value is outside the range the app accepts.", path: ["total"] },
  );
export type CholesterolReadingInput = z.infer<typeof cholesterolReadingSchema>;

export const waterSchema = z.object({
  ml: z.number({ error: "Enter an amount." }).int()
    .min(50, "Enter at least 50 ml.").max(3000, "Enter 3,000 ml or less per entry."),
  recordedAt: recordedAtSchema,
});
export type WaterInput = z.infer<typeof waterSchema>;

export const exerciseSchema = z.object({
  activity: z.enum(["walk", "run", "cycle", "swim", "strength", "rehab", "other"], { error: "Choose an activity." }),
  minutes: z.number({ error: "Enter the minutes." }).int()
    .min(1, "Enter at least 1 minute.").max(600, "Enter 600 minutes or less."),
  intensity: z.enum(["light", "moderate", "vigorous"]).optional(),
  note,
  recordedAt: recordedAtSchema,
});
export type ExerciseInput = z.infer<typeof exerciseSchema>;

export const healthConsentSchema = z.object({
  agree: z.literal(true, { error: "Tick the box to continue." }),
});
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/validation/health.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/health.ts src/lib/validation/health.test.ts && git commit -m "feat(health): zod schemas for readings, lifestyle entries and consent"
```

---

### Task 10: Health data client

**Files:**
- Create: `src/lib/health/client.ts`

No unit test (network wrappers); the RLS script (Task 6) and the e2e (Task 16) exercise them. Typecheck must pass.

- [ ] **Step 1: Write the client**

```ts
"use client";

import { getSupabase } from "@/lib/supabase/client";
import { HEALTH_NOTICE_SCOPE, HEALTH_NOTICE_VERSION } from "@/content/health-notice";
import { startOfToday, startOfWeek } from "./format";
import type { ExerciseInsert, Reading, ReadingInsert, ReadingKind, Settings, WaterInsert } from "./types";

/**
 * Data access for the `health` schema (spec §4). Every call runs under
 * the signed-in patient's JWT; RLS and consent gating live in Postgres.
 */
export function health() {
  return getSupabase().schema("health");
}

export type HealthStatus = { patientId: string | null; activeVersion: string | null; deleteAfter: string | null };

export async function fetchStatus(): Promise<HealthStatus> {
  const { data, error } = await health().rpc("my_status");
  if (error) throw error;
  const d = (data ?? {}) as { patient_id?: string; active_version?: string | null; delete_after?: string | null };
  return { patientId: d.patient_id ?? null, activeVersion: d.active_version ?? null, deleteAfter: d.delete_after ?? null };
}

/** Records explicit consent for the current notice version; returns patient_id. */
export async function grantConsent(): Promise<string> {
  const { data, error } = await health().rpc("grant_consent", {
    notice_version: HEALTH_NOTICE_VERSION,
    scope: HEALTH_NOTICE_SCOPE,
  });
  if (error) throw error;
  return data as string;
}

const APP_OPEN_KEY = "aurora-app-open";
/** One `app_open` audit row per browser session (spec D8). */
export async function logAppOpen(): Promise<void> {
  try {
    if (sessionStorage.getItem(APP_OPEN_KEY)) return;
    sessionStorage.setItem(APP_OPEN_KEY, "1");
  } catch {
    // storage blocked (private mode) — log anyway
  }
  await health().rpc("log_app_open");
}

export const DEFAULT_SETTINGS: Settings = { glucose_unit: "mg/dL", cholesterol_unit: "mg/dL", water_goal_ml: 2000 };

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await health().from("settings")
    .select("glucose_unit, cholesterol_unit, water_goal_ml").maybeSingle();
  if (error) throw error;
  return (data as Settings | null) ?? DEFAULT_SETTINGS;
}

export async function updateSettings(patientId: string, patch: Partial<Settings>): Promise<void> {
  const { error } = await health().from("settings")
    .update({ ...patch, updated_at: new Date().toISOString() }).eq("patient_id", patientId);
  if (error) throw error;
}

export async function insertReading(row: ReadingInsert): Promise<void> {
  const { error } = await health().from("readings").insert(row);
  if (error) throw error;
}

export async function insertWater(row: WaterInsert): Promise<void> {
  const { error } = await health().from("water_intake").insert(row);
  if (error) throw error;
}

export async function insertExercise(row: ExerciseInsert): Promise<void> {
  const { error } = await health().from("exercise_sessions").insert(row);
  if (error) throw error;
}

const READING_COLUMNS =
  "id, kind, recorded_at, systolic, diastolic, pulse, glucose_mgdl, glucose_context, " +
  "chol_total_mgdl, chol_ldl_mgdl, chol_hdl_mgdl, chol_trig_mgdl, entered_unit, note";

export type TodayData = {
  latest: Record<ReadingKind, Reading | null>;
  settings: Settings;
  waterMl: number;
  exercise: { minutes: number; sessions: number };
};

/** Everything the Today screen shows, in one round of parallel queries. */
export async function loadToday(): Promise<TodayData> {
  const h = health();
  const latest = (kind: ReadingKind) =>
    h.from("readings").select(READING_COLUMNS).eq("kind", kind)
      .order("recorded_at", { ascending: false }).limit(1).maybeSingle();
  const [bp, gl, ch, st, wa, ex] = await Promise.all([
    latest("blood_pressure"),
    latest("glucose"),
    latest("cholesterol"),
    h.from("settings").select("glucose_unit, cholesterol_unit, water_goal_ml").maybeSingle(),
    h.from("water_intake").select("ml").gte("recorded_at", startOfToday().toISOString()),
    h.from("exercise_sessions").select("minutes").gte("recorded_at", startOfWeek().toISOString()),
  ]);
  for (const r of [bp, gl, ch, st, wa, ex]) if (r.error) throw r.error;
  const water = (wa.data ?? []) as { ml: number }[];
  const sessions = (ex.data ?? []) as { minutes: number }[];
  return {
    latest: {
      blood_pressure: (bp.data as Reading | null) ?? null,
      glucose: (gl.data as Reading | null) ?? null,
      cholesterol: (ch.data as Reading | null) ?? null,
    },
    settings: (st.data as Settings | null) ?? DEFAULT_SETTINGS,
    waterMl: water.reduce((s, r) => s + r.ml, 0),
    exercise: { minutes: sessions.reduce((s, r) => s + r.minutes, 0), sessions: sessions.length },
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/health/client.ts && git commit -m "feat(health): schema client wrappers (status, consent, inserts, today)"
```

---

### Task 11: Icons and the site-chrome switch

**Files:**
- Modify: `src/components/icons.tsx` (the `IconName` union and the `paths` record)
- Create: `src/components/SiteChrome.tsx`
- Modify: `src/app/layout.tsx:61-66`

- [ ] **Step 1: Add six icons**

In `src/components/icons.tsx`, extend the union — replace the line `  | "home";` with:

```ts
  | "home"
  | "chart"
  | "plus"
  | "clipboard"
  | "more"
  | "drop"
  | "x";
```

and, inside `const paths`, after the `home:` entry (before the closing `};`) add:

```tsx
  chart: (
    <>
      <path d="M3.5 19.5h17" />
      <path d="m4.5 15.5 4.5-5 3.5 3 3-4 3.5 2.5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5.5" y="4.5" width="13" height="16" rx="2" />
      <path d="M9 4.5v-1h6v1M9 10.5h6M9 14h6" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18" cy="12" r="1.2" />
    </>
  ),
  drop: (
    <>
      <path d="M12 3.5s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11Z" />
    </>
  ),
  x: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
```

- [ ] **Step 2: Create `SiteChrome`**

`src/components/SiteChrome.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";

/** Hides the marketing chrome (nav, footer, cookie banner) inside the
 *  app shell at /app — the app has its own top bar and tab bar. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/app" || pathname.startsWith("/app/")) return null;
  return <>{children}</>;
}
```

- [ ] **Step 3: Use it in the root layout**

In `src/app/layout.tsx`, add the import `import { SiteChrome } from "@/components/SiteChrome";` after the `ConsentBanner` import, and replace

```tsx
        <NavBar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <ConsentBanner />
```

with

```tsx
        <SiteChrome>
          <NavBar />
        </SiteChrome>
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteChrome>
          <Footer />
          <ConsentBanner />
        </SiteChrome>
```

- [ ] **Step 4: Verify the public site is unchanged**

Run: `npm run verify`
Expected: green. Then `npm run dev`, open http://localhost:3000/ and confirm nav and footer still render (the `/app` route does not exist yet — that comes next).

- [ ] **Step 5: Commit**

```bash
git add src/components/icons.tsx src/components/SiteChrome.tsx src/app/layout.tsx && git commit -m "feat(app): tab icons and a site-chrome switch for /app"
```

---

### Task 12: App shell, guards, consent screen and tab stubs

**Files:**
- Create: `src/components/app/AppContext.tsx`
- Create: `src/components/app/AppShell.tsx`
- Create: `src/components/app/TopBar.tsx`
- Create: `src/components/app/TabBar.tsx`
- Create: `src/components/app/OfflineBanner.tsx`
- Create: `src/components/app/ConsentScreen.tsx`
- Create: `src/app/app/layout.tsx`, `src/app/app/page.tsx`, `src/app/app/consent/page.tsx`
- Create: `src/app/app/trends/page.tsx`, `src/app/app/record/page.tsx`, `src/app/app/more/page.tsx` (stubs replaced in Plan 2)

- [ ] **Step 1: The app context**

`src/components/app/AppContext.tsx`:

```tsx
"use client";

import { createContext, useContext } from "react";
import type { HealthStatus } from "@/lib/health/client";
import type { LogKind } from "@/lib/health/types";

export type AppContextValue = {
  status: HealthStatus;
  refreshStatus: () => Promise<void>;
  openLog: (kind?: LogKind) => void;
  /** Increments after every successful save; screens refetch when it changes. */
  version: number;
  bump: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);
export const AppProvider = AppContext.Provider;

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error("useApp must be used inside AppShell");
  return v;
}
```

- [ ] **Step 2: Offline detection**

`src/components/app/OfflineBanner.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** Spec D13: offline shows a banner; forms disable Save (see SaveRow). */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <p role="status" className="border-b border-[#f5c451]/40 bg-[#f5c451]/10 px-4 py-2 text-center text-sm text-[#f5c451]">
      You&rsquo;re offline — readings can&rsquo;t be saved until you reconnect.
    </p>
  );
}
```

- [ ] **Step 3: Top bar**

`src/components/app/TopBar.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { AuroraMark } from "@/components/AuroraLogo";
import { useSession } from "@/lib/auth/session";
import { initials } from "@/lib/health/format";

const titles: [string, string][] = [
  ["/app/consent", "Before you start"],
  ["/app/trends", "Trends"],
  ["/app/record", "Health record"],
  ["/app/more", "More"],
];

export function TopBar() {
  const pathname = usePathname();
  const session = useSession();
  const title = titles.find(([p]) => pathname.startsWith(p))?.[1] ?? "Today";
  const meta = (session?.user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const name = meta.full_name ?? meta.name ?? "";
  return (
    <header className="sticky top-0 z-30 border-b border-line-dark bg-navy/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <AuroraMark className="h-7 w-7" />
          <span className="font-heading text-sm font-semibold uppercase tracking-[var(--tracking-caps)] text-cyan">
            {title}
          </span>
        </div>
        <span
          role="img"
          aria-label={name ? `Signed in as ${name}` : "Signed in"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo font-heading text-xs font-semibold text-cyan"
        >
          {initials(name)}
        </span>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Tab bar**

`src/components/app/TabBar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

type Tab = { href: string; label: string; icon: IconName; exact?: boolean };
const tabs: Tab[] = [
  { href: "/app/", label: "Today", icon: "home", exact: true },
  { href: "/app/trends/", label: "Trends", icon: "chart" },
  { href: "/app/record/", label: "Record", icon: "clipboard" },
  { href: "/app/more/", label: "More", icon: "more" },
];

/** Bottom tabs on phones, a left rail from md up (spec §9.1). */
export function TabBar({ onLog }: { onLog: () => void }) {
  const pathname = usePathname();
  const active = (t: Tab) =>
    t.exact ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(t.href.replace(/\/$/, ""));
  const item = (t: Tab) => (
    <Link
      key={t.href}
      href={t.href}
      aria-current={active(t) ? "page" : undefined}
      className={`flex min-w-[4rem] flex-col items-center gap-1 px-2 py-2 text-xs font-medium ${
        active(t) ? "text-cyan" : "text-silver hover:text-starlight"
      }`}
    >
      <Icon name={t.icon} className="h-6 w-6" />
      {t.label}
    </Link>
  );
  return (
    <nav
      aria-label="App sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-dark bg-navy/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:inset-y-0 md:right-auto md:w-24 md:border-r md:border-t-0 md:pb-0"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-around md:h-full md:flex-col md:justify-start md:gap-2 md:pt-6">
        {item(tabs[0])}
        {item(tabs[1])}
        <button
          type="button"
          onClick={onLog}
          aria-label="Log a reading"
          className="motion-press -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-cyan text-navy shadow-[0_0_24px_rgba(43,217,245,0.35)] hover:bg-blue md:mt-0"
        >
          <Icon name="plus" className="h-7 w-7" />
        </button>
        {item(tabs[2])}
        {item(tabs[3])}
      </div>
    </nav>
  );
}
```

- [ ] **Step 5: The shell (Task 14 replaces this file to add the Log sheet)**

`src/components/app/AppShell.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { fetchStatus, logAppOpen, type HealthStatus } from "@/lib/health/client";
import { HEALTH_NOTICE_VERSION } from "@/content/health-notice";
import { AppProvider, type AppContextValue } from "./AppContext";
import { TopBar } from "./TopBar";
import { TabBar } from "./TabBar";
import { OfflineBanner } from "./OfflineBanner";

/**
 * App shell for /app (spec §9.1): session guard → consent guard → one
 * app_open audit event per browser session → top bar, tab bar, offline
 * banner. Guards are UX only; RLS is the security boundary.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<HealthStatus | undefined>();
  const [version, setVersion] = useState(0);

  const refreshStatus = useCallback(async () => {
    setStatus(await fetchStatus());
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/patient-login/");
  }, [session, router]);

  useEffect(() => {
    if (!session) return;
    refreshStatus().catch(() => setStatus({ patientId: null, activeVersion: null, deleteAfter: null }));
  }, [session, refreshStatus]);

  const onConsent = pathname.startsWith("/app/consent");
  const consented = status?.activeVersion === HEALTH_NOTICE_VERSION;

  useEffect(() => {
    if (!status) return;
    if (!consented && !onConsent) router.replace("/app/consent/");
    else if (consented && onConsent) router.replace("/app/");
    if (consented) logAppOpen().catch(() => undefined);
  }, [status, consented, onConsent, router]);

  const openLog = useCallback(() => undefined, []); // replaced in Task 14
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo<AppContextValue | null>(
    () => (status ? { status, refreshStatus, openLog, version, bump } : null),
    [status, refreshStatus, openLog, version, bump],
  );

  if (session === undefined || status === undefined) {
    return <p className="px-4 py-24 text-center text-silver">Loading…</p>;
  }
  if (session === null || !value) return null;
  if (!consented && !onConsent) return null;

  return (
    <AppProvider value={value}>
      <div className="min-h-screen md:pl-24">
        <TopBar />
        <OfflineBanner />
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:px-6">{children}</div>
        {consented ? <TabBar onLog={() => openLog()} /> : null}
      </div>
    </AppProvider>
  );
}
```

- [ ] **Step 6: Consent screen**

`src/components/app/ConsentScreen.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { CheckboxField } from "@/components/forms/fields";
import { HEALTH_NOTICE_VERSION, healthNotice } from "@/content/health-notice";
import { grantConsent } from "@/lib/health/client";
import { healthConsentSchema } from "@/lib/validation/health";
import { useApp } from "./AppContext";

/** GDPR Art. 9(2)(a) explicit consent gate (spec §5). */
export function ConsentScreen() {
  const router = useRouter();
  const { refreshStatus } = useApp();
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = healthConsentSchema.safeParse({ agree });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Tick the box to continue.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await grantConsent();
      await refreshStatus();
      router.replace("/app/");
    } catch {
      setBusy(false);
      setError("Couldn't save your consent. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl">{healthNotice.title}</h1>
        <p className="mt-2 text-silver">{healthNotice.intro}</p>
      </div>
      {healthNotice.sections.map((s) => (
        <section key={s.heading}>
          <h2 className="text-lg text-starlight">{s.heading}</h2>
          <p className="mt-1 text-sm leading-relaxed text-silver">{s.body}</p>
        </section>
      ))}
      <CheckboxField
        id="agree"
        name="agree"
        checked={agree}
        onChange={(e) => setAgree(e.target.checked)}
        error={error}
        label={healthNotice.checkbox}
      />
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : healthNotice.button}</Button>
      <p className="text-xs text-silver/70">
        Notice version {HEALTH_NOTICE_VERSION}. Read the full{" "}
        <a href="/privacy-centre/notice" className="text-cyan underline underline-offset-2">privacy notice</a>.
      </p>
    </form>
  );
}
```

- [ ] **Step 7: Routes**

`src/app/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app/AppShell";

export const metadata: Metadata = {
  title: { default: "Aurora Health", template: "%s | Aurora Health" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#060B22", viewportFit: "cover" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

`src/app/app/page.tsx` (placeholder; Task 13 replaces it):

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Today" };

export default function AppTodayPage() {
  return <h1 className="text-2xl">Today</h1>;
}
```

`src/app/app/consent/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ConsentScreen } from "@/components/app/ConsentScreen";

export const metadata: Metadata = { title: "Before you start" };

export default function ConsentPage() {
  return <ConsentScreen />;
}
```

`src/app/app/trends/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trends" };

export default function TrendsPage() {
  return (
    <div>
      <h1 className="text-2xl">Trends</h1>
      <p className="mt-2 text-silver">Charts arrive in the next update.</p>
    </div>
  );
}
```

`src/app/app/record/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Health record" };

export default function RecordPage() {
  return (
    <div>
      <h1 className="text-2xl">Health record</h1>
      <p className="mt-2 text-silver">Your conditions, medications and allergies arrive in the next update.</p>
    </div>
  );
}
```

`src/app/app/more/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "More" };

export default function MorePage() {
  return (
    <div>
      <h1 className="text-2xl">More</h1>
      <p className="mt-2 text-silver">Consent, access history, download and settings arrive in the next update.</p>
    </div>
  );
}
```

- [ ] **Step 8: Verify in the browser**

Run: `npm run verify` — expected green (`/app`, `/app/consent`, `/app/trends`, `/app/record`, `/app/more` appear in the route list). Then `npm run dev`, sign in at http://localhost:3000/patient-login/ with a real patient account, open http://localhost:3000/app/ and confirm:
- you land on **Before you start** with no nav/footer;
- submitting without the box shows "Tick the box to continue.";
- ticking and submitting lands on **Today** with the tab bar and the cyan + button;
- reloading `/app/consent/` bounces back to `/app/`.

Then confirm the audit rows exist:

```bash
python3 "/private/tmp/claude-501/-Users-stefangravesande-Documents-Projects-Routines-Claude/bf2da734-279e-4699-b244-1b1a654d1d69/scratchpad/sbq.py" "select action, resource, ip is not null as has_ip, left(user_agent, 20) as ua from health.access_log order by at desc limit 5"
```
Expected: rows `app_open`/`app`, `insert`/`settings`, `consent_granted`/`consents`, with `has_ip` true and a browser UA prefix.

- [ ] **Step 9: Commit**

```bash
git add src/components/app src/app/app && git commit -m "feat(app): shell with session/consent guards, tab bar, consent screen"
```

---

### Task 13: Today screen

**Files:**
- Create: `src/components/app/RangeBadge.tsx`, `src/components/app/MetricCard.tsx`, `src/components/app/WaterCard.tsx`, `src/components/app/TodayScreen.tsx`
- Modify: `src/app/app/page.tsx` (full replacement)

- [ ] **Step 1: RangeBadge**

```tsx
import type { Band } from "@/lib/health/ranges";

/* Status colours are semantic, not CTAs (PDR §4.2 keeps cyan for actions):
   good = cyan outline, watch = amber, high = rose, urgent = filled rose. */
const tones = {
  good: "border-cyan/40 text-cyan",
  watch: "border-[#f5c451]/50 text-[#f5c451]",
  high: "border-[#ff9db0]/50 text-[#ff9db0]",
  urgent: "border-[#ff9db0] bg-[#ff9db0] text-navy",
} as const;

export function RangeBadge({ band }: { band: Band }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[band.tone]}`}>
      {band.label}
    </span>
  );
}
```

- [ ] **Step 2: MetricCard**

```tsx
import type { Band } from "@/lib/health/ranges";
import { RangeBadge } from "./RangeBadge";

export function MetricCard({
  label, value, unit, when, band, emptyText, onLog,
}: {
  label: string;
  value?: string;
  unit?: string;
  when?: string;
  band?: Band;
  emptyText: string;
  onLog: () => void;
}) {
  return (
    <section aria-label={label} className="rounded-2xl border border-line-dark bg-indigo p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-silver">{label}</p>
          {value ? (
            <p className="mt-1 font-heading text-3xl font-semibold text-starlight">
              {value}
              {unit ? <span className="ml-1.5 text-sm font-medium text-silver">{unit}</span> : null}
            </p>
          ) : (
            <p className="mt-1 text-sm text-silver/80">{emptyText}</p>
          )}
          {when ? <p className="mt-1 text-xs text-silver/70">{when}</p> : null}
        </div>
        {band ? <RangeBadge band={band} /> : null}
      </div>
      <button
        type="button"
        onClick={onLog}
        className="mt-3 text-sm font-medium text-cyan underline-offset-4 hover:underline"
      >
        {value ? "Log a new reading" : "Log your first reading"}
      </button>
    </section>
  );
}
```

- [ ] **Step 3: WaterCard**

```tsx
"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

export function WaterCard({ ml, goal, onAdd }: { ml: number; goal: number; onAdd: (ml: number) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pct = Math.min(100, Math.round((ml / goal) * 100));

  async function add(amount: number) {
    setBusy(true);
    setError(undefined);
    try {
      await onAdd(amount);
    } catch {
      setError("Couldn't save. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Water" className="rounded-2xl border border-line-dark bg-indigo p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-silver">
          <Icon name="drop" className="h-4 w-4 text-cyan" /> Water today
        </span>
        <span className="text-starlight">
          {ml.toLocaleString("en-GB")} / {goal.toLocaleString("en-GB")} ml
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Water towards today's goal"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(ml, goal)}
        className="mt-3 h-2 overflow-hidden rounded-full bg-navy"
      >
        <div className="h-full rounded-full bg-cyan transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[250, 500].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            onClick={() => add(n)}
            className="motion-press rounded-full border border-cyan/60 px-3 py-1.5 text-sm font-semibold text-cyan hover:border-cyan disabled:opacity-50"
          >
            +{n} ml
          </button>
        ))}
        {error ? <p role="alert" className="text-sm text-[#ff9db0]">{error}</p> : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: TodayScreen**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth/session";
import { insertWater, loadToday, type TodayData } from "@/lib/health/client";
import { firstName, greeting, relativeTime } from "@/lib/health/format";
import { bpBand, cholesterolBand, glucoseBand, DISCLAIMER } from "@/lib/health/ranges";
import { CHOLESTEROL_FACTOR, GLUCOSE_FACTOR, formatValue } from "@/lib/health/units";
import type { GlucoseContext } from "@/lib/health/types";
import { useApp } from "./AppContext";
import { MetricCard } from "./MetricCard";
import { WaterCard } from "./WaterCard";

const contextLabel: Record<GlucoseContext, string> = {
  fasting: "fasting", after_meal: "after a meal", random: "random", bedtime: "bedtime",
};

export function TodayScreen() {
  const { status, version, openLog, bump } = useApp();
  const session = useSession();
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let live = true;
    loadToday()
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setError("Couldn't load your readings. Check your connection."); });
    return () => { live = false; };
  }, [version]);

  async function addWater(ml: number) {
    if (!status.patientId) return;
    await insertWater({ patient_id: status.patientId, ml, recorded_at: new Date().toISOString() });
    bump();
  }

  const meta = (session?.user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const name = firstName(meta.full_name ?? meta.name ?? "");
  const bp = data?.latest.blood_pressure ?? null;
  const gl = data?.latest.glucose ?? null;
  const ch = data?.latest.cholesterol ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl">{greeting()}{name ? `, ${name}` : ""}</h1>
        <p className="text-sm text-silver">
          {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
        </p>
      </div>
      {error ? <p role="alert" className="text-sm text-[#ff9db0]">{error}</p> : null}
      {data === null && !error ? <p className="text-silver">Loading…</p> : null}
      {data ? (
        <>
          <MetricCard
            label="Blood pressure"
            emptyText="No reading yet."
            onLog={() => openLog("blood_pressure")}
            value={bp ? `${bp.systolic}/${bp.diastolic}` : undefined}
            unit={bp ? "mmHg" : undefined}
            when={bp ? relativeTime(bp.recorded_at) : undefined}
            band={bp ? bpBand(bp.systolic ?? 0, bp.diastolic ?? 0) : undefined}
          />
          <MetricCard
            label={gl?.glucose_context ? `Blood sugar · ${contextLabel[gl.glucose_context]}` : "Blood sugar"}
            emptyText="No reading yet."
            onLog={() => openLog("glucose")}
            value={gl ? formatValue(gl.glucose_mgdl ?? 0, data.settings.glucose_unit, GLUCOSE_FACTOR) : undefined}
            unit={gl ? data.settings.glucose_unit : undefined}
            when={gl ? relativeTime(gl.recorded_at) : undefined}
            band={gl ? glucoseBand(gl.glucose_mgdl ?? 0, gl.glucose_context ?? "random") : undefined}
          />
          <MetricCard
            label="Cholesterol (total)"
            emptyText="No reading yet."
            onLog={() => openLog("cholesterol")}
            value={ch ? formatValue(ch.chol_total_mgdl ?? 0, data.settings.cholesterol_unit, CHOLESTEROL_FACTOR) : undefined}
            unit={ch ? data.settings.cholesterol_unit : undefined}
            when={ch ? relativeTime(ch.recorded_at) : undefined}
            band={ch ? cholesterolBand(ch.chol_total_mgdl ?? 0) : undefined}
          />
          <WaterCard ml={data.waterMl} goal={data.settings.water_goal_ml} onAdd={addWater} />
          <p className="text-sm text-silver">
            Exercise this week{" "}
            <span className="text-starlight">
              {data.exercise.minutes} min · {data.exercise.sessions} session{data.exercise.sessions === 1 ? "" : "s"}
            </span>
            {" · "}
            <button type="button" onClick={() => openLog("exercise")} className="text-cyan underline-offset-4 hover:underline">
              Log exercise
            </button>
          </p>
          <p className="text-xs text-silver/70">{DISCLAIMER}</p>
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Replace the page**

`src/app/app/page.tsx`:

```tsx
import type { Metadata } from "next";
import { TodayScreen } from "@/components/app/TodayScreen";

export const metadata: Metadata = { title: "Today" };

export default function AppTodayPage() {
  return <TodayScreen />;
}
```

- [ ] **Step 6: Verify**

Run: `npm run verify` — green. In the dev server, `/app/` shows the greeting, three empty metric cards ("No reading yet."), the water card at 0 / 2,000 ml; pressing **+250 ml** moves the bar to 250 and a `insert`/`water_intake` row appears in `health.access_log` (query from Task 12 Step 8).

- [ ] **Step 7: Commit**

```bash
git add src/components/app/RangeBadge.tsx src/components/app/MetricCard.tsx src/components/app/WaterCard.tsx src/components/app/TodayScreen.tsx src/app/app/page.tsx && git commit -m "feat(app): Today screen with latest readings, bands and water"
```

---

### Task 14: Log sheet and the five entry forms

**Files:**
- Create: `src/components/app/useFocusTrap.ts`, `src/components/app/LogSheet.tsx`
- Create: `src/components/app/forms/shared.tsx`, `BpForm.tsx`, `GlucoseForm.tsx`, `CholesterolForm.tsx`, `WaterForm.tsx`, `ExerciseForm.tsx`
- Modify: `src/components/app/AppShell.tsx` (full replacement)

- [ ] **Step 1: Focus trap**

`src/components/app/useFocusTrap.ts`:

```ts
import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab inside `ref` while `active`, Escape calls `onEscape`, and
 *  focus returns to the opener on close (PDR §12 keyboard operability). */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape: () => void) {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!root.contains(document.activeElement)) root.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onEscape(); return; }
      if (e.key !== "Tab" || !root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [ref, active, onEscape]);
}
```

- [ ] **Step 2: Shared form pieces**

`src/components/app/forms/shared.tsx`:

```tsx
"use client";

import { Button } from "@/components/Button";
import { TextAreaField, TextField } from "@/components/forms/fields";
import { toDatetimeLocal } from "@/lib/health/format";
import type { Band } from "@/lib/health/ranges";
import { useOnline } from "../OfflineBanner";

export type SavedInfo = { title: string; band?: Band };

/** Number from a form field; undefined when blank, NaN when not a number. */
export function num(fd: FormData, name: string): number | undefined {
  const raw = String(fd.get(name) ?? "").trim();
  return raw === "" ? undefined : Number(raw);
}

export function str(fd: FormData, name: string): string {
  return String(fd.get(name) ?? "").trim();
}

export const SAVE_ERROR = "Couldn't save. Check your connection and try again.";

export function WhenField({ error }: { error?: string }) {
  const now = new Date();
  const min = new Date(now.getTime() - 30 * 86_400_000);
  return (
    <TextField
      id="recordedAt" name="recordedAt" type="datetime-local" label="When"
      defaultValue={toDatetimeLocal(now)} max={toDatetimeLocal(now)} min={toDatetimeLocal(min)}
      error={error}
    />
  );
}

export function NoteField({ error }: { error?: string }) {
  return <TextAreaField id="note" name="note" label="Note" optional rows={2} maxLength={300} error={error} />;
}

export function SaveRow({ busy, error }: { busy: boolean; error?: string }) {
  const online = useOnline();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button type="submit" disabled={busy || !online}>{busy ? "Saving…" : online ? "Save" : "Offline"}</Button>
      {error ? <p role="alert" className="text-sm font-medium text-[#ff9db0]">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 3: Blood pressure form**

`src/components/app/forms/BpForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { TextField } from "@/components/forms/fields";
import { insertReading } from "@/lib/health/client";
import { fromDatetimeLocal } from "@/lib/health/format";
import { bpBand } from "@/lib/health/ranges";
import { bpReadingSchema } from "@/lib/validation/health";
import { fieldErrors } from "@/lib/validation/schemas";
import { NoteField, SAVE_ERROR, SaveRow, WhenField, num, str, type SavedInfo } from "./shared";

export function BpForm({ patientId, onSaved }: { patientId: string; onSaved: (info: SavedInfo) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = bpReadingSchema.safeParse({
      systolic: num(fd, "systolic"), diastolic: num(fd, "diastolic"), pulse: num(fd, "pulse"),
      recordedAt: fromDatetimeLocal(str(fd, "recordedAt")), note: str(fd, "note"),
    });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setBusy(true); setFormError(undefined);
    const d = parsed.data;
    try {
      await insertReading({
        patient_id: patientId, kind: "blood_pressure", recorded_at: d.recordedAt,
        systolic: d.systolic, diastolic: d.diastolic, pulse: d.pulse ?? null, note: d.note || null,
      });
      onSaved({ title: `Blood pressure ${d.systolic}/${d.diastolic} saved`, band: bpBand(d.systolic, d.diastolic) });
    } catch {
      setBusy(false);
      setFormError(SAVE_ERROR);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <TextField id="systolic" name="systolic" type="number" inputMode="numeric" label="Systolic (top)" placeholder="120" error={errors.systolic} />
        <TextField id="diastolic" name="diastolic" type="number" inputMode="numeric" label="Diastolic (bottom)" placeholder="80" error={errors.diastolic} />
      </div>
      <TextField id="pulse" name="pulse" type="number" inputMode="numeric" label="Pulse (bpm)" optional placeholder="72" error={errors.pulse} />
      <WhenField error={errors.recordedAt} />
      <NoteField error={errors.note} />
      <SaveRow busy={busy} error={formError} />
    </form>
  );
}
```

- [ ] **Step 4: Glucose form**

`src/components/app/forms/GlucoseForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { SelectField, TextField } from "@/components/forms/fields";
import { insertReading, updateSettings } from "@/lib/health/client";
import { fromDatetimeLocal } from "@/lib/health/format";
import { glucoseBand } from "@/lib/health/ranges";
import type { Settings } from "@/lib/health/types";
import { GLUCOSE_FACTOR, toMgdl } from "@/lib/health/units";
import { glucoseReadingSchema } from "@/lib/validation/health";
import { fieldErrors } from "@/lib/validation/schemas";
import { NoteField, SAVE_ERROR, SaveRow, WhenField, num, str, type SavedInfo } from "./shared";

export function GlucoseForm({
  patientId, settings, onSaved,
}: { patientId: string; settings: Settings; onSaved: (info: SavedInfo) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = glucoseReadingSchema.safeParse({
      value: num(fd, "value"), unit: str(fd, "unit"), context: str(fd, "context"),
      recordedAt: fromDatetimeLocal(str(fd, "recordedAt")), note: str(fd, "note"),
    });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setBusy(true); setFormError(undefined);
    const d = parsed.data;
    const mgdl = toMgdl(d.value, d.unit, GLUCOSE_FACTOR);
    try {
      await insertReading({
        patient_id: patientId, kind: "glucose", recorded_at: d.recordedAt,
        glucose_mgdl: mgdl, glucose_context: d.context, entered_unit: d.unit, note: d.note || null,
      });
      if (d.unit !== settings.glucose_unit) await updateSettings(patientId, { glucose_unit: d.unit });
      onSaved({ title: `Blood sugar ${d.value} ${d.unit} saved`, band: glucoseBand(mgdl, d.context) });
    } catch {
      setBusy(false);
      setFormError(SAVE_ERROR);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <TextField id="value" name="value" type="number" step="0.1" inputMode="decimal" label="Blood sugar"
          placeholder={settings.glucose_unit === "mg/dL" ? "104" : "5.8"} error={errors.value} />
        <SelectField id="unit" name="unit" label="Unit" defaultValue={settings.glucose_unit} error={errors.unit}>
          <option value="mg/dL">mg/dL</option>
          <option value="mmol/L">mmol/L</option>
        </SelectField>
      </div>
      <SelectField id="context" name="context" label="When did you test?" defaultValue="fasting" error={errors.context}>
        <option value="fasting">Fasting (before eating)</option>
        <option value="after_meal">After a meal</option>
        <option value="random">Random</option>
        <option value="bedtime">Bedtime</option>
      </SelectField>
      <WhenField error={errors.recordedAt} />
      <NoteField error={errors.note} />
      <SaveRow busy={busy} error={formError} />
    </form>
  );
}
```

- [ ] **Step 5: Cholesterol form**

`src/components/app/forms/CholesterolForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { SelectField, TextField } from "@/components/forms/fields";
import { insertReading, updateSettings } from "@/lib/health/client";
import { fromDatetimeLocal } from "@/lib/health/format";
import { cholesterolBand } from "@/lib/health/ranges";
import type { Settings } from "@/lib/health/types";
import { CHOLESTEROL_FACTOR, TRIGLYCERIDE_FACTOR, toMgdl } from "@/lib/health/units";
import { cholesterolReadingSchema } from "@/lib/validation/health";
import { fieldErrors } from "@/lib/validation/schemas";
import { NoteField, SAVE_ERROR, SaveRow, WhenField, num, str, type SavedInfo } from "./shared";

export function CholesterolForm({
  patientId, settings, onSaved,
}: { patientId: string; settings: Settings; onSaved: (info: SavedInfo) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = cholesterolReadingSchema.safeParse({
      total: num(fd, "total"), ldl: num(fd, "ldl"), hdl: num(fd, "hdl"), triglycerides: num(fd, "triglycerides"),
      unit: str(fd, "unit"), recordedAt: fromDatetimeLocal(str(fd, "recordedAt")), note: str(fd, "note"),
    });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setBusy(true); setFormError(undefined);
    const d = parsed.data;
    const conv = (v: number | undefined, factor: number) => (v === undefined ? null : toMgdl(v, d.unit, factor));
    const total = toMgdl(d.total, d.unit, CHOLESTEROL_FACTOR);
    try {
      await insertReading({
        patient_id: patientId, kind: "cholesterol", recorded_at: d.recordedAt,
        chol_total_mgdl: total,
        chol_ldl_mgdl: conv(d.ldl, CHOLESTEROL_FACTOR),
        chol_hdl_mgdl: conv(d.hdl, CHOLESTEROL_FACTOR),
        chol_trig_mgdl: conv(d.triglycerides, TRIGLYCERIDE_FACTOR),
        entered_unit: d.unit, note: d.note || null,
      });
      if (d.unit !== settings.cholesterol_unit) await updateSettings(patientId, { cholesterol_unit: d.unit });
      onSaved({ title: `Cholesterol ${d.total} ${d.unit} saved`, band: cholesterolBand(total) });
    } catch {
      setBusy(false);
      setFormError(SAVE_ERROR);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <TextField id="total" name="total" type="number" step="0.1" inputMode="decimal" label="Total cholesterol"
          placeholder={settings.cholesterol_unit === "mg/dL" ? "180" : "4.7"} error={errors.total} />
        <SelectField id="unit" name="unit" label="Unit" defaultValue={settings.cholesterol_unit} error={errors.unit}>
          <option value="mg/dL">mg/dL</option>
          <option value="mmol/L">mmol/L</option>
        </SelectField>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <TextField id="ldl" name="ldl" type="number" step="0.1" inputMode="decimal" label="LDL" optional error={errors.ldl} />
        <TextField id="hdl" name="hdl" type="number" step="0.1" inputMode="decimal" label="HDL" optional error={errors.hdl} />
        <TextField id="triglycerides" name="triglycerides" type="number" step="0.1" inputMode="decimal" label="Triglycerides" optional error={errors.triglycerides} />
      </div>
      <WhenField error={errors.recordedAt} />
      <NoteField error={errors.note} />
      <SaveRow busy={busy} error={formError} />
    </form>
  );
}
```

- [ ] **Step 6: Water form**

`src/components/app/forms/WaterForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { TextField } from "@/components/forms/fields";
import { insertWater } from "@/lib/health/client";
import { fromDatetimeLocal } from "@/lib/health/format";
import { waterSchema } from "@/lib/validation/health";
import { fieldErrors } from "@/lib/validation/schemas";
import { SAVE_ERROR, SaveRow, WhenField, num, str, type SavedInfo } from "./shared";

export function WaterForm({ patientId, onSaved }: { patientId: string; onSaved: (info: SavedInfo) => void }) {
  const [ml, setMl] = useState("250");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = waterSchema.safeParse({ ml: num(fd, "ml"), recordedAt: fromDatetimeLocal(str(fd, "recordedAt")) });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setBusy(true); setFormError(undefined);
    try {
      await insertWater({ patient_id: patientId, ml: parsed.data.ml, recorded_at: parsed.data.recordedAt });
      onSaved({ title: `${parsed.data.ml} ml of water saved` });
    } catch {
      setBusy(false);
      setFormError(SAVE_ERROR);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div role="group" aria-label="Quick amounts" className="flex flex-wrap gap-2">
        {[250, 500, 750].map((n) => (
          <button key={n} type="button" onClick={() => setMl(String(n))} aria-pressed={ml === String(n)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${ml === String(n) ? "border-cyan bg-cyan text-navy" : "border-silver/30 text-silver hover:border-silver/60"}`}>
            {n} ml
          </button>
        ))}
      </div>
      <TextField id="ml" name="ml" type="number" inputMode="numeric" label="Amount (ml)" value={ml}
        onChange={(e) => setMl(e.target.value)} error={errors.ml} />
      <WhenField error={errors.recordedAt} />
      <SaveRow busy={busy} error={formError} />
    </form>
  );
}
```

- [ ] **Step 7: Exercise form**

`src/components/app/forms/ExerciseForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { SelectField, TextField } from "@/components/forms/fields";
import { insertExercise } from "@/lib/health/client";
import { fromDatetimeLocal } from "@/lib/health/format";
import { exerciseSchema } from "@/lib/validation/health";
import { fieldErrors } from "@/lib/validation/schemas";
import { NoteField, SAVE_ERROR, SaveRow, WhenField, num, str, type SavedInfo } from "./shared";

const activities: [string, string][] = [
  ["walk", "Walk"], ["run", "Run"], ["cycle", "Cycle"], ["swim", "Swim"],
  ["strength", "Strength"], ["rehab", "Rehab exercises"], ["other", "Other"],
];

export function ExerciseForm({ patientId, onSaved }: { patientId: string; onSaved: (info: SavedInfo) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = exerciseSchema.safeParse({
      activity: str(fd, "activity"), minutes: num(fd, "minutes"),
      intensity: str(fd, "intensity") || undefined,
      note: str(fd, "note"), recordedAt: fromDatetimeLocal(str(fd, "recordedAt")),
    });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setBusy(true); setFormError(undefined);
    const d = parsed.data;
    try {
      await insertExercise({
        patient_id: patientId, activity: d.activity, minutes: d.minutes,
        intensity: d.intensity ?? null, note: d.note || null, recorded_at: d.recordedAt,
      });
      onSaved({ title: `${d.minutes} min of exercise saved` });
    } catch {
      setBusy(false);
      setFormError(SAVE_ERROR);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <SelectField id="activity" name="activity" label="Activity" defaultValue="walk" error={errors.activity}>
        {activities.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </SelectField>
      <div className="grid grid-cols-2 gap-3">
        <TextField id="minutes" name="minutes" type="number" inputMode="numeric" label="Minutes" placeholder="30" error={errors.minutes} />
        <SelectField id="intensity" name="intensity" label="Intensity" optional defaultValue="" error={errors.intensity}>
          <option value="">Not sure</option>
          <option value="light">Light</option>
          <option value="moderate">Moderate</option>
          <option value="vigorous">Vigorous</option>
        </SelectField>
      </div>
      <WhenField error={errors.recordedAt} />
      <NoteField error={errors.note} />
      <SaveRow busy={busy} error={formError} />
    </form>
  );
}
```

- [ ] **Step 8: The sheet**

`src/components/app/LogSheet.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { DEFAULT_SETTINGS, fetchSettings } from "@/lib/health/client";
import type { LogKind, Settings } from "@/lib/health/types";
import { RangeBadge } from "./RangeBadge";
import { useFocusTrap } from "./useFocusTrap";
import { BpForm } from "./forms/BpForm";
import { GlucoseForm } from "./forms/GlucoseForm";
import { CholesterolForm } from "./forms/CholesterolForm";
import { WaterForm } from "./forms/WaterForm";
import { ExerciseForm } from "./forms/ExerciseForm";
import type { SavedInfo } from "./forms/shared";

const kinds: { kind: LogKind; label: string }[] = [
  { kind: "blood_pressure", label: "BP" },
  { kind: "glucose", label: "Sugar" },
  { kind: "cholesterol", label: "Cholesterol" },
  { kind: "water", label: "Water" },
  { kind: "exercise", label: "Exercise" },
];

/** Bottom sheet on phones, centred dialog from md up (spec §9.2). */
export function LogSheet({
  open, kind: initialKind, patientId, onClose, onSaved,
}: { open: boolean; kind: LogKind; patientId: string; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<LogKind>(initialKind);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState<SavedInfo | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, open, onClose);

  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setSaved(null);
    fetchSettings().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS));
  }, [open, initialKind]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  function handleSaved(info: SavedInfo) {
    setSaved(info);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/70 md:items-center" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line-dark bg-indigo p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-3xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-silver/30 md:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between">
          <h2 id="log-title" className="text-xl">Log a reading</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-silver hover:text-starlight">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {saved ? (
          <div className="mt-6 flex flex-col items-start gap-3">
            <p role="status" className="text-starlight">{saved.title}</p>
            {saved.band ? <RangeBadge band={saved.band} /> : null}
            {saved.band?.urgent ? (
              <p className="rounded-xl border border-[#ff9db0]/50 p-3 text-sm text-starlight">{saved.band.urgent}</p>
            ) : null}
            <div className="flex gap-4">
              <button type="button" onClick={() => setSaved(null)} className="text-sm font-medium text-cyan underline-offset-4 hover:underline">
                Log another
              </button>
              <button type="button" onClick={onClose} className="text-sm font-medium text-silver underline-offset-4 hover:underline">
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div role="group" aria-label="What to log" className="mt-4 flex flex-wrap gap-2">
              {kinds.map((k) => (
                <button
                  key={k.kind}
                  type="button"
                  aria-pressed={kind === k.kind}
                  onClick={() => setKind(k.kind)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    kind === k.kind ? "border-cyan bg-cyan text-navy" : "border-silver/30 text-silver hover:border-silver/60"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <div className="mt-5">
              {settings === null ? (
                <p className="text-silver">Loading…</p>
              ) : kind === "blood_pressure" ? (
                <BpForm patientId={patientId} onSaved={handleSaved} />
              ) : kind === "glucose" ? (
                <GlucoseForm patientId={patientId} settings={settings} onSaved={handleSaved} />
              ) : kind === "cholesterol" ? (
                <CholesterolForm patientId={patientId} settings={settings} onSaved={handleSaved} />
              ) : kind === "water" ? (
                <WaterForm patientId={patientId} onSaved={handleSaved} />
              ) : (
                <ExerciseForm patientId={patientId} onSaved={handleSaved} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Wire the sheet into the shell (full replacement of `AppShell.tsx`)**

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { fetchStatus, logAppOpen, type HealthStatus } from "@/lib/health/client";
import { HEALTH_NOTICE_VERSION } from "@/content/health-notice";
import type { LogKind } from "@/lib/health/types";
import { AppProvider, type AppContextValue } from "./AppContext";
import { TopBar } from "./TopBar";
import { TabBar } from "./TabBar";
import { OfflineBanner } from "./OfflineBanner";
import { LogSheet } from "./LogSheet";

/**
 * App shell for /app (spec §9.1): session guard → consent guard → one
 * app_open audit event per browser session → top bar, tab bar, offline
 * banner, and the Log sheet. Guards are UX only; RLS is the boundary.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<HealthStatus | undefined>();
  const [version, setVersion] = useState(0);
  const [log, setLog] = useState<{ open: boolean; kind: LogKind }>({ open: false, kind: "blood_pressure" });

  const refreshStatus = useCallback(async () => {
    setStatus(await fetchStatus());
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/patient-login/");
  }, [session, router]);

  useEffect(() => {
    if (!session) return;
    refreshStatus().catch(() => setStatus({ patientId: null, activeVersion: null, deleteAfter: null }));
  }, [session, refreshStatus]);

  const onConsent = pathname.startsWith("/app/consent");
  const consented = status?.activeVersion === HEALTH_NOTICE_VERSION;

  useEffect(() => {
    if (!status) return;
    if (!consented && !onConsent) router.replace("/app/consent/");
    else if (consented && onConsent) router.replace("/app/");
    if (consented) logAppOpen().catch(() => undefined);
  }, [status, consented, onConsent, router]);

  const openLog = useCallback((kind: LogKind = "blood_pressure") => setLog({ open: true, kind }), []);
  const closeLog = useCallback(() => setLog((l) => ({ ...l, open: false })), []);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo<AppContextValue | null>(
    () => (status ? { status, refreshStatus, openLog, version, bump } : null),
    [status, refreshStatus, openLog, version, bump],
  );

  if (session === undefined || status === undefined) {
    return <p className="px-4 py-24 text-center text-silver">Loading…</p>;
  }
  if (session === null || !value) return null;
  if (!consented && !onConsent) return null;

  return (
    <AppProvider value={value}>
      <div className="min-h-screen md:pl-24">
        <TopBar />
        <OfflineBanner />
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:px-6">{children}</div>
        {consented ? <TabBar onLog={() => openLog()} /> : null}
        {consented && status.patientId ? (
          <LogSheet open={log.open} kind={log.kind} patientId={status.patientId} onClose={closeLog} onSaved={bump} />
        ) : null}
      </div>
    </AppProvider>
  );
}
```

- [ ] **Step 10: Verify**

Run: `npm run verify` — green. In the dev server on a 375 px-wide viewport: tap **+** → the sheet slides up with the BP form focused; enter 128 / 82 → **Save** → "Blood pressure 128/82 saved" with an **Elevated** badge; **Done** → the Today card shows 128/82 · Elevated. Try 185/125 → the urgent message appears. Switch to **Sugar**, choose mmol/L, enter 5.8 fasting → saved; Today shows **5.8 mmol/L** (the unit preference was remembered). Escape closes the sheet and focus returns to the + button.

- [ ] **Step 11: Commit**

```bash
git add src/components/app && git commit -m "feat(app): Log sheet with BP, sugar, cholesterol, water and exercise forms"
```

---

### Task 15: Entry point from the patient dashboard + build-plan note

**Files:**
- Modify: `src/app/account/patient/PatientDashboard.tsx:56` (insert before the Profile card)
- Modify: `docs/PLAN.md` (new milestone note before `## 3. Working practices with Claude Code`)

- [ ] **Step 1: Add the card**

In `PatientDashboard.tsx`, directly above `<Card>` … `<h2 className="text-xl">Profile</h2>`, insert:

```tsx
      <Card glow>
        <h2 className="text-xl">Aurora health app</h2>
        <p className="mt-2 text-sm text-silver">
          Log your blood pressure, blood sugar and cholesterol at home, track water and exercise,
          and keep your health record up to date.
        </p>
        <Button href="/app" size="sm" className="mt-4">Open the Aurora app</Button>
      </Card>
```

- [ ] **Step 2: Add the PLAN.md note**

Insert before the line `## 3. Working practices with Claude Code`:

```markdown
### M9 — Aurora health app, slice A (added 2026-09-08)

Source: 31 Aug 2026 meeting (Hannah + Stefan). Spec `docs/superpowers/specs/2026-09-08-health-app-design.md`; Plan 1 `docs/superpowers/plans/2026-09-08-health-app-foundation.md`. The HM-Aurora Supabase project gains a `health` schema — the Aurora Digital Health Platform v0 — with pseudonymous patient IDs, RLS, an append-only access log, an Art. 9 consent gate and pg_cron retention jobs; the site gains a mobile-first app at `/app/` (consent → Today → Log sheet). **PDR §11.1 is amended in Plan 2** to name this schema the single source of truth for clinical data until a dedicated EHR exists.

Done when:
- [ ] `npm run test:rls` proves own-rows-only, consent-gated writes, tamper-proof log, anon locked out
- [ ] Consent → Today → Log flow passes Playwright + axe at 375 px
- [ ] Plan 2 delivered: Trends, Record, More (withdraw/export/access history), PWA manifest + service worker, PDR/notice updates
```

- [ ] **Step 3: Verify and commit**

Run: `npm run verify` — green; the dashboard shows the new card first.

```bash
git add src/app/account/patient/PatientDashboard.tsx docs/PLAN.md && git commit -m "feat(account): link the patient dashboard to the Aurora app; PLAN M9 note"
```

---

### Task 16: End-to-end test and final verification

**Files:**
- Create: `tests/e2e/env.ts`, `tests/e2e/health-app.spec.ts`

- [ ] **Step 1: Env loader (Playwright does not read `.env.local`)**

`tests/e2e/env.ts`:

```ts
import { readFileSync } from "node:fs";

/** Populate process.env from .env.local when running locally. */
export function loadEnvLocal(): void {
  if (process.env.SUPABASE_SERVICE_KEY) return;
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // no env file — the spec skips itself
  }
}
```

- [ ] **Step 2: The spec**

`tests/e2e/health-app.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env";

loadEnvLocal();
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
test.skip(!url || !serviceKey, "needs SUPABASE_SERVICE_KEY to seed a patient");
test.use({ viewport: { width: 375, height: 812 } });

const password = "Test-passw0rd!";
let email = "";
let userId = "";
const admin = () => createClient(url!, serviceKey!, { auth: { persistSession: false } });

test.beforeAll(async () => {
  email = `e2e-health+${Date.now()}@example.com`;
  const { data, error } = await admin().auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: "E2E Patient", dob: "1990-01-01" },
  });
  if (error) throw error;
  userId = data.user.id;
});

test.afterAll(async () => {
  if (userId) await admin().auth.admin.deleteUser(userId); // cascades through health.patients
});

async function signIn(page: Page) {
  await page.goto("/patient-login/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/account/patient/");
}

test("consent gate, then log a blood pressure reading", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/");

  // Consent gate
  await expect(page.getByRole("heading", { name: "Before you start" })).toBeVisible();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });
  await page.getByRole("button", { name: /I agree/ }).click();
  await expect(page.locator("#agree-error")).toHaveText("Tick the box to continue.");
  await page.getByLabel(/I agree to Aurora storing/).check();
  await page.getByRole("button", { name: /I agree/ }).click();

  // Today
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
  await expect(page.getByLabel("Blood pressure")).toContainText("No reading yet.");
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });

  // Log sheet
  await page.getByRole("button", { name: "Log a reading" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Systolic (top)").fill("128");
  await dialog.getByLabel("Diastolic (bottom)").fill("82");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Blood pressure 128/82 saved");
  await expect(dialog.getByText("Elevated")).toBeVisible();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });
  await dialog.getByRole("button", { name: "Done" }).click();

  // Card updated
  const card = page.getByLabel("Blood pressure");
  await expect(card).toContainText("128/82");
  await expect(card).toContainText("Elevated");
});

test("keyboard: Escape closes the sheet and focus returns to the opener", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/");
  const opener = page.getByRole("button", { name: "Log a reading" });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});
```

- [ ] **Step 3: Run the e2e**

Run: `lsof -ti:3000 | xargs kill -9 2>/dev/null; npm run test:e2e -- tests/e2e/health-app.spec.ts`
Expected: 2 passed (the second test reuses the consent from the first because both run in the same worker against the same seeded user; if Playwright parallelises them, set `test.describe.configure({ mode: "serial" })` at the top of the file).

- [ ] **Step 4: Full verification**

```bash
npm run verify && npm run test:rls && npm run test:e2e
```
Expected: verify green; `ALL RLS CHECKS PASSED` + `ALL HEALTH RLS CHECKS PASSED`; every e2e spec green (existing specs still pass — the site chrome is unchanged outside `/app`).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/env.ts tests/e2e/health-app.spec.ts && git commit -m "test(app): e2e consent → Today → Log sheet with axe at 375px"
```

Then hand the branch to superpowers:finishing-a-development-branch (merge to `main` deploys the live site). Run `/security-review` on the branch before merging.
