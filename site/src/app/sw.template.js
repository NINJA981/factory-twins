// Factory Twins web app service worker. Cache-first from a precache written at build time, so the app
// works offline after one visit. It never caches or forwards anything but same-origin static files and
// has no runtime fetch of its own: no network call beyond the static assets.
const VERSION = '__VERSION__';
const CACHE = `ft-app-${VERSION}`;
const FILES = __FILES__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES.map((f) => new URL(f, self.location.href).href)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ft-app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: 'offline-ready', version: VERSION }))),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'status') {
    event.source && event.source.postMessage({ type: 'offline-ready', version: VERSION });
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = (await cache.match(req, { ignoreSearch: true, ignoreVary: true })) ||
        (req.mode === 'navigate' ? await cache.match(new URL('./', self.location.href).href, { ignoreVary: true }) : undefined);
      return hit || fetch(req);
    }),
  );
});
