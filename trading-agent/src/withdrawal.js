import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, WITHDRAWAL_CONFIRM_PHRASE } from './config.js';
import { withdraw as binanceWithdraw } from './binanceClient.js';
import { Portfolio } from './portfolio.js';
import { sendWithdrawalNotification } from './notifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WITHDRAWALS_FILE = path.join(__dirname, '..', 'data', 'withdrawals.log');

/**
 * Triggers a real crypto withdrawal. Never called automatically by the agent —
 * only in response to an explicit user action (CLI command, desktop button).
 * Requires live mode, a configured withdrawal address, and the exact
 * confirmation phrase, mirroring the LIVE_CONFIRM safeguard for live trading.
 *
 * This project does not process fiat deposits or initiate bank transfers
 * itself. For fiat, withdraw from Binance directly to your verified bank
 * account through Binance's own app/website.
 */
export async function requestWithdrawal({ amount, confirmPhrase }) {
  if (config.mode !== 'live') {
    throw new Error('Withdrawals are only available in live mode (this moves real funds).');
  }
  if (!config.withdrawal.enabled) {
    throw new Error('Withdrawals are not configured: set WITHDRAWAL_ASSET and WITHDRAWAL_ADDRESS in .env.');
  }
  if (confirmPhrase !== WITHDRAWAL_CONFIRM_PHRASE) {
    throw new Error(`Withdrawal requires the exact confirmation phrase: "${WITHDRAWAL_CONFIRM_PHRASE}".`);
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Withdrawal amount must be a positive number.');
  }

  const result = await binanceWithdraw({
    coin: config.withdrawal.asset,
    address: config.withdrawal.address,
    amount: numericAmount,
  });

  const record = {
    time: new Date().toISOString(),
    asset: config.withdrawal.asset,
    address: config.withdrawal.address,
    amount: numericAmount,
    binanceWithdrawId: result.id,
  };
  fs.mkdirSync(path.dirname(WITHDRAWALS_FILE), { recursive: true });
  fs.appendFileSync(WITHDRAWALS_FILE, `${JSON.stringify(record)}\n`);

  const portfolioSummary = new Portfolio(0).summary();
  await sendWithdrawalNotification(record, portfolioSummary);

  return record;
}

export function readWithdrawalHistory() {
  if (!fs.existsSync(WITHDRAWALS_FILE)) return [];
  return fs
    .readFileSync(WITHDRAWALS_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
