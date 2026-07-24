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
const statusHint = document.getElementById('statusHint');
const demoBadge = document.getElementById('demoBadge');
const demoNotice = document.getElementById('demoNotice');
const binanceAccessFieldset = document.getElementById('binanceAccessFieldset');
const modeFieldset = document.getElementById('modeFieldset');
const withdrawalFieldset = document.getElementById('withdrawalFieldset');
const withdrawTriggerSection = document.getElementById('withdrawTriggerSection');

function applyDemoMode(isDemo) {
  if (!isDemo) return;
  demoBadge.style.display = 'inline-block';
  demoNotice.style.display = 'block';
  binanceAccessFieldset.style.display = 'none';
  modeFieldset.style.display = 'none';
  withdrawalFieldset.style.display = 'none';
  withdrawTriggerSection.style.display = 'none';
  form.elements['TRADING_MODE'].value = 'paper';
}

function setStatusHint(text, isError) {
  statusHint.textContent = text;
  statusHint.classList.toggle('statusHintError', Boolean(isError));
}

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
  setStatusHint('Einstellungen gespeichert.');
  appendLog('\n[desktop] Einstellungen gespeichert.\n');
});

startBtn.addEventListener('click', async () => {
  logEl.textContent = '';
  setStatusHint('Starte...');
  const result = await window.desktopAPI.startAgent(formToSettings());
  if (!result.ok) {
    setStatusHint(`Start fehlgeschlagen: ${result.error}`, true);
    appendLog(`\n[desktop] Start fehlgeschlagen: ${result.error}\n`);
    return;
  }
  setStatusHint('Läuft. Details im Live-Dashboard rechts.');
  dashboardFrame.src = `http://localhost:${result.dashboardPort}`;
});

stopBtn.addEventListener('click', async () => {
  stopRequested = true;
  await window.desktopAPI.stopAgent();
  setStatusHint('Gestoppt.');
  dashboardFrame.src = 'about:blank';
});

withdrawBtn.addEventListener('click', async () => {
  const settings = formToSettings();
  if (settings.TRADING_MODE !== 'live') {
    setStatusHint('Auszahlung nur im Live-Modus möglich.', true);
    return;
  }
  if (!withdrawAmount.value || Number(withdrawAmount.value) <= 0) {
    setStatusHint('Bitte einen gültigen Betrag angeben.', true);
    return;
  }
  const confirmed = window.confirm(
    `Wirklich ${withdrawAmount.value} ${settings.WITHDRAWAL_ASSET || ''} an ${settings.WITHDRAWAL_ADDRESS || '(keine Adresse gesetzt)'} auszahlen? Das ist unwiderruflich.`
  );
  if (!confirmed) return;

  withdrawBtn.disabled = true;
  setStatusHint('Auszahlung wird ausgelöst...');
  appendLog(`\n[desktop] Löse Auszahlung über ${withdrawAmount.value} aus...\n`);
  const result = await window.desktopAPI.withdraw(settings, withdrawAmount.value, withdrawConfirm.value);
  withdrawBtn.disabled = false;
  setStatusHint(result.ok ? 'Auszahlung abgeschlossen.' : 'Auszahlung fehlgeschlagen — Details unten.', !result.ok);
  appendLog(result.ok ? '\n[desktop] Auszahlung abgeschlossen.\n' : '\n[desktop] Auszahlung fehlgeschlagen.\n');
});

let stopRequested = false;

window.desktopAPI.onLog(appendLog);
window.desktopAPI.onRunState((running) => {
  setRunning(running);
  if (!running && !stopRequested) {
    setStatusHint('Unerwartet gestoppt — Details unten.', true);
    dashboardFrame.src = 'about:blank';
  }
  if (running) stopRequested = false;
});

(async () => {
  const isDemo = await window.desktopAPI.getDemoMode();
  applyDemoMode(isDemo);
  const settings = await window.desktopAPI.getSettings();
  settingsToForm(settings);
  const running = await window.desktopAPI.getRunState();
  setRunning(running);
  if (running) {
    setStatusHint('Läuft. Details im Live-Dashboard rechts.');
    dashboardFrame.src = `http://localhost:${settings.DASHBOARD_PORT}`;
  }
})();
