# PRD — Aurora Health App (slice A: patient self-monitoring + clinical foundation)

**Project:** H.M. Aurora website (`aurora-website`)
**Date:** 2026-09-08 · **Status:** Draft for review · **Owner:** Stefan (with Hannah Munro, Founder & CEO)
**Source:** HM Aurora meeting, 31 Aug 2026 (Hannah + Stefan) — app feature plan, data rules, retention decision.
**Related:** docs/PDR.md §6.2 (portal), §7 (mobile-first), §8 (privacy by design), §9 (GDPR / Art. 9), §10 (security), §11 (EHR handling), §12 (accessibility); docs/PLAN.md M5; accounts PRD `2026-08-28-accounts-corporate-offering-design.md` (patient auth, profiles, RLS conventions).

> This document is also the technical documentation of the app requirements and API that Stefan agreed to deliver before 17 September.

---

## 1. Summary

Turn the patient account into the first version of the **Aurora health app**: a mobile-first, installable web app (PWA) at `/app/` where a patient, after giving explicit consent, can

1. **log blood pressure, blood sugar and cholesterol** daily at home, plus **water intake** and **exercise sessions**;
2. **see trends** over 7 / 30 / 90 days against reference ranges;
3. keep a structured **health record** — conditions, surgeries, medications, allergies, family history — that Aurora nurses will use as a checklist;
4. **see who has accessed their data**, download it in a standard format, and withdraw consent.

Underneath it, the HM-Aurora Supabase project gains a hardened **`health` schema** — pseudonymous patient IDs, row-level security, audit logging, consent gating and a 12-month online-retention job. This schema is the **Aurora Digital Health Platform v0**: the single source of truth for clinical data until a dedicated EHR exists.

**Slices.** This PRD is slice A. Slice B (nurse/staff console: record checklist, diet and exercise plans, lab results, treatment-relationship access) and slice C (QR-code digital business card and links page) are separate specs. Slice A designs the tables slice B needs but builds none of its UI.

## 2. Goals and success criteria

A build satisfies this PRD when:

- A signed-in patient who has **not** consented sees only the consent screen; after consenting they can log readings, water and exercise from a phone in under 30 seconds per entry.
- Today, Trends, Record and More screens work at 375 px wide, pass axe, and are keyboard-operable; the app installs to an iPhone and Android home screen and opens in standalone mode.
- **RLS is proven:** a patient reads and writes only their own `health` rows; the anonymous key sees nothing in `health`; no writes succeed without an active consent; every write and every app-open produces an `access_log` row the patient cannot alter.
- Readings older than 12 months are moved out of the live tables by a scheduled job; withdrawing consent stops writes immediately and deletes the patient's health data after 30 days unless they re-consent.
- "Download my data" produces a valid FHIR R4 Bundle.
- `npm run verify` stays green and the static export still deploys to GitHub Pages.

## 3. Decisions

| # | Decision | Choice |
|---|---|---|
| D1 | Where clinical data lives | **HM-Aurora Supabase, hardened** — a separate `health` schema; PDR §11.1 amended to name it the Aurora Digital Health Platform v0 |
| D2 | First slice | **Patient app + clinical foundation**; nurse console is slice B |
| D3 | Plans and labs | **Self-logging now, staff-assigned later** — patient sets a water goal and logs exercise; diet/exercise plans and lab results are staff-authored and arrive with slice B (tables designed now) |
| D4 | Form factor | **PWA inside the site** at `/app/` — app shell with bottom tabs, installable, offline shell only |
| D5 | Display units | **mg/dL** default for glucose and cholesterol, switchable to mmol/L per patient; stored canonically in mg/dL |
| D6 | Blood pressure entry | Systolic + diastolic, **optional pulse** |
| D7 | Water goal | Default **2,000 ml/day**, patient-set |
| D8 | Audit granularity | Every **write** logged; **one `app_open` event per browser session** (who, when, from where); individual self-reads not logged; staff reads (slice B) logged per record |
| D9 | Consent withdrawal | **Stop immediately, export offered first, delete after a 30-day grace period**; re-consenting within the window cancels deletion |
| D10 | 12-month retention | Rows older than 12 months move to `*_archive` tables invisible to the app; staff export to offline storage is slice B plus an SOP |
| D11 | Charts | **Hand-rolled SVG** with text summary and table view; no charting library |
| D12 | Data export | **FHIR R4 Bundle (JSON)** in slice A |
| D13 | Offline logging | **Deferred** — offline shows a banner and disables saving; a queued-sync follow-up is listed in §17 |

