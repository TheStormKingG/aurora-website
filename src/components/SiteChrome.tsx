"use client";

import { usePathname } from "next/navigation";

/** Hides the marketing chrome (nav, footer, cookie banner) inside the
 *  app shell at /app — the app has its own top bar and tab bar. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/app" || pathname.startsWith("/app/")) return null;
  return <>{children}</>;
}
