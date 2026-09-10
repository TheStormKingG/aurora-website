import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app/AppShell";
import { RegisterServiceWorker } from "@/components/app/RegisterServiceWorker";
import { asset } from "@/lib/asset";

export const metadata: Metadata = {
  title: { default: "Aurora Health", template: "%s | Aurora Health" },
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Aurora", statusBarStyle: "black-translucent" },
  icons: { apple: asset("/app-icons/apple-touch-icon.png") },
};

export const viewport: Viewport = { themeColor: "#060B22", viewportFit: "cover" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegisterServiceWorker />
      <AppShell>{children}</AppShell>
    </>
  );
}