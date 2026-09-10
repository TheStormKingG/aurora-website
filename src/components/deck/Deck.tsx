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
/** Sticky header height (NavBar: h-[4.5rem]). */
const CHROME = "4.5rem";
/** Below this the track cannot hold a slide, so the deck stays off. */
const MIN_VIEWPORT = 560;

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
    const check = () => setEnabled(!motion.matches && window.innerHeight >= MIN_VIEWPORT);
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
    return () => {
      delete root.dataset.deck;
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
      style={{ height: `calc(100dvh - ${CHROME})`, touchAction: "pan-x", overscrollBehavior: "none" }}
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
            inert={i !== index}
            aria-hidden={i === index ? undefined : true}
            className="h-full w-full overflow-y-auto overscroll-contain"
          >
            {slide}
          </div>
        ))}
      </div>

      <nav
        aria-label="Slides"
        className="absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2 sm:right-5"
      >
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-current={i === index ? "true" : undefined}
            aria-label={`${labels[i] ?? `Slide ${i + 1}`} (${i + 1} of ${count})`}
            className={`h-9 w-9 rounded-full text-[0.7rem] font-semibold transition-colors ${
              i === index
                ? "bg-cyan text-navy"
                : "text-silver hover:bg-starlight/10 hover:text-cyan"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </nav>
    </div>
    </>
  );
}
