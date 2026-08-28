import type { Metadata } from "next";
import Image from "next/image";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { asset } from "@/lib/asset";
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
          lede="An emerging Caribbean health company with one idea at its core: care should reach people, and a patient's health story should last a lifetime."
        />
      </AuroraHero>

      {/* Mission & philosophy — light long-form */}
      <section className="section-light">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our mission" title="Illuminating the future of care" />
            <div className="prose-light mt-6 space-y-4 text-base leading-relaxed">
              <p>
                Most people meet the health system only once something is already wrong. Aurora
                changes the direction of travel: <strong>care goes to people</strong>, early and
                often, so problems are caught while they&rsquo;re still small.
              </p>
              <p>
                And every visit writes to one secure record — readable, portable, and controlled
                by the patient, from pregnancy through ageing.
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
          <SectionHeading eyebrow="Leadership" title="Founded and led by Hannah Munro" />

          <div className="mt-12 grid gap-10 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-14">
            {/* Founder portrait */}
            <figure className="mx-auto w-full max-w-[20rem]">
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -inset-3 rounded-3xl opacity-70 blur-2xl"
                  style={{ background: "var(--gradient-aurora-soft)" }}
                />
                <Image
                  src={asset("/brand/hannah-munro.jpg")}
                  alt="Hannah Munro, Founder & CEO of H.M. Aurora Health Systems, in an Aurora coat with a stethoscope"
                  width={500}
                  height={878}
                  className="relative w-full rounded-2xl border border-line-dark object-cover shadow-[0_24px_50px_-22px_rgba(2,5,18,0.7)]"
                />
              </div>
              <figcaption className="mt-4 text-center">
                <p className="text-sm text-silver">
                  <span className="font-heading font-semibold text-starlight">{site.founder}</span>
                  <span className="mx-2 text-silver/50">·</span>
                  {site.founderRole}
                </p>
                <p className="mt-1 text-xs text-silver/70">
                  Medicine, Greenheart Medical University · Cofounder &amp; VP, CYCLE
                </p>
              </figcaption>
            </figure>

            {/* Bio + pull quote */}
            <div>
              <p className="eyebrow !text-xs">Founder &amp; CEO</p>
              <p className="mt-4 text-lg leading-relaxed text-silver">
                Hannah Munro is the founder of H.M. Aurora Health Systems, based in Georgetown,
                Guyana. Her medical training at Greenheart Medical University and her work as
                cofounder and vice president of the Caribbean Youth Conservation Leaders Ensemble
                (CYCLE) share one thread: healthy people and healthy communities are built
                together, close to home.
              </p>
              <p className="mt-4 text-base leading-relaxed text-silver">
                Aurora grew from a simple observation — the people who most need consistent care
                are the ones asked to travel furthest for it. Her answer is a phased health
                company that starts on the road and builds toward a connected ecosystem of
                clinics, programmes, and lifelong digital records.
              </p>
              <blockquote className="mt-6 border-l-2 border-cyan pl-5 text-xl font-heading font-semibold leading-snug text-starlight">
                &ldquo;Patient trust is infrastructure — earned through privacy, transparency,
                and care that shows up.&rdquo;
              </blockquote>
            </div>
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
        </div>
      </section>
    </>
  );
}
