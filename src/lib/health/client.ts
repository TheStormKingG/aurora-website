"use client";

import { getSupabase } from "@/lib/supabase/client";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { HEALTH_NOTICE_SCOPE, HEALTH_NOTICE_VERSION } from "@/content/health-notice";
import { startOfToday, startOfWeek } from "./format";
import type { ExerciseInsert, Reading, ReadingInsert, ReadingKind, Settings, WaterInsert } from "./types";
import type { ExportData, ExportExercise, ExportProfileEntry, ExportWater } from "./fhir-export";
import { sinceISO } from "./stats";

/**
 * Data access for the `health` schema (spec §4). Every call runs under
 * the signed-in patient's JWT; RLS and consent gating live in Postgres.
 * `getSupabase()` stays ungenericised (other callers share it) — the cast
 * lives here, once, so every query below is checked against the generated
 * schema instead of assuming its shape.
 */
export function health() {
  return (getSupabase() as SupabaseClient<Database>).schema("health");
}

/** postgrest-js errors are plain objects, not `Error`s, unless you opt into
 *  `.throwOnError()` — wrap so a thrown failure has a stack and survives an
 *  error boundary instead of rendering as `[object Object]`. */
function asError(error: PostgrestError): Error {
  return new Error(error.message, { cause: error });
}

export type HealthStatus = { patientId: string | null; activeVersion: string | null; deleteAfter: string | null };

export async function fetchStatus(): Promise<HealthStatus> {
  const { data, error } = await health().rpc("my_status");
  if (error) throw asError(error);
  const d = (data ?? {}) as { patient_id?: string; active_version?: string | null; delete_after?: string | null };
  return { patientId: d.patient_id ?? null, activeVersion: d.active_version ?? null, deleteAfter: d.delete_after ?? null };
}

/** Records explicit consent for the current notice version; returns patient_id. */
export async function grantConsent(): Promise<string> {
  const { data, error } = await health().rpc("grant_consent", {
    notice_version: HEALTH_NOTICE_VERSION,
    scope: HEALTH_NOTICE_SCOPE,
  });
  if (error) throw asError(error);
  return data;
}

const APP_OPEN_KEY_PREFIX = "aurora-app-open:";

/**
 * One `app_open` audit row per patient per browser session (spec §9.1;
 * PDR §11.3 — every access must be logged). The flag is set only after the
 * RPC succeeds: a patient who opens the app offline must retry the log on
 * the next call, not be marked done while the session produces no audit
 * row at all. A `sessionStorage` failure (Safari private mode) must not
 * block the call itself — the RPC's own hourly per-patient rate limit is
 * what keeps a retry harmless.
 */
export async function logAppOpen(patientId: string): Promise<void> {
  const key = `${APP_OPEN_KEY_PREFIX}${patientId}`;
  try {
    if (sessionStorage.getItem(key)) return;
  } catch {
    // storage blocked — fall through and log anyway
  }
  const { error } = await health().rpc("log_app_open");
  if (error) return; // leave the flag unset so the next call retries
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // storage blocked — the hourly DB rate limit caps duplicate rows
  }
}

/** Frozen: fetchSettings/loadToday hand this back as a copy, never the
 *  reference, so one optimistic mutation elsewhere can't rewrite the
 *  default for the rest of the session. */
export const DEFAULT_SETTINGS: Settings = Object.freeze({
  glucose_unit: "mg/dL",
  cholesterol_unit: "mg/dL",
  water_goal_ml: 2000,
});

// Kept as single-line literals (not `+`-concatenated): postgrest-js's
// select-query-parser reads the columns from the string's *type*, which
// only stays a literal — instead of widening to `string` — this way.
const SETTINGS_COLUMNS = "glucose_unit, cholesterol_unit, water_goal_ml";
const READING_COLUMNS =
  "id, kind, recorded_at, systolic, diastolic, pulse, glucose_mgdl, glucose_context, chol_total_mgdl, chol_ldl_mgdl, chol_hdl_mgdl, chol_trig_mgdl, entered_unit, note";

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await health().from("settings").select(SETTINGS_COLUMNS).maybeSingle();
  if (error) throw asError(error);
  return (data as Settings | null) ?? { ...DEFAULT_SETTINGS };
}

