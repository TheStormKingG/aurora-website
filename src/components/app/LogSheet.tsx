"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { DEFAULT_SETTINGS, fetchSettings } from "@/lib/health/client";
import type { LogKind, Settings } from "@/lib/health/types";
import { RangeBadge } from "./RangeBadge";
import { useFocusTrap } from "./useFocusTrap";
import { BpForm } from "./forms/BpForm";
import { GlucoseForm } from "./forms/GlucoseForm";
import { CholesterolForm } from "./forms/CholesterolForm";
import { WaterForm } from "./forms/WaterForm";
import { ExerciseForm } from "./forms/ExerciseForm";
import type { SavedInfo } from "./forms/shared";

const kinds: { kind: LogKind; label: string }[] = [
  { kind: "blood_pressure", label: "BP" },
  { kind: "glucose", label: "Sugar" },
  { kind: "cholesterol", label: "Cholesterol" },
  { kind: "water", label: "Water" },
  { kind: "exercise", label: "Exercise" },
];

/** Bottom sheet on phones, centred dialog from md up (spec §9.2). */
export function LogSheet({
  open, kind: initialKind, patientId, onClose, onSaved,
}: { open: boolean; kind: LogKind; patientId: string; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<LogKind>(initialKind);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState<SavedInfo | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, open, onClose);

  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setSaved(null);
    fetchSettings().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS));
  }, [open, initialKind]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  function handleSaved(info: SavedInfo) {
    setSaved(info);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/70 md:items-center" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line-dark bg-indigo p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-3xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-silver/30 md:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between">
          <h2 id="log-title" className="text-xl">Log a reading</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-silver hover:text-starlight">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {saved ? (
          <div className="mt-6 flex flex-col items-start gap-3">
            <p role="status" className="text-starlight">{saved.title}</p>
            {saved.band ? <RangeBadge band={saved.band} /> : null}
            {saved.band?.urgent ? (
              <p className="rounded-xl border border-[#ff9db0]/50 p-3 text-sm text-starlight">{saved.band.urgent}</p>
            ) : null}
            <div className="flex gap-4">
              <button type="button" onClick={() => setSaved(null)} className="text-sm font-medium text-cyan underline-offset-4 hover:underline">
                Log another
              </button>
              <button type="button" onClick={onClose} className="text-sm font-medium text-silver underline-offset-4 hover:underline">
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div role="group" aria-label="What to log" className="mt-4 flex flex-wrap gap-2">
              {kinds.map((k) => (
                <button
                  key={k.kind}
                  type="button"
                  aria-pressed={kind === k.kind}
                  onClick={() => setKind(k.kind)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    kind === k.kind ? "border-cyan bg-cyan text-navy" : "border-silver/30 text-silver hover:border-silver/60"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <div className="mt-5">
              {settings === null ? (
                <p className="text-silver">Loading…</p>
              ) : kind === "blood_pressure" ? (
                <BpForm patientId={patientId} onSaved={handleSaved} />
              ) : kind === "glucose" ? (
                <GlucoseForm patientId={patientId} settings={settings} onSaved={handleSaved} />
              ) : kind === "cholesterol" ? (
                <CholesterolForm patientId={patientId} settings={settings} onSaved={handleSaved} />
              ) : kind === "water" ? (
                <WaterForm patientId={patientId} onSaved={handleSaved} />
              ) : (
                <ExerciseForm patientId={patientId} onSaved={handleSaved} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
