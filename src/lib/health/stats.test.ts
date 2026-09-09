import { test, expect } from "vitest";
import { summarise, dailyTotals, seriesFor, sinceISO, WINDOWS } from "@/lib/health/stats";
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

test("summarise rounds the average to one decimal and handles a single value", () => {
  // 101.5 stays 101.5 — average must match the same one-decimal precision
  // as lowest/highest, not the whole-number rounding it used to get (I2).
  expect(summarise([101, 102])!.average).toBe(101.5);
  expect(summarise([98])).toEqual({ average: 98, lowest: 98, highest: 98, count: 1 });
});

test("summarise rounds every field to one decimal, not just the average", () => {
  const s = summarise([120.567, 121.234])!;
  expect(s.average).toBe(120.9);
  expect(s.lowest).toBe(120.6);
  expect(s.highest).toBe(121.2);
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

test("seriesFor sorts by instant, not lexicographic string order, when offsets differ", () => {
  // "2026-09-01T23:00:00-04:00" (= 2026-09-02T03:00Z) is chronologically
  // *after* "2026-09-02T01:00:00Z", but sorts first as a plain string —
  // string sort passes only by accident while every row shares an offset (I1).
  const rows = [bp("2026-09-01T23:00:00-04:00", 130, 85), bp("2026-09-02T01:00:00Z", 120, 80)];
  expect(seriesFor(rows, "systolic").map((p) => p.value)).toEqual([120, 130]);
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

test("dailyTotals' day field is local YYYY-MM-DD and survives a month boundary", () => {
  // toISOString().slice(0, 10) on a local-midnight Date would give the
  // previous day's date in any positive-UTC-offset zone (S1-8); building
  // it from local getters instead means it also has to get the month
  // rollover right.
  const day = (d: string, ml: number) => ({ recorded_at: d, ml });
  const rows = [day("2026-09-30T10:00:00-04:00", 100), day("2026-10-01T10:00:00-04:00", 200)];
  const out = dailyTotals(rows, 3, new Date(2026, 9, 1, 12, 0));
  expect(out.map((d) => d.day)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
  expect(out.map((d) => d.total)).toEqual([0, 100, 200]);
});

test("dailyTotals converts an offset-carrying timestamp that straddles local midnight", () => {
  // PostgREST returns rows shaped like "2026-09-08T01:00:00+00:00", not the
  // offset-less, locally-readable strings used above — 01:00 UTC is 21:00
  // the *previous* day in Guyana (UTC-4). An offset-less fixture would
  // pass even if the local conversion were wrong (I4).
  const rows = [{ recorded_at: "2026-09-08T01:00:00+00:00", ml: 400 }];
  const out = dailyTotals(rows, 3, new Date(2026, 8, 9, 20, 0));
  expect(out.map((d) => d.day)).toEqual(["2026-09-07", "2026-09-08", "2026-09-09"]);
  expect(out.map((d) => d.total)).toEqual([400, 0, 0]);
});

test("sinceISO is the local-midnight lower bound dailyTotals also buckets from", () => {
  const now = new Date(2026, 8, 9, 20, 0); // Sept 9, 20:00 local
  expect(sinceISO(3, now)).toBe(new Date(2026, 8, 7, 0, 0).toISOString());
});

test("a reading at 23:59 local on the earliest day is inside sinceISO's window and lands on the first bar", () => {
  // Regression guard for S1-5: sinceISO used to be a rolling `now - days`,
  // wider than dailyTotals' calendar-day buckets, so a row like this one
  // was fetched but contributed to no bar while still counting in
  // `summarise` — the chart and the summary tiles disagreed about the same data.
  const now = new Date(2026, 8, 9, 20, 0);
  const since = sinceISO(3, now);
  const lateOnEarliestDay = new Date(2026, 8, 7, 23, 59).toISOString();
  expect(lateOnEarliestDay >= since).toBe(true);

  const out = dailyTotals([{ recorded_at: lateOnEarliestDay, ml: 300 }], 3, now);
  expect(out.map((d) => d.total)).toEqual([300, 0, 0]);
});
