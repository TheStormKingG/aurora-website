"use client";

import { useEffect } from "react";

/**
 * I8: route-segment error boundary for /app. useApp() throws when used
 * outside AppProvider, and any other render bug here would otherwise
 * white-screen the whole app — catch it and offer a reset instead.
 * Next does not use this for errors thrown by app/layout.tsx (AppShell)
 * itself, only for the page-level content it renders.
 *
 * Styled to match AppShell's own retry card (same classes) rather than
 * the marketing site's not-found page — there's no top bar or tab bar
 * here since the failure may be inside AppShell's own tree.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-silver">Something went wrong loading this screen.</p>
      <button
        type="button"
        onClick={reset}
        className="motion-press mt-4 rounded-full border border-cyan/60 px-4 py-2 text-sm font-semibold text-cyan hover:border-cyan"
      >
        Try again
      </button>
    </div>
  );
}
