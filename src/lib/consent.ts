/**
 * Consent model — PDR §8/§9.1: consent is granular per purpose,
 * recorded with timestamp + notice version + scope, withdrawable as
 * easily as it is given.
 *
 * The consent cookie itself is strictly necessary (it stores the
 * choice). The site sets NO other cookies and loads no third-party
 * scripts; purposes below exist so future features (e.g. cookieless
 * analytics) stay OFF until explicit opt-in (most-private defaults).
 */

export const NOTICE_VERSION = "1.0-2026-07-10";
export const CONSENT_COOKIE = "aurora-consent";
/** Re-prompt horizon: 6 months. */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182;

export type ConsentScope = {
  /** Remembered UI preferences (non-tracking). Default OFF. */
  functional: boolean;
  /** First-party, cookieless-by-default analytics. Default OFF. */
  analytics: boolean;
};

export type ConsentRecord = {
  version: string;
  /** ISO 8601 timestamp of capture. */
  timestamp: string;
  scope: ConsentScope;
};

export const mostPrivateScope: ConsentScope = {
  functional: false,
  analytics: false,
};

export function makeConsentRecord(scope: ConsentScope): ConsentRecord {
  return { version: NOTICE_VERSION, timestamp: new Date().toISOString(), scope };
}

export function serializeConsent(record: ConsentRecord): string {
  return encodeURIComponent(JSON.stringify(record));
}

export function parseConsent(raw: string | undefined): ConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentRecord>;
    if (
      typeof parsed.version !== "string" ||
      typeof parsed.timestamp !== "string" ||
      typeof parsed.scope !== "object" ||
      parsed.scope === null
    ) {
      return null;
    }
    return {
      version: parsed.version,
      timestamp: parsed.timestamp,
      scope: {
        functional: parsed.scope.functional === true,
        analytics: parsed.scope.analytics === true,
      },
    };
  } catch {
    return null;
  }
}

/** Read the consent record from document.cookie (client only). */
export function readConsentCookie(): ConsentRecord | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  const record = parseConsent(match?.slice(CONSENT_COOKIE.length + 1));
  // A record captured against an older notice version requires re-consent.
  if (record && record.version !== NOTICE_VERSION) return null;
  return record;
}

/** Persist the consent record (client only). SameSite=Strict, Secure. */
export function writeConsentCookie(record: ConsentRecord): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(record)}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Strict${secure}`;
}
