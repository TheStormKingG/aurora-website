import { readFileSync } from "node:fs";

/** Populate process.env from .env.local when running locally. */
export function loadEnvLocal(): void {
  if (process.env.SUPABASE_SERVICE_KEY) return;
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // no env file — the spec skips itself
  }
}
