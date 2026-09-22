// sw.js - Service Worker para habilitar PWA
const CACHE_NAME = 'iglesia-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Permite que todas las solicitudes de red se procesen con normalidad
  event.respondWith(fetch(event.request));
});