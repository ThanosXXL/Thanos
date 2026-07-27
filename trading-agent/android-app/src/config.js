import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@trading_agent_settings_v1';

const KNOWN_QUOTE_ASSETS = ['USDT', 'BUSD', 'USDC', 'FDUSD', 'TRY', 'EUR', 'GBP', 'BTC', 'ETH', 'BNB'];

/** Best-effort quote-asset guess from a Binance symbol, e.g. 'BTCEUR' -> 'EUR'. */
export function extractQuoteAsset(symbol) {
  const match = KNOWN_QUOTE_ASSETS.find((q) => symbol.endsWith(q));
  return match || symbol.slice(-4);
}

/** Parses the comma-separated `symbols` settings field into a clean symbol array. */
export function parseSymbols(symbolsField) {
  return [...new Set(String(symbolsField || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))];
}

export const LIVE_CONFIRM_PHRASE = 'I_UNDERSTAND_THE_RISK';
export const WITHDRAWAL_CONFIRM_PHRASE = 'I_CONFIRM_THIS_WITHDRAWAL';

export const DEFAULT_SETTINGS = {
  binanceApiKey: '',
  binanceApiSecret: '',
  tradingMode: 'paper', // 'paper' | 'testnet' | 'live'
  liveConfirm: '',
  // Comma-separated for simultaneous trading, e.g. "BTCEUR,ETHEUR" — all
  // symbols must share the same quote asset (validated below).
  symbols: 'BTCEUR',
  interval: '1m',
  fastMaPeriod: 5,
  slowMaPeriod: 13,
  riskPerTradePct: 0.03,
  stopLossPct: 0.006,
  takeProfitPct: 0.012,
  maxDailyLossPct: 0.09,
  maxOpenPositions: 1,
  paperStartingBalance: 1000,
  // Live mode refuses to start below this balance, in EUR given the default
  // EUR-quoted symbol above. Fund your Binance account through Binance's own
  // deposit flow — this app never collects deposits.
  minLiveBalance: 50,
  // Caps how much of the balance position-sizing will ever use, even if the real
  // balance is higher. A personal risk ceiling, not a deposit limit.
  maxTradableCapital: 5000,
  // Manual CRYPTO withdrawal only (e.g. BTC/USDT — a real coin with a blockchain
  // address), never automatic, never EUR/fiat/bank transfer. EUR has no
  // blockchain address, so it cannot be set here — do EUR/SEPA withdrawals
  // through Binance's own app to your verified bank account.
  withdrawalAsset: '',
  withdrawalAddress: '',
  // Email address to send a withdrawal summary to via the device's own mail app
  // (Linking/mailto — no SMTP credentials are stored on the device).
  notifyEmail: '',
};

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    // Back-fill: settings saved before multi-symbol support only have `symbol`.
    if (!parsed.symbols && parsed.symbol) merged.symbols = parsed.symbol;
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** Mirrors the safeguards in the desktop CLI's config.js validation. */
export function validateSettings(settings) {
  const errors = [];
  if (!['paper', 'testnet', 'live'].includes(settings.tradingMode)) {
    errors.push('Ungültiger Trading-Modus.');
  }
  if (settings.tradingMode === 'live' && settings.liveConfirm !== LIVE_CONFIRM_PHRASE) {
    errors.push(`Live-Modus erfordert die exakte Bestätigung "${LIVE_CONFIRM_PHRASE}".`);
  }
  if (settings.tradingMode !== 'paper' && (!settings.binanceApiKey || !settings.binanceApiSecret)) {
    errors.push('Testnet-/Live-Modus erfordert API Key und Secret.');
  }
  if (Number(settings.fastMaPeriod) >= Number(settings.slowMaPeriod)) {
    errors.push('Fast-MA-Periode muss kleiner als Slow-MA-Periode sein.');
  }
  const symbols = parseSymbols(settings.symbols);
  if (symbols.length === 0) {
    errors.push('Mindestens ein Symbol erforderlich.');
  } else if (new Set(symbols.map(extractQuoteAsset)).size > 1) {
    errors.push('Alle Symbole müssen dieselbe Quote-Währung haben (z.B. nur *EUR-Paare).');
  }
  if (Number(settings.maxTradableCapital) < Number(settings.minLiveBalance)) {
    errors.push('Maximales Handelskapital muss mindestens dem Mindestguthaben entsprechen.');
  }
  for (const key of ['riskPerTradePct', 'stopLossPct', 'takeProfitPct', 'maxDailyLossPct']) {
    const value = Number(settings[key]);
    if (!Number.isFinite(value) || value <= 0 || value >= 1) {
      errors.push(`${key} muss eine Zahl zwischen 0 und 1 sein (z.B. 0.01 = 1%).`);
    }
  }
  return errors;
}