## 4. Architecture

- **Hosting unchanged:** static Next.js export on GitHub Pages; the app is client-rendered under `/app/` and uses the existing browser Supabase client (`src/lib/supabase/client.ts`) and the existing patient login (email/password or Google).
- **`health` schema, exposed to the API.** All clinical tables, functions and triggers live in `health`, not `public`. The schema is added to PostgREST's exposed schemas (Management API `PATCH /v1/projects/{ref}/postgrest`, `db_schema`), and the client addresses it with `getSupabase().schema("health")`. `anon` gets **no grants** on the schema; `authenticated` gets table grants that RLS then narrows to own rows; function `EXECUTE` is revoked from `public`/`anon` and granted to `authenticated` only.
- **Pseudonymisation (PDR §8.1).** `health.patients` maps `auth.users.id → patient_id`. Every clinical table references `patient_id` only. Names, emails and dates of birth stay in `public.profiles`; a reading row on its own identifies nobody.
- **Security boundary is Postgres.** Client route guards are UX only. RLS, `security definer` functions and triggers enforce ownership, consent and logging regardless of the UI.
- **Nothing clinical is cached.** The service worker caches the app shell and static assets only; every request to the Supabase URL is network-only.

## 5. Consent gate (GDPR Art. 9(2)(a))

Health data is special-category data. Slice A relies on **explicit consent**, captured once per notice version, before any clinical row exists.

