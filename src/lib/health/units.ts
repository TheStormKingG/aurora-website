import type { Unit } from "./types";

/** mmol/L → mg/dL multipliers (spec §11). */
export const GLUCOSE_FACTOR = 18.016;
export const CHOLESTEROL_FACTOR = 38.67;
export const TRIGLYCERIDE_FACTOR = 88.57;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Convert a value the patient typed into the canonical mg/dL. */
export function toMgdl(value: number, unit: Unit, factor: number): number {
  return unit === "mg/dL" ? round1(value) : round1(value * factor);
}

/** Convert a stored mg/dL value into the display unit. */
export function fromMgdl(mgdl: number, unit: Unit, factor: number): number {
  return unit === "mg/dL" ? Math.round(mgdl) : round1(mgdl / factor);
}

export function formatValue(mgdl: number, unit: Unit, factor: number): string {
  const v = fromMgdl(mgdl, unit, factor);
  return unit === "mg/dL" ? String(v) : v.toFixed(1);
}
