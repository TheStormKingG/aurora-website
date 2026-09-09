import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app/AppShell";

export const metadata: Metadata = {
  title: { default: "Aurora Health", template: "%s | Aurora Health" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#060B22", viewportFit: "cover" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
