function todayKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Enforces position sizing and hard loss limits. This does not and cannot
 * guarantee profit — it only bounds how much a single trade or a single day
 * is allowed to lose before the agent stops opening new positions.
 *
 * Ported from the desktop CLI's src/riskManager.js; logic is identical, only
 * the constructor no longer defaults to a Node-side config singleton since
 * mobile settings are loaded from AsyncStorage at runtime.
 */
export class RiskManager {
  constructor({ riskPerTradePct, stopLossPct, takeProfitPct, maxDailyLossPct, maxOpenPositions }) {
    this.riskPerTradePct = riskPerTradePct;
    this.stopLossPct = stopLossPct;
    this.takeProfitPct = takeProfitPct;
    this.maxDailyLossPct = maxDailyLossPct;
    this.maxOpenPositions = maxOpenPositions;

    this.dailyStartBalance = null;
    this.realizedPnlToday = 0;
    this.currentDay = null;
  }

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

  isKillSwitchTriggered() {
    if (this.dailyStartBalance === null || this.dailyStartBalance <= 0) return false;
    const lossLimit = this.dailyStartBalance * this.maxDailyLossPct;
    return this.realizedPnlToday <= -lossLimit;
  }

  canOpenNewPosition(openPositionsCount) {
    return !this.isKillSwitchTriggered() && openPositionsCount < this.maxOpenPositions;
  }

  sizePosition({ balance, price }) {
    const riskAmount = balance * this.riskPerTradePct;
    const perUnitRisk = price * this.stopLossPct;
    if (perUnitRisk <= 0) return 0;
    return Math.max(0, riskAmount / perUnitRisk);
  }

  computeStopLossPrice(entryPrice, side) {
    return side === 'BUY' ? entryPrice * (1 - this.stopLossPct) : entryPrice * (1 + this.stopLossPct);
  }

  computeTakeProfitPrice(entryPrice, side) {
    return side === 'BUY' ? entryPrice * (1 + this.takeProfitPct) : entryPrice * (1 - this.takeProfitPct);
  }
}
