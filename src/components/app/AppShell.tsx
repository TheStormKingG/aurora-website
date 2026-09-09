"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { fetchStatus, logAppOpen, type HealthStatus } from "@/lib/health/client";
import { HEALTH_NOTICE_VERSION } from "@/content/health-notice";
import { AppProvider, type AppContextValue } from "./AppContext";
import { TopBar } from "./TopBar";
import { TabBar } from "./TabBar";
import { OfflineBanner } from "./OfflineBanner";

/** Shared by every branch below that has nothing to show yet — a live
 *  region (M4) so it's announced instead of sitting there silently. */
function ShellLoading() {
  return (
    <p role="status" className="px-4 py-24 text-center text-silver">
      Loading…
    </p>
  );
}

/**
 * App shell for /app (spec §9.1): session guard → consent guard → one
 * app_open audit event per browser session → top bar, tab bar, offline
 * banner. Guards are UX only; RLS is the security boundary.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<HealthStatus | undefined>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const skipFocus = useRef(true);

  const refreshStatus = useCallback(async () => {
    setLoadFailed(false);
    setStatus(await fetchStatus());
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/patient-login/");
  }, [session, router]);

  useEffect(() => {
    if (!session) return;
    // A failed read must NOT be treated as "not consented": that would send a
    // consented patient back through the consent screen and write a second
    // consent row. Offer a retry instead.
    refreshStatus().catch(() => setLoadFailed(true));
  }, [session, refreshStatus]);

  const onConsent = pathname.startsWith("/app/consent");
  const consented = status?.activeVersion === HEALTH_NOTICE_VERSION;

  useEffect(() => {
    if (!status) return;
    if (!consented && !onConsent) router.replace("/app/consent/");
    else if (consented && onConsent) router.replace("/app/");
    if (consented && status.patientId) logAppOpen(status.patientId).catch(() => undefined);
  }, [status, consented, onConsent, router]);

  // C3 / spec §9.1: move focus to the new screen's heading on tab change —
  // every /app screen renders exactly one h1, so finding it here covers
  // all of them without wiring each screen separately. Skip the first
  // mount so an ordinary page load doesn't steal focus from the caller.
  useEffect(() => {
    if (skipFocus.current) {
      skipFocus.current = false;
      return;
    }
    const heading = contentRef.current?.querySelector<HTMLElement>("h1");
    if (!heading) return;
    heading.tabIndex = -1; // focusable without joining the tab order
    heading.focus();
  }, [pathname]);

  const openLog = useCallback(() => undefined, []); // replaced in Task 14
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo<AppContextValue | null>(
    () => (status ? { status, refreshStatus, openLog, version, bump } : null),
    [status, refreshStatus, openLog, version, bump],
  );

  if (loadFailed) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-silver">We couldn&rsquo;t reach your health record.</p>
        <button type="button" onClick={() => refreshStatus().catch(() => setLoadFailed(true))}
          className="motion-press mt-4 rounded-full border border-cyan/60 px-4 py-2 text-sm font-semibold text-cyan hover:border-cyan">
          Try again
        </button>
      </div>
    );
  }
  if (session === undefined || status === undefined) return <ShellLoading />;
  if (session === null || !value) return null;
  // C1: render only when consent state and route disagree. A consented
  // patient on /app/consent, or an unconsented patient anywhere else, is
  // mid-redirect (the effect above) — show Loading, not a paintable
  // screen, so the window between paint and redirect can't be tapped
  // through (a consented patient could otherwise re-submit consent and
  // grant_consent would insert a duplicate row). Loading rather than a
  // bare null (M2) so the redirect doesn't flash a blank frame either.
  if (consented === onConsent) return <ShellLoading />;

  return (
    <AppProvider value={value}>
      <div className="min-h-screen md:pl-24">
        <TopBar />
        <OfflineBanner />
        <div ref={contentRef} className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:px-6">
          {children}
        </div>
        {consented ? <TabBar onLog={() => openLog()} /> : null}
      </div>
    </AppProvider>
  );
}
