import Image from "next/image";
import Link from "next/link";
import { footerNav, site } from "@/content/site";
import { asset } from "@/lib/asset";
import { EcgDivider } from "./EcgDivider";
import { Icon } from "./icons";

export function Footer() {
  return (
    <footer className="starfield relative border-t border-line-dark bg-navy">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Link href="/" aria-label={`${site.name} — home`} className="inline-block">
              <Image
                src={asset("/brand/hm-aurora-logo.png")}
                alt=""
                width={1000}
                height={276}
                className="h-14 w-auto"
              />
              <span className="sr-only">{site.name}</span>
            </Link>
            <p className="eyebrow mt-4">{site.tagline}</p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-silver">
              {site.description}
            </p>
            <div className="mt-6 flex flex-col gap-2 text-sm text-silver">
              <span className="inline-flex items-center gap-2">
                <Icon name="mail" className="h-4 w-4 text-cyan" />
                <a href={`mailto:${site.contact.email}`} className="hover:text-cyan">
                  {site.contact.email}
                </a>
              </span>
              <span className="inline-flex items-center gap-2">
                <Icon name="globe" className="h-4 w-4 text-cyan" />
                {site.contact.city}, {site.contact.country} — serving the {site.contact.region}
              </span>
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerNav.map((col) => (
              <div key={col.heading}>
                <h2 className="eyebrow !text-xs">{col.heading}</h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-silver transition-colors hover:text-cyan"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex justify-center">
          <EcgDivider className="w-full max-w-md opacity-70" />
        </div>

        {/* Trust strip — PDR §2: exemplary privacy practice as a trust signal */}
        <div className="mt-8 grid gap-4 text-center text-xs text-silver/80 sm:grid-cols-3">
          <p className="inline-flex items-center justify-center gap-2">
            <Icon name="shield" className="h-4 w-4 text-cyan" />
            Privacy by design — GDPR as our benchmark
          </p>
          <p className="inline-flex items-center justify-center gap-2">
            <Icon name="eye" className="h-4 w-4 text-cyan" />
            No third-party trackers. Ever.
          </p>
          <p className="inline-flex items-center justify-center gap-2">
            <Icon name="check" className="h-4 w-4 text-cyan" />
            Built to WCAG 2.2 AA accessibility
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-line-dark pt-8 text-xs text-silver/70 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>
            Data protection queries:{" "}
            <a href={`mailto:${site.contact.privacyEmail}`} className="text-cyan hover:text-blue">
              {site.contact.privacyEmail}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
