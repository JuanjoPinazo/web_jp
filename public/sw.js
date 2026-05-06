const CACHE_NAME = 'jp-intelligence-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo_jp_negro.png',
  '/logo_jp_blanco.png',
  '/JP Intelligence Platform Video.mp4'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
