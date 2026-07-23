/*
 * Registriert den Service Worker nur, wenn die Seite im Browser läuft
 * (nicht in Electron – browser-demo.js setzt window.__isBrowserFallback,
 * wenn kein Electron-preload-API vorhanden war).
 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (!window.__isBrowserFallback) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* Registrierung ist optional – App funktioniert auch ohne */
    });
  });
})();
