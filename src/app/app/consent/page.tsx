import type { Metadata } from "next";
import { ConsentScreen } from "@/components/app/ConsentScreen";

export const metadata: Metadata = { title: "Before you start" };

export default function ConsentPage() {
  return <ConsentScreen />;
}
