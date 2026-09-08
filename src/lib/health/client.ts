"use client";

import { getSupabase } from "@/lib/supabase/client";
import { HEALTH_NOTICE_SCOPE, HEALTH_NOTICE_VERSION } from "@/content/health-notice";
import { startOfToday, startOfWeek } from "./format";
import type { ExerciseInsert, Reading, ReadingInsert, ReadingKind, Settings, WaterInsert } from "./types";

/**
 * Data access for the `health` schema (spec §4). Every call runs under
 * the signed-in patient's JWT; RLS and consent gating live in Postgres.
 */
export function health() {
  return getSupabase().schema("health");
}

export type HealthStatus = { patientId: string | null; activeVersion: string | null; deleteAfter: string | null };

export async function fetchStatus(): Promise<HealthStatus> {
  const { data, error } = await health().rpc("my_status");
  if (error) throw error;
  const d = (data ?? {}) as { patient_id?: string; active_version?: string | null; delete_after?: string | null };
  return { patientId: d.patient_id ?? null, activeVersion: d.active_version ?? null, deleteAfter: d.delete_after ?? null };
}

/** Records explicit consent for the current notice version; returns patient_id. */
export async function grantConsent(): Promise<string> {
  const { data, error } = await health().rpc("grant_consent", {
    notice_version: HEALTH_NOTICE_VERSION,
    scope: HEALTH_NOTICE_SCOPE,
  });
  if (error) throw error;
  return data as string;
}

const APP_OPEN_KEY = "aurora-app-open";
/** One `app_open` audit row per browser session (spec D8). */
export async function logAppOpen(): Promise<void> {
  try {
    if (sessionStorage.getItem(APP_OPEN_KEY)) return;
    sessionStorage.setItem(APP_OPEN_KEY, "1");
  } catch {
    // storage blocked (private mode) — log anyway
  }
  await health().rpc("log_app_open");
}

export const DEFAULT_SETTINGS: Settings = { glucose_unit: "mg/dL", cholesterol_unit: "mg/dL", water_goal_ml: 2000 };

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await health().from("settings")
    .select("glucose_unit, cholesterol_unit, water_goal_ml").maybeSingle();
  if (error) throw error;
  return (data as Settings | null) ?? DEFAULT_SETTINGS;
}

export async function updateSettings(patientId: string, patch: Partial<Settings>): Promise<void> {
  const { error } = await health().from("settings")
    .update({ ...patch, updated_at: new Date().toISOString() }).eq("patient_id", patientId);
  if (error) throw error;
}

export async function insertReading(row: ReadingInsert): Promise<void> {
  const { error } = await health().from("readings").insert(row);
  if (error) throw error;
}

export async function insertWater(row: WaterInsert): Promise<void> {
  const { error } = await health().from("water_intake").insert(row);
  if (error) throw error;
}

export async function insertExercise(row: ExerciseInsert): Promise<void> {
  const { error } = await health().from("exercise_sessions").insert(row);
  if (error) throw error;
}

const READING_COLUMNS =
  "id, kind, recorded_at, systolic, diastolic, pulse, glucose_mgdl, glucose_context, " +
  "chol_total_mgdl, chol_ldl_mgdl, chol_hdl_mgdl, chol_trig_mgdl, entered_unit, note";

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
    h.from("settings").select("glucose_unit, cholesterol_unit, water_goal_ml").maybeSingle(),
    h.from("water_intake").select("ml").gte("recorded_at", startOfToday().toISOString()),
    h.from("exercise_sessions").select("minutes").gte("recorded_at", startOfWeek().toISOString()),
  ]);
  for (const r of [bp, gl, ch, st, wa, ex]) if (r.error) throw r.error;
  const water = (wa.data ?? []) as { ml: number }[];
  const sessions = (ex.data ?? []) as { minutes: number }[];
  return {
    latest: {
      blood_pressure: (bp.data as Reading | null) ?? null,
      glucose: (gl.data as Reading | null) ?? null,
      cholesterol: (ch.data as Reading | null) ?? null,
    },
    settings: (st.data as Settings | null) ?? DEFAULT_SETTINGS,
    waterMl: water.reduce((s, r) => s + r.ml, 0),
    exercise: { minutes: sessions.reduce((s, r) => s + r.minutes, 0), sessions: sessions.length },
  };
}
