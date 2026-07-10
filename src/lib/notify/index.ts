/**
 * Notification provider abstraction (M3): email/SMS confirmations sit
 * behind this interface so Resend/Twilio (or regional equivalents) are
 * config, not code. The dev adapter logs structured events with PII
 * REDACTED — PII in logs is a bug (CLAUDE.md).
 */

export type Notification = {
  channel: "email" | "sms";
  /** Recipient — NEVER logged. */
  to: string;
  template:
    | "booking-confirmation"
    | "home-visit-confirmation"
    | "contact-receipt"
    | "rights-request-receipt";
  /** Template variables — treated as PII, never logged. */
  data: Record<string, string>;
  /** Non-PII reference for correlation. */
  reference: string;
};

export interface Notifier {
  send(notification: Notification): Promise<{ delivered: boolean }>;
}

/** Redact everything but the correlation-safe fields. */
function redactedLog(n: Notification): Record<string, string> {
  return {
    event: "notification",
    channel: n.channel,
    template: n.template,
    reference: n.reference,
    to: "[REDACTED]",
  };
}

/**
 * Dev adapter — active until RESEND_API_KEY / TWILIO_* are configured.
 * Emits a redacted structured log line and reports success so flows can
 * be exercised end-to-end without a provider.
 */
const devNotifier: Notifier = {
  async send(n) {
    console.info(JSON.stringify(redactedLog(n)));
    return { delivered: true };
  },
};

export function getNotifier(): Notifier {
  // Provider adapters land in M3 follow-up:
  // if (process.env.RESEND_API_KEY) return resendNotifier;
  return devNotifier;
}
