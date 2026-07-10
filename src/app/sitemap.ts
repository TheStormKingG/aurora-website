import type { MetadataRoute } from "next";

export const dynamic = "force-static";

import { news } from "@/content/news";
import { resources } from "@/content/resources";
import { services } from "@/content/services";

const BASE = "https://hmaurora.health";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/about",
    "/services",
    "/book",
    "/book/home-visit",
    "/patient-login",
    "/telemedicine",
    "/resources",
    "/news",
    "/careers",
    "/donations",
    "/payments",
    "/contact",
    "/privacy-centre",
    "/privacy-centre/notice",
    "/privacy-centre/cookies",
    "/privacy-centre/preferences",
    "/privacy-centre/rights-request",
  ];

  return [
    ...staticPaths.map((p) => ({ url: `${BASE}${p}`, changeFrequency: "weekly" as const })),
    ...services.map((s) => ({
      url: `${BASE}/services/${s.slug}`,
      changeFrequency: "monthly" as const,
    })),
    ...resources.map((r) => ({
      url: `${BASE}/resources/${r.slug}`,
      lastModified: r.updated,
      changeFrequency: "monthly" as const,
    })),
    ...news.map((n) => ({
      url: `${BASE}/news/${n.slug}`,
      lastModified: n.date,
      changeFrequency: "yearly" as const,
    })),
  ];
}
