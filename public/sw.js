// Offline support: the app shell is cached so the app opens without a connection.
// Data requests (to Apps Script) always go to the network; the app keeps its own
// local copy of the data and an outbox of unsent changes.
//
// Only the hashed build files in assets/ are served cache-first (their names
// change whenever their content does). Everything else — the page, the
// manifest, icons — is network-first, so renames and new icons show up right
// away, with the cached copy used only when offline.
const CACHE = 'tasklist-v4';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

function networkFirst(req, cacheKey) {
  return fetch(req)
    .then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(cacheKey ?? req, copy));
      }
      return res;
    })
    .catch(() => caches.match(cacheKey ?? req));
}

function cacheFirst(req) {
  return caches.match(req).then(
    (hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }),
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, './index.html'));
  } else if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(networkFirst(req));
  }
});
