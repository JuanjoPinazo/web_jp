const CACHE_NAME = 'jp-intelligence-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/logo_jp_negro.png',
  '/logo_jp_blanco.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo cachear GET
  if (event.request.method !== 'GET') return;

  // No cachear llamadas a la API o Supabase para evitar datos obsoletos
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Cachear assets estáticos (JS, CSS, Imágenes)
        if (
          response.status === 200 &&
          (event.request.destination === 'script' ||
           event.request.destination === 'style' ||
           event.request.destination === 'image' ||
           event.request.destination === 'font')
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Si falla el fetch (offline) y no hay cache, podríamos devolver una página offline
        // Pero para SPA/Next.js, mejor dejar que el cliente maneje el estado offline
      });
    })
  );
});
