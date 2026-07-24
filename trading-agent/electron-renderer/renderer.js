const form = document.getElementById('settingsForm');
const saveBtn = document.getElementById('saveBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const logEl = document.getElementById('log');
const statusBadge = document.getElementById('statusBadge');
const dashboardFrame = document.getElementById('dashboardFrame');
const liveConfirmRow = document.getElementById('liveConfirmRow');
const modeSelect = form.elements['TRADING_MODE'];

function formToSettings() {
  const settings = {};
  for (const el of form.elements) {
    if (el.name) settings[el.name] = el.value;
  }
  return settings;
}

function settingsToForm(settings) {
  for (const el of form.elements) {
    if (el.name && settings[el.name] !== undefined) {
      el.value = settings[el.name];
    }
  }
  updateLiveConfirmVisibility();
}

function updateLiveConfirmVisibility() {
  liveConfirmRow.style.display = modeSelect.value === 'live' ? 'block' : 'none';
}

function setRunning(running) {
  statusBadge.textContent = running ? 'LÄUFT' : 'GESTOPPT';
  statusBadge.className = 'badge ' + (running ? 'running' : 'stopped');
  startBtn.disabled = running;
  stopBtn.disabled = !running;
  for (const el of form.elements) el.disabled = running;
}

function appendLog(line) {
  logEl.textContent += line;
  logEl.scrollTop = logEl.scrollHeight;
}

modeSelect.addEventListener('change', updateLiveConfirmVisibility);

saveBtn.addEventListener('click', async () => {
  await window.desktopAPI.saveSettings(formToSettings());
  appendLog('\n[desktop] Einstellungen gespeichert.\n');
});

startBtn.addEventListener('click', async () => {
  logEl.textContent = '';
  const result = await window.desktopAPI.startAgent(formToSettings());
  if (!result.ok) {
    appendLog(`\n[desktop] Start fehlgeschlagen: ${result.error}\n`);
    return;
  }
  dashboardFrame.src = `http://localhost:${result.dashboardPort}`;
});

stopBtn.addEventListener('click', async () => {
  await window.desktopAPI.stopAgent();
  dashboardFrame.src = 'about:blank';
});

window.desktopAPI.onLog(appendLog);
window.desktopAPI.onRunState(setRunning);

(async () => {
  const settings = await window.desktopAPI.getSettings();
  settingsToForm(settings);
  const running = await window.desktopAPI.getRunState();
  setRunning(running);
  if (running) {
    dashboardFrame.src = `http://localhost:${settings.DASHBOARD_PORT}`;
  }
})();
