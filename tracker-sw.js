const CACHE_NAME = "hypermonitor-tracker-v1";
const PRECACHE_URLS = [
  "/tracker.html",
  "/tracker.webmanifest",
  "/images/tracker-icon-192.png",
  "/images/tracker-icon-512.png",
  "/images/apple-touch-icon.png",
  "/images/logo.png",
  "/images/favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put("/tracker.html", response.clone());
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match("/tracker.html")) || Response.error();
      }
    })());
    return;
  }

  if (!/\.(?:html|png|webmanifest)$/i.test(url.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const network = fetch(request).then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);

    return cached || network || Response.error();
  })());
});
