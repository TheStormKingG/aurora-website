# PRD — Accounts & Corporate Offering (v1)

**Project:** H.M. Aurora website (`aurora-website`)
**Date:** 2026-08-28 · **Status:** Draft for review · **Owner:** Stefan (with Hannah Munro, Founder & CEO)
**Related:** docs/PDR.md §5 (IA), §6.1/§6.2 (functional), §8 (privacy by design), §9 (GDPR), §10 (security), §11 (EHR boundary); docs/PLAN.md M5

---

## 1. Summary

Add real user accounts and a corporate commercial offering to the Aurora website:

1. **Patient registration & account** — an individual can create a real, credentialed account (not just submit a form), verify their email, sign in, and manage their profile, consents, and their own appointment bookings.
2. **Corporate registration & account** — an employer can create an organisation account, browse priced workforce-health packages, and submit a **request to activate** a package; Aurora reviews and invoices offline.
3. **Individual package purchase (request/arrange)** — individuals can also select a priced personal package and submit a request; Aurora arranges payment.
4. **Corporate packages catalogue** — a defined set of employer-wellness packages with a **standard individual price** and **corporate pricing tiered by employee headcount**.
5. **Simple staff console** — an Aurora-staff-only view to move activation requests from *pending* to *activated*.

This PRD delivers the **identity + commercial layer only**. It deliberately does **not** build the clinical patient portal (viewing health records via FHIR) — per PDR §11 the website stores no clinical data, and that portal is a later, dynamic-host phase. The patient account created here is the login that will later unlock that portal.

## 2. Goals & success criteria

A build satisfies this PRD when:

- A patient can **register → verify email → sign in**, then view/edit their profile, manage consents, **see their own bookings**, and **delete their account** — all self-service.
- A corporate user can **register an organisation → sign in → browse packages with pricing → submit an activation request** and see its status change.
- An individual can **submit a package request** (request/arrange flow); the request is recorded and receipted.
- An Aurora staff member (MFA-protected) can **sign in to the staff console** and move a request *pending → activated*; the corporate account sees the new status.
- **RLS is proven**: a user cannot read another user's profile, bookings, organisation, or requests; the anonymous key can read nothing; no user can self-elevate to staff.
- `npm run verify` stays green and the site still deploys as a static export to GitHub Pages.

## 3. Decisions (settled during brainstorming)

| # | Decision | Choice |
|---|---|---|
| D1 | Corporate account meaning | **Employer wellness** — companies buy health packages for their staff |
| D2 | Corporate acquire-flow | **Hybrid** — self-serve select package online → "request activation" → Aurora reviews & invoices offline; online payment later |
| D3 | Individual acquire-flow | **Request / arrange** — prices shown, no online checkout in v1; Aurora arranges payment |
| D4 | Patient ↔ corporate linkage | **Independent in v1** — patient and corporate registration are separate; employee↔package linkage is a later phase (schema future-proofed) |
| D5 | Architecture | **Supabase Auth, client-side, on the existing static GitHub Pages deploy** |
| D6 | Packages storage / pricing | Typed **content file** (`src/content/packages.ts`); **priced** — standard individual price + corporate headcount tiers; **figures provided by Aurora** |
| D7 | Staff actioning requests | **Simple custom staff view** (built in v1) |
| D8 | MFA policy | **Aurora staff/admin: required** (PDR §10); **corporate admins & patients: offered/encouraged**, not required |
| D9 | Patient dashboard | Includes the patient's **own bookings** |

## 4. Architecture

**Supabase Auth, client-side, on GitHub Pages** — no new hosting; reuses the existing **HM-Aurora** Supabase project (`gmvrkzumvwhrkqzqwcnu`).

