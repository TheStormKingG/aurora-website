import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { openings } from "@/content/careers";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join H.M. Aurora Health Systems — clinical, community, and engineering roles building mobile healthcare and a lifelong digital health record for the Caribbean.",
};

export default function CareersPage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Careers"
          title="Build the future of Caribbean healthcare"
          lede="Clinicians, community organisers, and engineers — Aurora is assembling the team that takes care to people and gives every patient a record for life."
        />
      </AuroraHero>

      <section className="bg-navy">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="eyebrow">Open roles</h2>
          <ul className="mt-6 space-y-5">
            {openings.map((o) => (
              <li key={o.slug}>
                <Card glow>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl sm:text-2xl">{o.title}</h3>
                      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-silver">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="document" className="h-4 w-4 text-cyan" />
                          {o.type}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="globe" className="h-4 w-4 text-cyan" />
                          {o.location}
                        </span>
                      </p>
                    </div>
                    <Button
                      href={`mailto:${site.contact.careersEmail}?subject=${encodeURIComponent(
                        `Application: ${o.title}`
                      )}`}
                      size="sm"
                    >
                      Apply <Icon name="arrow" className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-4 text-base leading-relaxed text-silver">{o.summary}</p>
                  <div className="mt-6 grid gap-8 sm:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-starlight">
                        You&rsquo;ll
                      </h4>
                      <ul className="mt-3 space-y-2">
                        {o.responsibilities.map((r) => (
                          <li key={r} className="flex items-start gap-2.5 text-sm text-silver">
                            <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-starlight">
                        You bring
                      </h4>
                      <ul className="mt-3 space-y-2">
                        {o.requirements.map((r) => (
                          <li key={r} className="flex items-start gap-2.5 text-sm text-silver">
                            <Icon name="pulse" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          <Card className="mt-10">
            <h2 className="text-xl">Don&rsquo;t see your role?</h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-silver">
              Aurora grows phase by phase — wellness centres, active-ageing services, and the
              early childhood centre all need people we haven&rsquo;t met yet. Send a short
              note about what you&rsquo;d build to{" "}
              <a
                href={`mailto:${site.contact.careersEmail}`}
                className="text-cyan underline underline-offset-2 hover:text-blue"
              >
                {site.contact.careersEmail}
              </a>
              .
            </p>
            <p className="mt-4 text-sm text-silver/80">
              Applications are used only for recruitment, kept no longer than 12 months, and
              never shared — see the{" "}
              <a href="/privacy-centre/notice" className="text-cyan underline underline-offset-2">
                privacy notice
              </a>
              .
            </p>
          </Card>
        </div>
      </section>
    </>
  );
}
