"use client";

import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { AuroraMark } from "@/components/AuroraLogo";
import { initials } from "@/lib/health/format";

const titles: [string, string][] = [
  ["/app/consent", "Before you start"],
  ["/app/trends", "Trends"],
  ["/app/record", "Health record"],
  ["/app/more", "More"],
];

/**
 * I2: session comes from the caller (AppShell's own useSession()) rather
 * than a second subscription here — it also lets AppShell render this
 * component before AppContext exists yet (the load-failed retry, M3).
 */
export function TopBar({ session }: { session: Session | null | undefined }) {
  const pathname = usePathname();
  const title = titles.find(([p]) => pathname.startsWith(p))?.[1] ?? "Today";
  const meta = (session?.user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const name = meta.full_name ?? meta.name ?? "";
  return (
    <header className="sticky top-0 z-30 border-b border-line-dark bg-navy/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <AuroraMark className="h-7 w-7" />
          <span className="font-heading text-sm font-semibold uppercase tracking-[var(--tracking-caps)] text-cyan">
            {title}
          </span>
        </div>
        <span
          role="img"
          aria-label={name ? `Signed in as ${name}` : "Signed in"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo font-heading text-xs font-semibold text-cyan"
        >
          {initials(name)}
        </span>
      </div>
    </header>
  );
}
