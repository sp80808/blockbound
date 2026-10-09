/**
 * Blockbound offline service worker — app-shell caching, no build plugins.
 *
 * Strategy:
 * - Navigations are network-first with a cached index.html fallback, so a
 *   fresh deploy loads immediately and a dead connection still opens the game.
 * - Same-origin static assets (hashed Vite chunks, icons, manifest) are
 *   cache-first and backfilled on first fetch, so repeat visits work offline.
 * - Cross-origin requests are never intercepted (privacy + correctness).
 * - Bumping CACHE_VERSION retires every old cache on activate.
 *
 * Keep this file free of game logic: it only moves bytes.
 */

const CACHE_VERSION = 'blockbound-v1';
const OFFLINE_PAGE = './index.html';
const CORE = ['./', OFFLINE_PAGE, './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => {
        // First paint must never fail because the cache did.
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key !== CACHE_VERSION)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(OFFLINE_PAGE, copy));
        return response;
      }).catch(() => caches.match(OFFLINE_PAGE))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(hit => {
      if (hit) return hit;
      return fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
