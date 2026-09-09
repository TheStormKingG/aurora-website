import { test, expect } from "vitest";
import { buildBundle, exportFilename } from "@/lib/health/fhir-export";
import type { ExportData } from "@/lib/health/fhir-export";

const base: ExportData = {
  patientId: "11111111-1111-1111-1111-111111111111",
  fullName: "Hannah Munro",
  readings: [], water: [], exercise: [], profileEntries: [],
};

// Structural lookups, not JSON.stringify().includes() — a substring match
// only proves a code appears *somewhere* in the bundle, which stays green
// even if two codes are swapped between resources (C1). These look up the
// actual field the export sets, so a swapped LOINC code, a wrong value or
// a wrong unit each fail on their own.
type AnyResource = Record<string, unknown>;
const resources = (b: ReturnType<typeof buildBundle>) => b.entry.map((e) => e.resource as AnyResource);
const byCode = (b: ReturnType<typeof buildBundle>, code: string) =>
  resources(b).find((r) => (r as { code?: { coding?: { code?: string }[] } }).code?.coding?.[0]?.code === code);
const byText = (b: ReturnType<typeof buildBundle>, text: string) =>
  resources(b).find((r) => (r as { code?: { text?: string } }).code?.text === text);
const byId = (b: ReturnType<typeof buildBundle>, id: string) =>
  resources(b).find((r) => (r as { id?: string }).id === id);
const byType = (b: ReturnType<typeof buildBundle>, resourceType: string) =>
  resources(b).find((r) => (r as { resourceType?: string }).resourceType === resourceType);

test("bundle is a collection with a Patient entry carrying the name", () => {
  const b = buildBundle(base);
  expect(b.resourceType).toBe("Bundle");
  expect(b.type).toBe("collection");
  const patient = b.entry[0].resource as { resourceType: string; id: string; name: { text: string }[] };
  expect(patient.resourceType).toBe("Patient");
  expect(patient.id).toBe(base.patientId);
  expect(patient.name[0].text).toBe("Hannah Munro");
});

test("a null fullName omits the name element instead of sending name: []", () => {
  // FHIR JSON forbids empty arrays (S1-3) — the property must be absent.
  const patient = buildBundle({ ...base, fullName: null }).entry[0].resource as Record<string, unknown>;
  expect(patient).not.toHaveProperty("name");
});

test("blood pressure is a panel with both component codes and mmHg", () => {
  const b = buildBundle({ ...base, readings: [{
    id: "r1", kind: "blood_pressure", recorded_at: "2026-09-08T10:00:00Z",
    systolic: 128, diastolic: 82, pulse: 72, glucose_mgdl: null, glucose_context: null,
    chol_total_mgdl: null, chol_ldl_mgdl: null, chol_hdl_mgdl: null, chol_trig_mgdl: null,
    entered_unit: null, note: null,
  }] });
  const panel = byCode(b, "85354-9") as { component: { code: { coding: { code: string }[] }; valueQuantity: { value: number; unit: string } }[] };
  const systolic = panel.component.find((c) => c.code.coding[0].code === "8480-6");
  const diastolic = panel.component.find((c) => c.code.coding[0].code === "8462-4");
  expect(systolic?.valueQuantity).toMatchObject({ value: 128, unit: "mm[Hg]" });
  expect(diastolic?.valueQuantity).toMatchObject({ value: 82, unit: "mm[Hg]" });
  // pulse is its own Observation, not a component
  const pulse = byCode(b, "8867-4") as { valueQuantity: { value: number; unit: string } };
  expect(pulse.valueQuantity).toMatchObject({ value: 72, unit: "/min" });
});

test("a blood pressure reading carries its own note, and a null pulse emits no heart-rate Observation", () => {
  const b = buildBundle({ ...base, readings: [{
    id: "r1", kind: "blood_pressure", recorded_at: "2026-09-08T10:00:00Z",
    systolic: 118, diastolic: 76, pulse: null, glucose_mgdl: null, glucose_context: null,
    chol_total_mgdl: null, chol_ldl_mgdl: null, chol_hdl_mgdl: null, chol_trig_mgdl: null,
    entered_unit: null, note: "Felt dizzy beforehand",
  }] });
  const panel = byCode(b, "85354-9") as { note?: { text: string }[] };
  expect(panel.note?.[0].text).toBe("Felt dizzy beforehand");
  expect(byCode(b, "8867-4")).toBeUndefined();
});

