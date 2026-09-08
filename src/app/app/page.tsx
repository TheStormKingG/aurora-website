import type { Metadata } from "next";
import { TodayScreen } from "@/components/app/TodayScreen";

export const metadata: Metadata = { title: "Today" };

export default function AppTodayPage() {
  return <TodayScreen />;
}
