import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { EcgDivider } from "@/components/EcgDivider";
import { getNewsItem, news } from "@/content/news";

export function generateStaticParams() {
  return news.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = getNewsItem(slug);
  if (!item) return {};
  return { title: item.title, description: item.summary };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getNewsItem(slug);
  if (!item) notFound();

  return (
    <>
      <AuroraHero>
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 text-xs text-silver">
            <span className="rounded-full border border-cyan/40 px-2.5 py-1 font-semibold uppercase tracking-wider text-cyan">
              {item.kind}
            </span>
            <time dateTime={item.date}>
              {new Date(item.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </div>
          <h1 className="mt-5 text-4xl leading-tight sm:text-5xl">{item.title}</h1>
        </div>
      </AuroraHero>

      <article className="section-light">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="prose-light space-y-5 text-base leading-relaxed sm:text-lg">
            {item.body.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <EcgDivider />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href="/book">Book an appointment</Button>
            <Button href="/contact" variant="secondary">
              Contact us
            </Button>
          </div>
          <p className="mt-8 text-center text-sm">
            <Link href="/news">← All news</Link>
          </p>
        </div>
      </article>
    </>
  );
}
