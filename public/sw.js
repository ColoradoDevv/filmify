const CACHE_NAME = 'filmify-static-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Solo lo nuestro. Interceptar terceros (anuncios, beacons de analítica,
  // reproductores embebidos) no aporta nada —no se cachean— y sí rompe: si esa
  // petición falla, el respondWith devuelve una promesa rechazada y el
  // navegador convierte el fallo en un error de red visible.
  if (new URL(request.url).origin !== self.location.origin) return;

  // Navigation requests (HTML): network-first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return resp;
      }).catch(() => caches.match('/'))
    );
    return;
  }

  // Other requests: cache-first then network.
  // El catch es obligatorio: sin él, una petición que falle (sin red, recurso
  // caído) deja el respondWith en rechazo y el navegador lo muestra como
  // "FetchEvent resulted in a network error response".
  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request))
      .catch(() => caches.match(request).then(cached => cached || Response.error()))
  );
});
