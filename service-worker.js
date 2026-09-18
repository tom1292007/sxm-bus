const CACHE_NAME = "sxm-bus-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./driver.html",
  "./driver-manifest.json",
  "./driver-icon-192.png",
  "./driver-icon-512.png",
  "./driver-apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // NEVER cache Supabase/live API traffic.
  // This keeps bus locations and other live data real-time.
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.includes("/rest/") ||
    url.pathname.includes("/realtime/")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {

        // Save successful files for offline use
        if (response && response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy));
        }

        return response;
      })

      .catch(() =>
        caches.match(request)
          .then(cachedResponse => {

            if (cachedResponse) {
              return cachedResponse;
            }

            return new Response(
              "SXM Bus is temporarily offline.",
              {
                status: 503,
                statusText: "Service Unavailable",
                headers: {
                  "Content-Type": "text/plain"
                }
              }
            );

          })
      )
  );
});
