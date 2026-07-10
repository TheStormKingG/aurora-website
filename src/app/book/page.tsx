import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { BookingWizard } from "./BookingWizard";

export const metadata: Metadata = {
  title: "Book Appointment",
  description:
    "Book an Aurora appointment in four short steps: choose a service, a location, a time — and we confirm with you directly.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;

  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Book appointment"
          title="Four short steps to booked"
          lede="Choose a service, where and when suits you, and how to reach you. We ask only what the appointment needs — nothing more."
        />
      </AuroraHero>

      <section className="bg-navy">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <BookingWizard initialService={service} />
          </Card>

          <aside className="flex flex-col gap-6" aria-label="Booking help">
            <Card>
              <Icon name="home" className="h-6 w-6 text-cyan" />
              <h2 className="mt-3 text-lg">Can&rsquo;t travel?</h2>
              <p className="mt-2 text-sm leading-relaxed text-silver">
                Our mobile teams make private home visits for patients who can&rsquo;t reach a
                clinic stop.
              </p>
              <div className="mt-4">
                <Button href="/book/home-visit" size="sm" variant="secondary">
                  Request a home visit <Icon name="arrow" className="h-4 w-4" />
                </Button>
              </div>
            </Card>
            <Card>
              <Icon name="shield" className="h-6 w-6 text-cyan" />
              <h2 className="mt-3 text-lg">What we ask, and why</h2>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-silver">
                <li className="flex gap-2.5">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                  Name + date of birth: to match your patient record safely.
                </li>
                <li className="flex gap-2.5">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                  Phone (email optional): to confirm your slot.
                </li>
                <li className="flex gap-2.5">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                  No medical history — booking never requires it.
                </li>
              </ul>
              <p className="mt-4 text-xs text-silver/80">
                Details are used for this booking alone. Reminders and any sharing stay off
                unless you opt in —{" "}
                <a href="/privacy-centre/notice" className="text-cyan underline underline-offset-2">
                  privacy notice
                </a>
                .
              </p>
            </Card>
            <Card>
              <Icon name="pulse" className="h-6 w-6 text-cyan" />
              <h2 className="mt-3 text-lg">Urgent symptoms?</h2>
              <p className="mt-2 text-sm leading-relaxed text-silver">
                This form is not for emergencies. Chest pain, breathing difficulty, or severe
                bleeding need your nearest hospital emergency department, now.
              </p>
            </Card>
          </aside>
        </div>
      </section>
    </>
  );
}
