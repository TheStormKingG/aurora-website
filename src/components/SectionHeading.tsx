import type { ReactNode } from "react";
import { EcgDivider } from "./EcgDivider";

/**
 * Eyebrow (letterspaced cyan caps) + heading + optional lede, finished
 * with the ECG-pulse divider (PDR §4.3/§4.4).
 */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  as: Tag = "h2",
  className = "",
  revealEcg = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
  /** Draw the ECG divider on scroll — use ONLY inside a <Reveal>. */
  revealEcg?: boolean;
}) {
  const alignCls = align === "center" ? "text-center items-center" : "items-start";
  return (
    <div className={`flex flex-col gap-4 ${alignCls} ${className}`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <Tag className={Tag === "h1" ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl"}>
        {title}
      </Tag>
      <EcgDivider reveal={revealEcg} />
      {lede ? (
        <p className="max-w-2xl text-lg text-silver [.section-light_&]:text-ink-muted">{lede}</p>
      ) : null}
    </div>
  );
}
