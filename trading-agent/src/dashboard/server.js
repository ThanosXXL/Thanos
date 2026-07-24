import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const TRADES_FILE = path.join(DATA_DIR, 'trades.log');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  let state = { balance: null, startingBalance: null, openPositions: [], updatedAt: null };
  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {
      // leave defaults on parse failure
    }
  }

  let trades = [];
  if (fs.existsSync(TRADES_FILE)) {
    trades = fs
      .readFileSync(TRADES_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .reverse();
  }

  const realizedPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  res.json({
    mode: config.mode,
    symbol: config.market.symbol,
    interval: config.market.interval,
    balance: state.balance,
    startingBalance: state.startingBalance,
    realizedPnl,
    openPositions: state.openPositions || [],
    trades: trades.slice(0, 100),
    updatedAt: state.updatedAt,
  });
});

app.listen(config.dashboard.port, () => {
  console.log(`[dashboard] listening on http://localhost:${config.dashboard.port}`);
});
