import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const TRADES_FILE = path.join(DATA_DIR, 'trades.log');

/**
 * Tracks simulated (paper) or locally-mirrored (testnet/live) balance,
 * open positions, and closed-trade history. Persists to disk so the
 * dashboard and restarts can see consistent state.
 */
export class Portfolio {
  constructor(startingBalance) {
    this.balance = startingBalance;
    this.startingBalance = startingBalance;
    this.openPositions = [];
    this.closedTrades = [];
    this._nextId = 1;
    this._load();
  }

  _load() {
    if (!fs.existsSync(STATE_FILE)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      this.balance = raw.balance ?? this.balance;
      this.startingBalance = raw.startingBalance ?? this.startingBalance;
      this.openPositions = raw.openPositions ?? [];
      this._nextId = raw.nextId ?? 1;
    } catch (err) {
      console.error('[portfolio] failed to load saved state, starting fresh:', err.message);
    }
    if (fs.existsSync(TRADES_FILE)) {
      try {
        const lines = fs.readFileSync(TRADES_FILE, 'utf8').split('\n').filter(Boolean);
        this.closedTrades = lines.map((line) => JSON.parse(line));
      } catch (err) {
        console.error('[portfolio] failed to load trade log:', err.message);
      }
    }
  }

  persist() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify(
        {
          balance: this.balance,
          startingBalance: this.startingBalance,
          openPositions: this.openPositions,
          nextId: this._nextId,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  }

  openPosition({ symbol, side, entryPrice, quantity, stopLoss, takeProfit }) {
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
    this.persist();
    return position;
  }

  /**
   * Positions on `symbol` whose stop-loss or take-profit level has been
   * crossed at currentPrice. Scoped to one symbol because currentPrice comes
   * from that symbol's own candle stream and has no bearing on other symbols'
   * open positions.
   */
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

  closePosition(positionId, exitPrice, reason) {
    const idx = this.openPositions.findIndex((p) => p.id === positionId);
    if (idx === -1) throw new Error(`No open position with id ${positionId}`);
    const [position] = this.openPositions.splice(idx, 1);

    const direction = position.side === 'BUY' ? 1 : -1;
    const pnl = direction * (exitPrice - position.entryPrice) * position.quantity;
    this.balance += pnl;

    const trade = { ...position, exitPrice, exitTime: new Date().toISOString(), pnl, reason };
    this.closedTrades.push(trade);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(TRADES_FILE, `${JSON.stringify(trade)}\n`);
    this.persist();
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
