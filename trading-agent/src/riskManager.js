import { config } from './config.js';

function todayKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Enforces position sizing and hard loss limits. This does not and cannot
 * guarantee profit — it only bounds how much a single trade or a single day
 * is allowed to lose before the agent stops opening new positions.
 */
export class RiskManager {
  constructor({ riskPerTradePct, stopLossPct, takeProfitPct, maxDailyLossPct, maxOpenPositions } = config.risk) {
    this.riskPerTradePct = riskPerTradePct;
    this.stopLossPct = stopLossPct;
    this.takeProfitPct = takeProfitPct;
    this.maxDailyLossPct = maxDailyLossPct;
    this.maxOpenPositions = maxOpenPositions;

    this.dailyStartBalance = null;
    this.realizedPnlToday = 0;
    this.currentDay = null;
  }

  /**
   * Call once per closed candle with the latest balance to roll over the daily window.
   * Accepts an explicit referenceDate so the backtester can replay historical days
   * correctly instead of everything collapsing into "today" (wall-clock time).
   */
  rollDailyWindow(currentBalance, referenceDate = new Date()) {
    const day = todayKey(referenceDate);
    if (this.currentDay !== day) {
      this.currentDay = day;
      this.dailyStartBalance = currentBalance;
      this.realizedPnlToday = 0;
    }
  }

  recordRealizedPnl(pnl) {
    this.realizedPnlToday += pnl;
  }

  /** True once today's realized losses breach the configured daily cap. */
  isKillSwitchTriggered() {
    if (this.dailyStartBalance === null || this.dailyStartBalance <= 0) return false;
    const lossLimit = this.dailyStartBalance * this.maxDailyLossPct;
    return this.realizedPnlToday <= -lossLimit;
  }

  canOpenNewPosition(openPositionsCount) {
    return !this.isKillSwitchTriggered() && openPositionsCount < this.maxOpenPositions;
  }

  /**
   * Risk-based position sizing: risks a fixed fraction of the account balance
   * per trade, sized so a stop-loss hit loses approximately that fraction.
   */
  sizePosition({ balance, price }) {
    const riskAmount = balance * this.riskPerTradePct;
    const perUnitRisk = price * this.stopLossPct;
    if (perUnitRisk <= 0) return 0;
    const quantity = riskAmount / perUnitRisk;
    return Math.max(0, quantity);
  }

  computeStopLossPrice(entryPrice, side) {
    return side === 'BUY' ? entryPrice * (1 - this.stopLossPct) : entryPrice * (1 + this.stopLossPct);
  }

  computeTakeProfitPrice(entryPrice, side) {
    return side === 'BUY' ? entryPrice * (1 + this.takeProfitPct) : entryPrice * (1 - this.takeProfitPct);
  }
}
