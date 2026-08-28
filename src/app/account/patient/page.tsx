import type { Metadata } from "next";
import { RequireAuth } from "@/components/RequireAuth";
import { PatientDashboard } from "./PatientDashboard";

export const metadata: Metadata = { title: "Your Account", robots: { index: false } };

export default function PatientAccountPage() {
  return (
    <section className="bg-navy">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <RequireAuth><PatientDashboard /></RequireAuth>
      </div>
    </section>
  );
}
