/** Pure helpers behind the Trends screen (spec §9.2). No network, no React. */
import { startOfToday } from "./format";
import type { Reading } from "./types";

export const WINDOWS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export type Point = { at: string; value: number };
export type Summary = { average: number; lowest: number; highest: number; count: number };

/** Null rather than zeroes when there is nothing — the screen shows an
 *  empty state, and a 0 average would read as a real measurement. */
export function summarise(values: number[]): Summary | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    average: Math.round(sum / values.length),
    lowest: Math.min(...values),
    highest: Math.max(...values),
    count: values.length,
  };
}

type NumericColumn = "systolic" | "diastolic" | "pulse" | "glucose_mgdl" | "chol_total_mgdl";

/** One numeric column of a reading list as a chart series, oldest first. */
export function seriesFor(rows: Reading[], column: NumericColumn): Point[] {
  return rows
    .filter((r) => r[column] !== null && r[column] !== undefined)
    .map((r) => ({ at: r.recorded_at, value: Number(r[column]) }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

export type DayTotal = { day: string; label: string; total: number };

/** Per-local-day totals for the last `days` days, gaps filled with zero so
 *  the bar chart keeps a continuous axis. */
export function dailyTotals(
  rows: { recorded_at: string; ml: number }[],
  days: number,
  now: Date = new Date(),
): DayTotal[] {
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.recorded_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    byDay.set(key, (byDay.get(key) ?? 0) + r.ml);
  }
  const out: DayTotal[] = [];
  const start = startOfToday(now);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    out.push({
      day: d.toISOString(),
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      total: byDay.get(key) ?? 0,
    });
  }
  return out;
}

/** ISO timestamp `days` before now — the lower bound of every Trends query. */
export function sinceISO(days: number, now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
