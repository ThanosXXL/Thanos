import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = '@trading_agent_log_v1';
const MAX_LINES = 300;

/**
 * Persisted log ring buffer. The agent may run inside a background/headless
 * JS context once the app is backgrounded, so log lines are written to
 * AsyncStorage rather than pushed via in-memory callbacks — the UI polls
 * this store instead of holding a direct reference to the agent.
 */
export async function appendLog(line) {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    const lines = raw ? JSON.parse(raw) : [];
    lines.push(`[${new Date().toLocaleTimeString()}] ${line}`);
    if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES);
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(lines));
  } catch {
    // best-effort logging only, never let a logging failure crash the agent
  }
}

export async function readLog() {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearLog() {
  await AsyncStorage.removeItem(LOG_KEY);
}
