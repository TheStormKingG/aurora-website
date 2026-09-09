"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { SelectField, TextField } from "@/components/forms/fields";
import { DEFAULT_SETTINGS, fetchSettings, updateSettings } from "@/lib/health/client";
import type { Settings, Unit } from "@/lib/health/types";

/** Display units and the daily water goal (spec §9.2). Values are stored
 *  canonically in mg/dL; only the display unit changes here. */
export function UnitsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetchSettings().then(setSettings).catch(() => setSettings({ ...DEFAULT_SETTINGS }));
  }, []);

  async function save(patch: Partial<Settings>) {
    setBusy(true); setError(undefined); setMsg(undefined);
    try {
      await updateSettings(patch);
      setSettings((s) => (s ? { ...s, ...patch } : s));
      setMsg("Saved.");
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return <p role="status" className="text-sm text-silver">Loading…</p>;

  const goal = String(settings.water_goal_ml);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField id="glucose_unit" label="Blood sugar unit" value={settings.glucose_unit} disabled={busy}
          onChange={(e) => save({ glucose_unit: e.target.value as Unit })}>
          <option value="mg/dL">mg/dL</option>
          <option value="mmol/L">mmol/L</option>
        </SelectField>
        <SelectField id="cholesterol_unit" label="Cholesterol unit" value={settings.cholesterol_unit} disabled={busy}
          onChange={(e) => save({ cholesterol_unit: e.target.value as Unit })}>
          <option value="mg/dL">mg/dL</option>
          <option value="mmol/L">mmol/L</option>
        </SelectField>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = Number(new FormData(e.currentTarget).get("water_goal_ml"));
          if (!Number.isInteger(v) || v < 500 || v > 6000) { setError("Enter a goal between 500 and 6,000 ml."); return; }
          save({ water_goal_ml: v });
        }}
        noValidate
        className="flex flex-col gap-3"
      >
        <TextField id="water_goal_ml" name="water_goal_ml" type="number" inputMode="numeric" disabled={busy}
          label="Daily water goal (ml)" defaultValue={goal} hint="Between 500 and 6,000 ml." />
        <div className="flex items-center gap-4">
          <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Save goal"}</Button>
        </div>
      </form>
      {/* Confirmation, not an action — green keeps cyan reserved for CTAs
          (RangeBadge's I6 fix applies here too). */}
      <p role="status" className="text-sm text-[#34d399]">{msg ?? ""}</p>
      {error ? <p role="alert" className="text-sm text-[#ff9db0]">{error}</p> : null}
    </div>
  );
}
