"use client";

import { useEffect, useState } from "react";

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** Spec D13: offline shows a banner; forms disable Save (see SaveRow). */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <p role="status" className="border-b border-[#f5c451]/40 bg-[#f5c451]/10 px-4 py-2 text-center text-sm text-[#f5c451]">
      You&rsquo;re offline — readings can&rsquo;t be saved until you reconnect.
    </p>
  );
}
