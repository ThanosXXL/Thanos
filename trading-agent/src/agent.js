import { config, extractQuoteAsset } from './config.js';
import { getKlines, getAccount, placeOrder, subscribeKlines } from './binanceClient.js';
import { RiskManager } from './riskManager.js';
import { createDefaultStrategy } from './strategy/index.js';
import { Portfolio } from './portfolio.js';

async function getStartingBalance(symbol) {
  if (config.mode === 'paper') return config.paper.startingBalance;
  const account = await getAccount();
  const quoteAsset = extractQuoteAsset(symbol);
  const entry = account.balances.find((b) => b.asset === quoteAsset);
  if (!entry) throw new Error(`No ${quoteAsset} balance found on this account.`);
  return Number(entry.free);
}

/**
 * Wires config, market data, strategy, risk management, and portfolio
 * tracking into a running agent. Places real orders only when
 * config.mode is 'testnet' or 'live' (never in 'paper').
 *
 * Supports one or several symbols (config.market.symbols) traded concurrently:
 * each symbol gets its own strategy instance and kline subscription, but all
 * of them share one Portfolio and one RiskManager, so MAX_OPEN_POSITIONS and
 * MAX_DAILY_LOSS_PCT are enforced account-wide, not per symbol — trading more
 * symbols means more chances to enter a trade, not a bigger risk budget.
 *
 * KNOWN LIMITATION: order quantities are rounded to a fixed precision and
 * do not query Binance's exchangeInfo LOT_SIZE/MIN_NOTIONAL filters. Before
 * running this against testnet or live with a real symbol, verify the
 * rounded quantity satisfies that symbol's filters, or extend
 * binanceClient.js to fetch and apply them.
 */
export async function startAgent() {
  const { symbols, interval } = config.market;
  console.log(`[agent] starting in ${config.mode.toUpperCase()} mode for ${symbols.join(', ')} @ ${interval}`);
  if (config.mode === 'paper') {
    console.log('[agent] paper mode: no real orders will be sent, fills are simulated.');
  }

  const startingBalance = await getStartingBalance(symbols[0]);

  if (config.mode === 'live' && startingBalance < config.minLiveBalance) {
    throw new Error(
      `Live mode requires a balance of at least ${config.minLiveBalance} (quote-asset units); ` +
        `current balance is ${startingBalance}. Fund your Binance account through Binance's own ` +
        'deposit flow (card/SEPA/etc.) first — this project does not process deposits itself.'
    );
  }

  const portfolio = new Portfolio(startingBalance);
  const riskManager = new RiskManager();

  const strategies = new Map();
  for (const symbol of symbols) {
    const strategy = createDefaultStrategy();
    const warmupCount = config.strategy.slowMaPeriod * 3;
    console.log(`[agent] warming up ${symbol} strategy with ${warmupCount} historical candles...`);
    const history = await getKlines(symbol, interval, warmupCount);
    for (const candle of history) {
      strategy.onClosedCandle(candle);
    }
    strategies.set(symbol, strategy);
  }
  riskManager.rollDailyWindow(portfolio.balance);

  async function handleTick(symbol, candle, isFinal) {
    const triggered = portfolio.findTriggeredExits(symbol, candle.close);
    for (const { position, reason } of triggered) {
      if (config.mode !== 'paper') {
        const closingSide = position.side === 'BUY' ? 'SELL' : 'BUY';
        await placeOrder({ symbol: position.symbol, side: closingSide, type: 'MARKET', quantity: position.quantity });
      }
      const trade = portfolio.closePosition(position.id, candle.close, reason);
      riskManager.recordRealizedPnl(trade.pnl);
      console.log(
        `[agent] closed ${position.side} ${position.quantity} ${position.symbol} @ ${candle.close} ` +
          `(${reason}), pnl=${trade.pnl.toFixed(2)}`
      );
    }

    if (!isFinal) return;

    riskManager.rollDailyWindow(portfolio.balance);
    const signal = strategies.get(symbol).onClosedCandle(candle);
    if (signal === 'HOLD') return;

    // One open position per symbol at a time — a symbol that reverses signal
    // while its existing position is still open waits for that exit first,
    // rather than stacking a second, opposite-direction position on top.
    if (portfolio.openPositions.some((p) => p.symbol === symbol)) return;

    if (!riskManager.canOpenNewPosition(portfolio.openPositions.length)) {
      if (riskManager.isKillSwitchTriggered()) {
        console.warn('[agent] daily loss limit reached — not opening new positions today.');
      }
      return;
    }

    const entryPrice = candle.close;
    const sizingBalance = Math.min(portfolio.balance, config.maxTradableCapital);
    const rawQuantity = riskManager.sizePosition({ balance: sizingBalance, price: entryPrice });
    const quantity = Number(rawQuantity.toFixed(6));
    if (quantity <= 0) return;

    if (config.mode !== 'paper') {
      await placeOrder({ symbol, side: signal, type: 'MARKET', quantity });
    }

    const stopLoss = riskManager.computeStopLossPrice(entryPrice, signal);
    const takeProfit = riskManager.computeTakeProfitPrice(entryPrice, signal);
    portfolio.openPosition({ symbol, side: signal, entryPrice, quantity, stopLoss, takeProfit });
    console.log(
      `[agent] opened ${signal} ${quantity} ${symbol} @ ${entryPrice} ` +
        `(SL ${stopLoss.toFixed(2)} / TP ${takeProfit.toFixed(2)})`
    );
  }

  console.log('[agent] subscribing to live price streams...');
  const unsubscribes = symbols.map((symbol) =>
    subscribeKlines(symbol, interval, (candle, isFinal) => {
      handleTick(symbol, candle, isFinal).catch((err) =>
        console.error(`[agent] error handling tick for ${symbol}:`, err.message)
      );
    })
  );
  const stop = () => unsubscribes.forEach((unsubscribe) => unsubscribe());

  process.on('SIGINT', () => {
    console.log('\n[agent] shutting down...');
    stop();
    process.exit(0);
  });

  return { portfolio, riskManager, strategies, stop };
}
