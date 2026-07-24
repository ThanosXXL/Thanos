import { MovingAverageCrossoverStrategy } from './movingAverageCrossover.js';

/**
 * Strategy interface: any strategy must expose
 *   onClosedCandle(candle) -> 'BUY' | 'SELL' | 'HOLD'
 * called once per closed candle, in chronological order.
 */
export function createDefaultStrategy(settings) {
  return new MovingAverageCrossoverStrategy({
    fastPeriod: Number(settings.fastMaPeriod),
    slowPeriod: Number(settings.slowMaPeriod),
  });
}
