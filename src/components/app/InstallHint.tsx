"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

/**
 * Placeholder ahead of Task 14 (manifest, service worker and the full
 * install flow — spec §9.1): real platform detection and a real install
 * button wherever the browser supports one, so More's promise holds now
 * instead of showing a stub. iOS never fires `beforeinstallprompt`, so it
 * gets written instructions instead. Task 14 still owns the manifest
 * itself (without one, `beforeinstallprompt` has nothing to fire) and
 * installed-state detection (`display-mode: standalone`); neither is
 * attempted here.
 */
export function InstallHint() {
  const [ios, setIos] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (prompt) {
    return (
      <div className="mt-2 flex flex-col gap-3">
        <p className="text-sm text-silver">Add Aurora to your home screen for one-tap access.</p>
        <button
          type="button"
          onClick={() => { prompt.prompt().catch(() => undefined); setPrompt(null); }}
          className="motion-press inline-flex min-h-11 w-fit items-center rounded-full bg-cyan px-4 text-sm font-semibold text-navy hover:bg-blue"
        >
          Add to home screen
        </button>
      </div>
    );
  }

  if (ios) {
    return (
      <p className="mt-2 text-sm text-silver">
        Tap the Share button in Safari, then <strong className="text-starlight">Add to Home Screen</strong>.
      </p>
    );
  }

  return (
    <p className="mt-2 text-sm text-silver">
      Open your browser&rsquo;s menu and look for <strong className="text-starlight">Install app</strong> or{" "}
      <strong className="text-starlight">Add to Home screen</strong>.
    </p>
  );
}
