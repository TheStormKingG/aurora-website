import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { AuroraLogo, AuroraMark } from "@/components/AuroraLogo";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EcgDivider } from "@/components/EcgDivider";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon, type IconName } from "@/components/icons";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/forms/fields";

export const metadata: Metadata = {
  title: "Design system review",
  robots: { index: false, follow: false },
};

const iconNames: IconName[] = [
  "van", "pulse", "heart", "sprout", "building", "sun", "blocks", "orbit",
  "calendar", "shield", "lock", "arrow", "check", "search", "mail", "phone",
  "users", "document", "globe", "eye", "download", "home",
];

/**
 * M1 review page — every primitive on both surfaces, for the
 * "eyeball against the logo" gate in docs/PLAN.md. Not linked from
 * navigation; noindex.
 */
export default function ComponentsPage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Design system"
          title="Component review"
          lede="Every M1 primitive on dark and light surfaces. Check contrast, focus rings (Tab through), and brand rules: cyan is the only interactive colour; violet/magenta appear in decoration only."
        />
      </AuroraHero>

      <section className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6">
        <div>
          <h2 className="eyebrow mb-6">Logo lockups</h2>
          <div className="flex flex-wrap items-end gap-10">
            <AuroraLogo className="h-24 w-auto" tagline />
            <AuroraLogo className="h-16 w-auto" />
            <AuroraMark className="h-16 w-16" />
          </div>
        </div>

        <div>
          <h2 className="eyebrow mb-6">Buttons</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Button href="#">Primary CTA</Button>
            <Button href="#" variant="secondary">
              Secondary
            </Button>
            <Button href="#" variant="quiet">
              Quiet link <Icon name="arrow" className="h-4 w-4" />
            </Button>
            <Button href="#" size="lg">
              Large
            </Button>
            <Button href="#" size="sm">
              Small
            </Button>
            <Button type="button" disabled>
              Disabled
            </Button>
          </div>
        </div>

        <div>
          <h2 className="eyebrow mb-6">Dividers &amp; motifs</h2>
          <div className="flex flex-col gap-6">
            <EcgDivider />
            <EcgDivider className="w-full max-w-xl" />
          </div>
        </div>

        <div>
          <h2 className="eyebrow mb-6">Icons (thin-line, cyan glow accents)</h2>
          <div className="flex flex-wrap gap-5">
            {iconNames.map((n) => (
              <span
                key={n}
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-line-dark bg-indigo text-cyan"
                title={n}
              >
                <Icon name={n} className="h-6 w-6" />
              </span>
            ))}
          </div>
        </div>

        <div>
          <h2 className="eyebrow mb-6">Cards — dark surface</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card glow>
              <Icon name="pulse" className="h-7 w-7 text-cyan" />
              <h3 className="mt-4 text-xl">Hover glow card</h3>
              <p className="mt-2 text-sm text-silver">
                Midnight Indigo panel with the cyan hover treatment.
              </p>
            </Card>
            <Card>
              <h3 className="text-xl">Static card</h3>
              <p className="mt-2 text-sm text-silver">
                Chrome Silver secondary text on Midnight Indigo passes AA.
              </p>
            </Card>
            <Card>
              <p className="eyebrow">Eyebrow</p>
              <h3 className="mt-2 text-xl">With letterspaced caps</h3>
              <EcgDivider className="mt-4" />
            </Card>
          </div>
        </div>

        <div>
          <h2 className="eyebrow mb-6">Form primitives (error + optional states)</h2>
          <Card className="max-w-xl">
            <form className="flex flex-col gap-5">
              <TextField id="demo-name" label="Full name" autoComplete="name" />
              <TextField
                id="demo-email"
                label="Email"
                type="email"
                error="Enter an email address that includes an @."
                defaultValue="not-an-email"
              />
              <SelectField id="demo-select" label="Service" hint="Only bookable services appear here.">
                <option value="">Choose a service…</option>
                <option>Mobile Healthcare</option>
              </SelectField>
              <TextAreaField
                id="demo-notes"
                label="Anything we should know?"
                optional
                hint="Optional fields are always badged (PDR §8.1)."
              />
              <CheckboxField
                id="demo-consent"
                label="I consent to Aurora using these details to arrange my appointment (care delivery purpose only)."
              />
              <div>
                <Button type="button">Submit</Button>
              </div>
            </form>
          </Card>
        </div>
      </section>

      {/* Light surface — long-form sections invert (PDR §4.2) */}
      <section className="section-light">
        <div className="mx-auto max-w-7xl space-y-10 px-4 py-14 sm:px-6">
          <SectionHeading
            eyebrow="Light surface"
            title="Inverted long-form section"
            lede="Navy text on Starlight White. Links use the darkened cyan #0E8FAE — raw Aurora Cyan fails contrast on light."
          />
          <p className="max-w-2xl">
            Body copy at 16px/1.6 for health-literacy readability. Here is{" "}
            <a href="#">what a link looks like on light</a> — and a cyan CTA keeps its own
            navy-on-cyan contrast on any surface:
          </p>
          <div className="flex flex-wrap gap-4">
            <Button href="#">Primary on light</Button>
            <Card variant="light" className="max-w-sm">
              <h3 className="text-lg">Light card</h3>
              <p className="mt-2 text-sm text-muted-surface">
                Muted ink secondary text, hairline navy border.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
