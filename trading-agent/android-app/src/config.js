import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@trading_agent_settings_v1';

export const LIVE_CONFIRM_PHRASE = 'I_UNDERSTAND_THE_RISK';

export const DEFAULT_SETTINGS = {
  binanceApiKey: '',
  binanceApiSecret: '',
  tradingMode: 'paper', // 'paper' | 'testnet' | 'live'
  liveConfirm: '',
  symbol: 'BTCUSDT',
  interval: '1m',
  fastMaPeriod: 5,
  slowMaPeriod: 13,
  riskPerTradePct: 0.01,
  stopLossPct: 0.006,
  takeProfitPct: 0.012,
  maxDailyLossPct: 0.03,
  maxOpenPositions: 1,
  paperStartingBalance: 1000,
};

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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
  for (const key of ['riskPerTradePct', 'stopLossPct', 'takeProfitPct', 'maxDailyLossPct']) {
    const value = Number(settings[key]);
    if (!Number.isFinite(value) || value <= 0 || value >= 1) {
      errors.push(`${key} muss eine Zahl zwischen 0 und 1 sein (z.B. 0.01 = 1%).`);
    }
  }
  return errors;
}
