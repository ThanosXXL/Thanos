import { config } from './config.js';
import { getKlines, getAccount, placeOrder, subscribeKlines } from './binanceClient.js';
import { RiskManager } from './riskManager.js';
import { createDefaultStrategy } from './strategy/index.js';
import { Portfolio } from './portfolio.js';

const KNOWN_QUOTE_ASSETS = ['USDT', 'BUSD', 'USDC', 'FDUSD', 'TRY', 'EUR', 'GBP', 'BTC', 'ETH', 'BNB'];

function extractQuoteAsset(symbol) {
  const match = KNOWN_QUOTE_ASSETS.find((q) => symbol.endsWith(q));
  return match || symbol.slice(-4);
}

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
 * KNOWN LIMITATION: order quantities are rounded to a fixed precision and
 * do not query Binance's exchangeInfo LOT_SIZE/MIN_NOTIONAL filters. Before
 * running this against testnet or live with a real symbol, verify the
 * rounded quantity satisfies that symbol's filters, or extend
 * binanceClient.js to fetch and apply them.
 */
export async function startAgent() {
  const { symbol, interval } = config.market;
  console.log(`[agent] starting in ${config.mode.toUpperCase()} mode for ${symbol} @ ${interval}`);
  if (config.mode === 'paper') {
    console.log('[agent] paper mode: no real orders will be sent, fills are simulated.');
  }

  const startingBalance = await getStartingBalance(symbol);

  if (config.mode === 'live' && startingBalance < config.minLiveBalance) {
    throw new Error(
      `Live mode requires a balance of at least ${config.minLiveBalance} (quote-asset units); ` +
        `current balance is ${startingBalance}. Fund your Binance account through Binance's own ` +
        'deposit flow (card/SEPA/etc.) first — this project does not process deposits itself.'
    );
  }

  const portfolio = new Portfolio(startingBalance);
  const riskManager = new RiskManager();
  const strategy = createDefaultStrategy();

  const warmupCount = config.strategy.slowMaPeriod * 3;
  console.log(`[agent] warming up strategy with ${warmupCount} historical candles...`);
  const history = await getKlines(symbol, interval, warmupCount);
  for (const candle of history) {
    strategy.onClosedCandle(candle);
  }
  riskManager.rollDailyWindow(portfolio.balance);

  async function handleTick(candle, isFinal) {
    const triggered = portfolio.findTriggeredExits(candle.close);
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
    const signal = strategy.onClosedCandle(candle);
    if (signal === 'HOLD') return;

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

  console.log('[agent] subscribing to live price stream...');
  const unsubscribe = subscribeKlines(symbol, interval, (candle, isFinal) => {
    handleTick(candle, isFinal).catch((err) => console.error('[agent] error handling tick:', err.message));
  });

  process.on('SIGINT', () => {
    console.log('\n[agent] shutting down...');
    unsubscribe();
    process.exit(0);
  });

  return { portfolio, riskManager, strategy };
}
