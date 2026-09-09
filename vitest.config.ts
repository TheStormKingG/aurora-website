import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Pin the zone so date-formatting assertions (e.g. relativeTime's
    // fallback in format.ts) don't depend on the host's TZ (GYT, UTC-4).
    env: { TZ: "America/Guyana" },
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  css: { postcss: { plugins: [] } },
});
