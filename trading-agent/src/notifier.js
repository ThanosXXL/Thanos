import nodemailer from 'nodemailer';
import { config } from './config.js';

/**
 * Emails a withdrawal record to your own configured address, for your own
 * bookkeeping. Uses your own SMTP account (SMTP_HOST/USER/PASS in .env) —
 * this project has no email infrastructure of its own. A missing SMTP
 * config or a send failure is logged and swallowed; it never blocks or
 * reverses the withdrawal that already happened.
 */
export async function sendWithdrawalNotification(withdrawalRecord, portfolioSummary) {
  if (!config.smtp.enabled) {
    console.log('[notifier] SMTP not configured, skipping withdrawal email.');
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });

    const tradeLines = (portfolioSummary?.closedTrades || [])
      .slice(-20)
      .map((t) => `${t.exitTime} ${t.side} ${t.quantity} ${t.symbol} pnl=${t.pnl.toFixed(2)} (${t.reason})`)
      .join('\n');

    const text =
      `Auszahlung ausgeführt\n\n` +
      `Zeitpunkt: ${withdrawalRecord.time}\n` +
      `Asset: ${withdrawalRecord.asset}\n` +
      `Betrag: ${withdrawalRecord.amount}\n` +
      `Zieladresse: ${withdrawalRecord.address}\n` +
      `Binance Withdraw ID: ${withdrawalRecord.binanceWithdrawId}\n\n` +
      `Letzte Trades:\n${tradeLines || '(keine)'}\n\n` +
      `Dies ist eine automatische Aufzeichnung für deine eigenen Unterlagen. ` +
      `Diese Software garantiert keinen Gewinn.`;

    await transporter.sendMail({
      from: config.smtp.user || config.smtp.notifyEmail,
      to: config.smtp.notifyEmail,
      subject: `FreshTrades – Auszahlung ${withdrawalRecord.amount} ${withdrawalRecord.asset}`,
      text,
    });

    return { sent: true };
  } catch (err) {
    console.error('[notifier] failed to send withdrawal email:', err.message);
    return { sent: false, reason: err.message };
  }
}
