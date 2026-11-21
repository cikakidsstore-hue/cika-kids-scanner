
const CACHE_NAME = "cika-kids-stock-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.svg",
  "./icon-512.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key =>
            key.startsWith("cika-kids-stock-") &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === "navigate") {
      event.respondWith(
        fetch(request)
          .then(response => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, copy));
            }
            return response;
          })
          .catch(async () => {
            return await caches.match(request) ||
                   await caches.match("./index.html");
          })
      );
    } else {
      event.respondWith(
        caches.match(request).then(cached => {
          if (cached) return cached;

          return fetch(request).then(response => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, copy));
            }
            return response;
          });
        })
      );
    }
  } else if (request.destination === "script") {
    // Simpan library scanner dan QR dari CDN
    // setelah berhasil diunduh saat online.
    event.respondWith(
      caches.match(request).then(async cached => {
        try {
          const response = await fetch(request);

          if (response.ok || response.type === "opaque") {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy));
          }
          return response;
        } catch (error) {
          if (cached) return cached;
          throw error;
        }
      })
    );
  }
});
