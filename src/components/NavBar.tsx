"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { primaryNav, utilityNav, site } from "@/content/site";
import { AuroraLogo, AuroraMark } from "./AuroraLogo";
import { Icon } from "./icons";

/**
 * Navy, mobile-first navigation (PDR §4.2 dark-first; M1 spec).
 * "Book Appointment" carries the single cyan CTA; patient/staff logins
 * stay visually separated (PDR §5).
 */
export function NavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();

  // Close the panel on route change and restore body scroll.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-line-dark bg-navy/85 backdrop-blur-md">
      <nav aria-label="Primary" className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label={`${site.name} — home`}
        >
          <AuroraMark className="h-9 w-9 lg:hidden" />
          <AuroraLogo className="hidden h-11 w-auto lg:block" />
          <span className="sr-only">{site.name}</span>
        </Link>

        {/* Desktop links */}
        <ul className="ml-auto hidden items-center gap-6 xl:flex">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`text-sm font-medium transition-colors hover:text-cyan ${
                  isActive(item.href) ? "text-cyan" : "text-silver"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-3 xl:ml-6 xl:flex">
          <Link
            href="/patient-login"
            className="inline-flex items-center gap-1.5 rounded-full border border-silver/40 px-4 py-2 text-sm font-semibold text-starlight transition-colors hover:border-cyan hover:text-cyan"
          >
            <Icon name="lock" className="h-4 w-4" />
            Patient Login
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 rounded-full bg-cyan px-5 py-2 font-heading text-sm font-semibold text-navy transition-colors hover:bg-blue"
          >
            <Icon name="calendar" className="h-4 w-4" />
            Book Appointment
          </Link>
        </div>

        {/* Mobile controls */}
        <div className="ml-auto flex items-center gap-2 xl:hidden">
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 rounded-full bg-cyan px-4 py-2 font-heading text-sm font-semibold text-navy"
          >
            Book
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line-dark text-starlight"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            {open ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M5 5l14 14M19 5 5 19" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile panel */}
      <div
        id={menuId}
        hidden={!open}
        className="starfield fixed inset-x-0 top-[4.5rem] bottom-0 z-50 overflow-y-auto border-t border-line-dark bg-navy xl:hidden"
      >
        <nav aria-label="Mobile" className="mx-auto max-w-7xl px-6 py-8">
          <ul className="flex flex-col gap-1">
            {[{ label: "Home", href: "/" }, ...primaryNav].map((item, i) => (
              <li key={item.href} className="reveal" style={{ "--reveal-i": i } as React.CSSProperties}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`block rounded-lg px-3 py-3 font-heading text-2xl font-semibold ${
                    isActive(item.href) ? "text-cyan" : "text-starlight"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 border-t border-line-dark pt-8">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan px-6 py-3.5 font-heading font-semibold text-navy"
            >
              <Icon name="calendar" className="h-5 w-5" />
              Book Appointment
            </Link>
            {utilityNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-silver/40 px-6 py-3.5 font-heading font-semibold text-starlight"
              >
                <Icon name="lock" className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
          <p className="eyebrow mt-10 text-center">{site.tagline}</p>
        </nav>
      </div>
    </header>
  );
}
