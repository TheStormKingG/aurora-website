/** Row and insert shapes for the `health` schema (spec §6). Values are
 *  stored canonically in mg/dL; display units live in `Settings`. */
export type ReadingKind = "blood_pressure" | "glucose" | "cholesterol";
export type LogKind = ReadingKind | "water" | "exercise";
export type GlucoseContext = "fasting" | "after_meal" | "random" | "bedtime";
export type Unit = "mg/dL" | "mmol/L";
export type Activity = "walk" | "run" | "cycle" | "swim" | "strength" | "rehab" | "other";
export type Intensity = "light" | "moderate" | "vigorous";

export type Reading = {
  id: string;
  kind: ReadingKind;
  recorded_at: string;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  glucose_mgdl: number | null;
  glucose_context: GlucoseContext | null;
  chol_total_mgdl: number | null;
  chol_ldl_mgdl: number | null;
  chol_hdl_mgdl: number | null;
  chol_trig_mgdl: number | null;
  entered_unit: Unit | null;
  note: string | null;
};

export type ReadingInsert = {
  patient_id: string;
  kind: ReadingKind;
  recorded_at: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number | null;
  glucose_mgdl?: number;
  glucose_context?: GlucoseContext;
  chol_total_mgdl?: number;
  chol_ldl_mgdl?: number | null;
  chol_hdl_mgdl?: number | null;
  chol_trig_mgdl?: number | null;
  entered_unit?: Unit;
  note?: string | null;
};

export type WaterInsert = { patient_id: string; ml: number; recorded_at: string };

export type ExerciseInsert = {
  patient_id: string;
  activity: Activity;
  minutes: number;
  intensity?: Intensity | null;
  note?: string | null;
  recorded_at: string;
};

export type Settings = { glucose_unit: Unit; cholesterol_unit: Unit; water_goal_ml: number };
