# Aurora Health App — Plan 2 of 2: Trends, Record, More, and installability

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the three stub tabs in the live patient app — Trends, Record and More — and make the app installable to a phone's home screen.

**Architecture:** Unchanged from Plan 1. Static Next.js export on GitHub Pages; the app is client-rendered under `/app/` and talks to the live `health` Postgres schema through the browser Supabase client as the signed-in patient. RLS, the consent gate and the audit log are already in place and are the security boundary — Plan 2 adds no new tables and no new SQL. It adds read/delete paths the policies already permit, three screens, a FHIR export, and PWA plumbing.

**Tech Stack:** Next.js 15.5 App Router (`output: "export"`, `trailingSlash: true`), TypeScript strict, Tailwind v4, Zod v4, `@supabase/supabase-js` 2.110 (typed against `src/lib/supabase/database.types.ts`), Vitest 2, Playwright + axe-playwright, Pillow 12 for icon generation.

**Spec:** `docs/superpowers/specs/2026-09-08-health-app-design.md` — §8 (withdrawal, deletion), §9.1 (shell, install, service worker), §9.2 (Trends, Record, More), §10 (bands, disclaimer), §12 (FHIR export), §13 (privacy mapping). **Plan 1:** `docs/superpowers/plans/2026-09-08-health-app-foundation.md` — merged and live.

---

## Why this matters more than it looks

The consent screen a patient agrees to says, in Aurora's own words: *"You can download your data, delete it, or withdraw this permission at any time from More."* **More is currently a stub.** Until this plan lands, the app makes a data-protection promise it cannot keep. Treat the More screen as the priority of this plan, not the last item.

## Reviewers: check against the spec, not this plan

Every step below carries complete code. That makes transcription reliable and review tautological — "does the code match the plan?" answers nothing when the plan *is* the code. When reviewing any task, the reference is **the design spec, the live database contract in `supabase/migrations/20260908*.sql`, and the existing code being extended** — never this plan's code block. This plan may itself be wrong.

## What is already built (do not rebuild)

- `src/lib/health/{types,ranges,units,format,consent}.ts`, `src/lib/validation/health.ts` — pure, unit-tested.
- `src/lib/health/client.ts` — typed against the generated schema. Existing exports: `health()`, `fetchStatus`, `grantConsent`, `logAppOpen(patientId)`, `fetchSettings`, `updateSettings(patch)`, `insertReading`, `insertWater`, `insertExercise`, `loadToday`, `DEFAULT_SETTINGS`.
- `src/components/app/` — `AppShell`, `AppContext` (`status`, `refreshStatus`, `openLog`, `version`, `bump`, `session`), `TopBar`, `TabBar`, `OfflineBanner`, `ConsentScreen`, `TodayScreen`, `MetricCard`, `RangeBadge`, `WaterCard`, `LogSheet` + five forms, `useFocusTrap`.
- Database: `health` schema with RLS, consent gate, audit log, archive and purge jobs, and the RPCs `my_status`, `grant_consent`, `withdraw_consent`, `log_app_open`, `log_export`, `delete_my_health_data`.

## Conventions every task follows

- Branch `feat/health-app-2` (Task 0). Commit after every task with the message given.
- **Never wrap a `router.push`/`router.replace` path in `asset()`** — Next's router already applies `basePath`; wrapping double-applies it and 404s in production. `asset()` is for `next/image` string `src` and other non-router URLs only.
- Tailwind v4 brand tokens: `navy`, `navy-soft`, `indigo`, `cyan`, `blue`, `silver`, `starlight`, `line-dark`; fonts `font-heading`, `font-body`. **Aurora Cyan is the only call-to-action colour** — status colours (amber `#f5c451`, rose `#ff9db0`, green `#34d399`) are semantic, never CTAs. Destructive actions use rose.
- Mobile-first at 375px; **touch targets ≥44px**; anything fixed to the bottom clears `env(safe-area-inset-bottom)`.
- Accessibility is a blocking acceptance criterion (PDR §12, WCAG 2.2 AA). Use the primitives in `src/components/forms/fields.tsx`; give every screen exactly one `h1` (the shell moves focus to it on tab change); announce state changes through a live region that is already mounted.
- TypeScript strict. Match the existing comment voice: short, explaining *why*, often citing the spec or PDR section. No narration comments.
- Append to every commit message, after a blank line: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
- Run `npm run typecheck` as you go. Never run `npm run build` while a dev server is live — it has corrupted `.next` in this project.
- **SQL helper** for one-off checks: `python3 "/private/tmp/claude-501/-Users-stefangravesande-Documents-Projects-Routines-Claude/bf2da734-279e-4699-b244-1b1a654d1d69/scratchpad/sbq.py" "select 1"`.

---

### Task 0: Branch and baseline

**Files:** none

- [ ] **Step 1: Branch from the current main**

```bash
cd "/Users/stefangravesande/Documents/Projects/HM AURORA/aurora-website" && git checkout main && git pull --ff-only && git checkout -b feat/health-app-2
```
Expected: `Switched to a new branch 'feat/health-app-2'`

- [ ] **Step 2: Confirm the baseline is green and the project is awake**

```bash
npm run verify 2>&1 | tail -3
```
Expected: 37 unit tests pass, 54 routes prerendered.

```bash
TOK=$(security find-generic-password -s "Supabase CLI" -w | sed 's/^go-keyring-base64://' | base64 -d); curl -s -H "Authorization: Bearer $TOK" https://api.supabase.com/v1/projects/gmvrkzumvwhrkqzqwcnu | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```
Expected: `ACTIVE_HEALTHY`. If `INACTIVE`, POST to `.../restore` and poll until healthy.

---

### Task 1: Trend statistics (TDD)

**Files:**
- Create: `src/lib/health/stats.ts`
- Test: `src/lib/health/stats.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "vitest";
import { summarise, dailyTotals, seriesFor, WINDOWS } from "@/lib/health/stats";
import type { Reading } from "@/lib/health/types";

const bp = (recorded_at: string, systolic: number, diastolic: number): Reading => ({
  id: recorded_at, kind: "blood_pressure", recorded_at, systolic, diastolic, pulse: null,
  glucose_mgdl: null, glucose_context: null, chol_total_mgdl: null, chol_ldl_mgdl: null,
  chol_hdl_mgdl: null, chol_trig_mgdl: null, entered_unit: null, note: null,
});

test("WINDOWS are the three the spec names", () => {
  expect(WINDOWS.map((w) => w.days)).toEqual([7, 30, 90]);
});

test("summarise returns average, lowest, highest and count", () => {
  const s = summarise([120, 130, 140, 110]);
  expect(s).toEqual({ average: 125, lowest: 110, highest: 140, count: 4 });
});

test("summarise rounds the average and handles a single value", () => {
  expect(summarise([101, 102]).average).toBe(102); // 101.5 rounds to 102
  expect(summarise([98])).toEqual({ average: 98, lowest: 98, highest: 98, count: 1 });
});

test("summarise of nothing is null, not zeroes", () => {
  expect(summarise([])).toBeNull();
});

test("seriesFor pulls the right column per metric, oldest first", () => {
  const rows = [bp("2026-09-03T10:00:00Z", 130, 85), bp("2026-09-01T10:00:00Z", 120, 80)];
  const sys = seriesFor(rows, "systolic");
  expect(sys.map((p) => p.value)).toEqual([120, 130]);
  expect(sys[0].at).toBe("2026-09-01T10:00:00Z");
  expect(seriesFor(rows, "diastolic").map((p) => p.value)).toEqual([80, 85]);
});

test("seriesFor skips rows whose column is null", () => {
  const rows = [bp("2026-09-01T10:00:00Z", 120, 80), { ...bp("2026-09-02T10:00:00Z", 0, 0), systolic: null }];
  expect(seriesFor(rows, "systolic")).toHaveLength(1);
});

test("dailyTotals sums per local day and fills the gaps with zero", () => {
  const day = (d: string, ml: number) => ({ recorded_at: d, ml });
  const rows = [day("2026-09-07T09:00:00", 250), day("2026-09-07T14:00:00", 500), day("2026-09-09T08:00:00", 250)];
  const out = dailyTotals(rows, 3, new Date(2026, 8, 9, 20, 0));
  expect(out).toHaveLength(3);
  expect(out.map((d) => d.total)).toEqual([750, 0, 250]);
  expect(out[2].label).toBe("9 Sep");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/health/stats.test.ts`
Expected: FAIL — cannot resolve `@/lib/health/stats`.

- [ ] **Step 3: Write the implementation**

`src/lib/health/stats.ts`:

```ts
/** Pure helpers behind the Trends screen (spec §9.2). No network, no React. */
import { startOfToday } from "./format";
import type { Reading } from "./types";

export const WINDOWS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export type Point = { at: string; value: number };
export type Summary = { average: number; lowest: number; highest: number; count: number };

/** Null rather than zeroes when there is nothing — the screen shows an
 *  empty state, and a 0 average would read as a real measurement. */
export function summarise(values: number[]): Summary | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    average: Math.round(sum / values.length),
    lowest: Math.min(...values),
    highest: Math.max(...values),
    count: values.length,
  };
}

type NumericColumn = "systolic" | "diastolic" | "pulse" | "glucose_mgdl" | "chol_total_mgdl";

/** One numeric column of a reading list as a chart series, oldest first. */
export function seriesFor(rows: Reading[], column: NumericColumn): Point[] {
  return rows
    .filter((r) => r[column] !== null && r[column] !== undefined)
    .map((r) => ({ at: r.recorded_at, value: Number(r[column]) }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

export type DayTotal = { day: string; label: string; total: number };

/** Per-local-day totals for the last `days` days, gaps filled with zero so
 *  the bar chart keeps a continuous axis. */
export function dailyTotals(
  rows: { recorded_at: string; ml: number }[],
  days: number,
  now: Date = new Date(),
): DayTotal[] {
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.recorded_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    byDay.set(key, (byDay.get(key) ?? 0) + r.ml);
  }
  const out: DayTotal[] = [];
  const start = startOfToday(now);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    out.push({
      day: d.toISOString(),
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      total: byDay.get(key) ?? 0,
    });
  }
  return out;
}

/** ISO timestamp `days` before now — the lower bound of every Trends query. */
export function sinceISO(days: number, now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/health/stats.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/health/stats.ts src/lib/health/stats.test.ts && git commit -m "feat(health): trend statistics helpers"
```