- **Auth runtime:** `@supabase/supabase-js` in the browser handles sign-up, email verification, sign-in, password reset, and TOTP MFA. The publishable/anon key is already public by design.
- **Single browser client:** introduce one shared authenticated client (`src/lib/supabase/client.ts`, `persistSession: true`) used for auth and all logged-in reads/writes. The existing anonymous intake path (bookings/contact/etc., `src/lib/submit.ts`) continues to work — unauthenticated calls act as the `anon` role and remain INSERT-only under RLS.
- **Protected routes are client-guarded, but security lives in the database.** Because the site is a static export (`output: "export"`, no server middleware), auth-gated pages are client-rendered and a client-side guard redirects to login when there's no session. **This guard is UX only — the real security boundary is Postgres RLS**, which is enforced regardless of the UI.
- **Sessions:** Supabase JWT + refresh token persisted in the browser; configure a short-ish JWT expiry and a client idle-timeout. Supabase's built-in auth rate-limiting provides baseline brute-force protection; robust account lockout + richer audit is a later Edge Function (noted as partial vs PDR §10).
- **Transactional email** (verification, password reset) uses Supabase's built-in hosted auth emails in v1; branded templates/custom sends come later via Edge Functions.
- **No service-role key in the client, ever.** Staff access is granted through an Aurora-set staff flag + RLS — staff query with their own authenticated JWT, not a secret. Any operation that truly needs the service role happens in the Supabase dashboard or a future Edge Function.

**Why this and not a dynamic host:** the eventual clinical portal (FHIR, server-side sessions, secret ops) will justify moving to a Node host — but these three features don't need it, and Supabase Auth users/profiles carry over unchanged when that move happens. This is the lean, non-foreclosing v1.

## 5. Account types & roles

| Role | How created | MFA | Capabilities (v1) |
|---|---|---|---|
| `patient` | Self-registration | Offered | Own profile, consents, own bookings, account deletion |
| `corporate_admin` | Self-registration (creates an organisation; becomes its owner) | Offered | Org profile, browse packages, submit/track activation requests |
| `staff` / `admin` | **Provisioned by Aurora only** (Supabase dashboard / invite) | **Required** | Staff console: view all activation requests, action *pending → activated* |

**Anti-privilege-escalation:** self-serve users can only ever become `patient` or `corporate_admin`-of-their-own-org. Corporate capability derives from **membership in `organisation_members`**, not a self-declared string. The `staff`/`admin` grant can be set **only by the service role** (enforced by a policy/trigger that forbids users from updating their own role to a privileged value). This is a blocking security requirement.

## 6. Feature — Patient registration & account

**Registration (data-minimised, PDR §8.1):** email, password, full name, date of birth, + explicit consent checkbox. Phone optional. **No clinical fields.** DOB is justified for safe patient-record matching (same basis as booking).

- On sign-up, Supabase sends a verification email; the account is limited until the email is verified.
- A Postgres trigger (`handle_new_user`) creates the `profiles` row (default role `patient`) on `auth.users` insert.
- Consent is captured as an `account_consents` record (timestamp + notice version + scope), reusing the Privacy Centre consent model. Marketing/comms default **off** (most-private defaults).
- MFA (TOTP) is **offered** in account settings, not required.

**Patient dashboard** (`/account/patient`, protected):
- **Profile** — view/edit name, DOB, phone; change email / password (Supabase built-ins).
- **Consents** — view and change every consent, one-step withdrawal (mirrors Privacy Centre).
- **My bookings** — list the patient's own bookings. Bookings created **while logged in** carry `user_id = auth.uid()`; anonymous bookings continue to work unchanged. (Claiming past anonymous bookings by verified email is a later enhancement.)
- **Data rights** — self-service export (machine-readable) and **account deletion** (§9.2).

**Lawful basis (v1):** account + service delivery under GDPR Art. 6(1)(b), plus Art. 6(1)(a) consent for any optional comms. These accounts store **no special-category (health) data**, so an Art. 9 condition is not engaged in v1; it will be when the clinical portal is added.

## 7. Feature — Corporate registration & account

**Registration:** company name, sector, employee size band, region/country, contact-person name, work email, password, + B2B comms consent. Business data — not special-category.

- The first user becomes the organisation **owner** (`corporate_admin`): sign-up creates an `organisations` row and an `organisation_members(owner)` row in one flow.
- Email verification as above; MFA offered.

**Corporate dashboard** (`/account/corporate`, protected):
- **Organisation profile** — edit company details and billing contact.
- **Browse packages** — the corporate catalogue with **headcount-tiered pricing** (see §9).
- **Request activation** — select a package, enter estimated headcount + preferred start + optional notes → creates a `package_requests` row (`audience = "corporate"`) with status `pending`.
- **Track requests** — see each request's status (`pending → reviewing → activated`/`declined`) and any Aurora note.

