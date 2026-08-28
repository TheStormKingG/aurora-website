"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single browser Supabase client for auth + authenticated reads/writes.
 * persistSession keeps the user signed in across reloads; RLS is the real
 * security boundary (client route guards are UX only). Anonymous intake
 * (src/lib/submit.ts) can reuse this client — no session => `anon` role.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase env not configured");
  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

/** Absolute redirect base, basePath-aware, for auth email links. */
export function authRedirectBase(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${base}`;
}
