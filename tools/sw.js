/*
 * Service worker: after one online visit the app opens with no connection.
 * VERSION and PRECACHE (every built file) are prepended at build time by
 * tools/serviceWorker.ts. Registered from src/main.tsx in production builds only.
 */
/* global VERSION, PRECACHE */
const CACHE = `opord-${VERSION}`;
const SCOPE = self.registration.scope;
const SHELL = [SCOPE, `${SCOPE}index.html`];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((p) => new URL(p, SCOPE).href)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('opord-') && k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

const cacheable = (res) => res && res.ok && res.type === 'basic' && !res.redirected;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const bare = url.href.split(/[?#]/)[0];

  if (req.mode === 'navigate') {
    // Only the app page itself; anything else (a file opened directly) goes to the network.
    if (!SHELL.includes(bare)) return;
    // Network first, so an online visit always gets the latest deploy; cached page offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const html = (res.headers.get('content-type') || '').includes('text/html');
          if (cacheable(res) && html) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(SCOPE, copy));
          }
          return res;
        })
        .catch(() => caches.match(SCOPE).then((hit) => hit || Response.error()))
    );
    return;
  }

  // Built files are content-hashed, so cache-first is safe; new ones are cached on the way.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (cacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
