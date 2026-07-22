// Registriert den Service Worker fürs PWA-Installieren (nur im echten Browser über
// http(s); auf file:// (Electron) und in der Capacitor-App ist das nicht nötig/möglich).
(function () {
  if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();

// Stellt window.dashboardAPI / window.reportAPI bereit, wenn preload.js sie nicht
// schon injiziert hat (also außerhalb von Electron: Android-App via Capacitor oder
// normaler Browser/PWA). In Electron bleibt die Electron-IPC-Variante unangetastet.
(function () {
  if (window.dashboardAPI && window.reportAPI) return;

  var isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  function capGet(key) {
    return window.Capacitor.Plugins.Preferences.get({ key: key }).then(function (r) { return r.value; });
  }
  function capSet(key, value) {
    return window.Capacitor.Plugins.Preferences.set({ key: key, value: value });
  }
  function capRemove(key) {
    return window.Capacitor.Plugins.Preferences.remove({ key: key });
  }
  function capKeys() {
    return window.Capacitor.Plugins.Preferences.keys().then(function (r) { return r.keys; });
  }

  function lsGet(key) { return Promise.resolve(localStorage.getItem(key)); }
  function lsSet(key, value) { localStorage.setItem(key, value); return Promise.resolve(); }
  function lsRemove(key) { localStorage.removeItem(key); return Promise.resolve(); }
  function lsKeys() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    return Promise.resolve(keys);
  }

  var backend = isCapacitor
    ? { get: capGet, set: capSet, remove: capRemove, keys: capKeys }
    : { get: lsGet, set: lsSet, remove: lsRemove, keys: lsKeys };

  if (!window.dashboardAPI) {
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
  }

  if (!window.reportAPI) {
    window.reportAPI = {
      storageGet: function (key) { return backend.get(key); },
      storageSet: function (key, value) { return backend.set(key, value); },
      storageDelete: function (key) { return backend.remove(key); },
      storageList: function (prefix) {
        return backend.keys().then(function (keys) {
          return keys.filter(function (k) { return k && k.indexOf(prefix || '') === 0; });
        });
      }
    };
  }
})();
