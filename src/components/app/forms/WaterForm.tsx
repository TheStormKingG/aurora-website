"use client";

import { useState } from "react";
import { TextField } from "@/components/forms/fields";
import { insertWater } from "@/lib/health/client";
import { fromDatetimeLocal } from "@/lib/health/format";
import { waterSchema } from "@/lib/validation/health";
import { fieldErrors } from "@/lib/validation/schemas";
import { SAVE_ERROR, SaveRow, WhenField, num, str, type SavedInfo } from "./shared";

export function WaterForm({ patientId, onSaved }: { patientId: string; onSaved: (info: SavedInfo) => void }) {
  const [ml, setMl] = useState("250");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = waterSchema.safeParse({ ml: num(fd, "ml"), recordedAt: fromDatetimeLocal(str(fd, "recordedAt")) });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setBusy(true); setFormError(undefined);
    try {
      await insertWater({ patient_id: patientId, ml: parsed.data.ml, recorded_at: parsed.data.recordedAt });
      onSaved({ title: `${parsed.data.ml} ml of water saved` });
    } catch {
      setBusy(false);
      setFormError(SAVE_ERROR);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div role="group" aria-label="Quick amounts" className="flex flex-wrap gap-2">
        {[250, 500, 750].map((n) => (
          <button key={n} type="button" onClick={() => setMl(String(n))} aria-pressed={ml === String(n)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${ml === String(n) ? "border-cyan bg-cyan text-navy" : "border-silver/30 text-silver hover:border-silver/60"}`}>
            {n} ml
          </button>
        ))}
      </div>
      <TextField id="ml" name="ml" type="number" inputMode="numeric" label="Amount (ml)" value={ml}
        onChange={(e) => setMl(e.target.value)} error={errors.ml} />
      <WhenField error={errors.recordedAt} />
      <SaveRow busy={busy} error={formError} />
    </form>
  );
}
