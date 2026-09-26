import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { ConsentBanner } from "@/components/ConsentBanner";
import { SiteChrome } from "@/components/SiteChrome";
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
      <head>
        {/*
          Content Security Policy, delivered by meta because this site is a
          static export on GitHub Pages — there is no middleware and no way
          to set response headers, so PDR §10's "strict CSP via middleware"
          cannot be implemented as written. This is the achievable form of
          it, and it is worth being precise about what it does and does not
          buy:

          * connect-src is the load-bearing line. The patient session lives
            in localStorage (supabase-js with persistSession), so a script
            injection could read it — but it could only *send* it somewhere
            this list allows. Restricting the destinations removes the
            second half of a token-theft chain even when the first half
            succeeds.
          * script-src keeps 'unsafe-inline' because Next injects a
            bootstrap script and a static export cannot issue nonces. So
            this is NOT an anti-XSS control; treat input handling and
            React's own escaping as the defence there, not this header.
          * frame-ancestors is absent because it is ignored in a meta tag
            and GitHub Pages cannot send X-Frame-Options. Clickjacking is
            unmitigated on this host — moving to a CDN that can set headers
            is the only fix, and it is worth doing before any staff EHR
            surface ships.
        */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={[
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "form-action 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self'",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
            "frame-src 'none'",
            "upgrade-insecure-requests",
          ].join("; ")}
        />
      </head>
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
        <SiteChrome>
          <NavBar />
        </SiteChrome>
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteChrome>
          <Footer />
          <ConsentBanner />
        </SiteChrome>
        <OrganizationSchema />
      </body>
    </html>
  );
}
