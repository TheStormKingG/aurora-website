import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Donations",
  description:
    "Support community health programmes: fund screening days, mobile clinic routes, and maternal and child health outreach across Guyana.",
};

const impacts = [
  {
    icon: "pulse" as const,
    title: "Fund a screening day",
    body: "One community screening day finds the silent hypertension and diabetes cases that would otherwise surface as emergencies.",
  },
  {
    icon: "van" as const,
    title: "Keep a route rolling",
    body: "Fuel, supplies, and clinical staffing for mobile clinic routes into communities far from fixed care.",
  },
  {
    icon: "heart" as const,
    title: "Back a mother's journey",
    body: "Antenatal visits, education, and postnatal follow-up for mothers who would otherwise go without.",
  },
];

export default function DonationsPage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Donations"
          title="Put care on the road"
          lede="Donations fund Aurora's community health programmes — screening campaigns, mobile clinic routes, and maternal and child outreach."
        />
      </AuroraHero>

      <section className="section-light">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {impacts.map((i) => (
              <Card key={i.title} variant="light">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-cyan">
                  <Icon name={i.icon} className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-xl">{i.title}</h2>
                <p className="mt-3 text-base leading-relaxed text-muted-surface">{i.body}</p>
              </Card>
            ))}
          </div>

          <Card variant="light" className="mt-12 border-link-light/30">
            <div className="grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <h2 className="text-2xl">Online giving is almost here</h2>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-surface">
                  Secure card donations open with our PCI-DSS-compliant payment partner — hosted
                  payment fields only, so card details never touch Aurora servers. Until then,
                  our team arranges direct contributions personally.
                </p>
                <p className="mt-3 text-sm text-muted-surface">
                  Donor details are used solely to process and acknowledge your gift — never for
                  unrequested marketing (PDR-mandated most-private defaults apply to donors too).
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button href={`mailto:${site.contact.email}?subject=${encodeURIComponent("Donation enquiry")}`}>
                  <Icon name="mail" className="h-5 w-5" />
                  Arrange a donation
                </Button>
                <Button href="/contact" variant="secondary">
                  Ask a question first
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
