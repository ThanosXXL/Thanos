'use strict';
// Automatische Updates (electron-updater, „generic“-Anbieter auf dem GitHub-Release `my-route-updates`).
// Prüfung beim Start, danach alle 4 Stunden. Updates werden im Hintergrund geladen und beim Beenden
// installiert (oder auf Wunsch sofort). Fehler dürfen die App nie beeinträchtigen.

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const FIRST_CHECK_DELAY_MS = 3000; // kurz nach dem Start, sobald die Einstellungen geladen sind
const STARTUP_APPLY_WINDOW_MS = 90 * 1000; // Updates, die in dieser Zeit nach dem Start fertig werden, werden sofort eingespielt
const APPLY_DELAY_MS = 5000; // kurze Anzeige „wird installiert“, bevor die App neu startet
const RETRY_AFTER_MS = 24 * 60 * 60 * 1000; // pro Version höchstens ein automatischer Einspiel-Versuch am Tag (keine Neustart-Schleife)

function createUpdater({ app, send, fs, path, userDataDir }) {
  const startedAt = Date.now();
  const markerFile = userDataDir ? path.join(userDataDir, 'update-attempt.json') : null;
  let autoUpdater = null;
  let status = { state: 'idle' };
  let timer = null;

  function publish(next) {
    status = next;
    try {
      send(status);
    } catch (err) {
      /* Fenster evtl. schon geschlossen */
    }
  }

  // Nach jedem Start gefundene Updates sofort einspielen – aber pro Version nur einmal am Tag versuchen.
  function shouldApplyNow(version) {
    if (!version || Date.now() - startedAt > STARTUP_APPLY_WINDOW_MS) return false;
    if (!markerFile) return true;
    try {
      const m = JSON.parse(fs.readFileSync(markerFile, 'utf-8'));
      if (m && m.version === version && Date.now() - Number(m.ts) < RETRY_AFTER_MS) return false;
    } catch (err) {
      /* noch kein Versuch */
    }
    return true;
  }

  function rememberAttempt(version) {
    if (!markerFile) return;
    try {
      fs.writeFileSync(markerFile, JSON.stringify({ version, ts: Date.now() }), { encoding: 'utf-8', mode: 0o600 });
    } catch (err) {
      /* ohne Marker greift nur die Zeitfenster-Regel */
    }
  }

  function init() {
    if (autoUpdater) return true;
    if (!app.isPackaged) return false; // in der Entwicklung gibt es keine Update-Quelle
    try {
      ({ autoUpdater } = require('electron-updater'));
    } catch (err) {
      autoUpdater = null;
      return false;
    }
    autoUpdater.logger = null; // keine Protokolldateien mit Netzwerkdetails
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;
    autoUpdater.allowPrerelease = false;
    autoUpdater.on('checking-for-update', () => publish({ state: 'checking' }));
    autoUpdater.on('update-available', (info) => publish({ state: 'downloading', version: info && info.version, percent: 0 }));
    autoUpdater.on('update-not-available', () => publish({ state: 'uptodate' }));
    autoUpdater.on('download-progress', (p) =>
      publish({ state: 'downloading', version: status.version, percent: Math.round((p && p.percent) || 0) })
    );
    autoUpdater.on('update-downloaded', (info) => {
      const version = info && info.version;
      if (shouldApplyNow(version)) {
        publish({ state: 'downloaded', version, installing: true });
        const t = setTimeout(() => {
          rememberAttempt(version);
          try {
            autoUpdater.quitAndInstall(true, true); // still installieren und danach automatisch neu starten
          } catch (err) {
            publish({ state: 'error', message: String((err && err.message) || err).slice(0, 160) });
          }
        }, APPLY_DELAY_MS);
        t.unref();
      } else {
        publish({ state: 'downloaded', version }); // wird beim Beenden installiert oder per „Jetzt neu starten“
      }
    });
    autoUpdater.on('error', (err) => publish({ state: 'error', message: String((err && err.message) || err).slice(0, 160) }));
    return true;
  }

  async function check() {
    if (!init()) {
      publish({ state: 'unsupported' });
      return;
    }
    if (status.state === 'checking' || status.state === 'downloading' || status.state === 'downloaded') return;
    try {
      const result = await autoUpdater.checkForUpdates();
      // electron-updater meldet sich ohne Ereignis „inaktiv“ (z. B. Linux außerhalb eines AppImage, Entwicklungsstand)
      if (!result && (status.state === 'idle' || status.state === 'checking')) publish({ state: 'unsupported' });
    } catch (err) {
      publish({ state: 'error', message: String((err && err.message) || err).slice(0, 160) });
    }
  }

  function start(isEnabled) {
    if (timer) return;
    const run = () => {
      if (isEnabled()) check();
    };
    setTimeout(run, FIRST_CHECK_DELAY_MS).unref();
    timer = setInterval(run, CHECK_INTERVAL_MS);
    timer.unref();
  }

  function installNow() {
    if (autoUpdater && status.state === 'downloaded') {
      autoUpdater.quitAndInstall(false, true);
      return true;
    }
    return false;
  }

  return { check, start, installNow, getStatus: () => status, isSupported: () => app.isPackaged };
}

module.exports = { createUpdater, CHECK_INTERVAL_MS };
