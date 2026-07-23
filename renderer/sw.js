/*
 * Service Worker für die PWA-Variante von Music Heaven.
 * Cached die statischen Dateien beim Start, damit die App installierbar ist
 * und auch offline (bzw. bei wackliger Verbindung) startet. Musik selbst
 * liegt weiterhin in IndexedDB des Browsers (siehe browser-demo.js).
 */
const CACHE_NAME = 'music-heaven-pwa-v1';
const PRECACHE_URLS = [
  './index.html',
  './style.css',
  './js/audio-engine.js',
  './js/mixer.js',
  './js/sequencer.js',
  './js/app.js',
  './browser-demo.js',
  './pwa-register.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first für Navigationen, Cache-first für alles andere – hält die App
// beim nächsten Start auch ohne Netz lauffähig.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
    )
  );
});
