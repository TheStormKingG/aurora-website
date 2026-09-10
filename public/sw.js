/*
 * Aurora Health service worker — app shell only.
 *
 * The one rule that matters: NOTHING from the Supabase origin is ever
 * cached (spec §4). Clinical data must not survive in a browser cache
 * after sign-out, so every API request goes straight to the network and
 * its response is never stored. Only same-origin static assets and shell
 * HTML are cached.
 */
const VERSION = "aurora-v1";
const SHELL = `${VERSION}-shell`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Anything not on our own origin — Supabase above all — is passed
  // through untouched and never cached.
  if (url.origin !== self.location.origin) return;

  const isStatic = url.pathname.includes("/_next/static/") ||
    /\.(?:png|jpg|jpeg|svg|webp|woff2?|ico)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(request, copy)); }
          return res;
        }),
      ),
    );
    return;
  }

  // Shell HTML: network first so an update is picked up, cache as the
  // offline fallback. The app then shows its own offline banner.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(request, copy)); }
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit ?? caches.match(`${self.registration.scope}`))),
    );
  }
});
