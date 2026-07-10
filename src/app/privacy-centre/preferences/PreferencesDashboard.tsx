"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Icon } from "@/components/icons";
import {
  makeConsentRecord,
  mostPrivateScope,
  NOTICE_VERSION,
  readConsentCookie,
  writeConsentCookie,
  type ConsentRecord,
  type ConsentScope,
} from "@/lib/consent";

/**
 * Consent-preferences dashboard (PDR §6.1/§8): granular per purpose,
 * most-private defaults, one-step withdrawal, and a visible record of
 * when consent was captured and against which notice version.
 */

const purposes: {
  key: keyof ConsentScope;
  title: string;
  body: string;
}[] = [
  {
    key: "functional",
    title: "Functional preferences",
    body: "Lets the site remember interface choices you make (like a dismissed banner) on this device. No tracking involved.",
  },
  {
    key: "analytics",
    title: "First-party analytics",
    body: "Would help us count visits and improve pages using aggregated, cookieless-by-default measurements we run ourselves. Not active yet — your choice is honoured before anything ever runs.",
  },
];

export function PreferencesDashboard() {
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [scope, setScope] = useState<ConsentScope>(mostPrivateScope);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const existing = readConsentCookie();
    setRecord(existing);
    setScope(existing?.scope ?? mostPrivateScope);
    setLoaded(true);
  }, []);

  const save = (next: ConsentScope) => {
    const rec = makeConsentRecord(next);
    writeConsentCookie(rec);
    setRecord(rec);
    setScope(next);
    setSaved(true);
  };

  if (!loaded) {
    return <p className="text-silver">Loading your current choices…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Current record — timestamp + notice version + scope (PDR §9.1) */}
      <Card>
        <h2 className="text-lg">Your current consent record</h2>
        {record ? (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-starlight">Captured</dt>
              <dd className="text-silver">
                {new Date(record.timestamp).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-starlight">Notice version</dt>
              <dd className="text-silver">{record.version}</dd>
            </div>
            <div>
              <dt className="font-semibold text-starlight">Allowed purposes</dt>
              <dd className="text-silver">
                {Object.entries(record.scope)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(", ") || "None (most private)"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-silver">
            No consent recorded on this device yet — everything non-essential is off (the
            default). Current notice version: {NOTICE_VERSION}.
          </p>
        )}
      </Card>

      {/* Purpose toggles */}
      <fieldset className="flex flex-col gap-4">
        <legend className="sr-only">Consent purposes</legend>
        {purposes.map((p) => (
          <Card key={p.key}>
            <div className="flex items-start justify-between gap-6">
              <div>
                <h3 className="text-lg">{p.title}</h3>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-silver">{p.body}</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-3">
                <span className="text-sm font-semibold text-silver">
                  {scope[p.key] ? "On" : "Off"}
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={p.title}
                  checked={scope[p.key]}
                  onChange={(e) => {
                    setSaved(false);
                    setScope((s) => ({ ...s, [p.key]: e.target.checked }));
                  }}
                  className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full border border-silver/40 bg-navy/60 transition-colors before:absolute before:left-1 before:top-1 before:h-[1.15rem] before:w-[1.15rem] before:rounded-full before:bg-silver before:transition-transform checked:border-cyan checked:bg-cyan/20 checked:before:translate-x-5 checked:before:bg-cyan"
                />
              </label>
            </div>
          </Card>
        ))}
      </fieldset>

      <Card>
        <h3 className="text-lg">Strictly necessary</h3>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-silver">
          One first-party cookie stores the choices you make on this page. It cannot be turned
          off because it is how your &ldquo;no&rdquo; is remembered — details in the{" "}
          <a href="/privacy-centre/cookies" className="text-cyan underline underline-offset-2">
            cookie policy
          </a>
          .
        </p>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" onClick={() => save(scope)}>
          Save my choices
        </Button>
        {/* One-step withdrawal (PDR §8.1) */}
        <Button type="button" variant="secondary" onClick={() => save(mostPrivateScope)}>
          Withdraw all consent
        </Button>
        {saved ? (
          <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan">
            <Icon name="check" className="h-4 w-4" /> Saved — effective immediately.
          </p>
        ) : null}
      </div>
    </div>
  );
}
