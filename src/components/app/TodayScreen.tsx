"use client";

import { useEffect, useState } from "react";
import { insertWater, loadToday, type TodayData } from "@/lib/health/client";
import { firstName, greeting, relativeTime } from "@/lib/health/format";
import { bpBand, cholesterolBand, glucoseBand, DISCLAIMER } from "@/lib/health/ranges";
import { CHOLESTEROL_FACTOR, GLUCOSE_FACTOR, formatValue } from "@/lib/health/units";
import type { GlucoseContext } from "@/lib/health/types";
import { useApp } from "./AppContext";
import { MetricCard } from "./MetricCard";
import { WaterCard } from "./WaterCard";

const contextLabel: Record<GlucoseContext, string> = {
  fasting: "fasting", after_meal: "after a meal", random: "random", bedtime: "bedtime",
};

export function TodayScreen() {
  const { status, version, openLog, bump, session } = useApp(); // I2: shared session
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState<string>();
  const [retryTick, setRetryTick] = useState(0); // C2: bumped by "Try again" to force a refetch

  useEffect(() => {
    let live = true;
    loadToday()
      .then((d) => {
        if (!live) return;
        setData(d);
        setError(undefined); // C2: a later success must clear a stale banner
      })
      .catch(() => { if (live) setError("Couldn't load your readings. Check your connection."); });
    return () => { live = false; };
  }, [version, retryTick]);

  async function addWater(ml: number) {
    if (!status.patientId) return;
    await insertWater({ patient_id: status.patientId, ml, recorded_at: new Date().toISOString() });
    bump();
  }

  const meta = (session?.user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const name = firstName(meta.full_name ?? meta.name ?? "");
  const bp = data?.latest.blood_pressure ?? null;
  const gl = data?.latest.glucose ?? null;
  const ch = data?.latest.cholesterol ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl">{greeting()}{name ? `, ${name}` : ""}</h1>
        <p className="text-sm text-silver">
          {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
        </p>
      </div>
      {error ? (
        <div role="alert" className="rounded-2xl border border-line-dark bg-indigo p-4">
          <p className="text-sm text-[#ff9db0]">{error}</p>
          <button
            type="button"
            onClick={() => setRetryTick((t) => t + 1)}
            className="motion-press mt-3 rounded-full border border-cyan/60 px-4 py-2 text-sm font-semibold text-cyan hover:border-cyan"
          >
            Try again
          </button>
        </div>
      ) : null}
      {data === null && !error ? <p className="text-silver">Loading…</p> : null}
      {data ? (
        <>
          <MetricCard
            label="Blood pressure"
            emptyText="No reading yet."
            onLog={() => openLog("blood_pressure")}
            value={bp ? `${bp.systolic}/${bp.diastolic}` : undefined}
            unit={bp ? "mmHg" : undefined}
            when={bp ? relativeTime(bp.recorded_at) : undefined}
            band={bp ? bpBand(bp.systolic ?? 0, bp.diastolic ?? 0) : undefined}
          />
          <MetricCard
            label={gl?.glucose_context ? `Blood sugar · ${contextLabel[gl.glucose_context]}` : "Blood sugar"}
            emptyText="No reading yet."
            onLog={() => openLog("glucose")}
            value={gl ? formatValue(gl.glucose_mgdl ?? 0, data.settings.glucose_unit, GLUCOSE_FACTOR) : undefined}
            unit={gl ? data.settings.glucose_unit : undefined}
            when={gl ? relativeTime(gl.recorded_at) : undefined}
            band={gl ? glucoseBand(gl.glucose_mgdl ?? 0, gl.glucose_context ?? "random") : undefined}
          />
          <MetricCard
            label="Cholesterol (total)"
            emptyText="No reading yet."
            onLog={() => openLog("cholesterol")}
            value={ch ? formatValue(ch.chol_total_mgdl ?? 0, data.settings.cholesterol_unit, CHOLESTEROL_FACTOR) : undefined}
            unit={ch ? data.settings.cholesterol_unit : undefined}
            when={ch ? relativeTime(ch.recorded_at) : undefined}
            band={ch ? cholesterolBand(ch.chol_total_mgdl ?? 0) : undefined}
          />
          <WaterCard ml={data.waterMl} goal={data.settings.water_goal_ml} onAdd={addWater} />
          <p className="text-sm text-silver">
            Exercise this week{" "}
            <span className="text-starlight">
              {data.exercise.minutes} min · {data.exercise.sessions} session{data.exercise.sessions === 1 ? "" : "s"}
            </span>
            {" · "}
            <button type="button" onClick={() => openLog("exercise")} className="text-cyan underline-offset-4 hover:underline">
              Log exercise
            </button>
          </p>
          <p className="text-xs text-silver/70">{DISCLAIMER}</p>
        </>
      ) : null}
    </div>
  );
}
