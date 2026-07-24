import { config } from './config.js';
import { startAgent } from './agent.js';

console.log('='.repeat(72));
console.log('Trading agent starting.');
console.log('This software does NOT guarantee any profit. Markets can and do move');
console.log('against any strategy. Past backtest or paper-trading results are not');
console.log('indicative of future performance. You are responsible for any funds');
console.log(`at risk in ${config.mode.toUpperCase()} mode.`);
console.log('='.repeat(72));

startAgent().catch((err) => {
  console.error('[fatal] agent failed to start:', err);
  process.exit(1);
});
