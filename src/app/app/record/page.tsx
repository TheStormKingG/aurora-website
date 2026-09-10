import type { Metadata } from "next";
import { RecordScreen } from "@/components/app/RecordScreen";

export const metadata: Metadata = { title: { absolute: "Health record | Aurora Health" } };

export default function RecordPage() {
  return <RecordScreen />;
}