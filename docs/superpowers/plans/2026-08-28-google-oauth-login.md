# Google OAuth Sign-In — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Continue with Google" sign-in to the patient auth, routing new Google users (who have no date of birth) through a one-field DOB + explicit-consent completion step before the dashboard.

**Architecture:** Client-side Supabase Auth OAuth (`signInWithOAuth`) on the existing static GitHub Pages deploy, reusing the shipped patient-auth foundation (`getSupabase`, `/auth/callback`, `profiles`/`account_consents` + RLS). No new tables or RLS; one trigger-function replacement so Google names populate. The only external dependency is a Google Cloud OAuth client the site owner creates.

**Tech Stack:** Next.js 15 (static export), TypeScript strict, Tailwind v4, `@supabase/supabase-js`, Zod, Vitest, Playwright + axe. Supabase project **HM-Aurora** (`gmvrkzumvwhrkqzqwcnu`).

**Source of truth:** `docs/superpowers/specs/2026-08-28-google-oauth-login-design.md`.

---

## Files created / modified

**Created**
- `src/components/GoogleButton.tsx` — "Continue with Google" button (calls the helper, shows init errors)
- `src/app/account/complete/CompleteProfileForm.tsx` + `page.tsx` — DOB + consent completion step
- `supabase/migrations/20260828140000_handle_new_user_google.sql` — trigger `full_name` COALESCE
- `tests/e2e/google-login.spec.ts` — button renders + axe on login/register

**Modified**
- `src/lib/auth/patient.ts` — add `signInWithGoogle()`
- `src/lib/validation/schemas.ts` — add `completeProfileSchema`
- `src/lib/auth/patient.test.ts` — add completion-schema cases (or a new `complete.test.ts`)
- `src/app/auth/callback/page.tsx` — route incomplete (dob-null) users to `/account/complete/`
- `src/app/patient-login/PatientLoginForm.tsx` and `src/app/register/patient/PatientRegisterForm.tsx` — add the Google button + divider + privacy note
- `docs/PLAN.md` — note the feature

---

## Task 1: Google provider configuration (owner-gated)

The one manual dependency. The code tasks (2–8) do **not** require this, but the button only works once the provider is enabled — so enable it before the final deploy (Task 8).

- [ ] **Step 1 (site owner): create the Google Cloud OAuth client**

In the Google Cloud Console:
1. Create or select a project.
2. **APIs & Services → OAuth consent screen**: User type **External**; App name `H.M. Aurora Health Systems`; support email + developer email = your email; App domain / privacy-policy link `https://thestormkingg.github.io/aurora-website/privacy-centre/notice/`. Save. (Publishing status can stay "Testing" for now; add test users, or "Publish app" for public use.)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**: Application type **Web application**; Name `Aurora Web`; **Authorized redirect URIs** → add exactly:
   `https://gmvrkzumvwhrkqzqwcnu.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client secret** and give them to the implementer (do not commit them anywhere).

- [ ] **Step 2 (implementer): enable the Supabase Google provider via Management API**

With the two values in shell vars `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (never echo them):
```bash
RAW=$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null)
TOKEN=$(printf '%s' "${RAW#go-keyring-base64:}" | base64 -d 2>/dev/null); [ "${TOKEN:0:4}" = "sbp_" ] || TOKEN="$RAW"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X PATCH \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"external_google_enabled\":true,\"external_google_client_id\":\"$GOOGLE_CLIENT_ID\",\"external_google_secret\":\"$GOOGLE_CLIENT_SECRET\"}" \
  "https://api.supabase.com/v1/projects/gmvrkzumvwhrkqzqwcnu/config/auth"
```
Expected: `HTTP 200`. Verify (no secret printed):
```bash
curl -s -H "Authorization: Bearer $TOKEN" "https://api.supabase.com/v1/projects/gmvrkzumvwhrkqzqwcnu/config/auth" | python3 -c "import sys,json;print('google_enabled:',json.load(sys.stdin).get('external_google_enabled'))"
```
Expected: `google_enabled: True`. No commit (server-side config only).

---

## Task 2: Trigger — populate name from Google metadata

**Files:** Create `supabase/migrations/20260828140000_handle_new_user_google.sql`.

- [ ] **Step 1: Write the migration**

```sql
-- Populate profiles.full_name from Google's metadata too: Google supplies the
-- display name under 'name' (and usually 'full_name'); email signup uses
-- 'full_name'. COALESCE covers both. dob/phone stay null for Google users
-- (Google doesn't provide them) — collected at the completion step.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, dob, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    nullif(new.raw_user_meta_data->>'dob','')::date,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end; $$;
```
(`create or replace function` updates the existing function in place; the `on_auth_user_created` trigger already points at it — do not recreate the trigger.)

