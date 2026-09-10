import Image from "next/image";
import Link from "next/link";
import { AuroraHero } from "@/components/AuroraHero";
import { Deck } from "@/components/deck/Deck";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/Button";
import { EcgDivider } from "@/components/EcgDivider";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { ServicesOverview } from "@/components/ServicesOverview";
import { StepsIgnition } from "@/components/StepsIgnition";
import { Icon } from "@/components/icons";
import { site } from "@/content/site";
import { asset } from "@/lib/asset";

export default function HomePage() {
  return (
    <Deck
      labels={[
        "Healthcare that comes to you",
        "Services available now",
        "On the roadmap",
        "Care in three simple steps",
        "Your health story belongs to you",
        "Contact and site links",
      ]}
    >
      {/* ── Hero (PDR §5: hero, booking CTA, trust indicators) ────── */}
      <AuroraHero size="home">
        <div className="grid items-center gap-10 lg:grid-cols-[7fr_5fr] lg:gap-14">
          <div className="max-w-2xl">
          <p className="eyebrow reveal" style={{ "--reveal-i": 0 } as React.CSSProperties}>
            {site.tagline}
          </p>
          <h1
            className="reveal mt-5 text-4xl leading-[1.08] sm:text-5xl lg:text-6xl"
            style={{ "--reveal-i": 1 } as React.CSSProperties}
          >
            Healthcare that <span className="text-chrome">comes to you</span> — and a health
            record that lasts a lifetime.
          </h1>
          <p
            className="reveal mt-6 max-w-xl text-lg leading-relaxed text-silver sm:text-xl"
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

          {/* Pexels licence: free for commercial use, no attribution
              required, but it forbids implying that people in the
              imagery endorse the product. So this is atmosphere, and the
              alt text describes the scene rather than casting anyone as
              an Aurora patient. No `.reveal` here on purpose: this is
              the LCP element and should paint, not fade in. */}
          <Image
            src={asset("/photos/hero-care-at-home.jpg")}
            alt="A woman and an older man sitting together at home, looking at a phone."
            width={1400}
            height={933}
            priority
            /* Portrait crop: the source is 3:2, and a landscape frame
               floated as a 327px thumbnail beside a 700px text column.
               5/6 makes the asset hold its half of the composition. */
            className="aspect-[4/3] w-full rounded-2xl border border-line-dark object-cover object-center shadow-[0_24px_50px_-22px_rgba(2,5,18,0.7)] lg:aspect-[5/6]"
          />
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
              />
              <Button href="/services" variant="secondary" className="mb-1">
                All services <Icon name="arrow" className="h-4 w-4" />
              </Button>
            </div>
          </Reveal>

          <ServicesOverview part="available" />
        </div>
      </section>

      <section className="bg-navy-soft" aria-labelledby="roadmap-heading">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal>
            <SectionHeading
              title={<span id="roadmap-heading">Coming to your community</span>}
              lede="Three more pillars are on the way. Each one extends the same record you start building today."
            />
          </Reveal>
          <ServicesOverview part="roadmap" />
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

      {/* ── Closer: the promise, then the ask ──────────────────────
          Was two sections plus a news band. A privacy-first brand's last
          impression should be the privacy promise, and the buttons carry
          the conversion without a second headline competing for it. The
          four guarantees keep their explanatory text but lose their card
          containers: elevation was not communicating hierarchy here. */}
      <section className="starfield relative overflow-hidden bg-navy" aria-labelledby="closer-heading">
        <div className="aurora-wash" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <Reveal>
            <EcgDivider className="mx-auto mb-8" reveal />
            <h2 id="closer-heading" className="text-3xl sm:text-4xl">
              Your health story belongs to you
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-silver">
              Sharing, marketing and family access stay off until you switch them on. Designed
              that way from day one, not added later.
            </p>
          </Reveal>

          <ul className="mt-12 grid gap-8 text-left sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "shield" as const,
                title: "Most-private defaults",
                body: "Sharing and family access are off until you switch them on. Withdrawing consent is one step.",
              },
              {
                icon: "eye" as const,
                title: "A visible access log",
                body: "See who opened your record, when, and why, from your own portal.",
              },
              {
                icon: "download" as const,
                title: "Yours to take",
                body: "Download the whole record in a portable, machine-readable format.",
              },
              {
                icon: "lock" as const,
                title: "Secured end to end",
                body: "Encrypted in transit and at rest, with independent security testing.",
              },
            ].map((t, i) => (
              <Reveal as="li" key={t.title} index={i}>
                <Icon name={t.icon} className="h-6 w-6 text-cyan" />
                <h3 className="mt-3 text-base font-semibold text-starlight">{t.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-silver">{t.body}</p>
              </Reveal>
            ))}
          </ul>

          <Reveal>
            <div className="mt-14 flex flex-wrap justify-center gap-4">
              <Button href="/book" size="lg">
                Book an appointment
              </Button>
              <Button href="/contact" size="lg" variant="secondary">
                Talk to us
              </Button>
            </div>
            <p className="mt-6 text-sm text-silver">
              Read how we protect you in the{" "}
              <Link
                href="/privacy-centre"
                className="text-cyan underline underline-offset-2 hover:text-blue"
              >
                Privacy Centre
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>
      <Footer />
    </Deck>
  );
}
