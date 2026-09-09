"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { CheckboxField } from "@/components/forms/fields";
import { HEALTH_NOTICE_VERSION, healthNotice } from "@/content/health-notice";
import { grantConsent } from "@/lib/health/client";
import { healthConsentSchema } from "@/lib/validation/health";
import { useApp } from "./AppContext";

/** GDPR Art. 9(2)(a) explicit consent gate (spec §5). */
export function ConsentScreen() {
  const router = useRouter();
  const { refreshStatus } = useApp();
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = healthConsentSchema.safeParse({ agree });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Tick the box to continue.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await grantConsent();
      await refreshStatus();
      router.replace("/app/");
    } catch {
      setBusy(false);
      setError("Couldn't save your consent. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl">{healthNotice.title}</h1>
        <p className="mt-2 text-silver">{healthNotice.intro}</p>
      </div>
      {healthNotice.sections.map((s) => (
        <section key={s.heading}>
          <h2 className="text-lg text-starlight">{s.heading}</h2>
          <p className="mt-1 text-sm leading-relaxed text-silver">{s.body}</p>
        </section>
      ))}
      <CheckboxField
        id="agree"
        name="agree"
        checked={agree}
        onChange={(e) => setAgree(e.target.checked)}
        error={error}
        label={healthNotice.checkbox}
      />
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : healthNotice.button}</Button>
      <p className="text-xs text-silver/70">
        Notice version {HEALTH_NOTICE_VERSION}. Read the full{" "}
        <a href="/privacy-centre/notice" className="text-cyan underline underline-offset-2">privacy notice</a>.
      </p>
    </form>
  );
}
