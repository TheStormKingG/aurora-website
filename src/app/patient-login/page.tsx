import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { Icon } from "@/components/icons";
import { PatientLoginForm } from "./PatientLoginForm";

export const metadata: Metadata = {
  title: "Patient Login",
  description: "Sign in to the Aurora Patient Portal: your profile, consents, and bookings.",
};

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
              <p className="text-sm text-silver">Sign in to your account</p>
            </div>
          </div>
          <div className="mt-6"><PatientLoginForm /></div>
          <p className="mt-6 text-xs leading-relaxed text-silver/80">
            Sign-in is protected with a verified email. Staff use the separate{" "}
            <a href="/staff-login" className="text-cyan underline underline-offset-2">staff login</a>.
          </p>
        </Card>
      </div>
    </AuroraHero>
  );
}
