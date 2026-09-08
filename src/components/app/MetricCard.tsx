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
  return (
    <section aria-label={label} className="rounded-2xl border border-line-dark bg-indigo p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-silver">{label}</p>
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
