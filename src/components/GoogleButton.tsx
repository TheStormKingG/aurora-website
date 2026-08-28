"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth/patient";

/** "Continue with Google" — initiates OAuth; the browser redirects on success. */
export function GoogleButton() {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    setError(undefined);
    const r = await signInWithGoogle();
    if (!r.ok) {
      setBusy(false);
      setError(r.error);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-silver/40 bg-starlight px-6 py-3 font-heading text-sm font-semibold text-navy transition-colors hover:border-cyan disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.15-4.05 1.15-3.12 0-5.76-2.11-6.7-4.94H1.29v3.09A11.997 11.997 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.19 7.19 0 0 1 0-4.6V6.61H1.29a12.02 12.02 0 0 0 0 10.78l4.01-3.09z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.61l4.01 3.09C6.24 6.86 8.88 4.75 12 4.75z" />
        </svg>
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-[#ff9db0]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
