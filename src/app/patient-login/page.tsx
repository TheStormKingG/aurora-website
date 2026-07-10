import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Patient Login",
  description:
    "Sign in to the Aurora Patient Portal: your health record, results, appointments, messages, and data controls.",
};

/**
 * Portal handoff entry (PDR §6.2). Full authentication ships in M5
 * (docs/PLAN.md): email verification + optional TOTP MFA, then an
 * authenticated redirect with a short-lived token into the portal app.
 * Patient and staff routes stay fully separated.
 */
export default function PatientLoginPage() {
  return (
    <AuroraHero className="min-h-[70vh]">
      <div className="mx-auto max-w-md">
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan/30 bg-navy text-cyan">
              <Icon name="lock" className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl">Patient Portal</h1>
              <p className="text-sm text-silver">Secure sign-in</p>
            </div>
          </div>

          <p className="mt-5 text-base leading-relaxed text-silver">
            Your record, laboratory results, medications, appointments, secure messages — and
            the controls to share, export, or correct your data.
          </p>

          <div className="mt-6 rounded-xl border border-cyan/30 bg-cyan/5 p-4">
            <p className="text-sm leading-relaxed text-silver">
              <span className="font-semibold text-cyan">Portal accounts open with patient
              registration.</span>{" "}
              Registration begins at your first Aurora visit or booking — sign-in activates
              here as accounts are issued.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button href="/book" className="w-full">
              <Icon name="calendar" className="h-5 w-5" />
              Book a first appointment
            </Button>
            <Button href="/services/digital-health-platform" variant="secondary" className="w-full">
              What the portal offers
            </Button>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-silver/80">
            Sign-in is protected with verified email and optional two-factor authentication.
            Staff and clinicians use the separate{" "}
            <a href="/staff-login" className="text-cyan underline underline-offset-2">
              staff login
            </a>
            .
          </p>
        </Card>
      </div>
    </AuroraHero>
  );
}
