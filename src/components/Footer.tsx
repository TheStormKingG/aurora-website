import Image from "next/image";
import Link from "next/link";
import { footerNav, site } from "@/content/site";
import { asset } from "@/lib/asset";
import { EcgDivider } from "./EcgDivider";
import { Icon } from "./icons";

/**
 * Sized to fit one phone screen without scrolling. The footer's job is
 * wayfinding, contact, the trust signals of PDR §2, and the legal line —
 * everything here earns its height against that list. What was cut and
 * why:
 *
 * - The 45-word company description. It restated the page the visitor
 *   had just read; `site.description` still carries it for metadata.
 * - The ECG divider on mobile only. ~100px of margin and motif is the
 *   wrong trade on a phone; it stays on desktop, where there is room.
 * - Two nav links reachable one click away: "Request a Home Visit"
 *   (linked twice from /book, which is directly above it) and "Cookie
 *   Policy" (on the Privacy Centre hub, and in the consent banner on
 *   every page). Every other destination is unchanged.
 *
 * Footer links are block-level with vertical padding so each is a ~32px
 * tap target rather than the 20px text line it was before.
 */
export function Footer() {
  return (
    <footer className="starfield relative border-t border-line-dark bg-navy">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr] lg:gap-12">
          <div>
            <Link href="/" aria-label={`${site.name} — home`} className="inline-block">
              {/* h-14 = 203px wide: the PDR §4.1 lockup minimum is 180px,
                  so this is the floor, not a spacing dial. */}
              <Image
                src={asset("/brand/hm-aurora-logo.png")}
                alt=""
                width={1000}
                height={276}
                className="h-14 w-auto"
              />
              <span className="sr-only">{site.name}</span>
            </Link>
            <p className="eyebrow mt-2">{site.tagline}</p>
            <div className="mt-3 flex flex-col gap-1 text-sm text-silver">
              <span className="inline-flex items-center gap-2">
                <Icon name="mail" className="h-4 w-4 shrink-0 text-cyan" />
                <a href={`mailto:${site.contact.email}`} className="hover:text-cyan">
                  {site.contact.email}
                </a>
              </span>
              <span className="inline-flex items-center gap-2">
                <Icon name="globe" className="h-4 w-4 shrink-0 text-cyan" />
                {site.contact.city}, {site.contact.country} — serving the {site.contact.region}
              </span>
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 sm:gap-8">
            {footerNav.map((col) => (
              <div key={col.heading}>
                <h2 className="eyebrow !text-xs">{col.heading}</h2>
                <ul className="mt-1 flex flex-col sm:mt-2.5">
                  {col.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block py-1 text-sm text-silver transition-colors hover:text-cyan sm:py-1.5"
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

        <div className="mt-12 hidden justify-center sm:flex">
          <EcgDivider className="w-full max-w-md opacity-70" />
        </div>

        {/* Trust strip — PDR §2: exemplary privacy practice as a trust
            signal. One wrapped row instead of three stacked blocks; on
            mobile its hairline stands in for the ECG divider. */}
        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 border-t border-line-dark pt-4 text-xs text-silver/80 sm:mt-8 sm:gap-x-5 sm:border-0 sm:pt-0">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="shield" className="h-4 w-4 shrink-0 text-cyan" />
            Privacy by design
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="eye" className="h-4 w-4 shrink-0 text-cyan" />
            No third-party trackers
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="check" className="h-4 w-4 shrink-0 text-cyan" />
            WCAG 2.2 AA
          </span>
        </div>

        <div className="mt-3 flex flex-col items-center gap-1 text-center text-xs text-silver/70 sm:mt-8 sm:flex-row sm:justify-between sm:gap-4 sm:border-t sm:border-line-dark sm:pt-8 sm:text-left">
          <p>
            © {new Date().getFullYear()} {site.name}
          </p>
          <p>
            Data protection:{" "}
            <a href={`mailto:${site.contact.privacyEmail}`} className="text-cyan hover:text-blue">
              {site.contact.privacyEmail}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
