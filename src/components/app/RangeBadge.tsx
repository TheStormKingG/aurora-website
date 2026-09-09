import type { Band } from "@/lib/health/ranges";

/* Status colours are semantic, not CTAs (PDR §4.2 keeps cyan for actions):
   good = green, watch = amber, high = rose, urgent = filled rose.
   I6: `good` was cyan, so a static "Normal" pill and the card's own
   "Log a new reading" CTA read as the same colour — only one of them
   was actionable. Green reads as positive without touching the brand's
   single CTA colour; ~8.7:1 on the indigo card (#141b3f), same bar as
   the other two outline tones. */
const tones = {
  good: "border-[#34d399]/50 text-[#34d399]",
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
