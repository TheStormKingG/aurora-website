"use client";

import { Button } from "@/components/Button";
import { TextAreaField, TextField } from "@/components/forms/fields";
import { toDatetimeLocal } from "@/lib/health/format";
import type { Band } from "@/lib/health/ranges";
import { useOnline } from "../OfflineBanner";

export type SavedInfo = { title: string; band?: Band };

/** Number from a form field; undefined when blank, NaN when not a number. */
export function num(fd: FormData, name: string): number | undefined {
  const raw = String(fd.get(name) ?? "").trim();
  return raw === "" ? undefined : Number(raw);
}

export function str(fd: FormData, name: string): string {
  return String(fd.get(name) ?? "").trim();
}

export const SAVE_ERROR = "Couldn't save. Check your connection and try again.";

export function WhenField({ error }: { error?: string }) {
  const now = new Date();
  const min = new Date(now.getTime() - 30 * 86_400_000);
  return (
    <TextField
      id="recordedAt" name="recordedAt" type="datetime-local" label="When"
      defaultValue={toDatetimeLocal(now)} max={toDatetimeLocal(now)} min={toDatetimeLocal(min)}
      error={error}
    />
  );
}

export function NoteField({ error }: { error?: string }) {
  return <TextAreaField id="note" name="note" label="Note" optional rows={2} maxLength={300} error={error} />;
}

export function SaveRow({ busy, error }: { busy: boolean; error?: string }) {
  const online = useOnline();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button type="submit" disabled={busy || !online}>{busy ? "Saving…" : online ? "Save" : "Offline"}</Button>
      {error ? <p role="alert" className="text-sm font-medium text-[#ff9db0]">{error}</p> : null}
    </div>
  );
}
