import Link from "next/link";
import { Icon } from "@/components/icons";
import { getService } from "@/content/services";

/**
 * The Aurora Digital Health Platform is not a ninth peer in a grid of
 * eight — it is the record every other pillar writes to, and the site
 * copy says so. It leads both the home overview and /services, and it
 * is the ONE place the cyan-glow icon treatment is spent (PDR §4.4).
 * Repeating that motif once per card is what made the grid read as
 * eight interchangeable tiles.
 *
 * The whole panel is a single target (stretched link on the heading),
 * so it needs no second "Learn more" call to action.
 */
export function ServicePlatformPanel({
  as: Heading = "h3",
  className = "",
}: {
  /** Heading level, so the panel nests correctly under its group label. */
  as?: "h3" | "h4";
  className?: string;
}) {
  const platform = getService("digital-health-platform");
  if (!platform) return null;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-line-dark bg-indigo p-6 transition-colors duration-300 hover:border-cyan/50 sm:p-10 ${className}`}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-[image:var(--gradient-aurora)]"
      />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
        <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan/30 bg-navy text-cyan shadow-[var(--glow-cyan)]">
          <Icon name={platform.icon} className="h-8 w-8" />
        </span>
        <div className="min-w-0 flex-1">
          <Heading className="font-heading text-sm font-semibold text-silver">
            <Link
              href={`/services/${platform.slug}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {platform.name}
            </Link>
          </Heading>
          <p className="mt-2 font-heading text-2xl font-bold leading-tight text-starlight transition-colors duration-300 group-hover:text-cyan sm:text-3xl">
            {platform.tagline}
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-silver">
            {platform.summary}
          </p>
        </div>
        <Icon
          name="arrow"
          className="hidden h-6 w-6 shrink-0 text-silver transition-transform duration-300 group-hover:translate-x-1 group-hover:text-cyan sm:block"
        />
      </div>
    </div>
  );
}
