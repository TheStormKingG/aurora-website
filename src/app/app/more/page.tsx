import type { Metadata } from "next";
import { MoreScreen } from "@/components/app/MoreScreen";

export const metadata: Metadata = { title: { absolute: "More | Aurora Health" } };

export default function MorePage() {
  return <MoreScreen />;
}