- [ ] **Step 2: Apply**

Run: `source .env.secrets && supabase db push -p "$SUPABASE_DB_PASSWORD"`
Expected: applies `20260828140000_handle_new_user_google.sql`; `Finished supabase db push.`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260828140000_handle_new_user_google.sql
git commit -m "feat(db): populate profile name from Google metadata (coalesce full_name/name)"
```

---

## Task 3: `signInWithGoogle` helper + GoogleButton

**Files:** Modify `src/lib/auth/patient.ts`; Create `src/components/GoogleButton.tsx`.

- [ ] **Step 1: Add `signInWithGoogle` to `src/lib/auth/patient.ts`**

Append after `updatePassword` (reuses the file's existing `getSupabase`, `authRedirectBase`, and `AuthResult`):
```ts
export async function signInWithGoogle(): Promise<AuthResult> {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${authRedirectBase()}/auth/callback/` },
  });
  // On success the browser redirects to Google; an error means it never left.
  return error ? { ok: false, error: error.message } : { ok: true };
}
```

- [ ] **Step 2: Create `src/components/GoogleButton.tsx`**

```tsx
"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth/patient";

/** "Continue with Google" — initiates OAuth; the browser redirects on success. */
export function GoogleButton() {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    setError(undefined);
    const r = await signInWithGoogle();
    if (!r.ok) {
      setBusy(false);
      setError(r.error);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-silver/40 bg-starlight px-6 py-3 font-heading text-sm font-semibold text-navy transition-colors hover:border-cyan disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.15-4.05 1.15-3.12 0-5.76-2.11-6.7-4.94H1.29v3.09A11.997 11.997 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.19 7.19 0 0 1 0-4.6V6.61H1.29a12.02 12.02 0 0 0 0 10.78l4.01-3.09z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.61l4.01 3.09C6.24 6.86 8.88 4.75 12 4.75z" />
        </svg>
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-[#ff9db0]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Verify** `npm run typecheck` exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/patient.ts src/components/GoogleButton.tsx
git commit -m "feat(auth): signInWithGoogle helper + Google button component"
```

---

## Task 4: `completeProfileSchema` + unit test

**Files:** Modify `src/lib/validation/schemas.ts`; Create `src/lib/auth/complete.test.ts`.

- [ ] **Step 1: Add the schema to `src/lib/validation/schemas.ts`**

Append before the `fieldErrors` export (reuses the existing `phone` and `consent` primitives):
```ts
// Google-user profile completion (PRD §6 / spec §5): the DOB Google can't
// give us, plus optional phone and explicit consent. No clinical fields.
export const completeProfileSchema = z.object({
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth.")
    .refine((d) => new Date(`${d}T00:00:00`) < new Date(), "Date of birth must be in the past."),
  phone: phone.optional().or(z.literal("")),
  consent,
});
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
```

- [ ] **Step 2: Write the test `src/lib/auth/complete.test.ts`**

```ts
import { test, expect } from "vitest";
import { completeProfileSchema } from "@/lib/validation/schemas";

test("accepts a past DOB with consent", () => {
  const r = completeProfileSchema.safeParse({ dateOfBirth: "1990-01-01", consent: true });
  expect(r.success).toBe(true);
});

test("rejects a future DOB", () => {
  const r = completeProfileSchema.safeParse({ dateOfBirth: "2999-01-01", consent: true });
  expect(r.success).toBe(false);
});

test("rejects missing consent", () => {
  const r = completeProfileSchema.safeParse({ dateOfBirth: "1990-01-01", consent: false });
  expect(r.success).toBe(false);
});
```

- [ ] **Step 3: Run** `npm run test:unit` → all pass (smoke + patient + these 3).

- [ ] **Step 4: Commit**

```bash
git add src/lib/validation/schemas.ts src/lib/auth/complete.test.ts
git commit -m "feat(auth): completeProfileSchema for Google-user profile completion"
```

---

## Task 5: Completion page (`/account/complete`)

**Files:** Create `src/app/account/complete/CompleteProfileForm.tsx` and `src/app/account/complete/page.tsx`.

- [ ] **Step 1: Create `src/app/account/complete/CompleteProfileForm.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { CheckboxField, TextField } from "@/components/forms/fields";
import { completeProfileSchema, fieldErrors } from "@/lib/validation/schemas";
import { getSupabase } from "@/lib/supabase/client";
import { NOTICE_VERSION } from "@/lib/consent";
import { asset } from "@/lib/asset";

export function CompleteProfileForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  // If this user already has a DOB, they've completed setup — send them on.
  useEffect(() => {
    const supabase = getSupabase();
    supabase.from("profiles").select("dob").single().then(({ data }) => {
      if (data && data.dob) router.replace(asset("/account/patient/"));
      else setReady(true);
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      dateOfBirth: String(fd.get("dateOfBirth") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      consent: fd.get("consent") === "on",
    };
    const parsed = completeProfileSchema.safeParse(payload);
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setBusy(true); setFormError(undefined);

    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setBusy(false); setFormError("Please sign in again."); return; }
    const uid = userData.user.id;

    const { error: upErr } = await supabase
      .from("profiles")
      .update({ dob: parsed.data.dateOfBirth, phone: parsed.data.phone || null })
      .eq("id", uid);
    if (upErr) { setBusy(false); setFormError("Something went wrong. Please try again."); return; }

    await supabase.from("account_consents").insert({
      user_id: uid, notice_version: NOTICE_VERSION, scope: { account: true, marketing: false },
    });
    router.replace(asset("/account/patient/"));
  }

  if (!ready) return <p className="text-silver">Loading…</p>;

  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <TextField id="dateOfBirth" name="dateOfBirth" type="date" max={today} label="Date of birth"
        autoComplete="bday" hint="Used to match your care records safely." error={errors.dateOfBirth} />
      <TextField id="phone" name="phone" type="tel" label="Phone" optional autoComplete="tel" error={errors.phone} />
      <CheckboxField id="consent" name="consent" error={errors.consent}
        label="I consent to Aurora creating and holding this account to provide me care services. I can withdraw and delete it any time." />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Finish setup"}</Button>
        {formError ? <p role="alert" className="text-sm font-medium text-[#ff9db0]">{formError}</p> : null}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/app/account/complete/page.tsx`**

```tsx
import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { RequireAuth } from "@/components/RequireAuth";
import { CompleteProfileForm } from "./CompleteProfileForm";

export const metadata: Metadata = { title: "Complete your profile", robots: { index: false } };

export default function CompleteProfilePage() {
  return (
    <AuroraHero className="min-h-[70vh]">
      <div className="mx-auto max-w-md">
        <SectionHeading as="h1" eyebrow="One quick step" title="Complete your profile"
          lede="Add your date of birth so we can match your care records safely." />
        <Card className="mt-8">
          <RequireAuth><CompleteProfileForm /></RequireAuth>
        </Card>
      </div>
    </AuroraHero>
  );
}
```

- [ ] **Step 3: Verify** `npm run typecheck && npm run build` exit 0; route table includes `/account/complete`.

- [ ] **Step 4: Commit**

```bash
git add src/app/account/complete
git commit -m "feat(auth): profile-completion step for Google users (DOB + consent)"
```

---

## Task 6: Callback routes incomplete users to completion

**Files:** Modify `src/app/auth/callback/page.tsx` (replace the whole file).

- [ ] **Step 1: Replace `src/app/auth/callback/page.tsx` with**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuroraHero } from "@/components/AuroraHero";
import { getSupabase } from "@/lib/supabase/client";
import { NOTICE_VERSION } from "@/lib/consent";
import { asset } from "@/lib/asset";

