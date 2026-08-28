import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { RequireAuth } from "@/components/RequireAuth";
import { CompleteProfileForm } from "./CompleteProfileForm";

export const metadata: Metadata = { title: "Complete your profile", robots: { index: false } };

export default function CompleteProfilePage() {
  return (
    <AuroraHero className="min-h-[70vh]">
      <div className="mx-auto max-w-md">
        <SectionHeading as="h1" eyebrow="One quick step" title="Complete your profile"
          lede="Add your date of birth so we can match your care records safely." />
        <Card className="mt-8">
          <RequireAuth><CompleteProfileForm /></RequireAuth>
        </Card>
      </div>
    </AuroraHero>
  );
}