No online payment in v1 (hybrid): activation and invoicing are handled offline by Aurora after review.

## 8. Feature — Individual package request

Individuals (patient accounts, or a guest prompted to register) can select an **individual-priced** package and submit a request (recorded in `package_requests` with `audience = "individual"` — see §11). Aurora arranges payment offline. Prices are **shown**; there is **no online checkout** in v1.

## 9. Corporate & individual packages catalogue

Packages live in a typed content file `src/content/packages.ts` (same pattern as `services.ts`), so they're versioned and easy to edit; a DB-backed editable catalogue is a later phase.

**Pricing model (structure defined here; figures provided by Aurora — see §16):**
- Individual-audience packages carry a **standard individual price** (e.g. per person / per year).
- Corporate-audience packages carry **headcount tiers** — price bands keyed to number of employees (e.g. 1–25, 26–100, 101–500, 500+), each with a price model (per-employee or total).
- Some packages may serve both audiences (both price shapes present).

Proposed data shape:

```ts
type Audience = "individual" | "corporate";
type Package = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  audiences: Audience[];
  includes: string[];        // what's in the package
  format: string;            // on-site mobile clinic / virtual / centre
  cadence: string;           // one-off / quarterly / annual
  individualPrice?: { amount: number; currency: string; unit: string };
  corporateTiers?: { minEmployees: number; maxEmployees?: number;
                     priceModel: "per-employee" | "total"; amount: number; currency: string }[];
  phase: 1 | 2 | 3 | 4;
  popular?: boolean;
};
```

**Draft catalogue (names/inclusions to refine; figures from Aurora):**

| Package | Audience | Includes (draft) |
|---|---|---|
| **Personal Health Check** | Individual | Annual screening (BP, glucose, BMI, risk snapshot) + digital results summary |
| **Family Health** | Individual | Personal Health Check for a household + maternal/child sessions |
| **Essentials** | Corporate | Annual on-site staff screening day + digital results |
| **Workforce Health** *(popular)* | Corporate | Essentials + NCD follow-ups, maternal/family sessions, quarterly mobile-clinic visits, anonymised aggregate workforce report |
| **Enterprise Care** | Corporate | Workforce Health + on-demand home visits, staff telemedicine, dedicated coordinator, tailored programme |
| **Custom** | Corporate | Build-your-own → contact |

**Public marketing page** `/packages` presents individual and corporate packages with pricing and a "Request" CTA (routes to register/login → request flow). "Anonymised aggregate workforce report" must never expose individual employee health data (PDR §11).

## 10. Feature — Simple staff console

`/account/staff` (protected, `staff`/`admin` role, MFA required):

- Lists `package_requests` (corporate and individual), filterable by status.
- Staff can open a request and change status `pending → reviewing → activated`/`declined`, and add an internal note.
- Reads/writes go through the staff member's authenticated JWT; a `staff`-role RLS policy grants SELECT/UPDATE across all requests (no service-role key in the client).
- Every status change writes an `audit_events` row (who, what, when).

Scope guard: this is a **simple functional view**, not a full admin suite. Bulk operations, analytics, and content editing are later phases.

## 11. Data model (Supabase — all RLS-guarded)

New/changed tables (Postgres, RLS enabled; policies keyed to `auth.uid()`, org membership, or staff flag):

