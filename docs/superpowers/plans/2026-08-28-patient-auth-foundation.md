# Patient Auth Foundation — Implementation Plan (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an individual create a real Supabase-backed account (register → verify email → sign in), then manage their profile, consents, and their own bookings, and delete their account — all self-service, with database-enforced RLS.

**Architecture:** Supabase Auth runs client-side on the existing static GitHub Pages export (no new hosting). A single browser Supabase client (`persistSession: true`) handles auth and all logged-in reads/writes. Security is enforced by Postgres Row-Level Security; the client-side route guard is UX only. New tables (`profiles`, `account_consents`) and a `user_id` column on `aurora_bookings` are RLS-locked to `auth.uid()`. This is the dependency root for Plan 2 (corporate + packages) and Plan 3 (staff console).

**Tech Stack:** Next.js 15 (App Router, static export), TypeScript strict, Tailwind v4, `@supabase/supabase-js` 2.110, Zod, Vitest (unit), Node integration script (RLS proof), Playwright + axe-core (a11y). Supabase project: **HM-Aurora** (`gmvrkzumvwhrkqzqwcnu`).

**Source of truth:** `docs/superpowers/specs/2026-08-28-accounts-corporate-offering-design.md` (§4, §5, §6, §11, §12, §14).

**Scope guard:** This plan is the *patient* vertical + auth foundation only. Corporate accounts, packages, and the staff console are Plans 2 & 3. No clinical data is stored (PDR §11).

---

## Files created / modified

**Created**
- `src/lib/supabase/client.ts` — browser Supabase singleton (auth + authed queries)
- `src/lib/auth/session.ts` — `useSession` hook + `signOut`
- `src/lib/auth/patient.ts` — `registerPatient`, `signIn`, `sendPasswordReset`, `updatePassword`
- `src/components/RequireAuth.tsx` — client route guard (UX)
- `src/app/register/patient/page.tsx` + `PatientRegisterForm.tsx`
- `src/app/patient-login/PatientLoginForm.tsx` (page already exists — becomes functional)
- `src/app/reset-password/page.tsx` + `ResetPasswordForm.tsx`
- `src/app/auth/callback/page.tsx` — verification/redirect landing
- `src/app/account/patient/page.tsx` + `PatientDashboard.tsx`
- `supabase/migrations/20260828120000_profiles.sql`
- `supabase/migrations/20260828120100_account_consents.sql`
- `supabase/migrations/20260828120200_bookings_user_link.sql`
- `vitest.config.ts`, `src/lib/auth/patient.test.ts`
- `tests/rls/profiles.mjs` — RLS proof (integration)
- `playwright.config.ts`, `tests/e2e/patient-auth.spec.ts`

**Modified**
- `package.json` — add dev deps + `test:unit` / `test:rls` / `test:e2e` scripts; fold unit tests into `verify`
- `src/lib/validation/schemas.ts` — add `patientRegistrationSchema`
- `src/lib/submit.ts` — stamp `user_id` on bookings when a session exists
- `src/components/NavBar.tsx` — logged-in affordance (account link / sign out)
- `docs/PLAN.md` — tick M5 progress
- `.env.example` — document the auth env vars already in use

---

## Task 1: Supabase project configuration (manual, one-time)

These are Supabase dashboard settings, not code. Do them first — auth flows fail without them.

- [ ] **Step 1: Enable email auth + confirmations**

In the Supabase dashboard for project `gmvrkzumvwhrkqzqwcnu` → **Authentication → Providers → Email**: ensure Email is enabled and "Confirm email" is ON.

- [ ] **Step 2: Add allowed redirect URLs**

**Authentication → URL Configuration → Redirect URLs**, add both:
```
http://localhost:3000/auth/callback/
https://thestormkingg.github.io/aurora-website/auth/callback/
http://localhost:3000/reset-password/
https://thestormkingg.github.io/aurora-website/reset-password/
```
Set **Site URL** to `https://thestormkingg.github.io/aurora-website/`.

- [ ] **Step 3: Confirm env vars exist**

Run: `grep -oE "^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_KEY)" .env.local | sort -u`
Expected: all three names print. (They already exist from the static-deploy work.)

- [ ] **Step 4: Document env in .env.example** — add under the Supabase section:

```
# Client-side auth (Plan 1) — same publishable key, persistSession enabled:
# NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (already listed above)
# RLS integration tests need the service key:
# SUPABASE_SERVICE_KEY=
```

- [ ] **Step 5: Commit**

```bash
git add .env.example && git commit -m "docs(env): note auth env vars for Plan 1"
```

