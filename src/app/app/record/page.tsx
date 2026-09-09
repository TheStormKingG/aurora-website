import type { Metadata } from "next";

export const metadata: Metadata = { title: "Health record" };

export default function RecordPage() {
  return (
    <div>
      <h1 className="text-2xl">Health record</h1>
      <p className="mt-2 text-silver">Your conditions, medications and allergies arrive in the next update.</p>
    </div>
  );
}
