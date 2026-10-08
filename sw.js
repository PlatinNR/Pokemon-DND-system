/**
 * Pokémon Pen & Paper - Service Worker
 * Ermöglicht PWA-Installation auf Android/iOS und Caching statischer Assets.
 */

const CACHE_NAME = 'pnp-pokemon-v2.2';
const STATIC_ASSETS = [
  '/',
  '/download.html',
  '/trainer.html',
  '/dm.html',
  '/styles.css',
  '/data/pokedex_data.js',
  '/data/pokedex_gen1_5.json',
  '/trainer.js',
  '/dm.js',
  '/manifest-trainer.json',
  '/manifest-dm.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell...');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[ServiceWorker] Failed to cache some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do not intercept or cache live API calls or SSE
  if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
    return;
  }

  // Network First, fallback to cache for HTML/JS/CSS
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
