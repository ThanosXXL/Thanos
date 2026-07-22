const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const dataFilePath = path.join(app.getPath('userData'), 'dozenten-data.json');
const reportDataFilePath = path.join(app.getPath('userData'), 'tagesreport-data.json');

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { dozenten: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

function loadReportData() {
  try {
    const raw = fs.readFileSync(reportDataFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function saveReportData(data) {
  fs.writeFileSync(reportDataFilePath, JSON.stringify(data, null, 2), 'utf-8');
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
}

ipcMain.handle('load-data', () => {
  return loadData();
});

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('report-storage-get', (event, key) => {
  const data = loadReportData();
  return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
});

ipcMain.handle('report-storage-set', (event, key, value) => {
  const data = loadReportData();
  data[key] = value;
  saveReportData(data);
  return true;
});

ipcMain.handle('report-storage-delete', (event, key) => {
  const data = loadReportData();
  delete data[key];
  saveReportData(data);
  return true;
});

ipcMain.handle('report-storage-list', (event, prefix) => {
  const data = loadReportData();
  return Object.keys(data).filter(k => k.startsWith(prefix || ''));
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
