import type { Band } from "@/lib/health/ranges";

/* Status colours are semantic, not CTAs (PDR §4.2 keeps cyan for actions):
   good = cyan outline, watch = amber, high = rose, urgent = filled rose. */
const tones = {
  good: "border-cyan/40 text-cyan",
  watch: "border-[#f5c451]/50 text-[#f5c451]",
  high: "border-[#ff9db0]/50 text-[#ff9db0]",
  urgent: "border-[#ff9db0] bg-[#ff9db0] text-navy",
} as const;

export function RangeBadge({ band }: { band: Band }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[band.tone]}`}>
      {band.label}
    </span>
  );
}
