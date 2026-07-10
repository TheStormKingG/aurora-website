import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dev/", "/api/", "/staff-login"],
      },
    ],
    sitemap: "https://hmaurora.health/sitemap.xml",
  };
}
