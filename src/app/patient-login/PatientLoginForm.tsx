"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { GoogleButton } from "@/components/GoogleButton";
import { TextField } from "@/components/forms/fields";
import { signIn, sendPasswordReset } from "@/lib/auth/patient";

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
    if (r.ok) router.replace("/account/patient/");
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
    </div>
  );
}
