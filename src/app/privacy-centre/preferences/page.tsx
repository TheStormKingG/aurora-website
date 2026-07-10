import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { SectionHeading } from "@/components/SectionHeading";
import { PreferencesDashboard } from "./PreferencesDashboard";

export const metadata: Metadata = {
  title: "Consent Preferences",
  description:
    "See and change every consent you've given on this site — granular per purpose, withdrawable in one step.",
};

export default function PreferencesPage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Consent preferences"
          title="Change your mind any time"
          lede="Every purpose is separate, everything non-essential starts off, and withdrawing is one step. Changes apply the moment you save."
        />
      </AuroraHero>
      <section className="bg-navy">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <PreferencesDashboard />
        </div>
      </section>
    </>
  );
}
