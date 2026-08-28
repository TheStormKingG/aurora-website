import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Reset Password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuroraHero className="min-h-[70vh]">
      <div className="mx-auto max-w-md">
        <SectionHeading as="h1" eyebrow="Account" title="Set a new password" />
        <Card className="mt-8"><ResetPasswordForm /></Card>
      </div>
    </AuroraHero>
  );
}
