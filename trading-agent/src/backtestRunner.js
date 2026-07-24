import { config } from './config.js';
import { getKlines } from './binanceClient.js';
import { createDefaultStrategy } from './strategy/index.js';
import { RiskManager } from './riskManager.js';
import { runBacktest } from './backtester.js';

const CANDLE_LIMIT = 1000;

async function main() {
  const { symbol, interval } = config.market;
  console.log(`Fetching ${CANDLE_LIMIT} historical ${interval} candles for ${symbol}...`);
  const candles = await getKlines(symbol, interval, CANDLE_LIMIT);

  const strategy = createDefaultStrategy();
  const riskManager = new RiskManager();
  const startingBalance = config.paper.startingBalance;

  const { stats, trades } = runBacktest({ candles, strategy, riskManager, startingBalance });

  console.log('\n--- Backtest report (past data only — not a forecast) ---');
  console.log(`Symbol / interval:     ${symbol} / ${interval}`);
  console.log(`Candles replayed:      ${candles.length}`);
  console.log(`Starting balance:      ${stats.startingBalance.toFixed(2)}`);
  console.log(`Final balance:         ${stats.finalBalance.toFixed(2)}`);
  console.log(`Total return:          ${(stats.totalReturnPct * 100).toFixed(2)}%`);
  console.log(`Total trades:          ${stats.totalTrades}`);
  console.log(`Win rate:              ${(stats.winRatePct * 100).toFixed(1)}%`);
  console.log(`Max drawdown:          ${(stats.maxDrawdownPct * 100).toFixed(2)}%`);
  console.log('\nNote: backtests simulate at most one open position at a time and');
  console.log('assume perfect fills at stop-loss/take-profit levels with no fees or');
  console.log('slippage. Real trading results will differ, likely for the worse.');

  if (process.env.BACKTEST_VERBOSE === '1') {
    console.log('\nTrades:');
    for (const t of trades) {
      console.log(
        `  ${t.side} ${t.quantity} @ ${t.entryPrice.toFixed(2)} -> ${t.exitPrice.toFixed(2)} ` +
          `(${t.reason}) pnl=${t.pnl.toFixed(2)}`
      );
    }
  }
}

main().catch((err) => {
  console.error('Backtest failed:', err.message);
  process.exit(1);
});
