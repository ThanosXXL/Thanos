// Registriert den Service Worker fürs PWA-Installieren (nur im echten Browser über
// http(s); auf file:// (Electron) und in der Capacitor-App ist das nicht nötig/möglich).
(function () {
  if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();

// Stellt window.dashboardAPI bereit, wenn preload.js es nicht schon injiziert hat
// (also außerhalb von Electron: Android-App via Capacitor oder normaler Browser/PWA).
// In Electron bleibt die Electron-IPC-Variante unangetastet.
(function () {
  if (window.dashboardAPI) return;

  var isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  function capGet(key) {
    return window.Capacitor.Plugins.Preferences.get({ key: key }).then(function (r) { return r.value; });
  }
  function capSet(key, value) {
    return window.Capacitor.Plugins.Preferences.set({ key: key, value: value });
  }

  function lsGet(key) { return Promise.resolve(localStorage.getItem(key)); }
  function lsSet(key, value) { localStorage.setItem(key, value); return Promise.resolve(); }

  var backend = isCapacitor
    ? { get: capGet, set: capSet }
    : { get: lsGet, set: lsSet };

  window.dashboardAPI = {
    loadData: function () {
      return backend.get('dozenten-data').then(function (raw) {
        try { return raw ? JSON.parse(raw) : { dozenten: [] }; } catch (e) { return { dozenten: [] }; }
      });
    },
    saveData: function (data) {
      return backend.set('dozenten-data', JSON.stringify(data)).then(function () { return true; });
    }
  };
})();
