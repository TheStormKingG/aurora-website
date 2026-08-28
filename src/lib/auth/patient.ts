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

  // Record consent. If email confirmation is required there may be no session
  // yet; the /auth/callback page captures it on first authed load in that case.
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

export async function signInWithGoogle(): Promise<AuthResult> {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${authRedirectBase()}/auth/callback/` },
  });
  // On success the browser redirects to Google; an error means it never left.
  return error ? { ok: false, error: error.message } : { ok: true };
}
