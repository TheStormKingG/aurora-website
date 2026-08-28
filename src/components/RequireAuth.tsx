"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { asset } from "@/lib/asset";

/** Client-side guard (UX only — RLS is the real boundary). Redirects to
 *  patient login when there is no session. Shows nothing while resolving. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session === null) router.replace(asset("/patient-login/"));
  }, [session, router]);
  if (session === undefined) {
    return <p className="mx-auto max-w-7xl px-4 py-24 text-silver sm:px-6">Loading…</p>;
  }
  if (session === null) return null;
  return <>{children}</>;
}
