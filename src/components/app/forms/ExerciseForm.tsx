"use client";

import { useState } from "react";
import { SelectField, TextField } from "@/components/forms/fields";
import { insertExercise } from "@/lib/health/client";
import { fromDatetimeLocal } from "@/lib/health/format";
import { exerciseSchema } from "@/lib/validation/health";
import { fieldErrors } from "@/lib/validation/schemas";
import { NoteField, SAVE_ERROR, SaveRow, WhenField, num, str, type SavedInfo } from "./shared";

const activities: [string, string][] = [
  ["walk", "Walk"], ["run", "Run"], ["cycle", "Cycle"], ["swim", "Swim"],
  ["strength", "Strength"], ["rehab", "Rehab exercises"], ["other", "Other"],
];

export function ExerciseForm({ patientId, onSaved }: { patientId: string; onSaved: (info: SavedInfo) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = exerciseSchema.safeParse({
      activity: str(fd, "activity"), minutes: num(fd, "minutes"),
      intensity: str(fd, "intensity") || undefined,
      note: str(fd, "note"), recordedAt: fromDatetimeLocal(str(fd, "recordedAt")),
    });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setBusy(true); setFormError(undefined);
    const d = parsed.data;
    try {
      await insertExercise({
        patient_id: patientId, activity: d.activity, minutes: d.minutes,
        intensity: d.intensity ?? null, note: d.note || null, recorded_at: d.recordedAt,
      });
      onSaved({ title: `${d.minutes} min of exercise saved` });
    } catch {
      setBusy(false);
      setFormError(SAVE_ERROR);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <SelectField id="activity" name="activity" label="Activity" defaultValue="walk" error={errors.activity}>
        {activities.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </SelectField>
      <div className="grid grid-cols-2 gap-3">
        <TextField id="minutes" name="minutes" type="number" inputMode="numeric" label="Minutes" placeholder="30" error={errors.minutes} />
        <SelectField id="intensity" name="intensity" label="Intensity" optional defaultValue="" error={errors.intensity}>
          <option value="">Not sure</option>
          <option value="light">Light</option>
          <option value="moderate">Moderate</option>
          <option value="vigorous">Vigorous</option>
        </SelectField>
      </div>
      <WhenField error={errors.recordedAt} />
      <NoteField error={errors.note} />
      <SaveRow busy={busy} error={formError} />
    </form>
  );
}
