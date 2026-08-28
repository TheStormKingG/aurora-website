"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { CheckboxField, TextField } from "@/components/forms/fields";
import { completeProfileSchema, fieldErrors } from "@/lib/validation/schemas";
import { getSupabase } from "@/lib/supabase/client";
import { NOTICE_VERSION } from "@/lib/consent";

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
      if (data && data.dob) router.replace("/account/patient/");
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
    router.replace("/account/patient/");
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