/**
 * `updated_at` is set by a BEFORE UPDATE trigger — a client-supplied value
 * is always discarded, so it isn't sent (a client clock shouldn't be the
 * source of truth regardless). RLS already scopes the update to the
 * caller's own row (spec §4), so no `patient_id` filter is needed. An
 * UPDATE matching zero rows returns no error from PostgREST, so `count` is
 * checked explicitly — a patient with no settings row must see a failure,
 * not a false "saved."
 */
export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  if (Object.keys(patch).length === 0) return; // nothing to save
  const { error, count } = await health().from("settings").update(patch, { count: "exact" });
  if (error) throw asError(error);
  if (!count) throw new Error("updateSettings matched no row");
}

export async function insertReading(row: ReadingInsert): Promise<void> {
  const { error } = await health().from("readings").insert(row);
  if (error) throw asError(error);
}

export async function insertWater(row: WaterInsert): Promise<void> {
  const { error } = await health().from("water_intake").insert(row);
  if (error) throw asError(error);
}

export async function insertExercise(row: ExerciseInsert): Promise<void> {
  const { error } = await health().from("exercise_sessions").insert(row);
  if (error) throw asError(error);
}

export type TodayData = {
  latest: Record<ReadingKind, Reading | null>;
  settings: Settings;
  waterMl: number;
  exercise: { minutes: number; sessions: number };
};

/** Everything the Today screen shows, in one round of parallel queries. */
export async function loadToday(): Promise<TodayData> {
  const h = health();
  const latest = (kind: ReadingKind) =>
    h.from("readings").select(READING_COLUMNS).eq("kind", kind)
      .order("recorded_at", { ascending: false }).limit(1).maybeSingle();
  const [bp, gl, ch, st, wa, ex] = await Promise.all([
    latest("blood_pressure"),
    latest("glucose"),
    latest("cholesterol"),
    h.from("settings").select(SETTINGS_COLUMNS).maybeSingle(),
    h.from("water_intake").select("ml").gte("recorded_at", startOfToday().toISOString()),
    h.from("exercise_sessions").select("minutes").gte("recorded_at", startOfWeek().toISOString()),
  ]);
  for (const r of [bp, gl, ch, st, wa, ex]) if (r.error) throw asError(r.error);
  const water = wa.data ?? [];
  const sessions = ex.data ?? [];
  return {
    latest: {
      // readings.kind/glucose_context/entered_unit are plain `text` columns
      // (no Postgres enum), so the generated Row types them as `string` —
      // narrowing to the app's literal unions still needs an assertion,
      // but now over a shape checked against the real columns, not `any`.
      blood_pressure: (bp.data as Reading | null) ?? null,
      glucose: (gl.data as Reading | null) ?? null,
      cholesterol: (ch.data as Reading | null) ?? null,
    },
    settings: (st.data as Settings | null) ?? { ...DEFAULT_SETTINGS },
    waterMl: water.reduce((s, r) => s + r.ml, 0),
    exercise: { minutes: sessions.reduce((s, r) => s + r.minutes, 0), sessions: sessions.length },
  };
}

// ── Trends ──────────────────────────────────────────────────────────
export async function fetchReadings(kind: ReadingKind, days: number): Promise<Reading[]> {
  const { data, error } = await health()
    .from("readings").select(READING_COLUMNS)
    .eq("kind", kind).gte("recorded_at", sinceISO(days))
    .order("recorded_at", { ascending: false });
  if (error) throw asError(error);
  return (data ?? []) as Reading[];
}

export async function fetchWaterSince(days: number): Promise<ExportWater[]> {
  const { data, error } = await health()
    .from("water_intake").select("id, ml, recorded_at")
    .gte("recorded_at", sinceISO(days)).order("recorded_at", { ascending: false });
  if (error) throw asError(error);
  return (data ?? []) as ExportWater[];
}

export async function fetchExerciseSince(days: number): Promise<ExportExercise[]> {
  const { data, error } = await health()
    .from("exercise_sessions").select("id, activity, minutes, intensity, note, recorded_at")
    .gte("recorded_at", sinceISO(days)).order("recorded_at", { ascending: false });
  if (error) throw asError(error);
  return (data ?? []) as ExportExercise[];
}

