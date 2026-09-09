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
