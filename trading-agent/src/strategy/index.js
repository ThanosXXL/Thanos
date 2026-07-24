import { config } from '../config.js';
import { MovingAverageCrossoverStrategy } from './movingAverageCrossover.js';

/**
 * Strategy interface: any strategy must expose
 *   onClosedCandle(candle) -> 'BUY' | 'SELL' | 'HOLD'
 * called once per closed candle, in chronological order.
 */
export function createDefaultStrategy() {
  return new MovingAverageCrossoverStrategy({
    fastPeriod: config.strategy.fastMaPeriod,
    slowPeriod: config.strategy.slowMaPeriod,
  });
}
