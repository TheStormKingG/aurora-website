/**
 * Pure scale maths for TrendChart, kept out of the component so it can be
 * unit-tested (vitest runs in node and only picks up `*.test.ts`).
 */

/** Vertical range for a line series, padded so the data is not on the edge. */
export function scale(values: number[]): { lo: number; hi: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series still needs a band to draw in.
  const pad = max === min ? Math.max(1, Math.abs(max) * 0.1) : (max - min) * 0.15;
  return { lo: min - pad, hi: max + pad };
}

/**
 * Three axis labels: top, middle, bottom.
 *
 * Rounding has to follow the span, and the values have to be unique. The
 * first version rounded all three to whole numbers, so a narrow range
 * (say 0.8 to 1.2, which a water goal in litres produces easily) labelled
 * every gridline "1" and — because the labels were also the React keys —
 * rendered three nodes with the same key.
 */
export function axisTicks(lo: number, hi: number): number[] {
  const span = hi - lo;
  const decimals = span >= 10 ? 0 : span >= 1 ? 1 : 2;
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of [hi, lo + span / 2, lo]) {
    const value = Number(raw.toFixed(decimals));
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}
