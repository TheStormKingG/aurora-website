"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMyHealthData, grantConsent, withdrawConsent } from "@/lib/health/client";
import { useApp } from "./AppContext";
import { DownloadMyData } from "./DownloadMyData";

type Pending = null | "withdraw" | "delete";

/** Spec §8. Withdrawing stops writes immediately and schedules deletion
 *  30 days out; Resume cancels it. Delete now purges at once. */
export function ConsentPanel() {
  const { status, refreshStatus } = useApp();
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const withdrawn = status.activeVersion === null;
  const deleteAfter = status.deleteAfter
    ? new Date(status.deleteAfter).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  async function run(action: () => Promise<void>, after: "refresh" | "leave") {
    setBusy(true); setError(undefined);
    try {
      await action();
      if (after === "leave") { router.replace("/account/patient/"); return; }
      await refreshStatus();
      setPending(null);
    } catch {
      setError("That didn't go through. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (withdrawn) {
    return (
      <div className="mt-4 rounded-xl border border-[#f5c451]/40 bg-[#f5c451]/10 p-4">
        {/* role="status": this replaces the confirm panel the moment withdraw
            succeeds (same pattern as LogSheet's post-save message) — the
            patient needs to be told tracking actually stopped, not just see
            the panel change shape. */}
        <p role="status" className="text-sm text-starlight">
          Tracking is stopped. Your health data {deleteAfter ? `will be deleted on ${deleteAfter}` : "will be deleted shortly"} unless you resume before then.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy} onClick={() => run(async () => { await grantConsent(); }, "refresh")}
            className="motion-press inline-flex min-h-11 items-center rounded-full bg-cyan px-4 text-sm font-semibold text-navy hover:bg-blue disabled:opacity-50">
            {busy ? "Resuming…" : "Resume tracking"}
          </button>
          <DownloadMyData label="Download before it goes" />
        </div>
        {error ? <p role="alert" className="mt-2 text-sm text-[#ff9db0]">{error}</p> : null}
      </div>
    );
  }

  if (pending) {
    const isDelete = pending === "delete";
    return (
      <div className="mt-4 rounded-xl border border-[#ff9db0]/50 p-4">
        <p className="text-sm text-starlight">
          {isDelete
            ? "This deletes every reading, water and exercise entry, and everything in your health record, right now. It cannot be undone."
            : "Tracking stops immediately and your health data is deleted 30 days from now. You can resume any time before then."}
        </p>
        <p className="mt-2 text-sm text-silver">Download a copy first if you want to keep it.</p>
        <div className="mt-3"><DownloadMyData label="Download my data first" /></div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy}
            onClick={() => run(isDelete ? deleteMyHealthData : withdrawConsent, isDelete ? "leave" : "refresh")}
            className="motion-press inline-flex min-h-11 items-center rounded-full border border-[#ff9db0] px-4 text-sm font-semibold text-[#ff9db0] hover:bg-[#ff9db0]/10 disabled:opacity-50">
            {busy ? "Working…" : isDelete ? "Yes, delete everything" : "Yes, stop tracking"}
          </button>
          <button type="button" disabled={busy} onClick={() => setPending(null)}
            className="inline-flex min-h-11 items-center text-sm font-medium text-silver underline-offset-4 hover:text-starlight hover:underline">
            Cancel
          </button>
        </div>
        {error ? <p role="alert" className="mt-2 text-sm text-[#ff9db0]">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => setPending("withdraw")}
        className="inline-flex min-h-11 items-center rounded-full border border-silver/40 px-4 text-sm font-semibold text-starlight hover:border-silver">
        Stop tracking
      </button>
      <button type="button" onClick={() => setPending("delete")}
        className="inline-flex min-h-11 items-center rounded-full border border-[#ff9db0]/50 px-4 text-sm font-semibold text-[#ff9db0] hover:border-[#ff9db0]">
        Delete my health data
      </button>
    </div>
  );
}
