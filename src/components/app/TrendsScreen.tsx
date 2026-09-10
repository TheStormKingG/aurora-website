"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/Card";
import {
  DEFAULT_SETTINGS, deleteRow, fetchReadings, fetchSettings, fetchWaterSince,
} from "@/lib/health/client";
import { relativeTime } from "@/lib/health/format";
import { type Band, bpBand, cholesterolBand, DISCLAIMER, glucoseBand } from "@/lib/health/ranges";
import { dailyTotals, seriesFor, summarise, WINDOWS, type Point, type Summary } from "@/lib/health/stats";
import type { Reading, Settings, Unit } from "@/lib/health/types";
import { CHOLESTEROL_FACTOR, GLUCOSE_FACTOR, formatValue } from "@/lib/health/units";
import { RangeBadge } from "./RangeBadge";
import { TrendChart, type BandMark, type Line } from "./TrendChart";
import { useApp } from "./AppContext";

type Metric = "blood_pressure" | "glucose" | "cholesterol" | "water";
const METRICS: { key: Metric; label: string }[] = [
  { key: "blood_pressure", label: "Blood pressure" },
  { key: "glucose", label: "Blood sugar" },
  { key: "cholesterol", label: "Cholesterol" },
  { key: "water", label: "Water" },
];

type Row = { id: string; at: string; primary: string; secondary?: string; band?: Band };

