"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";

/**
 * "Care in three steps" with sequential ignition — Aurora's take on
 * preqal.org's scroll-ignition phases: when the section enters the
 * viewport, each step lights left-to-right (cyan glow + pulse), with a
 * soft haptic tick on devices that support it. Reduced-motion renders
 * the lit state statically.
 */

export type IgnitionStep = {
  step: string;
  icon: IconName;
  title: string;
  body: string;
};

export function StepsIgnition({ steps }: { steps: IgnitionStep[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLit(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setLit(true);
            try {
              navigator.vibrate?.(18);
            } catch {
              /* no haptics available */
            }
            observer.disconnect();
          }
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <ol ref={ref} className="mx-auto mt-14 grid max-w-5xl gap-10 sm:grid-cols-3">
      {steps.map((item, i) => (
        <li
          key={item.step}
          className={`ignite-step relative text-center ${lit ? "is-lit" : ""}`}
          style={{ "--ignite-delay": `${i * 260}ms` } as React.CSSProperties}
        >
          <span className="ignite-icon mx-auto flex h-14 w-14 items-center justify-center rounded-full">
            <Icon name={item.icon} className="h-6 w-6" />
          </span>
          <span
            className={`eyebrow ignite-label mt-5 block !text-xs ${
              lit ? "" : "!text-silver/60"
            }`}
          >
            Step {item.step}
          </span>
          <h3 className="mt-2 text-xl">{item.title}</h3>
          <p className="mt-3 text-base leading-relaxed text-muted-surface">{item.body}</p>
        </li>
      ))}
    </ol>
  );
}
