/*
 * Browser/PWA-Fallback für Music Heaven.
 *
 * In Electron stellt preload.js window.musicHeaven bereit – dann tut dieses
 * Skript nichts. Wird die Oberfläche direkt im Browser geöffnet (z. B. als
 * installierte PWA auf Android/iOS, ohne Electron), fehlt window.musicHeaven.
 * Dieses Skript liefert dann ein Ersatz-API mit derselben Signatur: Uploads
 * und gespeicherte Musikstücke landen in IndexedDB (Blobs), der Datei-Dialog
 * nutzt <input type="file">, und "extern speichern" löst einen Browser-Download
 * aus (bzw. den nativen Speichern-Dialog, falls die File System Access API
 * verfügbar ist).
 */
(function () {
  if (window.musicHeaven) return; // Electron: echtes API vorhanden

  window.__isBrowserFallback = true;

  const DB_NAME = 'music-heaven';
  const DB_VERSION = 1;
  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('uploads')) db.createObjectStore('uploads', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('library')) db.createObjectStore('library', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function getAll(storeName) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function put(storeName, record) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }

  function del(storeName, id) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }

  const genId = () => `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const objectUrls = new Map();
  function withUrl(record) {
    let url = objectUrls.get(record.id);
    if (!url) {
      url = URL.createObjectURL(record.blob);
      objectUrls.set(record.id, url);
    }
    return { id: record.id, name: record.name, type: record.type, url };
  }

  function pickFiles(accept, multiple) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = !!multiple;
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', () => {
        const files = input.files ? Array.from(input.files) : [];
        input.remove();
        resolve(files);
      });
      input.click();
    });
  }

  async function listUploads() {
    const records = await getAll('uploads');
    records.sort((a, b) => a.addedAt - b.addedAt);
    return records.map(withUrl);
  }

  async function chooseUploads() {
    const files = await pickFiles('audio/*', true);
    for (const file of files) {
      await put('uploads', {
        id: genId(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        blob: file,
        addedAt: Date.now()
      });
    }
    return listUploads();
  }

  async function deleteUpload(id) {
    const url = objectUrls.get(id);
    if (url) { URL.revokeObjectURL(url); objectUrls.delete(id); }
    await del('uploads', id);
    return listUploads();
  }

  async function listLibrary() {
    const records = await getAll('library');
    records.sort((a, b) => b.createdAt - a.createdAt);
    return records.map(withUrl);
  }

  function extToMime(ext) {
    if (ext === 'wav') return 'audio/wav';
    if (ext === 'mp3') return 'audio/mpeg';
    return 'audio/webm';
  }

  async function saveToLibrary({ name, type, ext, bytes }) {
    const mime = extToMime(ext);
    await put('library', {
      id: genId(),
      name: name && name.trim() ? name.trim() : `Music Heaven ${new Date().toLocaleString()}`,
      type,
      blob: new Blob([bytes], { type: mime }),
      createdAt: Date.now()
    });
    return listLibrary();
  }

  async function deleteLibraryItem(id) {
    const url = objectUrls.get(id);
    if (url) { URL.revokeObjectURL(url); objectUrls.delete(id); }
    await del('library', id);
    return listLibrary();
  }

  async function saveExternal({ name, ext, bytes }) {
    const mime = extToMime(ext);
    const blob = new Blob([bytes], { type: mime });
    const filename = `${(name || 'music-heaven-export').replace(/[\\/:*?"<>|]/g, '_')}.${ext || 'webm'}`;

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: filename });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { ok: true, path: filename };
      } catch (err) {
        if (err && err.name === 'AbortError') return { ok: false };
        // Kein File-System-Access-Support (z. B. Safari) -> Download-Fallback unten.
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { ok: true, path: filename };
  }

  async function openLibraryFolder() {
    // Im Browser gibt es kein OS-Dateisystem zum Oeffnen - die App zeigt
    // stattdessen die Bibliothek weiter unten auf der Seite an.
    return { ok: false, browserFallback: true };
  }

  window.musicHeaven = {
    listUploads,
    chooseUploads,
    deleteUpload,
    listLibrary,
    saveToLibrary,
    deleteLibraryItem,
    saveExternal,
    openLibraryFolder
  };

  window.addEventListener('DOMContentLoaded', () => {
    const banner = document.createElement('div');
    banner.textContent = 'Browser/PWA-Version — Musik wird lokal in diesem Browser gespeichert. ' +
      'Für dauerhafte Dateien am besten „Extern speichern unter…“ nutzen.';
    banner.style.cssText = 'flex-shrink:0;background:#0b6b39;color:#eafff2;font:13px "Segoe UI",Arial;' +
      'padding:6px 16px;text-align:center;';
    document.body.insertBefore(banner, document.body.firstChild);
  });
})();
