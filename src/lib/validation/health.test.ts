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

test("glucose: converts mmol/L before the range check", () => {
  expect(glucoseReadingSchema.safeParse({ value: 5.5, unit: "mmol/L", context: "fasting", recordedAt: now() }).success).toBe(true);
  expect(glucoseReadingSchema.safeParse({ value: 40, unit: "mmol/L", context: "fasting", recordedAt: now() }).success).toBe(false);
  expect(glucoseReadingSchema.safeParse({ value: 104, unit: "mg/dL", context: "nope", recordedAt: now() }).success).toBe(false);
});

test("cholesterol: total required, optional parts range-checked", () => {
  expect(cholesterolReadingSchema.safeParse({ total: 182, unit: "mg/dL", recordedAt: now() }).success).toBe(true);
  expect(cholesterolReadingSchema.safeParse({ total: 182, ldl: 2000, unit: "mg/dL", recordedAt: now() }).success).toBe(false);
  expect(cholesterolReadingSchema.safeParse({ unit: "mg/dL", recordedAt: now() }).success).toBe(false);
});

test("recordedAt: not in the future, not older than 30 days", () => {
  expect(waterSchema.safeParse({ ml: 250, recordedAt: daysAgo(-1) }).success).toBe(false);
  expect(waterSchema.safeParse({ ml: 250, recordedAt: daysAgo(31) }).success).toBe(false);
  expect(waterSchema.safeParse({ ml: 250, recordedAt: daysAgo(29) }).success).toBe(true);
});

test("water and exercise ranges", () => {
  expect(waterSchema.safeParse({ ml: 20, recordedAt: now() }).success).toBe(false);
  expect(exerciseSchema.safeParse({ activity: "walk", minutes: 30, recordedAt: now() }).success).toBe(true);
  expect(exerciseSchema.safeParse({ activity: "walk", minutes: 0, recordedAt: now() }).success).toBe(false);
});

test("consent requires the box ticked", () => {
  expect(healthConsentSchema.safeParse({ agree: true }).success).toBe(true);
  expect(healthConsentSchema.safeParse({ agree: false }).success).toBe(false);
});
