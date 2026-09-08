"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

export function WaterCard({ ml, goal, onAdd }: { ml: number; goal: number; onAdd: (ml: number) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pct = Math.min(100, Math.round((ml / goal) * 100));

  async function add(amount: number) {
    setBusy(true);
    setError(undefined);
    try {
      await onAdd(amount);
    } catch {
      setError("Couldn't save. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Water" className="rounded-2xl border border-line-dark bg-indigo p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-silver">
          <Icon name="drop" className="h-4 w-4 text-cyan" /> Water today
        </span>
        <span className="text-starlight">
          {ml.toLocaleString("en-GB")} / {goal.toLocaleString("en-GB")} ml
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Water towards today's goal"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(ml, goal)}
        className="mt-3 h-2 overflow-hidden rounded-full bg-navy"
      >
        <div className="h-full rounded-full bg-cyan transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[250, 500].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            onClick={() => add(n)}
            className="motion-press rounded-full border border-cyan/60 px-3 py-1.5 text-sm font-semibold text-cyan hover:border-cyan disabled:opacity-50"
          >
            +{n} ml
          </button>
        ))}
        {error ? <p role="alert" className="text-sm text-[#ff9db0]">{error}</p> : null}
      </div>
    </section>
  );
}
