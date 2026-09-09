import { HEALTH_NOTICE_VERSION } from "@/content/health-notice";

/**
 * Whether the patient's active consent version matches the current
 * notice (spec §5). `null` covers "no active consent" the same way a
 * stale version does — both mean re-consent is due.
 */
export function isConsentCurrent(activeVersion: string | null): boolean {
  return activeVersion === HEALTH_NOTICE_VERSION;
}
