(function () {
  'use strict';

  const MONAT_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const MONAT_LABELS = {
    '01': 'Januar', '02': 'Februar', '03': 'März', '04': 'April',
    '05': 'Mai', '06': 'Juni', '07': 'Juli', '08': 'August',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Dezember'
  };

  const MAX_ADMINS = 4;

  const DEFAULT_KAT_EINNAHMEN = ['Verkaufserlöse', 'Dienstleistungen', 'Zinserträge', 'Sonstige Einnahmen'];
  const DEFAULT_KAT_AUSGABEN = ['Miete', 'Gehälter', 'Wareneinkauf', 'Versicherungen', 'Steuern & Abgaben', 'Marketing', 'Bürobedarf', 'Sonstige Ausgaben'];

  const GITHUB_OWNER = 'ThanosXXL';
  const GITHUB_REPO = 'Thanos';
  const RELEASE_ASSETS = {
    windows: 'Buchhaltung-Windows-Setup.exe',
    mac: 'Buchhaltung-macOS.dmg',
    linux: 'Buchhaltung-Linux.AppImage'
  };

  const isElectron = typeof window.dashboardAPI !== 'undefined';

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function fmtEUR(n) {
    return (Number(n) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  function sumEntries(list) {
    return (list || []).reduce((s, e) => s + (Number(e.betrag) || 0), 0);
  }

  function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function createLocalStorageApi() {
    const KEY = 'buchhaltung-data';
    return {
      loadData: async () => {
        try {
          const raw = localStorage.getItem(KEY);
          return raw ? JSON.parse(raw) : { administratoren: [], einstellungen: {} };
        } catch (err) {
          return { administratoren: [], einstellungen: {} };
        }
      },
      saveData: async (data) => {
        localStorage.setItem(KEY, JSON.stringify(data));
        return true;
      },
      showNotification: async (title, body) => {
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(title, { body });
          } else if (Notification.permission !== 'denied') {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') new Notification(title, { body });
          }
        }
        return true;
      },
      getAutostart: async () => false,
      setAutostart: async () => false,
      exportCsv: async (defaultName, csvContent) => {
        downloadBlob(csvContent, defaultName, 'text/csv;charset=utf-8');
        return { canceled: false };
      },
      exportBackup: async (jsonContent) => {
        downloadBlob(jsonContent, `buchhaltung-backup-${todayIso()}.json`, 'application/json');
        return { canceled: false };
      },
      importBackup: async () => {
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/json';
          input.onchange = () => {
            const file = input.files && input.files[0];
            if (!file) { resolve({ canceled: true }); return; }
            const reader = new FileReader();
            reader.onload = () => {
              try {
                resolve({ canceled: false, data: JSON.parse(reader.result) });
              } catch (err) {
                resolve({ canceled: true, error: 'Datei konnte nicht gelesen werden.' });
              }
            };
            reader.readAsText(file);
          };
          input.click();
        });
      }
    };
  }

  const api = isElectron ? window.dashboardAPI : createLocalStorageApi();

  let state = { administratoren: [], einstellungen: {} };
  let ansicht = 'monat'; // 'monat' | 'uebersicht'
  let entryModalCtx = null;
  let deleteCtx = null;
  let deferredInstallPrompt = null;
  let pinSetAdmin = null;
  let pinEnterCtx = null;
  const unlockedAdmins = new Set();

  function defaultAdmin(n) {
    return { id: uid(), name: `Administrator ${n}`, jahre: {}, pin: null };
  }

  async function sha256Hex(text) {
    const enc = new TextEncoder().encode('buchhaltung-pin::' + text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function requestAdminAccess(admin, onSuccess) {
    if (!admin.pin || unlockedAdmins.has(admin.id)) {
      onSuccess();
      return;
    }
    pinEnterCtx = { admin, onSuccess };
    document.getElementById('pin-enter-title').textContent = `PIN erforderlich – ${admin.name}`;
    document.getElementById('pin-enter-error').classList.add('hidden');
    const input = document.getElementById('pin-enter-value');
    input.value = '';
    document.getElementById('modal-pin-enter').classList.remove('hidden');
    input.focus();
  }

  function ensureMonth(admin, jahr, monatKey) {
    if (!admin.jahre[jahr]) admin.jahre[jahr] = { monate: {} };
    if (!admin.jahre[jahr].monate[monatKey]) {
      admin.jahre[jahr].monate[monatKey] = { einnahmen: [], ausgaben: [], abgeschlossen: false };
    }
    return admin.jahre[jahr].monate[monatKey];
  }

  function ensureYearForAllAdmins(jahr) {
    state.administratoren.forEach((admin) => {
      MONAT_KEYS.forEach((mk) => ensureMonth(admin, jahr, mk));
    });
  }

  function getActiveAdmin() {
    return state.administratoren.find((a) => a.id === state.einstellungen.aktiverAdminId) || state.administratoren[0];
  }

  async function persist() {
    await api.saveData(state);
  }

  function init() {
    api.loadData().then((data) => {
      state = data && typeof data === 'object' ? data : {};
      if (!Array.isArray(state.administratoren)) state.administratoren = [];
      if (!state.einstellungen || typeof state.einstellungen !== 'object') state.einstellungen = {};

      while (state.administratoren.length < MAX_ADMINS) {
        state.administratoren.push(defaultAdmin(state.administratoren.length + 1));
      }

      state.administratoren.forEach((admin) => {
        if (typeof admin.pin !== 'string') admin.pin = null;
        if (!admin.jahre || typeof admin.jahre !== 'object') admin.jahre = {};
      });

      if (!Array.isArray(state.einstellungen.kategorienEinnahmen) || !state.einstellungen.kategorienEinnahmen.length) {
        state.einstellungen.kategorienEinnahmen = DEFAULT_KAT_EINNAHMEN.slice();
      }
      if (!Array.isArray(state.einstellungen.kategorienAusgaben) || !state.einstellungen.kategorienAusgaben.length) {
        state.einstellungen.kategorienAusgaben = DEFAULT_KAT_AUSGABEN.slice();
      }
      if (typeof state.einstellungen.autostart !== 'boolean') state.einstellungen.autostart = false;
      if (typeof state.einstellungen.letzteErinnerung !== 'string') state.einstellungen.letzteErinnerung = null;

      const now = new Date();
      if (!state.einstellungen.aktivesJahr) state.einstellungen.aktivesJahr = now.getFullYear();
      if (!state.einstellungen.aktiverMonat) state.einstellungen.aktiverMonat = MONAT_KEYS[now.getMonth()];
      if (!state.einstellungen.aktiverAdminId) state.einstellungen.aktiverAdminId = state.administratoren[0].id;

      ensureYearForAllAdmins(state.einstellungen.aktivesJahr);

      persist();
      render();
      initInstallBanner();

      setTimeout(() => checkReminder(true), 1200);
      setInterval(() => checkReminder(true), 60 * 1000);

      if (isElectron) {
        api.getAutostart().then((val) => { state.einstellungen.autostart = !!val; });
      }
    });
  }

  // ---------- Rendering ----------

  function render() {
    renderAdminTabs();
    renderYearBar();
    renderMonthTabs();
    renderContent();
    renderReminderBanner();
  }

  function renderAdminTabs() {
    const nav = document.getElementById('admin-tabs');
    nav.textContent = '';
    state.administratoren.forEach((admin) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'admin-tab' + (admin.id === state.einstellungen.aktiverAdminId ? ' active' : '');
      btn.textContent = admin.name;
      btn.addEventListener('click', () => {
        requestAdminAccess(admin, () => {
          state.einstellungen.aktiverAdminId = admin.id;
          persist();
          render();
        });
      });
      nav.appendChild(btn);
    });
  }

  function renderYearBar() {
    document.getElementById('year-label').textContent = state.einstellungen.aktivesJahr;
    const btnOverview = document.getElementById('btn-overview');
    btnOverview.textContent = ansicht === 'monat' ? '📊 Jahresübersicht' : '📅 Monatsansicht';
  }

  function renderMonthTabs() {
    const nav = document.getElementById('month-tabs');
    nav.textContent = '';
    if (ansicht !== 'monat') {
      nav.style.display = 'none';
      return;
    }
    nav.style.display = 'flex';

    const admin = getActiveAdmin();
    const jahr = state.einstellungen.aktivesJahr;

    MONAT_KEYS.forEach((mk) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'month-tab' + (mk === state.einstellungen.aktiverMonat ? ' active' : '');

      const dot = document.createElement('span');
      dot.className = 'dot ' + monthDotClass(admin, jahr, mk);
      btn.appendChild(dot);

      const label = document.createElement('span');
      label.textContent = MONAT_LABELS[mk];
      btn.appendChild(label);

      btn.addEventListener('click', () => {
        state.einstellungen.aktiverMonat = mk;
        persist();
        render();
      });
      nav.appendChild(btn);
    });
  }

  function monthDotClass(admin, jahr, monatKey) {
    const monat = admin.jahre[jahr] && admin.jahre[jahr].monate[monatKey];
    if (monat && monat.abgeschlossen) return 'dot-done';
    const now = new Date();
    const isCurrentMonth = Number(jahr) === now.getFullYear() && monatKey === MONAT_KEYS[now.getMonth()];
    if (isCurrentMonth && now.getDate() >= 28) return 'dot-due';
    return 'dot-open';
  }

  function renderContent() {
    const content = document.getElementById('content');
    content.textContent = '';
    const admin = getActiveAdmin();
    if (!admin) return;

    if (ansicht === 'uebersicht') {
      content.appendChild(buildYearOverview(admin, state.einstellungen.aktivesJahr));
    } else {
      content.appendChild(buildMonthPanel(admin, state.einstellungen.aktivesJahr, state.einstellungen.aktiverMonat));
    }
  }

  function buildMonthPanel(admin, jahr, monatKey) {
    const monat = ensureMonth(admin, jahr, monatKey);
    const frag = document.createDocumentFragment();

    const einnahmenSum = sumEntries(monat.einnahmen);
    const ausgabenSum = sumEntries(monat.ausgaben);
    const saldo = einnahmenSum - ausgabenSum;

    const summaryRow = document.createElement('div');
    summaryRow.className = 'summary-row';

    summaryRow.appendChild(buildSummaryCard('Einnahmen', fmtEUR(einnahmenSum), 'income'));
    summaryRow.appendChild(buildSummaryCard('Ausgaben', fmtEUR(ausgabenSum), 'expense'));
    summaryRow.appendChild(buildSummaryCard('Saldo', fmtEUR(saldo), 'balance'));

    const statusCard = document.createElement('div');
    statusCard.className = 'summary-card status';
    const statusH3 = document.createElement('h3');
    statusH3.textContent = `${MONAT_LABELS[monatKey]} ${jahr}`;
    statusCard.appendChild(statusH3);

    const label = document.createElement('label');
    label.className = 'status-toggle';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!monat.abgeschlossen;
    cb.addEventListener('change', () => {
      monat.abgeschlossen = cb.checked;
      persist();
      render();
    });
    label.appendChild(cb);
    const txt = document.createElement('span');
    txt.textContent = monat.abgeschlossen ? 'Monat abgeschlossen' : 'Monat noch offen';
    label.appendChild(txt);
    statusCard.appendChild(label);

    summaryRow.appendChild(statusCard);
    frag.appendChild(summaryRow);

    frag.appendChild(buildEntrySection('Einnahmen', 'einnahme', admin, jahr, monatKey, monat.einnahmen));
    frag.appendChild(buildEntrySection('Ausgaben', 'ausgabe', admin, jahr, monatKey, monat.ausgaben));

    return frag;
  }

  function buildSummaryCard(title, value, cls) {
    const card = document.createElement('div');
    card.className = 'summary-card ' + cls;
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const val = document.createElement('div');
    val.className = 'value';
    val.textContent = value;
    card.appendChild(h3);
    card.appendChild(val);
    return card;
  }

  function buildEntrySection(title, typ, admin, jahr, monatKey, entries) {
    const block = document.createElement('div');
    block.className = 'section-block ' + (typ === 'einnahme' ? 'income' : 'expense');

    const header = document.createElement('div');
    header.className = 'section-block-header';
    const h2 = document.createElement('h2');
    h2.textContent = title;
    header.appendChild(h2);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary btn-small';
    addBtn.textContent = typ === 'einnahme' ? '+ Neue Einnahme' : '+ Neue Ausgabe';
    addBtn.addEventListener('click', () => openEntryModal(typ, admin, jahr, monatKey, null));
    header.appendChild(addBtn);

    block.appendChild(header);

    if (!entries.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = typ === 'einnahme'
        ? 'Noch keine Einnahmen für diesen Monat erfasst.'
        : 'Noch keine Ausgaben für diesen Monat erfasst.';
      block.appendChild(hint);
      return block;
    }

    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'entries';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Datum', 'Beschreibung', 'Kategorie', 'Zahlungsart', 'Beleg-Nr.', 'Betrag', ''].forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const sorted = entries.slice().sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));
    sorted.forEach((entry) => {
      const tr = document.createElement('tr');

      const tdDatum = document.createElement('td');
      tdDatum.textContent = fmtDate(entry.datum);
      tr.appendChild(tdDatum);

      const tdBeschr = document.createElement('td');
      tdBeschr.textContent = entry.beschreibung || '';
      tr.appendChild(tdBeschr);

      const tdKat = document.createElement('td');
      tdKat.textContent = entry.kategorie || '';
      tr.appendChild(tdKat);

      const tdZahl = document.createElement('td');
      tdZahl.textContent = entry.zahlungsart || '';
      tr.appendChild(tdZahl);

      const tdBeleg = document.createElement('td');
      tdBeleg.textContent = entry.beleg || '–';
      tr.appendChild(tdBeleg);

      const tdBetrag = document.createElement('td');
      tdBetrag.className = 'amount-cell';
      tdBetrag.textContent = fmtEUR(entry.betrag);
      tr.appendChild(tdBetrag);

      const tdActions = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'row-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'icon-btn';
      editBtn.title = 'Bearbeiten';
      editBtn.textContent = '✎';
      editBtn.addEventListener('click', () => openEntryModal(typ, admin, jahr, monatKey, entry.id));
      actions.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'icon-btn danger';
      delBtn.title = 'Löschen';
      delBtn.textContent = '🗑';
      delBtn.addEventListener('click', () => openDeleteModal(
        `„${entry.beschreibung}“ (${fmtEUR(entry.betrag)}) wird endgültig gelöscht.`,
        () => {
          const idx = entries.findIndex((e) => e.id === entry.id);
          if (idx >= 0) entries.splice(idx, 1);
          persist();
          render();
        }
      ));
      actions.appendChild(delBtn);

      tdActions.appendChild(actions);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const tfoot = document.createElement('tfoot');
    const footRow = document.createElement('tr');
    const footLabel = document.createElement('td');
    footLabel.colSpan = 5;
    footLabel.textContent = 'Summe';
    footRow.appendChild(footLabel);
    const footVal = document.createElement('td');
    footVal.className = 'amount-cell';
    footVal.textContent = fmtEUR(sumEntries(entries));
    footRow.appendChild(footVal);
    footRow.appendChild(document.createElement('td'));
    tfoot.appendChild(footRow);
    table.appendChild(tfoot);

    wrap.appendChild(table);
    block.appendChild(wrap);
    return block;
  }

  function buildYearOverview(admin, jahr) {
    ensureMonth(admin, jahr, '01');
    const frag = document.createDocumentFragment();

    const monthlyTotals = MONAT_KEYS.map((mk) => {
      const monat = ensureMonth(admin, jahr, mk);
      return { mk, einnahmen: sumEntries(monat.einnahmen), ausgaben: sumEntries(monat.ausgaben) };
    });

    const maxVal = Math.max(1, ...monthlyTotals.map((m) => Math.max(m.einnahmen, m.ausgaben)));

    const table = document.createElement('table');
    table.className = 'overview-table';

    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    ['Monat', 'Einnahmen', 'Ausgaben', 'Saldo', 'Vergleich'].forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let jahrEinnahmen = 0;
    let jahrAusgaben = 0;

    monthlyTotals.forEach(({ mk, einnahmen, ausgaben }) => {
      jahrEinnahmen += einnahmen;
      jahrAusgaben += ausgaben;

      const tr = document.createElement('tr');
      const tdMonat = document.createElement('td');
      tdMonat.textContent = MONAT_LABELS[mk];
      tr.appendChild(tdMonat);

      const tdE = document.createElement('td');
      tdE.textContent = fmtEUR(einnahmen);
      tr.appendChild(tdE);

      const tdA = document.createElement('td');
      tdA.textContent = fmtEUR(ausgaben);
      tr.appendChild(tdA);

      const tdS = document.createElement('td');
      tdS.textContent = fmtEUR(einnahmen - ausgaben);
      tr.appendChild(tdS);

      const tdBar = document.createElement('td');
      const barWrap = document.createElement('div');
      barWrap.className = 'overview-bar-wrap';
      const barE = document.createElement('div');
      barE.className = 'overview-bar bar-income';
      barE.style.width = Math.round((einnahmen / maxVal) * 60) + 'px';
      const barA = document.createElement('div');
      barA.className = 'overview-bar bar-expense';
      barA.style.width = Math.round((ausgaben / maxVal) * 60) + 'px';
      barWrap.appendChild(barE);
      barWrap.appendChild(barA);
      tdBar.appendChild(barWrap);
      tr.appendChild(tdBar);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const tfoot = document.createElement('tfoot');
    const footRow = document.createElement('tr');
    const cells = ['Jahressumme', fmtEUR(jahrEinnahmen), fmtEUR(jahrAusgaben), fmtEUR(jahrEinnahmen - jahrAusgaben), ''];
    cells.forEach((c) => {
      const td = document.createElement('td');
      td.textContent = c;
      td.style.fontWeight = '800';
      footRow.appendChild(td);
    });
    tfoot.appendChild(footRow);
    table.appendChild(tfoot);

    const wrap = document.createElement('div');
    wrap.className = 'section-block';
    wrap.appendChild(table);
    frag.appendChild(wrap);
    return frag;
  }

  // ---------- Entry modal ----------

  function openEntryModal(typ, admin, jahr, monatKey, entryId) {
    entryModalCtx = { typ, admin, jahr, monatKey, entryId };
    const monat = ensureMonth(admin, jahr, monatKey);
    const list = typ === 'einnahme' ? monat.einnahmen : monat.ausgaben;
    const existing = entryId ? list.find((e) => e.id === entryId) : null;

    document.getElementById('entry-modal-title').textContent =
      (existing ? 'Bearbeiten: ' : 'Neu: ') + (typ === 'einnahme' ? 'Einnahme' : 'Ausgabe');

    const katSelect = document.getElementById('entry-kategorie');
    katSelect.textContent = '';
    const kategorien = typ === 'einnahme' ? state.einstellungen.kategorienEinnahmen : state.einstellungen.kategorienAusgaben;
    kategorien.forEach((k) => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = k;
      katSelect.appendChild(opt);
    });

    document.getElementById('entry-datum').value = existing ? existing.datum : todayIso();
    document.getElementById('entry-beschreibung').value = existing ? existing.beschreibung : '';
    if (existing) katSelect.value = existing.kategorie;
    document.getElementById('entry-zahlungsart').value = existing ? existing.zahlungsart : 'Bar';
    document.getElementById('entry-beleg').value = existing ? (existing.beleg || '') : '';
    document.getElementById('entry-betrag').value = existing ? existing.betrag : '';

    document.getElementById('modal-entry').classList.remove('hidden');
  }

  function closeEntryModal() {
    document.getElementById('modal-entry').classList.add('hidden');
    entryModalCtx = null;
  }

  function submitEntryForm(ev) {
    ev.preventDefault();
    if (!entryModalCtx) return;
    const { typ, admin, jahr, monatKey, entryId } = entryModalCtx;
    const monat = ensureMonth(admin, jahr, monatKey);
    const list = typ === 'einnahme' ? monat.einnahmen : monat.ausgaben;

    const data = {
      datum: document.getElementById('entry-datum').value,
      beschreibung: document.getElementById('entry-beschreibung').value.trim(),
      kategorie: document.getElementById('entry-kategorie').value,
      zahlungsart: document.getElementById('entry-zahlungsart').value,
      beleg: document.getElementById('entry-beleg').value.trim(),
      betrag: Math.max(0, Number(document.getElementById('entry-betrag').value) || 0)
    };

    if (!data.beschreibung || !data.datum) return;

    if (entryId) {
      const existing = list.find((e) => e.id === entryId);
      Object.assign(existing, data);
    } else {
      list.push(Object.assign({ id: uid() }, data));
    }

    persist();
    closeEntryModal();
    render();
  }

  // ---------- Delete modal ----------

  function openDeleteModal(text, onConfirm) {
    document.getElementById('delete-text').textContent = text;
    deleteCtx = onConfirm;
    document.getElementById('modal-delete').classList.remove('hidden');
  }

  function closeDeleteModal() {
    document.getElementById('modal-delete').classList.add('hidden');
    deleteCtx = null;
  }

  // ---------- Settings modal ----------

  function openSettingsModal() {
    renderSettingsAdminRows();
    renderCategoryChips();

    const autostartRow = document.getElementById('setting-autostart').closest('.settings-section');
    if (!isElectron) {
      autostartRow.style.display = 'none';
    } else {
      autostartRow.style.display = '';
      api.getAutostart().then((val) => {
        document.getElementById('setting-autostart').checked = !!val;
      });
    }

    document.getElementById('modal-settings').classList.remove('hidden');
  }

  function closeSettingsModal() {
    document.getElementById('modal-settings').classList.add('hidden');
  }

  function renderSettingsAdminRows() {
    const namesWrap = document.getElementById('settings-admin-names');
    namesWrap.textContent = '';
    state.administratoren.forEach((admin) => {
      const row = document.createElement('div');
      row.className = 'admin-name-row';

      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 60;
      input.value = admin.name;
      input.addEventListener('change', () => {
        admin.name = input.value.trim() || admin.name;
        persist();
        renderAdminTabs();
      });
      row.appendChild(input);

      const status = document.createElement('span');
      status.className = 'pin-status ' + (admin.pin ? 'on' : 'off');
      status.textContent = admin.pin ? 'PIN aktiv' : 'Kein PIN';
      row.appendChild(status);

      const pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.className = 'btn btn-outline btn-small';
      pinBtn.textContent = admin.pin ? 'PIN ändern' : 'PIN festlegen';
      pinBtn.addEventListener('click', () => openPinSetModal(admin));
      row.appendChild(pinBtn);

      namesWrap.appendChild(row);
    });
  }

  // ---------- PIN-Schutz ----------

  function openPinSetModal(admin) {
    pinSetAdmin = admin;
    document.getElementById('pin-set-title').textContent = admin.pin
      ? `PIN für ${admin.name} ändern`
      : `PIN für ${admin.name} festlegen`;
    document.getElementById('pin-set-new').value = '';
    document.getElementById('pin-set-confirm').value = '';
    document.getElementById('pin-set-error').classList.add('hidden');
    document.getElementById('pin-remove').classList.toggle('hidden', !admin.pin);
    document.getElementById('modal-pin-set').classList.remove('hidden');
  }

  function closePinSetModal() {
    document.getElementById('modal-pin-set').classList.add('hidden');
    pinSetAdmin = null;
  }

  function showPinSetError(message) {
    const el = document.getElementById('pin-set-error');
    el.textContent = message;
    el.classList.remove('hidden');
  }

  async function submitPinSetForm(ev) {
    ev.preventDefault();
    if (!pinSetAdmin) return;
    const val = document.getElementById('pin-set-new').value;
    const confirmVal = document.getElementById('pin-set-confirm').value;
    if (!/^[0-9]{4}$/.test(val)) {
      showPinSetError('Bitte genau 4 Ziffern eingeben.');
      return;
    }
    if (val !== confirmVal) {
      showPinSetError('Die beiden PINs stimmen nicht überein.');
      return;
    }
    pinSetAdmin.pin = await sha256Hex(val);
    unlockedAdmins.add(pinSetAdmin.id);
    persist();
    renderSettingsAdminRows();
    closePinSetModal();
  }

  function removeCurrentPin() {
    if (!pinSetAdmin) return;
    if (!confirm(`PIN für ${pinSetAdmin.name} wirklich entfernen?`)) return;
    pinSetAdmin.pin = null;
    persist();
    renderSettingsAdminRows();
    closePinSetModal();
  }

  function closePinEnterModal() {
    document.getElementById('modal-pin-enter').classList.add('hidden');
    pinEnterCtx = null;
  }

  async function submitPinEnterForm(ev) {
    ev.preventDefault();
    if (!pinEnterCtx) return;
    const input = document.getElementById('pin-enter-value');
    const hash = await sha256Hex(input.value);
    if (hash === pinEnterCtx.admin.pin) {
      unlockedAdmins.add(pinEnterCtx.admin.id);
      const onSuccess = pinEnterCtx.onSuccess;
      closePinEnterModal();
      onSuccess();
    } else {
      document.getElementById('pin-enter-error').classList.remove('hidden');
      input.value = '';
      input.focus();
    }
  }

  function renderCategoryChips() {
    buildChipList('settings-cat-einnahmen', state.einstellungen.kategorienEinnahmen);
    buildChipList('settings-cat-ausgaben', state.einstellungen.kategorienAusgaben);
  }

  function buildChipList(containerId, list) {
    const el = document.getElementById(containerId);
    el.textContent = '';
    list.forEach((kat, idx) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      const txt = document.createElement('span');
      txt.textContent = kat;
      chip.appendChild(txt);
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '×';
      removeBtn.title = 'Entfernen';
      removeBtn.addEventListener('click', () => {
        list.splice(idx, 1);
        persist();
        renderCategoryChips();
      });
      chip.appendChild(removeBtn);
      el.appendChild(chip);
    });
  }

  // ---------- Reminder logic ----------

  function isReminderWindowNow() {
    const now = new Date();
    const afterTime = now.getHours() > 11 || (now.getHours() === 11 && now.getMinutes() >= 30);
    return now.getDate() >= 28 && afterTime;
  }

  function getIncompleteAdmins() {
    const now = new Date();
    const y = now.getFullYear();
    const m = MONAT_KEYS[now.getMonth()];
    return state.administratoren.filter((a) => {
      const monat = a.jahre[y] && a.jahre[y].monate[m];
      return !monat || !monat.abgeschlossen;
    }).map((a) => ({ admin: a, jahr: y, monat: m }));
  }

  function checkReminder(allowModal) {
    if (!isReminderWindowNow()) { renderReminderBanner(); return; }
    const incomplete = getIncompleteAdmins();
    if (!incomplete.length) { renderReminderBanner(); return; }

    renderReminderBanner();

    const todayStr = todayIso();
    if (allowModal && state.einstellungen.letzteErinnerung !== todayStr) {
      showReminderModal(incomplete);
      state.einstellungen.letzteErinnerung = todayStr;
      persist();
      const namen = incomplete.map((i) => i.admin.name).join(', ');
      api.showNotification('Buchhaltung! – Erinnerung', `Bitte Buchhaltung vervollständigen für: ${namen}`);
    }
  }

  function showReminderModal(incomplete) {
    const list = document.getElementById('reminder-list');
    list.textContent = '';
    incomplete.forEach(({ admin, monat }) => {
      const li = document.createElement('li');
      li.textContent = `${admin.name} – ${MONAT_LABELS[monat]} noch nicht abgeschlossen`;
      list.appendChild(li);
    });
    document.getElementById('modal-reminder').classList.remove('hidden');
  }

  function closeReminderModal() {
    document.getElementById('modal-reminder').classList.add('hidden');
  }

  function renderReminderBanner() {
    const banner = document.getElementById('reminder-banner');
    if (!isReminderWindowNow()) { banner.classList.add('hidden'); return; }
    const incomplete = getIncompleteAdmins();
    if (!incomplete.length) { banner.classList.add('hidden'); return; }
    banner.textContent = `🔔 ${incomplete.length} Administrator(en) müssen die Buchhaltung noch abschließen – zum Ansehen klicken`;
    banner.classList.remove('hidden');
  }

  // ---------- CSV / Backup export ----------

  function csvEscape(val) {
    const s = String(val == null ? '' : val);
    if (/[";\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function buildYearCsv(admin, jahr) {
    const rows = [['Monat', 'Typ', 'Datum', 'Beschreibung', 'Kategorie', 'Zahlungsart', 'Beleg-Nr.', 'Betrag']];
    MONAT_KEYS.forEach((mk) => {
      const monat = ensureMonth(admin, jahr, mk);
      monat.einnahmen.forEach((e) => rows.push([MONAT_LABELS[mk], 'Einnahme', e.datum, e.beschreibung, e.kategorie, e.zahlungsart, e.beleg || '', e.betrag]));
      monat.ausgaben.forEach((e) => rows.push([MONAT_LABELS[mk], 'Ausgabe', e.datum, e.beschreibung, e.kategorie, e.zahlungsart, e.beleg || '', e.betrag]));
    });
    return rows.map((r) => r.map(csvEscape).join(';')).join('\r\n');
  }

  async function exportYear() {
    const admin = getActiveAdmin();
    const jahr = state.einstellungen.aktivesJahr;
    const csv = buildYearCsv(admin, jahr);
    const name = `Buchhaltung-${admin.name.replace(/[^a-z0-9]+/gi, '_')}-${jahr}.csv`;
    await api.exportCsv(name, '﻿' + csv);
  }

  // ---------- Install banner (Desktop / Mobile) ----------

  function detectPlatform() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/win/i.test(platform)) return 'windows';
    if (/mac/i.test(platform)) return 'mac';
    if (/linux/i.test(platform) && !/android/i.test(ua)) return 'linux';
    return 'unknown';
  }

  function isStandalonePwa() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  function initInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (!banner) return;

    if (isElectron || isStandalonePwa() || sessionStorage.getItem('installBannerDismissed') === '1') {
      banner.classList.add('hidden');
      return;
    }

    const platform = detectPlatform();
    if (platform === 'unknown') { banner.classList.add('hidden'); return; }

    banner.textContent = '';
    const text = document.createElement('p');
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'btn btn-primary btn-small';

    if (RELEASE_ASSETS[platform]) {
      text.textContent = `Diese App gibt es auch als Desktop-Programm für ${platform === 'windows' ? 'Windows' : platform === 'mac' ? 'macOS' : 'Linux'}.`;
      actionBtn.textContent = '⬇ Jetzt herunterladen';
      actionBtn.addEventListener('click', () => {
        window.open(`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download/${RELEASE_ASSETS[platform]}`, '_blank');
      });
    } else if (platform === 'android') {
      text.textContent = 'Als App installieren: Tippe auf „Installieren“, um Buchhaltung! zum Startbildschirm hinzuzufügen.';
      actionBtn.textContent = '📲 App installieren';
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
      });
      actionBtn.addEventListener('click', async () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          await deferredInstallPrompt.userChoice;
          deferredInstallPrompt = null;
        }
      });
    } else if (platform === 'ios') {
      text.textContent = 'Als App installieren: Tippe unten auf „Teilen“ und dann auf „Zum Home-Bildschirm“.';
      actionBtn.textContent = 'Verstanden';
      actionBtn.addEventListener('click', () => dismissInstallBanner());
    }

    banner.appendChild(text);
    banner.appendChild(actionBtn);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn-outline btn-small';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', dismissInstallBanner);
    banner.appendChild(closeBtn);

    banner.classList.remove('hidden');
  }

  function dismissInstallBanner() {
    sessionStorage.setItem('installBannerDismissed', '1');
    document.getElementById('install-banner').classList.add('hidden');
  }

  // ---------- Event wiring ----------

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year-prev').addEventListener('click', () => {
      state.einstellungen.aktivesJahr -= 1;
      ensureYearForAllAdmins(state.einstellungen.aktivesJahr);
      persist();
      render();
    });
    document.getElementById('year-next').addEventListener('click', () => {
      state.einstellungen.aktivesJahr += 1;
      ensureYearForAllAdmins(state.einstellungen.aktivesJahr);
      persist();
      render();
    });

    document.getElementById('btn-overview').addEventListener('click', () => {
      ansicht = ansicht === 'monat' ? 'uebersicht' : 'monat';
      render();
    });

    document.getElementById('btn-export-year').addEventListener('click', exportYear);

    document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
    document.getElementById('settings-close').addEventListener('click', closeSettingsModal);

    document.getElementById('entry-form').addEventListener('submit', submitEntryForm);
    document.getElementById('entry-cancel').addEventListener('click', closeEntryModal);

    document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
    document.getElementById('delete-confirm').addEventListener('click', () => {
      if (deleteCtx) deleteCtx();
      closeDeleteModal();
    });

    document.getElementById('reminder-later').addEventListener('click', closeReminderModal);
    document.getElementById('reminder-goto').addEventListener('click', () => {
      const incomplete = getIncompleteAdmins();
      closeReminderModal();
      if (incomplete.length) {
        state.einstellungen.aktiverAdminId = incomplete[0].admin.id;
        state.einstellungen.aktivesJahr = incomplete[0].jahr;
        state.einstellungen.aktiverMonat = incomplete[0].monat;
        ansicht = 'monat';
        persist();
        render();
      }
    });

    document.getElementById('reminder-banner').addEventListener('click', () => {
      const incomplete = getIncompleteAdmins();
      if (incomplete.length) showReminderModal(incomplete);
    });

    document.getElementById('setting-autostart').addEventListener('change', async (ev) => {
      const val = await api.setAutostart(ev.target.checked);
      state.einstellungen.autostart = !!val;
    });

    document.getElementById('add-cat-einnahme').addEventListener('click', () => {
      const input = document.getElementById('new-cat-einnahme');
      const val = input.value.trim();
      if (val && !state.einstellungen.kategorienEinnahmen.includes(val)) {
        state.einstellungen.kategorienEinnahmen.push(val);
        persist();
        renderCategoryChips();
      }
      input.value = '';
    });

    document.getElementById('add-cat-ausgabe').addEventListener('click', () => {
      const input = document.getElementById('new-cat-ausgabe');
      const val = input.value.trim();
      if (val && !state.einstellungen.kategorienAusgaben.includes(val)) {
        state.einstellungen.kategorienAusgaben.push(val);
        persist();
        renderCategoryChips();
      }
      input.value = '';
    });

    document.getElementById('btn-backup-export').addEventListener('click', async () => {
      await api.exportBackup(JSON.stringify(state, null, 2));
    });

    document.getElementById('btn-backup-import').addEventListener('click', async () => {
      const result = await api.importBackup();
      if (result && !result.canceled && result.data) {
        state = result.data;
        persist();
        render();
      }
    });

    document.getElementById('pin-set-form').addEventListener('submit', submitPinSetForm);
    document.getElementById('pin-set-cancel').addEventListener('click', closePinSetModal);
    document.getElementById('pin-remove').addEventListener('click', removeCurrentPin);

    document.getElementById('pin-enter-form').addEventListener('submit', submitPinEnterForm);
    document.getElementById('pin-enter-cancel').addEventListener('click', closePinEnterModal);

    [document.getElementById('modal-entry'), document.getElementById('modal-delete'),
     document.getElementById('modal-reminder'), document.getElementById('modal-settings'),
     document.getElementById('modal-pin-set'), document.getElementById('modal-pin-enter')].forEach((overlay) => {
      overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay && overlay.id !== 'modal-reminder' && overlay.id !== 'modal-pin-enter') {
          overlay.classList.add('hidden');
        }
      });
    });

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    init();
  });
})();
