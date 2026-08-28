import { test, expect } from "vitest";
import { patientRegistrationSchema } from "@/lib/validation/schemas";

test("rejects short password", () => {
  const r = patientRegistrationSchema.safeParse({
    fullName: "Ana Test", email: "a@b.com", password: "short",
    dateOfBirth: "1990-01-01", consent: true,
  });
  expect(r.success).toBe(false);
});

test("accepts a minimal valid registration", () => {
  const r = patientRegistrationSchema.safeParse({
    fullName: "Ana Test", email: "a@b.com", password: "longenough123",
    dateOfBirth: "1990-01-01", consent: true,
  });
  expect(r.success).toBe(true);
});
