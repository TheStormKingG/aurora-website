"use client";

import { useState } from "react";
import { SelectField, TextField } from "@/components/forms/fields";
import { insertReading, updateSettings } from "@/lib/health/client";
import { fromDatetimeLocal } from "@/lib/health/format";
import { glucoseBand } from "@/lib/health/ranges";
import type { Settings } from "@/lib/health/types";
import { GLUCOSE_FACTOR, toMgdl } from "@/lib/health/units";
import { glucoseReadingSchema } from "@/lib/validation/health";
import { fieldErrors } from "@/lib/validation/schemas";
import { NoteField, SAVE_ERROR, SaveRow, WhenField, num, str, type SavedInfo } from "./shared";

export function GlucoseForm({
  patientId, settings, onSaved,
}: { patientId: string; settings: Settings; onSaved: (info: SavedInfo) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = glucoseReadingSchema.safeParse({
      value: num(fd, "value"), unit: str(fd, "unit"), context: str(fd, "context"),
      recordedAt: fromDatetimeLocal(str(fd, "recordedAt")), note: str(fd, "note"),
    });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setBusy(true); setFormError(undefined);
    const d = parsed.data;
    const mgdl = toMgdl(d.value, d.unit, GLUCOSE_FACTOR);
    try {
      await insertReading({
        patient_id: patientId, kind: "glucose", recorded_at: d.recordedAt,
        glucose_mgdl: mgdl, glucose_context: d.context, entered_unit: d.unit, note: d.note || null,
      });
      if (d.unit !== settings.glucose_unit) await updateSettings({ glucose_unit: d.unit });
      onSaved({ title: `Blood sugar ${d.value} ${d.unit} saved`, band: glucoseBand(mgdl, d.context) });
    } catch {
      setBusy(false);
      setFormError(SAVE_ERROR);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <TextField id="value" name="value" type="number" step="0.1" inputMode="decimal" label="Blood sugar"
          placeholder={settings.glucose_unit === "mg/dL" ? "104" : "5.8"} error={errors.value} />
        <SelectField id="unit" name="unit" label="Unit" defaultValue={settings.glucose_unit} error={errors.unit}>
          <option value="mg/dL">mg/dL</option>
          <option value="mmol/L">mmol/L</option>
        </SelectField>
      </div>
      <SelectField id="context" name="context" label="When did you test?" defaultValue="fasting" error={errors.context}>
        <option value="fasting">Fasting (before eating)</option>
        <option value="after_meal">After a meal</option>
        <option value="random">Random</option>
        <option value="bedtime">Bedtime</option>
      </SelectField>
      <WhenField error={errors.recordedAt} />
      <NoteField error={errors.note} />
      <SaveRow busy={busy} error={formError} />
    </form>
  );
}