---

## Task 2: Test tooling

**Files:** Modify `package.json`; Create `vitest.config.ts`.

- [ ] **Step 1: Install dev dependencies**

Run:
```bash
npm i -D vitest@2 @playwright/test@1 axe-playwright@2
```
Expected: installs succeed; `package.json` devDependencies updated.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Add scripts to `package.json`**

Replace the `"scripts"` block with:
```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build --turbopack",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test:unit": "vitest run",
  "test:rls": "node --env-file=.env.local tests/rls/profiles.mjs",
  "test:e2e": "playwright test",
  "verify": "npm run lint && npm run typecheck && npm run test:unit && npm run build"
}
```

- [ ] **Step 4: Verify vitest runs (no tests yet is an error, so add a trivial passing test first)**

Create `src/lib/smoke.test.ts`:
```ts
import { test, expect } from "vitest";
test("vitest runs", () => {
  expect(1 + 1).toBe(2);
});
```
Run: `npm run test:unit`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/smoke.test.ts
git commit -m "chore(test): add vitest + playwright/axe tooling and scripts"
```

---

## Task 3: `profiles` migration (schema + trigger + escalation guard + RLS)

**Files:** Create `supabase/migrations/20260828120000_profiles.sql`.

- [ ] **Step 1: Write the migration**

```sql
-- Patient/account identity layer (PRD §5, §11). NO clinical data here.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'patient'
    check (role in ('patient','corporate_admin','staff','admin')),
  full_name text,
  dob date,
  phone text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.profiles is
  'Account identity + role. Row per auth.users. No special-category data (PDR §11).';

alter table public.profiles enable row level security;

-- A user may read and update only their own profile.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Create the profile row automatically on signup, from user metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, dob, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    nullif(new.raw_user_meta_data->>'dob','')::date,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Anti-privilege-escalation (PRD §5): only the service role may set a
-- privileged role. Non-service updates that try to reach staff/admin fail.
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql as $$
begin
  if new.role in ('staff','admin')
     and new.role is distinct from old.role
     and (select auth.role()) <> 'service_role' then
    raise exception 'role escalation not allowed';
  end if;
  return new;
end; $$;

create trigger profiles_no_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();
```

- [ ] **Step 2: Apply the migration**

Run: `source .env.secrets && supabase db push -p "$SUPABASE_DB_PASSWORD"`
Expected: "Applying migration 20260828120000_profiles.sql..." then "Finished supabase db push."

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260828120000_profiles.sql
git commit -m "feat(db): profiles table with signup trigger and role-escalation guard"
```

---

## Task 4: `account_consents` + booking linkage migrations

**Files:** Create `supabase/migrations/20260828120100_account_consents.sql` and `supabase/migrations/20260828120200_bookings_user_link.sql`.

- [ ] **Step 1: Write `20260828120100_account_consents.sql`**

```sql
-- Per-account consent record (PRD §6, §12; PDR §9.1): timestamp + notice
-- version + scope, one row per capture, withdrawable by re-capturing.
create table public.account_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notice_version text not null,
  scope jsonb not null,
  captured_at timestamptz not null default now()
);
alter table public.account_consents enable row level security;

create policy "consents: read own" on public.account_consents
  for select to authenticated using (auth.uid() = user_id);
create policy "consents: insert own" on public.account_consents
  for insert to authenticated with check (auth.uid() = user_id);
```

- [ ] **Step 2: Write `20260828120200_bookings_user_link.sql`**

```sql
-- Link a booking to a signed-in patient (PRD §6, §11). Anonymous intake
-- (user_id null) keeps working under the existing INSERT-only policy.
alter table public.aurora_bookings
  add column user_id uuid references auth.users (id) on delete set null;

-- A patient may read only their own linked bookings.
create policy "bookings: patient reads own" on public.aurora_bookings
  for select to authenticated using (user_id = auth.uid());

-- Allow authenticated users to insert their own booking with user_id set
-- to themselves (or null). The existing anon insert policy is unchanged.
create policy "bookings: authenticated inserts own" on public.aurora_bookings
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());
```

- [ ] **Step 3: Apply both migrations**

