const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const SETTINGS_FIELDS = [
  'BINANCE_API_KEY',
  'BINANCE_API_SECRET',
  'TRADING_MODE',
  'LIVE_CONFIRM',
  'SYMBOL',
  'INTERVAL',
  'FAST_MA_PERIOD',
  'SLOW_MA_PERIOD',
  'RISK_PER_TRADE_PCT',
  'STOP_LOSS_PCT',
  'TAKE_PROFIT_PCT',
  'MAX_DAILY_LOSS_PCT',
  'MAX_OPEN_POSITIONS',
  'PAPER_STARTING_BALANCE',
  'DASHBOARD_PORT',
];

const DEFAULT_SETTINGS = {
  BINANCE_API_KEY: '',
  BINANCE_API_SECRET: '',
  TRADING_MODE: 'paper',
  LIVE_CONFIRM: '',
  SYMBOL: 'BTCUSDT',
  INTERVAL: '1m',
  FAST_MA_PERIOD: '5',
  SLOW_MA_PERIOD: '13',
  RISK_PER_TRADE_PCT: '0.01',
  STOP_LOSS_PCT: '0.006',
  TAKE_PROFIT_PCT: '0.012',
  MAX_DAILY_LOSS_PCT: '0.03',
  MAX_OPEN_POSITIONS: '1',
  PAPER_STARTING_BALANCE: '1000',
  DASHBOARD_PORT: '4173',
};

let mainWindow = null;
let agentProcess = null;

function settingsPath() {
  return path.join(app.getPath('userData'), 'trading-agent-settings.json');
}

function loadSettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    return { ...DEFAULT_SETTINGS, ...raw };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  const clean = {};
  for (const key of SETTINGS_FIELDS) {
    clean[key] = String(settings[key] ?? DEFAULT_SETTINGS[key] ?? '');
  }
  fs.writeFileSync(settingsPath(), JSON.stringify(clean, null, 2));
  return clean;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'electron-renderer', 'index.html'));
}

function sendLog(line) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('agent-log', line);
  }
}

function sendRunState(running) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('agent-run-state', running);
  }
}

ipcMain.handle('get-settings', () => loadSettings());

ipcMain.handle('save-settings', (_event, settings) => saveSettings(settings));

ipcMain.handle('start-agent', (_event, settings) => {
  if (agentProcess) {
    return { ok: false, error: 'Agent läuft bereits.' };
  }
  const clean = saveSettings(settings);

  agentProcess = spawn(process.execPath, [path.join(__dirname, 'electron-run.js')], {
    cwd: __dirname,
    env: {
      ...process.env,
      ...clean,
      ELECTRON_RUN_AS_NODE: '1',
    },
  });

  agentProcess.stdout.on('data', (chunk) => sendLog(chunk.toString()));
  agentProcess.stderr.on('data', (chunk) => sendLog(chunk.toString()));
  agentProcess.on('exit', (code) => {
    sendLog(`\n[desktop] Agent-Prozess beendet (code ${code}).\n`);
    agentProcess = null;
    sendRunState(false);
  });

  sendRunState(true);
  return { ok: true, dashboardPort: Number(clean.DASHBOARD_PORT) };
});

ipcMain.handle('stop-agent', () => {
  if (!agentProcess) return { ok: false, error: 'Agent läuft nicht.' };
  agentProcess.kill();
  agentProcess = null;
  sendRunState(false);
  return { ok: true };
});

ipcMain.handle('get-run-state', () => Boolean(agentProcess));

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (agentProcess) agentProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (agentProcess) agentProcess.kill();
});
