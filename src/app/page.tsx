import Link from "next/link";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EcgDivider } from "@/components/EcgDivider";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { news } from "@/content/news";
import { services } from "@/content/services";
import { site } from "@/content/site";

const phaseBadge: Record<number, string> = {
  1: "border-cyan/50 text-cyan",
  2: "border-silver/40 text-silver",
  3: "border-silver/40 text-silver",
  4: "border-silver/40 text-silver",
};

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
            Mobile clinics on your street. Home visits when you can&rsquo;t travel. Maternal
            and child programmes that grow with your family. One secure record from pregnancy
            through ageing — controlled by you.
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

          {/* Trust indicators */}
          <dl
            className="reveal mt-14 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-5 border-t border-line-dark pt-8 sm:grid-cols-3"
            style={{ "--reveal-i": 4 } as React.CSSProperties}
          >
            <div>
              <dt className="flex items-center gap-2 text-sm font-semibold text-starlight">
                <Icon name="shield" className="h-4 w-4 text-cyan" />
                Private by design
              </dt>
              <dd className="mt-1 text-sm text-silver">
                GDPR-benchmark privacy. No trackers, no data sold.
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm font-semibold text-starlight">
                <Icon name="orbit" className="h-4 w-4 text-cyan" />
                One lifelong record
              </dt>
              <dd className="mt-1 text-sm text-silver">
                Your history follows you — clinic, road, or home.
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm font-semibold text-starlight">
                <Icon name="eye" className="h-4 w-4 text-cyan" />
                You see everything
              </dt>
              <dd className="mt-1 text-sm text-silver">
                Every access to your record is logged — visibly.
              </dd>
            </div>
          </dl>
        </div>
      </AuroraHero>

      {/* ── Services overview (8 pillars) ──────────────────────────── */}
      <section className="bg-navy-soft" aria-labelledby="services-heading">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Our services"
              title={<span id="services-heading">Eight pillars of care, one connected system</span>}
              lede="From mobile clinics rolling today to the wellness centres of tomorrow — every service writes to the same lifelong record."
            />
            <Button href="/services" variant="secondary" className="mb-1">
              All services <Icon name="arrow" className="h-4 w-4" />
            </Button>
          </div>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="group block h-full rounded-2xl">
                  <Card glow className="h-full">
                    <div className="flex h-full flex-col">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-cyan/30 bg-navy text-cyan shadow-[0_0_18px_rgba(43,217,245,0.15)]">
                        <Icon name={s.icon} className="h-6 w-6" />
                      </span>
                      <h3 className="mt-5 text-lg leading-snug text-starlight group-hover:text-cyan">
                        {s.navLabel}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-silver">
                        {s.tagline}
                      </p>
                      <span
                        className={`mt-5 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider ${phaseBadge[s.phase]}`}
                      >
                        {s.phase === 1 ? "Available now" : `Phase ${s.phase}`}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── How it works (light long-form section) ─────────────────── */}
      <section className="section-light" aria-labelledby="how-heading">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <SectionHeading
            eyebrow="How Aurora works"
            title={<span id="how-heading">Care in three simple steps</span>}
            align="center"
            className="mx-auto"
          />
          <ol className="mx-auto mt-14 grid max-w-5xl gap-10 sm:grid-cols-3">
            {[
              {
                step: "1",
                icon: "calendar" as const,
                title: "Book in minutes",
                body: "Choose a service, a location or home visit, and a time. We ask only for what the appointment actually needs — nothing more.",
              },
              {
                step: "2",
                icon: "van" as const,
                title: "We come to you",
                body: "A mobile clinic stop near you, a home visit, or a virtual consultation. Same clinicians, same standards, wherever care happens.",
              },
              {
                step: "3",
                icon: "orbit" as const,
                title: "Your record grows",
                body: "Every visit builds your lifelong Aurora Health Record — readable, portable, and shared only with people you explicitly choose.",
              },
            ].map((item) => (
              <li key={item.step} className="relative text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy text-cyan shadow-[0_10px_25px_-10px_rgba(6,11,34,0.5)]">
                  <Icon name={item.icon} className="h-6 w-6" />
                </span>
                <span className="eyebrow mt-5 block !text-xs">Step {item.step}</span>
                <h3 className="mt-2 text-xl">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-muted-surface">{item.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14 text-center">
            <Button href="/book" size="lg">
              Start a booking <Icon name="arrow" className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Privacy trust band ─────────────────────────────────────── */}
      <section className="starfield relative overflow-hidden bg-navy" aria-labelledby="trust-heading">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <SectionHeading
            eyebrow="Why families trust Aurora"
            title={<span id="trust-heading">Your health story belongs to you</span>}
            lede="Handling health information is a responsibility we designed for from day one — not a policy we added later."
          />
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
            ].map((t) => (
              <Card key={t.title}>
                <Icon name={t.icon} className="h-7 w-7 text-cyan" />
                <h3 className="mt-4 text-lg">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-silver">{t.body}</p>
              </Card>
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
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="News & programmes"
              title={<span id="news-heading">What&rsquo;s happening at Aurora</span>}
            />
            <Button href="/news" variant="secondary" className="mb-1">
              All news <Icon name="arrow" className="h-4 w-4" />
            </Button>
          </div>
          <ul className="mt-12 grid gap-5 lg:grid-cols-3">
            {highlights.map((n) => (
              <li key={n.slug}>
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
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Final CTA band ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy">
        <div className="aurora-wash" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <EcgDivider className="mx-auto mb-8" />
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
        </div>
      </section>
    </>
  );
}
