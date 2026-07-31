const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  screen,
  session,
  dialog
} = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Google-Drive-Token sicher im OS-Schlüsselbund speichern (Windows Credential Manager /
// macOS Keychain / Linux Secret Service via libsecret). keytar ist ein natives Modul und
// kann auf manchen Systemen fehlen oder fehlschlagen (z. B. Linux ohne libsecret) – der
// require() selbst kann dabei bereits werfen, deshalb hier abgesichert. In diesem Fall
// fällt die App automatisch auf die bisherige Klartext-Datei zurück, statt abzustürzen.
let keytar = null;
try {
  keytar = require('keytar');
} catch (err) {
  keytar = null;
}
const KEYTAR_SERVICE = 'it-schulungsmassnahmen';
const KEYTAR_ACCOUNT = 'google-drive-token';

// Demo-Modus: eigene Datendatei + vorbefüllte Beispieldaten (DASHBOARD_DEMO=1)
const DEMO = process.env.DASHBOARD_DEMO === '1';
const dataFilePath = path.join(
  app.getPath('userData'),
  DEMO ? 'dozenten-demo.json' : 'dozenten-data.json'
);
const settingsFilePath = path.join(app.getPath('userData'), 'dashboard-settings.json');

// Beispieldaten für die Demo-Version
function demoData() {
  const d = (offsetDays) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + offsetDays);
    return dt.toISOString().slice(0, 10);
  };
  return {
    dozenten: [
      {
        id: 'demo-mueller',
        name: 'Frau Müller (Java)',
        todos: [
          { id: 't1', text: 'Folien für Vererbung vorbereiten', done: false },
          { id: 't2', text: 'Quiz Woche 3 einsammeln', done: true }
        ],
        openProjects: [{ id: 'p1', text: 'Abschlussprojekt: To-Do-App', done: false }],
        doneProjects: [{ id: 'p2', text: 'Grundlagen-Modul', done: false }],
        chat: [
          { id: 'c1', text: 'Willkommen im Java-Kurs!', time: '01.07. 09:00' }
        ],
        homework: [
          {
            id: 'h1',
            author: 'Max Mustermann',
            text: 'Aufgabe 2: Klassen und Objekte',
            attachments: ['Aufgabe2.zip'],
            submittedAt: '05.07.2026, 18:20',
            feedback: 'Sehr gut gelöst, Getter/Setter noch ergänzen.',
            corrected: true,
            returnedAt: '06.07.2026, 08:15'
          },
          {
            id: 'h2',
            author: 'Erika Beispiel',
            text: 'Aufgabe 3: Vererbung',
            attachments: [],
            submittedAt: '10.07.2026, 20:05',
            feedback: '',
            corrected: false,
            returnedAt: null
          }
        ],
        exams: [
          { id: 'e1', title: 'Java-Zwischentest', date: d(3), time: '10:00' },
          { id: 'e2', title: 'Abschlussprüfung Java', date: d(21), time: '09:30' }
        ]
      },
      {
        id: 'demo-schmidt',
        name: 'Herr Schmidt (Netzwerke)',
        todos: [{ id: 't3', text: 'Lab: Subnetting vorbereiten', done: false }],
        openProjects: [{ id: 'p3', text: 'Projekt: Heimnetz planen', done: false }],
        doneProjects: [],
        chat: [],
        homework: [],
        exams: [{ id: 'e3', title: 'Test: OSI-Modell', date: d(7), time: '14:00' }]
      }
    ]
  };
}

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    // In der Demo beim ersten Start mit Beispieldaten füllen
    if (DEMO) {
      const seed = demoData();
      try {
        saveData(seed);
      } catch (e) {
        /* Schreiben optional */
      }
      return seed;
    }
    return { dozenten: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

function loadSettingsFile() {
  try {
    const raw = fs.readFileSync(settingsFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function saveSettingsFile(settings) {
  fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
}

// Liefert die Einstellungen. Der Google-Drive-Token wird nach Möglichkeit sicher aus dem
// OS-Schlüsselbund gelesen statt aus der Klartext-Datei; ein evtl. noch vorhandener
// Klartext-Token wird dabei einmalig in den Schlüsselbund migriert. `driveTokenSecure`
// zeigt an, ob der Token aktuell sicher gespeichert ist (Anzeige im Einstellungen-Dialog).
async function loadSettings() {
  const fileSettings = loadSettingsFile();

  if (!keytar) {
    return { ...fileSettings, driveTokenSecure: false };
  }

  try {
    let token = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);

    if (!token && fileSettings.googleDriveToken) {
      token = fileSettings.googleDriveToken;
      await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, token);
      const cleaned = { ...fileSettings };
      delete cleaned.googleDriveToken;
      saveSettingsFile(cleaned);
    }

    const { googleDriveToken, ...rest } = fileSettings;
    return { ...rest, googleDriveToken: token || '', driveTokenSecure: true };
  } catch (err) {
    // Schlüsselbund-Backend nicht verfügbar (z. B. libsecret fehlt unter Linux) -> Fallback
    return { ...fileSettings, driveTokenSecure: false };
  }
}

async function saveSettings(settings) {
  const { googleDriveToken, ...rest } = settings || {};

  if (keytar) {
    try {
      if (googleDriveToken) {
        await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, googleDriveToken);
      } else {
        await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT).catch(() => {});
      }
      saveSettingsFile(rest); // Token nicht mehr im Klartext in der Datei speichern
      return;
    } catch (err) {
      // Schlüsselbund-Backend nicht verfügbar -> Fallback auf die Datei
    }
  }
  saveSettingsFile(settings);
}

