// sw.js - Service Worker Optimizado con Auto-Actualización y Bypass de Streaming
const CACHE_NAME = 'portal-encuentro-v6';

const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/radio-flotante.js',
  './js/app.js',
  './manifest.json',
  './favicon.ico'
];

// 1. Instalación: forzar activación inmediata sin esperar a que cierren la app
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Descarga cada archivo de forma segura sin abortar si alguno no existe
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

// 2. Activación: borrar cachés antiguas de inmediato y tomar el control de las ventanas abiertas
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

// 3. Gestión de peticiones (Network-First para código y Exclusión Total de Streaming)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // EXCLUSIÓN CRÍTICA: Nunca interceptar streams, API en vivo ni base de datos
  if (
    request.method !== 'GET' ||
    url.includes('/listen/') ||
    url.includes('.mp3') ||
    url.includes('.aac') ||
    url.includes('/api/nowplaying') ||
    url.includes('supabase.co') ||
    url.includes('workers.dev') ||
    url.includes('r2.dev')
  ) {
    return; // Pasa directo por la red del dispositivo
  }

  // Estrategia Network-First: Descarga siempre la versión más nueva del servidor
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
        // Modo sin conexión: responder desde la caché local
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});