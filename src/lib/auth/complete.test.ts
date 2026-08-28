import { test, expect } from "vitest";
import { completeProfileSchema } from "@/lib/validation/schemas";

test("accepts a past DOB with consent", () => {
  const r = completeProfileSchema.safeParse({ dateOfBirth: "1990-01-01", consent: true });
  expect(r.success).toBe(true);
});

test("rejects a future DOB", () => {
  const r = completeProfileSchema.safeParse({ dateOfBirth: "2999-01-01", consent: true });
  expect(r.success).toBe(false);
});

test("rejects missing consent", () => {
  const r = completeProfileSchema.safeParse({ dateOfBirth: "1990-01-01", consent: false });
  expect(r.success).toBe(false);
});
