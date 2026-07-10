/**
 * Intake persistence abstraction — same pattern as src/lib/notify:
 * the Supabase adapter activates when SUPABASE_URL +
 * SUPABASE_SERVICE_KEY are configured; otherwise a dev adapter logs a
 * REDACTED structured line so flows still work locally.
 *
 * Server-only module (service-role key). Tables live behind RLS with
 * no policies — the browser can never touch them directly
 * (supabase/migrations/20260710163100_aurora_intake.sql).
 * NO CLINICAL DATA is ever written here (PDR §11.1).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NOTICE_VERSION } from "@/lib/consent";
import type {
  BookingInput,
  ContactInput,
  HomeVisitInput,
  RightsRequestInput,
} from "@/lib/validation/schemas";

export interface IntakeStore {
  saveBooking(data: BookingInput, reference: string): Promise<void>;
  saveHomeVisit(data: HomeVisitInput, reference: string): Promise<void>;
  saveContact(data: ContactInput, reference: string): Promise<void>;
  saveRightsRequest(data: RightsRequestInput, reference: string): Promise<void>;
}

function redactedLog(table: string, reference: string): void {
  console.info(JSON.stringify({ event: "intake.saved", store: "dev", table, reference }));
}

const devStore: IntakeStore = {
  async saveBooking(_d, reference) {
    redactedLog("aurora_bookings", reference);
  },
  async saveHomeVisit(_d, reference) {
    redactedLog("aurora_home_visits", reference);
  },
  async saveContact(_d, reference) {
    redactedLog("aurora_contacts", reference);
  },
  async saveRightsRequest(_d, reference) {
    redactedLog("aurora_rights_requests", reference);
  },
};

function makeSupabaseStore(url: string, serviceKey: string): IntakeStore {
  const client: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function insert(table: string, row: Record<string, unknown>): Promise<void> {
    const { error } = await client.from(table).insert(row);
    if (error) {
      // Correlation only — never row contents (PII in logs is a bug).
      console.error(
        JSON.stringify({ event: "intake.insert_failed", table, code: error.code ?? null })
      );
      throw new Error(`intake insert failed: ${table}`);
    }
  }

  const consentStamp = () => ({
    consent_notice_version: NOTICE_VERSION,
    consented_at: new Date().toISOString(),
  });

  return {
    async saveBooking(d, reference) {
      await insert("aurora_bookings", {
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
      });
    },
    async saveHomeVisit(d, reference) {
      await insert("aurora_home_visits", {
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
      });
    },
    async saveContact(d, reference) {
      await insert("aurora_contacts", {
        reference,
        kind: d.kind,
        full_name: d.fullName,
        email: d.email,
        organisation: d.organisation || null,
        message: d.message,
        ...consentStamp(),
      });
    },
    async saveRightsRequest(d, reference) {
      const opened = new Date();
      const dueBy = new Date(opened);
      dueBy.setMonth(dueBy.getMonth() + 1); // one-month response clock (PDR §9.2)
      await insert("aurora_rights_requests", {
        reference,
        requested_right: d.right,
        full_name: d.fullName,
        email: d.email,
        details: d.details || null,
        due_by: dueBy.toISOString().slice(0, 10),
        opened_at: opened.toISOString(),
      });
    },
  };
}

let cached: IntakeStore | null = null;

export function getStore(): IntakeStore {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  cached = url && serviceKey ? makeSupabaseStore(url, serviceKey) : devStore;
  return cached;
}
