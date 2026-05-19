const CACHE_NAME = 'jp-intelligence-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo_jp_negro.png',
  '/logo_jp_blanco.png'
];

// Install event: cache pre-defined assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Do NOT skipWaiting() automatically here, so we can control update timing from the UI.
});

// Activate event: clean up stale caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Message event: listen for SKIP_WAITING to activate the waiting service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event: implement smart caching strategy with network-first for live/admin pages
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Exclude API routes, database queries, and live dashboard/admin pages from cache-first
  const isExcluded = 
    url.pathname.startsWith('/api/') || 
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/dashboard') ||
    url.pathname.includes('/admin') ||
    url.pathname.includes('timeline') ||
    url.pathname.includes('airport') ||
    url.pathname.includes('alerts') ||
    url.pathname.includes('logistics');

  if (isExcluded) {
    // Network first strategy
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache first for static assets (images, fonts, scripts, styles, videos)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const destination = event.request.destination;
        const isStaticAsset = 
          destination === 'image' ||
          destination === 'font' ||
          destination === 'script' ||
          destination === 'style' ||
          destination === 'video' ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.jpg') ||
          url.pathname.endsWith('.jpeg') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.endsWith('.gif') ||
          url.pathname.endsWith('.mp4');

        if (isStaticAsset) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {});
    })
  );
});

// --- PUSH NOTIFICATIONS ---

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const options = {
      body: payload.body,
      icon: payload.icon || '/logo_jp_negro.png',
      badge: '/logo_jp_negro.png',
      data: payload.data || { url: '/dashboard' },
      vibrate: [100, 50, 100],
      actions: payload.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(payload.title, options)
    );
  } catch (err) {
    console.error('Error receiving push:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una ventana abierta, enfocarla y navegar
      for (let client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