// Lädt den kompletten Bildschirm als Screenshot (Basis für den Sniping-Zuschnitt).
async function captureScreen() {
  const primary = screen.getPrimaryDisplay();
  const { width, height } = primary.size;
  const scaleFactor = primary.scaleFactor || 1;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(width * scaleFactor),
      height: Math.round(height * scaleFactor)
    }
  });
  const source = sources[0];
  return source && !source.thumbnail.isEmpty() ? source.thumbnail.toDataURL() : null;
}

// Lädt ein PNG (Buffer) per Multipart-Upload in Google Drive hoch.
// Benötigt einen gültigen OAuth-Access-Token mit Drive-Berechtigung.
async function uploadToGoogleDrive(buffer, filename) {
  const settings = await loadSettings();
  const token = settings.googleDriveToken;
  if (!token) {
    return { ok: false, reason: 'no-token' };
  }

  return new Promise((resolve) => {
    const boundary = '----drive-boundary-' + Date.now();
    const metadata = JSON.stringify({ name: filename });
    const multipartBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`
      ),
      Buffer.from(`--${boundary}\r\nContent-Type: image/png\r\n\r\n`),
      buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const req = https.request(
      {
        hostname: 'www.googleapis.com',
        path: '/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': multipartBody.length
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            let file = null;
            try {
              file = JSON.parse(body);
            } catch (err) {
              /* Antwort ohne JSON-Body ignorieren */
            }
            resolve({ ok: true, file });
          } else {
            resolve({ ok: false, reason: 'http-' + res.statusCode });
          }
        });
      }
    );

    req.on('error', (err) => resolve({ ok: false, reason: err.message }));
    req.write(multipartBody);
    req.end();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (DEMO) {
    win.webContents.once('did-finish-load', () => {
      win.setTitle('IT Schulungsmaßnahmen — Demo');
    });
  }
}

ipcMain.handle('load-data', () => {
  return loadData();
});

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('get-settings', () => {
  return loadSettings();
});

ipcMain.handle('save-settings', async (event, settings) => {
  await saveSettings(settings);
  return true;
});

ipcMain.handle('capture-screen', () => {
  return captureScreen();
});

// Speichert einen Screenshot lokal (Bilder-Ordner) und lädt ihn optional zu Google Drive hoch.
ipcMain.handle('save-screenshot', async (event, payload) => {
  const { dataUrl, toDrive } = payload || {};
  if (!dataUrl) {
    return { ok: false, reason: 'no-data' };
  }
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const filename = `screenshot-${Date.now()}.png`;
  const filePath = path.join(app.getPath('pictures'), filename);

  try {
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    return { ok: false, reason: 'write-failed: ' + err.message };
  }

  let drive = null;
  if (toDrive) {
    drive = await uploadToGoogleDrive(buffer, filename);
  }
  return { ok: true, filePath, filename, drive };
});

// Öffnet den Datei-Dialog des Geräts, um eine Datei aus einem Ordner zur Freigabe auszuwählen.
// Optionale "filters" (Electron-Dateityp-Filter) und "multiSelections" (Standard: an) lassen
// sich vom Renderer übergeben, z. B. um den Dialog auf PowerPoint-Dateien einzuschränken.
ipcMain.handle('open-file-dialog', async (event, options) => {
  const { filters, multiSelections = true, title } = options || {};
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  const properties = ['openFile'];
  if (multiSelections) properties.push('multiSelections');
  const result = await dialog.showOpenDialog(win, {
    title: title || 'Datei zur Freigabe auswählen',
    properties,
    ...(Array.isArray(filters) && filters.length ? { filters } : {})
  });
  if (result.canceled || !result.filePaths.length) {
    return { canceled: true, files: [] };
  }
  const files = result.filePaths.map((fp) => {
    let size = 0;
    try {
      size = fs.statSync(fp).size;
    } catch (err) {
      /* Größe optional */
    }
    return { path: fp, name: path.basename(fp), size };
  });
  return { canceled: false, files };
});

// Öffnet die Download-Seite (renderer/download.html) in einem eigenen Fenster.
// Nötig, weil target="_blank"-Links in Electron standardmäßig nicht funktionieren.
ipcMain.handle('open-download-page', () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 700,
    minHeight: 500,
    backgroundColor: '#f2ead9',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'download.html'));
  return true;
});

app.whenReady().then(() => {
  // Kamera-/Mikrofon-Zugriff für den Video-Live-Chat erlauben.
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'mediaKeySystem') {
      callback(true);
      return;
    }
    callback(true);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
