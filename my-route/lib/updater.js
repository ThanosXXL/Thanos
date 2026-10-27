'use strict';
// Automatische Updates (electron-updater, „generic“-Anbieter auf dem GitHub-Release `my-route-updates`).
// Prüfung beim Start, danach alle 4 Stunden. Updates werden im Hintergrund geladen und beim Beenden
// installiert (oder auf Wunsch sofort). Fehler dürfen die App nie beeinträchtigen.

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

function createUpdater({ app, send }) {
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
    autoUpdater.on('update-downloaded', (info) => publish({ state: 'downloaded', version: info && info.version }));
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
    setTimeout(run, 6000).unref();
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
