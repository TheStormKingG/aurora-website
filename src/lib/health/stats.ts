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

const round1 = (n: number) => Math.round(n * 10) / 10;
const pad2 = (n: number) => String(n).padStart(2, "0");

/** Null rather than zeroes when there is nothing — the screen shows an
 *  empty state, and a 0 average would read as a real measurement.
 *  Glucose and the lipids are numeric(6,1); round every field to the same
 *  one decimal so a tile can't read "Average 121 · Lowest 120.5" (mixed
 *  precision) or show a raw floating-point average. */
export function summarise(values: number[]): Summary | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    average: round1(sum / values.length),
    lowest: round1(Math.min(...values)),
    highest: round1(Math.max(...values)),
    count: values.length,
  };
}

type NumericColumn =
  | "systolic" | "diastolic" | "pulse" | "glucose_mgdl"
  | "chol_total_mgdl" | "chol_ldl_mgdl" | "chol_hdl_mgdl" | "chol_trig_mgdl";

/** One numeric column of a reading list as a chart series, oldest first.
 *  Sort by instant, not string order — only safe while every timestamp
 *  shares an offset, which PostgREST does not guarantee. */
export function seriesFor(rows: Reading[], column: NumericColumn): Point[] {
  return rows
    .filter((r) => r[column] !== null && r[column] !== undefined)
    .map((r) => ({ at: r.recorded_at, value: Number(r[column]) }))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export type DayTotal = { day: string; label: string; total: number };

/** Per-local-day totals for the last `days` days, gaps filled with zero so
 *  the bar chart keeps a continuous axis. `day` is built from local getters
 *  and formatted as YYYY-MM-DD directly — `toISOString().slice(0, 10)`
 *  would give the previous day's date in any positive-UTC-offset zone,
 *  even though it happens to survive in Guyana's UTC-4. */
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
      day: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      total: byDay.get(key) ?? 0,
    });
  }
  return out;
}

/** Inclusive lower bound of the same `days` local calendar days that
 *  `dailyTotals` buckets — local midnight of `days - 1` days ago, not a
 *  rolling `now - days`. The two must describe the same window: a row
 *  fetched because it falls inside a wider `sinceISO` but before
 *  `dailyTotals`' first bucket contributes 0 to every bar while still
 *  being counted by `summarise`, so the chart and the summary tiles
 *  silently disagree about the same data. */
export function sinceISO(days: number, now: Date = new Date()): string {
  const d = startOfToday(now);
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString();
}
