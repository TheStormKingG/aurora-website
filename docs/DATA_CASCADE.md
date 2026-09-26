# Data cascade — what happens to each record when a person is deleted

Derived from `supabase/migrations/` on 2026-09-23 and **asserted by
`tests/rls/cascade.mjs`**, which runs the whole path against the live
database and fails if anything identifying survives an account deletion.

The test is the point. A cascade map that exists only as a document is
true on the day it is written and silently wrong after the next
migration — the migration passes, the document still reads plausibly,
and personal data quietly outlives the account it belonged to. Run:

```bash
npm run test:rls
```

## Two deletion paths, and they are not the same

| Path | Trigger | Covers |
|---|---|---|
| **Health-data deletion** | patient taps *Delete my health data*, or `purge_withdrawn()` 30 days after withdrawal | `health.*` only |
| **Account deletion** | `auth.users` row removed | everything keyed to `auth.users`, then `health.*` via `patients.user_id` |

A patient who deletes only their health data still has an account,
bookings and a profile. This is intended — withdrawing consent to
health tracking is not closing the account — but it means neither path
alone is "delete everything", and the privacy notice should not imply
it does.

## The map

### Cascades correctly — verified

| Table | Link | On delete | Outcome |
|---|---|---|---|
| `health.patients` | `user_id` → `auth.users` | `cascade` | removed |
| `health.consents` | `patient_id` → `patients` | `cascade` | removed |
| `health.settings` | `patient_id` → `patients` | `cascade` | removed |
| `health.readings` | `patient_id` → `patients` | `cascade` | removed |
| `health.water_intake` | `patient_id` → `patients` | `cascade` | removed |
| `health.exercise_sessions` | `patient_id` → `patients` | `cascade` | removed |
| `health.profile_entries` | `patient_id` → `patients` | `cascade` | removed |
| `health.*_archive` ×3 | no FK — by design | `patients_purge_archives` before-delete trigger | removed |
| `public.profiles` | `id` → `auth.users` | `cascade` | removed |
| `public.account_consents` | `user_id` → `auth.users` | `cascade` | removed |

### Survives deliberately

| Table | Why | Safe because |
|---|---|---|
| `health.access_log` | Art. 17(3)(b) — the obligation to keep an access trail | `patient_id` is pseudonymous and deliberately **not** a foreign key; once `patients` is gone the id resolves to nobody |

`cascade.mjs` asserts this one **positively**. If a later migration ever
cascades the log away, that is a compliance regression in the other
direction and nothing else would notice.

### 🔴 Does NOT cascade — open defects

| Table | Holds | Link | Problem |
|---|---|---|---|
| `public.aurora_bookings` | `full_name`, `phone`, `email` | `user_id` → `auth.users` **`on delete set null`** | Row survives the deletion **and loses the only handle that could find it again** |
| `public.aurora_contacts` | `full_name`, `email` | none | Never linked to an account; survives indefinitely |
| `public.aurora_home_visits` | `full_name`, `phone`, address | none | As above — and this is the only flow that collects an address |
| `public.aurora_rights_requests` | `full_name`, `email` | none | As above. A record of someone exercising their rights outlives the account |

`on delete set null` is the sharper of the two problems. A row with no
link is at least findable by email; a row whose link was *nulled* on the
way out is not, so the damage compounds with time.

The three unlinked tables are unlinked for a real reason — anyone can
book or enquire without an account, so a `not null` FK would break
anonymous intake. The fix is therefore retention plus an erasure lookup,
not a foreign key.

## Retention — documented, not implemented

Three retention periods are stated in `COMMENT` strings on the intake
tables and in privacy notice v1.0:

| Table | Stated retention | Implemented? |
|---|---|---|
| `aurora_bookings` | purge 12 months after appointment completion | ❌ no job |
| `aurora_home_visits` | purge 12 months after visit completion | ❌ no job |
| `aurora_rights_requests` | 24 months after closure | ❌ no job |
| `health.*` (12-month archive) | `archive_old()` | ✅ `health-archive-old`, monthly |
| `health.*` (withdrawal purge) | `purge_withdrawn()` | ✅ `health-purge-withdrawn`, daily |

Only two cron jobs exist, both in `health`. The intake tables have
carried a written retention policy since July that nothing enforces —
which is a policy the organisation can be held to and cannot
demonstrate. A documented practice with no mechanism is a preference,
not a process.

Fix drafted in
`supabase/migrations/20260923120000_intake_retention_and_erasure.sql` —
**not applied**; it deletes production rows and needs a deliberate
decision, not a default.

## Response deadlines — and a common conflation

| Obligation | Deadline | Source |
|---|---|---|
| Respond to an erasure / access request | **one month**, extendable by two | GDPR Art. 12(3) |
| Notify the supervisory authority of a breach | **72 hours** | GDPR Art. 33 |

These are different obligations with different clocks. PDR §180 and
§187 already state both correctly. The 72-hour figure is frequently
quoted as if it were the deletion deadline — it is not, and adopting it
as one would replace a correct commitment with a wrong one.