// Handles both email-verification and Google OAuth returns. detectSessionInUrl
// exchanges the code/hash for a session; then we route by profile completeness:
// a user with no date of birth (a new Google user) completes their profile
// first; everyone else goes to the dashboard (ensuring a consent row exists).
export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Signing you in…");
  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setMsg("This link has expired. Please sign in."); return; }
      const uid = data.session.user.id;

      const { data: profile } = await supabase
        .from("profiles").select("dob").eq("id", uid).maybeSingle();
      if (!profile || profile.dob === null) {
        // New Google user: DOB + explicit consent are captured at completion.
        router.replace(asset("/account/complete/"));
        return;
      }

      const { data: existing } = await supabase
        .from("account_consents").select("id").eq("user_id", uid).limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from("account_consents").insert({
          user_id: uid, notice_version: NOTICE_VERSION, scope: { account: true, marketing: false },
        });
      }
      router.replace(asset("/account/patient/"));
    });
  }, [router]);
  return (
    <AuroraHero className="min-h-[60vh]">
      <p className="text-lg text-silver" role="status">{msg}</p>
    </AuroraHero>
  );
}
```

- [ ] **Step 2: Verify** `npm run typecheck && npm run build` exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/page.tsx
git commit -m "feat(auth): route new Google users through profile completion"
```

---

## Task 7: Add the Google button to login + register

**Files:** Modify `src/app/patient-login/PatientLoginForm.tsx` and `src/app/register/patient/PatientRegisterForm.tsx`.

