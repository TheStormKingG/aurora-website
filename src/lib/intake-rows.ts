/**
 * Validated form input → database row mappers, shared by the server
 * store (src/lib/store) and the client submitter (src/lib/submit).
 * One place defines what each flow persists — data-minimisation
 * reviews look here (PDR §8.1).
 */

import { NOTICE_VERSION } from "@/lib/consent";
import type {
  BookingInput,
  ContactInput,
  HomeVisitInput,
  RightsRequestInput,
} from "@/lib/validation/schemas";

/** Consent record fields stamped on every row (CLAUDE.md). */
function consentStamp() {
  return {
    consent_notice_version: NOTICE_VERSION,
    consented_at: new Date().toISOString(),
  };
}

export function bookingRow(d: BookingInput, reference: string) {
  return {
    reference,
    service: d.service,
    location: d.location,
    appointment_date: d.date,
    time_window: d.timeWindow,
    full_name: d.fullName,
    date_of_birth: d.dateOfBirth,
    phone: d.phone,
    email: d.email || null,
    reason: d.reason || null,
    reminders_opt_in: d.remindersOptIn ?? false,
    ...consentStamp(),
  };
}

export function homeVisitRow(d: HomeVisitInput, reference: string) {
  return {
    reference,
    service: d.service,
    address: d.address,
    area: d.area,
    visit_date: d.date,
    time_window: d.timeWindow,
    full_name: d.fullName,
    phone: d.phone,
    mobility_note: d.mobilityNote || null,
    ...consentStamp(),
  };
}

export function contactRow(d: ContactInput, reference: string) {
  return {
    reference,
    kind: d.kind,
    full_name: d.fullName,
    email: d.email,
    organisation: d.organisation || null,
    message: d.message,
    ...consentStamp(),
  };
}

export function rightsRequestRow(d: RightsRequestInput, reference: string) {
  const opened = new Date();
  const dueBy = new Date(opened);
  dueBy.setMonth(dueBy.getMonth() + 1); // one-month response clock (PDR §9.2)
  return {
    reference,
    requested_right: d.right,
    full_name: d.fullName,
    email: d.email,
    details: d.details || null,
    due_by: dueBy.toISOString().slice(0, 10),
    opened_at: opened.toISOString(),
  };
}
