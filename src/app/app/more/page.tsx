import type { Metadata } from "next";

export const metadata: Metadata = { title: "More" };

export default function MorePage() {
  return (
    <div>
      <h1 className="text-2xl">More</h1>
      <p className="mt-2 text-silver">Consent, access history, download and settings arrive in the next update.</p>
    </div>
  );
}
