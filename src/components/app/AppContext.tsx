"use client";

import { createContext, useContext } from "react";
import type { HealthStatus } from "@/lib/health/client";
import type { LogKind } from "@/lib/health/types";

export type AppContextValue = {
  status: HealthStatus;
  refreshStatus: () => Promise<void>;
  openLog: (kind?: LogKind) => void;
  /** Increments after every successful save; screens refetch when it changes. */
  version: number;
  bump: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);
export const AppProvider = AppContext.Provider;

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error("useApp must be used inside AppShell");
  return v;
}
