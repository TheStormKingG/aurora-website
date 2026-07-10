import type { Metadata } from "next";
import Link from "next/link";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { services } from "@/content/services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Eight pillars of care: mobile healthcare, chronic disease prevention, maternal health, child nutrition and development, community wellness centres, active ageing, early childhood, and the Aurora Digital Health Platform.",
};

export default function ServicesPage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Services"
          title="Eight pillars of care"
          lede="Every pillar is a doorway into the same connected system: book once, and your care — mobile, in-centre, or virtual — builds one lifelong health record."
        />
      </AuroraHero>

      <section className="bg-navy">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <ul className="grid gap-6 md:grid-cols-2">
            {services.map((s, i) => (
              <li key={s.slug}>
                <Card glow className="h-full">
                  <div className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <span className="inline-flex h-13 w-13 items-center justify-center rounded-xl border border-cyan/30 bg-navy p-3 text-cyan shadow-[0_0_18px_rgba(43,217,245,0.15)]">
                        <Icon name={s.icon} className="h-7 w-7" />
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider ${
                          s.phase === 1 ? "border-cyan/50 text-cyan" : "border-silver/40 text-silver"
                        }`}
                      >
                        {s.phaseLabel}
                      </span>
                    </div>
                    <h2 className="mt-5 text-2xl leading-snug">
                      <Link href={`/services/${s.slug}`} className="hover:text-cyan">
                        {s.name}
                      </Link>
                    </h2>
                    <p className="eyebrow mt-2 !text-xs !normal-case !tracking-normal !text-silver">
                      {s.tagline}
                    </p>
                    <p className="mt-4 flex-1 text-base leading-relaxed text-silver">{s.summary}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Button href={`/services/${s.slug}`} size="sm" variant="secondary">
                        Learn more <Icon name="arrow" className="h-4 w-4" />
                      </Button>
                      {s.bookable ? (
                        <Button href={`/book?service=${s.slug}`} size="sm">
                          Book now
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
