import type { ReactNode } from "react";

/**
 * Midnight Indigo panel on dark sections (PDR §4.2); light variant for
 * inverted Starlight sections. `glow` adds the cyan hover treatment.
 */
export function Card({
  children,
  variant = "dark",
  glow = false,
  className = "",
}: {
  children: ReactNode;
  variant?: "dark" | "light";
  glow?: boolean;
  className?: string;
}) {
  const surface =
    variant === "dark"
      ? "bg-indigo border-line-dark shadow-[0_24px_50px_-22px_rgba(2,5,18,0.7)]"
      : "bg-white border-line-light shadow-[0_16px_40px_-24px_rgba(6,11,34,0.25)]";
  const hover = glow
    ? variant === "dark"
      ? "transition-all duration-300 hover:-translate-y-1 hover:border-cyan/50 hover:shadow-[0_0_32px_rgba(43,217,245,0.18),0_24px_50px_-22px_rgba(2,5,18,0.7)]"
      : "transition-all duration-300 hover:-translate-y-1 hover:border-link-light/50"
    : "";
  return (
    <div className={`rounded-2xl border p-6 sm:p-8 ${surface} ${hover} ${className}`}>
      {children}
    </div>
  );
}
