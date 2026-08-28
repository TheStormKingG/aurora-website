# Design — Google Sign-In for Patient Auth

**Project:** H.M. Aurora website (`aurora-website`)
**Date:** 2026-08-28 · **Status:** Draft for review
**Builds on:** `docs/superpowers/plans/2026-08-28-patient-auth-foundation.md` (patient auth, live) and its PRD `docs/superpowers/specs/2026-08-28-accounts-corporate-offering-design.md`
**Related:** PDR §6.2, §8 (consent), §9.1 (explicit consent), §10, §12.

---

## 1. Summary

Add **"Continue with Google"** social sign-in alongside the existing email/password patient auth, using Supabase Auth's built-in OAuth on the current static GitHub Pages deploy. Because Google returns a name + email but **no date of birth** (which email signup collects for record-matching), a new Google user is routed through a **one-field completion step** (DOB + explicit consent) before reaching the dashboard.

## 2. Scope & decisions

| Decision | Choice |
|---|---|
| Providers | **Google only** (not Apple/Facebook) |
| Placement | "Continue with Google" on **both** `/patient-login` and `/register/patient` |
| Audience | **Patients only** (corporate/staff accounts don't exist yet; Plans 2/3) |
| Missing DOB for Google users | **Quick completion step** — route new Google users to `/account/complete` (DOB + explicit consent) before the dashboard; unavoidable until completed |
| Consent for Google users | Captured **explicitly at the completion step** (checkbox), not silently |

**Out of scope:** other OAuth providers; avatar/picture display; linking a Google identity to an existing email/password account (Supabase auto-links by verified email by default — see §7); corporate/staff social login.

## 3. Configuration (the external dependency)

Google OAuth needs credentials only the site owner can create:

1. **Google Cloud Console** (owner does this): create/select a project → configure the OAuth **consent screen** (External, app name "H.M. Aurora Health Systems", support + developer email, the privacy-policy URL `https://thestormkingg.github.io/aurora-website/privacy-centre/notice/`) → create an **OAuth 2.0 Client ID** of type **Web application** → set **Authorized redirect URI** to exactly `https://gmvrkzumvwhrkqzqwcnu.supabase.co/auth/v1/callback` → copy the **Client ID + Client Secret**.
2. **Supabase** (agent does this, via Management API once the owner provides the two values): enable the **Google** provider with the Client ID + Secret — `PATCH https://api.supabase.com/v1/projects/gmvrkzumvwhrkqzqwcnu/config/auth` with `external_google_enabled: true`, `external_google_client_id`, `external_google_secret`. The token is in the macOS keychain (`security find-generic-password -s "Supabase CLI" -w`, `go-keyring-base64:`-decoded).
3. The app's redirect **allow-list already includes** `…/auth/callback/` for localhost and production (set during Plan 1), so no change there.

Client ID/Secret are **not committed** — they live only in Supabase's provider config. Nothing secret enters the repo or the client bundle.

## 4. Architecture & flow

Everything is client-side Supabase Auth (static-export compatible), reusing the Plan 1 foundation.

**Sign-in flow (PKCE, handled by supabase-js):**
1. User clicks "Continue with Google" → `getSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: authRedirectBase() + "/auth/callback/" } })`. supabase-js stores the PKCE verifier in localStorage and redirects to Google.
2. Google → Supabase's `/auth/v1/callback` → redirects back to our `/auth/callback/` with a `code`.
3. `/auth/callback` page loads; `detectSessionInUrl: true` on the shared client auto-exchanges the code for a session (the verifier is in the same localStorage).
4. The callback then **routes by completeness** (§5).

**Completeness routing (the new logic in `/auth/callback`):** with a session, read the user's `profiles.dob`:
- `dob` **null** → new Google user → `router.replace("/account/complete/")`.
- `dob` **present** → ensure a consent row exists (existing behavior), then `router.replace("/account/patient/")`.

Email/password users are unaffected: they always have a DOB (required at signup), so they always route to the dashboard.

## 5. Components

**Modified**
- `src/lib/auth/patient.ts` — add `signInWithGoogle(): Promise<AuthResult>` calling `signInWithOAuth`. (A failed *initiation* returns an error; success navigates away.)
- `src/app/auth/callback/page.tsx` — after session is present, branch on `profiles.dob` (null → `/account/complete/`, else ensure-consent → `/account/patient/`). Keep the existing "link expired" handling.
- `src/app/patient-login/PatientLoginForm.tsx` and `src/app/register/patient/PatientRegisterForm.tsx` — add a `GoogleButton` above the email/password form with an "or" divider and a short "By continuing you agree to our privacy notice" line linking `/privacy-centre/notice`.
- Trigger migration — `supabase/migrations/<ts>_handle_new_user_google.sql`: `create or replace function public.handle_new_user()` with `coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')` for `full_name` (rest unchanged: dob/phone from metadata, which are null for Google). No new trigger — replaces the function body.

**Created**
- `src/components/GoogleButton.tsx` — a client button ("Continue with Google" + Google "G" mark as inline SVG, brand-consistent styling) that calls `signInWithGoogle()` and shows an error if initiation fails.
- `src/app/account/complete/CompleteProfileForm.tsx` + `page.tsx` — auth-guarded (`RequireAuth`). One **date-of-birth** field (required, must be a past date — reuse the DOB rule) + optional **phone** + an **explicit consent checkbox**. On submit: `update profiles set dob, phone where id = auth.uid()`, then `insert account_consents (notice_version, scope:{account:true, marketing:false})`, then `router.replace("/account/patient/")`. Validation via a new `completeProfileSchema` in `src/lib/validation/schemas.ts`.
- `src/app/account/complete/page.tsx` also guards completeness: if the loaded profile already has a `dob`, redirect to the dashboard (so completed users can't linger here).

## 6. Data & security

- No schema changes beyond the trigger-function replacement. `profiles`, `account_consents`, and their RLS (own-row read/update/insert, escalation guard) from Plan 1 already permit exactly what the completion step needs — a user updating their own `dob`/`phone` and inserting their own consent. **No new RLS.**
- Google users still get `role = 'patient'` by default (the trigger doesn't set role from metadata) — the escalation guard still prevents any self-elevation. No new privilege surface.
- Consent remains explicit (checkbox at completion), satisfying PDR §9.1 for the account purpose. Marketing stays off by default.
- No clinical/special-category data (PDR §11) — DOB + phone only, same as email signup.

## 7. Edge cases & error handling

- **Google account whose email matches an existing email/password account:** Supabase's default is to **link identities when the email is verified** (Google emails are verified), so the user signs into the *same* account — no duplicate. Acceptable and expected; documented, not specially handled.
- **User abandons the completion step:** `dob` stays null, so the next Google sign-in routes them back to `/account/complete/`. They can use the app only after completing — matching the "quick completion step" intent.
- **OAuth initiation failure** (network, popup blocked): `signInWithGoogle` surfaces the error message on the button's page; the email/password form remains usable.
- **Direct navigation to `/account/complete/` by a completed user:** the page redirects to the dashboard when `dob` is already set.
- **Direct navigation to `/account/patient/` by an incomplete Google user:** acceptable for v1 — the dashboard renders with `dob` "—"; the primary gate is the callback route. (Optional hardening: add the same dob-null → complete redirect to the dashboard guard; noted, not required for v1.)

## 8. Testing

- **Unit:** `completeProfileSchema` accepts a valid past DOB + consent; rejects a future/blank DOB and missing consent.
- **e2e (Playwright + axe):** verify the "Continue with Google" button renders on `/patient-login` and `/register/patient`, and that those two pages remain axe-clean with the button added. `/account/complete` is auth-gated (an unauthenticated visit redirects to login), so it is **not** axe-tested in CI without a real Google session — its form reuses the same already-a11y-verified primitives (`TextField`, `CheckboxField`) and is covered by the manual smoke instead.
- **Manual smoke (documented, needs real Google creds):** click "Continue with Google" → Google consent → land on `/account/complete` → enter DOB + consent → reach the dashboard → sign out → sign in again with Google → land straight on the dashboard (no completion step).
- `npm run verify` green; existing RLS proof still passes (unchanged).

## 9. Acceptance criteria

- With the Google provider configured, a new user can sign in with Google, is required to supply DOB + consent once, and then reaches their dashboard; a returning Google user reaches the dashboard directly.
- Email/password signup, login, dashboard, and booking linkage are unchanged.
- The Google name populates `profiles.full_name`.
- No secrets in the repo or client bundle; RLS unchanged and still proven.
- Build stays green and static-exportable; deploys via the existing Pages workflow.

## 10. Open items (owner input)

- **Google Cloud OAuth Client ID + Secret** — created by the owner (the one manual dependency); the plan includes step-by-step instructions.
- Whether to also show the Google button on the future corporate/staff logins — deferred to Plans 2/3.
