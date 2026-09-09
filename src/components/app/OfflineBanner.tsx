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

/**
 * Spec D13: offline shows a banner; forms disable Save (see SaveRow).
 * I3: role="status" only announces reliably when the region is already
 * in the DOM before its content changes, so the wrapper always renders —
 * only the text toggles. This is the one message a patient must not
 * miss (it says their reading won't save), so `sr-only` (not `hidden`)
 * keeps it in the accessibility tree while online.
 */
export function OfflineBanner() {
  const online = useOnline();
  return (
    <p
      role="status"
      className={
        online
          ? "sr-only"
          : "border-b border-[#f5c451]/40 bg-[#f5c451]/10 px-4 py-2 text-center text-sm text-[#f5c451]"
      }
    >
      {online ? "" : "You're offline — readings can't be saved until you reconnect."}
    </p>
  );
}
