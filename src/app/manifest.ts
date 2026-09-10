import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Required under `output: "export"`. A manifest route is dynamic by
 * default, and a dynamic route cannot be statically exported — without
 * this the build fails outright with "export const dynamic =
 * \"force-static\" ... not configured on route /manifest.webmanifest".
 */
export const dynamic = "force-static";

/** Prerendered to /manifest.webmanifest. Paths carry the base path
 *  explicitly: Next does not rewrite strings inside this object. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aurora Health",
    short_name: "Aurora",
    description: "Track your blood pressure, blood sugar, cholesterol, water and exercise with H.M. Aurora.",
    start_url: `${base}/app/`,
    scope: `${base}/app/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#060B22",
    theme_color: "#060B22",
    icons: [
      { src: `${base}/app-icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/app-icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/app-icons/maskable-192.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: `${base}/app-icons/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
