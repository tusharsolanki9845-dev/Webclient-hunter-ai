const CACHE_NAME = "webclient-hunter-pwa-v2";
const APP_SHELL = ["/", "/index.html", "/css/style.css?v=20260822-prospect-ui", "/js/main.js", "/js/pwa.js", "/manifest.json", "/assets/icon-192.png", "/assets/icon-512.png", "/assets/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.all(APP_SHELL.map((path) => cache.add(path).catch(() => undefined)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (new URL(event.request.url).origin === self.location.origin) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match("/index.html"))));
});
