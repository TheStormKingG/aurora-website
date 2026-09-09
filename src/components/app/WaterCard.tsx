"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons";

export function WaterCard({ ml, goal, onAdd }: { ml: number; goal: number; onAdd: (ml: number) => Promise<void> }) {
  const headingId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []); // M8
  const pct = Math.min(100, Math.round((ml / goal) * 100));

  async function add(amount: number) {
    setBusy(true);
    setError(undefined);
    try {
      await onAdd(amount); // W1: onAdd applies the change optimistically
      // I4: `ml` here is still the pre-add total (onAdd's optimistic
      // update lands in the parent, not this closure), so the new total
      // is exactly ml + amount.
      if (mountedRef.current) {
        setAnnouncement(
          `Added ${amount.toLocaleString("en-GB")} ml. ${(ml + amount).toLocaleString("en-GB")} of ${goal.toLocaleString("en-GB")} ml today.`,
        );
      }
    } catch {
      if (mountedRef.current) setError("Couldn't save. Check your connection.");
    } finally {
      if (mountedRef.current) setBusy(false); // M8: guard a finally that can run after unmount
    }
  }

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-line-dark bg-indigo p-4">
      <div className="flex items-center justify-between text-sm">
        {/* I5: same treatment as MetricCard — a real heading below the
            greeting, styled to still read as a muted label. */}
        <h2 id={headingId} className="flex items-center gap-2 font-body font-normal leading-normal text-silver">
          <Icon name="drop" className="h-4 w-4 text-cyan" /> Water today
        </h2>
        <span className="text-starlight">
          {ml.toLocaleString("en-GB")} / {goal.toLocaleString("en-GB")} ml
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Water towards today's goal"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={ml}
        aria-valuetext={`${ml.toLocaleString("en-GB")} of ${goal.toLocaleString("en-GB")} ml`}
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
      {/* I4: visually-hidden live region — the bar/number change above is
          otherwise silent (WCAG 4.1.3). */}
      <p role="status" className="sr-only">{announcement}</p>
    </section>
  );
}
