import { requestWithdrawal } from './withdrawal.js';
import { WITHDRAWAL_CONFIRM_PHRASE } from './config.js';

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

const amount = arg('amount');
const confirmPhrase = arg('confirm');

if (!amount) {
  console.error(
    `Usage: npm run withdraw -- --amount <menge> --confirm "${WITHDRAWAL_CONFIRM_PHRASE}"\n` +
      'Requires live mode and WITHDRAWAL_ASSET/WITHDRAWAL_ADDRESS set in .env.'
  );
  process.exit(1);
}

requestWithdrawal({ amount, confirmPhrase })
  .then((record) => {
    console.log('Withdrawal submitted:', record);
  })
  .catch((err) => {
    console.error('Withdrawal failed:', err.message);
    process.exit(1);
  });
