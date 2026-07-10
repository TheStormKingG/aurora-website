import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { SectionHeading } from "@/components/SectionHeading";
import { resources } from "@/content/resources";
import { ResourceLibrary } from "./ResourceLibrary";

export const metadata: Metadata = {
  title: "Health Resources",
  description:
    "Evidence-based health education in plain language: chronic disease prevention, maternal and child health, healthy ageing, and fact-checks that counter medical misinformation.",
};

export default function ResourcesPage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Health resources"
          title="Evidence you can act on"
          lede="Plain-language guides written and reviewed by clinicians — including straight answers to the health misinformation circulating in our communities."
        />
      </AuroraHero>
      <section className="bg-navy">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <ResourceLibrary items={resources} />
        </div>
      </section>
    </>
  );
}
