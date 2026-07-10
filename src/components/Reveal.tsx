"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll-triggered reveal (preqal.org whileInView parity, no motion
 * library): hidden via .reveal-scroll until the element enters the
 * viewport, then .is-revealed transitions it in. Stagger siblings with
 * `index` (110ms steps). Reveals once; reduced-motion users see content
 * immediately (globals.css); no-JS users are covered by the <noscript>
 * override in layout.tsx.
 */
export function Reveal({
  children,
  index = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  index?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`reveal-scroll ${revealed ? "is-revealed" : ""} ${className}`}
      style={{ "--reveal-i": index } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
