import type { Metadata } from "next";
import { TodayScreen } from "@/components/app/TodayScreen";

// M1: a layout's title.template doesn't apply to a page in its own
// segment (app/layout.tsx's "%s | Aurora Health" only reaches pages in
// *nested* segments, e.g. app/consent/), so a plain string here fell
// through to the root layout's template instead ("Today | H.M. Aurora").
// An absolute title bypasses template resolution entirely.
export const metadata: Metadata = { title: { absolute: "Today | Aurora Health" } };

export default function AppTodayPage() {
  return <TodayScreen />;
}
