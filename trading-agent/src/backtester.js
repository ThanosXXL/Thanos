function unrealizedPnl(position, price) {
  const direction = position.side === 'BUY' ? 1 : -1;
  return direction * (price - position.entryPrice) * position.quantity;
}

/**
 * Replays historical candles through a strategy + risk manager, simulating
 * fills at candle close/high/low. This measures how a strategy *would have*
 * performed on past data — it is not a forecast and does not imply similar
 * results going forward.
 *
 * @param {object} params
 * @param {Array} params.candles - chronological OHLCV candles from getKlines().
 * @param {object} params.strategy - object with onClosedCandle(candle) -> signal.
 * @param {object} params.riskManager - RiskManager instance.
 * @param {number} params.startingBalance
 */
export function runBacktest({ candles, strategy, riskManager, startingBalance }) {
  let balance = startingBalance;
  let openPosition = null;
  const trades = [];
  const equityCurve = [];

  for (const candle of candles) {
    riskManager.rollDailyWindow(balance, new Date(candle.closeTime));

    if (openPosition) {
      let exitPrice = null;
      let reason = null;
      if (openPosition.side === 'BUY') {
        if (candle.low <= openPosition.stopLoss) {
          exitPrice = openPosition.stopLoss;
          reason = 'stop_loss';
        } else if (candle.high >= openPosition.takeProfit) {
          exitPrice = openPosition.takeProfit;
          reason = 'take_profit';
        }
      } else {
        if (candle.high >= openPosition.stopLoss) {
          exitPrice = openPosition.stopLoss;
          reason = 'stop_loss';
        } else if (candle.low <= openPosition.takeProfit) {
          exitPrice = openPosition.takeProfit;
          reason = 'take_profit';
        }
      }
      if (exitPrice !== null) {
        const pnl = unrealizedPnl(openPosition, exitPrice);
        balance += pnl;
        riskManager.recordRealizedPnl(pnl);
        trades.push({ ...openPosition, exitPrice, exitTime: candle.closeTime, pnl, reason });
        openPosition = null;
      }
    }

    const signal = strategy.onClosedCandle(candle);
    if (!openPosition && signal !== 'HOLD' && riskManager.canOpenNewPosition(0)) {
      const entryPrice = candle.close;
      const quantity = riskManager.sizePosition({ balance, price: entryPrice });
      if (quantity > 0) {
        openPosition = {
          side: signal,
          entryPrice,
          quantity,
          stopLoss: riskManager.computeStopLossPrice(entryPrice, signal),
          takeProfit: riskManager.computeTakeProfitPrice(entryPrice, signal),
          openTime: candle.closeTime,
        };
      }
    }

    const equity = balance + (openPosition ? unrealizedPnl(openPosition, candle.close) : 0);
    equityCurve.push({ time: candle.closeTime, equity });
  }

  if (openPosition) {
    const lastPrice = candles[candles.length - 1].close;
    const pnl = unrealizedPnl(openPosition, lastPrice);
    balance += pnl;
    trades.push({ ...openPosition, exitPrice: lastPrice, exitTime: candles[candles.length - 1].closeTime, pnl, reason: 'backtest_end' });
  }

  let peak = startingBalance;
  let maxDrawdownPct = 0;
  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const drawdown = peak > 0 ? (peak - point.equity) / peak : 0;
    if (drawdown > maxDrawdownPct) maxDrawdownPct = drawdown;
  }

  const wins = trades.filter((t) => t.pnl > 0).length;
  return {
    trades,
    equityCurve,
    stats: {
      startingBalance,
      finalBalance: balance,
      totalReturnPct: startingBalance > 0 ? (balance - startingBalance) / startingBalance : 0,
      totalTrades: trades.length,
      winRatePct: trades.length > 0 ? wins / trades.length : 0,
      maxDrawdownPct,
    },
  };
}
