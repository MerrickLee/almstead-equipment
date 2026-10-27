/* Almstead Repair Orders — service worker
 *
 * Strategy
 *  - App shell pages (/app, /app/orders/new, /login, /offline): network first,
 *    fall back to the last cached copy, then to /offline.
 *  - Next.js static assets (/_next/static/*): cache first (content-hashed, immutable).
 *  - Icons, logo, manifest: stale-while-revalidate.
 *  - GET /api/trucks and /api/orders: network first with cache fallback so the
 *    truck picker and "my orders" still show with no signal.
 *  - Everything else (POST, PDF, photos): network only. Offline submissions are
 *    queued by the page in IndexedDB (src/lib/offline.ts), not here.
 */
const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const DATA_CACHE = `data-${VERSION}`;

const PRECACHE = ["/offline", "/login", "/manifest.webmanifest", "/logo.png", "/icons/icon-192.png", "/icons/icon-512.png"];
const WARM_PAGES = ["/app", "/app/orders/new", "/app/orders"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(`-${VERSION}`)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "WARM") {
    event.waitUntil(warmShell(event.data.urls || WARM_PAGES));
  }
});

async function warmShell(urls) {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.allSettled(
    urls.map(async (u) => {
      const res = await fetch(u, { credentials: "same-origin" });
      if (cacheable(res)) await cache.put(u, res.clone());
    }),
  );
}

function cacheable(res) {
  return res && res.ok && !res.redirected && (res.type === "basic" || res.type === "default");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Static, content-hashed assets: cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Small data the phone needs offline: network first, cache fallback.
  if (url.pathname === "/api/trucks" || url.pathname === "/api/orders") {
    event.respondWith(networkFirst(req, DATA_CACHE));
    return;
  }

  // Other API, PDFs, files: network only.
  if (url.pathname.startsWith("/api/")) return;

  // Icons, logo, manifest: stale-while-revalidate.
  if (url.pathname.startsWith("/icons/") || url.pathname === "/logo.png" || url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
    return;
  }

  // Page navigations: network first, cached page, then the offline page.
  if (req.mode === "navigate") {
    event.respondWith(pageNetworkFirst(req));
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (cacheable(res)) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (cacheable(res)) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req);
    if (hit) return hit;
    return new Response(JSON.stringify({ error: "offline" }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const refresh = fetch(req)
    .then((res) => {
      if (cacheable(res)) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || refresh;
}

async function pageNetworkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  const url = new URL(req.url);
  const key = url.pathname; // ignore query strings so /app?source=pwa hits /app
  try {
    const res = await fetch(req);
    if (cacheable(res)) cache.put(key, res.clone());
    return res;
  } catch {
    const hit = await cache.match(key);
    if (hit) return hit;
    // Order detail pages are dynamic; fall back to the orders list, then the offline page.
    if (key.startsWith("/app/orders/")) {
      const list = await cache.match("/app/orders");
      if (list) return list;
    }
    const offline = await cache.match("/offline");
    return offline || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}