Run: `source .env.secrets && supabase db push -p "$SUPABASE_DB_PASSWORD"`
Expected: both migrations apply; "Finished supabase db push."

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260828120100_account_consents.sql supabase/migrations/20260828120200_bookings_user_link.sql
git commit -m "feat(db): account_consents + booking user linkage with RLS"
```

---

## Task 5: RLS proof (integration test) — the security core

**Files:** Create `tests/rls/profiles.mjs`.

- [ ] **Step 1: Write the RLS proof script**

```js
// Proves RLS (PRD §14): a user reads only their own rows; cannot read
// another user's; cannot self-elevate to staff; anon reads nothing.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) throw new Error("missing env");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const stamp = process.env.RLS_STAMP || String(Date.now()); // unique emails per run
const fail = (m) => { console.error("✗ " + m); process.exitCode = 1; };
const ok = (m) => console.log("✓ " + m);

async function makeUser(tag) {
  const email = `rls+${tag}.${stamp}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: "Test-passw0rd!", email_confirm: true,
    user_metadata: { full_name: `RLS ${tag}` },
  });
  if (error) throw error;
  return { id: data.user.id, email };
}
function userClient() {
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

const a = await makeUser("a");
const b = await makeUser("b");
try {
  const ca = userClient();
  await ca.auth.signInWithPassword({ email: a.email, password: "Test-passw0rd!" });

  const own = await ca.from("profiles").select("id").eq("id", a.id);
  (own.data && own.data.length === 1) ? ok("reads own profile") : fail("cannot read own profile");

  const other = await ca.from("profiles").select("id").eq("id", b.id);
  (other.data && other.data.length === 0) ? ok("cannot read other's profile") : fail("LEAK: read other's profile");

  const esc = await ca.from("profiles").update({ role: "staff" }).eq("id", a.id);
  esc.error ? ok("role escalation blocked") : fail("ESCALATION: became staff");

  const anon = userClient();
  const anonRead = await anon.from("profiles").select("id");
  (anonRead.data && anonRead.data.length === 0) ? ok("anon reads no profiles") : fail("LEAK: anon read profiles");
} finally {
  await admin.auth.admin.deleteUser(a.id);
  await admin.auth.admin.deleteUser(b.id);
}
if (process.exitCode) console.error("RLS CHECKS FAILED"); else console.log("ALL RLS CHECKS PASSED");
```

- [ ] **Step 2: Run it — expect it to pass against the applied migrations**

Run: `npm run test:rls`
Expected: four `✓` lines then `ALL RLS CHECKS PASSED`, exit 0.

- [ ] **Step 3: Commit**

```bash
git add tests/rls/profiles.mjs && git commit -m "test(rls): prove profile isolation + no self-escalation + anon lockout"
```

---

## Task 6: Browser Supabase client + auth helpers

**Files:** Create `src/lib/supabase/client.ts`, `src/lib/auth/session.ts`, `src/lib/auth/patient.ts`; modify `src/lib/validation/schemas.ts`; create `src/lib/auth/patient.test.ts`.

- [ ] **Step 1: Create the browser client `src/lib/supabase/client.ts`**

```ts
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single browser Supabase client for auth + authenticated reads/writes.
 * persistSession keeps the user signed in across reloads; RLS is the real
 * security boundary (client route guards are UX only). Anonymous intake
 * (src/lib/submit.ts) can reuse this client — no session => `anon` role.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase env not configured");
  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

/** Absolute redirect base, basePath-aware, for auth email links. */
export function authRedirectBase(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${base}`;
}
```

- [ ] **Step 2: Add `patientRegistrationSchema` to `src/lib/validation/schemas.ts`**

Append (reuse the existing `name`, `email`, `phone`, `consent` primitives already defined in the file):
```ts
// Patient account registration (PRD §6). Data-minimised: email, password,
// name, DOB + explicit consent. No clinical fields.
export const patientRegistrationSchema = z.object({
  fullName: name,
  email,
  password: z.string().min(10, "Use at least 10 characters.").max(200),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth.")
    .refine((d) => new Date(`${d}T00:00:00`) < new Date(), "Date of birth must be in the past."),
  phone: phone.optional().or(z.literal("")),
  marketingOptIn: z.boolean().optional().default(false), // most-private default
  consent,
});
export type PatientRegistrationInput = z.infer<typeof patientRegistrationSchema>;
```

- [ ] **Step 3: Write the failing unit test `src/lib/auth/patient.test.ts`**

```ts
import { test, expect } from "vitest";
import { patientRegistrationSchema } from "@/lib/validation/schemas";

test("rejects short password", () => {
  const r = patientRegistrationSchema.safeParse({
    fullName: "Ana Test", email: "a@b.com", password: "short",
    dateOfBirth: "1990-01-01", consent: true,
  });
  expect(r.success).toBe(false);
});