test("glucose carries its context in a note and cholesterol splits into four codes with matching values and units", () => {
  const b = buildBundle({ ...base, readings: [
    { id: "g", kind: "glucose", recorded_at: "2026-09-08T07:00:00Z", systolic: null, diastolic: null, pulse: null,
      glucose_mgdl: 104, glucose_context: "fasting", chol_total_mgdl: null, chol_ldl_mgdl: null,
      chol_hdl_mgdl: null, chol_trig_mgdl: null, entered_unit: "mg/dL", note: null },
    { id: "c", kind: "cholesterol", recorded_at: "2026-09-08T07:05:00Z", systolic: null, diastolic: null, pulse: null,
      glucose_mgdl: null, glucose_context: null, chol_total_mgdl: 182, chol_ldl_mgdl: 100,
      chol_hdl_mgdl: 55, chol_trig_mgdl: 140, entered_unit: "mg/dL", note: null },
  ] });
  const glucose = byCode(b, "2339-0") as { valueQuantity: { value: number; unit: string }; note: { text: string }[] };
  expect(glucose.valueQuantity).toMatchObject({ value: 104, unit: "mg/dL" });
  expect(glucose.note[0].text).toContain("fasting");

  // Each lipid is asserted by its own code with its own value and unit —
  // swapping two LOINC codes in the implementation (e.g. LDL <-> HDL) must
  // fail here, unlike the old "does this code appear anywhere" check (C1).
  const lipids: [string, number][] = [["2093-3", 182], ["2089-1", 100], ["2085-9", 55], ["2571-8", 140]];
  for (const [code, value] of lipids) {
    const obs = byCode(b, code) as { valueQuantity: { value: number; unit: string } } | undefined;
    expect(obs, `missing Observation for LOINC ${code}`).toBeTruthy();
    expect(obs!.valueQuantity).toMatchObject({ value, unit: "mg/dL" });
  }
});

test("a partial lipid panel (total only) emits just the total code", () => {
  const b = buildBundle({ ...base, readings: [{
    id: "c1", kind: "cholesterol", recorded_at: "2026-09-08T07:00:00Z", systolic: null, diastolic: null, pulse: null,
    glucose_mgdl: null, glucose_context: null, chol_total_mgdl: 190, chol_ldl_mgdl: null,
    chol_hdl_mgdl: null, chol_trig_mgdl: null, entered_unit: "mg/dL", note: null,
  }] });
  expect(byCode(b, "2093-3")).toBeTruthy();
  for (const code of ["2089-1", "2085-9", "2571-8"]) expect(byCode(b, code)).toBeUndefined();
});

test("water and exercise are text-coded observations with their own units and ids", () => {
  const b = buildBundle({ ...base,
    water: [{ id: "w1", ml: 250, recorded_at: "2026-09-08T09:00:00Z" }],
    exercise: [{ id: "e1", activity: "walk", minutes: 30, intensity: "moderate", note: null, recorded_at: "2026-09-08T18:00:00Z" }],
  });
  const w = byText(b, "Water intake") as { id: string; valueQuantity: { value: number; unit: string } };
  expect(w.valueQuantity).toMatchObject({ value: 250, unit: "mL" });
  expect(w.id).toBe("w1");
  const e = byText(b, "Exercise session") as { id: string; valueQuantity: { value: number; unit: string } };
  expect(e.valueQuantity).toMatchObject({ value: 30, unit: "min" });
  expect(e.id).toBe("e1");
});

test("each record category maps to its own FHIR resource type and keeps its id", () => {
  const entry = (category: string, label: string) => ({
    id: category, category, label, detail: null, occurred_on: null, is_current: true,
  });
  const b = buildBundle({ ...base, profileEntries: [
    entry("condition", "Hypertension"), entry("surgery", "Appendectomy"),
    entry("medication", "Amlodipine"), entry("allergy", "Penicillin"),
    entry("family_history", "Diabetes — mother"),
  ] as ExportData["profileEntries"] });
  const types = resources(b).map((r) => (r as { resourceType: string }).resourceType);
  for (const t of ["Condition", "Procedure", "MedicationStatement", "AllergyIntolerance", "FamilyMemberHistory"]) {
    expect(types).toContain(t);
  }
  expect(byType(b, "Condition")).toMatchObject({ id: "condition" });
  expect(byType(b, "Procedure")).toMatchObject({ id: "surgery" });
  expect(byType(b, "MedicationStatement")).toMatchObject({ id: "medication" });
  expect(byType(b, "AllergyIntolerance")).toMatchObject({ id: "allergy" });
  expect(byType(b, "FamilyMemberHistory")).toMatchObject({ id: "family_history" });
});

