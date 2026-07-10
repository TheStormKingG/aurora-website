import type { Metadata } from "next";
import Link from "next/link";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { news } from "@/content/news";

export const metadata: Metadata = {
  title: "News",
  description:
    "Announcements, community programmes, and health campaigns from H.M. Aurora Health Systems.",
};

export default function NewsPage() {
  const sorted = [...news].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="News"
          title="Announcements, programmes & campaigns"
          lede="What Aurora is launching, where the mobile clinics are heading next, and the campaigns bringing screening to your community."
        />
      </AuroraHero>
      <section className="bg-navy">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <ul className="space-y-5">
            {sorted.map((n) => (
              <li key={n.slug}>
                <Link href={`/news/${n.slug}`} className="group block rounded-2xl">
                  <Card glow>
                    <div className="flex items-center gap-3 text-xs text-silver">
                      <span className="rounded-full border border-cyan/40 px-2.5 py-1 font-semibold uppercase tracking-wider text-cyan">
                        {n.kind}
                      </span>
                      <time dateTime={n.date}>
                        {new Date(n.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                    <h2 className="mt-4 text-xl leading-snug text-starlight group-hover:text-cyan sm:text-2xl">
                      {n.title}
                    </h2>
                    <p className="mt-3 text-base leading-relaxed text-silver">{n.summary}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan">
                      Read more <Icon name="arrow" className="h-4 w-4" />
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
