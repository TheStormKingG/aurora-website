import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Telemedicine",
  description:
    "Virtual consultations with Aurora clinicians — how telemedicine works, what it suits, and how to access your appointment.",
};

export default function TelemedicinePage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Telemedicine"
          title="A consultation, wherever you are"
          lede="Talk to an Aurora clinician by phone or video for follow-ups, results reviews, prescriptions renewals, and advice — without the journey."
        />
        <div className="mt-8 flex flex-wrap gap-4">
          <Button href="/book?service=mobile-healthcare" size="lg">
            <Icon name="calendar" className="h-5 w-5" />
            Book a consultation
          </Button>
          <Button href="/patient-login" size="lg" variant="secondary">
            <Icon name="lock" className="h-5 w-5" />
            Join via Patient Portal
          </Button>
        </div>
      </AuroraHero>

      <section className="section-light">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: "check" as const,
                title: "Good for",
                items: [
                  "Follow-up appointments and results reviews",
                  "Repeat prescription discussions",
                  "Health questions and triage advice",
                  "Programme check-ins (NCD, maternal, ageing)",
                ],
              },
              {
                icon: "van" as const,
                title: "Better in person",
                items: [
                  "Anything needing physical examination",
                  "Screening measurements (pressure, sugar, BMI)",
                  "Vaccinations and wound care",
                  "First antenatal visits",
                ],
              },
              {
                icon: "phone" as const,
                title: "How it works",
                items: [
                  "Book a slot and choose 'virtual consultation'",
                  "We confirm by email or SMS with joining details",
                  "Join from the Patient Portal at your time",
                  "Notes are saved to your record with your consent",
                ],
              },
            ].map((col) => (
              <Card key={col.title} variant="light">
                <Icon name={col.icon} className="h-7 w-7 text-link-light" />
                <h2 className="mt-4 text-xl">{col.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-base">
                      <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-link-light" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <Card variant="light" className="mt-10 border-link-light/30">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Icon name="pulse" className="h-8 w-8 shrink-0 text-link-light" />
              <div>
                <h2 className="text-lg">In an emergency</h2>
                <p className="mt-1 text-base text-muted-surface">
                  Telemedicine is not an emergency service. For chest pain, difficulty
                  breathing, severe bleeding, or any life-threatening situation, go to your
                  nearest hospital emergency department immediately.
                </p>
              </div>
            </div>
          </Card>

          <p className="mt-10 max-w-2xl text-sm text-muted-surface">
            Full video-consultation infrastructure expands in Phase Four of the Aurora roadmap;
            today&rsquo;s virtual visits run by telephone and the Patient Portal. Video joining
            links will appear here when the expansion launches.
          </p>
        </div>
      </section>
    </>
  );
}