- [ ] **Step 1: `PatientLoginForm.tsx`** — add the import and wrap the returned `<form>` so the Google button, a privacy note, and an "or" divider sit above it.

Add import at the top:
```tsx
import { GoogleButton } from "@/components/GoogleButton";
```
Change the component's `return (` so the top-level is a fragment containing the block below, then the existing `<form …>…</form>` unchanged:
```tsx
  return (
    <div className="flex flex-col gap-5">
      <GoogleButton />
      <p className="text-center text-xs text-silver/70">
        By continuing you agree to our{" "}
        <a href="/privacy-centre/notice" className="text-cyan underline underline-offset-2">privacy notice</a>.
      </p>
      <div className="flex items-center gap-3 text-xs text-silver/80">
        <span className="h-px flex-1 bg-line-dark" aria-hidden="true" />
        or
        <span className="h-px flex-1 bg-line-dark" aria-hidden="true" />
      </div>
      {/* existing <form> … </form> goes here, unchanged */}
    </div>
  );
```
Keep the existing `<form onSubmit={onSubmit} …>…</form>` exactly as-is, just moved inside this wrapper `<div>` after the divider.

- [ ] **Step 2: `PatientRegisterForm.tsx`** — same treatment, but leave the early `if (status.state === "sent") { return (…) }` success block untouched. Only the **main** `return (<form …>…</form>)` is wrapped:
```tsx
import { GoogleButton } from "@/components/GoogleButton";
```
```tsx
  return (
    <div className="flex flex-col gap-5">
      <GoogleButton />
      <p className="text-center text-xs text-silver/70">
        By continuing you agree to our{" "}
        <a href="/privacy-centre/notice" className="text-cyan underline underline-offset-2">privacy notice</a>.
      </p>
      <div className="flex items-center gap-3 text-xs text-silver/80">
        <span className="h-px flex-1 bg-line-dark" aria-hidden="true" />
        or
        <span className="h-px flex-1 bg-line-dark" aria-hidden="true" />
      </div>
      {/* existing <form> … </form>, unchanged */}
    </div>
  );
```

- [ ] **Step 3: Verify** `npm run typecheck && npm run build` exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/patient-login/PatientLoginForm.tsx src/app/register/patient/PatientRegisterForm.tsx
git commit -m "feat(auth): add Continue with Google to login and register"
```

---

## Task 8: e2e, verify, docs, deploy

**Files:** Create `tests/e2e/google-login.spec.ts`; Modify `docs/PLAN.md`.

- [ ] **Step 1: Create `tests/e2e/google-login.spec.ts`**

```ts
import { test, expect } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";

for (const path of ["/patient-login", "/register/patient"]) {
  test(`Continue with Google renders + axe clean on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await injectAxe(page);
    await checkA11y(page, undefined, { detailedReport: false });
  });
}
```

- [ ] **Step 2: Run e2e**

Run: `lsof -ti:3000 | xargs kill -9 2>/dev/null; npm run test:e2e`
Expected: all specs pass (the 3 existing patient-auth specs + these 2).

- [ ] **Step 3: Full verify**

Run: `npm run verify`
Expected: exit 0 (lint + typecheck + unit + build all green).

- [ ] **Step 4: Note it in `docs/PLAN.md`** — under the M5 progress block, add a line: Google OAuth sign-in added (spec `2026-08-28-google-oauth-login-design.md`, plan `2026-08-28-google-oauth-login.md`); new Google users complete DOB + consent at `/account/complete`.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/google-login.spec.ts docs/PLAN.md
git commit -m "test(e2e): Google button renders + a11y; docs note"
```

- [ ] **Step 6: Deploy gate** — confirm **Task 1 (provider enabled)** is done, then finish via `superpowers:finishing-a-development-branch` (merge to `main` → Pages deploy). If the provider is not yet enabled (owner hasn't supplied Google creds), STOP here and hold the merge: the button would render but fail on click. Report that the code is complete and merge is pending the Google credentials.

- [ ] **Step 7: Manual smoke (owner, once live)** — click "Continue with Google" → Google consent → land on `/account/complete` → enter DOB + tick consent → reach the dashboard → sign out → "Continue with Google" again → land straight on the dashboard.

---

## Notes

- **No new RLS/tables.** The completion step updates the user's own `profiles` row and inserts their own `account_consents` — both already permitted by Plan 1's policies; the role-escalation guard is untouched.
- **Identity linking:** a Google email matching an existing email/password account links to the same account (Supabase default for verified emails) — expected, not handled specially.
- **Secrets:** the Google Client ID/Secret live only in Supabase provider config — never in the repo or client bundle.
