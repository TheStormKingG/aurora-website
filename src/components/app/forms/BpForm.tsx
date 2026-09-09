"use client";

import { useState } from "react";
import { TextField } from "@/components/forms/fields";
import { insertReading } from "@/lib/health/client";
import { fromDatetimeLocal } from "@/lib/health/format";
import { bpBand } from "@/lib/health/ranges";
import { bpReadingSchema } from "@/lib/validation/health";
import { fieldErrors } from "@/lib/validation/schemas";
import { NoteField, SAVE_ERROR, SaveRow, WhenField, num, str, type SavedInfo } from "./shared";

export function BpForm({ patientId, onSaved }: { patientId: string; onSaved: (info: SavedInfo) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = bpReadingSchema.safeParse({
      systolic: num(fd, "systolic"), diastolic: num(fd, "diastolic"), pulse: num(fd, "pulse"),
      recordedAt: fromDatetimeLocal(str(fd, "recordedAt")), note: str(fd, "note"),
    });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setBusy(true); setFormError(undefined);
    const d = parsed.data;
    try {
      await insertReading({
        patient_id: patientId, kind: "blood_pressure", recorded_at: d.recordedAt,
        systolic: d.systolic, diastolic: d.diastolic, pulse: d.pulse ?? null, note: d.note || null,
      });
      onSaved({ title: `Blood pressure ${d.systolic}/${d.diastolic} saved`, band: bpBand(d.systolic, d.diastolic) });
    } catch {
      setBusy(false);
      setFormError(SAVE_ERROR);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <TextField id="systolic" name="systolic" type="number" inputMode="numeric" label="Systolic (top)" placeholder="120" error={errors.systolic} />
        <TextField id="diastolic" name="diastolic" type="number" inputMode="numeric" label="Diastolic (bottom)" placeholder="80" error={errors.diastolic} />
      </div>
      <TextField id="pulse" name="pulse" type="number" inputMode="numeric" label="Pulse (bpm)" optional placeholder="72" error={errors.pulse} />
      <WhenField error={errors.recordedAt} />
      <NoteField error={errors.note} />
      <SaveRow busy={busy} error={formError} />
    </form>
  );
}
