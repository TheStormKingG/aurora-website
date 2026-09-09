import { test, expect } from "vitest";
import { GLUCOSE_FACTOR, CHOLESTEROL_FACTOR, TRIGLYCERIDE_FACTOR, toMgdl, fromMgdl, formatValue } from "@/lib/health/units";

test("mmol/L converts to mg/dL and back, rounded to one decimal", () => {
  expect(toMgdl(5.5, "mmol/L", GLUCOSE_FACTOR)).toBe(99.1);
  expect(fromMgdl(99.1, "mmol/L", GLUCOSE_FACTOR)).toBe(5.5);
});

test("mg/dL passes through (rounded to a whole number, matching formatValue's display)", () => {
  expect(toMgdl(104.26, "mg/dL", GLUCOSE_FACTOR)).toBe(104);
  expect(fromMgdl(182.4, "mg/dL", CHOLESTEROL_FACTOR)).toBe(182);
});

test("formatValue renders the display unit", () => {
  expect(formatValue(182, "mmol/L", CHOLESTEROL_FACTOR)).toBe("4.7");
  expect(formatValue(182.4, "mg/dL", CHOLESTEROL_FACTOR)).toBe("182");
});

test("triglycerides mmol/L round-trips through mg/dL", () => {
  expect(toMgdl(1.7, "mmol/L", TRIGLYCERIDE_FACTOR)).toBe(150.6);
  expect(fromMgdl(150.6, "mmol/L", TRIGLYCERIDE_FACTOR)).toBe(1.7);
});
