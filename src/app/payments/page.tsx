import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/icons";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Online Payments",
  description:
    "Pay for Aurora services securely. Card payments run through a PCI-DSS-compliant hosted gateway — no card data ever touches Aurora systems.",
};

export default function PaymentsPage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Online payments"
          title="Simple, secure bill payment"
          lede="Settle service bills without a trip to the office. Online card payment launches with our PCI-DSS-compliant payment partner."
        />
      </AuroraHero>

      <section className="section-light">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card variant="light">
              <Icon name="lock" className="h-7 w-7 text-link-light" />
              <h2 className="mt-4 text-xl">How your card stays safe</h2>
              <p className="mt-3 text-base leading-relaxed text-muted-surface">
                Payments run entirely inside our payment partner&rsquo;s hosted, PCI-DSS-certified
                checkout. Your card number is entered on their secured fields and{" "}
                <strong>never touches Aurora servers</strong> — we receive only a confirmation
                that your bill was paid.
              </p>
            </Card>
            <Card variant="light">
              <Icon name="document" className="h-7 w-7 text-link-light" />
              <h2 className="mt-4 text-xl">Paying today</h2>
              <p className="mt-3 text-base leading-relaxed text-muted-surface">
                While online checkout is finalised, bills can be settled at any Aurora service
                point or arranged through our team. Your invoice reference is all we need.
              </p>
              <div className="mt-5">
                <Button href={`mailto:${site.contact.email}?subject=${encodeURIComponent("Bill payment")}`} size="sm">
                  Arrange payment
                </Button>
              </div>
            </Card>
          </div>
          <p className="mt-10 text-sm text-muted-surface">
            Questions about an invoice? <a href="/contact">Contact us</a> — include your invoice
            reference, and never send card numbers by email.
          </p>
        </div>
      </section>
    </>
  );
}
