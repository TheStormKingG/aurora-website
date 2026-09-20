import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // scripts/ is included so the PR reviewer's merge gate is covered by
    // the same `npm run test:unit` everything else is — a gate nobody runs
    // a test against is indistinguishable from one that always passes.
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
    environment: "node",
    // Pin the zone so date-formatting assertions (e.g. relativeTime's
    // fallback in format.ts) don't depend on the host's TZ (GYT, UTC-4).
    env: { TZ: "America/Guyana" },
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  css: { postcss: { plugins: [] } },
});
