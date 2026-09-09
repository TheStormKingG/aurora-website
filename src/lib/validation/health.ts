/**
 * Client-side zod schemas for the health app (spec §11). The database
 * mirrors every range as a CHECK constraint; this layer gives humans a
 * readable message first. Data minimisation (PDR §8.1): only the fields
 * the 31 Aug meeting named.
 */
import { z } from "zod";
import { CHOLESTEROL_FACTOR, GLUCOSE_FACTOR, TRIGLYCERIDE_FACTOR, formatValue, toMgdl } from "@/lib/health/units";

const MAX_BACKDATE_DAYS = 30;
// Must stay strictly inside the database's own tolerance (readings_not_future
// etc. all allow now() + 5 min — see supabase/migrations/20260908100000_health_schema.sql)
// so a client clock running a little fast fails here, with a readable
// message, rather than at the raw CHECK constraint.
const MAX_FUTURE_MINUTES = 2;

export const recordedAtSchema = z.string().superRefine((s, ctx) => {
  // The form always sends a full ISO timestamp (fromDatetimeLocal in
  // format.ts converts <input type="datetime-local"> to one) — a bare
  // "YYYY-MM-DD" parses fine via Date.parse but is read as UTC midnight,
  // drifting a day in negative-UTC zones. Require the time component too.
  const t = Date.parse(s);
  if (Number.isNaN(t) || !/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    ctx.addIssue({ code: "custom", message: "Enter a valid date and time." });
    return;
  }
  const now = Date.now();
  if (t > now + MAX_FUTURE_MINUTES * 60_000 || t < now - MAX_BACKDATE_DAYS * 86_400_000) {
    ctx.addIssue({ code: "custom", message: "Choose a time within the last 30 days, not in the future." });
  }
});

// `note` is `string | null` (types.ts) — null is how a cleared field is
// sent, and must not fail with zod's default "Invalid input".
const note = z.string().trim().max(300, "Keep the note under 300 characters.").nullish();
export const unitSchema = z.enum(["mg/dL", "mmol/L"], { error: "Choose a unit." });
const within = (lo: number, hi: number) => (mgdl: number) => mgdl >= lo && mgdl <= hi;
const glucoseRange = within(20, 600);
const totalRange = within(20, 1000);
const ldlRange = within(5, 1000);
const hdlRange = within(5, 300);
const trigRange = within(10, 5000);

export const bpReadingSchema = z
  .object({
    systolic: z.number({ error: "Enter the top number." }).int()
      .min(60, "Systolic looks too low (60–260).").max(260, "Systolic looks too high (60–260)."),
    diastolic: z.number({ error: "Enter the bottom number." }).int()
      .min(30, "Diastolic looks too low (30–160).").max(160, "Diastolic looks too high (30–160)."),
    pulse: z.number({ error: "Enter a whole number." }).int()
      .min(25, "Pulse looks too low (25–250).").max(250, "Pulse looks too high (25–250).").optional(),
    recordedAt: recordedAtSchema,
    note,
  })
  .refine((r) => r.systolic > r.diastolic, {
    message: "The top number should be higher than the bottom number.",
    path: ["systolic"],
  });
export type BpReadingInput = z.infer<typeof bpReadingSchema>;

export const glucoseReadingSchema = z
  .object({
    value: z.number({ error: "Enter your reading." }).positive("Enter your reading."),
    unit: unitSchema,
    context: z.enum(["fasting", "after_meal", "random", "bedtime"], { error: "Choose when you tested." }),
    recordedAt: recordedAtSchema,
    note,
  })
  .refine((r) => glucoseRange(toMgdl(r.value, r.unit, GLUCOSE_FACTOR)), {
    message: "That reading is outside the range the app accepts (20–600 mg/dL).",
    path: ["value"],
  });
export type GlucoseReadingInput = z.infer<typeof glucoseReadingSchema>;

export const cholesterolReadingSchema = z
  .object({
    total: z.number({ error: "Enter your total cholesterol." }).positive("Enter your total cholesterol."),
    ldl: z.number({ error: "Enter a number." }).positive().optional(),
    hdl: z.number({ error: "Enter a number." }).positive().optional(),
    triglycerides: z.number({ error: "Enter a number." }).positive().optional(),
    unit: unitSchema,
    recordedAt: recordedAtSchema,
    note,
  })
  .superRefine((r, ctx) => {
    // One issue per offending field — not one issue always pinned to
    // "total" — so the error lands on the box the patient needs to fix.
    const range = (lo: number, hi: number, factor: number) =>
      `${formatValue(lo, r.unit, factor)}–${formatValue(hi, r.unit, factor)} ${r.unit}`;
    if (!totalRange(toMgdl(r.total, r.unit, CHOLESTEROL_FACTOR))) {
      ctx.addIssue({ code: "custom", path: ["total"], message: `Total cholesterol should be ${range(20, 1000, CHOLESTEROL_FACTOR)}.` });
    }
    if (r.ldl !== undefined && !ldlRange(toMgdl(r.ldl, r.unit, CHOLESTEROL_FACTOR))) {
      ctx.addIssue({ code: "custom", path: ["ldl"], message: `LDL should be ${range(5, 1000, CHOLESTEROL_FACTOR)}.` });
    }
    if (r.hdl !== undefined && !hdlRange(toMgdl(r.hdl, r.unit, CHOLESTEROL_FACTOR))) {
      ctx.addIssue({ code: "custom", path: ["hdl"], message: `HDL should be ${range(5, 300, CHOLESTEROL_FACTOR)}.` });
    }
    if (r.triglycerides !== undefined && !trigRange(toMgdl(r.triglycerides, r.unit, TRIGLYCERIDE_FACTOR))) {
      ctx.addIssue({ code: "custom", path: ["triglycerides"], message: `Triglycerides should be ${range(10, 5000, TRIGLYCERIDE_FACTOR)}.` });
    }
  });
export type CholesterolReadingInput = z.infer<typeof cholesterolReadingSchema>;

export const waterSchema = z.object({
  ml: z.number({ error: "Enter an amount." }).int()
    .min(50, "Enter at least 50 ml.").max(3000, "Enter 3,000 ml or less per entry."),
  recordedAt: recordedAtSchema,
});
export type WaterInput = z.infer<typeof waterSchema>;

export const exerciseSchema = z.object({
  activity: z.enum(["walk", "run", "cycle", "swim", "strength", "rehab", "other"], { error: "Choose an activity." }),
  minutes: z.number({ error: "Enter the minutes." }).int()
    .min(1, "Enter at least 1 minute.").max(600, "Enter 600 minutes or less."),
  intensity: z.enum(["light", "moderate", "vigorous"]).optional(),
  note,
  recordedAt: recordedAtSchema,
});
export type ExerciseInput = z.infer<typeof exerciseSchema>;

export const healthConsentSchema = z.object({
  agree: z.literal(true, { error: "Tick the box to continue." }),
});