export function TrendsScreen() {
  const { version, bump } = useApp();
  const [metric, setMetric] = useState<Metric>("blood_pressure");
  const [days, setDays] = useState<number>(30);
  const [chartHidden, setAsTable] = useState(false);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [water, setWater] = useState<{ id: string; ml: number; recorded_at: string }[] | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => { fetchSettings().then(setSettings).catch(() => undefined); }, []);

  useEffect(() => {
    let live = true;
    setError(false); setReadings(null); setWater(null);
    const job = metric === "water"
      ? fetchWaterSince(days).then((w) => { if (live) setWater(w); })
      : fetchReadings(metric, days).then((r) => { if (live) setReadings(r); });
    job.catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [metric, days, version, tick]);

  async function remove(table: "readings" | "water_intake", id: string) {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    try { await deleteRow(table, id); bump(); reload(); }
    catch { setError(true); }
  }

  // ── Build the chart, the summary and the table from whichever metric is selected
  let lines: Line[] = [];
  let bars: { label: string; total: number }[] = [];
  let goal: number | undefined;
  let unit = "";
  // formatValue takes the Unit union, not any display string, so the
  // concentration unit is carried separately from the axis label.
  let concentrationUnit: Unit = settings.glucose_unit;
  let summaryText = "";
  let rows: Row[] = [];
  let bands: BandMark[] = [];
  let tiles: Summary | null = null;
  let tileFormat: (n: number) => string = (n) => n.toLocaleString("en-GB");
  const loading = metric === "water" ? water === null : readings === null;

  if (metric === "water" && water) {
    unit = "ml";
    bars = dailyTotals(water, days);
    goal = settings.water_goal_ml;
    const s = summarise(bars.map((b) => b.total));
    tiles = s;
    tileFormat = (n) => `${n.toLocaleString("en-GB")} ml`;
    summaryText = s ? `Average ${s.average.toLocaleString("en-GB")} ml a day over ${days} days, against a ${goal.toLocaleString("en-GB")} ml goal.` : "";
    rows = water.map((w) => ({ id: w.id, at: w.recorded_at, primary: `${w.ml.toLocaleString("en-GB")} ml` }));
  } else if (readings) {
    if (metric === "blood_pressure") {
      unit = "mmHg";
      const sys = seriesFor(readings, "systolic");
      const dia = seriesFor(readings, "diastolic");
      lines = [
        { points: sys, colour: "#2bd9f5", label: "Systolic" },
        { points: dia, colour: "#3fa9f5", label: "Diastolic" },
      ].filter((l) => l.points.length > 0);
      const s = summarise(sys.map((p) => p.value));
      const d = summarise(dia.map((p) => p.value));
      tiles = s;
      tileFormat = (n) => `${n} mmHg`;
      // AHA thresholds behind the systolic line (spec §10).
      bands = [
        { from: 0, to: 120, tone: "good", label: "Normal" },
        { from: 120, to: 130, tone: "watch", label: "Elevated" },
        { from: 130, to: 140, tone: "high", label: "High (stage 1)" },
        { from: 140, to: 999, tone: "urgent", label: "High (stage 2)" },
      ];
      summaryText = s && d ? `Average ${s.average}/${d.average} mmHg over ${s.count} reading${s.count === 1 ? "" : "s"}. Highest ${s.highest}/${d.highest}, lowest ${s.lowest}/${d.lowest}.` : "";
      rows = readings.map((r) => ({
        id: r.id, at: r.recorded_at, primary: `${r.systolic}/${r.diastolic} mmHg`,
        secondary: r.pulse ? `${r.pulse} bpm` : undefined,
        band: bpBand(r.systolic ?? 0, r.diastolic ?? 0),
      }));
    } else if (metric === "glucose") {
      unit = settings.glucose_unit;
      concentrationUnit = settings.glucose_unit;
      const pts: Point[] = seriesFor(readings, "glucose_mgdl");
      lines = [{ points: pts, colour: "#2bd9f5", label: "Blood sugar" }].filter((l) => l.points.length > 0);
      const s = summarise(pts.map((p) => p.value));
      tiles = s;
      tileFormat = (n) => `${formatValue(n, concentrationUnit, GLUCOSE_FACTOR)} ${unit}`;
      summaryText = s ? `Average ${formatValue(s.average, concentrationUnit, GLUCOSE_FACTOR)} ${unit} over ${s.count} reading${s.count === 1 ? "" : "s"}. Highest ${formatValue(s.highest, concentrationUnit, GLUCOSE_FACTOR)}, lowest ${formatValue(s.lowest, concentrationUnit, GLUCOSE_FACTOR)}.` : "";
      rows = readings.map((r) => ({
        id: r.id, at: r.recorded_at,
        primary: `${formatValue(r.glucose_mgdl ?? 0, concentrationUnit, GLUCOSE_FACTOR)} ${unit}`,
        secondary: r.glucose_context ?? undefined,
        band: glucoseBand(r.glucose_mgdl ?? 0, r.glucose_context ?? "random"),
      }));
    } else {
      unit = settings.cholesterol_unit;
      concentrationUnit = settings.cholesterol_unit;
      const pts = seriesFor(readings, "chol_total_mgdl");
      lines = [{ points: pts, colour: "#2bd9f5", label: "Total cholesterol" }].filter((l) => l.points.length > 0);
      const s = summarise(pts.map((p) => p.value));
      tiles = s;
      tileFormat = (n) => `${formatValue(n, concentrationUnit, CHOLESTEROL_FACTOR)} ${unit}`;
      bands = [
        { from: 0, to: 200, tone: "good", label: "Desirable" },
        { from: 200, to: 240, tone: "watch", label: "Borderline" },
        { from: 240, to: 999, tone: "high", label: "High" },
      ];
      summaryText = s ? `Average ${formatValue(s.average, concentrationUnit, CHOLESTEROL_FACTOR)} ${unit} over ${s.count} reading${s.count === 1 ? "" : "s"}. Highest ${formatValue(s.highest, concentrationUnit, CHOLESTEROL_FACTOR)}, lowest ${formatValue(s.lowest, concentrationUnit, CHOLESTEROL_FACTOR)}.` : "";
      rows = readings.map((r) => ({
        id: r.id, at: r.recorded_at,
        primary: `${formatValue(r.chol_total_mgdl ?? 0, concentrationUnit, CHOLESTEROL_FACTOR)} ${unit}`,
        band: cholesterolBand(r.chol_total_mgdl ?? 0),
      }));
    }
  }

  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium ${
      active ? "border-cyan bg-cyan text-navy" : "border-silver/30 text-silver hover:border-silver/60"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">Trends</h1>

      <div role="group" aria-label="Metric" className="flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button key={m.key} type="button" aria-pressed={metric === m.key}
            onClick={() => setMetric(m.key)} className={chip(metric === m.key)}>
            {m.label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Time window" className="flex flex-wrap gap-2">
        {WINDOWS.map((w) => (
          <button key={w.days} type="button" aria-pressed={days === w.days}
            onClick={() => setDays(w.days)} className={chip(days === w.days)}>
            {w.label}
          </button>
        ))}
      </div>

      {error ? (
        <div>
          <p role="alert" className="text-sm text-[#ff9db0]">Couldn&rsquo;t load your readings.</p>
          <button type="button" onClick={reload}
            className="motion-press mt-3 inline-flex min-h-11 items-center rounded-full border border-cyan/60 px-4 text-sm font-semibold text-cyan hover:border-cyan">
            Try again
          </button>
        </div>
      ) : loading ? (
        <p role="status" className="text-sm text-silver">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-sm text-silver">
            Nothing logged in this window yet. Readings you add appear here.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            {!chartHidden ? <TrendChart lines={lines} bars={bars} bands={bands} goal={goal} unit={unit} caption={summaryText} /> : null}
            {tiles ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([["Average", tiles.average], ["Lowest", tiles.lowest], ["Highest", tiles.highest]] as const).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-navy/60 p-3">
                    <dt className="text-xs text-silver/80">{k}</dt>
                    <dd className="mt-0.5 font-heading text-lg font-semibold text-starlight">{tileFormat(v)}</dd>
                  </div>
                ))}
                <div className="rounded-xl bg-navy/60 p-3">
                  <dt className="text-xs text-silver/80">Entries</dt>
                  <dd className="mt-0.5 font-heading text-lg font-semibold text-starlight">{tiles.count}</dd>
                </div>
              </dl>
            ) : null}
            <p className="mt-3 text-sm text-silver">{summaryText}</p>
            {bands.length > 0 && !chartHidden ? (
              <p className="mt-1 text-xs text-silver/70">
                Shaded bands: {bands.map((b) => b.label).join(" · ")}. {DISCLAIMER}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {lines.length > 1 ? (
                <p className="text-xs text-silver/80">
                  {lines.map((l) => (
                    <span key={l.label} className="mr-3">
                      <span aria-hidden="true" style={{ color: l.colour }}>■</span> {l.label}
                    </span>
                  ))}
                </p>
              ) : null}
              {/* The Entries table below is always present, so this only
                  ever hid the chart. Labelling it "View as table" implied
                  a switch that never happened. */}
              <button type="button" aria-pressed={chartHidden} onClick={() => setAsTable((v) => !v)}
                className="text-sm font-medium text-cyan underline-offset-4 hover:underline">
                {chartHidden ? "Show the chart" : "Hide the chart"}
              </button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg">Entries</h2>
            <table className="mt-3 w-full text-sm">
              <caption className="sr-only">{summaryText}</caption>
              <thead>
                <tr className="border-b border-line-dark text-left text-silver">
                  <th scope="col" className="py-2 font-semibold">When</th>
                  <th scope="col" className="py-2 font-semibold">Reading</th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    <span className="sr-only">Delete</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line-dark/60">
                    <td className="py-2 align-top text-silver">{relativeTime(r.at)}</td>
                    <td className="py-2 align-top">
                      <span className="text-starlight">{r.primary}</span>
                      {r.secondary ? <span className="ml-2 text-silver">{r.secondary}</span> : null}
                      {r.band ? <span className="ml-2 inline-block"><RangeBadge band={r.band} /></span> : null}
                    </td>
                    <td className="py-2 text-right align-top">
                      <button type="button"
                        onClick={() => remove(metric === "water" ? "water_intake" : "readings", r.id)}
                        className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-[#ff9db0] underline-offset-4 hover:underline">
                        Delete<span className="sr-only"> the entry from {relativeTime(r.at)}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="text-xs text-silver/70">{DISCLAIMER}</p>
        </>
      )}
    </div>
  );
}
