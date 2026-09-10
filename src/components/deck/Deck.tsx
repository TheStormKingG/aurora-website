"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Slide deck — one idea per screen, advanced by wheel, keys, swipe, or
 * the pager. This is preqal.org's mechanism (a fixed-height clipped
 * track whose inner rail is translated by one slide at a time), plus the
 * escape hatches that pattern needs before it belongs on a healthcare
 * site whose audience includes older adults and whose PDR §12 commits to
 * WCAG 2.2 AA.
 *
 * Taking control of scrolling breaks, by default: keyboard scrolling,
 * find-in-page, the screen-reader virtual cursor, browser zoom, and
 * reduced-motion preferences. So:
 *
 * - It is an ENHANCEMENT. No JS, reduced motion, print, or a viewport
 *   too short to hold a slide, and the page renders as ordinary
 *   document flow. `enabled` starts false, so the server-rendered HTML
 *   is always the accessible one.
 * - A slide taller than the track scrolls INSIDE itself, and the wheel
 *   only advances once that slide is scrolled to its edge. Clipping
 *   content so it cannot be reached fails WCAG 1.4.10 Reflow, and at
 *   200% zoom nearly every slide overflows.
 * - Every slide stays in the DOM and visible to find-in-page; slides
 *   off-screen are marked `inert` so focus cannot land inside them.
 * - The pager is real buttons with labels, not dots.
 */

const SLIDE_MS = 620;
/** Fallback only — the real header is measured on mount (it renders at
 *  73px, not the 72px a 4.5rem constant assumes). */
const CHROME_FALLBACK = "4.5rem";
/**
 * The deck only engages where a slide can actually hold its content.
 * Height alone is not enough: the layouts that make a slide fit are
 * multi-column, and below `lg` they stack. Measured on a 390x844 phone
 * the services slide ran 728px past a 771px track — a whole extra screen
 * of scrolling inside one slide before it would advance, which is a
 * scrolling page with extra steps rather than a deck. So phones and
 * tablets get ordinary flow, which they were already good at.
 */
const MIN_VIEWPORT_H = 560;
const MIN_VIEWPORT_W = 1024;

export function Deck({ children, labels }: { children: ReactNode; labels: string[] }) {
  const slides = Children.toArray(children);
  const [index, setIndex] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const locked = useRef(false);
  const touchY = useRef<number | null>(null);
  const paneRefs = useRef<(HTMLDivElement | null)[]>([]);

  const count = slides.length;
  const go = useCallback(
    (next: number) => setIndex(Math.max(0, Math.min(count - 1, next))),
    [count]
  );

  // Enable only where the deck can behave. Re-checked on resize and when
  // the motion preference changes, so it switches off mid-session too.
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const check = () =>
      setEnabled(
        !motion.matches &&
          window.innerHeight >= MIN_VIEWPORT_H &&
          window.innerWidth >= MIN_VIEWPORT_W
      );
    check();
    motion.addEventListener("change", check);
    window.addEventListener("resize", check);
    return () => {
      motion.removeEventListener("change", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  // While the deck drives the viewport the document must not also scroll.
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.dataset.deck = "on";
    // Track height is the viewport minus the REAL sticky header, measured
    // rather than assumed, and re-measured when the layout reflows.
    const measure = () => {
      const h = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      root.style.setProperty("--deck-chrome", `${Math.round(h)}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      delete root.dataset.deck;
      root.style.removeProperty("--deck-chrome");
    };
  }, [enabled]);

  /** True when this slide still has room to scroll in that direction. */
  const paneCanScroll = useCallback((dir: number) => {
    const pane = paneRefs.current[index];
    if (!pane || pane.scrollHeight <= pane.clientHeight + 4) return false;
    return dir > 0
      ? pane.scrollTop + pane.clientHeight < pane.scrollHeight - 2
      : pane.scrollTop > 2;
  }, [index]);

  const step = useCallback(
    (dir: number) => {
      if (locked.current) return;
      locked.current = true;
      window.setTimeout(() => {
        locked.current = false;
      }, SLIDE_MS);
      go(index + dir);
    },
    [go, index]
  );

  useEffect(() => {
    if (!enabled) return;

    const onWheel = (e: WheelEvent) => {
      const dir = e.deltaY > 0 ? 1 : -1;
      if (paneCanScroll(dir)) return; // let the slide scroll first
      if (Math.abs(e.deltaY) < 6) return;
      e.preventDefault();
      step(dir);
    };

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      // Never hijack typing or a native control's own arrow behaviour.
      if (el?.closest("input, textarea, select, [contenteditable='true']")) return;
      const map: Record<string, number | "first" | "last"> = {
        ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1,
        Home: "first", End: "last",
      };
      const action = e.key === " " ? (e.shiftKey ? -1 : 1) : map[e.key];
      if (action === undefined) return;
      if (paneCanScroll(typeof action === "number" ? action : 1)) return;
      e.preventDefault();
      if (action === "first") go(0);
      else if (action === "last") go(count - 1);
      else step(action);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const start = touchY.current;
      touchY.current = null;
      if (start == null) return;
      const delta = start - (e.changedTouches[0]?.clientY ?? start);
      if (Math.abs(delta) < 48) return;
      const dir = delta > 0 ? 1 : -1;
      if (paneCanScroll(dir)) return;
      step(dir);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, paneCanScroll, step, go, count]);

  // A slide arriving should start at its own top, not wherever it was left.
  useEffect(() => {
    paneRefs.current[index]?.scrollTo({ top: 0 });
  }, [index]);

  // Rendered in BOTH modes, server-side, so globals.css can stand the
  // layout's own footer down whether or not the deck ever enables. Keying
  // that off `enabled` shipped two visible footers on the fallback path.
  const marker = <div data-deck-page hidden />;

  if (!enabled) {
    // Server render and every fallback path: ordinary sections in flow.
    return (
      <>
        {marker}
        {slides}
      </>
    );
  }

  return (
    <>
      {marker}
    <div
      className="relative overflow-hidden"
      style={{
        height: `calc(100dvh - var(--deck-chrome, ${CHROME_FALLBACK}))`,
        touchAction: "pan-x",
        overscrollBehavior: "none",
      }}
    >
      <div
        className="h-full w-full transition-transform duration-[620ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateY(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            ref={(el) => {
              paneRefs.current[i] = el;
            }}
            // Off-screen slides stay in the DOM for find-in-page and
            // crawlers, but must not take focus.
            data-deck-pane=""
            role="group"
            aria-label={`${labels[i] ?? `Slide ${i + 1}`} (${i + 1} of ${count})`}
            inert={i !== index}
            aria-hidden={i === index ? undefined : true}
            className="h-full w-full overflow-y-auto overscroll-contain"
          >
            {slide}
          </div>
        ))}
      </div>

      {/* The deck moves the viewport without the document scrolling, which
          a screen reader has no other way to notice. */}
      <p aria-live="polite" className="sr-only">
        {labels[index] ?? `Slide ${index + 1}`}, {index + 1} of {count}
      </p>
    </div>
    </>
  );
}
