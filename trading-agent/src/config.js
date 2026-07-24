import 'dotenv/config';

const REQUIRED_NUMERIC = [
  'FAST_MA_PERIOD',
  'SLOW_MA_PERIOD',
  'RISK_PER_TRADE_PCT',
  'STOP_LOSS_PCT',
  'TAKE_PROFIT_PCT',
  'MAX_DAILY_LOSS_PCT',
  'MAX_OPEN_POSITIONS',
];

function requireNumber(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Env var ${name} must be a number, got: ${raw}`);
  }
  return value;
}

for (const name of REQUIRED_NUMERIC) {
  requireNumber(name);
}

const mode = (process.env.TRADING_MODE || 'paper').toLowerCase();
if (!['paper', 'testnet', 'live'].includes(mode)) {
  throw new Error(`TRADING_MODE must be one of paper|testnet|live, got: ${mode}`);
}

export const LIVE_CONFIRM_PHRASE = 'I_UNDERSTAND_THE_RISK';
export const WITHDRAWAL_CONFIRM_PHRASE = process.env.WITHDRAWAL_CONFIRM_PHRASE || 'I_CONFIRM_THIS_WITHDRAWAL';

if (mode === 'live' && process.env.LIVE_CONFIRM !== LIVE_CONFIRM_PHRASE) {
  throw new Error(
    `TRADING_MODE=live requires LIVE_CONFIRM=${LIVE_CONFIRM_PHRASE} in your .env. ` +
      'This is a deliberate safeguard: live mode places real orders with real money. ' +
      'No strategy in this project guarantees profit. Only proceed if you accept the risk of loss.'
  );
}

if (mode === 'live' && (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET)) {
  throw new Error('TRADING_MODE=live requires BINANCE_API_KEY and BINANCE_API_SECRET.');
}

export const config = {
  mode,
  isLive: mode === 'live',
  binance: {
    apiKey: process.env.BINANCE_API_KEY || '',
    apiSecret: process.env.BINANCE_API_SECRET || '',
    // Public market data (klines, price stream) always comes from production Binance,
    // in every mode including paper/testnet: it's unauthenticated, free, and testnet's
    // sandboxed order book does not track real prices closely enough to paper-trade against.
    publicRestBaseUrl: 'https://api.binance.com',
    wsBaseUrl: 'wss://stream.binance.com:9443/ws',
    // Signed calls (account balance, order placement) go to testnet unless mode is live —
    // paper mode never calls these (see agent.js), so this only matters for testnet/live.
    signedRestBaseUrl: mode === 'live' ? 'https://api.binance.com' : 'https://testnet.binance.vision',
  },
  market: {
    symbol: (process.env.SYMBOL || 'BTCUSDT').toUpperCase(),
    interval: process.env.INTERVAL || '5m',
  },
  strategy: {
    fastMaPeriod: requireNumber('FAST_MA_PERIOD'),
    slowMaPeriod: requireNumber('SLOW_MA_PERIOD'),
  },
  risk: {
    riskPerTradePct: requireNumber('RISK_PER_TRADE_PCT'),
    stopLossPct: requireNumber('STOP_LOSS_PCT'),
    takeProfitPct: requireNumber('TAKE_PROFIT_PCT'),
    maxDailyLossPct: requireNumber('MAX_DAILY_LOSS_PCT'),
    maxOpenPositions: requireNumber('MAX_OPEN_POSITIONS'),
  },
  paper: {
    startingBalance: Number(process.env.PAPER_STARTING_BALANCE || 1000),
  },
  dashboard: {
    port: Number(process.env.DASHBOARD_PORT || 4173),
  },
  // Live mode refuses to start below this quote-asset balance. This project never
  // collects deposits itself — fund your Binance account directly through Binance's
  // own app/website (card, SEPA, etc.), which already handles that as a licensed
  // exchange. This is just a local safety floor before the agent risks real orders.
  minLiveBalance: Number(process.env.MIN_LIVE_BALANCE || 50),
  // Optional manual crypto withdrawal to an address you control. Never automatic,
  // never fiat/bank transfer — this project does not initiate bank transfers itself;
  // do that through Binance's own withdrawal flow to your verified bank account.
  withdrawal: {
    asset: process.env.WITHDRAWAL_ASSET || '',
    address: process.env.WITHDRAWAL_ADDRESS || '',
    enabled: Boolean(process.env.WITHDRAWAL_ASSET && process.env.WITHDRAWAL_ADDRESS),
  },
  // Optional: emails a record to yourself after each withdrawal you trigger, using
  // your own SMTP account. A missing/failed email never blocks the withdrawal itself.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    notifyEmail: process.env.NOTIFY_EMAIL || '',
    enabled: Boolean(process.env.SMTP_HOST && process.env.NOTIFY_EMAIL),
  },
};

if (config.strategy.fastMaPeriod >= config.strategy.slowMaPeriod) {
  throw new Error('FAST_MA_PERIOD must be smaller than SLOW_MA_PERIOD');
}
