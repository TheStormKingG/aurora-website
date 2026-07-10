import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Card } from "@/components/Card";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Staff Login",
  description: "Authorised access to Aurora EHR and operational systems. MFA required.",
  robots: { index: false, follow: false },
};

/**
 * Separate staff authentication route (PDR §5/§10.1): fully separated
 * from the patient path; MFA mandatory when M5 auth ships.
 */
export default function StaffLoginPage() {
  return (
    <AuroraHero className="min-h-[70vh]">
      <div className="mx-auto max-w-md">
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-silver/30 bg-navy text-silver">
              <Icon name="shield" className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl">Staff &amp; Clinician Access</h1>
              <p className="text-sm text-silver">Aurora EHR and operational systems</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-silver/25 bg-navy/50 p-4">
            <p className="text-sm leading-relaxed text-silver">
              Access is provisioned by the Aurora systems administrator with mandatory
              multi-factor authentication. If you are expecting access and cannot sign in,
              contact your team lead through internal channels.
            </p>
          </div>

          <ul className="mt-6 space-y-2.5 text-sm text-silver">
            <li className="flex items-start gap-2.5">
              <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
              MFA is required on every staff account — no exceptions.
            </li>
            <li className="flex items-start gap-2.5">
              <Icon name="eye" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
              All access to patient records is logged and reviewed.
            </li>
            <li className="flex items-start gap-2.5">
              <Icon name="users" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
              Patients sign in through the separate{" "}
              <a href="/patient-login" className="text-cyan underline underline-offset-2">
                Patient Portal
              </a>
              .
            </li>
          </ul>
        </Card>
      </div>
    </AuroraHero>
  );
}
