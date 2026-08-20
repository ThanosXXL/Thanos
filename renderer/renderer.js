(function () {
  const MAX_DOZENTEN = 4;
  const PRIORITIES = ['normal', 'hoch', 'dringend'];
  const PRIORITY_LABELS = { normal: 'Normal', hoch: 'Hoch', dringend: 'Dringend' };

  let state = { dozenten: [] };
  let activeDozentId = null;
  let searchQuery = '';
  let license = null;

  const dozentTabs = document.getElementById('dozentTabs');
  const content = document.getElementById('content');
  const emptyState = document.getElementById('emptyState');
  const statsBar = document.getElementById('statsBar');
  const globalSearch = document.getElementById('globalSearch');
  const licenseBadge = document.getElementById('licenseBadge');

  const addDozentModal = document.getElementById('addDozentModal');
  const newDozentNameInput = document.getElementById('newDozentName');
  const deleteDozentModal = document.getElementById('deleteDozentModal');
  const deleteDozentText = document.getElementById('deleteDozentText');

  const lockOverlay = document.getElementById('lockOverlay');
  const lockPinInput = document.getElementById('lockPinInput');
  const lockError = document.getElementById('lockError');
  const lockMessage = document.getElementById('lockMessage');

  const settingsModal = document.getElementById('settingsModal');
  const pinStatusText = document.getElementById('pinStatusText');
  const pinSetRow = document.getElementById('pinSetRow');
  const pinRemoveRow = document.getElementById('pinRemoveRow');
  const newPinInput = document.getElementById('newPinInput');
  const currentPinInput = document.getElementById('currentPinInput');
  const licenseStatusText = document.getElementById('licenseStatusText');
  const autoRenewToggle = document.getElementById('autoRenewToggle');
  const licenseKeyInput = document.getElementById('licenseKeyInput');
  const licenseError = document.getElementById('licenseError');

  let pendingDeleteId = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function persist() {
    window.dashboardAPI.saveData(state);
  }

  function findDozent(id) {
    return state.dozenten.find((d) => d.id === id);
  }

  function formatDate(isoOrTimestamp) {
    const d = new Date(isoOrTimestamp);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function isOverdue(item) {
    if (!item.dueDate || item.done) return false;
    return new Date(item.dueDate).setHours(23, 59, 59, 999) < Date.now();
  }

  // ---------- Sperrbildschirm ----------

  function showLock() {
    lockOverlay.classList.add('visible');
    lockError.textContent = '';
    lockPinInput.value = '';
    lockPinInput.disabled = false;
    lockPinInput.focus();
  }

  function hideLock() {
    lockOverlay.classList.remove('visible');
  }

  async function attemptUnlock() {
    const result = await window.dashboardAPI.verifyPin(lockPinInput.value);
    if (result.ok) {
      hideLock();
      await afterUnlock();
      return;
    }
    if (result.lockedForMs) {
      const seconds = Math.ceil(result.lockedForMs / 1000);
      lockError.textContent = `Zu viele Fehlversuche. Bitte ${seconds}s warten.`;
      lockPinInput.disabled = true;
      setTimeout(() => {
        lockPinInput.disabled = false;
        lockError.textContent = '';
      }, result.lockedForMs);
    } else {
      lockError.textContent = `Falsche PIN. Noch ${result.attemptsLeft} Versuch(e).`;
    }
    lockPinInput.value = '';
    lockPinInput.focus();
  }

  document.getElementById('lockUnlockBtn').addEventListener('click', attemptUnlock);
  lockPinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptUnlock();
  });

  // ---------- Lizenz ----------

  async function refreshLicense() {
    license = await window.dashboardAPI.getLicense();
    renderLicenseBadge();
    renderLicenseSettings();
  }

  function renderLicenseBadge() {
    if (!license) {
      licenseBadge.textContent = '';
      return;
    }
    const expired = Date.now() >= license.expiresAt;
    if (expired) {
      licenseBadge.textContent = 'Abo abgelaufen';
      licenseBadge.className = 'license-badge expired';
    } else {
      licenseBadge.textContent = `Abo aktiv bis ${formatDate(license.expiresAt)}`;
      licenseBadge.className = 'license-badge active';
    }
  }

  function renderLicenseSettings() {
    if (!license) return;
    const expired = Date.now() >= license.expiresAt;
    if (expired) {
      licenseStatusText.textContent = license.cancelled
        ? `Abo gekündigt, abgelaufen am ${formatDate(license.expiresAt)}. Bitte neuen Lizenzschlüssel aktivieren.`
        : `Abo abgelaufen am ${formatDate(license.expiresAt)}.`;
    } else if (license.cancelled) {
      licenseStatusText.textContent = `Gekündigt – läuft am ${formatDate(license.expiresAt)} aus.`;
    } else {
      licenseStatusText.textContent = `Aktiv bis ${formatDate(license.expiresAt)}${license.autoRenew ? ' (verlängert sich automatisch um 1 Jahr)' : ''}.`;
    }
    autoRenewToggle.checked = !!license.autoRenew;
  }

  autoRenewToggle.addEventListener('change', async () => {
    license = await window.dashboardAPI.setAutoRenew(autoRenewToggle.checked);
    renderLicenseBadge();
    renderLicenseSettings();
  });

  document.getElementById('activateLicenseBtn').addEventListener('click', async () => {
    licenseError.textContent = '';
    try {
      license = await window.dashboardAPI.activateLicense(licenseKeyInput.value);
      licenseKeyInput.value = '';
      renderLicenseBadge();
      renderLicenseSettings();
    } catch (err) {
      licenseError.textContent = 'Ungültiger Lizenzschlüssel (Format: XXXX-XXXX-XXXX-XXXX).';
    }
  });

  document.getElementById('cancelLicenseBtn').addEventListener('click', async () => {
    license = await window.dashboardAPI.cancelLicense();
    renderLicenseBadge();
    renderLicenseSettings();
  });

  // ---------- Einstellungen: PIN ----------

  async function renderPinSettings() {
    const hasPin = await window.dashboardAPI.hasPin();
    pinStatusText.textContent = hasPin ? 'PIN-Sperre ist aktiv.' : 'Keine PIN gesetzt.';
    pinSetRow.style.display = hasPin ? 'none' : 'flex';
    pinRemoveRow.style.display = hasPin ? 'flex' : 'none';
  }

  document.getElementById('savePinBtn').addEventListener('click', async () => {
    try {
      await window.dashboardAPI.setPin(newPinInput.value);
      newPinInput.value = '';
      await renderPinSettings();
    } catch (err) {
      pinStatusText.textContent = 'PIN muss mindestens 4 Zeichen haben.';
    }
  });

  document.getElementById('removePinBtn').addEventListener('click', async () => {
    const ok = await window.dashboardAPI.removePin(currentPinInput.value);
    currentPinInput.value = '';
    if (ok) {
      await renderPinSettings();
    } else {
      pinStatusText.textContent = 'Falsche PIN – entfernen fehlgeschlagen.';
    }
  });

  document.getElementById('openSettingsBtn').addEventListener('click', async () => {
    await renderPinSettings();
    renderLicenseSettings();
    settingsModal.classList.add('visible');
  });
  document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    settingsModal.classList.remove('visible');
  });

  // ---------- Dozenten ----------

  function openAddDozentModal() {
    if (state.dozenten.length >= MAX_DOZENTEN) return;
    newDozentNameInput.value = '';
    addDozentModal.classList.add('visible');
    newDozentNameInput.focus();
  }

  function closeAddDozentModal() {
    addDozentModal.classList.remove('visible');
  }

  function confirmAddDozent() {
    const name = newDozentNameInput.value.trim();
    if (!name) return;
    if (state.dozenten.length >= MAX_DOZENTEN) return;

    const dozent = {
      id: uid(),
      name,
      todos: [],
      openProjects: [],
      doneProjects: [],
      chat: []
    };
    state.dozenten.push(dozent);
    activeDozentId = dozent.id;
    persist();
    closeAddDozentModal();
    render();
  }

  function openDeleteDozentModal(id) {
    const dozent = findDozent(id);
    if (!dozent) return;
    pendingDeleteId = id;
    deleteDozentText.textContent = `Soll "${dozent.name}" wirklich entfernt werden? Alle zugehörigen Listen gehen verloren.`;
    deleteDozentModal.classList.add('visible');
  }

  function closeDeleteDozentModal() {
    pendingDeleteId = null;
    deleteDozentModal.classList.remove('visible');
  }

  function confirmDeleteDozent() {
    if (!pendingDeleteId) return;
    state.dozenten = state.dozenten.filter((d) => d.id !== pendingDeleteId);
    if (activeDozentId === pendingDeleteId) {
      activeDozentId = state.dozenten.length ? state.dozenten[0].id : null;
    }
    persist();
    closeDeleteDozentModal();
    render();
  }

  function addItem(dozentId, listKey, text, opts) {
    const dozent = findDozent(dozentId);
    if (!dozent || !text.trim()) return;
    dozent[listKey].push({
      id: uid(),
      text: text.trim(),
      done: false,
      priority: (opts && opts.priority) || 'normal',
      dueDate: (opts && opts.dueDate) || null
    });
    persist();
    render();
  }

  function deleteItem(dozentId, listKey, itemId) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    dozent[listKey] = dozent[listKey].filter((i) => i.id !== itemId);
    persist();
    render();
  }

  function toggleTodo(dozentId, itemId) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    const item = dozent.todos.find((i) => i.id === itemId);
    if (!item) return;
    item.done = !item.done;
    persist();
    render();
  }

  function moveProject(dozentId, itemId, fromKey, toKey) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    const idx = dozent[fromKey].findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const [item] = dozent[fromKey].splice(idx, 1);
    dozent[toKey].push(item);
    persist();
    render();
  }

  function addChatMessage(dozentId, text) {
    const dozent = findDozent(dozentId);
    if (!dozent || !text.trim()) return;
    dozent.chat.push({
      id: uid(),
      text: text.trim(),
      time: new Date().toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    });
    persist();
    render();
  }

  function deleteChatMessage(dozentId, messageId) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    dozent.chat = dozent.chat.filter((m) => m.id !== messageId);
    persist();
    render();
  }

  function renderTabs() {
    dozentTabs.innerHTML = '';

    state.dozenten.forEach((dozent) => {
      const tab = document.createElement('div');
      tab.className = 'dozent-tab' + (dozent.id === activeDozentId ? ' active' : '');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'tab-name';
      nameSpan.textContent = dozent.name;
      const removeSpan = document.createElement('span');
      removeSpan.className = 'remove-x';
      removeSpan.title = 'Entfernen';
      removeSpan.textContent = '×';
      tab.appendChild(nameSpan);
      tab.appendChild(removeSpan);

      nameSpan.addEventListener('click', () => {
        activeDozentId = dozent.id;
        render();
      });

      removeSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteDozentModal(dozent.id);
      });

      dozentTabs.appendChild(tab);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-dozent-btn';
    addBtn.textContent = '+ Dozent hinzufügen';
    addBtn.disabled = state.dozenten.length >= MAX_DOZENTEN;
    addBtn.title = addBtn.disabled ? 'Maximal 4 Dozenten' : '';
    addBtn.addEventListener('click', openAddDozentModal);
    dozentTabs.appendChild(addBtn);
  }

  function matchesSearch(item) {
    if (!searchQuery) return true;
    return item.text.toLowerCase().includes(searchQuery);
  }

  function buildItemMeta(item) {
    const meta = document.createElement('span');
    meta.className = 'item-meta';

    const badge = document.createElement('span');
    badge.className = 'priority-badge priority-' + item.priority;
    badge.textContent = PRIORITY_LABELS[item.priority] || PRIORITY_LABELS.normal;
    meta.appendChild(badge);

    if (item.dueDate) {
      const due = document.createElement('span');
      due.className = 'due-badge' + (isOverdue(item) ? ' overdue' : '');
      due.textContent = formatDate(item.dueDate);
      meta.appendChild(due);
    }

    return meta;
  }

  function buildListColumn({ title, extraClass, dozentId, listKey, items, renderItem }) {
    const col = document.createElement('div');
    col.className = 'list-column' + (extraClass ? ' ' + extraClass : '');

    const heading = document.createElement('h3');
    heading.textContent = title;
    col.appendChild(heading);

    const addRow = document.createElement('div');
    addRow.className = 'add-item-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Neuer Eintrag...';
    const prioritySelect = document.createElement('select');
    prioritySelect.className = 'priority-select';
    PRIORITIES.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = PRIORITY_LABELS[p];
      prioritySelect.appendChild(opt);
    });
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'due-input';
    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    const submit = () => {
      addItem(dozentId, listKey, input.value, {
        priority: prioritySelect.value,
        dueDate: dateInput.value || null
      });
      input.value = '';
      dateInput.value = '';
      prioritySelect.value = 'normal';
      input.focus();
    };
    addBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    addRow.appendChild(input);
    addRow.appendChild(prioritySelect);
    addRow.appendChild(dateInput);
    addRow.appendChild(addBtn);
    col.appendChild(addRow);

    const ul = document.createElement('ul');
    ul.className = 'item-list';
    items.filter(matchesSearch).forEach((item) => ul.appendChild(renderItem(item)));
    col.appendChild(ul);

    return col;
  }

  function renderStats(dozent) {
    statsBar.innerHTML = '';
    const stats = [
      { label: 'Offene Aufgaben', value: dozent.todos.filter((i) => !i.done).length },
      { label: 'Erledigte Aufgaben', value: dozent.todos.filter((i) => i.done).length },
      { label: 'Offene Projekte', value: dozent.openProjects.length },
      { label: 'Abgeschlossene Projekte', value: dozent.doneProjects.length },
      {
        label: 'Überfällig',
        value: [...dozent.todos, ...dozent.openProjects].filter(isOverdue).length,
        warn: true
      }
    ];
    stats.forEach((s) => {
      const pill = document.createElement('span');
      pill.className = 'stat-pill' + (s.warn && s.value > 0 ? ' warn' : '');
      pill.textContent = `${s.label}: ${s.value}`;
      statsBar.appendChild(pill);
    });
  }

  function renderPanel() {
    content.innerHTML = '';

    if (!state.dozenten.length) {
      content.appendChild(emptyState);
      statsBar.innerHTML = '';
      return;
    }

    const dozent = findDozent(activeDozentId) || state.dozenten[0];
    activeDozentId = dozent.id;
    renderStats(dozent);

    const panel = document.createElement('div');
    panel.className = 'dozent-panel';

    const header = document.createElement('div');
    header.className = 'panel-header';
    const h2 = document.createElement('h2');
    h2.textContent = dozent.name;
    header.appendChild(h2);
    panel.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'lists-grid';

    // Liste eins: To-Do-Liste / Aufgabenliste
    const todoCol = buildListColumn({
      title: 'Liste 1 – To-Do-Liste',
      extraClass: '',
      dozentId: dozent.id,
      listKey: 'todos',
      items: dozent.todos,
      renderItem: (item) => {
        const li = document.createElement('li');
        if (item.done) li.classList.add('completed');
        if (isOverdue(item)) li.classList.add('overdue-row');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.done;
        checkbox.addEventListener('change', () => toggleTodo(dozent.id, item.id));
        const span = document.createElement('span');
        span.className = 'item-text';
        span.textContent = item.text;
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = '✕';
        delBtn.title = 'Löschen';
        delBtn.addEventListener('click', () => deleteItem(dozent.id, 'todos', item.id));
        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(buildItemMeta(item));
        li.appendChild(delBtn);
        return li;
      }
    });

    // Liste zwei: Offene Projekte
    const openCol = buildListColumn({
      title: 'Liste 2 – Offene Projekte',
      extraClass: 'open',
      dozentId: dozent.id,
      listKey: 'openProjects',
      items: dozent.openProjects,
      renderItem: (item) => {
        const li = document.createElement('li');
        if (isOverdue(item)) li.classList.add('overdue-row');
        const span = document.createElement('span');
        span.className = 'item-text';
        span.textContent = item.text;
        const doneBtn = document.createElement('button');
        doneBtn.className = 'icon-btn';
        doneBtn.textContent = '✓';
        doneBtn.title = 'Als erledigt markieren';
        doneBtn.addEventListener('click', () =>
          moveProject(dozent.id, item.id, 'openProjects', 'doneProjects')
        );
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = '✕';
        delBtn.title = 'Löschen';
        delBtn.addEventListener('click', () => deleteItem(dozent.id, 'openProjects', item.id));
        li.appendChild(span);
        li.appendChild(buildItemMeta(item));
        li.appendChild(doneBtn);
        li.appendChild(delBtn);
        return li;
      }
    });

    // Liste drei: Erledigte Projekte
    const doneCol = buildListColumn({
      title: 'Liste 3 – Erledigte Projekte',
      extraClass: 'done',
      dozentId: dozent.id,
      listKey: 'doneProjects',
      items: dozent.doneProjects,
      renderItem: (item) => {
        const li = document.createElement('li');
        li.classList.add('completed');
        const span = document.createElement('span');
        span.className = 'item-text';
        span.textContent = item.text;
        const undoBtn = document.createElement('button');
        undoBtn.className = 'icon-btn';
        undoBtn.textContent = '↺';
        undoBtn.title = 'Zurück zu offenen Projekten';
        undoBtn.addEventListener('click', () =>
          moveProject(dozent.id, item.id, 'doneProjects', 'openProjects')
        );
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = '✕';
        delBtn.title = 'Löschen';
        delBtn.addEventListener('click', () => deleteItem(dozent.id, 'doneProjects', item.id));
        li.appendChild(span);
        li.appendChild(buildItemMeta(item));
        li.appendChild(undoBtn);
        li.appendChild(delBtn);
        return li;
      }
    });

    grid.appendChild(todoCol);
    grid.appendChild(openCol);
    grid.appendChild(doneCol);
    panel.appendChild(grid);

    panel.appendChild(buildChatPanel(dozent));

    content.appendChild(panel);
  }

  function buildChatPanel(dozent) {
    const panel = document.createElement('div');
    panel.className = 'chat-panel';

    const heading = document.createElement('h3');
    heading.textContent = 'Chat / Notizen';
    panel.appendChild(heading);

    const messages = document.createElement('div');
    messages.className = 'chat-messages';
    dozent.chat.forEach((msg) => {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';

      const text = document.createElement('span');
      text.className = 'chat-text';
      text.textContent = msg.text;

      const time = document.createElement('span');
      time.className = 'chat-time';
      time.textContent = msg.time;

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn danger chat-delete';
      delBtn.textContent = '✕';
      delBtn.title = 'Nachricht löschen';
      delBtn.addEventListener('click', () => deleteChatMessage(dozent.id, msg.id));

      bubble.appendChild(text);
      bubble.appendChild(time);
      bubble.appendChild(delBtn);
      messages.appendChild(bubble);
    });
    panel.appendChild(messages);

    const inputRow = document.createElement('div');
    inputRow.className = 'add-item-row chat-input-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Nachricht schreiben...';
    const sendBtn = document.createElement('button');
    sendBtn.textContent = 'Senden';
    sendBtn.addEventListener('click', () => {
      addChatMessage(dozent.id, input.value);
      input.value = '';
      input.focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendBtn.click();
    });
    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);
    panel.appendChild(inputRow);

    // Nach dem Rendern ans Ende scrollen, damit die neueste Nachricht sichtbar ist
    requestAnimationFrame(() => {
      messages.scrollTop = messages.scrollHeight;
    });

    return panel;
  }

  function render() {
    renderTabs();
    renderPanel();
  }

  document.getElementById('addDozentEmptyBtn').addEventListener('click', openAddDozentModal);
  document.getElementById('cancelAddDozent').addEventListener('click', closeAddDozentModal);
  document.getElementById('confirmAddDozent').addEventListener('click', confirmAddDozent);
  newDozentNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddDozent();
  });

  document.getElementById('cancelDeleteDozent').addEventListener('click', closeDeleteDozentModal);
  document.getElementById('confirmDeleteDozent').addEventListener('click', confirmDeleteDozent);

  globalSearch.addEventListener('input', () => {
    searchQuery = globalSearch.value.trim().toLowerCase();
    renderPanel();
  });

  async function afterUnlock() {
    const loaded = await window.dashboardAPI.loadData();
    state = loaded && Array.isArray(loaded.dozenten) ? loaded : { dozenten: [] };
    state.dozenten.forEach((d) => {
      if (!Array.isArray(d.chat)) d.chat = [];
      [...d.todos, ...d.openProjects, ...d.doneProjects].forEach((item) => {
        if (!item.priority) item.priority = 'normal';
        if (item.dueDate === undefined) item.dueDate = null;
      });
    });
    activeDozentId = state.dozenten.length ? state.dozenten[0].id : null;
    render();
    await refreshLicense();
    setInterval(refreshLicense, 60 * 60 * 1000);
  }

  async function init() {
    const pinSet = await window.dashboardAPI.hasPin();
    if (pinSet) {
      showLock();
    } else {
      await afterUnlock();
    }
  }

  init();
})();
