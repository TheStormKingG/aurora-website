import type { ReactNode } from "react";

/**
 * Hero shell: Deep Space Navy canvas, CSS starfield, animated aurora
 * gradient washes (PDR §4.2/§4.4 — motion in the hero only, reduced-
 * motion respected in globals.css).
 */
export function AuroraHero({
  children,
  size = "page",
  className = "",
}: {
  children: ReactNode;
  size?: "home" | "page";
  className?: string;
}) {
  const pad =
    size === "home"
      ? "pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-36 lg:pb-40"
      : "pt-16 pb-14 sm:pt-20 sm:pb-16";
  return (
    <section className={`starfield relative overflow-hidden bg-navy ${className}`}>
      <div className="aurora-wash" aria-hidden="true" />
      {/* horizon glow grounding the content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy to-transparent"
      />
      <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 ${pad}`}>{children}</div>
    </section>
  );
}
