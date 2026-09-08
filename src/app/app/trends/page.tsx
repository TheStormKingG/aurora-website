import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trends" };

export default function TrendsPage() {
  return (
    <div>
      <h1 className="text-2xl">Trends</h1>
      <p className="mt-2 text-silver">Charts arrive in the next update.</p>
    </div>
  );
}
