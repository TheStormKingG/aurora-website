import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { ServicePlatformPanel } from "@/components/ServicePlatformPanel";
import { Icon } from "@/components/icons";
import { services } from "@/content/services";

/**
 * The eight pillars on the home page, grouped by what a visitor can
 * actually do about them today (PDR §5). The phased rollout is the
 * single most characteristic fact about Aurora, so the layout encodes
 * it instead of printing it on a badge:
 *
 *   1. The Digital Health Platform leads — it is the record the others
 *      write to, not a peer (see ServicePlatformPanel).
 *   2. Four services are bookable today. The "AVAILABLE NOW" pill is
 *      replaced by the thing it was only describing: a Book link.
 *   3. Three are on the roadmap and are deliberately quieter — rows,
 *      not cards. "Phase N" is published sequence data (Service.phase),
 *      not a decorative step label.
 */

const PLATFORM_SLUG = "digital-health-platform";

const available = services.filter(
  (s) => s.phase === 1 && s.slug !== PLATFORM_SLUG,
);
const roadmap = services
  .filter((s) => s.phase > 1)
  .sort((a, b) => a.phase - b.phase);

/** Small group label — a real subheading, not a decorative eyebrow. */
function GroupLabel({ children }: { children: string }) {
  return (
    <h3 className="font-heading text-sm font-semibold text-silver">
      {children}
    </h3>
  );
}

/**
  * `part` lets the two halves become separate slides in deck mode, where
  * the combined section was 1089px against an 828px track. On a scrolling
  * page it renders whole, as before.
  */
export function ServicesOverview({ part = "all" }: { part?: "all" | "available" | "roadmap" }) {
  const showAvailable = part !== "roadmap";
  const showRoadmap = part !== "available";
  return (
    <>
      {showAvailable ? (
      <>
      <Reveal className="mt-12">
        <GroupLabel>Available now</GroupLabel>
      </Reveal>
      <Reveal>
        <ServicePlatformPanel as="h4" className="mt-4" />
      </Reveal>
      <ul data-deck-pair className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {available.map((s, i) => (
          <Reveal as="li" key={s.slug} index={i % 4}>
            <article className="group relative flex h-full flex-col rounded-2xl border border-line-dark bg-indigo p-6 transition-colors duration-300 hover:border-cyan/50">
              <div className="flex items-center gap-2.5">
                <Icon name={s.icon} className="h-5 w-5 shrink-0 text-cyan" />
                <h4 className="font-heading text-base font-semibold text-starlight transition-colors duration-300 group-hover:text-cyan">
                  <Link
                    href={`/services/${s.slug}`}
                    className="after:absolute after:inset-0 after:content-['']"
                  >
                    {s.navLabel}
                  </Link>
                </h4>
              </div>
              <p className="mt-3 flex-1 text-base leading-relaxed text-starlight">
                {s.tagline}
              </p>
              {s.bookable ? (
                /* Raised above the stretched link so it stays clickable;
                   min-h-11 gives a 44px target without a visible box. */
                <Link
                  href={`/book?service=${s.slug}`}
                  className="relative z-10 mt-2 inline-flex min-h-11 w-fit items-center gap-1.5 font-heading text-sm font-semibold text-cyan underline-offset-4 hover:text-blue hover:underline"
                >
                  Book <Icon name="arrow" className="h-4 w-4" />
                </Link>
              ) : null}
            </article>
          </Reveal>
        ))}
      </ul>

      </>
      ) : null}

      {showRoadmap ? (
      <>
      <Reveal className="mt-14">
        <GroupLabel>On the roadmap</GroupLabel>
      </Reveal>
      <ul className="mt-4 border-b border-line-dark">
        {roadmap.map((s, i) => (
          <Reveal as="li" key={s.slug} index={i}>
            <Link
              href={`/services/${s.slug}`}
              className="group relative flex flex-col gap-1 border-t border-line-dark py-5 pr-8 sm:flex-row sm:items-baseline sm:gap-6 sm:pr-0"
            >
              {/* sm:contents flattens this wrapper into the row at >=640px;
                  below that it keeps phase + name on one line. */}
              <span className="flex items-baseline gap-3 sm:contents">
                <span className="font-heading text-sm font-semibold text-silver sm:w-16 sm:shrink-0">
                  Phase {s.phase}
                </span>
                <span className="font-heading text-base font-semibold text-starlight transition-colors duration-300 group-hover:text-cyan sm:w-52 sm:shrink-0">
                  {s.navLabel}
                </span>
              </span>
              <span className="flex-1 text-base leading-relaxed text-silver">
                {s.tagline}
              </span>
              <Icon
                name="arrow"
                className="absolute right-0 top-6 h-4 w-4 shrink-0 text-silver transition-transform duration-300 group-hover:translate-x-1 group-hover:text-cyan sm:static sm:mt-2 sm:self-start"
              />
            </Link>
          </Reveal>
        ))}
      </ul>
      </>
      ) : null}
    </>
  );
}
