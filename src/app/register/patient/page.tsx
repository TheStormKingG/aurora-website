import type { Metadata } from "next";
import Link from "next/link";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { PatientRegisterForm } from "./PatientRegisterForm";

export const metadata: Metadata = {
  title: "Create a Patient Account",
  description: "Register for an Aurora patient account to manage your bookings, consents, and profile.",
};

export default function PatientRegisterPage() {
  return (
    <AuroraHero className="min-h-[80vh]">
      <div className="mx-auto max-w-xl">
        <SectionHeading as="h1" eyebrow="Patient account"
          title="Create your account"
          lede="We ask only what your account needs — nothing clinical. You control it, and can delete it any time." />
        <Card className="mt-8"><PatientRegisterForm /></Card>
        <p className="mt-6 text-center text-sm text-silver">
          Already registered?{" "}
          <Link href="/patient-login" className="text-cyan underline underline-offset-2 hover:text-blue">Sign in</Link>
        </p>
      </div>
    </AuroraHero>
  );
}
