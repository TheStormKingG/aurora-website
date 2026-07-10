import type { NextConfig } from "next";

/**
 * Static export for GitHub Pages (docs/PLAN.md build notes 2026-07-10).
 * - NEXT_PUBLIC_BASE_PATH: set to "/aurora-website" by the Pages
 *   workflow (project-pages URL); unset locally and on custom domains.
 * - Server routes/middleware are excluded from this deployment mode;
 *   form submissions go client-side to RLS-guarded Supabase tables
 *   (src/lib/submit.ts). Restore the server path on a Node host.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