- **`profiles`** — `id` (=auth.uid), `role` (`patient`|`corporate_admin`|`staff`|`admin`, default `patient`), `full_name`, `dob`, `phone`, `created_at`. RLS: user selects/updates **own** row; **role cannot be self-elevated** to `staff`/`admin` (trigger/policy). Created by `handle_new_user` trigger.
- **`organisations`** — `id`, `name`, `sector`, `size_band`, `region`, `billing_contact_name`, `billing_email`, `created_by`, `created_at`. RLS: members of the org select; owner updates.
- **`organisation_members`** — `org_id`, `user_id`, `member_role` (`owner`|`admin`), `created_at`. v1 holds only the owner; future-proofs multi-admin + employee linkage. RLS: a user sees rows for orgs they belong to.
- **`package_requests`** — `id`, `audience` (`individual`|`corporate`), `requester_user_id`, `org_id` (nullable, corporate only), `package_slug`, `estimated_headcount` (corporate), `preferred_start`, `status` (`pending`|`reviewing`|`activated`|`declined`), `staff_note`, `created_at`. RLS: requester/org-member selects own; **staff** selects/updates all.
- **`account_consents`** — `id`, `user_id`, `notice_version`, `scope` (jsonb), `captured_at`. RLS: user selects own; insert own.
- **`audit_events`** — `id`, `actor_user_id`, `action`, `target` (jsonb), `created_at`. RLS: staff select; inserts from allowed flows.
- **`aurora_bookings`** (existing) — **add `user_id uuid null`.** New policy: a patient may SELECT rows where `user_id = auth.uid()`. Anonymous INSERT-only path is unchanged (user_id null).

A single `package_requests` table with an `audience` discriminator is preferred over two tables (simpler staff console, one policy set).

## 12. Security & privacy (PDR §8–§10 mapping)

- **§8.1 data minimisation** — registration collects only what each purpose needs; optional fields marked; no clinical data.
- **§8 most-private defaults** — marketing/comms off; consents off until opted in.
- **§9.1 lawful basis** — Art. 6(1)(b) service + 6(1)(a) consent for comms; no Art. 9 data in v1.
- **§9.2 data-subject rights** — self-service export + account deletion in the patient dashboard.
- **§10 security** — MFA required for staff (offered for others, D8); RBAC via RLS + membership + staff flag; unique IDs (auth.users); session/idle timeout; account lockout **partial** in v1 (Supabase rate-limits; robust lockout later); `audit_events` for account + activation actions.
- **§11 EHR boundary** — none of these tables store clinical/special-category data. The clinical record stays in the future FHIR-backed portal.
- **Privacy notice** — bump the notice version and add an "accounts" section describing what account data is collected and why (ties to `account_consents.notice_version`).

## 13. Pages & routes

**New:**
- `/packages` — public marketing catalogue (individual + corporate, priced).
- `/register/patient`, `/register/corporate` — registration (account creation).
- `/corporate-login` — corporate sign-in (thin wrapper over the shared auth form).
- `/account/patient`, `/account/corporate`, `/account/staff` — protected dashboards.
- Auth callback + password-reset routes (Supabase redirect targets, handled client-side; add the URLs to Supabase's allowed redirects).

**Changed:**
- `/patient-login`, `/staff-login` — the current static stubs become **functional** sign-in pages; the copy claiming "sign-in is protected…" becomes true.
- NavBar/Footer — add a "For Employers / Packages" entry and account/login affordances; show a logged-in state.
- `src/lib/submit.ts` — reuse the shared authenticated client; stamp `user_id` on bookings when a session exists.

## 14. Testing / verification

- Playwright + axe specs for registration, login, and each dashboard (a11y is a blocking criterion, PDR §12).
- **RLS proof tests** (the security core): with two seeded users, verify user A cannot read user B's profile/bookings/org/requests; anon reads nothing; a `patient` cannot update their role to `staff`; a `staff` user can read/update all requests.
- Booking-linkage test: a logged-in booking gets `user_id`; an anonymous booking stays null and still inserts.
- `npm run verify` green; static export still produced and deployed.

## 15. Out of scope (v1) — later phases

Clinical FHIR patient portal · online payment/billing/subscriptions · employee↔package linkage & bulk employee enrollment · multi-admin organisations · aggregate workforce reporting · a full staff admin console beyond the simple view · SSO. **All schema choices above are compatible with adding these later.**

## 16. Open items — inputs required from Aurora

- **Actual prices** — individual standard prices and corporate headcount-tier figures per package (structure is defined; numbers are a content input).
- **Final package names, inclusions, and which packages serve which audience.**
- **Privacy notice update** — approve the new "accounts" section + version bump.
- **Session timeout duration** and whether to require corporate-admin MFA in a later phase.
- **Email templates** — accept Supabase default auth emails for v1, or brand them (later Edge Function).
