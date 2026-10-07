// sw.js - Service Worker Optimizado con Auto-Actualización y Bypass Total de Streaming
const CACHE_NAME = 'portal-encuentro-v8';

const urlsToCache = [
  './',
  './index.html',
  './radio.html',
  './css/style.css',
  './js/config.js',
  './js/app.js',
  './manifest.json',
  './favicon.ico'
];

// 1. Instalación: forzar activación inmediata sin esperar a que cierren la app
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        urlsToCache.map((url) =>
          fetch(url, { cache: 'no-cache' }).then((res) => {
            if (res.ok) return cache.put(url, res);
          }).catch(() => {})
        )
      );
    })
  );
});

// 2. Activación: borrar cachés antiguas de inmediato y tomar el control de las ventanas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antigua de PWA:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Gestión de peticiones (Exclusión Total de Streaming y Network-First para archivos)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // BYPASS CRÍTICO: El Service Worker NUNCA debe tocar el audio ni los servicios de streaming
  if (
    request.method !== 'GET' ||
    request.headers.has('range') ||
    request.destination === 'audio' ||
    request.destination === 'video' ||
    url.includes('radio.unencuentroconjesusperu.com') ||
    url.includes('/listen/') ||
    url.includes('.mp3') ||
    url.includes('.aac') ||
    url.includes('supabase.co') ||
    url.includes('workers.dev') ||
    url.includes('r2.dev')
  ) {
    return; // Permite que el navegador gestione la conexión directamente por la red
  }

  // Estrategia Network-First para archivos del portal
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback sin conexión desde la caché local
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});