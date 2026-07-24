import BackgroundService from 'react-native-background-actions';
import { TradingAgent } from './agent';
import { appendLog } from './logStore';

let currentAgent = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The task function react-native-background-actions keeps alive inside the
 * foreground service. Settings are passed in via `parameters` (not a JS
 * closure) so this works even if Android reinitializes the JS context for
 * the background service — see README for the caveats around Android
 * killing the process outright despite the foreground service/notification.
 */
async function runAgentTask(settings) {
  currentAgent = new TradingAgent(settings);
  try {
    await currentAgent.start();
  } catch (err) {
    await appendLog(`Start fehlgeschlagen: ${err.message}`);
    return;
  }
  while (BackgroundService.isRunning()) {
    await sleep(5000);
  }
}

function buildOptions(settings) {
  return {
    taskName: 'TradingAgent',
    taskTitle: 'Trading Agent aktiv',
    taskDesc: `${settings.symbol} · ${String(settings.tradingMode).toUpperCase()}`,
    taskIcon: { name: 'ic_launcher', type: 'mipmap' },
    color: '#3b82f6',
    foregroundServiceType: ['dataSync'],
    parameters: settings,
  };
}

export async function startBackgroundAgent(settings) {
  await BackgroundService.start(runAgentTask, buildOptions(settings));
}

export async function stopBackgroundAgent() {
  if (currentAgent) {
    currentAgent.stop();
    currentAgent = null;
  }
  await BackgroundService.stop();
}

export function isBackgroundAgentRunning() {
  return BackgroundService.isRunning();
}
