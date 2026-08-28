"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { TextField } from "@/components/forms/fields";
import { updatePassword } from "@/lib/auth/patient";

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
    if (r.ok) router.replace("/account/patient/");
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
