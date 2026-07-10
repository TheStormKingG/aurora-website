import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { site } from "@/content/site";
import { RightsRequestForm } from "./RightsRequestForm";

export const metadata: Metadata = {
  title: "Exercise Your Data Rights",
  description:
    "Request access, correction, deletion, restriction, portability, or object to processing — every request is tracked and answered within one month.",
};

export default function RightsRequestPage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Your data rights"
          title="Ask, and it's tracked"
          lede="Every request opens an auditable record with a reference, identity verification proportionate to the risk, and a response within one month."
        />
      </AuroraHero>

      <section className="bg-navy">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <h2 className="text-2xl">Open a rights request</h2>
            <div className="mt-6">
              <RightsRequestForm />
            </div>
          </Card>
          <aside className="flex flex-col gap-6" aria-label="About rights requests">
            <Card>
              <Icon name="orbit" className="h-6 w-6 text-cyan" />
              <h2 className="mt-3 text-lg">Portal users: it&rsquo;s self-service</h2>
              <p className="mt-2 text-sm leading-relaxed text-silver">
                If you have a Patient Portal account, you can download your record, request
                corrections, manage consents, and delete your account directly — no form
                needed. This form covers everything else.
              </p>
            </Card>
            <Card>
              <Icon name="shield" className="h-6 w-6 text-cyan" />
              <h2 className="mt-3 text-lg">Prefer email?</h2>
              <p className="mt-2 text-sm leading-relaxed text-silver">
                Write to our Data Protection Officer at{" "}
                <a
                  href={`mailto:${site.contact.privacyEmail}`}
                  className="text-cyan underline underline-offset-2 hover:text-blue"
                >
                  {site.contact.privacyEmail}
                </a>
                . The same one-month clock applies.
              </p>
            </Card>
          </aside>
        </div>
      </section>
    </>
  );
}