---

### Task 2: FHIR R4 export (TDD)

**Files:**
- Create: `src/lib/health/fhir-export.ts`
- Test: `src/lib/health/fhir-export.test.ts`

Spec §12 defines the mapping. LOINC codes are clinical identifiers — a wrong one mislabels a measurement in whatever system imports the file, so transcribe them exactly and let the test assert each.

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "vitest";
import { buildBundle } from "@/lib/health/fhir-export";
import type { ExportData } from "@/lib/health/fhir-export";

const base: ExportData = {
  patientId: "11111111-1111-1111-1111-111111111111",
  fullName: "Hannah Munro",
  readings: [], water: [], exercise: [], profileEntries: [],
};
const find = (b: ReturnType<typeof buildBundle>, code: string) =>
  b.entry.find((e) => JSON.stringify(e.resource).includes(code))?.resource as Record<string, unknown>;

test("bundle is a collection with a contained Patient carrying the name", () => {
  const b = buildBundle(base);
  expect(b.resourceType).toBe("Bundle");
  expect(b.type).toBe("collection");
  const patient = b.entry[0].resource as { resourceType: string; id: string; name: { text: string }[] };
  expect(patient.resourceType).toBe("Patient");
  expect(patient.id).toBe(base.patientId);
  expect(patient.name[0].text).toBe("Hannah Munro");
});

test("blood pressure is a panel with both component codes and mmHg", () => {
  const b = buildBundle({ ...base, readings: [{
    id: "r1", kind: "blood_pressure", recorded_at: "2026-09-08T10:00:00Z",
    systolic: 128, diastolic: 82, pulse: 72, glucose_mgdl: null, glucose_context: null,
    chol_total_mgdl: null, chol_ldl_mgdl: null, chol_hdl_mgdl: null, chol_trig_mgdl: null,
    entered_unit: null, note: null,
  }] });
  const panel = find(b, "85354-9") as { component: { code: { coding: { code: string }[] }; valueQuantity: { value: number; unit: string } }[] };
  const codes = panel.component.map((c) => c.code.coding[0].code);
  expect(codes).toEqual(["8480-6", "8462-4"]);
  expect(panel.component[0].valueQuantity).toMatchObject({ value: 128, unit: "mm[Hg]" });
  expect(panel.component[1].valueQuantity.value).toBe(82);
  // pulse is its own Observation, not a component
  const pulse = find(b, "8867-4") as { valueQuantity: { value: number; unit: string } };
  expect(pulse.valueQuantity).toMatchObject({ value: 72, unit: "/min" });
});

test("glucose carries its context in a note and cholesterol splits into four codes", () => {
  const b = buildBundle({ ...base, readings: [
    { id: "g", kind: "glucose", recorded_at: "2026-09-08T07:00:00Z", systolic: null, diastolic: null, pulse: null,
      glucose_mgdl: 104, glucose_context: "fasting", chol_total_mgdl: null, chol_ldl_mgdl: null,
      chol_hdl_mgdl: null, chol_trig_mgdl: null, entered_unit: "mg/dL", note: null },
    { id: "c", kind: "cholesterol", recorded_at: "2026-09-08T07:05:00Z", systolic: null, diastolic: null, pulse: null,
      glucose_mgdl: null, glucose_context: null, chol_total_mgdl: 182, chol_ldl_mgdl: 100,
      chol_hdl_mgdl: 55, chol_trig_mgdl: 140, entered_unit: "mg/dL", note: null },
  ] });
  const glucose = find(b, "2339-0") as { valueQuantity: { value: number; unit: string }; note: { text: string }[] };
  expect(glucose.valueQuantity).toMatchObject({ value: 104, unit: "mg/dL" });
  expect(glucose.note[0].text).toContain("fasting");
  for (const code of ["2093-3", "2089-1", "2085-9", "2571-8"]) expect(find(b, code)).toBeTruthy();
});

test("water and exercise are text-coded observations with their own units", () => {
  const b = buildBundle({ ...base,
    water: [{ id: "w", ml: 250, recorded_at: "2026-09-08T09:00:00Z" }],
    exercise: [{ id: "e", activity: "walk", minutes: 30, intensity: "moderate", note: null, recorded_at: "2026-09-08T18:00:00Z" }],
  });
  const w = find(b, "Water intake") as { valueQuantity: { value: number; unit: string } };
  expect(w.valueQuantity).toMatchObject({ value: 250, unit: "mL" });
  const e = find(b, "Exercise session") as { valueQuantity: { value: number; unit: string } };
  expect(e.valueQuantity).toMatchObject({ value: 30, unit: "min" });
});

test("each record category maps to its own FHIR resource type", () => {
  const entry = (category: string, label: string) => ({
    id: category, category, label, detail: null, occurred_on: null, is_current: true,
  });
  const b = buildBundle({ ...base, profileEntries: [
    entry("condition", "Hypertension"), entry("surgery", "Appendectomy"),
    entry("medication", "Amlodipine"), entry("allergy", "Penicillin"),
    entry("family_history", "Diabetes — mother"),
  ] as ExportData["profileEntries"] });
  const types = b.entry.map((e) => (e.resource as { resourceType: string }).resourceType);
  for (const t of ["Condition", "Procedure", "MedicationStatement", "AllergyIntolerance", "FamilyMemberHistory"]) {
    expect(types).toContain(t);
  }
});

test("every resource points at the patient and nothing carries a raw email", () => {
  const b = buildBundle({ ...base, water: [{ id: "w", ml: 250, recorded_at: "2026-09-08T09:00:00Z" }] });
  for (const e of b.entry.slice(1)) {
    expect((e.resource as { subject: { reference: string } }).subject.reference).toBe(`Patient/${base.patientId}`);
  }
  expect(JSON.stringify(b)).not.toContain("@");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/health/fhir-export.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/lib/health/fhir-export.ts`:

```ts
/**
 * FHIR R4 export (spec §12, PDR §11.5 portability). One Bundle of type
 * "collection": a contained Patient carrying the name, then one resource
 * per stored row. LOINC codes are clinical identifiers — a wrong code
 * mislabels the measurement in whatever system imports this, so they are
 * asserted one by one in the unit test.
 */
import type { GlucoseContext, Reading } from "./types";

export type ExportWater = { id: string; ml: number; recorded_at: string };
export type ExportExercise = {
  id: string; activity: string; minutes: number;
  intensity: string | null; note: string | null; recorded_at: string;
};
export type ExportProfileEntry = {
  id: string; category: "condition" | "surgery" | "medication" | "allergy" | "family_history";
  label: string; detail: string | null; occurred_on: string | null; is_current: boolean;
};
export type ExportData = {
  patientId: string;
  fullName: string | null;
  readings: Reading[];
  water: ExportWater[];
  exercise: ExportExercise[];
  profileEntries: ExportProfileEntry[];
};

type Resource = Record<string, unknown>;
export type Bundle = { resourceType: "Bundle"; type: "collection"; timestamp: string; entry: { resource: Resource }[] };

const loinc = (code: string, display: string) => ({ coding: [{ system: "http://loinc.org", code, display }] });

const contextLabel: Record<GlucoseContext, string> = {
  fasting: "fasting", after_meal: "after a meal", random: "random", bedtime: "bedtime",
};

export function buildBundle(data: ExportData): Bundle {
  const subject = { reference: `Patient/${data.patientId}` };
  const entry: { resource: Resource }[] = [
    {
      resource: {
        resourceType: "Patient",
        id: data.patientId,
        name: data.fullName ? [{ text: data.fullName }] : [],
      },
    },
  ];
  const obs = (r: Resource) => entry.push({ resource: { resourceType: "Observation", status: "final", subject, ...r } });

  for (const r of data.readings) {
    if (r.kind === "blood_pressure") {
      obs({
        code: loinc("85354-9", "Blood pressure panel"),
        effectiveDateTime: r.recorded_at,
        component: [
          { code: loinc("8480-6", "Systolic blood pressure"), valueQuantity: { value: r.systolic, unit: "mm[Hg]", system: "http://unitsofmeasure.org", code: "mm[Hg]" } },
          { code: loinc("8462-4", "Diastolic blood pressure"), valueQuantity: { value: r.diastolic, unit: "mm[Hg]", system: "http://unitsofmeasure.org", code: "mm[Hg]" } },
        ],
        ...(r.note ? { note: [{ text: r.note }] } : {}),
      });
      if (r.pulse !== null) {
        obs({
          code: loinc("8867-4", "Heart rate"),
          effectiveDateTime: r.recorded_at,
          valueQuantity: { value: r.pulse, unit: "/min", system: "http://unitsofmeasure.org", code: "/min" },
        });
      }
    } else if (r.kind === "glucose") {
      const ctx = r.glucose_context ? contextLabel[r.glucose_context] : null;
      obs({
        code: loinc("2339-0", "Glucose [Mass/volume] in Blood"),
        effectiveDateTime: r.recorded_at,
        valueQuantity: { value: Number(r.glucose_mgdl), unit: "mg/dL", system: "http://unitsofmeasure.org", code: "mg/dL" },
        note: [{ text: [ctx ? `Taken ${ctx}.` : null, r.note].filter(Boolean).join(" ") || "Taken." }],
      });
    } else {
      const lipids: [number | null, string, string][] = [
        [r.chol_total_mgdl, "2093-3", "Cholesterol [Mass/volume] in Serum or Plasma"],
        [r.chol_ldl_mgdl, "2089-1", "LDL Cholesterol"],
        [r.chol_hdl_mgdl, "2085-9", "HDL Cholesterol"],
        [r.chol_trig_mgdl, "2571-8", "Triglycerides"],
      ];
      for (const [value, code, display] of lipids) {
        if (value === null) continue;
        obs({
          code: loinc(code, display),
          effectiveDateTime: r.recorded_at,
          valueQuantity: { value: Number(value), unit: "mg/dL", system: "http://unitsofmeasure.org", code: "mg/dL" },
          ...(r.note ? { note: [{ text: r.note }] } : {}),
        });
      }
    }
  }

  for (const w of data.water) {
    obs({
      code: { text: "Water intake" },
      effectiveDateTime: w.recorded_at,
      valueQuantity: { value: w.ml, unit: "mL", system: "http://unitsofmeasure.org", code: "mL" },
    });
  }

  for (const e of data.exercise) {
    obs({
      code: { text: "Exercise session" },
      effectiveDateTime: e.recorded_at,
      valueQuantity: { value: e.minutes, unit: "min", system: "http://unitsofmeasure.org", code: "min" },
      note: [{ text: [e.activity, e.intensity, e.note].filter(Boolean).join(" · ") }],
    });
  }

  // Patient-authored record entries. Text-coded on purpose: the patient
  // typed these, so asserting a clinical code we did not verify would be
  // worse than none (spec §12).
  const byCategory: Record<ExportProfileEntry["category"], (p: ExportProfileEntry) => Resource> = {
    condition: (p) => ({
      resourceType: "Condition", subject, code: { text: p.label },
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: p.is_current ? "active" : "resolved" }] },
      ...(p.occurred_on ? { onsetDateTime: p.occurred_on } : {}),
      ...(p.detail ? { note: [{ text: p.detail }] } : {}),
    }),
    surgery: (p) => ({
      resourceType: "Procedure", subject, status: "completed", code: { text: p.label },
      ...(p.occurred_on ? { performedDateTime: p.occurred_on } : {}),
      ...(p.detail ? { note: [{ text: p.detail }] } : {}),
    }),
    medication: (p) => ({
      resourceType: "MedicationStatement", subject, status: p.is_current ? "active" : "stopped",
      medicationCodeableConcept: { text: p.label },
      ...(p.occurred_on ? { effectiveDateTime: p.occurred_on } : {}),
      ...(p.detail ? { note: [{ text: p.detail }] } : {}),
    }),
    allergy: (p) => ({
      resourceType: "AllergyIntolerance", patient: subject, subject, code: { text: p.label },
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: p.is_current ? "active" : "inactive" }] },
      ...(p.detail ? { note: [{ text: p.detail }] } : {}),
    }),
    family_history: (p) => ({
      resourceType: "FamilyMemberHistory", subject, status: "completed",
      patient: subject, relationship: { text: "Family" },
      condition: [{ code: { text: p.label } }],
      ...(p.detail ? { note: [{ text: p.detail }] } : {}),
    }),
  };
  for (const p of data.profileEntries) entry.push({ resource: byCategory[p.category](p) });

  return { resourceType: "Bundle", type: "collection", timestamp: new Date().toISOString(), entry };
}

