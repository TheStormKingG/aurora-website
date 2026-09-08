import {
  bpThresholds as bp, glucoseThresholds as g, cholesterolThresholds as c,
  urgentMessages, rangesMeta,
} from "@/content/health-ranges";
import type { GlucoseContext } from "./types";

export type Tone = "good" | "watch" | "high" | "urgent";
export type Band = { label: string; tone: Tone; urgent?: string };
export const DISCLAIMER = rangesMeta.disclaimer;

export function bpBand(systolic: number, diastolic: number): Band {
  if (systolic > bp.urgentSystolic || diastolic > bp.urgentDiastolic)
    return { label: "Very high", tone: "urgent", urgent: urgentMessages.bp };
  if (systolic >= bp.stage2Systolic || diastolic >= bp.stage2Diastolic)
    return { label: "High (stage 2)", tone: "high" };
  if (systolic >= bp.stage1Systolic || diastolic >= bp.stage1Diastolic)
    return { label: "High (stage 1)", tone: "high" };
  if (systolic >= bp.elevatedSystolic) return { label: "Elevated", tone: "watch" };
  return { label: "Normal", tone: "good" };
}

export function glucoseBand(mgdl: number, context: GlucoseContext): Band {
  if (mgdl < g.low) return { label: "Low", tone: "urgent", urgent: urgentMessages.glucoseLow };
  if (mgdl >= g.urgentHigh) return { label: "Very high", tone: "urgent", urgent: urgentMessages.glucoseHigh };
  const t = context === "fasting" ? g.fasting : g.other;
  if (mgdl >= t.highFrom) return { label: "High", tone: "high" };
  if (mgdl >= t.normalBelow) return { label: "Slightly high", tone: "watch" };
  return { label: "Normal", tone: "good" };
}

export function cholesterolBand(totalMgdl: number): Band {
  if (totalMgdl >= c.total.highFrom) return { label: "High", tone: "high" };
  if (totalMgdl >= c.total.desirableBelow) return { label: "Borderline", tone: "watch" };
  return { label: "Desirable", tone: "good" };
}

export function ldlBand(mgdl: number): Band {
  const [nearOptimal, borderline, high, veryHigh] = c.ldl;
  if (mgdl >= veryHigh) return { label: "Very high", tone: "high" };
  if (mgdl >= high) return { label: "High", tone: "high" };
  if (mgdl >= borderline) return { label: "Borderline", tone: "watch" };
  if (mgdl >= nearOptimal) return { label: "Near optimal", tone: "good" };
  return { label: "Optimal", tone: "good" };
}

export function hdlBand(mgdl: number): Band {
  if (mgdl < c.hdl.lowBelow) return { label: "Low", tone: "watch" };
  if (mgdl >= c.hdl.protectiveFrom) return { label: "Protective", tone: "good" };
  return { label: "Normal", tone: "good" };
}

export function triglyceridesBand(mgdl: number): Band {
  const [borderline, high, veryHigh] = c.triglycerides;
  if (mgdl >= veryHigh) return { label: "Very high", tone: "high" };
  if (mgdl >= high) return { label: "High", tone: "high" };
  if (mgdl >= borderline) return { label: "Borderline", tone: "watch" };
  return { label: "Normal", tone: "good" };
}
