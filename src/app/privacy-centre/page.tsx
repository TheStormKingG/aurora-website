import type { Metadata } from "next";
import Link from "next/link";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy Centre",
  description:
    "Everything about your data in one place: the privacy notice, cookie policy, consent preferences, and forms to exercise your data rights.",
};

const tiles = [
  {
    href: "/privacy-centre/notice",
    icon: "document" as const,
    title: "Privacy notice",
    body: "Who we are, what we collect, why, how long we keep it, and the rights you hold — in plain language.",
  },
  {
    href: "/privacy-centre/cookies",
    icon: "eye" as const,
    title: "Cookie policy",
    body: "The complete list of cookies this site can set. It is short: one, and it stores your consent choice.",
  },
  {
    href: "/privacy-centre/preferences",
    icon: "check" as const,
    title: "Consent preferences",
    body: "See and change every consent — granular per purpose, withdrawable in one step, effective immediately.",
  },
  {
    href: "/privacy-centre/rights-request",
    icon: "shield" as const,
    title: "Exercise your rights",
    body: "Access, correct, delete, restrict, export, or object — request any of them here with a tracked reference.",
  },
];

export default function PrivacyCentrePage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Privacy Centre"
          title="Your data. Your rules. One place."
          lede="Aurora treats privacy as infrastructure: most-private defaults, no third-party trackers, and self-service control over everything we hold about you."
        />
      </AuroraHero>

      <section className="bg-navy">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {tiles.map((t) => (
              <Link key={t.href} href={t.href} className="group block rounded-2xl">
                <Card glow className="h-full">
                  <Icon name={t.icon} className="h-7 w-7 text-cyan" />
                  <h2 className="mt-4 text-xl text-starlight group-hover:text-cyan">{t.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-silver">{t.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan">
                    Open <Icon name="arrow" className="h-4 w-4" />
                  </span>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="mt-10">
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <h2 className="eyebrow !text-xs">Our commitments</h2>
                <ul className="mt-4 space-y-2.5 text-sm text-silver">
                  <li className="flex gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                    GDPR is our design benchmark, layered with the Guyana Data Protection Act 2023.
                  </li>
                  <li className="flex gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                    Sharing, marketing, and family access default OFF.
                  </li>
                  <li className="flex gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                    This website stores no clinical data — ever.
                  </li>
                </ul>
              </div>
              <div>
                <h2 className="eyebrow !text-xs">Data protection contact</h2>
                <p className="mt-4 text-sm leading-relaxed text-silver">
                  Data Protection Officer
                  <br />
                  {site.name}
                  <br />
                  <a
                    href={`mailto:${site.contact.privacyEmail}`}
                    className="text-cyan underline underline-offset-2 hover:text-blue"
                  >
                    {site.contact.privacyEmail}
                  </a>
                </p>
              </div>
              <div>
                <h2 className="eyebrow !text-xs">Notice version</h2>
                <p className="mt-4 text-sm leading-relaxed text-silver">
                  Current privacy notice: v{site.privacyNoticeVersion}. Changes are announced on
                  this page and the notice itself; your consent is re-requested when practices
                  change.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
