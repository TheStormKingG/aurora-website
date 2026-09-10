"use client";

import { useId } from "react";
import { axisTicks, scale } from "@/components/app/trend-scale";
import type { Band } from "@/lib/health/ranges";

export type Line = { points: { at: string; value: number }[]; colour: string; label: string };
/** A reference threshold to shade behind the data (spec §9.2). */
export type BandMark = { from: number; to: number; tone: Band["tone"]; label: string };

const W = 320;
const H = 140;
const PAD = { top: 8, right: 8, bottom: 18, left: 30 };

/** Tone → the same semantic colours the badges use. Never cyan: that is
 *  the call-to-action colour (PDR §4.2). */
export const toneColour: Record<Band["tone"], string> = {
  good: "#34d399",
  watch: "#f5c451",
  high: "#ff9db0",
  urgent: "#ff9db0",
};

/**
 * Line chart for readings, bar chart for daily totals. Hand-drawn SVG and
 * no charting library (spec D11): nothing extra to download on a phone
 * connection, exact brand colours, and an accessible alternative.
 *
 * `bands` shades the reference thresholds behind the data (spec §9.2).
 * They are informational only, drawn quietly, and `high` and `urgent`
 * deliberately share a colour — the distinction is never carried by hue.
 * Every band is named in the caption and in the summary text the screen
 * puts beside the chart, so nothing here depends on colour alone
 * (PDR §12).
 */
export function TrendChart({
  lines = [],
  bars = [],
  bands = [],
  goal,
  unit,
  caption,
}: {
  lines?: Line[];
  bars?: { label: string; total: number }[];
  bands?: BandMark[];
  goal?: number;
  unit: string;
  caption: string;
}) {
  const titleId = useId();
  const values = [
    ...lines.flatMap((l) => l.points.map((p) => p.value)),
    ...bars.map((b) => b.total),
    ...(goal ? [goal] : []),
  ];
  if (values.length === 0) return null;

  const { lo, hi } = bars.length
    ? { lo: 0, hi: Math.max(...values) * 1.15 || 1 }
    : scale(values);
  const x = (i: number, n: number) =>
    PAD.left +
    (n <= 1 ? (W - PAD.left - PAD.right) / 2 : (i / (n - 1)) * (W - PAD.left - PAD.right));
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
  const ticks = axisTicks(lo, hi);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={titleId}>
      <title id={titleId}>{caption}</title>
      {bands.map((b) => {
        const top = y(Math.min(b.to, hi));
        const bottom = y(Math.max(b.from, lo));
        if (bottom <= top) return null;
        return (
          <rect
            key={b.label}
            x={PAD.left}
            y={top}
            width={W - PAD.left - PAD.right}
            height={bottom - top}
            fill={toneColour[b.tone]}
            opacity="0.1"
          />
        );
      })}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            y1={y(t)}
            x2={W - PAD.right}
            y2={y(t)}
            stroke="currentColor"
            className="text-silver/15"
          />
          <text x={0} y={y(t) + 3} fontSize="8" fill="currentColor" className="text-silver/70">
            {t}
          </text>
        </g>
      ))}
      {goal !== undefined ? (
        <line
          x1={PAD.left}
          y1={y(goal)}
          x2={W - PAD.right}
          y2={y(goal)}
          stroke="currentColor"
          strokeDasharray="3 3"
          className="text-cyan/60"
        />
      ) : null}
      {bars.map((b, i) => {
        const bw = Math.max(3, (W - PAD.left - PAD.right) / bars.length - 3);
        const bx = PAD.left + (i * (W - PAD.left - PAD.right)) / bars.length;
        const by = y(b.total);
        return (
          <rect
            key={b.label}
            x={bx}
            y={by}
            width={bw}
            height={Math.max(0, H - PAD.bottom - by)}
            rx="1.5"
            fill="currentColor"
            className="text-cyan"
          />
        );
      })}
      {lines.map((l) => (
        <g key={l.label}>
          <polyline
            fill="none"
            strokeWidth="2"
            stroke={l.colour}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={l.points.map((p, i) => `${x(i, l.points.length)},${y(p.value)}`).join(" ")}
          />
          {/* A single reading has no line to draw, so mark the point. */}
          {l.points.length === 1 && l.points[0] ? (
            <circle cx={x(0, 1)} cy={y(l.points[0].value)} r="3" fill={l.colour} />
          ) : null}
        </g>
      ))}
      <text x={PAD.left} y={H - 4} fontSize="8" fill="currentColor" className="text-silver/70">
        {unit}
      </text>
    </svg>
  );
}
