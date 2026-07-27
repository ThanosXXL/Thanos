const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

// True only in builds produced by `npm run dist:demo` (electron-builder bakes
// `demo: true` into the packaged package.json via extraMetadata). Enforced
// here in the main process, not just hidden in the renderer, so a demo build
// can never actually reach testnet/live mode or trigger a withdrawal.
const DEMO_MODE = Boolean(require('./package.json').demo);

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
  'MIN_LIVE_BALANCE',
  'MAX_TRADABLE_CAPITAL',
  'FX_REFRESH_SECONDS',
  'WITHDRAWAL_ASSET',
  'WITHDRAWAL_ADDRESS',
  'WITHDRAWAL_CONFIRM_PHRASE',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'NOTIFY_EMAIL',
];

const DEFAULT_SETTINGS = {
  BINANCE_API_KEY: '',
  BINANCE_API_SECRET: '',
  TRADING_MODE: 'paper',
  LIVE_CONFIRM: '',
  SYMBOL: 'BTCEUR',
  INTERVAL: '1m',
  FAST_MA_PERIOD: '5',
  SLOW_MA_PERIOD: '13',
  RISK_PER_TRADE_PCT: '0.03',
  STOP_LOSS_PCT: '0.006',
  TAKE_PROFIT_PCT: '0.012',
  MAX_DAILY_LOSS_PCT: '0.03',
  MAX_OPEN_POSITIONS: '1',
  PAPER_STARTING_BALANCE: '1000',
  DASHBOARD_PORT: '4173',
  MIN_LIVE_BALANCE: '50',
  MAX_TRADABLE_CAPITAL: '5000',
  FX_REFRESH_SECONDS: '300',
  WITHDRAWAL_ASSET: '',
  WITHDRAWAL_ADDRESS: '',
  WITHDRAWAL_CONFIRM_PHRASE: 'I_CONFIRM_THIS_WITHDRAWAL',
  SMTP_HOST: '',
  SMTP_PORT: '587',
  SMTP_USER: '',
  SMTP_PASS: '',
  NOTIFY_EMAIL: '',
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
  if (DEMO_MODE) {
    // Belt-and-suspenders: even if a modified/tampered renderer sent something
    // else, a demo build only ever persists paper mode with no credentials.
    clean.TRADING_MODE = 'paper';
    clean.BINANCE_API_KEY = '';
    clean.BINANCE_API_SECRET = '';
    clean.LIVE_CONFIRM = '';
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

ipcMain.handle('get-demo-mode', () => DEMO_MODE);

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

ipcMain.handle('withdraw', (_event, settings, amount, confirmPhrase) => {
  if (DEMO_MODE) {
    return Promise.resolve({ ok: false, output: 'Auszahlungen sind in der Demo-Version nicht verfügbar.' });
  }
  return new Promise((resolve) => {
    const clean = saveSettings(settings);
    const child = spawn(
      process.execPath,
      [path.join(__dirname, 'src', 'withdrawCli.js'), '--amount', String(amount), '--confirm', String(confirmPhrase)],
      {
        cwd: __dirname,
        env: { ...process.env, ...clean, ELECTRON_RUN_AS_NODE: '1' },
      }
    );

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      sendLog(chunk.toString());
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
      sendLog(chunk.toString());
    });
    child.on('exit', (code) => {
      resolve({ ok: code === 0, output });
    });
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (agentProcess) agentProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (agentProcess) agentProcess.kill();
});
