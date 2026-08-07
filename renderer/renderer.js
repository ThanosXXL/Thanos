(function () {
  const MAX_DOZENTEN = 4;
  const CUSTOMER_STATUSES = ['Lead', 'Kontaktiert', 'Aktiv', 'Inaktiv'];

  let state = { dozenten: [], customers: [] };
  let activeDozentId = null;
  let activeView = 'dozenten';
  let activeCustomerId = null;
  let customerSearchQuery = '';
  let customerSort = 'name-asc';

  const dozentTabs = document.getElementById('dozentTabs');
  const crmToolbar = document.getElementById('crmToolbar');
  const crmSearchInput = document.getElementById('crmSearchInput');
  const crmSortSelect = document.getElementById('crmSortSelect');
  const crmStats = document.getElementById('crmStats');
  const content = document.getElementById('content');
  const emptyState = document.getElementById('emptyState');

  const addDozentModal = document.getElementById('addDozentModal');
  const newDozentNameInput = document.getElementById('newDozentName');
  const deleteDozentModal = document.getElementById('deleteDozentModal');
  const deleteDozentText = document.getElementById('deleteDozentText');

  const addCustomerModal = document.getElementById('addCustomerModal');
  const newCustomerName = document.getElementById('newCustomerName');
  const newCustomerNameError = document.getElementById('newCustomerNameError');
  const newCustomerFirma = document.getElementById('newCustomerFirma');
  const newCustomerTelefon = document.getElementById('newCustomerTelefon');
  const newCustomerEmail = document.getElementById('newCustomerEmail');
  const newCustomerAdresse = document.getElementById('newCustomerAdresse');
  const newCustomerStatus = document.getElementById('newCustomerStatus');
  const deleteCustomerModal = document.getElementById('deleteCustomerModal');
  const deleteCustomerText = document.getElementById('deleteCustomerText');

  CUSTOMER_STATUSES.forEach((status) => {
    const opt = document.createElement('option');
    opt.value = status;
    opt.textContent = status;
    newCustomerStatus.appendChild(opt);
  });

  let pendingDeleteId = null;
  let pendingDeleteCustomerId = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function persist() {
    window.dashboardAPI.saveData(state);
  }

  function findDozent(id) {
    return state.dozenten.find((d) => d.id === id);
  }

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

  function addItem(dozentId, listKey, text) {
    const dozent = findDozent(dozentId);
    if (!dozent || !text.trim()) return;
    dozent[listKey].push({ id: uid(), text: text.trim(), done: false });
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
      tab.innerHTML = `<span class="tab-name"></span><span class="remove-x" title="Entfernen">&times;</span>`;
      tab.querySelector('.tab-name').textContent = dozent.name;

      tab.querySelector('.tab-name').addEventListener('click', () => {
        activeDozentId = dozent.id;
        render();
      });

      tab.querySelector('.remove-x').addEventListener('click', (e) => {
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
    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => {
      addItem(dozentId, listKey, input.value);
      input.value = '';
      input.focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addBtn.click();
    });
    addRow.appendChild(input);
    addRow.appendChild(addBtn);
    col.appendChild(addRow);

    const ul = document.createElement('ul');
    ul.className = 'item-list';
    items.forEach((item) => ul.appendChild(renderItem(item)));
    col.appendChild(ul);

    return col;
  }

  function renderPanel() {
    content.innerHTML = '';

    if (!state.dozenten.length) {
      content.appendChild(emptyState);
      return;
    }

    const dozent = findDozent(activeDozentId) || state.dozenten[0];
    activeDozentId = dozent.id;

    const panel = document.createElement('div');
    panel.className = 'dozent-panel';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<h2></h2>`;
    header.querySelector('h2').textContent = dozent.name;
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

  function findCustomer(id) {
    return state.customers.find((c) => c.id === id);
  }

  function switchView(view) {
    activeView = view;
    document.getElementById('viewBtnDozenten').classList.toggle('active', view === 'dozenten');
    document.getElementById('viewBtnCrm').classList.toggle('active', view === 'crm');
    dozentTabs.style.display = view === 'dozenten' ? '' : 'none';
    crmToolbar.style.display = view === 'crm' ? '' : 'none';
    render();
  }

  function openAddCustomerModal() {
    newCustomerName.value = '';
    newCustomerFirma.value = '';
    newCustomerTelefon.value = '';
    newCustomerEmail.value = '';
    newCustomerAdresse.value = '';
    newCustomerStatus.value = CUSTOMER_STATUSES[0];
    newCustomerName.classList.remove('input-error');
    newCustomerNameError.style.display = 'none';
    addCustomerModal.classList.add('visible');
    newCustomerName.focus();
  }

  function closeAddCustomerModal() {
    addCustomerModal.classList.remove('visible');
  }

  function confirmAddCustomer() {
    const name = newCustomerName.value.trim();
    if (!name) {
      newCustomerName.classList.add('input-error');
      newCustomerNameError.style.display = 'block';
      newCustomerName.focus();
      return;
    }

    const customer = {
      id: uid(),
      name,
      firma: newCustomerFirma.value.trim(),
      telefon: newCustomerTelefon.value.trim(),
      email: newCustomerEmail.value.trim(),
      adresse: newCustomerAdresse.value.trim(),
      status: newCustomerStatus.value,
      createdAt: Date.now(),
      notes: []
    };
    state.customers.push(customer);
    activeCustomerId = customer.id;
    persist();
    closeAddCustomerModal();
    render();
  }

  function openDeleteCustomerModal(id) {
    const customer = findCustomer(id);
    if (!customer) return;
    pendingDeleteCustomerId = id;
    deleteCustomerText.textContent = `Soll "${customer.name}" wirklich entfernt werden? Alle Notizen gehen verloren.`;
    deleteCustomerModal.classList.add('visible');
  }

  function closeDeleteCustomerModal() {
    pendingDeleteCustomerId = null;
    deleteCustomerModal.classList.remove('visible');
  }

  function confirmDeleteCustomer() {
    if (!pendingDeleteCustomerId) return;
    state.customers = state.customers.filter((c) => c.id !== pendingDeleteCustomerId);
    if (activeCustomerId === pendingDeleteCustomerId) activeCustomerId = null;
    persist();
    closeDeleteCustomerModal();
    render();
  }

  function updateCustomerField(id, field, value) {
    const customer = findCustomer(id);
    if (!customer) return;
    customer[field] = value;
    persist();
  }

  function addCustomerNote(customerId, text) {
    const customer = findCustomer(customerId);
    if (!customer || !text.trim()) return;
    customer.notes.push({
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

  function deleteCustomerNote(customerId, noteId) {
    const customer = findCustomer(customerId);
    if (!customer) return;
    customer.notes = customer.notes.filter((n) => n.id !== noteId);
    persist();
    render();
  }

  function statusClass(status) {
    return 'status-badge status-' + status.toLowerCase();
  }

  function initials(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  function formatDate(timestamp) {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function sortCustomers(customers) {
    const sorted = customers.slice();
    if (customerSort === 'created-desc') {
      sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (customerSort === 'status') {
      sorted.sort((a, b) => {
        const diff = CUSTOMER_STATUSES.indexOf(a.status) - CUSTOMER_STATUSES.indexOf(b.status);
        return diff !== 0 ? diff : a.name.localeCompare(b.name, 'de');
      });
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    }
    return sorted;
  }

  function renderCrmStats() {
    const total = state.customers.length;
    const counts = CUSTOMER_STATUSES.map(
      (status) => `${status}: ${state.customers.filter((c) => c.status === status).length}`
    );
    crmStats.textContent = total ? `${total} Kunden · ${counts.join(' · ')}` : '';
  }

  function buildCustomerList(customers) {
    const wrap = document.createElement('div');
    wrap.className = 'crm-customer-list';

    if (!customers.length) {
      const empty = document.createElement('p');
      empty.className = 'crm-list-empty';
      empty.textContent = 'Keine Kunden gefunden.';
      wrap.appendChild(empty);
      return wrap;
    }

    customers.forEach((customer) => {
      const card = document.createElement('div');
      card.className = 'crm-customer-card glossy' + (customer.id === activeCustomerId ? ' active' : '');

      const avatar = document.createElement('div');
      avatar.className = 'crm-avatar glossy';
      avatar.textContent = initials(customer.name);

      const badge = document.createElement('span');
      badge.className = statusClass(customer.status);
      badge.textContent = customer.status;

      const textCol = document.createElement('div');
      textCol.className = 'crm-card-text';
      const name = document.createElement('div');
      name.className = 'crm-card-name';
      name.textContent = customer.name;
      const firma = document.createElement('div');
      firma.className = 'crm-card-firma';
      firma.textContent = customer.firma || '—';
      textCol.appendChild(name);
      textCol.appendChild(firma);

      const topRow = document.createElement('div');
      topRow.className = 'crm-card-top';
      topRow.appendChild(avatar);
      topRow.appendChild(textCol);

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn danger crm-card-delete';
      delBtn.textContent = '✕';
      delBtn.title = 'Kunde löschen';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteCustomerModal(customer.id);
      });

      card.appendChild(badge);
      card.appendChild(topRow);
      card.appendChild(delBtn);

      card.addEventListener('click', () => {
        activeCustomerId = customer.id;
        render();
      });

      wrap.appendChild(card);
    });

    return wrap;
  }

  function buildCustomerDetail(customer) {
    const panel = document.createElement('div');
    panel.className = 'crm-detail-panel glossy-panel';

    const header = document.createElement('div');
    header.className = 'crm-detail-header';
    const titleCol = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = customer.name;
    titleCol.appendChild(title);
    const since = document.createElement('div');
    since.className = 'crm-since';
    since.textContent = 'Kunde seit ' + formatDate(customer.createdAt);
    titleCol.appendChild(since);
    header.appendChild(titleCol);

    const statusSelect = document.createElement('select');
    statusSelect.className = 'crm-status-select';
    CUSTOMER_STATUSES.forEach((status) => {
      const opt = document.createElement('option');
      opt.value = status;
      opt.textContent = status;
      if (status === customer.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusSelect.addEventListener('change', () => {
      updateCustomerField(customer.id, 'status', statusSelect.value);
      render();
    });
    header.appendChild(statusSelect);
    panel.appendChild(header);

    const fields = [
      { key: 'firma', label: 'Firma' },
      { key: 'telefon', label: 'Telefon' },
      { key: 'email', label: 'E-Mail' },
      { key: 'adresse', label: 'Adresse' }
    ];

    const fieldGrid = document.createElement('div');
    fieldGrid.className = 'crm-field-grid';
    fields.forEach(({ key, label }) => {
      const row = document.createElement('div');
      row.className = 'crm-field-row';
      const inputId = 'crm-field-' + key + '-' + customer.id;
      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      labelEl.htmlFor = inputId;
      const input = document.createElement('input');
      input.type = 'text';
      input.id = inputId;
      input.value = customer[key] || '';
      input.addEventListener('change', () => updateCustomerField(customer.id, key, input.value.trim()));
      row.appendChild(labelEl);
      row.appendChild(input);
      fieldGrid.appendChild(row);
    });
    panel.appendChild(fieldGrid);

    panel.appendChild(buildCustomerNotesPanel(customer));

    return panel;
  }

  function buildCustomerNotesPanel(customer) {
    const panel = document.createElement('div');
    panel.className = 'crm-notes-panel';

    const heading = document.createElement('h3');
    heading.textContent = 'Verlauf / Notizen';
    panel.appendChild(heading);

    const notes = document.createElement('div');
    notes.className = 'crm-notes';
    customer.notes.forEach((note) => {
      const entry = document.createElement('div');
      entry.className = 'crm-note-entry';

      const text = document.createElement('span');
      text.className = 'crm-note-text';
      text.textContent = note.text;

      const time = document.createElement('span');
      time.className = 'crm-note-time';
      time.textContent = note.time;

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn danger';
      delBtn.textContent = '✕';
      delBtn.title = 'Notiz löschen';
      delBtn.addEventListener('click', () => deleteCustomerNote(customer.id, note.id));

      entry.appendChild(text);
      entry.appendChild(time);
      entry.appendChild(delBtn);
      notes.appendChild(entry);
    });
    panel.appendChild(notes);

    const inputRow = document.createElement('div');
    inputRow.className = 'add-item-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Neue Notiz...';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-crm-primary';
    addBtn.textContent = 'Hinzufügen';
    addBtn.addEventListener('click', () => {
      addCustomerNote(customer.id, input.value);
      input.value = '';
      input.focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addBtn.click();
    });
    inputRow.appendChild(input);
    inputRow.appendChild(addBtn);
    panel.appendChild(inputRow);

    requestAnimationFrame(() => {
      notes.scrollTop = notes.scrollHeight;
    });

    return panel;
  }

  function renderCrmSection() {
    content.innerHTML = '';
    renderCrmStats();

    const query = customerSearchQuery.trim().toLowerCase();
    const filtered = sortCustomers(
      state.customers.filter((c) => {
        if (!query) return true;
        return (
          c.name.toLowerCase().includes(query) ||
          (c.firma || '').toLowerCase().includes(query) ||
          (c.telefon || '').toLowerCase().includes(query) ||
          (c.email || '').toLowerCase().includes(query) ||
          (c.adresse || '').toLowerCase().includes(query)
        );
      })
    );

    if (!state.customers.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const p = document.createElement('p');
      p.textContent = 'Noch keine Kunden angelegt.';
      const btn = document.createElement('button');
      btn.className = 'btn-crm-primary';
      btn.textContent = '+ Kunde hinzufügen';
      btn.addEventListener('click', openAddCustomerModal);
      empty.appendChild(p);
      empty.appendChild(btn);
      content.appendChild(empty);
      return;
    }

    const layout = document.createElement('div');
    layout.className = 'crm-layout';
    layout.appendChild(buildCustomerList(filtered));

    const activeCustomer = findCustomer(activeCustomerId);
    if (activeCustomer) {
      layout.appendChild(buildCustomerDetail(activeCustomer));
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'crm-detail-panel glossy-panel crm-detail-placeholder';
      placeholder.textContent = 'Kunden auswählen, um Details anzuzeigen.';
      layout.appendChild(placeholder);
    }

    content.appendChild(layout);
  }

  function updateAppTitle() {
    const title = activeView === 'crm' ? 'Kundenverwaltung DELUXE' : 'Dozenten Dashboard';
    document.getElementById('appTitle').textContent = title;
    document.title = title;
    document.body.classList.toggle('view-crm', activeView === 'crm');

    // Solange die CRM-Ansicht aktiv ist, darf nirgends das Wort "Dozenten"
    // auftauchen — der Umschalt-Button wird zu einem namenlosen Zurück-Pfeil.
    const dozentenBtn = document.getElementById('viewBtnDozenten');
    if (activeView === 'crm') {
      dozentenBtn.textContent = '←';
      dozentenBtn.title = 'Zurück';
      dozentenBtn.setAttribute('aria-label', 'Zurück');
      dozentenBtn.classList.add('main-nav-btn-icon-only');
    } else {
      dozentenBtn.textContent = '🎓 Dozenten';
      dozentenBtn.title = '';
      dozentenBtn.removeAttribute('aria-label');
      dozentenBtn.classList.remove('main-nav-btn-icon-only');
    }
  }

  function render() {
    updateAppTitle();
    if (activeView === 'crm') {
      renderCrmSection();
    } else {
      renderTabs();
      renderPanel();
    }
  }

  document.getElementById('addDozentEmptyBtn').addEventListener('click', openAddDozentModal);
  document.getElementById('cancelAddDozent').addEventListener('click', closeAddDozentModal);
  document.getElementById('confirmAddDozent').addEventListener('click', confirmAddDozent);
  newDozentNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddDozent();
  });

  document.getElementById('cancelDeleteDozent').addEventListener('click', closeDeleteDozentModal);
  document.getElementById('confirmDeleteDozent').addEventListener('click', confirmDeleteDozent);

  document.getElementById('viewBtnDozenten').addEventListener('click', () => switchView('dozenten'));
  document.getElementById('viewBtnCrm').addEventListener('click', () => switchView('crm'));

  document.getElementById('addCustomerBtn').addEventListener('click', openAddCustomerModal);
  document.getElementById('cancelAddCustomer').addEventListener('click', closeAddCustomerModal);
  document.getElementById('confirmAddCustomer').addEventListener('click', confirmAddCustomer);
  newCustomerName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddCustomer();
  });
  newCustomerName.addEventListener('input', () => {
    newCustomerName.classList.remove('input-error');
    newCustomerNameError.style.display = 'none';
  });

  document.getElementById('cancelDeleteCustomer').addEventListener('click', closeDeleteCustomerModal);
  document.getElementById('confirmDeleteCustomer').addEventListener('click', confirmDeleteCustomer);

  crmSearchInput.addEventListener('input', () => {
    customerSearchQuery = crmSearchInput.value;
    renderCrmSection();
  });

  crmSortSelect.addEventListener('change', () => {
    customerSort = crmSortSelect.value;
    renderCrmSection();
  });

  async function init() {
    const loaded = await window.dashboardAPI.loadData();
    state = loaded && Array.isArray(loaded.dozenten) ? loaded : { dozenten: [], customers: [] };
    if (!Array.isArray(state.customers)) state.customers = [];
    state.dozenten.forEach((d) => {
      if (!Array.isArray(d.chat)) d.chat = [];
    });
    state.customers.forEach((c) => {
      if (!c.createdAt) c.createdAt = Date.now();
      if (!Array.isArray(c.notes)) c.notes = [];
    });
    activeDozentId = state.dozenten.length ? state.dozenten[0].id : null;
    render();
  }

  init();
})();
