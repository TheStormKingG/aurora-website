import type { Metadata } from "next";
import { TrendsScreen } from "@/components/app/TrendsScreen";

export const metadata: Metadata = { title: { absolute: "Trends | Aurora Health" } };

export default function TrendsPage() {
  return <TrendsScreen />;
}
