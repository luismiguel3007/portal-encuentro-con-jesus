
/*
=====================================================
 SERVICE WORKER - UN ENCUENTRO CON JESÚS
 Versión 9 - Integración RadioPlayer
=====================================================

 Funciones:
 - Actualización automática de la PWA.
 - Caché de archivos esenciales.
 - Integración con /radio/.
 - Exclusión completa del streaming.
 - Conexiones directas a AzuraCast.
 - Compatibilidad con Supabase y Cloudflare.
 - Estrategia Network-First.
*/

const CACHE_NAME = 'portal-encuentro-v9';

// Archivos esenciales para funcionamiento offline
const urlsToCache = [
  './',
  './index.html',
  './radio/index.html',
  './css/style.css',
  './js/config.js',
  './js/app.js',
  './manifest.json',
  './favicon.ico'
];


/*
=====================================================
 1. INSTALACIÓN Y ACTUALIZACIÓN DE CACHÉ
=====================================================
*/

self.addEventListener('install', (event) => {

  self.skipWaiting();

  event.waitUntil(

    caches.open(CACHE_NAME).then((cache) => {

      return Promise.allSettled(

        urlsToCache.map((url) =>

          fetch(url, {
            cache: 'no-cache'
          })

          .then((res) => {

            if (res.ok) {
              return cache.put(url, res);
            }

          })

          .catch((error) => {
            console.warn(
              'No se pudo precargar:',
              url,
              error
            );
          })

        )

      );

    })

  );

});


/*
=====================================================
 2. ACTIVACIÓN Y LIMPIEZA DE CACHÉ ANTIGUA
=====================================================
*/

self.addEventListener('activate', (event) => {

  event.waitUntil(

    caches.keys().then((cacheNames) => {

      return Promise.all(

        cacheNames.map((cacheName) => {

          // Eliminar solamente cachés antiguas
          // pertenecientes a este portal.

          if (
            cacheName.startsWith('portal-encuentro-') &&
            cacheName !== CACHE_NAME
          ) {

            console.log(
              'Eliminando caché anterior:',
              cacheName
            );

            return caches.delete(cacheName);

          }

        })

      );

    }).then(() => self.clients.claim())

  );

});


/*
=====================================================
 3. GESTIÓN DE PETICIONES
=====================================================

 IMPORTANTE:
 El Service Worker no debe interceptar
 ni almacenar la transmisión de radio.

 AzuraCast entrega el audio directamente
 al navegador del oyente.
*/

self.addEventListener('fetch', (event) => {

  const request = event.request;
  const url = request.url;

  /*
  ---------------------------------------------------
  EXCLUSIÓN DE STREAMING Y SERVICIOS EXTERNOS
  ---------------------------------------------------
  */

  if (

    request.method !== 'GET' ||

    request.headers.has('range') ||

    request.destination === 'audio' ||

    request.destination === 'video' ||

    // Servidor AzuraCast
    url.includes(
      'radio.unencuentroconjesusperu.com'
    ) ||

    // Puntos de montaje
    url.includes('/listen/') ||

    // Formatos de audio
    url.includes('.mp3') ||
    url.includes('.aac') ||
    url.includes('.ogg') ||
    url.includes('.m3u8') ||

    // Supabase
    url.includes('supabase.co') ||

    // Cloudflare
    url.includes('workers.dev') ||
    url.includes('r2.dev')

  ) {

    // La petición continúa directamente
    // por la red, sin intervención del SW.
    return;

  }


  /*
  ---------------------------------------------------
  4. ESTRATEGIA NETWORK-FIRST
  ---------------------------------------------------

  Primero intenta cargar desde Internet.
  Si falla, busca el archivo en caché.
  */

  event.respondWith(

    fetch(request)

      .then((networkResponse) => {

        if (

          networkResponse &&

          networkResponse.status === 200 &&

          networkResponse.type === 'basic'

        ) {

          const responseToCache =
            networkResponse.clone();

          event.waitUntil(

            caches.open(CACHE_NAME).then((cache) => {

              return cache.put(
                request,
                responseToCache
              );

            }).catch((error) => {

              console.warn(
                'No se pudo actualizar caché:',
                error
              );

            })

          );

        }

        return networkResponse;

      })

      .catch(async () => {

        // Intentar recuperar desde caché
        const cachedResponse =
          await caches.match(request);

        if (cachedResponse) {
          return cachedResponse;
        }

        // Respaldo para navegación sin conexión
        if (request.mode === 'navigate') {

          const fallback =
            await caches.match('./index.html');

          if (fallback) {
            return fallback;
          }

        }

        return Response.error();

      })

  );

});
