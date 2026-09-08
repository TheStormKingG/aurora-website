import { test, expect } from "vitest";
import {
  bpReadingSchema, glucoseReadingSchema, cholesterolReadingSchema,
  waterSchema, exerciseSchema, healthConsentSchema,
} from "@/lib/validation/health";

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

test("blood pressure: accepts a normal reading, rejects inverted and out-of-range", () => {
  expect(bpReadingSchema.safeParse({ systolic: 128, diastolic: 82, recordedAt: now() }).success).toBe(true);
  const inverted = bpReadingSchema.safeParse({ systolic: 80, diastolic: 120, recordedAt: now() });
  expect(inverted.success).toBe(false);
  expect(bpReadingSchema.safeParse({ systolic: 400, diastolic: 82, recordedAt: now() }).success).toBe(false);
  expect(bpReadingSchema.safeParse({ systolic: 128, diastolic: 82, pulse: 10, recordedAt: now() }).success).toBe(false);
});

test("blood pressure: pulse upper bound at 250", () => {
  expect(bpReadingSchema.safeParse({ systolic: 120, diastolic: 80, pulse: 250, recordedAt: now() }).success).toBe(true);
  expect(bpReadingSchema.safeParse({ systolic: 120, diastolic: 80, pulse: 251, recordedAt: now() }).success).toBe(false);
});

test("glucose: converts mmol/L before the range check", () => {
  expect(glucoseReadingSchema.safeParse({ value: 5.5, unit: "mmol/L", context: "fasting", recordedAt: now() }).success).toBe(true);
  expect(glucoseReadingSchema.safeParse({ value: 40, unit: "mmol/L", context: "fasting", recordedAt: now() }).success).toBe(false);
  expect(glucoseReadingSchema.safeParse({ value: 104, unit: "mg/dL", context: "nope", recordedAt: now() }).success).toBe(false);
});

test("glucose: upper bound at 600 mg/dL", () => {
  expect(glucoseReadingSchema.safeParse({ value: 600, unit: "mg/dL", context: "random", recordedAt: now() }).success).toBe(true);
  expect(glucoseReadingSchema.safeParse({ value: 601, unit: "mg/dL", context: "random", recordedAt: now() }).success).toBe(false);
});

test("cholesterol: total required, optional parts range-checked", () => {
  expect(cholesterolReadingSchema.safeParse({ total: 182, unit: "mg/dL", recordedAt: now() }).success).toBe(true);
  expect(cholesterolReadingSchema.safeParse({ total: 182, ldl: 2000, unit: "mg/dL", recordedAt: now() }).success).toBe(false);
  expect(cholesterolReadingSchema.safeParse({ unit: "mg/dL", recordedAt: now() }).success).toBe(false);
});

test("cholesterol: mmol/L panel converts before range-checking, and each bad field is flagged on its own path", () => {
  const normal = cholesterolReadingSchema.safeParse({
    total: 4.5, ldl: 2.5, hdl: 1.3, triglycerides: 1.2, unit: "mmol/L", recordedAt: now(),
  });
  expect(normal.success).toBe(true);

  // 60 mmol/L triglycerides converts to ~5314 mg/dL, over the 5000 mg/dL
  // CHECK bound — the LDL/HDL/total values here are all normal, so a
  // wrongly-attributed error (Fix 1) would land on "total" instead.
  const badTrig = cholesterolReadingSchema.safeParse({
    total: 4.5, ldl: 2.5, hdl: 1.3, triglycerides: 60, unit: "mmol/L", recordedAt: now(),
  });
  expect(badTrig.success).toBe(false);
  if (!badTrig.success) {
    const paths = badTrig.error.issues.map((i) => i.path.join("."));
    expect(paths).toContain("triglycerides");
    expect(paths).not.toContain("total");
  }
});

test("recordedAt: not in the future, not older than 30 days", () => {
  expect(waterSchema.safeParse({ ml: 250, recordedAt: daysAgo(-1) }).success).toBe(false);
  expect(waterSchema.safeParse({ ml: 250, recordedAt: daysAgo(31) }).success).toBe(false);
  expect(waterSchema.safeParse({ ml: 250, recordedAt: daysAgo(29) }).success).toBe(true);
});

test("recordedAt: exactly now passes; a bare date and unparseable input are rejected with their own message", () => {
  expect(waterSchema.safeParse({ ml: 250, recordedAt: now() }).success).toBe(true);

  // A bare "YYYY-MM-DD" parses as UTC midnight (Date.parse), silently
  // drifting a day in negative-UTC zones — it must be rejected as an
  // incomplete datetime, not treated as a value that is simply out of range.
  const bareDate = waterSchema.safeParse({ ml: 250, recordedAt: "2026-09-08" });
  expect(bareDate.success).toBe(false);
  if (!bareDate.success) expect(bareDate.error.issues[0].message).toBe("Enter a valid date and time.");

  const notADate = waterSchema.safeParse({ ml: 250, recordedAt: "not a date" });
  expect(notADate.success).toBe(false);
  if (!notADate.success) expect(notADate.error.issues[0].message).toBe("Enter a valid date and time.");
});

test("water and exercise ranges", () => {
  expect(waterSchema.safeParse({ ml: 20, recordedAt: now() }).success).toBe(false);
  expect(exerciseSchema.safeParse({ activity: "walk", minutes: 30, recordedAt: now() }).success).toBe(true);
  expect(exerciseSchema.safeParse({ activity: "walk", minutes: 0, recordedAt: now() }).success).toBe(false);
});

test("water: upper bound at 3000 ml", () => {
  expect(waterSchema.safeParse({ ml: 3000, recordedAt: now() }).success).toBe(true);
  expect(waterSchema.safeParse({ ml: 3001, recordedAt: now() }).success).toBe(false);
});

test("note: accepts up to 300 characters, rejects 301, and accepts null (a cleared field)", () => {
  const note300 = "a".repeat(300);
  const note301 = "a".repeat(301);
  expect(exerciseSchema.safeParse({ activity: "walk", minutes: 10, note: note300, recordedAt: now() }).success).toBe(true);
  expect(exerciseSchema.safeParse({ activity: "walk", minutes: 10, note: note301, recordedAt: now() }).success).toBe(false);
  // note is `string | null` (types.ts) — null is how a cleared field is sent.
  expect(exerciseSchema.safeParse({ activity: "walk", minutes: 10, note: null, recordedAt: now() }).success).toBe(true);
});

test("consent requires the box ticked", () => {
  expect(healthConsentSchema.safeParse({ agree: true }).success).toBe(true);
  expect(healthConsentSchema.safeParse({ agree: false }).success).toBe(false);
});