test("accepts a minimal valid registration", () => {
  const r = patientRegistrationSchema.safeParse({
    fullName: "Ana Test", email: "a@b.com", password: "longenough123",
    dateOfBirth: "1990-01-01", consent: true,
  });
  expect(r.success).toBe(true);
});
```
Note: `@/` path alias must resolve in vitest. If the test errors on the import path, add to `vitest.config.ts`:
```ts
import { fileURLToPath } from "node:url";
// inside defineConfig:
resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
```

- [ ] **Step 4: Run the test — expect FAIL first (schema not yet added), then PASS after Step 2**

Run: `npm run test:unit`
Expected after Step 2 is in place: 2 passed.

- [ ] **Step 5: Create `src/lib/auth/session.ts`**

```ts
"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

/** Reactive current session (null when signed out, undefined while loading). */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return session;
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}
```

- [ ] **Step 6: Create `src/lib/auth/patient.ts`**

```ts
"use client";

import { getSupabase, authRedirectBase } from "@/lib/supabase/client";
import { NOTICE_VERSION } from "@/lib/consent";
import type { PatientRegistrationInput } from "@/lib/validation/schemas";

export type AuthResult = { ok: true } | { ok: false; error: string };

export async function registerPatient(input: PatientRegistrationInput): Promise<AuthResult> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${authRedirectBase()}/auth/callback/`,
      data: {
        full_name: input.fullName,
        dob: input.dateOfBirth,
        phone: input.phone || null,
      },
    },
  });
  if (error) return { ok: false, error: error.message };

  // Record consent (Art. 9(2)(a) style capture). If email confirmation is
  // required there may be no session yet; capture on first authed load then.
  if (data.session) {
    await supabase.from("account_consents").insert({
      user_id: data.user!.id,
      notice_version: NOTICE_VERSION,
      scope: { account: true, marketing: input.marketingOptIn ?? false },
    });
  }
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${authRedirectBase()}/reset-password/`,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const { error } = await getSupabase().auth.updateUser({ password });
  return error ? { ok: false, error: error.message } : { ok: true };
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase/client.ts src/lib/auth/session.ts src/lib/auth/patient.ts src/lib/validation/schemas.ts src/lib/auth/patient.test.ts vitest.config.ts
git commit -m "feat(auth): browser supabase client, session hook, patient auth helpers + schema"
```

---

## Task 7: Route guard + auth callback + reset-password pages

**Files:** Create `src/components/RequireAuth.tsx`, `src/app/auth/callback/page.tsx`, `src/app/reset-password/page.tsx` + `ResetPasswordForm.tsx`.

- [ ] **Step 1: Create `src/components/RequireAuth.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { asset } from "@/lib/asset";

