import { test, expect } from "vitest";
import { summarise, dailyTotals, seriesFor, WINDOWS } from "@/lib/health/stats";
import type { Reading } from "@/lib/health/types";

const bp = (recorded_at: string, systolic: number, diastolic: number): Reading => ({
  id: recorded_at, kind: "blood_pressure", recorded_at, systolic, diastolic, pulse: null,
  glucose_mgdl: null, glucose_context: null, chol_total_mgdl: null, chol_ldl_mgdl: null,
  chol_hdl_mgdl: null, chol_trig_mgdl: null, entered_unit: null, note: null,
});

test("WINDOWS are the three the spec names", () => {
  expect(WINDOWS.map((w) => w.days)).toEqual([7, 30, 90]);
});

test("summarise returns average, lowest, highest and count", () => {
  const s = summarise([120, 130, 140, 110]);
  expect(s).toEqual({ average: 125, lowest: 110, highest: 140, count: 4 });
});

test("summarise rounds the average and handles a single value", () => {
  expect(summarise([101, 102])!.average).toBe(102); // 101.5 rounds to 102; non-null: a 2-value input always returns a Summary
  expect(summarise([98])).toEqual({ average: 98, lowest: 98, highest: 98, count: 1 });
});

test("summarise of nothing is null, not zeroes", () => {
  expect(summarise([])).toBeNull();
});

test("seriesFor pulls the right column per metric, oldest first", () => {
  const rows = [bp("2026-09-03T10:00:00Z", 130, 85), bp("2026-09-01T10:00:00Z", 120, 80)];
  const sys = seriesFor(rows, "systolic");
  expect(sys.map((p) => p.value)).toEqual([120, 130]);
  expect(sys[0].at).toBe("2026-09-01T10:00:00Z");
  expect(seriesFor(rows, "diastolic").map((p) => p.value)).toEqual([80, 85]);
});

test("seriesFor skips rows whose column is null", () => {
  const rows = [bp("2026-09-01T10:00:00Z", 120, 80), { ...bp("2026-09-02T10:00:00Z", 0, 0), systolic: null }];
  expect(seriesFor(rows, "systolic")).toHaveLength(1);
});

test("dailyTotals sums per local day and fills the gaps with zero", () => {
  const day = (d: string, ml: number) => ({ recorded_at: d, ml });
  const rows = [day("2026-09-07T09:00:00", 250), day("2026-09-07T14:00:00", 500), day("2026-09-09T08:00:00", 250)];
  const out = dailyTotals(rows, 3, new Date(2026, 8, 9, 20, 0));
  expect(out).toHaveLength(3);
  expect(out.map((d) => d.total)).toEqual([750, 0, 250]);
  // en-GB's short month for September is "Sept", not "Sep" (en-US) — the
  // one month where the two locales diverge; toLocaleDateString here
  // matches the same "en-GB" convention format.ts and the site already use.
  expect(out[2].label).toBe("9 Sept");
});
