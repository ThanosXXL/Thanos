// Browser-Ersatz für die Electron-Schnittstelle (preload.js): Daten liegen im localStorage des Geräts.
(function () {
  var KEY = 'allgemein-docs-data';
  window.docsWeb = true;
  window.docsAPI = {
    loadData: function () { try { return Promise.resolve(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { return Promise.resolve(null); } },
    saveData: function (d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* Speicher voll */ } return Promise.resolve(true); },
    exportBackup: function (d) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.download = 'allgemein-docs-backup.json';
      document.body.appendChild(a); a.click(); a.remove();
      return Promise.resolve(true);
    },
    importBackup: function () {
      return new Promise(function (resolve) {
        var i = document.createElement('input');
        i.type = 'file'; i.accept = '.json,application/json';
        i.onchange = function () {
          var f = i.files[0];
          if (!f) return resolve(null);
          var r = new FileReader();
          r.onload = function () { try { resolve(JSON.parse(r.result)); } catch (e) { resolve(null); } };
          r.readAsText(f);
        };
        i.click();
      });
    }
  };
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
