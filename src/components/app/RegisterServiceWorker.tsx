"use client";

import { useEffect } from "react";
import { asset } from "@/lib/asset";

/** Registered from the app layout, scoped to /app so the marketing site
 *  is untouched. Failure is non-fatal — the app works without it. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(asset("/sw.js"), { scope: asset("/app/") })
      .catch(() => undefined);
  }, []);
  return null;
}