"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { fetchStatus, logAppOpen, type HealthStatus } from "@/lib/health/client";
import { HEALTH_NOTICE_VERSION } from "@/content/health-notice";
import { AppProvider, type AppContextValue } from "./AppContext";
import { TopBar } from "./TopBar";
import { TabBar } from "./TabBar";
import { OfflineBanner } from "./OfflineBanner";

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
  if (session === undefined || status === undefined) {
    return <p className="px-4 py-24 text-center text-silver">Loading…</p>;
  }
  if (session === null || !value) return null;
  if (!consented && !onConsent) return null;

  return (
    <AppProvider value={value}>
      <div className="min-h-screen md:pl-24">
        <TopBar />
        <OfflineBanner />
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:px-6">{children}</div>
        {consented ? <TabBar onLog={() => openLog()} /> : null}
      </div>
    </AppProvider>
  );
}
