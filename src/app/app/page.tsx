import type { Metadata } from "next";

export const metadata: Metadata = { title: "Today" };

export default function AppTodayPage() {
  return <h1 className="text-2xl">Today</h1>;
}
