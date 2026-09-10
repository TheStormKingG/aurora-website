/**
 * FHIR R4 export (spec §12, PDR §11.5 portability). One Bundle of type
 * "collection": a Patient entry carrying the name, then one resource per
 * stored row — an entry, not `contained`, because `contained` resources
 * are inline and un-referenceable, and `Patient/{id}` must resolve to a
 * sibling entry. LOINC codes are clinical identifiers — a wrong code
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

export function buildBundle(data: ExportData, now: Date = new Date()): Bundle {
  const subject = { reference: `Patient/${data.patientId}` };
  const entry: { resource: Resource }[] = [
    {
      resource: {
        resourceType: "Patient",
        id: data.patientId,
        // FHIR JSON forbids empty arrays — an absent name must omit the
        // property, not send `name: []` (S1-3).
        ...(data.fullName ? { name: [{ text: data.fullName }] } : {}),
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
        // readings_shape guarantees glucose_context is set for kind='glucose'
        // rows from the database, but Reading's own type does not encode
        // that per-kind invariant — keep the "Taken." fallback so a
        // hand-built ExportData (e.g. a test fixture) can never produce an
        // empty note.text, which FHIR treats as invalid content just like
        // the empty `name` in S1-3.
        note: [{ text: [ctx ? `Taken ${ctx}.` : null, r.note].filter(Boolean).join(" ") || "Taken." }],
      });
    } else if (r.kind === "cholesterol") {
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
    } else {
      // Exhaustiveness check: a fourth ReadingKind must fail to compile
      // here rather than silently falling into the cholesterol branch.
      const exhaustive: never = r.kind;
      throw new Error(`Unhandled reading kind: ${exhaustive}`);
    }
  }

  for (const w of data.water) {
    obs({
      id: w.id,
      code: { text: "Water intake" },
      effectiveDateTime: w.recorded_at,
      valueQuantity: { value: w.ml, unit: "mL", system: "http://unitsofmeasure.org", code: "mL" },
    });
  }

  for (const e of data.exercise) {
    obs({
      id: e.id,
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
      resourceType: "Condition", id: p.id, subject, code: { text: p.label },
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: p.is_current ? "active" : "resolved" }] },
      ...(p.occurred_on ? { onsetDateTime: p.occurred_on } : {}),
      ...(p.detail ? { note: [{ text: p.detail }] } : {}),
    }),
    surgery: (p) => ({
      resourceType: "Procedure", id: p.id, subject, status: "completed", code: { text: p.label },
      ...(p.occurred_on ? { performedDateTime: p.occurred_on } : {}),
      ...(p.detail ? { note: [{ text: p.detail }] } : {}),
    }),
    medication: (p) => ({
      resourceType: "MedicationStatement", id: p.id, subject, status: p.is_current ? "active" : "stopped",
      medicationCodeableConcept: { text: p.label },
      ...(p.occurred_on ? { effectiveDateTime: p.occurred_on } : {}),
      ...(p.detail ? { note: [{ text: p.detail }] } : {}),
    }),
    // AllergyIntolerance has no `subject` element in R4 — only `patient`
    // (1..1) (S1-1).
    allergy: (p) => ({
      resourceType: "AllergyIntolerance", id: p.id, patient: subject, code: { text: p.label },
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: p.is_current ? "active" : "inactive" }] },
      ...(p.detail ? { note: [{ text: p.detail }] } : {}),
    }),
    // FamilyMemberHistory has no `subject` element in R4 either — `patient`
    // (1..1) is the correct (and only) patient reference (S1-2).
    family_history: (p) => ({
      resourceType: "FamilyMemberHistory", id: p.id, status: "completed",
      patient: subject, relationship: { text: "Family" },
      condition: [{ code: { text: p.label } }],
      ...(p.detail ? { note: [{ text: p.detail }] } : {}),
    }),
  };
  for (const p of data.profileEntries) entry.push({ resource: byCategory[p.category](p) });

  return { resourceType: "Bundle", type: "collection", timestamp: now.toISOString(), entry };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** `aurora-health-data-YYYY-MM-DD.json` — the local calendar date, like
 *  every date-forming helper in format.ts: a patient exporting after
 *  20:00 in Guyana (UTC-4) must not get tomorrow's date. */
export function exportFilename(now: Date = new Date()): string {
  const date = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  return `aurora-health-data-${date}.json`;
}
