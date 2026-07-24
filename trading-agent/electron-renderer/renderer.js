const form = document.getElementById('settingsForm');
const saveBtn = document.getElementById('saveBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const logEl = document.getElementById('log');
const statusBadge = document.getElementById('statusBadge');
const dashboardFrame = document.getElementById('dashboardFrame');
const liveConfirmRow = document.getElementById('liveConfirmRow');
const modeSelect = form.elements['TRADING_MODE'];
const withdrawAmount = document.getElementById('withdrawAmount');
const withdrawConfirm = document.getElementById('withdrawConfirm');
const withdrawBtn = document.getElementById('withdrawBtn');

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

withdrawBtn.addEventListener('click', async () => {
  const settings = formToSettings();
  if (settings.TRADING_MODE !== 'live') {
    appendLog('\n[desktop] Auszahlung nur im Live-Modus möglich.\n');
    return;
  }
  if (!withdrawAmount.value || Number(withdrawAmount.value) <= 0) {
    appendLog('\n[desktop] Bitte einen gültigen Betrag angeben.\n');
    return;
  }
  const confirmed = window.confirm(
    `Wirklich ${withdrawAmount.value} ${settings.WITHDRAWAL_ASSET || ''} an ${settings.WITHDRAWAL_ADDRESS || '(keine Adresse gesetzt)'} auszahlen? Das ist unwiderruflich.`
  );
  if (!confirmed) return;

  withdrawBtn.disabled = true;
  appendLog(`\n[desktop] Löse Auszahlung über ${withdrawAmount.value} aus...\n`);
  const result = await window.desktopAPI.withdraw(settings, withdrawAmount.value, withdrawConfirm.value);
  withdrawBtn.disabled = false;
  appendLog(result.ok ? '\n[desktop] Auszahlung abgeschlossen.\n' : '\n[desktop] Auszahlung fehlgeschlagen.\n');
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
