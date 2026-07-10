/**
 * Intake persistence abstraction — SERVER path, used by the API route
 * handlers when the site runs on a Node host. The current GitHub Pages
 * deployment is a static export and uses src/lib/submit.ts instead
 * (client-side, anon key, INSERT-only RLS). Both share the row mappers
 * in src/lib/intake-rows.ts. Restore src/app/api/* from git history to
 * reactivate this path.
 *
 * Server-only module (service-role key). NO CLINICAL DATA is ever
 * written here (PDR §11.1).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  bookingRow,
  contactRow,
  homeVisitRow,
  rightsRequestRow,
} from "@/lib/intake-rows";
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

  return {
    async saveBooking(d, reference) {
      await insert("aurora_bookings", bookingRow(d, reference));
    },
    async saveHomeVisit(d, reference) {
      await insert("aurora_home_visits", homeVisitRow(d, reference));
    },
    async saveContact(d, reference) {
      await insert("aurora_contacts", contactRow(d, reference));
    },
    async saveRightsRequest(d, reference) {
      await insert("aurora_rights_requests", rightsRequestRow(d, reference));
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
