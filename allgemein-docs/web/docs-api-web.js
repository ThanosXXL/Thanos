// Browser-Ersatz für die Electron-Schnittstelle (preload.js): Der verschlüsselte Tresor liegt im localStorage des Geräts.
(function () {
  var KEY = 'allgemein-docs-data';
  window.docsWeb = true;
  window.docsAPI = {
    loadData: function () { try { return Promise.resolve(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { return Promise.resolve(null); } },
    saveData: function (d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return Promise.resolve(true); } catch (e) { return Promise.resolve(false); } },
    saveTextFile: function (o) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([o.text], { type: 'text/plain;charset=utf-8' }));
      a.download = o.defaultName || 'allgemein-docs.txt';
      document.body.appendChild(a); a.click(); a.remove();
      return Promise.resolve({ ok: true, name: a.download });
    },
    openTextFile: function () {
      return new Promise(function (resolve) {
        var i = document.createElement('input');
        i.type = 'file';
        i.onchange = function () {
          var f = i.files[0];
          if (!f) return resolve(null);
          var r = new FileReader();
          r.onload = function () { resolve({ name: f.name, text: String(r.result) }); };
          r.readAsText(f);
        };
        i.click();
      });
    }
  };
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
