"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

type Tab = { href: string; label: string; icon: IconName; exact?: boolean };
const tabs: Tab[] = [
  { href: "/app/", label: "Today", icon: "home", exact: true },
  { href: "/app/trends/", label: "Trends", icon: "chart" },
  { href: "/app/record/", label: "Record", icon: "clipboard" },
  { href: "/app/more/", label: "More", icon: "more" },
];

// M7: compare whole path segments, not a raw string prefix — "/app/record"
// as a plain prefix would also match a future "/app/record-archive/".
const segments = (path: string) => path.split("/").filter(Boolean);

/** Bottom tabs on phones, a left rail from md up (spec §9.1). */
export function TabBar({ onLog }: { onLog: () => void }) {
  const pathname = usePathname();
  const active = (t: Tab) => {
    if (t.exact) return pathname === "/app" || pathname === "/app/";
    const tabSegs = segments(t.href);
    const pathSegs = segments(pathname);
    return tabSegs.every((seg, i) => pathSegs[i] === seg);
  };
  const item = (t: Tab) => {
    const isActive = active(t);
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-current={isActive ? "page" : undefined}
        className={`flex min-w-[4rem] flex-col items-center gap-1 px-2 py-2 text-xs font-medium ${
          isActive ? "text-cyan" : "text-silver hover:text-starlight"
        }`}
      >
        <Icon name={t.icon} className="h-6 w-6" />
        {t.label}
        {/* M6: colour alone marked the active tab — back it with a dot. */}
        <span aria-hidden="true" className={`h-1 w-1 rounded-full ${isActive ? "bg-cyan" : "bg-transparent"}`} />
      </Link>
    );
  };
  return (
    <nav
      aria-label="App sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-dark bg-navy/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:inset-y-0 md:right-auto md:w-24 md:border-r md:border-t-0 md:pb-0"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-around md:h-full md:flex-col md:justify-start md:gap-2 md:pt-6">
        {item(tabs[0])}
        {item(tabs[1])}
        <button
          type="button"
          onClick={onLog}
          aria-label="Log a reading"
          className="motion-press -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-cyan text-navy shadow-[0_0_24px_rgba(43,217,245,0.35)] hover:bg-blue md:mt-0"
        >
          <Icon name="plus" className="h-7 w-7" />
        </button>
        {item(tabs[2])}
        {item(tabs[3])}
      </div>
    </nav>
  );
}
