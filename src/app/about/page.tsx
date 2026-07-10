import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "H.M. Aurora Health Systems is a health innovation company founded by Hannah Munro — building mobile healthcare, community wellness, and a lifelong digital health record for the Caribbean.",
};

const phases = [
  {
    n: 1,
    name: "Mobile Healthcare Services",
    body: "Clinics on wheels bring screening, primary care, and home visits to communities — and every patient starts a lifelong Aurora Health Record.",
    status: "Live now",
  },
  {
    n: 2,
    name: "Community Wellness Centres",
    body: "Fixed centres anchor the network: programmes, group classes, screening days, and home bases for the mobile fleet.",
    status: "In development",
  },
  {
    n: 3,
    name: "Adult Wellness & Active Ageing Centre",
    body: "Dedicated services for older adults — strength and balance, chronic condition support, and consent-based caregiver access.",
    status: "Roadmap",
  },
  {
    n: 4,
    name: "Early Childhood Health & Development Centre",
    body: "A centre designed around young children: development assessment, nutrition clinics, and parent coaching.",
    status: "Roadmap",
  },
];

export default function AboutPage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="About us"
          title="Care that reaches people. A record that lasts a lifetime."
          lede={`${site.name} is an emerging health innovation company operating as an umbrella organisation — developing healthcare solutions through a phased growth model, from mobile clinics to a lifelong digital health platform.`}
        />
      </AuroraHero>

      {/* Mission & philosophy — light long-form */}
      <section className="section-light">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our mission" title="Illuminating the future of care" />
            <div className="prose-light mt-6 space-y-4 text-base leading-relaxed">
              <p>
                Too many people meet the health system only when something is already wrong —
                after the long trip to town, the day of lost wages, the queue. Aurora exists to
                change the direction of travel: <strong>care goes to people</strong>, early and
                often, so problems are found while they are still small.
              </p>
              <p>
                And because health is a lifelong story, not a stack of loose papers, every
                Aurora service writes to one secure record that follows each patient from
                pregnancy through ageing — readable by the patient, controlled by the patient,
                portable for life.
              </p>
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Our philosophy" title="Three commitments" />
            <ul className="mt-6 space-y-5">
              {[
                {
                  icon: "van" as const,
                  title: "Meet people where they live",
                  body: "Mobile-first care delivery, home visits, and community programmes — access is the treatment plan.",
                },
                {
                  icon: "document" as const,
                  title: "Evidence over noise",
                  body: "Plain-language health education that counters misinformation with what the science actually shows.",
                },
                {
                  icon: "shield" as const,
                  title: "Privacy as a feature",
                  body: "GDPR as our design benchmark, most-private defaults, and a record access log every patient can read.",
                },
              ].map((c) => (
                <li key={c.title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-cyan">
                    <Icon name={c.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg">{c.title}</h3>
                    <p className="mt-1 text-base text-muted-surface">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="bg-navy">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="Leadership"
            title="Founded and led by Hannah Munro"
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card>
              <p className="eyebrow !text-xs">Founder &amp; CEO</p>
              <h3 className="mt-3 text-2xl">{site.founder}</h3>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-silver">
                <p>
                  Hannah founded H.M. Aurora Health Systems around a simple observation: the
                  people who most need consistent healthcare are the ones the system asks to
                  travel furthest for it. Aurora is her answer — a phased health company that
                  starts on the road and builds toward a connected ecosystem of centres,
                  programmes, and digital records.
                </p>
                <p>
                  She leads Aurora&rsquo;s strategy, clinical partnerships, and its founding
                  principle that patient trust is infrastructure: earned through privacy,
                  transparency, and care that shows up.
                </p>
              </div>
            </Card>
            <Card>
              <p className="eyebrow !text-xs">Clinical governance</p>
              <h3 className="mt-3 text-xl">Clinical Advisory Board</h3>
              <p className="mt-4 text-base leading-relaxed text-silver">
                Aurora&rsquo;s protocols, screening standards, and education content are
                developed under the review of practising clinicians across primary care,
                obstetrics, paediatrics, and public health. Board appointments are announced
                on the News page as the network grows.
              </p>
              <p className="mt-4 text-sm text-silver/80">
                Interested in serving?{" "}
                <a href="/contact" className="text-cyan underline underline-offset-2 hover:text-blue">
                  Contact the leadership team
                </a>
                .
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Phased vision */}
      <section className="starfield relative bg-navy-soft">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="The phased vision"
            title="Four phases, one ecosystem"
            lede="Each phase adds a layer of care — and every layer connects to the same lifelong record."
          />
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {phases.map((p) => (
              <li key={p.n}>
                <Card className="h-full">
                  <div className="flex h-full flex-col">
                    <span className="font-heading text-4xl font-bold text-cyan">0{p.n}</span>
                    <h3 className="mt-4 text-lg leading-snug">{p.name}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-silver">{p.body}</p>
                    <span
                      className={`mt-5 inline-flex w-fit rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider ${
                        p.n === 1 ? "border-cyan/50 text-cyan" : "border-silver/40 text-silver"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap gap-4">
            <Button href="/services">
              Explore our services <Icon name="arrow" className="h-4 w-4" />
            </Button>
            <Button href="/careers" variant="secondary">
              Join the team
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