- **Screen `/app/consent/`** (plain language, readability grade ~8) states, in seven short sections: **what is stored** (readings, water and exercise entries, health-record entries); **why** (your own monitoring; care by Aurora nurses; diet and exercise planning); **where it is kept** (Aurora's database, running on Supabase in Brazil — naming the processor and the location satisfies Art. 13(1)(f) — encrypted, filed under a code rather than a name); **who can see it** (you; in future, Aurora staff on your care team, with every access logged); **how long** (12 months online, then archived; deleted 30 days after you withdraw); **if you say no** (the account and booking still work, no health data is held, and you can turn it on later); and **your choice** (download, delete or withdraw from More at any time — and, per Art. 7(3), withdrawal stops further use but does not undo lawful processing already carried out). One checkbox, one button: "I agree — open the app".
- **Content** lives in `src/content/health-notice.ts` with `HEALTH_NOTICE_VERSION = "1.0-2026-09-08"` and a `scope` object (`{readings, lifestyle, record}` — an object, not an array; the `consents.scope` column CHECKs `jsonb_typeof(scope) = 'object'`). This is separate from the site-wide `NOTICE_VERSION` in `src/lib/consent.ts`; the site privacy notice gains a matching "Health data in the Aurora app" section (§13).
- **Storage:** RPC `health.grant_consent(notice_version, scope)` atomically creates the `patients` row if missing, inserts a `consents` row, creates default `settings`, and logs the event.
- **Enforcement:** every write policy includes `health.has_active_consent(patient_id)`. With no active consent, inserts and updates fail at the database.
- **Re-consent:** when `HEALTH_NOTICE_VERSION` is newer than the patient's active consent version, the app shows the consent screen again before any clinical screen.

## 6. Data model — `health` schema (all tables RLS-enabled)

```sql
-- identity mapping (pseudonymisation)
patients        (patient_id uuid pk default gen_random_uuid(),
                 user_id uuid unique not null references auth.users on delete cascade,
                 created_at timestamptz default now())

consents        (id, patient_id fk cascade, notice_version text, scope jsonb,
                 granted_at timestamptz default now(), withdrawn_at timestamptz null,
                 delete_after timestamptz null)            -- set on withdrawal (= withdrawn_at + 30 days)

settings        (patient_id pk fk cascade,
                 glucose_unit text default 'mg/dL' check in ('mg/dL','mmol/L'),
                 cholesterol_unit text default 'mg/dL' check in ('mg/dL','mmol/L'),
                 water_goal_ml int default 2000 check between 500 and 6000,
                 updated_at timestamptz)

readings        (id uuid pk, patient_id fk cascade,
                 kind text check in ('blood_pressure','glucose','cholesterol'),
                 recorded_at timestamptz not null,
                 systolic int, diastolic int, pulse int,                 -- blood_pressure
                 glucose_mgdl numeric(6,1), glucose_context text,        -- glucose: fasting|after_meal|random|bedtime
                 chol_total_mgdl numeric(6,1), chol_ldl_mgdl numeric(6,1),
                 chol_hdl_mgdl numeric(6,1), chol_trig_mgdl numeric(6,1),-- cholesterol (total required)
                 entered_unit text,                                      -- unit the patient typed in
                 note text check (length(note) <= 300),
                 created_at timestamptz default now())
  -- CHECK per kind: exactly that kind's columns are non-null (e.g. blood_pressure ⇒ systolic & diastolic
  -- not null, glucose/cholesterol columns null). Plausibility CHECKs mirror §11.

water_intake    (id, patient_id fk cascade, ml int check between 50 and 3000, recorded_at, created_at)
exercise_sessions (id, patient_id fk cascade,
                 activity text check in ('walk','run','cycle','swim','strength','rehab','other'),
                 minutes int check between 1 and 600,
                 intensity text null check in ('light','moderate','vigorous'),
                 note text, recorded_at, created_at)

profile_entries (id, patient_id fk cascade,
                 category text check in ('condition','surgery','medication','allergy','family_history'),
                 label text not null check (length between 1 and 120),
                 detail text check (length <= 500),
                 occurred_on date null, is_current boolean default true,
                 created_at, updated_at)

access_log      (id bigserial pk, at timestamptz default now(),
                 actor_user_id uuid, actor_role text,                    -- 'patient' | 'staff' | 'system'
                 patient_id uuid,                                        -- NOT an FK: survives deletion
                 action text,      -- app_open | insert | update | delete | export | consent_granted |
                                   -- consent_withdrawn | archive | purge | read (slice B, staff)
                 resource text, resource_id uuid null,
                 ip inet null, user_agent text null)

readings_archive, water_intake_archive, exercise_sessions_archive
                -- same columns as the live table + archived_at timestamptz; RLS on, NO client policies
```

**Designed now, built in slice B** (no DDL in slice A):
`care_team (patient_id, staff_user_id, role, granted_at, revoked_at)` · `plans (patient_id, kind diet|exercise, body jsonb, authored_by, valid_from, valid_to)` · `lab_results (patient_id, taken_on, panel, values jsonb, file_path, uploaded_by)`.

**Retention:** readings, water and exercise rows are archived at 12 months (D10). Profile entries are current-state records and are not archived. `access_log` is retained until Aurora's retention SOP sets a purge schedule (audit logs are typically kept for years; not a slice A decision).

## 7. Access control and audit

**Helper functions** (`stable`, `security definer`, `set search_path = health, public`):
- `health.current_patient_id()` → the caller's `patient_id` or null.
- `health.has_active_consent(pid uuid)` → exists a `consents` row for `pid` with `withdrawn_at is null`.
- `health.request_ip()` / `health.request_user_agent()` → read PostgREST's `request.headers` (`cf-connecting-ip`, else the last `x-forwarded-for` hop, else `x-real-ip` — a client cannot forge its own audit IP; `user-agent`).

**RLS policies (authenticated role only; nothing for anon):**
- `patients`: select own (`user_id = auth.uid()`); insert only via `grant_consent`.
- `consents`, `settings`: select own; `settings` update own (with active consent); `consents` writes only via RPCs.
- `readings`, `water_intake`, `exercise_sessions`, `profile_entries`: select / insert / update / delete own, where `patient_id = health.current_patient_id()`; insert and update additionally require `health.has_active_consent(patient_id)`.
- `access_log`: select own (`patient_id = health.current_patient_id()`); **no** insert / update / delete policies — rows are written only by `security definer` triggers and functions.
- `*_archive`: no policies. Only the service role (dashboard / slice B export) can read them.

**Audit writers:**
- Trigger `health.log_change()` (after insert / update / delete on readings, water_intake, exercise_sessions, profile_entries, settings) inserts an `access_log` row: actor `auth.uid()`, role `patient`, action = the operation, resource = table name, resource_id, ip, user agent.
- RPC `health.log_app_open()` — the app shell calls it once per browser session (a per-patient sessionStorage flag, set only after the write lands, so an offline open retries rather than losing the row). This is the "who, when, from where" record for the session (D8). The database additionally refuses a second `app_open` for the same patient within two minutes — a backstop against a broken client flooding the log, narrow enough that a genuine second session or a second device still records.
- RPCs `grant_consent`, `withdraw_consent`, `delete_my_health_data`, `log_export()` each write their own row.

**Patient-facing view:** More → "Who has accessed my data" lists `access_log` rows newest first: date/time, who ("You" for own actions; staff name and role in slice B), what, device (user agent, shortened) and IP.

**Slice B hook:** staff access will go through logged RPCs guarded by `care_team` membership — never a blanket staff SELECT policy on clinical tables.

## 8. Retention, withdrawal and deletion

- **Archive job** — `health.archive_old()` moves live rows with `recorded_at < now() - interval '12 months'` into the matching `*_archive` table (`delete … returning` + `insert`), logs `{action: 'archive', actor_role: 'system'}` per patient touched. Scheduled with `pg_cron`: `0 3 1 * *` (03:00 UTC on the 1st). The app never queries archive tables; older data is available through a rights request until slice B's staff export exists.
- **Withdraw consent** — RPC `health.withdraw_consent()` sets `withdrawn_at = now()` and `delete_after = now() + interval '30 days'` on the active consent and logs it. Writes stop at once (policies). The app first offers "Download my data", then confirms, then returns the patient to a "tracking stopped" state with a "Resume" button (which calls `grant_consent` again and cancels the deletion).
- **Purge job** — `health.purge_withdrawn()` runs daily (`15 3 * * *`): for each patient with no active consent whose latest `delete_after < now()`, deletes all live and archive rows and the `patients` row, and logs `purge`. The `access_log` keeps the pseudonymous `patient_id` (no FK) so the audit trail survives.
- **Delete now** — RPC `health.delete_my_health_data()` does the purge immediately for the caller (after an in-app confirmation and the same download offer).
- **Account deletion** (existing rights-request flow) cascades from `auth.users` → `patients` → all health rows.

## 9. The app — `/app/` (PWA)

### 9.1 Shell
- **Layout** `src/app/app/layout.tsx`: no marketing nav or footer. Top bar: Aurora mark, screen title, avatar (initials now; the avatar spec plugs in later). Bottom tab bar (`nav`, `aria-current`): **Today · Trends · [+ Log] · Record · More**; the centre button opens the Log sheet. Safe-area padding (`env(safe-area-inset-bottom)`), 44 px targets. From `md` up the tabs become a left rail and content is capped at 720 px.
- **Guards:** no session → `/patient-login/` (existing `RequireAuth` pattern; raw paths, never `asset()` in router calls); session but no active consent (or an older notice version) → `/app/consent/`.
- **Session start:** call `health.log_app_open()` once per browser session.
- **Offline:** `navigator.onLine` + `online`/`offline` events show a banner ("You're offline — readings can't be saved until you reconnect") and disable Save.
- **Install:** `src/app/manifest.ts` (Next metadata route, prerendered at `/manifest.webmanifest`) with `name` "Aurora Health", `short_name` "Aurora", `start_url` `${basePath}/app/`, `display: standalone`, `theme_color`/`background_color` `#060B22`, 192/512 px + maskable icons at `public/app-icons/` derived from the commissioned logo mark on navy; `apple-touch-icon` and `viewport-fit=cover` in the app layout's metadata. More → "Add to home screen" shows platform instructions (Android: `beforeinstallprompt` button; iOS: Share → Add to Home Screen).
- **Service worker** `public/sw.js`, registered from the app layout with scope `${basePath}/`: precaches the app-shell routes and `_next/static` assets; cache-first for static assets, network-first for shell HTML; **any request whose URL starts with the Supabase URL is passed through untouched and never cached**; `skipWaiting` + `clients.claim` so updates apply on next open.
- **Motion and a11y:** `prefers-reduced-motion` respected; focus moves to the screen heading on tab change; skip link to content.

### 9.2 Screens
- **Today** (`/app/`): greeting; three metric cards (latest blood pressure, blood sugar with context, cholesterol) each with value, unit, time since, and a reference-band badge; water card with progress bar vs goal and +250 / +500 ml buttons; exercise-this-week line (minutes and sessions). Empty state: "Log your first reading" → opens the Log sheet.
- **Log sheet** (component, `role="dialog"`, focus-trapped): metric chips **BP · Sugar · Cholesterol · Water · Exercise**; large numeric inputs; "When" defaults to now and allows backdating up to 30 days (never future); optional note (≤300 chars); Save. After saving: optimistic update, "Saved" status, and the band badge for the new reading (an urgent band shows the urgent message from §10).
  - BP: systolic, diastolic, optional pulse.
  - Sugar: value, unit toggle (mg/dL ⇄ mmol/L, remembered in settings), context (fasting / after meal / random / bedtime).
  - Cholesterol: total (required) + optional LDL, HDL, triglycerides; unit toggle.
  - Water: quick amounts + custom ml.
  - Exercise: activity, minutes, optional intensity, note.
- **Trends** (`/app/trends/`): metric selector (BP · Sugar · Cholesterol · Water); window 7 / 30 / 90 days; SVG chart (line for readings; daily bars for water with the goal line); reference-band shading and threshold labels; summary tiles (average, lowest, highest, count); "View as table" toggle rendering the same data as an accessible table; per-row delete. Empty state per metric.
- **Record** (`/app/record/`): five sections — Conditions, Surgeries, Medications, Allergies, Family history — each a list with Add (inline form: label, optional detail, optional date, "current" toggle for conditions and medications), Edit, Delete. Empty state: "Nothing recorded yet. Add anything your nurse should know."
- **More** (`/app/more/`): Consent and privacy (notice text, version, date; **Stop tracking and delete my health data**); **Who has accessed my data** (`/app/more/access/`); **Download my data** (FHIR JSON, §12); **Units and goals** (glucose unit, cholesterol unit, water goal); Add to home screen; Account (→ `/account/patient/`); Sign out.
- **Consent** (`/app/consent/`): §5.

### 9.3 Entry points
- Patient dashboard (`/account/patient/`) gets an "Open the Aurora app" card (first card). The NavBar Account chip is unchanged.

## 10. Reference ranges (informational)

`src/content/health-ranges.ts` — thresholds, band labels, tones and the source for each metric, with `reviewedBy` / `reviewedOn` fields **for Aurora's clinicians to complete before launch**. Bands are informational: every badge carries "Reference ranges are general guidance, not a diagnosis. Talk to your care team." Initial values:

| Metric | Bands (mg/dL; BP in mmHg) | Source |
|---|---|---|
| Blood pressure | Normal <120 and <80 · Elevated 120–129 and <80 · High stage 1 130–139 or 80–89 · High stage 2 ≥140 or ≥90 · **Urgent** >180 and/or >120 | AHA/ACC 2017 |
| Glucose, fasting | Normal <100 · Slightly high 100–125 · High ≥126 · **Urgent** <70 or ≥300 | ADA |
| Glucose, after meal / random / bedtime | Normal <140 · Slightly high 140–199 · High ≥200 · **Urgent** <70 or ≥300 | ADA |
| Total cholesterol | Desirable <200 · Borderline 200–239 · High ≥240 | NCEP ATP III |
| LDL | Optimal <100 · Near optimal 100–129 · Borderline 130–159 · High 160–189 · Very high ≥190 | NCEP ATP III |
| HDL | Low <40 · Protective ≥60 | NCEP ATP III |
| Triglycerides | Normal <150 · Borderline 150–199 · High 200–499 · Very high ≥500 | NCEP ATP III |

**Urgent messages** (drafted here, not clinically approved — see §18 item 1; all three live in `src/content/health-ranges.ts` and can be edited without a code change): "This reading is very high. If you have chest pain, shortness of breath, weakness, vision changes or trouble speaking, seek emergency care now. Otherwise rest for five minutes, measure again, and contact your care team today." (Low glucose variant: "…take fast-acting sugar now and re-test in 15 minutes…"). No AI decision support (PDR §14) — fixed thresholds only.

## 11. Validation (client zod + database CHECK)

`src/lib/validation/health.ts` — `bpReadingSchema`, `glucoseReadingSchema`, `cholesterolReadingSchema`, `waterSchema`, `exerciseSchema`, `profileEntrySchema`, `healthConsentSchema`. Plausibility ranges (mirrored as CHECK constraints): systolic 60–260, diastolic 30–160, pulse 25–250, glucose 20–600 mg/dL, total cholesterol 20–1,000, LDL 5–1,000, HDL 5–300, triglycerides 10–5,000 mg/dL (lab panels legitimately report the extremes), water 50–3,000 ml per entry, exercise 1–600 min. `recorded_at` ≤ now and ≥ now − 30 days. **Where each bound lives:** the database enforces only "not in the future" (+5 min clock skew); the 30-day backdating floor is client-side, so editing the note on an older row never fails a constraint. The client's future tolerance is 2 minutes — deliberately inside the database's 5, so a fast browser clock produces a readable message rather than a raw constraint violation. Unit conversion in `src/lib/health/units.ts`: glucose ×18.016, cholesterol ×38.67, triglycerides ×88.57 (mmol/L → mg/dL), rounded to 1 decimal; the entered unit is recorded.

## 12. Data export — FHIR R4

`src/lib/health/fhir-export.ts` builds a `Bundle` (`type: "collection"`) from the patient's live rows; the app downloads it as `aurora-health-data-YYYY-MM-DD.json` and calls `health.log_export()`.

| Source | FHIR resource | Coding |
|---|---|---|
| Blood pressure | `Observation` 85354-9 with components 8480-6 (systolic) and 8462-4 (diastolic), unit `mm[Hg]`; pulse as `Observation` 8867-4 `/min` | LOINC |
| Glucose | `Observation` 2339-0, `mg/dL`; context in `note` | LOINC |
| Cholesterol | `Observation` 2093-3 total, 2089-1 LDL, 2085-9 HDL, 2571-8 triglycerides, `mg/dL` | LOINC |
| Water, exercise | `Observation` with `code.text` "Water intake" / "Exercise session" and `valueQuantity` (ml / min) | text-coded |
| Conditions · surgeries · medications · allergies · family history | `Condition` · `Procedure` · `MedicationStatement` · `AllergyIntolerance` · `FamilyMemberHistory`, text-coded | text-coded |

`subject` is a `Patient` reference to the pseudonymous `patient_id`; the file carries the patient's name from `profiles` in a `Patient` bundle entry (not a `contained` resource — an entry is what makes the `Patient/{id}` references resolve) so the download is meaningful on its own. Unit tests assert resource types, codes and units.

## 13. Privacy, security and DPIA input

| PDR | How slice A meets it |
|---|---|
| §8.1 minimisation | Only the fields the meeting named; optional fields marked; no `health` rows until consent; no free-text beyond notes and record details |
| §8.1 most-private defaults | No sharing, no reminders, no staff access in slice A; consent off until given |
| §8.1 pseudonymisation | `patient_id` mapping; clinical tables carry no identifiers |
| §9.1 lawful basis | Art. 6(1)(a) + Art. 9(2)(a) explicit, versioned consent; withdrawal one tap |
| §9.2 rights | Self-service export (FHIR) and deletion; rights-request form unchanged |
| §10.1 controls | Supabase AES-256 at rest + TLS; RLS least privilege; unique IDs; existing session handling; MFA still offered-not-required for patients |
| §10.2 monitoring | `access_log` tamper-resistant (no client write/update/delete); patient-visible |
| §11.3 auditability | Writes, app-open, export, consent and purge events logged with who/what/when/from where |
| §11.4 lifecycle | 12-month archive job; 30-day withdrawal grace; cascade on account deletion |
| §11.5 portability | FHIR R4 Bundle |
| §12 accessibility | axe-clean screens, text summaries and tables for charts, 44 px targets, reduced motion |

**DPIA input (PDR §8.2 — a DPIA is mandatory for this slice; Aurora signs it off):**

| Data | Purpose | Basis | Main risk | Mitigation |
|---|---|---|---|---|
| BP, glucose, cholesterol readings | Self-monitoring; future nurse care | Art. 6(1)(a) + 9(2)(a) | Unauthorised access / disclosure | RLS own-rows, pseudonymous IDs, no caching, audit log, encryption at rest |
| Water and exercise entries | Lifestyle tracking | same | Low sensitivity; profiling | Same controls; no analytics on this data |
| Health-record entries (conditions, meds, allergies, family history) | Nursing checklist | same | High-impact disclosure | Same controls; entries are patient-authored and editable |
| Access log (incl. IP, user agent) | Accountability (PDR §11.3) | Art. 6(1)(c)/(f) | Secondary personal data | Patient-visible; retention set by SOP; no client writes |
| Consent records | Proof of consent (Art. 7) | Art. 6(1)(c) | — | Versioned; withdrawal recorded |

**Documents to update in the same change:** `docs/PDR.md` §11.1 (add: "Until a dedicated EHR exists, the HM-Aurora Supabase `health` schema is the Aurora Digital Health Platform v0 and the single source of truth for clinical data; the website's `public` schema stores none. The FHIR boundary is kept through the export format and the schema separation."); the Privacy Centre notice (new "Health data in the Aurora app" section, version bump to 1.1); `docs/PLAN.md` (new milestone M9 — Aurora health app, slice A).

**Follow-ups (not slice A):** column-level encryption (pgsodium) for readings and record entries; offline logging queue; patient MFA; staff console (slice B); reminders (would need a new consent scope); **automatic EXECUTE revocation for new `health` functions** — every function is explicitly revoked from `public, anon` today and a security review confirmed no gap, but that pattern is manual: `alter default privileges` demonstrably did not cover a function created later in the same migration, so the next `security definer` function added here could ship callable by anyone unless someone remembers the revoke. An event trigger on `ddl_command_end`, or an assertion in the RLS proof script, would make it structural.

## 14. Pages, routes and files

**New routes:** `/app/`, `/app/trends/`, `/app/record/`, `/app/more/`, `/app/more/access/`, `/app/consent/`, `/manifest.webmanifest`.

**Created**
- `supabase/migrations/20260908*_health_schema.sql` (schema, tables, CHECKs, grants), `…_health_rls.sql` (helpers, policies), `…_health_audit.sql` (log trigger + RPCs), `…_health_retention.sql` (archive tables, jobs, `pg_cron`).
- `src/lib/health/client.ts` (typed queries via `getSupabase().schema("health")`), `units.ts`, `stats.ts` (window stats), `fhir-export.ts`, `consent.ts` (active-consent check + version comparison).
- `src/lib/validation/health.ts`.
- `src/content/health-ranges.ts`, `src/content/health-notice.ts`.
- `src/app/app/layout.tsx`, `page.tsx`, `trends/page.tsx`, `record/page.tsx`, `more/page.tsx`, `more/access/page.tsx`, `consent/page.tsx`; `src/app/manifest.ts`; `public/sw.js`; `public/app-icons/*`.
- `src/components/app/` — `AppShell`, `TopBar`, `TabBar`, `OfflineBanner`, `MetricCard`, `RangeBadge`, `WaterCard`, `LogSheet` + per-metric forms, `TrendChart`, `StatTiles`, `DataTable`, `ProfileSection`, `AccessLogList`, `InstallHint`.

**Modified**
- `src/app/account/patient/PatientDashboard.tsx` — "Open the Aurora app" card.
- `src/app/privacy-centre/notice/*` — health-data section; `src/lib/consent.ts` — `NOTICE_VERSION` bump.
- `docs/PDR.md`, `docs/PLAN.md`.
- `tests/rls/` — new `health.mjs`; `package.json` — `test:rls` runs both scripts.

## 15. Testing

- **Unit (vitest):** unit conversion round-trips; band assignment at every threshold edge (incl. urgent); window stats; FHIR bundle shape, codes and units; consent-version comparison; zod schemas accept valid and reject out-of-range / future / >30-day-old timestamps.
- **RLS proof (`tests/rls/health.mjs`, service key, two seeded users):** anon sees nothing in `health`; user A without consent cannot insert; after `grant_consent` A can insert/select/update/delete own rows; B cannot read or write A's rows; A cannot insert into, update or delete from `access_log`; A's writes and `log_app_open` produce `access_log` rows A can read; `withdraw_consent` blocks further inserts; `delete_my_health_data` removes every row and leaves the log; archive tables are unreadable by A.
- **e2e (Playwright + axe, iPhone-size viewport; skipped when `SUPABASE_SERVICE_KEY` is absent):** seed a user, sign in through the form, consent screen renders and is axe-clean, consent → Today; log a BP reading through the sheet → card updates with a band; Trends shows the reading and the table view; Record add/edit/delete; More → access history lists the app-open and insert events; export triggers a download; withdraw flow reaches the stopped state. Keyboard-only pass on Log sheet and tab bar.
- **Manual smoke:** install on iPhone (Safari) and Android (Chrome); confirm standalone launch, sign-in inside the installed app (note: iOS standalone storage is separate from Safari — sign in again inside the app; verify the Google flow returns to the app, otherwise document email/password as the in-app sign-in), offline banner, Lighthouse PWA installable.
- `npm run verify` green; static export deploys.

## 16. Delivery

Branch `feat/health-app`; subagent-driven plan. Migrations applied to the live HM-Aurora project through the Management API query endpoint (as before); PostgREST exposed-schema update and `pg_cron` enablement are explicit plan steps. Run `/security-review` on the branch before merging to `main` (merge = live deploy). After the spec is approved, publish it as a shareable page for Hannah.

## 17. Out of scope (slice A)

Nurse/staff console and any staff access · diet/exercise plans and lab results (staff-authored, slice B) · reminders/notifications · offline queued logging · native app · column-level encryption · caregiver/family access · children's records · analytics on health data.

## 18. Open items — inputs required from Aurora

1. Clinician review of the reference thresholds and urgent-message wording (§10) before launch. Three specifics to decide:
   - **Low blood pressure has no band.** A reading of 85/45 currently shows "Normal" in green. §10's AHA table has no hypotension row; if Aurora wants one, give the threshold and the wording.
   - **The high-glucose urgent message is drafted by us**, not taken from a source (the low-glucose and blood-pressure texts follow standard advice). Approve or replace it.
   - **LDL, HDL and triglyceride bands ship unused in slice A** — nothing displays them until the Trends detail view in slice B — so they reach patients only after this review.
2. Confirm mg/dL as the default unit for Guyana meters (D5).
3. Approve the consent text (§5) and the privacy-notice section (§13). A data-protection review of the drafted text raised three additions to consider: naming the processor and hosting location (the text says only "in the cloud"; the data sits in Supabase, which is an Art. 13(1)(f) transfer point), stating that withdrawal does not affect processing already carried out lawfully (Art. 7(3)), and saying what happens if the patient declines. The "Why" paragraph is also the one sentence in the notice above the plain-language target and should be split in three.
4. DPIA sign-off (§13).
5. Confirm the 30-day withdrawal grace period (D9) and that 12-month online retention applies to water and exercise entries too (D10).
6. Access-log retention period (SOP).
7. A mono/mark logo variant for the app icon, if one exists (otherwise the mark is cut from the commissioned logo).
