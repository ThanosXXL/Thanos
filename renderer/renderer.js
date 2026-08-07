(function () {
  const MAX_ADMINS = 4;
  const REMINDER_CHECK_MS = 30 * 1000;
  const REMINDER_REPEAT_MS = 10 * 60 * 1000;

  let state = { admins: [], employees: [], entries: [] };

  const session = { adminId: null };

  const ui = {
    view: 'kiosk', // 'kiosk' | 'admin'
    adminTab: 'mitarbeiter' // 'mitarbeiter' | 'zeiten' | 'admins' | 'konto'
  };

  const login = {
    selectedAdminId: null,
    pin: ''
  };

  let editingEmployeeId = null;
  let editingAdminId = null;
  let editingEntryId = null;
  let confirmAction = null;
  let zeitenFilterEmployeeId = 'all';

  const lastReminder = new Map();

  const $ = (id) => document.getElementById(id);

  const content = $('content');
  const headerClock = $('headerClock');
  const adminBadge = $('adminBadge');
  const btnAdminLogin = $('btnAdminLogin');
  const btnAdminLogout = $('btnAdminLogout');

  const setupModal = $('setupModal');
  const setupAdminList = $('setupAdminList');
  const setupAdminName = $('setupAdminName');
  const setupAdminPin = $('setupAdminPin');
  const setupAddAdminBtn = $('setupAddAdminBtn');
  const setupError = $('setupError');
  const setupFinishBtn = $('setupFinishBtn');

  const loginModal = $('loginModal');
  const loginAdminChooser = $('loginAdminChooser');
  const loginPinPad = $('loginPinPad');
  const loginSelectedName = $('loginSelectedName');
  const pinDots = $('pinDots');
  const loginError = $('loginError');
  const loginCancelBtn = $('loginCancelBtn');

  const employeeModal = $('employeeModal');
  const employeeModalTitle = $('employeeModalTitle');
  const employeeName = $('employeeName');
  const employeeReminderStart = $('employeeReminderStart');
  const employeeReminderEnd = $('employeeReminderEnd');
  const employeeActive = $('employeeActive');
  const employeeError = $('employeeError');
  const employeeCancelBtn = $('employeeCancelBtn');
  const employeeSaveBtn = $('employeeSaveBtn');

  const adminModal = $('adminModal');
  const adminModalTitle = $('adminModalTitle');
  const adminName = $('adminName');
  const adminPin = $('adminPin');
  const adminPinConfirm = $('adminPinConfirm');
  const adminPinOptionalHint = $('adminPinOptionalHint');
  const adminError = $('adminError');
  const adminCancelBtn = $('adminCancelBtn');
  const adminSaveBtn = $('adminSaveBtn');

  const entryModal = $('entryModal');
  const entryModalTitle = $('entryModalTitle');
  const entryEmployee = $('entryEmployee');
  const entryDate = $('entryDate');
  const entryStart = $('entryStart');
  const entryEnd = $('entryEnd');
  const entryNote = $('entryNote');
  const entryError = $('entryError');
  const entryCancelBtn = $('entryCancelBtn');
  const entrySaveBtn = $('entrySaveBtn');

  const confirmModal = $('confirmModal');
  const confirmTitle = $('confirmTitle');
  const confirmMessage = $('confirmMessage');
  const confirmCancelBtn = $('confirmCancelBtn');
  const confirmOkBtn = $('confirmOkBtn');

  // ---------------- utils ----------------

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // Non-cryptographic hash (cyrb53). Good enough to gate a local kiosk PIN, not a security boundary.
  function simpleHash(str) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function nowHM() {
    const d = new Date();
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function nowMinutes() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function timeToMinutes(hm) {
    if (!hm) return 0;
    const parts = hm.split(':').map(Number);
    return parts[0] * 60 + parts[1];
  }

  function fmtDateDisplay(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  }

  function durationStr(start, end) {
    if (!start || !end) return '–';
    const diff = timeToMinutes(end) - timeToMinutes(start);
    if (diff < 0) return '–';
    return `${Math.floor(diff / 60)}:${pad2(diff % 60)} Std.`;
  }

  function initials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }

  function showModal(modal) {
    modal.classList.add('visible');
  }

  function hideModal(modal) {
    modal.classList.remove('visible');
  }

  // ---------------- persistence ----------------

  async function load() {
    const data = await window.zeitAPI.loadData();
    state = Object.assign({ admins: [], employees: [], entries: [] }, data);
    if (!Array.isArray(state.admins)) state.admins = [];
    if (!Array.isArray(state.employees)) state.employees = [];
    if (!Array.isArray(state.entries)) state.entries = [];
    state.employees.forEach((e) => {
      if (!e.reminderStart) e.reminderStart = '06:30';
      if (!e.reminderEnd) e.reminderEnd = '15:00';
      if (typeof e.active !== 'boolean') e.active = true;
    });
  }

  function persist() {
    window.zeitAPI.saveData(state);
  }

  // ---------------- data helpers ----------------

  function findEmployee(id) {
    return state.employees.find((e) => e.id === id);
  }

  function findAdmin(id) {
    return state.admins.find((a) => a.id === id);
  }

  function findEntry(employeeId, date) {
    return state.entries.find((e) => e.employeeId === employeeId && e.date === date);
  }

  // ---------------- admin accounts ----------------

  function addAdmin(name, pin) {
    if (state.admins.length >= MAX_ADMINS) return null;
    const admin = { id: uid(), name, pinHash: simpleHash(pin) };
    state.admins.push(admin);
    persist();
    return admin;
  }

  function removeAdminById(id) {
    state.admins = state.admins.filter((a) => a.id !== id);
    if (session.adminId === id) {
      session.adminId = null;
      ui.view = 'kiosk';
    }
    persist();
  }

  // ---------------- time entries ----------------

  function clockIn(employeeId) {
    const date = todayStr();
    let entry = findEntry(employeeId, date);
    if (entry && entry.start) return;
    if (!entry) {
      entry = { id: uid(), employeeId, date, start: null, end: null, note: '' };
      state.entries.push(entry);
    }
    entry.start = nowHM();
    persist();
    render();
  }

  function clockOut(employeeId) {
    const date = todayStr();
    const entry = findEntry(employeeId, date);
    if (!entry || !entry.start || entry.end) return;
    entry.end = nowHM();
    persist();
    render();
  }

  // ---------------- reminder engine ----------------

  function maybeNotify(key, title, body) {
    const last = lastReminder.get(key) || 0;
    const now = Date.now();
    if (now - last < REMINDER_REPEAT_MS) return;
    lastReminder.set(key, now);
    try {
      if (!window.Notification) return;
      if (Notification.permission === 'granted') {
        new Notification(title, { body, tag: key });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((p) => {
          if (p === 'granted') new Notification(title, { body, tag: key });
        });
      }
    } catch (err) {
      // Notifications unavailable on this platform - ignore.
    }
  }

  function employeeOverdue(emp, entry, nm) {
    nm = typeof nm === 'number' ? nm : nowMinutes();
    const startMin = timeToMinutes(emp.reminderStart);
    const endMin = timeToMinutes(emp.reminderEnd);
    if (nm >= startMin && (!entry || !entry.start)) return 'start';
    if (nm >= endMin && entry && entry.start && !entry.end) return 'end';
    return null;
  }

  function checkReminders() {
    const date = todayStr();
    const nm = nowMinutes();
    state.employees
      .filter((e) => e.active)
      .forEach((emp) => {
        const entry = findEntry(emp.id, date);
        const overdue = employeeOverdue(emp, entry, nm);
        if (overdue === 'start') {
          maybeNotify('start-' + emp.id, 'Kommen-Zeit fehlt', `${emp.name}: Bitte Start-Zeit eintragen.`);
        } else if (overdue === 'end') {
          maybeNotify('end-' + emp.id, 'Feierabend-Zeit fehlt', `${emp.name}: Bitte Feierabend-Zeit eintragen.`);
        }
      });
    if (ui.view === 'kiosk') render();
  }

  // ---------------- header ----------------

  function updateClock() {
    const d = new Date();
    headerClock.textContent = d.toLocaleString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function updateAdminBadge() {
    if (session.adminId) {
      const admin = findAdmin(session.adminId);
      if (admin) {
        adminBadge.textContent = 'Admin: ' + admin.name;
        adminBadge.classList.remove('hidden');
      }
    } else {
      adminBadge.classList.add('hidden');
    }
    btnAdminLogin.classList.toggle('hidden', ui.view === 'admin');
    btnAdminLogout.classList.toggle('hidden', ui.view !== 'admin');
  }

  // ---------------- render: kiosk ----------------

  function renderKiosk() {
    content.innerHTML = '';

    const toolbar = document.createElement('div');
    toolbar.className = 'kiosk-toolbar';
    toolbar.innerHTML = '<h2>Zeiterfassung – Mitarbeiter</h2>';
    content.appendChild(toolbar);

    const active = state.employees.filter((e) => e.active);

    if (!active.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>Noch keine Mitarbeiter angelegt.<br>Bitte als Administrator einloggen und Mitarbeiter anlegen.</p>';
      content.appendChild(empty);
      return;
    }

    const date = todayStr();
    const nm = nowMinutes();
    const grid = document.createElement('div');
    grid.className = 'kiosk-grid';

    active.forEach((emp) => {
      const entry = findEntry(emp.id, date);
      const overdue = employeeOverdue(emp, entry, nm);

      const tile = document.createElement('div');
      tile.className = 'employee-tile' + (overdue ? ' overdue' : '');

      const h3 = document.createElement('h3');
      h3.textContent = emp.name;
      tile.appendChild(h3);

      const status = document.createElement('div');
      status.className = 'employee-status';

      const rowIn = document.createElement('div');
      rowIn.className = 'row';
      rowIn.innerHTML = `<span>Kommen</span><span class="val${entry && entry.start ? '' : ' missing'}"></span>`;
      rowIn.querySelector('.val').textContent = entry && entry.start ? entry.start : '–';
      status.appendChild(rowIn);

      const rowOut = document.createElement('div');
      rowOut.className = 'row';
      rowOut.innerHTML = `<span>Feierabend</span><span class="val${entry && entry.end ? '' : ' missing'}"></span>`;
      rowOut.querySelector('.val').textContent = entry && entry.end ? entry.end : '–';
      status.appendChild(rowOut);

      tile.appendChild(status);

      const actions = document.createElement('div');
      actions.className = 'tile-actions';

      const btnIn = document.createElement('button');
      btnIn.className = 'btn btn-glossy btn-in';
      btnIn.textContent = 'Kommt';
      btnIn.disabled = !!(entry && entry.start);
      btnIn.addEventListener('click', () => clockIn(emp.id));

      const btnOut = document.createElement('button');
      btnOut.className = 'btn btn-glossy btn-out';
      btnOut.textContent = 'Geht';
      btnOut.disabled = !entry || !entry.start || !!entry.end;
      btnOut.addEventListener('click', () => clockOut(emp.id));

      actions.appendChild(btnIn);
      actions.appendChild(btnOut);
      tile.appendChild(actions);

      grid.appendChild(tile);
    });

    content.appendChild(grid);
  }

  // ---------------- render: admin panel ----------------

  function renderAdmin() {
    content.innerHTML = '';

    const tabs = document.createElement('div');
    tabs.className = 'admin-tabs';

    [
      ['mitarbeiter', 'Mitarbeiter'],
      ['zeiten', 'Zeiten'],
      ['admins', 'Administratoren'],
      ['konto', 'Mein Konto']
    ].forEach(([key, label]) => {
      const tab = document.createElement('div');
      tab.className = 'admin-tab' + (ui.adminTab === key ? ' active' : '');
      tab.textContent = label;
      tab.addEventListener('click', () => {
        ui.adminTab = key;
        render();
      });
      tabs.appendChild(tab);
    });

    content.appendChild(tabs);

    const panel = document.createElement('div');
    if (ui.adminTab === 'mitarbeiter') renderMitarbeiterTab(panel);
    else if (ui.adminTab === 'zeiten') renderZeitenTab(panel);
    else if (ui.adminTab === 'admins') renderAdminsTab(panel);
    else renderKontoTab(panel);
    content.appendChild(panel);
  }

  function renderMitarbeiterTab(panel) {
    const date = todayStr();
    const nm = nowMinutes();

    const statusCard = document.createElement('div');
    statusCard.className = 'panel-card';
    statusCard.innerHTML = '<h3>Status heute</h3>';
    const statusList = document.createElement('div');
    statusList.className = 'status-today-list';

    const activeEmployees = state.employees.filter((e) => e.active);
    if (!activeEmployees.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Keine aktiven Mitarbeiter.';
      statusList.appendChild(p);
    }
    activeEmployees.forEach((emp) => {
      const entry = findEntry(emp.id, date);
      const overdue = employeeOverdue(emp, entry, nm);
      const chip = document.createElement('span');
      if (overdue === 'start') {
        chip.className = 'status-chip overdue';
        chip.textContent = `${emp.name}: Kommen fehlt`;
      } else if (overdue === 'end') {
        chip.className = 'status-chip overdue';
        chip.textContent = `${emp.name}: Feierabend fehlt`;
      } else if (entry && entry.start && entry.end) {
        chip.className = 'status-chip ok';
        chip.textContent = `${emp.name}: ${entry.start}–${entry.end}`;
      } else {
        chip.className = 'status-chip';
        chip.textContent = entry && entry.start ? `${emp.name}: seit ${entry.start} da` : `${emp.name}: noch nicht fällig`;
      }
      statusList.appendChild(chip);
    });
    statusCard.appendChild(statusList);
    panel.appendChild(statusCard);

    const listCard = document.createElement('div');
    listCard.className = 'panel-card';

    const header = document.createElement('div');
    header.className = 'panel-card-header';
    header.innerHTML = '<h3>Mitarbeiter verwalten</h3>';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-glossy btn-primary';
    addBtn.textContent = '+ Mitarbeiter hinzufügen';
    addBtn.addEventListener('click', () => openEmployeeModal(null));
    header.appendChild(addBtn);
    listCard.appendChild(header);

    if (!state.employees.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Noch keine Mitarbeiter angelegt.';
      listCard.appendChild(p);
    } else {
      const table = document.createElement('table');
      table.className = 'data-table';
      table.innerHTML = `<thead><tr>
        <th>Name</th><th>Kommen ab</th><th>Feierabend ab</th><th>Status</th><th></th>
      </tr></thead>`;
      const tbody = document.createElement('tbody');
      state.employees.forEach((emp) => {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.textContent = emp.name;
        tr.appendChild(tdName);

        const tdStart = document.createElement('td');
        tdStart.textContent = emp.reminderStart;
        tr.appendChild(tdStart);

        const tdEnd = document.createElement('td');
        tdEnd.textContent = emp.reminderEnd;
        tr.appendChild(tdEnd);

        const tdActive = document.createElement('td');
        tdActive.textContent = emp.active ? 'Aktiv' : 'Inaktiv';
        if (!emp.active) tdActive.classList.add('muted');
        tr.appendChild(tdActive);

        const tdActions = document.createElement('td');
        const actions = document.createElement('div');
        actions.className = 'table-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.textContent = 'Bearbeiten';
        editBtn.addEventListener('click', () => openEmployeeModal(emp.id));
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = 'Löschen';
        delBtn.addEventListener('click', () => {
          openConfirm(
            `"${emp.name}" wirklich löschen? Alle Zeiteinträge dieses Mitarbeiters gehen verloren.`,
            () => {
              state.employees = state.employees.filter((e) => e.id !== emp.id);
              state.entries = state.entries.filter((e) => e.employeeId !== emp.id);
              persist();
              render();
            }
          );
        });
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        tdActions.appendChild(actions);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      listCard.appendChild(table);
    }

    panel.appendChild(listCard);
  }

  function renderZeitenTab(panel) {
    const card = document.createElement('div');
    card.className = 'panel-card';

    const header = document.createElement('div');
    header.className = 'panel-card-header';
    header.innerHTML = '<h3>Zeiteinträge</h3>';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-glossy btn-primary';
    addBtn.textContent = '+ Eintrag erfassen';
    addBtn.disabled = !state.employees.length;
    addBtn.addEventListener('click', () => openEntryModal(null));
    header.appendChild(addBtn);
    card.appendChild(header);

    const filters = document.createElement('div');
    filters.className = 'filters-row';
    const select = document.createElement('select');
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'Alle Mitarbeiter';
    select.appendChild(allOpt);
    state.employees.forEach((emp) => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = emp.name;
      select.appendChild(opt);
    });
    select.value = zeitenFilterEmployeeId;
    select.addEventListener('change', () => {
      zeitenFilterEmployeeId = select.value;
      render();
    });
    filters.appendChild(select);
    card.appendChild(filters);

    let entries = state.entries.slice();
    if (zeitenFilterEmployeeId !== 'all') {
      entries = entries.filter((e) => e.employeeId === zeitenFilterEmployeeId);
    }
    entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    entries = entries.slice(0, 200);

    if (!entries.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Keine Zeiteinträge vorhanden.';
      card.appendChild(p);
    } else {
      const table = document.createElement('table');
      table.className = 'data-table';
      table.innerHTML = `<thead><tr>
        <th>Datum</th><th>Mitarbeiter</th><th>Kommen</th><th>Gehen</th><th>Dauer</th><th>Notiz</th><th></th>
      </tr></thead>`;
      const tbody = document.createElement('tbody');
      entries.forEach((entry) => {
        const emp = findEmployee(entry.employeeId);
        const tr = document.createElement('tr');

        const tdDate = document.createElement('td');
        tdDate.textContent = fmtDateDisplay(entry.date);
        tr.appendChild(tdDate);

        const tdEmp = document.createElement('td');
        tdEmp.textContent = emp ? emp.name : '(gelöscht)';
        tr.appendChild(tdEmp);

        const tdStart = document.createElement('td');
        tdStart.textContent = entry.start || '–';
        tr.appendChild(tdStart);

        const tdEnd = document.createElement('td');
        tdEnd.textContent = entry.end || '–';
        tr.appendChild(tdEnd);

        const tdDur = document.createElement('td');
        tdDur.textContent = durationStr(entry.start, entry.end);
        tr.appendChild(tdDur);

        const tdNote = document.createElement('td');
        tdNote.textContent = entry.note || '';
        tr.appendChild(tdNote);

        const tdActions = document.createElement('td');
        const actions = document.createElement('div');
        actions.className = 'table-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.textContent = 'Bearbeiten';
        editBtn.addEventListener('click', () => openEntryModal(entry));
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = 'Löschen';
        delBtn.addEventListener('click', () => {
          openConfirm('Diesen Zeiteintrag wirklich löschen?', () => {
            state.entries = state.entries.filter((e) => e.id !== entry.id);
            persist();
            render();
          });
        });
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        tdActions.appendChild(actions);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      card.appendChild(table);
    }

    panel.appendChild(card);
  }

  function renderAdminsTab(panel) {
    const card = document.createElement('div');
    card.className = 'panel-card';

    const header = document.createElement('div');
    header.className = 'panel-card-header';
    header.innerHTML = '<h3>Administratoren</h3>';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-glossy btn-primary';
    addBtn.textContent = '+ Administrator hinzufügen';
    addBtn.disabled = state.admins.length >= MAX_ADMINS;
    addBtn.addEventListener('click', () => openAdminModal(null));
    header.appendChild(addBtn);
    card.appendChild(header);

    const list = document.createElement('div');
    list.className = 'admin-list';
    state.admins.forEach((admin) => {
      const row = document.createElement('div');
      row.className = 'admin-row';

      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = initials(admin.name);
      row.appendChild(avatar);

      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = admin.name;
      row.appendChild(name);

      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.textContent = 'Bearbeiten';
      editBtn.addEventListener('click', () => openAdminModal(admin.id));
      row.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn danger';
      delBtn.textContent = 'Löschen';
      delBtn.disabled = state.admins.length <= 1;
      delBtn.title = delBtn.disabled ? 'Mindestens ein Administrator muss bestehen bleiben.' : '';
      delBtn.addEventListener('click', () => {
        openConfirm(`Administrator "${admin.name}" wirklich löschen?`, () => {
          removeAdminById(admin.id);
          render();
        });
      });
      row.appendChild(delBtn);

      list.appendChild(row);
    });
    card.appendChild(list);
    panel.appendChild(card);
  }

  function renderKontoTab(panel) {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const admin = findAdmin(session.adminId);
    card.innerHTML = '<h3>Mein Konto</h3>';
    if (admin) {
      const p = document.createElement('p');
      p.textContent = `Angemeldet als: ${admin.name}`;
      card.appendChild(p);
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-glossy btn-primary';
      editBtn.textContent = 'Name / PIN ändern';
      editBtn.addEventListener('click', () => openAdminModal(admin.id));
      card.appendChild(editBtn);
    }
    panel.appendChild(card);
  }

  // ---------------- render dispatch ----------------

  function render() {
    updateAdminBadge();
    if (ui.view === 'kiosk') renderKiosk();
    else renderAdmin();
  }

  // ---------------- setup wizard ----------------

  function renderSetupList() {
    setupAdminList.innerHTML = '';
    state.admins.forEach((admin) => {
      const row = document.createElement('div');
      row.className = 'admin-row';

      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = initials(admin.name);
      row.appendChild(avatar);

      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = admin.name;
      row.appendChild(name);

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn danger';
      delBtn.textContent = 'Entfernen';
      delBtn.addEventListener('click', () => {
        state.admins = state.admins.filter((a) => a.id !== admin.id);
        persist();
        renderSetupList();
      });
      row.appendChild(delBtn);

      setupAdminList.appendChild(row);
    });

    setupFinishBtn.disabled = state.admins.length < 1;
    const full = state.admins.length >= MAX_ADMINS;
    setupAdminName.disabled = full;
    setupAdminPin.disabled = full;
    setupAddAdminBtn.disabled = full;
  }

  function openSetupModal() {
    setupError.textContent = '';
    setupAdminName.value = '';
    setupAdminPin.value = '';
    renderSetupList();
    showModal(setupModal);
  }

  setupAddAdminBtn.addEventListener('click', () => {
    const name = setupAdminName.value.trim();
    const pin = setupAdminPin.value;
    setupError.textContent = '';
    if (!name) {
      setupError.textContent = 'Bitte einen Namen eingeben.';
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setupError.textContent = 'Der PIN muss genau 4 Ziffern haben.';
      return;
    }
    if (state.admins.length >= MAX_ADMINS) return;
    addAdmin(name, pin);
    setupAdminName.value = '';
    setupAdminPin.value = '';
    renderSetupList();
    setupAdminName.focus();
  });

  setupFinishBtn.addEventListener('click', () => {
    if (state.admins.length < 1) return;
    hideModal(setupModal);
    render();
  });

  // ---------------- login ----------------

  function openLoginModal() {
    login.selectedAdminId = null;
    login.pin = '';
    loginError.textContent = '';
    loginPinPad.classList.add('hidden');
    loginAdminChooser.classList.remove('hidden');
    renderLoginChooser();
    showModal(loginModal);
  }

  function renderLoginChooser() {
    loginAdminChooser.innerHTML = '';
    if (!state.admins.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Keine Administratoren angelegt.';
      loginAdminChooser.appendChild(p);
      return;
    }
    state.admins.forEach((admin) => {
      const tile = document.createElement('div');
      tile.className = 'admin-tile';
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = initials(admin.name);
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = admin.name;
      tile.appendChild(avatar);
      tile.appendChild(name);
      tile.addEventListener('click', () => selectLoginAdmin(admin.id));
      loginAdminChooser.appendChild(tile);
    });
  }

  function selectLoginAdmin(id) {
    login.selectedAdminId = id;
    login.pin = '';
    loginError.textContent = '';
    const admin = findAdmin(id);
    loginSelectedName.textContent = admin ? admin.name : '';
    loginAdminChooser.classList.add('hidden');
    loginPinPad.classList.remove('hidden');
    renderPinDots();
  }

  function renderPinDots() {
    const dots = pinDots.querySelectorAll('.pin-dot');
    dots.forEach((dot, i) => dot.classList.toggle('filled', i < login.pin.length));
  }

  function attemptLogin() {
    const admin = findAdmin(login.selectedAdminId);
    if (!admin) return;
    if (admin.pinHash === simpleHash(login.pin)) {
      session.adminId = admin.id;
      ui.view = 'admin';
      ui.adminTab = 'mitarbeiter';
      hideModal(loginModal);
      render();
    } else {
      loginError.textContent = 'Falscher PIN.';
      loginPinPad.classList.add('shake');
      setTimeout(() => loginPinPad.classList.remove('shake'), 350);
      login.pin = '';
      renderPinDots();
    }
  }

  function pressPinKey(key) {
    if (key === 'cancel') {
      login.selectedAdminId = null;
      login.pin = '';
      loginError.textContent = '';
      loginPinPad.classList.add('hidden');
      loginAdminChooser.classList.remove('hidden');
      return;
    }
    if (key === 'back') {
      login.pin = login.pin.slice(0, -1);
      renderPinDots();
      return;
    }
    if (login.pin.length >= 4) return;
    login.pin += key;
    renderPinDots();
    if (login.pin.length === 4) {
      setTimeout(attemptLogin, 150);
    }
  }

  document.querySelectorAll('.pin-key').forEach((btn) => {
    btn.addEventListener('click', () => pressPinKey(btn.dataset.key));
  });

  loginCancelBtn.addEventListener('click', () => hideModal(loginModal));

  // ---------------- employee modal ----------------

  function openEmployeeModal(id) {
    editingEmployeeId = id;
    employeeError.textContent = '';
    if (id) {
      const emp = findEmployee(id);
      employeeModalTitle.textContent = 'Mitarbeiter bearbeiten';
      employeeName.value = emp.name;
      employeeReminderStart.value = emp.reminderStart;
      employeeReminderEnd.value = emp.reminderEnd;
      employeeActive.checked = emp.active;
    } else {
      employeeModalTitle.textContent = 'Mitarbeiter hinzufügen';
      employeeName.value = '';
      employeeReminderStart.value = '06:30';
      employeeReminderEnd.value = '15:00';
      employeeActive.checked = true;
    }
    showModal(employeeModal);
    employeeName.focus();
  }

  employeeCancelBtn.addEventListener('click', () => hideModal(employeeModal));

  employeeSaveBtn.addEventListener('click', () => {
    const name = employeeName.value.trim();
    if (!name) {
      employeeError.textContent = 'Bitte einen Namen eingeben.';
      return;
    }
    const reminderStart = employeeReminderStart.value || '06:30';
    const reminderEnd = employeeReminderEnd.value || '15:00';
    const active = employeeActive.checked;

    if (editingEmployeeId) {
      const emp = findEmployee(editingEmployeeId);
      emp.name = name;
      emp.reminderStart = reminderStart;
      emp.reminderEnd = reminderEnd;
      emp.active = active;
    } else {
      state.employees.push({
        id: uid(),
        name,
        reminderStart,
        reminderEnd,
        active,
        createdBy: session.adminId
      });
    }
    persist();
    hideModal(employeeModal);
    render();
  });

  // ---------------- admin modal ----------------

  function openAdminModal(id) {
    editingAdminId = id;
    adminError.textContent = '';
    adminPin.value = '';
    adminPinConfirm.value = '';
    if (id) {
      const admin = findAdmin(id);
      adminModalTitle.textContent = 'Administrator bearbeiten';
      adminName.value = admin.name;
      adminPinOptionalHint.classList.remove('hidden');
    } else {
      adminModalTitle.textContent = 'Administrator hinzufügen';
      adminName.value = '';
      adminPinOptionalHint.classList.add('hidden');
    }
    showModal(adminModal);
    adminName.focus();
  }

  adminCancelBtn.addEventListener('click', () => hideModal(adminModal));

  adminSaveBtn.addEventListener('click', () => {
    const name = adminName.value.trim();
    const pin = adminPin.value;
    const pinConfirm = adminPinConfirm.value;
    if (!name) {
      adminError.textContent = 'Bitte einen Namen eingeben.';
      return;
    }

    if (!editingAdminId) {
      if (state.admins.length >= MAX_ADMINS) {
        adminError.textContent = `Es sind maximal ${MAX_ADMINS} Administratoren möglich.`;
        return;
      }
      if (!/^\d{4}$/.test(pin)) {
        adminError.textContent = 'Der PIN muss genau 4 Ziffern haben.';
        return;
      }
      if (pin !== pinConfirm) {
        adminError.textContent = 'Die PINs stimmen nicht überein.';
        return;
      }
      addAdmin(name, pin);
    } else {
      const admin = findAdmin(editingAdminId);
      admin.name = name;
      if (pin || pinConfirm) {
        if (!/^\d{4}$/.test(pin)) {
          adminError.textContent = 'Der PIN muss genau 4 Ziffern haben.';
          return;
        }
        if (pin !== pinConfirm) {
          adminError.textContent = 'Die PINs stimmen nicht überein.';
          return;
        }
        admin.pinHash = simpleHash(pin);
      }
      persist();
    }
    hideModal(adminModal);
    render();
  });

  // ---------------- entry modal ----------------

  function openEntryModal(entry) {
    editingEntryId = entry ? entry.id : null;
    entryError.textContent = '';

    entryEmployee.innerHTML = '';
    state.employees.forEach((emp) => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = emp.name;
      entryEmployee.appendChild(opt);
    });

    if (entry) {
      entryModalTitle.textContent = 'Zeiteintrag bearbeiten';
      entryEmployee.value = entry.employeeId;
      entryEmployee.disabled = true;
      entryDate.value = entry.date;
      entryDate.disabled = true;
      entryStart.value = entry.start || '';
      entryEnd.value = entry.end || '';
      entryNote.value = entry.note || '';
    } else {
      entryModalTitle.textContent = 'Zeiteintrag erfassen';
      entryEmployee.disabled = false;
      entryDate.disabled = false;
      entryDate.value = todayStr();
      entryStart.value = '';
      entryEnd.value = '';
      entryNote.value = '';
    }
    showModal(entryModal);
  }

  entryCancelBtn.addEventListener('click', () => hideModal(entryModal));

  entrySaveBtn.addEventListener('click', () => {
    const employeeId = entryEmployee.value;
    const date = entryDate.value;
    const start = entryStart.value || null;
    const end = entryEnd.value || null;
    const note = entryNote.value.trim();

    if (!employeeId || !date) {
      entryError.textContent = 'Mitarbeiter und Datum sind erforderlich.';
      return;
    }
    if (start && end && timeToMinutes(end) < timeToMinutes(start)) {
      entryError.textContent = 'Die Gehen-Zeit darf nicht vor der Kommen-Zeit liegen.';
      return;
    }

    if (editingEntryId) {
      const entry = state.entries.find((e) => e.id === editingEntryId);
      entry.start = start;
      entry.end = end;
      entry.note = note;
    } else {
      if (findEntry(employeeId, date)) {
        entryError.textContent = 'Für diesen Mitarbeiter existiert an diesem Tag bereits ein Eintrag. Bitte bearbeiten.';
        return;
      }
      state.entries.push({ id: uid(), employeeId, date, start, end, note });
    }
    persist();
    hideModal(entryModal);
    render();
  });

  // ---------------- confirm modal ----------------

  function openConfirm(message, action, title) {
    confirmAction = action;
    confirmTitle.textContent = title || 'Bitte bestätigen';
    confirmMessage.textContent = message;
    showModal(confirmModal);
  }

  confirmCancelBtn.addEventListener('click', () => {
    confirmAction = null;
    hideModal(confirmModal);
  });

  confirmOkBtn.addEventListener('click', () => {
    if (confirmAction) confirmAction();
    confirmAction = null;
    hideModal(confirmModal);
  });

  // ---------------- header actions ----------------

  btnAdminLogin.addEventListener('click', openLoginModal);

  btnAdminLogout.addEventListener('click', () => {
    session.adminId = null;
    ui.view = 'kiosk';
    render();
  });

  // ---------------- init ----------------

  async function init() {
    await load();

    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    updateClock();
    setInterval(updateClock, 1000);

    render();

    if (!state.admins.length) {
      openSetupModal();
    }

    checkReminders();
    setInterval(checkReminders, REMINDER_CHECK_MS);
  }

  init();
})();
