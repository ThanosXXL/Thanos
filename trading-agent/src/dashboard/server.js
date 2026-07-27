import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { getUsdEurRate } from '../fxRate.js';
import { getExchangeInfo, getTicker24hr, subscribeBookTicker } from '../binanceClient.js';
import { readWithdrawalHistory } from '../withdrawal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const TRADES_FILE = path.join(DATA_DIR, 'trades.log');

let marketsCache = { markets: [], fetchedAt: 0 };
const MARKETS_CACHE_MS = 60 * 60 * 1000;

// Prices move constantly, unlike the symbol list itself, so this is cached
// far more briefly — just long enough to absorb the dashboard's own polling.
let tickerCache = { bySymbol: new Map(), fetchedAt: 0 };
const TICKER_CACHE_MS = 8 * 1000;

// Live buy/sell (ask/bid) price for the currently-traded symbol, pushed by a
// standing Binance WebSocket subscription (sub-second updates) rather than
// polled — kept as the last known value and fanned out to browser clients
// over Server-Sent Events the instant it changes.
let latestBook = null;
const bookStreamClients = new Set();

function broadcastBook(book) {
  latestBook = book;
  const payload = `data: ${JSON.stringify(book)}\n\n`;
  for (const res of bookStreamClients) res.write(payload);
}

// subscribeBookTicker reconnects on its own if Binance drops the stream.
subscribeBookTicker(config.market.symbol, broadcastBook);

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
    maxTradableCapital: config.maxTradableCapital,
    openPositions: state.openPositions || [],
    trades: trades.slice(0, 100),
    withdrawals: readWithdrawalHistory(),
    updatedAt: state.updatedAt,
  });
});

app.get('/api/fx', async (req, res) => {
  const fx = await getUsdEurRate();
  res.json(fx);
});

// One-off snapshot of the last known live price — a REST fallback for any
// client that isn't using the push stream below.
app.get('/api/book', (req, res) => {
  if (!latestBook) return res.status(503).json({ error: 'Noch keine Live-Preisdaten empfangen.' });
  res.json(latestBook);
});

// Continuous push feed: emits a new event the instant Binance reports a
// best-bid/best-ask change, instead of the client polling on a timer.
app.get('/api/book/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');
  if (latestBook) res.write(`data: ${JSON.stringify(latestBook)}\n\n`);

  bookStreamClients.add(res);
  req.on('close', () => bookStreamClients.delete(res));
});

app.get('/api/markets', async (req, res) => {
  const age = Date.now() - marketsCache.fetchedAt;
  if (marketsCache.markets.length === 0 || age > MARKETS_CACHE_MS) {
    try {
      marketsCache = { markets: await getExchangeInfo(), fetchedAt: Date.now() };
    } catch (err) {
      if (marketsCache.markets.length === 0) {
        return res.status(502).json({ error: err.message });
      }
      // serve stale cache on a refresh failure rather than erroring out
    }
  }

  const tickerAge = Date.now() - tickerCache.fetchedAt;
  if (tickerAge > TICKER_CACHE_MS) {
    try {
      const tickers = await getTicker24hr();
      tickerCache = { bySymbol: new Map(tickers.map((t) => [t.symbol, t])), fetchedAt: Date.now() };
    } catch {
      // keep serving the symbol list without live prices rather than erroring out
    }
  }

  const markets = marketsCache.markets.map((m) => {
    const ticker = tickerCache.bySymbol.get(m.symbol);
    return {
      ...m,
      lastPrice: ticker ? ticker.lastPrice : null,
      priceChangePercent: ticker ? ticker.priceChangePercent : null,
    };
  });

  res.json({ markets });
});

app.listen(config.dashboard.port, () => {
  console.log(`[dashboard] listening on http://localhost:${config.dashboard.port}`);
});
