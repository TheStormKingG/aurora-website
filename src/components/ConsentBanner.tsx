"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  makeConsentRecord,
  mostPrivateScope,
  readConsentCookie,
  writeConsentCookie,
} from "@/lib/consent";

/**
 * Cookie/consent banner — PDR §8.1 "no dark patterns": accept and
 * decline have equal prominence, nothing non-essential runs before
 * opt-in, and preferences are one click away.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsentCookie() === null);
  }, []);

  if (!visible) return null;

  const decide = (all: boolean) => {
    writeConsentCookie(
      makeConsentRecord(all ? { functional: true, analytics: true } : mostPrivateScope)
    );
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Privacy choices"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line-dark bg-indigo/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center">
        <p className="max-w-2xl text-sm leading-relaxed text-silver">
          <span className="font-semibold text-starlight">Your privacy, your choice.</span>{" "}
          This site sets no advertising or tracking cookies. We ask before enabling anything
          beyond the strictly necessary — and &ldquo;no&rdquo; is as easy as &ldquo;yes&rdquo;.{" "}
          <Link href="/privacy-centre/cookies" className="text-cyan underline underline-offset-2 hover:text-blue">
            Cookie policy
          </Link>
        </p>
        {/* Equal prominence: identical styling on both choices (PDR §8.1) */}
        <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
          <button
            type="button"
            onClick={() => decide(false)}
            className="rounded-full border border-silver/50 px-5 py-2.5 font-heading text-sm font-semibold text-starlight transition-colors hover:border-cyan hover:text-cyan"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => decide(true)}
            className="rounded-full border border-silver/50 px-5 py-2.5 font-heading text-sm font-semibold text-starlight transition-colors hover:border-cyan hover:text-cyan"
          >
            Accept all
          </button>
          <Link
            href="/privacy-centre/preferences"
            className="text-sm font-medium text-cyan underline underline-offset-2 hover:text-blue"
          >
            Manage preferences
          </Link>
        </div>
      </div>
    </div>
  );
}
