/*
 * Registriert den Service Worker nur, wenn die Seite im Browser läuft
 * (nicht in Electron – browser-demo.js setzt window.__isBrowserFallback,
 * wenn kein Electron-preload-API vorhanden war).
 */
(function () {
  // Faengt den Installations-Prompt ab (Android/Chrome), damit der
  // "Android"-Button im Download-Bereich ihn per Klick auf Zuruf zeigen kann,
  // statt auf den automatischen Browser-Mini-Infobalken zu warten.
  window.__deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__deferredInstallPrompt = e;
  });
  window.addEventListener('appinstalled', () => {
    window.__deferredInstallPrompt = null;
  });

  if (!('serviceWorker' in navigator)) return;
  if (!window.__isBrowserFallback) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* Registrierung ist optional – App funktioniert auch ohne */
    });
  });
})();
