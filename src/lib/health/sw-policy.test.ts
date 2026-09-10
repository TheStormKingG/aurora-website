import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The service worker's one non-negotiable rule (spec §4): NOTHING from
 * the Supabase origin is ever cached. Get it wrong and a patient's blood
 * pressure, glucose and medication list sit in a browser cache that
 * outlives sign-out, on a shared or stolen phone.
 *
 * A comment saying so is not a guard. This loads the real public/sw.js
 * into a fake worker scope, fires real fetch events at it, and asserts
 * what it does — so an "optimisation" that starts caching API responses
 * fails here rather than in production.
 */

const SW = readFileSync(
  fileURLToPath(new URL("../../../public/sw.js", import.meta.url)),
  "utf8"
);

const ORIGIN = "https://thestormkingg.github.io";
const SUPABASE = "https://gmvrkzumvwhrkqzqwcnu.supabase.co";

type Handler = (event: FakeEvent) => void;
type FakeEvent = {
  request: { url: string; method: string; mode?: string };
  respondWith: (v: unknown) => void;
  waitUntil: (v: unknown) => void;
};

function loadWorker() {
  const handlers = new Map<string, Handler>();
  const cachePuts: string[] = [];
  const deleted: string[] = [];
  // A GitHub Pages project site shares one origin with every other repo
  // on the account, so the cache list a real activate sees includes
  // caches this app did not create.
  const existingCaches = [
    "aurora-v1-shell",
    "aurora-v0-shell",
    "preqal-v3-assets",
    "workbox-precache-v2-https://thestormkingg.github.io/some-other-repo/",
  ];
  const cache = {
    match: vi.fn(async () => undefined),
    put: vi.fn(async (req: { url: string } | string) => {
      cachePuts.push(typeof req === "string" ? req : req.url);
    }),
  };
  const self = {
    location: { origin: ORIGIN },
    registration: { scope: `${ORIGIN}/app/` },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    addEventListener: (type: string, fn: Handler) => handlers.set(type, fn),
    caches: {
      open: vi.fn(async () => cache),
      keys: vi.fn(async () => existingCaches),
      delete: vi.fn(async (k: string) => {
        deleted.push(k);
        return true;
      }),
      match: vi.fn(async () => undefined),
    },
    fetch: vi.fn(async () => ({ ok: true, clone: () => ({}) })),
  };
  // Evaluated in a vm sandbox rather than with new Function: same effect,
  // but it says plainly that this is loading a first-party file from this
  // repo into an isolated scope. Nothing here is interpolated, and SW is
  // read from public/sw.js on disk.
  runInNewContext(SW, {
    self,
    caches: self.caches,
    fetch: self.fetch,
    URL,
    Promise,
  });
  return { handlers, cachePuts, cache, self, deleted, existingCaches };
}

function fire(handlers: Map<string, Handler>, url: string, mode = "cors", method = "GET") {
  const responded: unknown[] = [];
  const event: FakeEvent = {
    request: { url, method, mode },
    respondWith: (v) => responded.push(v),
    waitUntil: () => undefined,
  };
  handlers.get("fetch")?.(event);
  return responded;
}

describe("service worker caching policy", () => {
  let worker: ReturnType<typeof loadWorker>;
  beforeEach(() => {
    worker = loadWorker();
  });

  it("registers a fetch handler at all", () => {
    expect(worker.handlers.has("fetch")).toBe(true);
  });

  it("never intercepts a Supabase request", () => {
    for (const [path, mode] of [
      ["/rest/v1/readings?select=*", "cors"],
      ["/rest/v1/profile_entries", "cors"],
      ["/auth/v1/token?grant_type=password", "cors"],
      ["/rest/v1/rpc/my_status", "cors"],
      // These two are the cases that actually exercise the origin guard.
      // The REST paths above pass through even WITHOUT it — they match
      // neither the static-asset rule nor the navigate rule, so deleting
      // the guard left every assertion green. A Supabase Storage image
      // does match the static rule (Aurora's profile-avatars spec will
      // produce exactly this shape), and a navigation matches the other.
      // Without the guard, both get cached.
      ["/storage/v1/object/public/avatars/patient-1.png", "cors"],
      ["/storage/v1/object/sign/scans/report.jpg", "no-cors"],
      ["/rest/v1/readings", "navigate"],
    ] as const) {
      const responded = fire(worker.handlers, `${SUPABASE}${path}`, mode);
      expect(responded, `${path} (${mode}) must pass straight through`).toHaveLength(0);
    }
  });

  it("never writes a Supabase response to any cache", async () => {
    fire(worker.handlers, `${SUPABASE}/rest/v1/readings?select=*`);
    await Promise.resolve();
    expect(worker.cachePuts).toEqual([]);
    expect(worker.cache.put).not.toHaveBeenCalled();
  });

  it("ignores non-GET requests, so a reading being saved is never touched", () => {
    const responded = fire(worker.handlers, `${SUPABASE}/rest/v1/readings`, "cors", "POST");
    expect(responded).toHaveLength(0);
  });

  it("does handle same-origin static assets, or it would cache nothing at all", () => {
    // The counterpart assertion: proving it ignores Supabase is only
    // meaningful next to proof that it does not ignore everything.
    const responded = fire(worker.handlers, `${ORIGIN}/_next/static/chunks/main.js`);
    expect(responded).toHaveLength(1);
  });

  it("handles same-origin navigations", () => {
    const responded = fire(worker.handlers, `${ORIGIN}/app/trends/`, "navigate");
    expect(responded).toHaveLength(1);
  });
});

describe("service worker cache housekeeping", () => {
  it("tidies up only its own older caches, never a neighbour's", async () => {
    const worker = loadWorker();
    const waits: unknown[] = [];
    worker.handlers.get("activate")?.({
      request: { url: "", method: "GET" },
      respondWith: () => undefined,
      waitUntil: (v) => waits.push(v),
    });
    await Promise.all(waits);

    // Its own superseded cache goes.
    expect(worker.deleted).toContain("aurora-v0-shell");
    // The current one stays.
    expect(worker.deleted).not.toContain("aurora-v1-shell");
    // And nothing belonging to another project on the shared origin is
    // touched — deleting those was the defect this guards.
    for (const foreign of worker.existingCaches.filter((k) => !k.startsWith("aurora-"))) {
      expect(worker.deleted, `${foreign} must survive`).not.toContain(foreign);
    }
  });
});
