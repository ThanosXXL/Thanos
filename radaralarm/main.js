const { app, BrowserWindow, ipcMain, session, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const userDataDir = app.getPath('userData');
const dataFilePath = path.join(userDataDir, 'radaralarm-data.json');

// Demoversion: bewusst begrenzter Umfang, serverseitig (main-Prozess) durchgesetzt,
// nicht nur in der UI, damit die Demo-Grenze nicht einfach umgangen werden kann.
const DEMO_MAX_PROJECTS = 2;
const DEMO_MAX_DEFECTS_PER_PROJECT = 8;

const ALLOWED_EXTERNAL_HOSTS = new Set(['github.com']);

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.projects) ? parsed : { projects: [] };
  } catch (err) {
    return { projects: [] };
  }
}

function isValidComment(c) {
  return c && typeof c === 'object' && typeof c.id === 'string' && typeof c.text === 'string';
}

function isValidActivity(a) {
  return a && typeof a === 'object' && typeof a.id === 'string' && typeof a.text === 'string';
}

function isValidDefect(d) {
  if (!d || typeof d !== 'object') return false;
  if (typeof d.id !== 'string' || typeof d.title !== 'string') return false;
  if (!Array.isArray(d.comments) || !d.comments.every(isValidComment)) return false;
  if (!Array.isArray(d.activity) || !d.activity.every(isValidActivity)) return false;
  return true;
}

function isValidTeamMember(t) {
  return t && typeof t === 'object' && typeof t.id === 'string' && typeof t.name === 'string';
}

function isValidFloor(f) {
  return f && typeof f === 'object' && typeof f.id === 'string' && typeof f.name === 'string';
}

function isValidData(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.projects)) return false;
  if (data.projects.length > DEMO_MAX_PROJECTS) return false;
  return data.projects.every((p) => {
    if (!p || typeof p !== 'object') return false;
    if (typeof p.id !== 'string' || typeof p.name !== 'string') return false;
    if (!Array.isArray(p.defects) || !Array.isArray(p.pins)) return false;
    if (!Array.isArray(p.floors) || !p.floors.every(isValidFloor)) return false;
    if (!Array.isArray(p.team) || !p.team.every(isValidTeamMember)) return false;
    if (p.defects.length > DEMO_MAX_DEFECTS_PER_PROJECT) return false;
    return p.defects.every(isValidDefect);
  });
}

function saveData(data) {
  if (!isValidData(data)) {
    throw new Error('Ungültiges Datenformat oder Demo-Grenze überschritten');
  }
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function pickImage() {
  const result = await dialog.showOpenDialog({
    title: 'Bild auswählen',
    properties: ['openFile'],
    filters: [{ name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
  });
  if (result.canceled || !result.filePaths.length) return null;

  const filePath = result.filePaths[0];
  const stat = fs.statSync(filePath);
  if (stat.size > 8 * 1024 * 1024) {
    throw new Error('Bild ist zu groß (max. 8 MB)');
  }
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }[ext];
  if (!mime) throw new Error('Nicht unterstütztes Bildformat');

  const buffer = fs.readFileSync(filePath);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function exportPdfReport(html, suggestedName) {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  });
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdfBuffer = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
    const result = await dialog.showSaveDialog({
      title: 'Mängelbericht speichern',
      defaultPath: suggestedName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (result.canceled || !result.filePath) return false;
    fs.writeFileSync(result.filePath, pdfBuffer);
    return true;
  } finally {
    win.destroy();
  }
}

async function exportCsvReport(csv, suggestedName) {
  const result = await dialog.showSaveDialog({
    title: 'CSV-Export speichern',
    defaultPath: suggestedName,
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (result.canceled || !result.filePath) return false;
  fs.writeFileSync(result.filePath, '﻿' + csv, 'utf-8');
  return true;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#0b0b0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged
    }
  });

  win.setMenuBarVisibility(false);
  win.removeMenu();

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  return win;
}

function setupContentSecurityPolicy() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none';"
        ]
      }
    });
  });
}

ipcMain.handle('load-data', () => loadData());

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('pick-image', () => pickImage());

ipcMain.handle('get-demo-limits', () => ({
  maxProjects: DEMO_MAX_PROJECTS,
  maxDefectsPerProject: DEMO_MAX_DEFECTS_PER_PROJECT
}));

ipcMain.handle('open-external', (event, url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    return false;
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname)) {
    return false;
  }
  shell.openExternal(parsed.toString());
  return true;
});

ipcMain.handle('export-pdf-report', (event, { html, suggestedName }) => exportPdfReport(html, suggestedName));

ipcMain.handle('export-csv-report', (event, { csv, suggestedName }) => exportCsvReport(csv, suggestedName));

ipcMain.handle('notify', (event, { title, body }) => {
  const { Notification } = require('electron');
  if (Notification.isSupported()) {
    new Notification({ title: String(title).slice(0, 200), body: String(body).slice(0, 500) }).show();
  }
});

app.whenReady().then(() => {
  setupContentSecurityPolicy();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
