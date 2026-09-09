"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/icons";
import { fetchDisplayName, loadForExport, logExport } from "@/lib/health/client";
import { buildBundle, exportFilename } from "@/lib/health/fhir-export";
import { useApp } from "./AppContext";

/**
 * GDPR Art. 20 portability (spec §12, PDR §11.5). The bundle is built in
 * the browser from the patient's own rows and saved straight to their
 * device — it is never uploaded anywhere. The download itself is logged
 * (§7), so it appears in their own access history.
 */
export function DownloadMyData({ label = "Download my data" }: { label?: string }) {
  const { status } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();

  async function download() {
    if (!status.patientId) return;
    setBusy(true); setError(undefined); setDone(undefined);
    try {
      const [name, data] = await Promise.all([
        fetchDisplayName().catch(() => null),
        loadForExport(null, status.patientId),
      ]);
      const bundle = buildBundle({ ...data, fullName: name });
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/fhir+json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const count = bundle.entry.length - 1; // minus the Patient entry (spec §12)
      setDone(`Downloaded ${count.toLocaleString("en-GB")} record${count === 1 ? "" : "s"}.`);
      await logExport().catch(() => undefined);
    } catch {
      setError("Couldn't build your download. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={download} disabled={busy}>
          <Icon name="download" className="h-4 w-4" /> {busy ? "Preparing…" : label}
        </Button>
      </div>
      <p className="text-xs text-silver/70">
        A standard health-data file (FHIR) you can give to any clinic. It never leaves your device.
      </p>
      {/* Confirmation, not an action — cyan stays reserved for CTAs (PDR §4.2). */}
      <p role="status" className="text-sm text-[#34d399]">{done ?? ""}</p>
      {error ? <p role="alert" className="text-sm text-[#ff9db0]">{error}</p> : null}
    </div>
  );
}
