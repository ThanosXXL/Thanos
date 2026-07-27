/**
 * Entry point run as a worker_threads Worker by the Electron desktop app
 * (never run directly by users). Starts the dashboard HTTP server and the
 * trading agent on one worker thread inside the app's own already-running
 * process — deliberately NOT a separate spawned process/executable, since
 * some antivirus/endpoint-isolation tools (e.g. HP Sure Click) block an
 * unsigned app from launching a copy of itself as a new OS process.
 */
import { parentPort } from 'node:worker_threads';
import './src/dashboard/server.js';
import { startAgent } from './src/agent.js';

let agentHandle = null;

startAgent()
  .then((handle) => {
    agentHandle = handle;
  })
  .catch((err) => {
    console.error('[fatal] agent failed to start:', err.message);
    process.exit(1);
  });

parentPort?.on('message', (message) => {
  if (message === 'stop') {
    agentHandle?.stop();
    process.exit(0);
  }
});
