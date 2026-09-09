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
