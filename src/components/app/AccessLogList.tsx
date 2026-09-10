"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAccessLog, type AccessEvent } from "@/lib/health/client";
import { relativeTime } from "@/lib/health/format";

/** PDR §11.3: the patient can see who opened their record, when and from
 *  where. Written only by the database's own triggers and RPCs — nothing
 *  here can add to it or change it. */
const actionLabel: Record<string, string> = {
  app_open: "Opened the app",
  insert: "Added",
  update: "Changed",
  delete: "Deleted",
  export: "Downloaded your data",
  consent_granted: "You agreed to health tracking",
  consent_withdrawn: "You stopped tracking",
  archive: "Moved older entries to the archive",
  purge: "Deleted your health data",
  read: "Viewed your record",
};

// Only insert/update/delete come from the generic per-row trigger
// (health.log_change, supabase/migrations/20260908100200_health_audit.sql)
// and read naturally with a resource noun appended ("Added a reading").
// Every other action already logs as a complete sentence: archive_old()
// writes one row per *table* (resource in readings/water_intake/
// exercise_sessions), so appending the table name turned "Moved older
// entries to the archive" into a fragment; grant_consent/withdraw_consent
// always log resource='consents', which just repeated the sentence
// ("You agreed to health tracking your consent"). Confirmed against
// …100200_health_audit.sql and …100300_health_retention.sql.
const RESOURCED_ACTIONS = new Set(["insert", "update", "delete"]);

const resourceLabel: Record<string, string> = {
  readings: "a reading",
  water_intake: "a water entry",
  exercise_sessions: "an exercise session",
  profile_entries: "a health-record entry",
  settings: "your settings",
};

function describe(e: AccessEvent): string {
  const base = actionLabel[e.action] ?? e.action;
  if (!RESOURCED_ACTIONS.has(e.action)) return base;
  const what = e.resource ? resourceLabel[e.resource] ?? e.resource : "";
  return what ? `${base} ${what}` : base;
}

function device(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/iPhone|iPad/i.test(ua)) return "iPhone or iPad";
  if (/Android/i.test(ua)) return "Android phone";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  return "Other device";
}

export function AccessLogList() {
  const [rows, setRows] = useState<AccessEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setError(false);
    fetchAccessLog()
      .then((r) => { if (live) setRows(r); })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [tick]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">Who has accessed my data</h1>
      <p className="text-sm text-silver">
        Every time your health record is opened or changed, it is recorded here. Aurora cannot edit or remove these entries.{" "}
        <Link href="/app/more" className="text-cyan underline underline-offset-2">Back to More</Link>
      </p>

      {error ? (
        <div>
          <p role="alert" className="text-sm text-[#ff9db0]">Couldn&rsquo;t load your access history.</p>
          <button type="button" onClick={() => setTick((t) => t + 1)}
            className="motion-press mt-3 inline-flex min-h-11 items-center rounded-full border border-cyan/60 px-4 text-sm font-semibold text-cyan hover:border-cyan">
            Try again
          </button>
        </div>
      ) : rows === null ? (
        <p role="status" className="text-sm text-silver">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-silver">Nothing recorded yet.</p>
      ) : (
        <ul className="divide-y divide-line-dark">
          {rows.map((e) => (
            <li key={e.id} className="py-3">
              <p className="text-sm text-starlight">{describe(e)}</p>
              <p className="mt-0.5 text-xs text-silver/80">
                {e.actor_role === "patient" ? "You" : e.actor_role === "system" ? "Aurora system" : "Aurora staff"}
                {" · "}{relativeTime(e.at)}
                {" · "}{device(e.user_agent)}
                {e.ip ? ` · ${e.ip}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
