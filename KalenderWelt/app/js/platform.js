// Plattform-Abstraktion: gleicher UI-Code läuft auf Desktop (Electron),
// Mobile (Capacitor/Android/iOS) und im normalen Browser.
(function (global) {
  "use strict";

  const isElectron = !!global.dashboardAPI;
  const isCapacitor = !!(global.Capacitor && global.Capacitor.isNativePlatform && global.Capacitor.isNativePlatform());
  const cap = isCapacitor ? global.Capacitor.Plugins : null;

  const STORAGE_KEY = "kalenderwelt-data";

  async function loadState() {
    if (isElectron) {
      return global.dashboardAPI.loadData();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error("loadState fehlgeschlagen", err);
      return null;
    }
  }

  async function saveState(data) {
    if (isElectron) {
      return global.dashboardAPI.saveData(data);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async function requestNotificationPermission() {
    if (isCapacitor && cap.LocalNotifications) {
      const res = await cap.LocalNotifications.requestPermissions();
      return res.display === "granted";
    }
    if (isElectron) return true;
    if (!("Notification" in global)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  function notifyNow(title, body) {
    if (isElectron && global.dashboardAPI.notify) {
      global.dashboardAPI.notify(title, body);
      return;
    }
    if (isCapacitor && cap.LocalNotifications) {
      cap.LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1000000),
            title,
            body,
            schedule: { at: new Date(Date.now() + 500) },
          },
        ],
      });
      return;
    }
    if ("Notification" in global && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }

  function openExternal(url) {
    if (isElectron && global.dashboardAPI.openExternal) {
      global.dashboardAPI.openExternal(url);
      return;
    }
    if (isCapacitor && cap.Browser) {
      cap.Browser.open({ url });
      return;
    }
    global.open(url, "_blank");
  }

  // Speichert eine erzeugte Datei (Blob) plattformgerecht und bietet
  // Teilen-Möglichkeiten an (System-Dialog / Share-Sheet).
  async function saveAndShareFile(blob, filename) {
    if (isElectron && global.dashboardAPI.saveDocument) {
      const buffer = await blob.arrayBuffer();
      return global.dashboardAPI.saveDocument(filename, Array.from(new Uint8Array(buffer)));
    }
    if (isCapacitor && cap.Filesystem) {
      const base64 = await blobToBase64(blob);
      const write = await cap.Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: "CACHE",
      });
      if (cap.Share) {
        await cap.Share.share({
          title: filename,
          files: [write.uri],
          dialogTitle: "Word-Datei teilen",
        });
      }
      return { path: write.uri };
    }
    // Browser-Fallback: normaler Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { path: filename };
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  global.Platform = {
    isElectron,
    isCapacitor,
    loadState,
    saveState,
    requestNotificationPermission,
    notifyNow,
    openExternal,
    saveAndShareFile,
    blobToBase64,
  };
})(window);
