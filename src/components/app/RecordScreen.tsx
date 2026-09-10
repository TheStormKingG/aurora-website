"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CheckboxField, TextAreaField, TextField } from "@/components/forms/fields";
import {
  deleteRow, fetchProfileEntries, insertProfileEntry, updateProfileEntry,
} from "@/lib/health/client";
import type { ExportProfileEntry } from "@/lib/health/fhir-export";
import { profileEntrySchema } from "@/lib/validation/health";
import { fieldErrors } from "@/lib/validation/schemas";
import { useApp } from "./AppContext";

type Category = ExportProfileEntry["category"];
const SECTIONS: { key: Category; title: string; blurb: string; current?: boolean }[] = [
  { key: "condition", title: "Conditions", blurb: "Anything you are being treated for, or have been.", current: true },
  { key: "surgery", title: "Surgeries", blurb: "Operations you have had." },
  { key: "medication", title: "Medications", blurb: "What you take, including anything over the counter.", current: true },
  { key: "allergy", title: "Allergies", blurb: "Medicines, foods or anything else you react to.", current: true },
  { key: "family_history", title: "Family history", blurb: "Conditions that run in your family." },
];

function EntryForm({
  section, entry, onCancel, onSaved,
}: {
  section: (typeof SECTIONS)[number];
  entry?: ExportProfileEntry;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { status } = useApp();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();
  const idp = `${section.key}-${entry?.id ?? "new"}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = profileEntrySchema.safeParse({
      category: section.key,
      label: String(fd.get("label") ?? "").trim(),
      detail: String(fd.get("detail") ?? "").trim() || null,
      occurredOn: String(fd.get("occurredOn") ?? ""),
      isCurrent: section.current ? fd.get("isCurrent") === "on" : true,
    });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({}); setBusy(true); setFormError(undefined);
    const d = parsed.data;
    const row = {
      category: d.category, label: d.label, detail: d.detail ?? null,
      occurred_on: d.occurredOn ? d.occurredOn : null, is_current: d.isCurrent,
    };
    try {
      if (entry) {
        await updateProfileEntry(entry.id, row);
      } else {
        // A missing patient id used to fall through both branches and
        // still call onSaved(): the form closed, the list refetched, and
        // what the patient had just typed was gone with no error shown.
        // The consent gate should make this unreachable — but silent data
        // loss is the wrong way to find out that it is not.
        if (!status.patientId) throw new Error("no patient id");
        await insertProfileEntry(status.patientId, row);
      }
      onSaved();
    } catch {
      setBusy(false);
      setFormError("Couldn't save. Check your connection and try again.");
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-4 rounded-xl border border-line-dark p-4">
      <TextField id={`${idp}-label`} name="label" label="Name" defaultValue={entry?.label ?? ""} error={errors.label} />
      <TextAreaField id={`${idp}-detail`} name="detail" label="Detail" optional rows={2} maxLength={500}
        defaultValue={entry?.detail ?? ""} error={errors.detail} />
      <TextField id={`${idp}-occurredOn`} name="occurredOn" type="date" label="Date" optional max={today}
        defaultValue={entry?.occurred_on ?? ""} error={errors.occurredOn} />
      {section.current ? (
        <CheckboxField id={`${idp}-isCurrent`} name="isCurrent" defaultChecked={entry?.is_current ?? true}
          label="This is current" />
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : entry ? "Save changes" : "Add"}</Button>
        <button type="button" onClick={onCancel}
          className="inline-flex min-h-11 items-center text-sm font-medium text-silver underline-offset-4 hover:text-starlight hover:underline">
          Cancel
        </button>
        {formError ? <p role="alert" className="text-sm text-[#ff9db0]">{formError}</p> : null}
      </div>
    </form>
  );
}

export function RecordScreen() {
  const [entries, setEntries] = useState<ExportProfileEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<string | null>(null); // `${category}` for add, `edit:${id}` for edit
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let live = true;
    setError(false);
    fetchProfileEntries()
      .then((r) => { if (live) { setEntries(r); setOpen(null); } })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [tick]);

  async function remove(id: string, label: string) {
    if (!window.confirm(`Remove “${label}” from your record?`)) return;
    try { await deleteRow("profile_entries", id); reload(); }
    catch { setError(true); }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Health record</h1>
      <p className="text-sm text-silver">
        Keep this up to date so your nurse has the full picture. Only you can see it today.
      </p>

      {error ? (
        <div>
          <p role="alert" className="text-sm text-[#ff9db0]">Couldn&rsquo;t load your record.</p>
          <button type="button" onClick={reload}
            className="motion-press mt-3 inline-flex min-h-11 items-center rounded-full border border-cyan/60 px-4 text-sm font-semibold text-cyan hover:border-cyan">
            Try again
          </button>
        </div>
      ) : entries === null ? (
        <p role="status" className="text-sm text-silver">Loading…</p>
      ) : (
        SECTIONS.map((section) => {
          const mine = entries.filter((e) => e.category === section.key);
          return (
            <Card key={section.key}>
              <h2 className="text-lg">{section.title}</h2>
              <p className="mt-1 text-sm text-silver">{section.blurb}</p>

              {mine.length === 0 ? (
                <p className="mt-3 text-sm text-silver/80">Nothing recorded yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line-dark">
                  {mine.map((e) => (
                    <li key={e.id} className="py-3">
                      {open === `edit:${e.id}` ? (
                        <EntryForm section={section} entry={e} onCancel={() => setOpen(null)} onSaved={reload} />
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-starlight">
                              {e.label}
                              {section.current && !e.is_current ? <span className="ml-2 text-xs text-silver/80">(past)</span> : null}
                            </p>
                            {e.detail ? <p className="mt-0.5 text-sm text-silver">{e.detail}</p> : null}
                            {e.occurred_on ? <p className="mt-0.5 text-xs text-silver/70">{e.occurred_on}</p> : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button type="button" onClick={() => setOpen(`edit:${e.id}`)}
                              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-cyan underline-offset-4 hover:underline">
                              Edit<span className="sr-only"> {e.label}</span>
                            </button>
                            <button type="button" onClick={() => remove(e.id, e.label)}
                              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-[#ff9db0] underline-offset-4 hover:underline">
                              Remove<span className="sr-only"> {e.label}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {open === section.key ? (
                <EntryForm section={section} onCancel={() => setOpen(null)} onSaved={reload} />
              ) : (
                <button type="button" onClick={() => setOpen(section.key)}
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-cyan underline-offset-4 hover:underline">
                  Add {section.title.toLowerCase().replace(/ies$/, "y").replace(/s$/, "")}
                </button>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}