/** `aurora-health-data-YYYY-MM-DD.json` */
export function exportFilename(now: Date = new Date()): string {
  return `aurora-health-data-${now.toISOString().slice(0, 10)}.json`;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/health/fhir-export.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/health/fhir-export.ts src/lib/health/fhir-export.test.ts && git commit -m "feat(health): FHIR R4 export bundle"
```

---

### Task 3: Record-entry validation (TDD)

**Files:**
- Modify: `src/lib/validation/health.ts`
- Modify: `src/lib/validation/health.test.ts`

Plan 1 deferred `profileEntrySchema` because nothing wrote to `health.profile_entries` yet. The Record screen does, so it lands here with its screen.

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/validation/health.test.ts`:

```ts
test("profile entry: category, label bounds, optional detail and date", () => {
  const ok = { category: "condition", label: "Hypertension", isCurrent: true };
  expect(profileEntrySchema.safeParse(ok).success).toBe(true);
  expect(profileEntrySchema.safeParse({ ...ok, category: "nope" }).success).toBe(false);
  expect(profileEntrySchema.safeParse({ ...ok, label: "" }).success).toBe(false);
  expect(profileEntrySchema.safeParse({ ...ok, label: "x".repeat(120) }).success).toBe(true);
  expect(profileEntrySchema.safeParse({ ...ok, label: "x".repeat(121) }).success).toBe(false);
  expect(profileEntrySchema.safeParse({ ...ok, detail: "x".repeat(500) }).success).toBe(true);
  expect(profileEntrySchema.safeParse({ ...ok, detail: "x".repeat(501) }).success).toBe(false);
});

test("profile entry: a date must be a real past-or-present day", () => {
  const ok = { category: "surgery", label: "Appendectomy", isCurrent: false };
  expect(profileEntrySchema.safeParse({ ...ok, occurredOn: "2019-04-02" }).success).toBe(true);
  expect(profileEntrySchema.safeParse({ ...ok, occurredOn: "" }).success).toBe(true);
  expect(profileEntrySchema.safeParse({ ...ok, occurredOn: "not-a-date" }).success).toBe(false);
  expect(profileEntrySchema.safeParse({ ...ok, occurredOn: "2999-01-01" }).success).toBe(false);
});
```

and extend the import at the top of the file to include `profileEntrySchema`.

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/lib/validation/health.test.ts`
Expected: FAIL — `profileEntrySchema` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/validation/health.ts`:

```ts
/** The nursing checklist (spec §6 profile_entries). Mirrors the table's
 *  CHECK constraints so the patient gets a readable message first. */
export const profileEntrySchema = z.object({
  category: z.enum(["condition", "surgery", "medication", "allergy", "family_history"], {
    error: "Choose a category.",
  }),
  label: z.string().trim().min(1, "Enter a name.").max(120, "Keep it under 120 characters."),
  detail: z.string().trim().max(500, "Keep the detail under 500 characters.").nullish(),
  occurredOn: z
    .string()
    .refine((d) => d === "" || (/^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(`${d}T00:00:00`) <= new Date()),
      "Enter a real date, today or earlier.")
    .optional(),
  isCurrent: z.boolean().default(true),
});
export type ProfileEntryInput = z.infer<typeof profileEntrySchema>;
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/validation/health.test.ts`
Expected: all pass (2 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/health.ts src/lib/validation/health.test.ts && git commit -m "feat(health): validation for record entries"
```

---

### Task 4: Client — reads, deletes, record CRUD, consent actions, export

**Files:**
- Modify: `src/lib/health/client.ts` (append; change nothing existing)

No unit test — this is a network wrapper, proven by the RLS suite (Task 5) and the end-to-end test (Task 17). Every delete and update below is already permitted by an existing RLS policy; Plan 2 adds no SQL.

- [ ] **Step 1: Append to `src/lib/health/client.ts`**

Add these imports to the existing import block:

```ts
import type { ExportExercise, ExportProfileEntry, ExportWater } from "./fhir-export";
import { sinceISO } from "./stats";
```

Then append:

```ts
// ── Trends ──────────────────────────────────────────────────────────
export async function fetchReadings(kind: ReadingKind, days: number): Promise<Reading[]> {
  const { data, error } = await health()
    .from("readings").select(READING_COLUMNS)
    .eq("kind", kind).gte("recorded_at", sinceISO(days))
    .order("recorded_at", { ascending: false });
  if (error) throw asError(error);
  return (data ?? []) as Reading[];
}

export async function fetchWaterSince(days: number): Promise<ExportWater[]> {
  const { data, error } = await health()
    .from("water_intake").select("id, ml, recorded_at")
    .gte("recorded_at", sinceISO(days)).order("recorded_at", { ascending: false });
  if (error) throw asError(error);
  return (data ?? []) as ExportWater[];
}

export async function fetchExerciseSince(days: number): Promise<ExportExercise[]> {
  const { data, error } = await health()
    .from("exercise_sessions").select("id, activity, minutes, intensity, note, recorded_at")
    .gte("recorded_at", sinceISO(days)).order("recorded_at", { ascending: false });
  if (error) throw asError(error);
  return (data ?? []) as ExportExercise[];
}

/** Deleting is RLS-scoped to the caller's own rows and the audit trigger
 *  records it, so no extra guard is needed here (spec §7). */
export async function deleteRow(
  table: "readings" | "water_intake" | "exercise_sessions" | "profile_entries",
  id: string,
): Promise<void> {
  const { error } = await health().from(table).delete().eq("id", id);
  if (error) throw asError(error);
}

// ── Record (the nursing checklist) ──────────────────────────────────
const PROFILE_COLUMNS = "id, category, label, detail, occurred_on, is_current";

export async function fetchProfileEntries(): Promise<ExportProfileEntry[]> {
  const { data, error } = await health()
    .from("profile_entries").select(PROFILE_COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw asError(error);
  return (data ?? []) as ExportProfileEntry[];
}

export type ProfileEntryWrite = {
  category: ExportProfileEntry["category"];
  label: string;
  detail: string | null;
  occurred_on: string | null;
  is_current: boolean;
};

export async function insertProfileEntry(patientId: string, row: ProfileEntryWrite): Promise<void> {
  const { error } = await health().from("profile_entries").insert({ patient_id: patientId, ...row });
  if (error) throw asError(error);
}

export async function updateProfileEntry(id: string, patch: Partial<ProfileEntryWrite>): Promise<void> {
  const { error, count } = await health()
    .from("profile_entries").update(patch, { count: "exact" }).eq("id", id);
  if (error) throw asError(error);
  if (count === 0) throw new Error("That entry no longer exists.");
}

// ── More ────────────────────────────────────────────────────────────
export type AccessEvent = {
  id: number; at: string; actor_role: string; action: string;
  resource: string | null; ip: string | null; user_agent: string | null;
};

/** The patient's own access history (spec §7, PDR §11.3). RLS returns
 *  only their rows; there is no way to ask for anyone else's. */
export async function fetchAccessLog(limit = 200): Promise<AccessEvent[]> {
  const { data, error } = await health()
    .from("access_log").select("id, at, actor_role, action, resource, ip, user_agent")
    .order("at", { ascending: false }).limit(limit);
  if (error) throw asError(error);
  return (data ?? []) as AccessEvent[];
}

export async function withdrawConsent(): Promise<void> {
  const { error } = await health().rpc("withdraw_consent");
  if (error) throw asError(error);
}

export async function deleteMyHealthData(): Promise<void> {
  const { error } = await health().rpc("delete_my_health_data");
  if (error) throw asError(error);
}

export async function logExport(): Promise<void> {
  const { error } = await health().rpc("log_export");
  if (error) throw asError(error);
}

/** Everything the FHIR bundle needs, in one round of parallel queries.
 *  Deliberately unbounded by date: an export is the patient's whole live
 *  record (archived rows are a rights request, spec §8). */
export async function loadForExport(fullName: string | null, patientId: string): Promise<ExportData> {
  const h = health();
  const [rd, wa, ex, pe] = await Promise.all([
    h.from("readings").select(READING_COLUMNS).order("recorded_at", { ascending: true }),
    h.from("water_intake").select("id, ml, recorded_at").order("recorded_at", { ascending: true }),
    h.from("exercise_sessions").select("id, activity, minutes, intensity, note, recorded_at").order("recorded_at", { ascending: true }),
    h.from("profile_entries").select(PROFILE_COLUMNS).order("created_at", { ascending: true }),
  ]);
  for (const r of [rd, wa, ex, pe]) if (r.error) throw asError(r.error);
  return {
    patientId,
    fullName,
    readings: (rd.data ?? []) as Reading[],
    water: (wa.data ?? []) as ExportWater[],
    exercise: (ex.data ?? []) as ExportExercise[],
    profileEntries: (pe.data ?? []) as ExportProfileEntry[],
  };
}

/** The signed-in patient's display name, from public.profiles — the only
 *  identifier that touches the export, and it never enters the health
 *  schema (spec §4 pseudonymisation). */
export async function fetchDisplayName(): Promise<string | null> {
  const { data, error } = await getSupabase().from("profiles").select("full_name").maybeSingle();
  if (error) throw asError(error);
  return (data as { full_name: string | null } | null)?.full_name ?? null;
}
```

Add `ExportData` and `ReadingKind` to the existing type imports if they are not already there.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If the generated types reject a column name, **stop and report it** — that means the code and the live schema disagree, which is a finding.

- [ ] **Step 3: Commit**

```bash
git add src/lib/health/client.ts && git commit -m "feat(health): client reads, deletes, record CRUD, consent actions and export"
```

---

### Task 5: Extend the RLS proof

**Files:**
- Modify: `tests/rls/health.mjs`

Plan 1's suite proves reads, writes, consent gating and the audit log. Plan 2 exercises deletes and `profile_entries` for the first time, so prove those too — against the live database, as before.

- [ ] **Step 1: Add checks before the final `delete_my_health_data` block**

Insert after the archive section (`✓ archive_old moved the 13-month-old reading`):

```js
  // 8b. Record entries: own-rows-only, consent-gated, deletable by the owner.
  const peA = await H(ca).from("profile_entries")
    .insert({ patient_id: pidA, category: "condition", label: "Hypertension", is_current: true })
    .select("id").single();
  if (!peA.error) ok("inserts own record entry"); else fail("record insert failed: " + peA.error.message);
  const bSeesPe = await H(cb).from("profile_entries").select("id").eq("id", peA.data.id);
  if (bSeesPe.data && bSeesPe.data.length === 0) ok("B cannot read A's record entry"); else fail("LEAK: B read A's record entry");
  await H(cb).from("profile_entries").update({ label: "tampered" }).eq("id", peA.data.id);
  const peCheck = await H(ca).from("profile_entries").select("label").eq("id", peA.data.id).single();
  if (peCheck.data?.label === "Hypertension") ok("B cannot update A's record entry"); else fail("LEAK: B updated A's record entry");
  await H(cb).from("profile_entries").delete().eq("id", peA.data.id);
  const stillPe = await H(ca).from("profile_entries").select("id").eq("id", peA.data.id);
  if (stillPe.data && stillPe.data.length === 1) ok("B cannot delete A's record entry"); else fail("LEAK: B deleted A's record entry");

  // 8c. A deletes their own rows, and the deletion is audited.
  const delRes = await H(ca).from("readings").delete().eq("id", ins.data.id);
  const goneOne = await H(ca).from("readings").select("id").eq("id", ins.data.id);
  if (!delRes.error && goneOne.data.length === 0) ok("A deletes own reading"); else fail("A could not delete own reading");
  const delLog = await H(ca).from("access_log").select("action, resource").eq("action", "delete");
  if ((delLog.data ?? []).some((r) => r.resource === "readings")) ok("the delete is audited"); else fail("delete not audited");
```

Note the later archive assertion counts live rows; adjust the expected count if this delete changes it, and say so in your report rather than loosening the assertion.

- [ ] **Step 2: Run it**

```bash
cd "/Users/stefangravesande/Documents/Projects/HM AURORA/aurora-website" && npm run test:rls
```
Expected: `ALL RLS CHECKS PASSED` and `ALL HEALTH RLS CHECKS PASSED`, now with the six new lines. If a check fails, the policy is wrong — report it, do not weaken the check.

- [ ] **Step 3: Commit**

```bash
git add tests/rls/health.mjs && git commit -m "test(health): prove record-entry isolation and audited deletes"
```

---

### Task 6: More — the hub, units and goals

**Files:**
- Create: `src/components/app/MoreScreen.tsx`, `src/components/app/UnitsForm.tsx`
- Modify: `src/app/app/more/page.tsx` (replace the stub)

More comes first because the consent screen already promises it.

- [ ] **Step 1: `src/components/app/UnitsForm.tsx`**

```tsx
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

  if (!settings) return <p className="text-sm text-silver">Loading…</p>;

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
        <TextField id="water_goal_ml" name="water_goal_ml" type="number" inputMode="numeric"
          label="Daily water goal (ml)" defaultValue={goal} hint="Between 500 and 6,000 ml." />
        <div className="flex items-center gap-4">
          <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Save goal"}</Button>
        </div>
      </form>
      <p role="status" className="text-sm text-cyan">{msg ?? ""}</p>
      {error ? <p role="alert" className="text-sm text-[#ff9db0]">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 2: `src/components/app/MoreScreen.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { signOut } from "@/lib/auth/session";
import { HEALTH_NOTICE_VERSION, healthNotice } from "@/content/health-notice";
import { useApp } from "./AppContext";
import { UnitsForm } from "./UnitsForm";
import { DownloadMyData } from "./DownloadMyData";
import { ConsentPanel } from "./ConsentPanel";
import { InstallHint } from "./InstallHint";

/** The screen the consent text points at: "You can download your data,
 *  delete it, or withdraw this permission at any time from More." */
export function MoreScreen() {
  const router = useRouter();
  const { status } = useApp();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">More</h1>

      <Card>
        <h2 className="text-lg">Your consent</h2>
        <p className="mt-2 text-sm text-silver">
          You agreed to notice version {status.activeVersion ?? HEALTH_NOTICE_VERSION}.{" "}
          {healthNotice.sections.find((s) => s.heading === "Your choice")?.body}
        </p>
        <ConsentPanel />
      </Card>

      <Card>
        <h2 className="text-lg">Your data</h2>
        <div className="mt-3 flex flex-col gap-3">
          <DownloadMyData />
          <Link href="/app/more/access" className="text-sm font-medium text-cyan underline-offset-4 hover:underline">
            Who has accessed my data
          </Link>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg">Units and goals</h2>
        <div className="mt-3"><UnitsForm /></div>
      </Card>

      <Card>
        <h2 className="text-lg">Add to home screen</h2>
        <InstallHint />
      </Card>

      <Card>
        <h2 className="text-lg">Account</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button href="/account/patient" variant="secondary" size="sm">Account settings</Button>
          <Button variant="secondary" size="sm" onClick={() => signOut().then(() => router.replace("/"))}>
            Sign out
          </Button>
        </div>
        <p className="mt-3 text-xs text-silver/70">
          Read the full{" "}
          <a href="/privacy-centre/notice" className="text-cyan underline underline-offset-2">privacy notice</a>.
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/app/app/more/page.tsx`**

```tsx
import type { Metadata } from "next";
import { MoreScreen } from "@/components/app/MoreScreen";

export const metadata: Metadata = { title: { absolute: "More | Aurora Health" } };

export default function MorePage() {
  return <MoreScreen />;
}
```

- [ ] **Step 4: Commit (typecheck will fail until Tasks 7–8 and 15 land — commit anyway, then keep going)**

`MoreScreen` imports `DownloadMyData`, `ConsentPanel` and `InstallHint`, which arrive in Tasks 7, 8 and 15. Build those next and run `npm run typecheck` after Task 15; do not stub them here.

```bash
git add src/components/app/UnitsForm.tsx src/components/app/MoreScreen.tsx src/app/app/more/page.tsx && git commit -m "feat(app): More screen hub with units and goals"
```

---

### Task 7: Download my data (FHIR)

**Files:**
- Create: `src/components/app/DownloadMyData.tsx`

- [ ] **Step 1: Write it**

```tsx
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
      const count = bundle.entry.length - 1; // minus the contained Patient
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
      <p role="status" className="text-sm text-cyan">{done ?? ""}</p>
      {error ? <p role="alert" className="text-sm text-[#ff9db0]">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/app/DownloadMyData.tsx && git commit -m "feat(app): download my data as a FHIR bundle"
```

---

### Task 8: Withdraw, resume and delete

**Files:**
- Create: `src/components/app/ConsentPanel.tsx`

Spec §8: withdrawing offers the download first, stops writes at once, and leaves a 30-day window in which "Resume" cancels the deletion. "Delete now" purges immediately. Both are irreversible in effect, so both confirm.

- [ ] **Step 1: Write it**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMyHealthData, grantConsent, withdrawConsent } from "@/lib/health/client";
import { useApp } from "./AppContext";
import { DownloadMyData } from "./DownloadMyData";

type Pending = null | "withdraw" | "delete";

/** Spec §8. Withdrawing stops writes immediately and schedules deletion
 *  30 days out; Resume cancels it. Delete now purges at once. */
export function ConsentPanel() {
  const { status, refreshStatus } = useApp();
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const withdrawn = status.activeVersion === null;
  const deleteAfter = status.deleteAfter
    ? new Date(status.deleteAfter).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  async function run(action: () => Promise<void>, after: "refresh" | "leave") {
    setBusy(true); setError(undefined);
    try {
      await action();
      if (after === "leave") { router.replace("/account/patient/"); return; }
      await refreshStatus();
      setPending(null);
    } catch {
      setError("That didn't go through. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (withdrawn) {
    return (
      <div className="mt-4 rounded-xl border border-[#f5c451]/40 bg-[#f5c451]/10 p-4">
        <p className="text-sm text-starlight">
          Tracking is stopped. Your health data {deleteAfter ? `will be deleted on ${deleteAfter}` : "will be deleted shortly"} unless you resume before then.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy} onClick={() => run(async () => { await grantConsent(); }, "refresh")}
            className="motion-press inline-flex min-h-11 items-center rounded-full bg-cyan px-4 text-sm font-semibold text-navy hover:bg-blue disabled:opacity-50">
            {busy ? "Resuming…" : "Resume tracking"}
          </button>
          <DownloadMyData label="Download before it goes" />
        </div>
        {error ? <p role="alert" className="mt-2 text-sm text-[#ff9db0]">{error}</p> : null}
      </div>
    );
  }

  if (pending) {
    const isDelete = pending === "delete";
    return (
      <div className="mt-4 rounded-xl border border-[#ff9db0]/50 p-4">
        <p className="text-sm text-starlight">
          {isDelete
            ? "This deletes every reading, water and exercise entry, and everything in your health record, right now. It cannot be undone."
            : "Tracking stops immediately and your health data is deleted 30 days from now. You can resume any time before then."}
        </p>
        <p className="mt-2 text-sm text-silver">Download a copy first if you want to keep it.</p>
        <div className="mt-3"><DownloadMyData label="Download my data first" /></div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy}
            onClick={() => run(isDelete ? deleteMyHealthData : withdrawConsent, isDelete ? "leave" : "refresh")}
            className="motion-press inline-flex min-h-11 items-center rounded-full border border-[#ff9db0] px-4 text-sm font-semibold text-[#ff9db0] hover:bg-[#ff9db0]/10 disabled:opacity-50">
            {busy ? "Working…" : isDelete ? "Yes, delete everything" : "Yes, stop tracking"}
          </button>
          <button type="button" disabled={busy} onClick={() => setPending(null)}
            className="inline-flex min-h-11 items-center text-sm font-medium text-silver underline-offset-4 hover:text-starlight hover:underline">
            Cancel
          </button>
        </div>
        {error ? <p role="alert" className="mt-2 text-sm text-[#ff9db0]">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => setPending("withdraw")}
        className="inline-flex min-h-11 items-center rounded-full border border-silver/40 px-4 text-sm font-semibold text-starlight hover:border-silver">
        Stop tracking
      </button>
      <button type="button" onClick={() => setPending("delete")}
        className="inline-flex min-h-11 items-center rounded-full border border-[#ff9db0]/50 px-4 text-sm font-semibold text-[#ff9db0] hover:border-[#ff9db0]">
        Delete my health data
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/app/ConsentPanel.tsx && git commit -m "feat(app): withdraw, resume and delete health data"
```

---

### Task 9: Who has accessed my data

**Files:**
- Create: `src/components/app/AccessLogList.tsx`, `src/app/app/more/access/page.tsx`

- [ ] **Step 1: `src/components/app/AccessLogList.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAccessLog, type AccessEvent } from "@/lib/health/client";
import { relativeTime } from "@/lib/health/format";

/** PDR §11.3: the patient can see who opened their record, when and from
 *  where. Written only by the database's own triggers and RPCs — nothing
 *  here can add to it or change it. */
const actionLabel: Record<string, string> = {
  app_open: "Opened the app",
  insert: "Added",
  update: "Changed",
  delete: "Deleted",
  export: "Downloaded your data",
  consent_granted: "You agreed to health tracking",
  consent_withdrawn: "You stopped tracking",
  archive: "Moved older entries to the archive",
  purge: "Deleted your health data",
  read: "Viewed your record",
};

const resourceLabel: Record<string, string> = {
  readings: "a reading",
  water_intake: "a water entry",
  exercise_sessions: "an exercise session",
  profile_entries: "a health-record entry",
  settings: "your settings",
  consents: "your consent",
  app: "",
  all: "",
  patients: "",
};

function describe(e: AccessEvent): string {
  const base = actionLabel[e.action] ?? e.action;
  const what = e.resource ? resourceLabel[e.resource] ?? e.resource : "";
  return what ? `${base} ${what}` : base;
}

function device(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/iPhone|iPad/i.test(ua)) return "iPhone or iPad";
  if (/Android/i.test(ua)) return "Android phone";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  return "Other device";
}

export function AccessLogList() {
  const [rows, setRows] = useState<AccessEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setError(false);
    fetchAccessLog()
      .then((r) => { if (live) setRows(r); })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [tick]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">Who has accessed my data</h1>
      <p className="text-sm text-silver">
        Every time your health record is opened or changed, it is recorded here. Aurora cannot edit or remove these entries.{" "}
        <Link href="/app/more" className="text-cyan underline underline-offset-2">Back to More</Link>
      </p>

      {error ? (
        <div>
          <p role="alert" className="text-sm text-[#ff9db0]">Couldn&rsquo;t load your access history.</p>
          <button type="button" onClick={() => setTick((t) => t + 1)}
            className="motion-press mt-3 inline-flex min-h-11 items-center rounded-full border border-cyan/60 px-4 text-sm font-semibold text-cyan hover:border-cyan">
            Try again
          </button>
        </div>
      ) : rows === null ? (
        <p role="status" className="text-sm text-silver">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-silver">Nothing recorded yet.</p>
      ) : (
        <ul className="divide-y divide-line-dark">
          {rows.map((e) => (
            <li key={e.id} className="py-3">
              <p className="text-sm text-starlight">{describe(e)}</p>
              <p className="mt-0.5 text-xs text-silver/80">
                {e.actor_role === "patient" ? "You" : e.actor_role === "system" ? "Aurora system" : "Aurora staff"}
                {" · "}{relativeTime(e.at)}
                {" · "}{device(e.user_agent)}
                {e.ip ? ` · ${e.ip}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `src/app/app/more/access/page.tsx`**

```tsx
import type { Metadata } from "next";
import { AccessLogList } from "@/components/app/AccessLogList";

export const metadata: Metadata = { title: { absolute: "Access history | Aurora Health" } };

export default function AccessPage() {
  return <AccessLogList />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/app/AccessLogList.tsx src/app/app/more/access && git commit -m "feat(app): the patient's own access history"
```

---

### Task 10: Trend chart (SVG)

**Files:**
- Create: `src/components/app/TrendChart.tsx`

Hand-drawn SVG, no charting library (spec D11): no extra download on a phone connection, exact brand colours, and an accessible text alternative beside it. Two shapes only — a line for readings, daily bars for water.

- [ ] **Step 1: Write it**

```tsx
"use client";

import { useId } from "react";
import type { Band } from "@/lib/health/ranges";

export type Line = { points: { at: string; value: number }[]; colour: string; label: string };
/** A reference threshold to shade behind the data (spec §9.2). */
export type BandMark = { from: number; to: number; tone: Band["tone"]; label: string };

const W = 320;
const H = 140;
const PAD = { top: 8, right: 8, bottom: 18, left: 30 };

function scale(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series still needs a band to draw in.
  const pad = max === min ? Math.max(1, Math.abs(max) * 0.1) : (max - min) * 0.15;
  return { lo: min - pad, hi: max + pad };
}

/** Tone → the same semantic colours the badges use. Never cyan: that is
 *  the call-to-action colour (PDR §4.2). */
export const toneColour: Record<Band["tone"], string> = {
  good: "#34d399", watch: "#f5c451", high: "#ff9db0", urgent: "#ff9db0",
};

/**
 * Line chart for readings, bar chart for daily totals. `bands` draws the
 * reference thresholds behind the data (spec §9.2) — informational only,
 * so they are drawn quietly and always named in the summary text beside
 * the chart rather than by colour alone (PDR §12).
 */
export function TrendChart({
  lines = [], bars = [], bands = [], goal, unit, caption,
}: {
  lines?: Line[];
  bars?: { label: string; total: number }[];
  bands?: BandMark[];
  goal?: number;
  unit: string;
  caption: string;
}) {
  const titleId = useId();
  const values = [
    ...lines.flatMap((l) => l.points.map((p) => p.value)),
    ...bars.map((b) => b.total),
    ...(goal ? [goal] : []),
  ];
  if (values.length === 0) return null;
  const { lo, hi } = bars.length ? { lo: 0, hi: Math.max(...values) * 1.15 } : scale(values);
  const x = (i: number, n: number) => PAD.left + (n <= 1 ? (W - PAD.left - PAD.right) / 2 : (i / (n - 1)) * (W - PAD.left - PAD.right));
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
  const ticks = [hi, lo + (hi - lo) / 2, lo].map((v) => Math.round(v));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={titleId}>
      <title id={titleId}>{caption}</title>
      {bands.map((b) => {
        const top = y(Math.min(b.to, hi));
        const bottom = y(Math.max(b.from, lo));
        if (bottom <= top) return null;
        return (
          <rect key={b.label} x={PAD.left} y={top} width={W - PAD.left - PAD.right} height={bottom - top}
            fill={toneColour[b.tone]} opacity="0.1" />
        );
      })}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} stroke="currentColor" className="text-silver/15" />
          <text x={0} y={y(t) + 3} fontSize="8" fill="currentColor" className="text-silver/70">{t}</text>
        </g>
      ))}
      {goal !== undefined ? (
        <line x1={PAD.left} y1={y(goal)} x2={W - PAD.right} y2={y(goal)}
          stroke="currentColor" strokeDasharray="3 3" className="text-cyan/60" />
      ) : null}
      {bars.map((b, i) => {
        const bw = Math.max(3, (W - PAD.left - PAD.right) / bars.length - 3);
        const bx = PAD.left + (i * (W - PAD.left - PAD.right)) / bars.length;
        const by = y(b.total);
        return <rect key={b.label} x={bx} y={by} width={bw} height={Math.max(0, H - PAD.bottom - by)}
          rx="1.5" fill="currentColor" className="text-cyan" />;
      })}
      {lines.map((l) => (
        <g key={l.label}>
          <polyline fill="none" strokeWidth="2" stroke={l.colour} strokeLinejoin="round" strokeLinecap="round"
            points={l.points.map((p, i) => `${x(i, l.points.length)},${y(p.value)}`).join(" ")} />
          {l.points.length === 1 ? <circle cx={x(0, 1)} cy={y(l.points[0].value)} r="3" fill={l.colour} /> : null}
        </g>
      ))}
      <text x={PAD.left} y={H - 4} fontSize="8" fill="currentColor" className="text-silver/70">{unit}</text>
    </svg>
  );
}

```

- [ ] **Step 2: Commit**

```bash
git add src/components/app/TrendChart.tsx && git commit -m "feat(app): SVG trend chart"
```

---

### Task 11: Trends screen

**Files:**
- Create: `src/components/app/TrendsScreen.tsx`
- Modify: `src/app/app/trends/page.tsx` (replace the stub)

- [ ] **Step 1: `src/components/app/TrendsScreen.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/Card";
import {
  DEFAULT_SETTINGS, deleteRow, fetchExerciseSince, fetchReadings, fetchSettings, fetchWaterSince,
} from "@/lib/health/client";
import { relativeTime } from "@/lib/health/format";
import { bpBand, cholesterolBand, DISCLAIMER, glucoseBand } from "@/lib/health/ranges";
import { dailyTotals, seriesFor, summarise, WINDOWS, type Point, type Summary } from "@/lib/health/stats";
import type { Reading, Settings } from "@/lib/health/types";
import { CHOLESTEROL_FACTOR, GLUCOSE_FACTOR, formatValue } from "@/lib/health/units";
import { RangeBadge } from "./RangeBadge";
import { TrendChart, type BandMark, type Line } from "./TrendChart";
import { useApp } from "./AppContext";

type Metric = "blood_pressure" | "glucose" | "cholesterol" | "water";
const METRICS: { key: Metric; label: string }[] = [
  { key: "blood_pressure", label: "Blood pressure" },
  { key: "glucose", label: "Blood sugar" },
  { key: "cholesterol", label: "Cholesterol" },
  { key: "water", label: "Water" },
];

type Row = { id: string; at: string; primary: string; secondary?: string; band?: ReturnType<typeof bpBand> };

export function TrendsScreen() {
  const { version, bump } = useApp();
  const [metric, setMetric] = useState<Metric>("blood_pressure");
  const [days, setDays] = useState<number>(30);
  const [asTable, setAsTable] = useState(false);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [water, setWater] = useState<{ id: string; ml: number; recorded_at: string }[] | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => { fetchSettings().then(setSettings).catch(() => undefined); }, []);

  useEffect(() => {
    let live = true;
    setError(false); setReadings(null); setWater(null);
    const job = metric === "water"
      ? fetchWaterSince(days).then((w) => { if (live) setWater(w); })
      : fetchReadings(metric, days).then((r) => { if (live) setReadings(r); });
    job.catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [metric, days, version, tick]);

  async function remove(table: "readings" | "water_intake", id: string) {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    try { await deleteRow(table, id); bump(); reload(); }
    catch { setError(true); }
  }

  // ── Build the chart, the summary and the table from whichever metric is selected
  let lines: Line[] = [];
  let bars: { label: string; total: number }[] = [];
  let goal: number | undefined;
  let unit = "";
  let summaryText = "";
  let rows: Row[] = [];
  let bands: BandMark[] = [];
  let tiles: Summary | null = null;
  let tileFormat: (n: number) => string = (n) => n.toLocaleString("en-GB");
  const loading = metric === "water" ? water === null : readings === null;

  if (metric === "water" && water) {
    unit = "ml";
    bars = dailyTotals(water, days);
    goal = settings.water_goal_ml;
    const s = summarise(bars.map((b) => b.total));
    tiles = s;
    tileFormat = (n) => `${n.toLocaleString("en-GB")} ml`;
    summaryText = s ? `Average ${s.average.toLocaleString("en-GB")} ml a day over ${days} days, against a ${goal.toLocaleString("en-GB")} ml goal.` : "";
    rows = water.map((w) => ({ id: w.id, at: w.recorded_at, primary: `${w.ml.toLocaleString("en-GB")} ml` }));
  } else if (readings) {
    if (metric === "blood_pressure") {
      unit = "mmHg";
      const sys = seriesFor(readings, "systolic");
      const dia = seriesFor(readings, "diastolic");
      lines = [
        { points: sys, colour: "#2bd9f5", label: "Systolic" },
        { points: dia, colour: "#3fa9f5", label: "Diastolic" },
      ].filter((l) => l.points.length > 0);
      const s = summarise(sys.map((p) => p.value));
      const d = summarise(dia.map((p) => p.value));
      tiles = s;
      tileFormat = (n) => `${n} mmHg`;
      // AHA thresholds behind the systolic line (spec §10).
      bands = [
        { from: 0, to: 120, tone: "good", label: "Normal" },
        { from: 120, to: 130, tone: "watch", label: "Elevated" },
        { from: 130, to: 140, tone: "high", label: "High (stage 1)" },
        { from: 140, to: 999, tone: "urgent", label: "High (stage 2)" },
      ];
      summaryText = s && d ? `Average ${s.average}/${d.average} mmHg over ${s.count} reading${s.count === 1 ? "" : "s"}. Highest ${s.highest}/${d.highest}, lowest ${s.lowest}/${d.lowest}.` : "";
      rows = readings.map((r) => ({
        id: r.id, at: r.recorded_at, primary: `${r.systolic}/${r.diastolic} mmHg`,
        secondary: r.pulse ? `${r.pulse} bpm` : undefined,
        band: bpBand(r.systolic ?? 0, r.diastolic ?? 0),
      }));
    } else if (metric === "glucose") {
      unit = settings.glucose_unit;
      const pts: Point[] = seriesFor(readings, "glucose_mgdl");
      lines = [{ points: pts, colour: "#2bd9f5", label: "Blood sugar" }].filter((l) => l.points.length > 0);
      const s = summarise(pts.map((p) => p.value));
      tiles = s;
      tileFormat = (n) => `${formatValue(n, unit, GLUCOSE_FACTOR)} ${unit}`;
      summaryText = s ? `Average ${formatValue(s.average, unit, GLUCOSE_FACTOR)} ${unit} over ${s.count} reading${s.count === 1 ? "" : "s"}. Highest ${formatValue(s.highest, unit, GLUCOSE_FACTOR)}, lowest ${formatValue(s.lowest, unit, GLUCOSE_FACTOR)}.` : "";
      rows = readings.map((r) => ({
        id: r.id, at: r.recorded_at,
        primary: `${formatValue(r.glucose_mgdl ?? 0, unit, GLUCOSE_FACTOR)} ${unit}`,
        secondary: r.glucose_context ?? undefined,
        band: glucoseBand(r.glucose_mgdl ?? 0, r.glucose_context ?? "random"),
      }));
    } else {
      unit = settings.cholesterol_unit;
      const pts = seriesFor(readings, "chol_total_mgdl");
      lines = [{ points: pts, colour: "#2bd9f5", label: "Total cholesterol" }].filter((l) => l.points.length > 0);
      const s = summarise(pts.map((p) => p.value));
      tiles = s;
      tileFormat = (n) => `${formatValue(n, unit, CHOLESTEROL_FACTOR)} ${unit}`;
      bands = [
        { from: 0, to: 200, tone: "good", label: "Desirable" },
        { from: 200, to: 240, tone: "watch", label: "Borderline" },
        { from: 240, to: 999, tone: "high", label: "High" },
      ];
      summaryText = s ? `Average ${formatValue(s.average, unit, CHOLESTEROL_FACTOR)} ${unit} over ${s.count} reading${s.count === 1 ? "" : "s"}. Highest ${formatValue(s.highest, unit, CHOLESTEROL_FACTOR)}, lowest ${formatValue(s.lowest, unit, CHOLESTEROL_FACTOR)}.` : "";
      rows = readings.map((r) => ({
        id: r.id, at: r.recorded_at,
        primary: `${formatValue(r.chol_total_mgdl ?? 0, unit, CHOLESTEROL_FACTOR)} ${unit}`,
        band: cholesterolBand(r.chol_total_mgdl ?? 0),
      }));
    }
  }

  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium ${
      active ? "border-cyan bg-cyan text-navy" : "border-silver/30 text-silver hover:border-silver/60"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">Trends</h1>

      <div role="group" aria-label="Metric" className="flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button key={m.key} type="button" aria-pressed={metric === m.key}
            onClick={() => setMetric(m.key)} className={chip(metric === m.key)}>
            {m.label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Time window" className="flex flex-wrap gap-2">
        {WINDOWS.map((w) => (
          <button key={w.days} type="button" aria-pressed={days === w.days}
            onClick={() => setDays(w.days)} className={chip(days === w.days)}>
            {w.label}
          </button>
        ))}
      </div>

      {error ? (
        <div>
          <p role="alert" className="text-sm text-[#ff9db0]">Couldn&rsquo;t load your readings.</p>
          <button type="button" onClick={reload}
            className="motion-press mt-3 inline-flex min-h-11 items-center rounded-full border border-cyan/60 px-4 text-sm font-semibold text-cyan hover:border-cyan">
            Try again
          </button>
        </div>
      ) : loading ? (
        <p role="status" className="text-sm text-silver">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-sm text-silver">
            Nothing logged in this window yet. Readings you add appear here.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            {!asTable ? <TrendChart lines={lines} bars={bars} bands={bands} goal={goal} unit={unit} caption={summaryText} /> : null}
            {tiles ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([["Average", tiles.average], ["Lowest", tiles.lowest], ["Highest", tiles.highest]] as const).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-navy/60 p-3">
                    <dt className="text-xs text-silver/80">{k}</dt>
                    <dd className="mt-0.5 font-heading text-lg font-semibold text-starlight">{tileFormat(v)}</dd>
                  </div>
                ))}
                <div className="rounded-xl bg-navy/60 p-3">
                  <dt className="text-xs text-silver/80">Entries</dt>
                  <dd className="mt-0.5 font-heading text-lg font-semibold text-starlight">{tiles.count}</dd>
                </div>
              </dl>
            ) : null}
            <p className="mt-3 text-sm text-silver">{summaryText}</p>
            {bands.length > 0 && !asTable ? (
              <p className="mt-1 text-xs text-silver/70">
                Shaded bands: {bands.map((b) => b.label).join(" · ")}. {DISCLAIMER}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {lines.length > 1 ? (
                <p className="text-xs text-silver/80">
                  {lines.map((l) => (
                    <span key={l.label} className="mr-3">
                      <span aria-hidden="true" style={{ color: l.colour }}>■</span> {l.label}
                    </span>
                  ))}
                </p>
              ) : null}
              <button type="button" onClick={() => setAsTable((v) => !v)}
                className="text-sm font-medium text-cyan underline-offset-4 hover:underline">
                {asTable ? "Show the chart" : "View as table"}
              </button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg">Entries</h2>
            <table className="mt-3 w-full text-sm">
              <caption className="sr-only">{summaryText}</caption>
              <thead>
                <tr className="border-b border-line-dark text-left text-silver">
                  <th scope="col" className="py-2 font-semibold">When</th>
                  <th scope="col" className="py-2 font-semibold">Reading</th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    <span className="sr-only">Delete</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line-dark/60">
                    <td className="py-2 align-top text-silver">{relativeTime(r.at)}</td>
                    <td className="py-2 align-top">
                      <span className="text-starlight">{r.primary}</span>
                      {r.secondary ? <span className="ml-2 text-silver">{r.secondary}</span> : null}
                      {r.band ? <span className="ml-2 inline-block"><RangeBadge band={r.band} /></span> : null}
                    </td>
                    <td className="py-2 text-right align-top">
                      <button type="button"
                        onClick={() => remove(metric === "water" ? "water_intake" : "readings", r.id)}
                        className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-[#ff9db0] underline-offset-4 hover:underline">
                        Delete<span className="sr-only"> the entry from {relativeTime(r.at)}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="text-xs text-silver/70">{DISCLAIMER}</p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/app/app/trends/page.tsx`**

```tsx
import type { Metadata } from "next";
import { TrendsScreen } from "@/components/app/TrendsScreen";

export const metadata: Metadata = { title: { absolute: "Trends | Aurora Health" } };

export default function TrendsPage() {
  return <TrendsScreen />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/app/TrendsScreen.tsx src/app/app/trends/page.tsx && git commit -m "feat(app): Trends with charts, summary, table view and delete"
```

---

### Task 12: Record screen

**Files:**
- Create: `src/components/app/RecordScreen.tsx`
- Modify: `src/app/app/record/page.tsx` (replace the stub)

This is the nursing checklist from the 31 August meeting: conditions, surgeries, medications, allergies, family history.

- [ ] **Step 1: `src/components/app/RecordScreen.tsx`**

```tsx
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
      if (entry) await updateProfileEntry(entry.id, row);
      else if (status.patientId) await insertProfileEntry(status.patientId, row);
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
```

- [ ] **Step 2: Replace `src/app/app/record/page.tsx`**

```tsx
import type { Metadata } from "next";
import { RecordScreen } from "@/components/app/RecordScreen";

export const metadata: Metadata = { title: { absolute: "Health record | Aurora Health" } };

export default function RecordPage() {
  return <RecordScreen />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/app/RecordScreen.tsx src/app/app/record/page.tsx && git commit -m "feat(app): the health record checklist"
```

---

### Task 13: App icons from the commissioned mark

**Files:**
- Create: `public/app-icons/icon-192.png`, `icon-512.png`, `maskable-192.png`, `maskable-512.png`, `apple-touch-icon.png`
- Create: `scripts/build-app-icons.py`

PDR §4.1: "Favicon/app icon: the caduceus 'A' or molecule mark alone on navy." The full lockup is 3.6:1 and turns to mush in a square, so the icon is the caduceus "A" cropped from the commissioned artwork — verified crop box `(830, 0, 1000, 276)`, which clears the tail of the preceding "R".

- [ ] **Step 1: `scripts/build-app-icons.py`**

```python
#!/usr/bin/env python3
"""Build the PWA icons from the commissioned logo.

PDR §4.1 puts the caduceus "A" alone on Deep Space Navy for an app icon —
the full lockup is 3.6:1 and illegible in a square. The crop box below was
checked visually; it starts right of the "R" in AURORA.

Maskable icons must survive a circular mask, so the mark is drawn inside
the middle 60% (the spec's safe zone is the central 80%, and 60% leaves
room for the platform's own rounding).

    python3 scripts/build-app-icons.py
"""
import pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "brand" / "hm-aurora-logo.png"
OUT = ROOT / "public" / "app-icons"
NAVY = (6, 11, 34, 255)          # --aurora-navy
CROP = (830, 0, 1000, 276)       # the caduceus "A"

def build(size: int, coverage: float, name: str) -> None:
    mark = Image.open(SRC).convert("RGBA").crop(CROP)
    mark = mark.crop(mark.getbbox())                  # trim transparent edges
    target = int(size * coverage)
    ratio = min(target / mark.width, target / mark.height)
    mark = mark.resize((max(1, round(mark.width * ratio)), max(1, round(mark.height * ratio))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), NAVY)
    canvas.paste(mark, ((size - mark.width) // 2, (size - mark.height) // 2), mark)
    canvas.save(OUT / name)
    print(f"{name}: {size}x{size}, mark {mark.width}x{mark.height}")

OUT.mkdir(parents=True, exist_ok=True)
build(192, 0.78, "icon-192.png")
build(512, 0.78, "icon-512.png")
build(192, 0.60, "maskable-192.png")     # safe zone for a circular mask
build(512, 0.60, "maskable-512.png")
build(180, 0.78, "apple-touch-icon.png") # iOS home screen
```

- [ ] **Step 2: Run it and check the result**

```bash
cd "/Users/stefangravesande/Documents/Projects/HM AURORA/aurora-website" && python3 scripts/build-app-icons.py && ls -la public/app-icons/
```
Expected: five PNGs. **Open `icon-512.png` and look at it** — the caduceus and its wings should sit centred on navy with no fragment of the "R" and no clipped wingtip. If a wingtip is cut, widen the crop's left edge by 10px and re-run; if the mark looks small, raise the coverage.

- [ ] **Step 3: Commit**

```bash
git add scripts/build-app-icons.py public/app-icons && git commit -m "feat(app): PWA icons from the commissioned caduceus mark"
```

---

### Task 14: Manifest, service worker and the install hint

**Files:**
- Create: `src/app/manifest.ts`, `public/sw.js`, `src/components/app/InstallHint.tsx`, `src/components/app/RegisterServiceWorker.tsx`
- Modify: `src/app/app/layout.tsx`

**The service worker must never cache clinical data.** Spec §4: nothing from the Supabase origin is cached, ever. Get this wrong and health data sits in a browser cache that outlives sign-out.

- [ ] **Step 1: `src/app/manifest.ts`**

```ts
import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prerendered to /manifest.webmanifest. Paths carry the base path
 *  explicitly: Next does not rewrite strings inside this object. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aurora Health",
    short_name: "Aurora",
    description: "Track your blood pressure, blood sugar, cholesterol, water and exercise with H.M. Aurora.",
    start_url: `${base}/app/`,
    scope: `${base}/app/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#060B22",
    theme_color: "#060B22",
    icons: [
      { src: `${base}/app-icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/app-icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/app-icons/maskable-192.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: `${base}/app-icons/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 2: `public/sw.js`**

```js
/*
 * Aurora Health service worker — app shell only.
 *
 * The one rule that matters: NOTHING from the Supabase origin is ever
 * cached (spec §4). Clinical data must not survive in a browser cache
 * after sign-out, so every API request goes straight to the network and
 * its response is never stored. Only same-origin static assets and shell
 * HTML are cached.
 */
const VERSION = "aurora-v1";
const SHELL = `${VERSION}-shell`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Anything not on our own origin — Supabase above all — is passed
  // through untouched and never cached.
  if (url.origin !== self.location.origin) return;

  const isStatic = url.pathname.includes("/_next/static/") ||
    /\.(?:png|jpg|jpeg|svg|webp|woff2?|ico)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(request, copy)); }
          return res;
        }),
      ),
    );
    return;
  }

  // Shell HTML: network first so an update is picked up, cache as the
  // offline fallback. The app then shows its own offline banner.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(request, copy)); }
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit ?? caches.match(`${self.registration.scope}`))),
    );
  }
});
```

- [ ] **Step 3: `src/components/app/RegisterServiceWorker.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { asset } from "@/lib/asset";

/** Registered from the app layout, scoped to /app so the marketing site
 *  is untouched. Failure is non-fatal — the app works without it. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(asset("/sw.js"), { scope: asset("/app/") })
      .catch(() => undefined);
  }, []);
  return null;
}
```

- [ ] **Step 4: `src/components/app/InstallHint.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Android fires beforeinstallprompt and we can show a real button; iOS
 *  never does, so it gets the Share → Add to Home Screen instructions. */
export function InstallHint() {
  const [deferred, setDeferred] = useState<Prompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as Prompt); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return <p className="mt-2 text-sm text-silver">Already installed on this device.</p>;

  return (
    <div className="mt-2 flex flex-col gap-3">
      <p className="text-sm text-silver">
        Add Aurora to your home screen and it opens like an app, without the browser bars.
      </p>
      {deferred ? (
        <button type="button"
          onClick={() => { deferred.prompt().catch(() => undefined); setDeferred(null); }}
          className="motion-press inline-flex min-h-11 w-fit items-center rounded-full bg-cyan px-4 text-sm font-semibold text-navy hover:bg-blue">
          Add to home screen
        </button>
      ) : ios ? (
        <p className="text-sm text-silver">
          Tap the Share button at the bottom of Safari, then <strong className="text-starlight">Add to Home Screen</strong>.
        </p>
      ) : (
        <p className="text-sm text-silver">
          Open your browser&rsquo;s menu and choose <strong className="text-starlight">Install app</strong> or{" "}
          <strong className="text-starlight">Add to Home screen</strong>.
        </p>
      )}
      <p className="text-xs text-silver/70">
        You sign in again inside the installed app — it keeps its own separate session.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Wire it into `src/app/app/layout.tsx`**

Add the import and render the registration component, and extend the metadata:

```tsx
import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app/AppShell";
import { RegisterServiceWorker } from "@/components/app/RegisterServiceWorker";
import { asset } from "@/lib/asset";

export const metadata: Metadata = {
  title: { default: "Aurora Health", template: "%s | Aurora Health" },
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Aurora", statusBarStyle: "black-translucent" },
  icons: { apple: asset("/app-icons/apple-touch-icon.png") },
};

export const viewport: Viewport = { themeColor: "#060B22", viewportFit: "cover" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegisterServiceWorker />
      <AppShell>{children}</AppShell>
    </>
  );
}
```

- [ ] **Step 6: Verify the whole thing compiles and the manifest is right**

```bash
npm run lint && npm run typecheck && npx vitest run && npm run build 2>&1 | tail -3
```
Expected: green; the route list now includes `/manifest.webmanifest` and `/app/more/access`. Then:

```bash
cat out/manifest.webmanifest && ls out/app-icons/ && head -3 out/sw.js
```
Expected: the manifest's `start_url` and every icon path carry no base path locally (they gain `/aurora-website` only in the Pages build, where `NEXT_PUBLIC_BASE_PATH` is set); five icons present; `sw.js` copied verbatim.

- [ ] **Step 7: Commit**

```bash
git add src/app/manifest.ts public/sw.js src/components/app/InstallHint.tsx src/components/app/RegisterServiceWorker.tsx src/app/app/layout.tsx && git commit -m "feat(app): installable to the home screen, shell-only service worker"
```

---

### Task 15: Documentation

**Files:**
- Modify: `docs/PDR.md` (§11.1), `src/app/privacy-centre/notice/page.tsx`, `src/content/site.ts`, `src/lib/consent.ts`, `docs/PLAN.md`

The spec has said since day one that these land with Plan 2.

- [ ] **Step 1: Amend PDR §11.1**

In `docs/PDR.md` §11.1, after the "Single source of truth" bullet, add:

```markdown
- **Aurora Digital Health Platform v0 (added 2026-09-09).** Until a dedicated EHR exists, the `health` schema in the HM-Aurora database *is* the platform, and it is the single source of truth for clinical data. Patient-entered readings, lifestyle entries and health-record entries live there under a pseudonymous patient identifier, separated from identity in `public`, with row-level security, an explicit Art. 9 consent gate, an append-only access log and scheduled retention. The public website's own schema still stores no clinical data. The FHIR boundary in §11.5 is honoured through the export format and the schema separation, and becomes an API boundary when the EHR arrives.
```

- [ ] **Step 2: Add a health-data section to the privacy notice**

In `src/app/privacy-centre/notice/page.tsx`, after the "What we collect on this website — and why" section, add a new `<section>`:

```tsx
          <section>
            <h2 className="text-2xl">Health data in the Aurora app</h2>
            <p className="mt-4">
              If you use the Aurora app, we store the health information you enter: blood pressure, blood
              sugar and cholesterol readings, water and exercise entries, and the health record you keep
              there — conditions, surgeries, medications, allergies and family history. This is
              special-category data, so we rely on your <strong>explicit consent</strong> (GDPR Article
              9(2)(a)), asked for in the app before anything is stored and withdrawable in one tap.
            </p>
            <p className="mt-4">
              It is held in Aurora&rsquo;s database, which runs on Supabase on servers in Brazil, encrypted,
              and filed under a code rather than your name. Every time your record is opened or changed it
              is logged, and you can read that log yourself in the app. Readings stay in the app for 12
              months and then move to our archive. If you withdraw consent, tracking stops at once and your
              health data is deleted 30 days later unless you change your mind. Withdrawing does not undo
              processing already carried out lawfully.
            </p>
          </section>
```

- [ ] **Step 3: Bump the notice version**

In `src/content/site.ts` change `privacyNoticeVersion` to `"1.1 (9 September 2026)"`, and in `src/lib/consent.ts` change `NOTICE_VERSION` to `"1.1-2026-09-09"`.

**Consequence to state in your report:** bumping `NOTICE_VERSION` invalidates stored cookie consent, so returning visitors see the cookie banner again. That is the intended behaviour when the notice changes, and it does *not* touch `HEALTH_NOTICE_VERSION`, so no patient is asked to re-consent to health tracking.

- [ ] **Step 4: Tick M9 in `docs/PLAN.md`**

Replace the M9 "Done when" list with:

```markdown
Done when:
- [x] `npm run test:rls` proves own-rows-only, consent-gated writes, tamper-proof log, anon locked out
- [x] Consent → Today → Log flow passes Playwright + axe at 375 px
- [x] Plan 2 delivered: Trends, Record, More (withdraw/export/access history), PWA manifest + service worker, PDR/notice updates
```

and append below it:

```markdown
**Plan 2 (2026-09-09).** Plan `docs/superpowers/plans/2026-09-09-health-app-plan-2.md`. Trends (charts, summary, table view, delete), the Record checklist, and More — consent withdrawal with a 30-day resume window, immediate deletion, FHIR R4 download, the patient's own access history, and units/goals. The app is installable to a home screen; the service worker caches the shell only and never a Supabase response. PDR §11.1 now names the `health` schema as the Aurora Digital Health Platform v0; the privacy notice gains a health-data section at version 1.1. **Still open, and gating a public launch:** clinician sign-off on the reference thresholds and urgent wording (spec §18 item 1) and the DPIA (item 4).
```

- [ ] **Step 5: Commit**

```bash
git add docs/PDR.md docs/PLAN.md src/app/privacy-centre/notice/page.tsx src/content/site.ts src/lib/consent.ts && git commit -m "docs: PDR 11.1 amendment, health-data privacy notice, PLAN M9 complete"
```

---

### Task 16: End-to-end coverage and final verification

**Files:**
- Modify: `tests/e2e/health-app.spec.ts`

Read the components before writing selectors — the plan above may not match what actually shipped. If a selector does not match, fix the test and say so; **never weaken an assertion to make it pass.** If the app is wrong, report that and stop.

- [ ] **Step 1: Add a Plan 2 walk to the existing spec**

Append inside the existing file (it already seeds a patient in `beforeAll` and deletes it in `afterAll`):

```ts
test("More: download, access history, units, and the withdraw flow", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/more/");
  await expect(page.getByRole("heading", { name: "More", level: 1 })).toBeVisible();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });

  // Download produces a real file and logs itself.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /download my data/i }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^aurora-health-data-\d{4}-\d{2}-\d{2}\.json$/);

  // The access history shows the patient's own events and nothing else.
  await page.getByRole("link", { name: /who has accessed my data/i }).click();
  await expect(page.getByRole("heading", { name: /who has accessed my data/i })).toBeVisible();
  await expect(page.getByText(/opened the app/i).first()).toBeVisible();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });

  // Withdrawing stops tracking and offers a resume.
  await page.goto("/app/more/");
  await page.getByRole("button", { name: "Stop tracking" }).click();
  await page.getByRole("button", { name: /yes, stop tracking/i }).click();
  await expect(page.getByText(/tracking is stopped/i)).toBeVisible();
  await page.getByRole("button", { name: /resume tracking/i }).click();
  await expect(page.getByRole("button", { name: "Stop tracking" })).toBeVisible();
});

test("Record: add an entry, see it, remove it", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/record/");
  await expect(page.getByRole("heading", { name: "Health record", level: 1 })).toBeVisible();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });

  await page.getByRole("button", { name: /^add condition$/i }).click();
  await page.getByLabel("Name").fill("Hypertension");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Hypertension")).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /remove hypertension/i }).click();
  await expect(page.getByText("Hypertension")).toHaveCount(0);
});

test("Trends: log a reading, then see it charted and listed", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/");
  await page.getByRole("button", { name: "Log a reading" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Systolic (top)").fill("128");
  await dialog.getByLabel("Diastolic (bottom)").fill("82");
  await dialog.getByRole("button", { name: "Save" }).click();
  await dialog.getByRole("button", { name: "Done" }).click();

  await page.goto("/app/trends/");
  await expect(page.getByRole("heading", { name: "Trends", level: 1 })).toBeVisible();
  await expect(page.getByText("128/82 mmHg")).toBeVisible();
  await expect(page.getByRole("img", { name: /average/i })).toBeVisible();
  await page.getByRole("button", { name: /view as table/i }).click();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });
});
```

Note the first test both withdraws and resumes: leaving the patient withdrawn would make the other tests fail on a consent-gated write, and the order tests run in is not guaranteed to save you.

- [ ] **Step 2: Run everything, in this order, never concurrently**

```bash
cd "/Users/stefangravesande/Documents/Projects/HM AURORA/aurora-website" && npm run verify
```
Expected: lint, typecheck, unit tests (now ~52) and the build all green; the route list includes `/app/more/access` and `/manifest.webmanifest`.

```bash
npm run test:rls
```
Expected: `ALL RLS CHECKS PASSED` and `ALL HEALTH RLS CHECKS PASSED`.

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null; npm run test:e2e
```
Expected: all specs green, no accessibility violations.

- [ ] **Step 3: Confirm no test patient was left behind**

```bash
node --env-file=.env.local -e '
import("@supabase/supabase-js").then(async ({ createClient }) => {
  const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { data } = await a.auth.admin.listUsers({ perPage: 200 });
  const left = data.users.filter(u => /^(e2e-health|rls-health|rls\+)/.test(u.email ?? ""));
  console.log("leftover test accounts:", left.length, left.map(u => u.email).join(", "));
});'
```
Expected: `leftover test accounts: 0`.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/health-app.spec.ts && git commit -m "test(app): e2e for More, Record and Trends"
```

---

## Before this is called done

1. **A human walks the app on a real phone.** Sign in, consent, log a reading, look at Trends, add a record entry, open the access history, download the file and open it, then add the app to the home screen and launch it from there. Automated tests cannot tell you whether an installed app on an iPhone keeps its session — it has its own storage, so expect to sign in again inside it, and confirm email-and-password works there even if the Google redirect does not.
2. **Prove the service worker never cached a Supabase response.** In DevTools → Application → Cache Storage, open `aurora-v1-shell` and confirm every entry is same-origin: shell HTML and `_next/static` assets only. A single Supabase URL in that list is a data-protection defect, not a bug — stop and report it.
3. Run `/security-review` on the branch.
4. Then `superpowers:finishing-a-development-branch`. Merging to `main` deploys to the live site.
