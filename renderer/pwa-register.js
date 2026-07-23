/*
 * Registriert den Service Worker nur, wenn die Seite im Browser läuft
 * (nicht in Electron – dort gibt es kein window.dashboardAPI-Fallback-
 * Bedürfnis und keinen Sinn für einen Service Worker).
 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  // Nur im echten Browser registrieren (browser-demo.js setzt dieses Flag,
  // wenn kein Electron-preload-API vorhanden war). In Electron nichts tun.
  if (!window.__isBrowserFallback) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* Registrierung ist optional – App funktioniert auch ohne */
    });
  });
})();
