"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Icon } from "@/components/icons";
import { getSupabase } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth/session";

type Profile = { full_name: string | null; dob: string | null; phone: string | null; marketing_opt_in: boolean };
type Booking = { reference: string; service: string; appointment_date: string; time_window: string; status: string };

export function PatientDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [savedMsg, setSavedMsg] = useState<string>();

  useEffect(() => {
    const supabase = getSupabase();
    supabase.from("profiles").select("full_name, dob, phone, marketing_opt_in").single()
      .then(({ data }) => setProfile(data as Profile));
    supabase.from("aurora_bookings")
      .select("reference, service, appointment_date, time_window, status")
      .order("created_at", { ascending: false })
      .then(({ data }) => setBookings((data as Booking[]) ?? []));
  }, []);

  async function saveMarketing(next: boolean) {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("profiles").update({ marketing_opt_in: next }).eq("id", userData.user.id);
    setProfile((p) => (p ? { ...p, marketing_opt_in: next } : p));
    setSavedMsg("Saved.");
  }

  async function deleteAccount() {
    if (!window.confirm("Delete your account permanently? Your bookings will be unlinked. This cannot be undone.")) return;
    // Self-service hard delete via an Edge Function is a later hardening step;
    // for v1 we sign out and open a rights-request so Aurora completes erasure.
    await signOut();
    router.replace("/privacy-centre/rights-request/");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Your account</h1>
        <Button variant="secondary" size="sm" onClick={() => signOut().then(() => router.replace("/"))}>
          Sign out
        </Button>
      </div>

      <Card>
        <h2 className="text-xl">Profile</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-silver/70">Name</dt><dd className="text-starlight">{profile?.full_name ?? "—"}</dd></div>
          <div><dt className="text-silver/70">Date of birth</dt><dd className="text-starlight">{profile?.dob ?? "—"}</dd></div>
          <div><dt className="text-silver/70">Phone</dt><dd className="text-starlight">{profile?.phone ?? "—"}</dd></div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-xl">Consents</h2>
        <label className="mt-4 flex items-center justify-between gap-4">
          <span className="text-sm text-silver">Occasional health tips &amp; Aurora updates</span>
          <input type="checkbox" role="switch" aria-label="Marketing updates"
            checked={profile?.marketing_opt_in ?? false}
            onChange={(e) => saveMarketing(e.target.checked)}
            className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full border border-silver/40 bg-navy/60 transition-colors before:absolute before:left-1 before:top-1 before:h-[1.15rem] before:w-[1.15rem] before:rounded-full before:bg-silver before:transition-transform checked:border-cyan checked:bg-cyan/20 checked:before:translate-x-5 checked:before:bg-cyan" />
        </label>
        {savedMsg ? <p role="status" className="mt-2 text-sm text-cyan">{savedMsg}</p> : null}
        <p className="mt-3 text-xs text-silver/70">
          Manage all cookie and site consents in the{" "}
          <a href="/privacy-centre/preferences" className="text-cyan underline underline-offset-2">Privacy Centre</a>.
        </p>
      </Card>

      <Card>
        <h2 className="text-xl">Your bookings</h2>
        {bookings.length === 0 ? (
          <p className="mt-3 text-sm text-silver">
            No bookings linked yet. Bookings you make while signed in appear here.{" "}
            <a href="/book" className="text-cyan underline underline-offset-2">Book an appointment</a>.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line-dark">
            {bookings.map((b) => (
              <li key={b.reference} className="flex items-center justify-between py-3 text-sm">
                <span className="text-starlight">{b.service}</span>
                <span className="text-silver">{b.appointment_date} · {b.time_window}</span>
                <span className="rounded-full border border-cyan/40 px-2 py-0.5 text-xs text-cyan">{b.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-xl">Your data</h2>
        <p className="mt-2 text-sm text-silver">Download or delete your data any time (PDR §9.2).</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button href="/privacy-centre/rights-request" variant="secondary" size="sm">
            <Icon name="download" className="h-4 w-4" /> Request my data
          </Button>
          <button type="button" onClick={deleteAccount}
            className="rounded-full border border-[#ff9db0]/50 px-4 py-2 text-sm font-semibold text-[#ff9db0] hover:border-[#ff9db0]">
            Delete my account
          </button>
        </div>
      </Card>
    </div>
  );
}
