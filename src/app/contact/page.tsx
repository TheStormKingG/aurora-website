import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { locations } from "@/content/locations";
import { site } from "@/content/site";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Reach H.M. Aurora Health Systems: general enquiries, partnerships, careers, and mobile clinic hosting. Locations and service areas across Guyana.",
};

export default function ContactPage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Contact us"
          title="Talk to the Aurora team"
          lede="Questions, partnerships, careers, or bringing a mobile clinic to your community — we reply within two working days."
        />
      </AuroraHero>

      <section className="bg-navy">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <h2 className="text-2xl">Send a message</h2>
            <p className="mt-2 text-sm text-silver">
              We ask only for what a reply needs — details are used for this enquiry alone
              (see the{" "}
              <a href="/privacy-centre/notice" className="text-cyan underline underline-offset-2">
                privacy notice
              </a>
              ).
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <h2 className="text-xl">Direct lines</h2>
              <ul className="mt-4 space-y-3 text-base text-silver">
                <li className="flex items-center gap-3">
                  <Icon name="mail" className="h-5 w-5 shrink-0 text-cyan" />
                  <a href={`mailto:${site.contact.email}`} className="hover:text-cyan">
                    {site.contact.email}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Icon name="shield" className="h-5 w-5 shrink-0 text-cyan" />
                  <a href={`mailto:${site.contact.privacyEmail}`} className="hover:text-cyan">
                    {site.contact.privacyEmail}
                  </a>
                  <span className="text-sm text-silver/70">(data protection)</span>
                </li>
                <li className="flex items-center gap-3">
                  <Icon name="users" className="h-5 w-5 shrink-0 text-cyan" />
                  <a href={`mailto:${site.contact.careersEmail}`} className="hover:text-cyan">
                    {site.contact.careersEmail}
                  </a>
                  <span className="text-sm text-silver/70">(careers)</span>
                </li>
              </ul>
              <p className="mt-5 text-sm leading-relaxed text-silver/80">
                For medical emergencies go to your nearest hospital emergency department —
                email and this form are not monitored around the clock.
              </p>
            </Card>

            <Card>
              <h2 className="text-xl">Where we work</h2>
              <ul className="mt-4 space-y-4">
                {locations.map((l) => (
                  <li key={l.id} className="border-b border-line-dark pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-starlight">{l.name}</h3>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider ${
                          l.status === "Active"
                            ? "border-cyan/50 text-cyan"
                            : "border-silver/40 text-silver"
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-silver">{l.area}</p>
                    <p className="mt-1 text-sm text-silver/80">{l.note}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
