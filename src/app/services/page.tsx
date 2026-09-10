import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { SectionHeading } from "@/components/SectionHeading";
import { ServicePlatformPanel } from "@/components/ServicePlatformPanel";
import { Icon } from "@/components/icons";
import { services } from "@/content/services";
import { asset } from "@/lib/asset";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Eight pillars of care: mobile healthcare, chronic disease prevention, maternal health, child nutrition and development, community wellness centres, active ageing, early childhood, and the Aurora Digital Health Platform.",
};

const PLATFORM_SLUG = "digital-health-platform";

const available = services.filter(
  (s) => s.phase === 1 && s.slug !== PLATFORM_SLUG,
);
const roadmap = services
  .filter((s) => s.phase > 1)
  .sort((a, b) => a.phase - b.phase);

export default function ServicesPage() {
  return (
    <>
      <AuroraHero>
        <div className="grid items-center gap-10 lg:grid-cols-[7fr_5fr] lg:gap-14">
          <div>
          <SectionHeading
            as="h1"
            eyebrow="Services"
            title="Eight pillars of care"
            lede="Every pillar is a doorway into the same connected system: book once, and your care — mobile, in-centre, or virtual — builds one lifelong health record."
          />
          </div>
          <Image
            src={asset("/photos/services-care.jpg")}
            alt="Two clinicians in white coats working together over a patient's notes."
            width={1000}
            height={1500}
            priority
            className="aspect-[4/3] w-full rounded-2xl border border-line-dark object-cover object-center shadow-[0_24px_50px_-22px_rgba(2,5,18,0.7)] lg:aspect-[5/6]"
          />
        </div>
      </AuroraHero>

      {/* Grouped by availability rather than badged with it: the phase
          pill on all eight cards said nothing on the five it repeated,
          and buried the one distinction that matters — what you can
          book today. */}
      <section className="bg-navy" aria-labelledby="available-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2
            id="available-heading"
            className="font-heading text-sm font-semibold text-silver"
          >
            Available now
          </h2>
          <ServicePlatformPanel className="mt-4" />
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {available.map((s) => (
              <li key={s.slug}>
                <article className="group relative flex h-full flex-col rounded-2xl border border-line-dark bg-indigo p-6 transition-colors duration-300 hover:border-cyan/50 sm:p-8">
                  <div className="flex items-center gap-3">
                    <Icon
                      name={s.icon}
                      className="h-6 w-6 shrink-0 text-cyan"
                    />
                    <h3 className="text-xl leading-snug transition-colors duration-300 group-hover:text-cyan">
                      <Link
                        href={`/services/${s.slug}`}
                        className="after:absolute after:inset-0 after:content-['']"
                      >
                        {s.name}
                      </Link>
                    </h3>
                  </div>
                  {/* The tagline is a voice line, not a second heading:
                      body face, starlight, regular weight. Two bold
                      lines stacked read as a repeated title. */}
                  <p className="mt-4 text-base leading-relaxed text-starlight">{s.tagline}</p>
                  <p className="mt-3 flex-1 text-base leading-relaxed text-silver">
                    {s.summary}
                  </p>
                  {s.bookable ? (
                    /* One action per card. The card itself is the
                       "learn more" link, so a second button saying so
                       would be the same intent twice. */
                    <Button
                      href={`/book?service=${s.slug}`}
                      className="relative z-10 mt-6 w-fit"
                    >
                      Book now
                    </Button>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-navy pb-16" aria-labelledby="roadmap-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2
            id="roadmap-heading"
            className="font-heading text-sm font-semibold text-silver"
          >
            On the roadmap
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-silver">
            Not open yet. Each one extends the same record you start building
            today.
          </p>
          <ul className="mt-6 border-b border-line-dark">
            {roadmap.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/services/${s.slug}`}
                  className="group grid gap-3 border-t border-line-dark py-6 md:grid-cols-[7rem_1fr_1.2fr] md:items-baseline md:gap-8"
                >
                  <span className="font-heading text-sm font-semibold text-silver">
                    Phase {s.phase}
                  </span>
                  <span>
                    <span className="block font-heading text-lg font-bold text-starlight transition-colors duration-300 group-hover:text-cyan">
                      {s.name}
                    </span>
                    <span className="mt-1 block text-base text-silver">
                      {s.tagline}
                    </span>
                  </span>
                  <span className="flex items-start gap-4 text-base leading-relaxed text-silver">
                    <span className="flex-1">{s.summary}</span>
                    <Icon
                      name="arrow"
                      className="mt-1 h-4 w-4 shrink-0 text-silver transition-transform duration-300 group-hover:translate-x-1 group-hover:text-cyan"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
