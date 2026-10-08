// Einfacher Offline-Cache: Dateien der App werden beim ersten Aufruf gespeichert.
var CACHE = 'allgemein-docs-v2';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return fetch(e.request).then(function (res) { if (res.ok && res.status !== 206) c.put(e.request, res.clone()); return res; })
      .catch(function () { return c.match(e.request); });
  }));
});
