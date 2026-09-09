"use client";

import { useState } from "react";
import { SelectField, TextField } from "@/components/forms/fields";
import { insertReading, updateSettings } from "@/lib/health/client";
import { fromDatetimeLocal } from "@/lib/health/format";
import { cholesterolBand } from "@/lib/health/ranges";
import type { Settings } from "@/lib/health/types";
import { CHOLESTEROL_FACTOR, TRIGLYCERIDE_FACTOR, toMgdl } from "@/lib/health/units";
import { cholesterolReadingSchema } from "@/lib/validation/health";
import { fieldErrors } from "@/lib/validation/schemas";
import { NoteField, SAVE_ERROR, SaveRow, WhenField, num, str, type SavedInfo } from "./shared";

export function CholesterolForm({
  patientId, settings, onSaved,
}: { patientId: string; settings: Settings; onSaved: (info: SavedInfo) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = cholesterolReadingSchema.safeParse({
      total: num(fd, "total"), ldl: num(fd, "ldl"), hdl: num(fd, "hdl"), triglycerides: num(fd, "triglycerides"),
      unit: str(fd, "unit"), recordedAt: fromDatetimeLocal(str(fd, "recordedAt")), note: str(fd, "note"),
    });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setBusy(true); setFormError(undefined);
    const d = parsed.data;
    const conv = (v: number | undefined, factor: number) => (v === undefined ? null : toMgdl(v, d.unit, factor));
    const total = toMgdl(d.total, d.unit, CHOLESTEROL_FACTOR);
    try {
      await insertReading({
        patient_id: patientId, kind: "cholesterol", recorded_at: d.recordedAt,
        chol_total_mgdl: total,
        chol_ldl_mgdl: conv(d.ldl, CHOLESTEROL_FACTOR),
        chol_hdl_mgdl: conv(d.hdl, CHOLESTEROL_FACTOR),
        chol_trig_mgdl: conv(d.triglycerides, TRIGLYCERIDE_FACTOR),
        entered_unit: d.unit, note: d.note || null,
      });
      if (d.unit !== settings.cholesterol_unit) await updateSettings({ cholesterol_unit: d.unit });
      onSaved({ title: `Cholesterol ${d.total} ${d.unit} saved`, band: cholesterolBand(total) });
    } catch {
      setBusy(false);
      setFormError(SAVE_ERROR);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <TextField id="total" name="total" type="number" step="0.1" inputMode="decimal" label="Total cholesterol"
          placeholder={settings.cholesterol_unit === "mg/dL" ? "180" : "4.7"} error={errors.total} />
        <SelectField id="unit" name="unit" label="Unit" defaultValue={settings.cholesterol_unit} error={errors.unit}>
          <option value="mg/dL">mg/dL</option>
          <option value="mmol/L">mmol/L</option>
        </SelectField>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <TextField id="ldl" name="ldl" type="number" step="0.1" inputMode="decimal" label="LDL" optional error={errors.ldl} />
        <TextField id="hdl" name="hdl" type="number" step="0.1" inputMode="decimal" label="HDL" optional error={errors.hdl} />
        <TextField id="triglycerides" name="triglycerides" type="number" step="0.1" inputMode="decimal" label="Triglycerides" optional error={errors.triglycerides} />
      </div>
      <WhenField error={errors.recordedAt} />
      <NoteField error={errors.note} />
      <SaveRow busy={busy} error={formError} />
    </form>
  );
}
