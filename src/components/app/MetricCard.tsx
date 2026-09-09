import { useId } from "react";
import type { Band } from "@/lib/health/ranges";
import { RangeBadge } from "./RangeBadge";

export function MetricCard({
  label, value, unit, when, band, emptyText, onLog,
}: {
  label: string;
  value?: string;
  unit?: string;
  when?: string;
  band?: Band;
  emptyText: string;
  onLog: () => void;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-line-dark bg-indigo p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {/* I5: a real heading, not just an aria-label, so the screen
              reads by heading below the greeting. font-body/font-normal
              undo the global h2 styling (bold, Montserrat) — this is
              still the small muted label, not a visible section title. */}
          <h2 id={headingId} className="font-body text-sm font-normal leading-normal text-silver">
            {label}
          </h2>
          {value ? (
            <p className="mt-1 font-heading text-3xl font-semibold text-starlight">
              {value}
              {unit ? <span className="ml-1.5 text-sm font-medium text-silver">{unit}</span> : null}
            </p>
          ) : (
            <p className="mt-1 text-sm text-silver/80">{emptyText}</p>
          )}
          {when ? <p className="mt-1 text-xs text-silver/70">{when}</p> : null}
        </div>
        {band ? <RangeBadge band={band} /> : null}
      </div>
      <button
        type="button"
        onClick={onLog}
        className="mt-3 text-sm font-medium text-cyan underline-offset-4 hover:underline"
      >
        {value ? "Log a new reading" : "Log your first reading"}
      </button>
    </section>
  );
}
