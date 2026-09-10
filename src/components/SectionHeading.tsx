import type { ReactNode } from "react";
import { EcgDivider } from "./EcgDivider";

/**
 * Eyebrow (letterspaced cyan caps) + heading + optional lede, finished
 * with the ECG-pulse divider (PDR §4.3/§4.4).
 *
 * The divider is a PAGE-HEADER signature, not decoration under every
 * heading. Firing it on all 24 headings across the site is what made
 * every section read as the same template; it now defaults on for `h1`
 * (one per page) and off elsewhere, and any section that has earned it
 * can opt in with `divider`.
 */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  as: Tag = "h2",
  className = "",
  revealEcg = false,
  divider,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
  /** Draw the ECG divider on scroll — use ONLY inside a <Reveal>. */
  revealEcg?: boolean;
  /** Show the ECG divider. Defaults to page headers (`as="h1"`) only. */
  divider?: boolean;
}) {
  const showDivider = divider ?? Tag === "h1";
  const alignCls = align === "center" ? "text-center items-center" : "items-start";
  return (
    <div className={`flex flex-col gap-4 ${alignCls} ${className}`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <Tag className={Tag === "h1" ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl"}>
        {title}
      </Tag>
      {showDivider ? <EcgDivider reveal={revealEcg} /> : null}
      {lede ? (
        <p className="max-w-2xl text-lg text-silver [.section-light_&]:text-ink-muted">{lede}</p>
      ) : null}
    </div>
  );
}
