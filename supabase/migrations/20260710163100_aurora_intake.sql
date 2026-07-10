-- Aurora public-website intake tables (PDR §6.1 flows).
-- Data minimisation (PDR §8.1): each column is justified by its flow's
-- purpose; nothing speculative. NO CLINICAL DATA lives here (PDR §11.1)
-- — these are operational intake records only.
--
-- Access model: RLS enabled with NO policies. The anon/authenticated
-- roles can read/write nothing; only the service-role key used by the
-- Next.js server routes (src/lib/store) reaches these tables.

-- ── Bookings ─────────────────────────────────────────────────────────
create table public.aurora_bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  service text not null,
  location text not null,
  appointment_date date not null,
  time_window text not null check (time_window in ('morning','midday','afternoon')),
  full_name text not null,
  date_of_birth date not null,
  phone text not null,
  email text,
  reason text,
  reminders_opt_in boolean not null default false,
  consent_notice_version text not null,
  consented_at timestamptz not null,
  status text not null default 'new' check (status in ('new','confirmed','completed','cancelled')),
  created_at timestamptz not null default now()
);
comment on table public.aurora_bookings is
  'Appointment booking requests from hmaurora.health. Purpose: arranging care (PDR §6.1). Retention: purge 12 months after appointment completion (privacy notice v1.0).';
comment on column public.aurora_bookings.date_of_birth is 'Justified: safe patient-record matching. Never used for profiling.';
comment on column public.aurora_bookings.consent_notice_version is 'Notice version shown at capture — consent record per PDR §9.1.';

alter table public.aurora_bookings enable row level security;

-- ── Home-visit requests (parallel flow; address justified here only) ─
create table public.aurora_home_visits (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  service text not null,
  address text not null,
  area text not null,
  visit_date date not null,
  time_window text not null check (time_window in ('morning','midday','afternoon')),
  full_name text not null,
  phone text not null,
  mobility_note text,
  consent_notice_version text not null,
  consented_at timestamptz not null,
  status text not null default 'new' check (status in ('new','confirmed','completed','cancelled')),
  created_at timestamptz not null default now()
);
comment on table public.aurora_home_visits is
  'Home-visit requests. Address collected ONLY in this flow — the visit travels to it (PDR §8.1). Retention: purge 12 months after visit completion.';

alter table public.aurora_home_visits enable row level security;

-- ── Contact enquiries ────────────────────────────────────────────────
create table public.aurora_contacts (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  kind text not null check (kind in ('general','partnership','careers','community')),
  full_name text not null,
  email text not null,
  organisation text,
  message text not null,
  consent_notice_version text not null,
  consented_at timestamptz not null,
  status text not null default 'open' check (status in ('open','replied','closed')),
  created_at timestamptz not null default now()
);
comment on table public.aurora_contacts is
  'Contact-form enquiries. Purpose: responding (legitimate interest). Retention: 24 months after closure.';

alter table public.aurora_contacts enable row level security;

-- ── Data-subject rights requests (PDR §9.2 — auditable register) ─────
create table public.aurora_rights_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  requested_right text not null check (
    requested_right in ('access','rectification','erasure','restriction','portability','objection')
  ),
  full_name text not null,
  email text not null,
  details text,
  status text not null default 'open' check (status in ('open','verifying','actioned','refused','closed')),
  due_by date not null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
comment on table public.aurora_rights_requests is
  'Data-subject rights register (GDPR Arts. 15–21). due_by = opened + 1 month; every request must be closed with an outcome. Kept as legally required.';

alter table public.aurora_rights_requests enable row level security;
