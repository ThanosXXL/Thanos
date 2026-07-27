import { getKlines, getAccount, placeOrder, subscribeKlines } from './binanceClient';
import { RiskManager } from './riskManager';
import { createDefaultStrategy } from './strategy/index';
import { Portfolio } from './portfolio';
import { appendLog } from './logStore';
import { extractQuoteAsset, parseSymbols } from './config';

/**
 * Mobile port of the desktop CLI's src/agent.js. Same wiring — market data,
 * strategy, risk manager, portfolio — adapted to run inside a React Native
 * foreground service instead of a Node process. Places real orders only
 * when settings.tradingMode is 'testnet' or 'live' (never 'paper').
 *
 * Supports one or several symbols (settings.symbols, comma-separated) traded
 * concurrently: each symbol gets its own strategy instance and kline
 * subscription, but all of them share one Portfolio and one RiskManager, so
 * maxDailyLossPct/maxOpenPositions are enforced account-wide, not per symbol.
 *
 * KNOWN LIMITATION: shares the desktop version's lack of exchangeInfo
 * LOT_SIZE/MIN_NOTIONAL filter handling — quantities are rounded to a fixed
 * precision only.
 */
export class TradingAgent {
  constructor(settings) {
    this.settings = settings;
    this.unsubscribes = [];
    this.running = false;
    this.portfolio = null;
    this.riskManager = null;
    this.strategies = new Map();
  }

  async start() {
    if (this.running) return;
    const symbols = parseSymbols(this.settings.symbols);
    const { interval, tradingMode } = this.settings;

    await appendLog(`Starte Agent im Modus ${tradingMode.toUpperCase()} für ${symbols.join(', ')} @ ${interval}`);

    const startingBalance =
      tradingMode === 'paper' ? Number(this.settings.paperStartingBalance) : await this._getStartingBalance(symbols[0]);

    if (tradingMode === 'live' && startingBalance < Number(this.settings.minLiveBalance)) {
      throw new Error(
        `Live-Modus erfordert mindestens ${this.settings.minLiveBalance} Guthaben; ` +
          `aktuell: ${startingBalance}. Guthaben direkt über Binance einzahlen — diese App sammelt keine Einzahlungen.`
      );
    }

    this.portfolio = new Portfolio(startingBalance);
    await this.portfolio.load();

    this.riskManager = new RiskManager({
      riskPerTradePct: Number(this.settings.riskPerTradePct),
      stopLossPct: Number(this.settings.stopLossPct),
      takeProfitPct: Number(this.settings.takeProfitPct),
      maxDailyLossPct: Number(this.settings.maxDailyLossPct),
      maxOpenPositions: Number(this.settings.maxOpenPositions),
    });

    for (const symbol of symbols) {
      const strategy = createDefaultStrategy(this.settings);
      const warmupCount = Number(this.settings.slowMaPeriod) * 3;
      await appendLog(`Wärme ${symbol}-Strategie mit ${warmupCount} historischen Kerzen auf...`);
      const history = await getKlines(this.settings, symbol, interval, warmupCount);
      for (const candle of history) strategy.onClosedCandle(candle);
      this.strategies.set(symbol, strategy);
    }
    this.riskManager.rollDailyWindow(this.portfolio.balance);

    this.running = true;
    this.unsubscribes = symbols.map((symbol) =>
      subscribeKlines(
        symbol,
        interval,
        (candle, isFinal) => {
          this._handleTick(symbol, candle, isFinal).catch((err) => appendLog(`Fehler: ${err.message}`));
        },
        (err) => appendLog(`WebSocket-Fehler (${symbol}): ${err.message || String(err)}`)
      )
    );
    await appendLog('Agent läuft, Preisstreams abonniert.');
  }

  async _getStartingBalance(primarySymbol) {
    const account = await getAccount(this.settings);
    const quoteAsset = extractQuoteAsset(primarySymbol);
    const entry = account.balances.find((b) => b.asset === quoteAsset);
    if (!entry) throw new Error(`Kein ${quoteAsset}-Guthaben auf diesem Konto gefunden.`);
    return Number(entry.free);
  }

  async _handleTick(symbol, candle, isFinal) {
    const triggered = this.portfolio.findTriggeredExits(symbol, candle.close);
    for (const { position, reason } of triggered) {
      if (this.settings.tradingMode !== 'paper') {
        const closingSide = position.side === 'BUY' ? 'SELL' : 'BUY';
        await placeOrder(this.settings, {
          symbol: position.symbol,
          side: closingSide,
          type: 'MARKET',
          quantity: position.quantity,
        });
      }
      const trade = await this.portfolio.closePosition(position.id, candle.close, reason);
      this.riskManager.recordRealizedPnl(trade.pnl);
      await appendLog(
        `Geschlossen: ${position.side} ${position.quantity} ${position.symbol} @ ${candle.close} ` +
          `(${reason}) PnL=${trade.pnl.toFixed(2)}`
      );
    }

    if (!isFinal) return;

    this.riskManager.rollDailyWindow(this.portfolio.balance);
    const signal = this.strategies.get(symbol).onClosedCandle(candle);
    if (signal === 'HOLD') return;

    // One open position per symbol at a time — a symbol that reverses signal
    // while its existing position is still open waits for that exit first.
    if (this.portfolio.openPositions.some((p) => p.symbol === symbol)) return;

    if (!this.riskManager.canOpenNewPosition(this.portfolio.openPositions.length)) {
      if (this.riskManager.isKillSwitchTriggered()) {
        await appendLog('Tagesverlust-Limit erreicht — keine neuen Positionen heute.');
      }
      return;
    }

    const entryPrice = candle.close;
    const sizingBalance = Math.min(this.portfolio.balance, Number(this.settings.maxTradableCapital));
    const rawQuantity = this.riskManager.sizePosition({ balance: sizingBalance, price: entryPrice });
    const quantity = Number(rawQuantity.toFixed(6));
    if (quantity <= 0) return;

    if (this.settings.tradingMode !== 'paper') {
      await placeOrder(this.settings, { symbol, side: signal, type: 'MARKET', quantity });
    }

    const stopLoss = this.riskManager.computeStopLossPrice(entryPrice, signal);
    const takeProfit = this.riskManager.computeTakeProfitPrice(entryPrice, signal);
    await this.portfolio.openPosition({
      symbol,
      side: signal,
      entryPrice,
      quantity,
      stopLoss,
      takeProfit,
    });
    await appendLog(
      `Eröffnet: ${signal} ${quantity} ${symbol} @ ${entryPrice} ` +
        `(SL ${stopLoss.toFixed(2)} / TP ${takeProfit.toFixed(2)})`
    );
  }

  stop() {
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.unsubscribes = [];
    this.running = false;
  }
}
