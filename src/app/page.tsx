import Link from "next/link";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EcgDivider } from "@/components/EcgDivider";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { ServicesOverview } from "@/components/ServicesOverview";
import { StepsIgnition } from "@/components/StepsIgnition";
import { Icon } from "@/components/icons";
import { news } from "@/content/news";
import { site } from "@/content/site";

export default function HomePage() {
  const highlights = news.slice(0, 3);

  return (
    <>
      {/* ── Hero (PDR §5: hero, booking CTA, trust indicators) ────── */}
      <AuroraHero size="home">
        <div className="max-w-3xl">
          <p className="eyebrow reveal" style={{ "--reveal-i": 0 } as React.CSSProperties}>
            {site.tagline}
          </p>
          <h1
            className="reveal mt-5 text-4xl leading-[1.08] sm:text-6xl lg:text-7xl"
            style={{ "--reveal-i": 1 } as React.CSSProperties}
          >
            Healthcare that <span className="text-chrome">comes to you</span> — and a health
            record that lasts a lifetime.
          </h1>
          <p
            className="reveal mt-6 max-w-2xl text-lg leading-relaxed text-silver sm:text-xl"
            style={{ "--reveal-i": 2 } as React.CSSProperties}
          >
            Mobile clinics on your street. Home visits when you can&rsquo;t travel. One
            secure record from pregnancy through ageing, controlled by you.
          </p>
          <div
            className="reveal mt-9 flex flex-wrap items-center gap-4"
            style={{ "--reveal-i": 3 } as React.CSSProperties}
          >
            <Button href="/book" size="lg">
              <Icon name="calendar" className="h-5 w-5" />
              Book an appointment
            </Button>
            <Button href="/book/home-visit" size="lg" variant="secondary">
              <Icon name="home" className="h-5 w-5" />
              Request a home visit
            </Button>
          </div>

        </div>
      </AuroraHero>

      {/* ── Services overview (8 pillars) ──────────────────────────── */}
      <section className="bg-navy-soft" aria-labelledby="services-heading">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                title={<span id="services-heading">Eight pillars of care, one connected system</span>}
                lede="From mobile clinics rolling today to the wellness centres of tomorrow — every service writes to the same lifelong record."
                revealEcg
              />
              <Button href="/services" variant="secondary" className="mb-1">
                All services <Icon name="arrow" className="h-4 w-4" />
              </Button>
            </div>
          </Reveal>

          <ServicesOverview />
        </div>
      </section>

      {/* ── How it works (light long-form section) ─────────────────── */}
      <section className="section-light" aria-labelledby="how-heading">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal>
            <SectionHeading
              title={<span id="how-heading">Care in three simple steps</span>}
              align="center"
              className="mx-auto"
              revealEcg
            />
          </Reveal>
          <StepsIgnition
            steps={[
              {
                step: "1",
                icon: "calendar",
                title: "Book in minutes",
                body: "Choose a service, a location or home visit, and a time. We ask only for what the appointment actually needs — nothing more.",
              },
              {
                step: "2",
                icon: "van",
                title: "We come to you",
                body: "A mobile clinic stop near you, a home visit, or a virtual consultation. Same clinicians, same standards, wherever care happens.",
              },
              {
                step: "3",
                icon: "orbit",
                title: "Your record grows",
                body: "Every visit builds your lifelong Aurora Health Record — readable, portable, and shared only with people you explicitly choose.",
              },
            ]}
          />
          <Reveal className="mt-14 text-center">
            <Button href="/book" size="lg">
              Start a booking <Icon name="arrow" className="h-5 w-5" />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ── Privacy trust band ─────────────────────────────────────── */}
      <section className="starfield relative overflow-hidden bg-navy" aria-labelledby="trust-heading">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal>
            <SectionHeading
              title={<span id="trust-heading">Your health story belongs to you</span>}
              lede="Handling health information is a responsibility we designed for from day one — not a policy we added later."
              revealEcg
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "shield" as const,
                title: "Most-private defaults",
                body: "Sharing, marketing, and family access are OFF until you switch them on. Withdrawing consent is one step.",
              },
              {
                icon: "eye" as const,
                title: "A visible access log",
                body: "See exactly who opened your record, when, and why — from your own portal.",
              },
              {
                icon: "download" as const,
                title: "Take your data anywhere",
                body: "Download your full record in a portable, machine-readable format. It's yours.",
              },
              {
                icon: "lock" as const,
                title: "Secured end to end",
                body: "Encryption in transit and at rest, MFA-protected staff access, and independent security testing.",
              },
            ].map((t, i) => (
              <Reveal key={t.title} index={i}>
                <Card className="h-full">
                  <Icon name={t.icon} className="h-7 w-7 text-cyan" />
                  <h3 className="mt-4 text-lg">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-silver">{t.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-sm text-silver">
            Read how we protect you in the{" "}
            <Link href="/privacy-centre" className="text-cyan underline underline-offset-2 hover:text-blue">
              Privacy Centre
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── News highlights ────────────────────────────────────────── */}
      <section className="bg-navy-soft" aria-labelledby="news-heading">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                title={<span id="news-heading">What&rsquo;s happening at Aurora</span>}
                revealEcg
              />
              <Button href="/news" variant="secondary" className="mb-1">
                All news <Icon name="arrow" className="h-4 w-4" />
              </Button>
            </div>
          </Reveal>
          <ul className="mt-12 grid gap-5 lg:grid-cols-3">
            {highlights.map((n, i) => (
              <Reveal as="li" key={n.slug} index={i}>
                <Link href={`/news/${n.slug}`} className="group block h-full rounded-2xl">
                  <Card glow className="h-full">
                    <div className="flex h-full flex-col">
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
                      <h3 className="mt-4 text-lg leading-snug text-starlight group-hover:text-cyan">
                        {n.title}
                      </h3>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-silver">{n.summary}</p>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan">
                        Read more <Icon name="arrow" className="h-4 w-4" />
                      </span>
                    </div>
                  </Card>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Final CTA band ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy">
        <div className="aurora-wash" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <Reveal>
            <EcgDivider className="mx-auto mb-8" reveal />
            <h2 className="text-3xl sm:text-4xl">Ready when you are.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-silver">
              Book a clinic appointment, request a home visit, or explore the programmes coming
              to your community.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Button href="/book" size="lg">
                Book an appointment
              </Button>
              <Button href="/contact" size="lg" variant="secondary">
                Talk to us
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
