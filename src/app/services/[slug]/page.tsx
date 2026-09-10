import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { getService, services } from "@/content/services";
import { asset } from "@/lib/asset";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return { title: service.name, description: service.summary };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  return (
    <>
      <AuroraHero>
        {/* Split when the pillar has a photograph that honestly depicts
            it; the ones without stay text-only rather than borrow an
            image of something else. */}
        <div
          className={
            service.image
              ? "grid items-center gap-10 lg:grid-cols-[7fr_5fr] lg:gap-14"
              : ""
          }
        >
          <div className="max-w-3xl">
          <p className="eyebrow">{service.phaseLabel}</p>
          <div className="mt-5 flex items-start gap-5">
            <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan/30 bg-navy p-3 text-cyan shadow-[0_0_18px_rgba(43,217,245,0.15)] sm:inline-flex">
              <Icon name={service.icon} className="h-8 w-8" />
            </span>
            <div>
              <h1 className="text-4xl sm:text-5xl">{service.name}</h1>
              <p className="mt-3 text-xl text-silver">{service.tagline}</p>
            </div>
          </div>
          {service.bookable ? (
            <div className="mt-8 flex flex-wrap gap-4">
              <Button href={`/book?service=${service.slug}`} size="lg">
                <Icon name="calendar" className="h-5 w-5" />
                Book this service
              </Button>
              <Button href="/book/home-visit" size="lg" variant="secondary">
                Request a home visit
              </Button>
            </div>
          ) : (
            <div className="mt-8">
              <Button href="/contact" size="lg" variant="secondary">
                Register interest <Icon name="arrow" className="h-5 w-5" />
              </Button>
            </div>
          )}
          </div>

          {service.image ? (
            <Image
              src={asset(service.image)}
              alt={service.imageAlt ?? ""}
              width={1200}
              height={900}
              priority
              className="aspect-[4/3] w-full rounded-2xl border border-line-dark object-cover object-center shadow-[0_24px_50px_-22px_rgba(2,5,18,0.7)] lg:aspect-[5/6]"
            />
          ) : null}
        </div>
      </AuroraHero>

      <section className="section-light">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeading title="What it is" />
            <div className="mt-6 space-y-5 text-base leading-relaxed">
              {service.body.map((p) => (
                <p key={p.slice(0, 32)}>{p}</p>
              ))}
            </div>

            <h2 className="mt-12 text-2xl">Who it&rsquo;s for</h2>
            <ul className="mt-5 space-y-3">
              {service.audiences.map((a) => (
                <li key={a} className="flex items-start gap-3">
                  <Icon name="users" className="mt-1 h-5 w-5 shrink-0 text-link-light" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside aria-label="What this service includes">
            <Card variant="light" className="lg:sticky lg:top-24">
              <h2 className="text-xl">What&rsquo;s included</h2>
              <ul className="mt-5 space-y-3.5">
                {service.offerings.map((o) => (
                  <li key={o} className="flex items-start gap-3 text-base">
                    <Icon name="check" className="mt-1 h-4.5 w-4.5 shrink-0 text-link-light" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
              {service.bookable ? (
                <div className="mt-7">
                  <Button href={`/book?service=${service.slug}`} className="w-full">
                    Book an appointment
                  </Button>
                </div>
              ) : null}
              <p className="mt-5 text-sm text-muted-surface">
                Visits are recorded to your Aurora Health Record only with your consent — see
                the <a href="/privacy-centre">Privacy Centre</a>.
              </p>
            </Card>
          </aside>
        </div>
      </section>
    </>
  );
}
