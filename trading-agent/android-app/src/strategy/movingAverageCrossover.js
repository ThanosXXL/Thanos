/**
 * Simple, transparent example strategy: SMA crossover.
 * Signal 'BUY' on fast-over-slow crossover, 'SELL' on fast-under-slow crossover,
 * 'HOLD' otherwise. This is a starting point for experimentation, not a
 * strategy known to be profitable — validate with the backtester before
 * trusting it with any capital, real or simulated.
 */
export class MovingAverageCrossoverStrategy {
  constructor({ fastPeriod, slowPeriod }) {
    this.fastPeriod = fastPeriod;
    this.slowPeriod = slowPeriod;
    this.closes = [];
    this.prevFast = null;
    this.prevSlow = null;
  }

  sma(period) {
    if (this.closes.length < period) return null;
    const window = this.closes.slice(this.closes.length - period);
    return window.reduce((sum, v) => sum + v, 0) / period;
  }

  /** Feed one *closed* candle; returns 'BUY' | 'SELL' | 'HOLD'. */
  onClosedCandle(candle) {
    this.closes.push(candle.close);
    const maxHistory = this.slowPeriod * 3;
    if (this.closes.length > maxHistory) {
      this.closes.splice(0, this.closes.length - maxHistory);
    }

    const fast = this.sma(this.fastPeriod);
    const slow = this.sma(this.slowPeriod);

    let signal = 'HOLD';
    if (fast !== null && slow !== null && this.prevFast !== null && this.prevSlow !== null) {
      const wasAtOrBelow = this.prevFast <= this.prevSlow;
      const wasAtOrAbove = this.prevFast >= this.prevSlow;
      if (wasAtOrBelow && fast > slow) signal = 'BUY';
      else if (wasAtOrAbove && fast < slow) signal = 'SELL';
    }

    this.prevFast = fast;
    this.prevSlow = slow;
    return signal;
  }
}
