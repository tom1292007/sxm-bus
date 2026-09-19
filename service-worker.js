const CACHE_NAME = 'sxm-bus-shell-v6';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './sxm-splash-logo.webp',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',

  // Driver app
  './driver.html',
  './driver-manifest.json',
  './driver-icon-192.png',
  './driver-icon-512.png',
  './driver-apple-touch-icon.png'
];


// ==========================================================
// INSTALL
// ==========================================================

self.addEventListener('install', event => {

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL);
    })
  );

  // Activate the new service worker immediately
  self.skipWaiting();
});


// ==========================================================
// ACTIVATE
// ==========================================================

self.addEventListener('activate', event => {

  event.waitUntil(

    caches.keys().then(keys => {

      return Promise.all(

        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))

      );

    }).then(() => {

      // Take control of all currently open pages
      return self.clients.claim();

    })

  );

});


// ==========================================================
// FETCH
// ==========================================================

self.addEventListener('fetch', event => {

  const request = event.request;

  // We only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);


  // ========================================================
  // DO NOT CACHE LIVE DATA
  // ========================================================

  // Supabase must always remain live.
  // OpenStreetMap tiles should also remain network-first.
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('openstreetmap.org') ||
    url.pathname.includes('/rest/') ||
    url.pathname.includes('/realtime/')
  ) {
    return;
  }


  // ========================================================
  // NAVIGATION REQUEST
  // ========================================================

  // This handles opening the PWA when online or offline.
  if (request.mode === 'navigate') {

    event.respondWith(

      fetch(request)

        .then(response => {

          if (response && response.ok) {

            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {

              cache.put('./index.html', copy);

            });

          }

          return response;

        })

        .catch(() => {

          // If the internet is unavailable,
          // open the cached passenger app.
          return caches.match('./index.html');

        })

    );

    return;
  }


  // ========================================================
  // NORMAL STATIC FILE REQUEST
  // ========================================================

  event.respondWith(

    fetch(request)

      .then(response => {

        if (
          response &&
          response.ok &&
          url.origin === self.location.origin
        ) {

          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {

            cache.put(request, copy);

          });

        }

        return response;

      })

      .catch(() => {

        // Network failed.
        // Try the cached version.
        return caches.match(request);

      })

  );

});