/** Deleting is RLS-scoped to the caller's own rows and the audit trigger
 *  records it, so no extra guard is needed here (spec §7). */
export async function deleteRow(
  table: "readings" | "water_intake" | "exercise_sessions" | "profile_entries",
  id: string,
): Promise<void> {
  const { error } = await health().from(table).delete().eq("id", id);
  if (error) throw asError(error);
}

// ── Record (the nursing checklist) ──────────────────────────────────
const PROFILE_COLUMNS = "id, category, label, detail, occurred_on, is_current";

export async function fetchProfileEntries(): Promise<ExportProfileEntry[]> {
  const { data, error } = await health()
    .from("profile_entries").select(PROFILE_COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw asError(error);
  return (data ?? []) as ExportProfileEntry[];
}

export type ProfileEntryWrite = {
  category: ExportProfileEntry["category"];
  label: string;
  detail: string | null;
  occurred_on: string | null;
  is_current: boolean;
};

export async function insertProfileEntry(patientId: string, row: ProfileEntryWrite): Promise<void> {
  const { error } = await health().from("profile_entries").insert({ patient_id: patientId, ...row });
  if (error) throw asError(error);
}

export async function updateProfileEntry(id: string, patch: Partial<ProfileEntryWrite>): Promise<void> {
  const { error, count } = await health()
    .from("profile_entries").update(patch, { count: "exact" }).eq("id", id);
  if (error) throw asError(error);
  if (count === 0) throw new Error("That entry no longer exists.");
}

// ── More ────────────────────────────────────────────────────────────
export type AccessEvent = {
  id: number; at: string; actor_role: string; action: string;
  resource: string | null; ip: string | null; user_agent: string | null;
};

/** The patient's own access history (spec §7, PDR §11.3). RLS returns
 *  only their rows; there is no way to ask for anyone else's. */
export async function fetchAccessLog(limit = 200): Promise<AccessEvent[]> {
  const { data, error } = await health()
    .from("access_log").select("id, at, actor_role, action, resource, ip, user_agent")
    .order("at", { ascending: false }).limit(limit);
  if (error) throw asError(error);
  return (data ?? []) as AccessEvent[];
}

export async function withdrawConsent(): Promise<void> {
  const { error } = await health().rpc("withdraw_consent");
  if (error) throw asError(error);
}

export async function deleteMyHealthData(): Promise<void> {
  const { error } = await health().rpc("delete_my_health_data");
  if (error) throw asError(error);
}

export async function logExport(): Promise<void> {
  const { error } = await health().rpc("log_export");
  if (error) throw asError(error);
}

/** Everything the FHIR bundle needs, in one round of parallel queries.
 *  Deliberately unbounded by date: an export is the patient's whole live
 *  record (archived rows are a rights request, spec §8). */
export async function loadForExport(fullName: string | null, patientId: string): Promise<ExportData> {
  const h = health();
  const [rd, wa, ex, pe] = await Promise.all([
    h.from("readings").select(READING_COLUMNS).order("recorded_at", { ascending: true }),
    h.from("water_intake").select("id, ml, recorded_at").order("recorded_at", { ascending: true }),
    h.from("exercise_sessions").select("id, activity, minutes, intensity, note, recorded_at").order("recorded_at", { ascending: true }),
    h.from("profile_entries").select(PROFILE_COLUMNS).order("created_at", { ascending: true }),
  ]);
  for (const r of [rd, wa, ex, pe]) if (r.error) throw asError(r.error);
  return {
    patientId,
    fullName,
    readings: (rd.data ?? []) as Reading[],
    water: (wa.data ?? []) as ExportWater[],
    exercise: (ex.data ?? []) as ExportExercise[],
    profileEntries: (pe.data ?? []) as ExportProfileEntry[],
  };
}

/** The signed-in patient's display name, from public.profiles — the only
 *  identifier that touches the export, and it never enters the health
 *  schema (spec §4 pseudonymisation). */
export async function fetchDisplayName(): Promise<string | null> {
  const { data, error } = await getSupabase().from("profiles").select("full_name").maybeSingle();
  if (error) throw asError(error);
  return (data as { full_name: string | null } | null)?.full_name ?? null;
}
