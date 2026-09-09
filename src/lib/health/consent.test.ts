import { test, expect } from "vitest";
import { HEALTH_NOTICE_VERSION } from "@/content/health-notice";
import { isConsentCurrent } from "@/lib/health/consent";

test("isConsentCurrent", () => {
  expect(isConsentCurrent(HEALTH_NOTICE_VERSION)).toBe(true);
  expect(isConsentCurrent(null)).toBe(false);
  expect(isConsentCurrent("0.9-2026-01-01")).toBe(false);
});
