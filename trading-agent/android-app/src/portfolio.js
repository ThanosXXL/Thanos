import AsyncStorage from '@react-native-async-storage/async-storage';

const STATE_KEY = '@trading_agent_state_v1';
const TRADES_KEY = '@trading_agent_trades_v1';

/**
 * Tracks simulated (paper) or locally-mirrored (testnet/live) balance,
 * open positions, and closed-trade history. Persists to AsyncStorage so
 * state survives app restarts (mirrors the desktop CLI's portfolio.js,
 * which persists to data/state.json + data/trades.log instead).
 */
export class Portfolio {
  constructor(startingBalance) {
    this.balance = startingBalance;
    this.startingBalance = startingBalance;
    this.openPositions = [];
    this.closedTrades = [];
    this._nextId = 1;
  }

  async load() {
    try {
      const raw = await AsyncStorage.getItem(STATE_KEY);
      if (raw) {
        const state = JSON.parse(raw);
        this.balance = state.balance ?? this.balance;
        this.startingBalance = state.startingBalance ?? this.startingBalance;
        this.openPositions = state.openPositions ?? [];
        this._nextId = state.nextId ?? 1;
      }
      const tradesRaw = await AsyncStorage.getItem(TRADES_KEY);
      this.closedTrades = tradesRaw ? JSON.parse(tradesRaw) : [];
    } catch (err) {
      console.warn('[portfolio] failed to load saved state, starting fresh:', err.message);
    }
    return this;
  }

  async persist() {
    await AsyncStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        balance: this.balance,
        startingBalance: this.startingBalance,
        openPositions: this.openPositions,
        nextId: this._nextId,
        updatedAt: new Date().toISOString(),
      })
    );
  }

  async _persistTrades() {
    await AsyncStorage.setItem(TRADES_KEY, JSON.stringify(this.closedTrades));
  }

  async openPosition({ symbol, side, entryPrice, quantity, stopLoss, takeProfit }) {
    const position = {
      id: this._nextId++,
      symbol,
      side,
      entryPrice,
      quantity,
      stopLoss,
      takeProfit,
      openTime: new Date().toISOString(),
    };
    this.openPositions.push(position);
    await this.persist();
    return position;
  }

  findTriggeredExits(symbol, currentPrice) {
    const triggered = [];
    for (const position of this.openPositions) {
      if (position.symbol !== symbol) continue;
      if (position.side === 'BUY') {
        if (currentPrice <= position.stopLoss) triggered.push({ position, reason: 'stop_loss' });
        else if (currentPrice >= position.takeProfit) triggered.push({ position, reason: 'take_profit' });
      } else {
        if (currentPrice >= position.stopLoss) triggered.push({ position, reason: 'stop_loss' });
        else if (currentPrice <= position.takeProfit) triggered.push({ position, reason: 'take_profit' });
      }
    }
    return triggered;
  }

  async closePosition(positionId, exitPrice, reason) {
    const idx = this.openPositions.findIndex((p) => p.id === positionId);
    if (idx === -1) throw new Error(`No open position with id ${positionId}`);
    const [position] = this.openPositions.splice(idx, 1);

    const direction = position.side === 'BUY' ? 1 : -1;
    const pnl = direction * (exitPrice - position.entryPrice) * position.quantity;
    this.balance += pnl;

    const trade = { ...position, exitPrice, exitTime: new Date().toISOString(), pnl, reason };
    this.closedTrades.push(trade);
    await this._persistTrades();
    await this.persist();
    return trade;
  }

  summary() {
    const realizedPnl = this.closedTrades.reduce((sum, t) => sum + t.pnl, 0);
    return {
      balance: this.balance,
      startingBalance: this.startingBalance,
      realizedPnl,
      openPositions: this.openPositions,
      closedTrades: this.closedTrades,
    };
  }
}
