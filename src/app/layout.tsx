import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { ConsentBanner } from "@/components/ConsentBanner";
import { OrganizationSchema } from "@/components/Schema";
import { site } from "@/content/site";
import "./globals.css";

/* PDR §4.3 typography — next/font downloads at build time and serves
   from our origin: zero third-party font requests at runtime (§8). */
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hmaurora.health"),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.shortName}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    siteName: site.name,
    type: "website",
    locale: "en_GY",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#060B22",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col">
        {/* Scroll-reveal content must never be lost without JS */}
        <noscript>
          <style>{`.reveal-scroll{opacity:1;transform:none}.ecg-reveal-path{stroke-dashoffset:0}.ignite-step .ignite-icon{color:var(--aurora-cyan)}`}</style>
        </noscript>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-cyan focus:px-5 focus:py-2.5 focus:font-heading focus:font-semibold focus:text-navy"
        >
          Skip to main content
        </a>
        <NavBar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <ConsentBanner />
        <OrganizationSchema />
      </body>
    </html>
  );
}
