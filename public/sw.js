// Service Worker for কাচা বাজার (Kacha Bazar) PWA
const CACHE_NAME = 'kacha-bazar-pass-through-v2';

// Install Event - Immediately take over without waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate Event - Clean up all stale caches and take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          console.log('[PWA] Deleting old cache:', cache);
          return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Safe pass-through to ensure PWA installability without breaking JS chunks or module graphs
self.addEventListener('fetch', (event) => {
  // Let the browser handle all network requests directly
  return;
});
