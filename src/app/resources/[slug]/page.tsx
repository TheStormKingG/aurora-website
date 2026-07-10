import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EcgDivider } from "@/components/EcgDivider";
import { Icon } from "@/components/icons";
import { getResource, resources } from "@/content/resources";

export function generateStaticParams() {
  return resources.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resource = getResource(slug);
  if (!resource) return {};
  return { title: resource.title, description: resource.summary };
}

export default async function ResourceArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = getResource(slug);
  if (!resource) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: resource.title,
    description: resource.summary,
    dateModified: resource.updated,
    reviewedBy: { "@type": "Organization", name: "H.M. Aurora Health Systems" },
    audience: { "@type": "PeopleAudience", audienceType: "patients and families" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <AuroraHero>
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-full border border-cyan/40 px-2.5 py-1 font-semibold uppercase tracking-wider text-cyan">
              {resource.category}
            </span>
            <span className="text-silver">{resource.readingMinutes} min read</span>
            <span className="text-silver">
              Updated{" "}
              <time dateTime={resource.updated}>
                {new Date(resource.updated).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </span>
          </div>
          <h1 className="mt-5 text-4xl leading-tight sm:text-5xl">{resource.title}</h1>
          <p className="mt-4 text-lg text-silver">{resource.summary}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-silver">
            <Icon name="check" className="h-4 w-4 text-cyan" />
            Reviewed by the {resource.reviewed}
          </p>
        </div>
      </AuroraHero>

      {/* Long-form content inverts to light (PDR §4.2) */}
      <article className="section-light">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <Card variant="light" className="border-link-light/25">
            <h2 className="eyebrow !text-xs">Key points</h2>
            <ul className="mt-4 space-y-3">
              {resource.keyPoints.map((k) => (
                <li key={k.slice(0, 32)} className="flex items-start gap-3 text-base">
                  <Icon name="pulse" className="mt-1 h-4.5 w-4.5 shrink-0 text-link-light" />
                  {k}
                </li>
              ))}
            </ul>
          </Card>

          <div className="prose-light mt-12 space-y-10">
            {resource.body.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl">{section.heading}</h2>
                <div className="mt-4 space-y-4 text-base leading-relaxed">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 32)}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 border-t border-line-light pt-8">
            <h2 className="eyebrow !text-xs">Sources</h2>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-muted-surface">
              {resource.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted-surface">
              This article is general health education, not personal medical advice. For advice
              about your own health, speak with a clinician.
            </p>
          </div>

          <div className="mt-12 flex justify-center">
            <EcgDivider />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href="/book">Book a screening</Button>
            <Button href="/resources" variant="secondary">
              More resources
            </Button>
          </div>
          <p className="mt-8 text-center text-sm">
            <Link href="/resources">← Back to the library</Link>
          </p>
        </div>
      </article>
    </>
  );
}
