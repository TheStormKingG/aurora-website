"use client";

import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import { asset } from "@/lib/asset";
import { site } from "@/content/site";
import { initials } from "@/lib/health/format";

/**
 * I2: session comes from the caller (AppShell's own useSession()) rather
 * than a second subscription here — it also lets AppShell render this
 * component before AppContext exists yet (the load-failed retry, M3).
 *
 * The commissioned lockup, not the AuroraMark SVG interpretation, and at
 * the 180px minimum width PDR §4.1 sets for the full lockup — on navy,
 * which §4.1 also requires. next/image does not prefix a string src with
 * basePath under `output: "export"`, hence asset().
 *
 * No screen title here: every screen renders its own h1 (and focus moves
 * to it on tab change), so a title in the bar only repeated it.
 */
export function TopBar({ session }: { session: Session | null | undefined }) {
  const meta = (session?.user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const name = meta.full_name ?? meta.name ?? "";
  return (
    <header className="sticky top-0 z-30 border-b border-line-dark bg-navy/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <span className="flex items-center">
          <Image
            src={asset("/brand/hm-aurora-logo.png")}
            alt=""
            width={1000}
            height={276}
            priority
            className="h-[50px] w-[180px]"
          />
          <span className="sr-only">{site.name}</span>
        </span>
        <span
          role="img"
          aria-label={name ? `Signed in as ${name}` : "Signed in"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo font-heading text-xs font-semibold text-cyan"
        >
          {initials(name)}
        </span>
      </div>
    </header>
  );
}
