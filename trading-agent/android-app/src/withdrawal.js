import AsyncStorage from '@react-native-async-storage/async-storage';
import { withdraw as binanceWithdraw } from './binanceClient';
import { WITHDRAWAL_CONFIRM_PHRASE } from './config';

const WITHDRAWALS_KEY = '@trading_agent_withdrawals_v1';

/**
 * Triggers a real crypto withdrawal. Never called automatically — only from
 * an explicit button press in the UI. Requires live mode, a configured
 * withdrawal address, and the exact confirmation phrase, mirroring the
 * desktop CLI's withdrawal.js safeguard.
 *
 * This app never collects deposits or initiates bank transfers itself — for
 * fiat, withdraw from Binance directly to your verified bank account through
 * Binance's own app.
 */
export async function requestWithdrawal(settings, { amount, confirmPhrase }) {
  if (settings.tradingMode !== 'live') {
    throw new Error('Auszahlungen sind nur im Live-Modus möglich.');
  }
  if (!settings.withdrawalAsset || !settings.withdrawalAddress) {
    throw new Error('Auszahlung nicht konfiguriert: Asset und Zieladresse in den Einstellungen setzen.');
  }
  if (confirmPhrase !== WITHDRAWAL_CONFIRM_PHRASE) {
    throw new Error(`Auszahlung erfordert die exakte Bestätigung "${WITHDRAWAL_CONFIRM_PHRASE}".`);
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Der Betrag muss eine positive Zahl sein.');
  }

  const result = await binanceWithdraw(settings, {
    coin: settings.withdrawalAsset,
    address: settings.withdrawalAddress,
    amount: numericAmount,
  });

  const record = {
    time: new Date().toISOString(),
    asset: settings.withdrawalAsset,
    address: settings.withdrawalAddress,
    amount: numericAmount,
    binanceWithdrawId: result.id,
  };

  const raw = await AsyncStorage.getItem(WITHDRAWALS_KEY);
  const history = raw ? JSON.parse(raw) : [];
  history.push(record);
  await AsyncStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(history));

  return record;
}

export async function readWithdrawalHistory() {
  const raw = await AsyncStorage.getItem(WITHDRAWALS_KEY);
  return raw ? JSON.parse(raw) : [];
}
