"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { signOut } from "@/lib/auth/session";
import { HEALTH_NOTICE_VERSION, healthNotice } from "@/content/health-notice";
import { useApp } from "./AppContext";
import { UnitsForm } from "./UnitsForm";
import { DownloadMyData } from "./DownloadMyData";
import { ConsentPanel } from "./ConsentPanel";
import { InstallHint } from "./InstallHint";

/** The screen the consent text points at: "You can download your data,
 *  delete it, or withdraw this permission at any time from More." */
export function MoreScreen() {
  const router = useRouter();
  const { status } = useApp();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">More</h1>

      <Card>
        <h2 className="text-lg">Your consent</h2>
        <p className="mt-2 text-sm text-silver">
          You agreed to notice version {status.activeVersion ?? HEALTH_NOTICE_VERSION}.{" "}
          {healthNotice.sections.find((s) => s.heading === "Your choice")?.body}
        </p>
        <ConsentPanel />
      </Card>

      <Card>
        <h2 className="text-lg">Your data</h2>
        <div className="mt-3 flex flex-col gap-3">
          <DownloadMyData />
          <Link href="/app/more/access" className="text-sm font-medium text-cyan underline-offset-4 hover:underline">
            Who has accessed my data
          </Link>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg">Units and goals</h2>
        <div className="mt-3"><UnitsForm /></div>
      </Card>

      <Card>
        <h2 className="text-lg">Add to home screen</h2>
        <InstallHint />
      </Card>

      <Card>
        <h2 className="text-lg">Account</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button href="/account/patient" variant="secondary" size="sm">Account settings</Button>
          <Button variant="secondary" size="sm" onClick={() => signOut().then(() => router.replace("/"))}>
            Sign out
          </Button>
        </div>
        <p className="mt-3 text-xs text-silver/70">
          Read the full{" "}
          <a href="/privacy-centre/notice" className="text-cyan underline underline-offset-2">privacy notice</a>.
        </p>
      </Card>
    </div>
  );
}
