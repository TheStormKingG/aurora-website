import type { Metadata } from "next";
import { AccessLogList } from "@/components/app/AccessLogList";

export const metadata: Metadata = { title: { absolute: "Access history | Aurora Health" } };

export default function AccessPage() {
  return <AccessLogList />;
}