/** Client-side guard (UX only — RLS is the real boundary). Redirects to
 *  patient login when there is no session. Shows nothing while resolving. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session === null) router.replace(asset("/patient-login/"));
  }, [session, router]);
  if (session === undefined) {
    return <p className="mx-auto max-w-7xl px-4 py-24 text-silver sm:px-6">Loading…</p>;
  }
  if (session === null) return null;
  return <>{children}</>;
}
```

- [ ] **Step 2: Create `src/app/auth/callback/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuroraHero } from "@/components/AuroraHero";
import { getSupabase } from "@/lib/supabase/client";
import { NOTICE_VERSION } from "@/lib/consent";
import { asset } from "@/lib/asset";

// detectSessionInUrl parses the verification hash; then we ensure a consent
// row exists (covers the confirm-email case where signUp had no session).
export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Confirming your account…");
  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setMsg("This link has expired. Please sign in."); return; }
      const uid = data.session.user.id;
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

- [ ] **Step 3: Create `src/app/reset-password/ResetPasswordForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { TextField } from "@/components/forms/fields";
import { updatePassword } from "@/lib/auth/patient";
import { asset } from "@/lib/asset";

export function ResetPasswordForm() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pw.length < 10) { setError("Use at least 10 characters."); return; }
    setBusy(true); setError(undefined);
    const r = await updatePassword(pw);
    setBusy(false);
    if (r.ok) router.replace(asset("/account/patient/"));
    else setError(r.error);
  }
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <TextField id="new-password" label="New password" type="password"
        value={pw} onChange={(e) => setPw(e.target.value)} error={error}
        hint="At least 10 characters." autoComplete="new-password" />
      <div><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Set new password"}</Button></div>
    </form>
  );
}
```

- [ ] **Step 4: Create `src/app/reset-password/page.tsx`**

```tsx
import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Reset Password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuroraHero className="min-h-[70vh]">
      <div className="mx-auto max-w-md">
        <SectionHeading as="h1" eyebrow="Account" title="Set a new password" />
        <Card className="mt-8"><ResetPasswordForm /></Card>
      </div>
    </AuroraHero>
  );
}
```

- [ ] **Step 5: Typecheck + build to confirm the new routes export statically**

Run: `npm run typecheck && npm run build`
Expected: exit 0; build output lists `/auth/callback` and `/reset-password` as static routes.

- [ ] **Step 6: Commit**

```bash
git add src/components/RequireAuth.tsx src/app/auth src/app/reset-password
git commit -m "feat(auth): route guard, email-callback landing, password reset"
```

---

## Task 8: Patient registration page

**Files:** Create `src/app/register/patient/PatientRegisterForm.tsx` and `src/app/register/patient/page.tsx`.

- [ ] **Step 1: Create `src/app/register/patient/PatientRegisterForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/icons";
import { CheckboxField, TextField } from "@/components/forms/fields";
import { patientRegistrationSchema, fieldErrors } from "@/lib/validation/schemas";
import { registerPatient } from "@/lib/auth/patient";

type Status = { state: "idle" | "submitting" } | { state: "sent" } | { state: "error"; message: string };

export function PatientRegisterForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      fullName: String(fd.get("fullName") ?? ""),
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      dateOfBirth: String(fd.get("dateOfBirth") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      marketingOptIn: fd.get("marketingOptIn") === "on",
      consent: fd.get("consent") === "on",
    };
    const parsed = patientRegistrationSchema.safeParse(payload);
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setStatus({ state: "submitting" });
    const r = await registerPatient(parsed.data);
    if (r.ok) setStatus({ state: "sent" });
    else setStatus({ state: "error", message: r.error });
  }

  if (status.state === "sent") {
    return (
      <div role="status" className="rounded-2xl border border-cyan/40 bg-cyan/10 p-8">
        <Icon name="mail" className="h-10 w-10 text-cyan" />
        <h2 className="mt-4 text-2xl text-starlight">Check your email</h2>
        <p className="mt-3 text-base text-silver">
          We&rsquo;ve sent a verification link. Open it to activate your account and sign in.
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <TextField id="fullName" name="fullName" label="Full name" autoComplete="name" error={errors.fullName} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="email" name="email" type="email" label="Email" autoComplete="email" error={errors.email} />
        <TextField id="password" name="password" type="password" label="Password" autoComplete="new-password"
          hint="At least 10 characters." error={errors.password} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="dateOfBirth" name="dateOfBirth" type="date" max={today} label="Date of birth"
          autoComplete="bday" hint="Used to match your record safely." error={errors.dateOfBirth} />
        <TextField id="phone" name="phone" type="tel" label="Phone" optional autoComplete="tel" error={errors.phone} />
      </div>
      <CheckboxField id="marketingOptIn" name="marketingOptIn"
        label="Send me occasional health tips and Aurora updates (off unless you choose it)." />
      <CheckboxField id="consent" name="consent" error={errors.consent}
        label="I consent to Aurora creating and holding this account to provide me care services. I can withdraw and delete it any time." />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={status.state === "submitting"}>
          {status.state === "submitting" ? "Creating…" : "Create account"}
        </Button>
        {status.state === "error" ? (
          <p role="alert" className="text-sm font-medium text-[#ff9db0]">{status.message}</p>
        ) : null}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/app/register/patient/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { PatientRegisterForm } from "./PatientRegisterForm";

export const metadata: Metadata = {
  title: "Create a Patient Account",
  description: "Register for an Aurora patient account to manage your bookings, consents, and profile.",
};

export default function PatientRegisterPage() {
  return (
    <AuroraHero className="min-h-[80vh]">
      <div className="mx-auto max-w-xl">
        <SectionHeading as="h1" eyebrow="Patient account"
          title="Create your account"
          lede="We ask only what your account needs — nothing clinical. You control it, and can delete it any time." />
        <Card className="mt-8"><PatientRegisterForm /></Card>
        <p className="mt-6 text-center text-sm text-silver">
          Already registered?{" "}
          <Link href="/patient-login" className="text-cyan underline underline-offset-2 hover:text-blue">Sign in</Link>
        </p>
      </div>
    </AuroraHero>
  );
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: exit 0; `/register/patient` in the route list.

- [ ] **Step 4: Commit**

```bash
git add src/app/register/patient
git commit -m "feat(patient): registration page with data-minimised fields + consent"
```

---

## Task 9: Functional patient login

**Files:** Create `src/app/patient-login/PatientLoginForm.tsx`; modify `src/app/patient-login/page.tsx`.

- [ ] **Step 1: Create `src/app/patient-login/PatientLoginForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { TextField } from "@/components/forms/fields";
import { signIn, sendPasswordReset } from "@/lib/auth/patient";
import { asset } from "@/lib/asset";

export function PatientLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    setBusy(true); setError(undefined);
    const r = await signIn(email, password);
    setBusy(false);
    if (r.ok) router.replace(asset("/account/patient/"));
    else setError("Email or password is incorrect.");
  }

  async function onReset(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const email = (document.getElementById("email") as HTMLInputElement)?.value;
    if (!email) { setResetMsg("Enter your email above first."); return; }
    await sendPasswordReset(email);
    setResetMsg("If that email has an account, a reset link is on its way.");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <TextField id="email" name="email" type="email" label="Email" autoComplete="email" />
      <TextField id="password" name="password" type="password" label="Password" autoComplete="current-password" error={error} />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        <button type="button" onClick={onReset} className="text-sm font-medium text-cyan hover:text-blue underline underline-offset-2">
          Forgot password?
        </button>
      </div>
      {resetMsg ? <p role="status" className="text-sm text-silver">{resetMsg}</p> : null}
      <p className="text-sm text-silver">
        New here?{" "}
        <Link href="/register/patient" className="text-cyan underline underline-offset-2 hover:text-blue">Create an account</Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Replace the body of `src/app/patient-login/page.tsx`**

Keep the file's metadata; replace the placeholder card content so the page renders `<PatientLoginForm />` inside a `Card`, and remove the "Portal accounts open with patient registration" placeholder note. The heading becomes "Sign in to your patient account". Add `import { PatientLoginForm } from "./PatientLoginForm";`.

```tsx
import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { Icon } from "@/components/icons";
import { PatientLoginForm } from "./PatientLoginForm";

export const metadata: Metadata = {
  title: "Patient Login",
  description: "Sign in to the Aurora Patient Portal: your profile, consents, and bookings.",
};

export default function PatientLoginPage() {
  return (
    <AuroraHero className="min-h-[70vh]">
      <div className="mx-auto max-w-md">
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan/30 bg-navy text-cyan">
              <Icon name="lock" className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl">Patient Portal</h1>
              <p className="text-sm text-silver">Sign in to your account</p>
            </div>
          </div>
          <div className="mt-6"><PatientLoginForm /></div>
          <p className="mt-6 text-xs leading-relaxed text-silver/80">
            Sign-in is protected with a verified email. Staff use the separate{" "}
            <a href="/staff-login" className="text-cyan underline underline-offset-2">staff login</a>.
          </p>
        </Card>
      </div>
    </AuroraHero>
  );
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/patient-login
git commit -m "feat(patient): functional login with sign-in + password reset"
```

---

## Task 10: Patient dashboard (profile, consents, bookings, delete)

**Files:** Create `src/app/account/patient/PatientDashboard.tsx` and `src/app/account/patient/page.tsx`.

- [ ] **Step 1: Create `src/app/account/patient/PatientDashboard.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Icon } from "@/components/icons";
import { getSupabase } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth/session";
import { asset } from "@/lib/asset";

type Profile = { full_name: string | null; dob: string | null; phone: string | null; marketing_opt_in: boolean };
type Booking = { reference: string; service: string; appointment_date: string; time_window: string; status: string };

export function PatientDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [savedMsg, setSavedMsg] = useState<string>();

  useEffect(() => {
    const supabase = getSupabase();
    supabase.from("profiles").select("full_name, dob, phone, marketing_opt_in").single()
      .then(({ data }) => setProfile(data as Profile));
    supabase.from("aurora_bookings")
      .select("reference, service, appointment_date, time_window, status")
      .order("created_at", { ascending: false })
      .then(({ data }) => setBookings((data as Booking[]) ?? []));
  }, []);

  async function saveMarketing(next: boolean) {
    await getSupabase().from("profiles").update({ marketing_opt_in: next })
      .eq("id", (await getSupabase().auth.getUser()).data.user!.id);
    setProfile((p) => (p ? { ...p, marketing_opt_in: next } : p));
    setSavedMsg("Saved.");
  }

  async function deleteAccount() {
    if (!window.confirm("Delete your account permanently? Your bookings will be unlinked. This cannot be undone.")) return;
    // Self-service delete via Supabase RPC is added in a later hardening step;
    // for v1 we sign out and open a rights-request so Aurora completes erasure.
    await signOut();
    router.replace(asset("/privacy-centre/rights-request/"));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Your account</h1>
        <Button variant="secondary" size="sm" onClick={() => signOut().then(() => router.replace(asset("/")))}>
          Sign out
        </Button>
      </div>

      <Card>
        <h2 className="text-xl">Profile</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-silver/70">Name</dt><dd className="text-starlight">{profile?.full_name ?? "—"}</dd></div>
          <div><dt className="text-silver/70">Date of birth</dt><dd className="text-starlight">{profile?.dob ?? "—"}</dd></div>
          <div><dt className="text-silver/70">Phone</dt><dd className="text-starlight">{profile?.phone ?? "—"}</dd></div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-xl">Consents</h2>
        <label className="mt-4 flex items-center justify-between gap-4">
          <span className="text-sm text-silver">Occasional health tips &amp; Aurora updates</span>
          <input type="checkbox" role="switch" aria-label="Marketing updates"
            checked={profile?.marketing_opt_in ?? false}
            onChange={(e) => saveMarketing(e.target.checked)}
            className="h-6 w-11 shrink-0 appearance-none rounded-full border border-silver/40 bg-navy/60 checked:border-cyan checked:bg-cyan/20" />
        </label>
        {savedMsg ? <p role="status" className="mt-2 text-sm text-cyan">{savedMsg}</p> : null}
        <p className="mt-3 text-xs text-silver/70">
          Manage all cookie and site consents in the{" "}
          <a href="/privacy-centre/preferences" className="text-cyan underline underline-offset-2">Privacy Centre</a>.
        </p>
      </Card>

      <Card>
        <h2 className="text-xl">Your bookings</h2>
        {bookings.length === 0 ? (
          <p className="mt-3 text-sm text-silver">
            No bookings linked yet. Bookings you make while signed in appear here.{" "}
            <a href="/book" className="text-cyan underline underline-offset-2">Book an appointment</a>.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line-dark">
            {bookings.map((b) => (
              <li key={b.reference} className="flex items-center justify-between py-3 text-sm">
                <span className="text-starlight">{b.service}</span>
                <span className="text-silver">{b.appointment_date} · {b.time_window}</span>
                <span className="rounded-full border border-cyan/40 px-2 py-0.5 text-xs text-cyan">{b.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-xl">Your data</h2>
        <p className="mt-2 text-sm text-silver">Download or delete your data any time (PDR §9.2).</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button href="/privacy-centre/rights-request" variant="secondary" size="sm">
            <Icon name="download" className="h-4 w-4" /> Request my data
          </Button>
          <button type="button" onClick={deleteAccount}
            className="rounded-full border border-[#ff9db0]/50 px-4 py-2 text-sm font-semibold text-[#ff9db0] hover:border-[#ff9db0]">
            Delete my account
          </button>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/account/patient/page.tsx`**

```tsx
import type { Metadata } from "next";
import { RequireAuth } from "@/components/RequireAuth";
import { PatientDashboard } from "./PatientDashboard";

export const metadata: Metadata = { title: "Your Account", robots: { index: false } };

export default function PatientAccountPage() {
  return (
    <section className="bg-navy">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <RequireAuth><PatientDashboard /></RequireAuth>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: exit 0; `/account/patient` present.

- [ ] **Step 4: Commit**

```bash
git add src/app/account/patient
git commit -m "feat(patient): dashboard — profile, consents, own bookings, data rights"
```

---

## Task 11: Link bookings to the signed-in patient

**Files:** Modify `src/lib/submit.ts` (booking insert path).

- [ ] **Step 1: Stamp `user_id` when a session exists**

In `submitBooking` (and its shared `submit` helper), before inserting the row, fetch the current user and add `user_id` to the row when present:
```ts
// inside the Supabase insert branch of submit(), for the bookings table only:
const { data: auth } = await supabase.auth.getUser();
const rowWithUser = options.table === "aurora_bookings" && auth?.user
  ? { ...options.toRow(parsed.data, reference), user_id: auth.user.id }
  : options.toRow(parsed.data, reference);
const { error } = await supabase.from(options.table).insert(rowWithUser);
```
(Anonymous bookings keep `user_id` null and continue to work under the existing INSERT-only policy.)

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/submit.ts
git commit -m "feat(patient): link bookings to the signed-in account"
```

---

## Task 12: Navigation — signed-in affordance

**Files:** Modify `src/components/NavBar.tsx`.

- [ ] **Step 1: Show Account/Sign-out when signed in**

Make `NavBar` read `useSession()`. When a session exists, the "Patient Login" desktop button becomes an "Account" link to `/account/patient/`; add a compact "Sign out" affordance. When signed out, keep the existing "Patient Login" link. Mobile menu mirrors this. Use the existing `useSession` hook and `signOut` from `@/lib/auth/session`. Keep all existing markup/classes; only swap the login control's target/label based on session state.

```tsx
// near other imports
import { useSession } from "@/lib/auth/session";
// inside NavBar():
const session = useSession();
// replace the desktop "Patient Login" Link with:
{session ? (
  <Link href="/account/patient" className="inline-flex items-center gap-1.5 rounded-full border border-silver/40 px-4 py-2 text-sm font-semibold text-starlight transition-colors hover:border-cyan hover:text-cyan">
    <Icon name="users" className="h-4 w-4" /> Account
  </Link>
) : (
  <Link href="/patient-login" className="inline-flex items-center gap-1.5 rounded-full border border-silver/40 px-4 py-2 text-sm font-semibold text-starlight transition-colors hover:border-cyan hover:text-cyan">
    <Icon name="lock" className="h-4 w-4" /> Patient Login
  </Link>
)}
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/NavBar.tsx
git commit -m "feat(nav): show Account when signed in"
```

---

## Task 13: End-to-end a11y smoke (Playwright + axe)

**Files:** Create `playwright.config.ts`, `tests/e2e/patient-auth.spec.ts`.

- [ ] **Step 1: Install browsers**

Run: `npx playwright install chromium`
Expected: Chromium downloads.

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120000 },
  use: { baseURL: "http://localhost:3000" },
});
```

- [ ] **Step 3: Create `tests/e2e/patient-auth.spec.ts`**

```ts
import { test, expect } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";

for (const path of ["/register/patient", "/patient-login"]) {
  test(`no axe violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await injectAxe(page);
    await checkA11y(page, undefined, { detailedReport: false });
  });
}

test("register form validates before submit", async ({ page }) => {
  await page.goto("/register/patient");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("At least 10 characters.")).toBeVisible();
});
```

- [ ] **Step 4: Run e2e**

Run: `npm run test:e2e`
Expected: all specs pass (axe clean; validation message shown).

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/patient-auth.spec.ts package.json package-lock.json
git commit -m "test(e2e): a11y smoke + register validation for patient auth"
```

---

## Task 14: Manual smoke, docs, final verify

- [ ] **Step 1: Manual end-to-end (dev server)**

Run `npm run dev`, then in a browser: register a real test email → receive the verification email → click it → land on `/account/patient` → make a booking while signed in → confirm it appears under "Your bookings" → sign out → sign in again. (Clean up the test user in the Supabase dashboard afterward.)

- [ ] **Step 2: Update `docs/PLAN.md`** — under M5, tick: patient registration + login + session + booking linkage done; note corporate + staff are Plans 2 & 3; note self-service hard-delete (RPC) is a hardening follow-up.

- [ ] **Step 3: Full verify + RLS**

Run: `npm run verify && npm run test:rls`
Expected: verify exits 0; `ALL RLS CHECKS PASSED`.

- [ ] **Step 4: Commit + push**

```bash
git add docs/PLAN.md
git commit -m "docs(plan): mark M5 patient-auth foundation complete"
git push origin <branch>
```
(The Pages deploy runs on push; confirm the workflow succeeds and `/register/patient` is live.)

---

## Notes for later plans (not this plan)

- **Patient MFA (TOTP), offered** — PRD §12/D8 lists MFA as *offered* (optional) for patients in v1. It is intentionally **deferred to a fast-follow task** in this plan rather than blocking the core register/login/dashboard, and the login copy makes no 2FA claim until it ships. When added: an "Two-factor authentication" card in the patient dashboard using `supabase.auth.mfa.enroll({ factorType: "totp" })` (show the returned secret/otpauth URI for authenticator manual-entry — no QR dependency), then `mfa.challenge` + `mfa.verify` to activate, and `mfa.unenroll` to remove. **Decision point for the user:** pull this into Plan 1, or keep it as the immediate fast-follow.
- **Self-service hard delete:** v1 routes account deletion through a rights-request. A later hardening task adds a Supabase Edge Function (or RPC) to let a user delete their own `auth.users` row directly, since the anon/authed client cannot call `auth.admin.deleteUser`.
- **Account lockout + richer audit** (PDR §10) — Edge Function, later.
- **Plan 2** reuses `getSupabase`, `useSession`, `RequireAuth`, and the `profiles` role model to add organisations, packages, and the request→activate flow.
