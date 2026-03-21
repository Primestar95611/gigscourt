// Main service worker for GigsCourt PWA
const CACHE_NAME = 'gigscourt-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
