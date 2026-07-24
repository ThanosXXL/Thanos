/**
 * Entry point spawned by the Electron desktop app (never run directly by users).
 * Starts the dashboard HTTP server and the trading agent in one process so the
 * desktop app only has to manage a single child process.
 */
import './src/dashboard/server.js';
import { startAgent } from './src/agent.js';

startAgent().catch((err) => {
  console.error('[fatal] agent failed to start:', err.message);
  process.exit(1);
});
