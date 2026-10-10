/*
=====================================================
 SERVICE WORKER - UN ENCUENTRO CON JESÚS
 Versión 10 - Soporte Segundo Plano y RadioPlayer
=====================================================
*/

const CACHE_NAME = 'portal-encuentro-v10';

// Archivos esenciales para funcionamiento offline de la web y la radio
const urlsToCache = [
  './',
  './index.html',
  './radio/',
  './radio/index.html',
  './radio/css/style.css',
  './radio/js/script.js',
  './css/style.css',
  './js/config.js',
  './js/app.js',
  './manifest.json',
  './favicon.ico'
];

/*
=====================================================
 1. INSTALACIÓN Y ACTUALIZACIÓN INMEDIATA
=====================================================
*/
self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        urlsToCache.map((url) =>
          fetch(url, { cache: 'no-cache' })
            .then((res) => {
              if (res.ok) {
                return cache.put(url, res);
              }
            })
            .catch((error) => {
              console.warn('No se pudo precargar en caché:', url, error);
            })
        )
      );
    })
  );
});

/*
=====================================================
 2. ACTIVACIÓN Y LIMPIEZA DE CACHÉ OBSOLETA
=====================================================
*/
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName.startsWith('portal-encuentro-') &&
            cacheName !== CACHE_NAME
          ) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/*
=====================================================
 3. GESTIÓN DE PETICIONES (BYPASS DE AUDIO STREAM)
=====================================================
*/
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // EXCLUSIÓN ABSOLUTA DE STREAMING Y APIS DINÁMICAS
  // El Service Worker nunca debe interceptar ni pausar el streaming de AzuraCast
  if (
    request.method !== 'GET' ||
    request.headers.has('range') ||
    request.destination === 'audio' ||
    request.destination === 'video' ||
    url.includes('radio.unencuentroconjesusperu.com') ||
    url.includes('/listen/') ||
    url.includes('/api/nowplaying') ||
    url.includes('.mp3') ||
    url.includes('.aac') ||
    url.includes('.ogg') ||
    url.includes('.m3u8') ||
    url.includes('supabase.co') ||
    url.includes('workers.dev') ||
    url.includes('r2.dev')
  ) {
    return;
  }

  // ESTRATEGIA NETWORK-FIRST PARA CONTENIDO WEB
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
              return cache.put(request, responseToCache);
            }).catch((error) => {
              console.warn('Fallo al actualizar caché:', error);
            })
          );
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        if (request.mode === 'navigate') {
          // Si el usuario intentaba navegar a la radio sin red
          if (url.includes('/radio/')) {
            const radioFallback = await caches.match('./radio/index.html');
            if (radioFallback) return radioFallback;
          }

          const fallback = await caches.match('./index.html');
          if (fallback) return fallback;
        }

        return Response.error();
      })
  );
});