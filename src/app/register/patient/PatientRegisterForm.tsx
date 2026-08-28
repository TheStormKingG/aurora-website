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
