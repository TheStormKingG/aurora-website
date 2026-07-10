"use client";

/**
 * Client-side form submission for the static (GitHub Pages) deployment.
 *
 * Validation runs the SAME zod schemas the server route handlers used;
 * the database enforces a floor beneath it (CHECK constraints) and the
 * anon key can only INSERT — never read, update, or delete — via the
 * RLS policies in supabase/migrations/20260710190000_anon_insert_policies.sql.
 *
 * The publishable (anon) key is public by design; row protection lives
 * entirely in RLS. When the site moves to a Node host, restore the
 * server routes (git history: src/app/api/*) and re-point the forms.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";
import {
  bookingRow,
  contactRow,
  homeVisitRow,
  rightsRequestRow,
} from "@/lib/intake-rows";
import {
  bookingSchema,
  contactSchema,
  fieldErrors,
  homeVisitSchema,
  rightsRequestSchema,
} from "@/lib/validation/schemas";

export type SubmitResult =
  | { ok: true; reference: string }
  | { ok: false; errors?: Record<string, string>; error?: string };

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function makeReference(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function submit<T>(
  raw: unknown,
  options: {
    schema: ZodType<T>;
    table: string;
    refPrefix: string;
    toRow: (data: T, reference: string) => Record<string, unknown>;
  }
): Promise<SubmitResult> {
  // Honeypot filled → pretend success so bots learn nothing.
  if (
    typeof raw === "object" &&
    raw !== null &&
    "website" in raw &&
    typeof (raw as { website?: unknown }).website === "string" &&
    ((raw as { website: string }).website ?? "").length > 0
  ) {
    return { ok: true, reference: makeReference(options.refPrefix) };
  }

  const parsed = options.schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const reference = makeReference(options.refPrefix);
  const supabase = getClient();

  if (!supabase) {
    // Local dev without keys: keep flows usable; log redacted only.
    console.info(
      JSON.stringify({ event: "intake.dev", table: options.table, reference })
    );
    return { ok: true, reference };
  }

  const { error } = await supabase
    .from(options.table)
    .insert(options.toRow(parsed.data, reference));
  if (error) {
    console.error(
      JSON.stringify({ event: "intake.insert_failed", table: options.table, code: error.code })
    );
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
  return { ok: true, reference };
}

export function submitBooking(raw: unknown): Promise<SubmitResult> {
  return submit(raw, {
    schema: bookingSchema,
    table: "aurora_bookings",
    refPrefix: "AUR-B",
    toRow: bookingRow,
  });
}

export function submitHomeVisit(raw: unknown): Promise<SubmitResult> {
  return submit(raw, {
    schema: homeVisitSchema,
    table: "aurora_home_visits",
    refPrefix: "AUR-H",
    toRow: homeVisitRow,
  });
}

export function submitContact(raw: unknown): Promise<SubmitResult> {
  return submit(raw, {
    schema: contactSchema,
    table: "aurora_contacts",
    refPrefix: "AUR-C",
    toRow: contactRow,
  });
}

export function submitRightsRequest(raw: unknown): Promise<SubmitResult> {
  return submit(raw, {
    schema: rightsRequestSchema,
    table: "aurora_rights_requests",
    refPrefix: "AUR-R",
    toRow: rightsRequestRow,
  });
}
