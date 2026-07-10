import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { HomeVisitForm } from "./HomeVisitForm";

export const metadata: Metadata = {
  title: "Request a Home Visit",
  description:
    "Aurora's mobile clinic teams make private home visits for patients who cannot travel — request one in a single short form.",
};

export default function HomeVisitPage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Home visits"
          title="The clinic comes to your door"
          lede="For patients who can't travel — new mothers, older adults, anyone recovering — our mobile team visits privately at home."
        />
      </AuroraHero>

      <section className="bg-navy">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <h2 className="text-2xl">Request a visit</h2>
            <p className="mt-2 text-sm text-silver">
              One short form — we call back to confirm everything before anyone travels.
            </p>
            <div className="mt-6">
              <HomeVisitForm />
            </div>
          </Card>

          <aside className="flex flex-col gap-6" aria-label="Home visit information">
            <Card>
              <Icon name="van" className="h-6 w-6 text-cyan" />
              <h2 className="mt-3 text-lg">What a home visit covers</h2>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-silver">
                {[
                  "Nurse-led check-ups and follow-up care",
                  "Blood pressure and blood sugar checks",
                  "Postnatal visits for mother and baby",
                  "Wound care and dressing changes",
                  "Medication reviews and reminders setup",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <Icon name="shield" className="h-6 w-6 text-cyan" />
              <h2 className="mt-3 text-lg">Your address, respected</h2>
              <p className="mt-2 text-sm leading-relaxed text-silver">
                We ask for your address only because the visit comes to it — the standard
                booking flow never asks. It&rsquo;s used to plan this visit and nothing else.
              </p>
            </Card>
          </aside>
        </div>
      </section>
    </>
  );
}
