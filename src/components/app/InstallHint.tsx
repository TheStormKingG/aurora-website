"use client";

import { useEffect, useState } from "react";

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Android fires beforeinstallprompt and we can show a real button; iOS
 *  never does, so it gets the Share → Add to Home Screen instructions. */
export function InstallHint() {
  const [deferred, setDeferred] = useState<Prompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as Prompt); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return <p className="mt-2 text-sm text-silver">Already installed on this device.</p>;

  return (
    <div className="mt-2 flex flex-col gap-3">
      <p className="text-sm text-silver">
        Add Aurora to your home screen and it opens like an app, without the browser bars.
      </p>
      {deferred ? (
        <button type="button"
          onClick={() => { deferred.prompt().catch(() => undefined); setDeferred(null); }}
          className="motion-press inline-flex min-h-11 w-fit items-center rounded-full bg-cyan px-4 text-sm font-semibold text-navy hover:bg-blue">
          Add to home screen
        </button>
      ) : ios ? (
        <p className="text-sm text-silver">
          Tap the Share button at the bottom of Safari, then <strong className="text-starlight">Add to Home Screen</strong>.
        </p>
      ) : (
        <p className="text-sm text-silver">
          Open your browser&rsquo;s menu and choose <strong className="text-starlight">Install app</strong> or{" "}
          <strong className="text-starlight">Add to Home screen</strong>.
        </p>
      )}
      <p className="text-xs text-silver/70">
        You sign in again inside the installed app — it keeps its own separate session.
      </p>
    </div>
  );
}