test("is_current: false selects the resolved / stopped / inactive status code", () => {
  const b = buildBundle({ ...base, profileEntries: [
    { id: "c1", category: "condition", label: "Fracture", detail: null, occurred_on: null, is_current: false },
    { id: "m1", category: "medication", label: "Amoxicillin", detail: null, occurred_on: null, is_current: false },
    { id: "a1", category: "allergy", label: "Latex", detail: null, occurred_on: null, is_current: false },
  ] });
  const condition = byId(b, "c1") as { clinicalStatus: { coding: { code: string }[] } };
  const medication = byId(b, "m1") as { status: string };
  const allergy = byId(b, "a1") as { clinicalStatus: { coding: { code: string }[] } };
  expect(condition.clinicalStatus.coding[0].code).toBe("resolved");
  expect(medication.status).toBe("stopped");
  expect(allergy.clinicalStatus.coding[0].code).toBe("inactive");
});

test("occurred_on populates the resource-specific date field when non-null", () => {
  const b = buildBundle({ ...base, profileEntries: [
    { id: "c1", category: "condition", label: "Asthma", detail: null, occurred_on: "2015-06-01", is_current: true },
    { id: "s1", category: "surgery", label: "Appendectomy", detail: null, occurred_on: "2010-03-12", is_current: false },
    { id: "m1", category: "medication", label: "Metformin", detail: null, occurred_on: "2022-01-01", is_current: true },
  ] });
  expect((byId(b, "c1") as { onsetDateTime: string }).onsetDateTime).toBe("2015-06-01");
  expect((byId(b, "s1") as { performedDateTime: string }).performedDateTime).toBe("2010-03-12");
  expect((byId(b, "m1") as { effectiveDateTime: string }).effectiveDateTime).toBe("2022-01-01");
});

test("Observation, Condition, Procedure and MedicationStatement use subject; AllergyIntolerance and FamilyMemberHistory use patient", () => {
  const b = buildBundle({ ...base,
    water: [{ id: "w1", ml: 250, recorded_at: "2026-09-08T09:00:00Z" }],
    profileEntries: [
      { id: "a1", category: "allergy", label: "Penicillin", detail: null, occurred_on: null, is_current: true },
      { id: "f1", category: "family_history", label: "Diabetes", detail: null, occurred_on: null, is_current: true },
    ],
  });
  const patientRef = `Patient/${base.patientId}`;
  for (const r of resources(b).slice(1)) {
    const withRefs = r as { resourceType: string; subject?: { reference: string }; patient?: { reference: string } };
    const field = withRefs.resourceType === "AllergyIntolerance" || withRefs.resourceType === "FamilyMemberHistory"
      ? "patient" : "subject";
    expect(withRefs[field]?.reference, `${withRefs.resourceType} should reference the patient via ${field}`).toBe(patientRef);
    // and must not also carry the other, invalid, reference field (S1-1, S1-2)
    const other = field === "patient" ? "subject" : "patient";
    expect(withRefs[other]).toBeUndefined();
  }
});

test("a patient-authored note or detail is passed through verbatim, including any email the patient wrote", () => {
  // Notes and record details are the patient's own words, returning to the
  // patient on their own export request (GDPR Art. 20) — passing them
  // through unmodified is correct; redacting content the patient typed
  // would be a data-integrity bug, not a privacy improvement. This locks
  // that policy in: the test fails if pass-through behaviour changes.
  const b = buildBundle({ ...base, profileEntries: [
    { id: "p1", category: "condition", label: "Asthma", detail: "call me at a@b.com", occurred_on: null, is_current: true },
  ] });
  const condition = byType(b, "Condition") as { note: { text: string }[] };
  expect(condition.note[0].text).toBe("call me at a@b.com");
});

test("exportFilename uses the local calendar date, not UTC", () => {
  // 22:30 local in Guyana (UTC-4) is already the 10th in UTC — the
  // filename must stay on the 9th (S1-7).
  expect(exportFilename(new Date("2026-09-09T22:30:00-04:00"))).toBe("aurora-health-data-2026-09-09.json");
  expect(exportFilename(new Date("2026-09-09T10:00:00-04:00"))).toBe("aurora-health-data-2026-09-09.json");
});

test("buildBundle takes an injectable now for a deterministic Bundle.timestamp", () => {
  const now = new Date("2026-09-08T12:00:00Z");
  expect(buildBundle(base, now).timestamp).toBe(now.toISOString());
});
