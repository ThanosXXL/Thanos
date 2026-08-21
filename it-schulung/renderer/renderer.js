(function () {
  const MAX_SCHULUNGEN = 4;

  let state = { schulungen: [] };
  let activeSchulungId = null;

  const schulungTabs = document.getElementById('schulungTabs');
  const content = document.getElementById('content');
  const emptyState = document.getElementById('emptyState');

  const addSchulungModal = document.getElementById('addSchulungModal');
  const newSchulungNameInput = document.getElementById('newSchulungName');
  const deleteSchulungModal = document.getElementById('deleteSchulungModal');
  const deleteSchulungText = document.getElementById('deleteSchulungText');

  let pendingDeleteId = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function persist() {
    window.schulungAPI.saveData(state);
  }

  function findSchulung(id) {
    return state.schulungen.find((s) => s.id === id);
  }

  function openAddSchulungModal() {
    if (state.schulungen.length >= MAX_SCHULUNGEN) return;
    newSchulungNameInput.value = '';
    addSchulungModal.classList.add('visible');
    newSchulungNameInput.focus();
  }

  function closeAddSchulungModal() {
    addSchulungModal.classList.remove('visible');
  }

  function confirmAddSchulung() {
    const name = newSchulungNameInput.value.trim();
    if (!name) return;
    if (state.schulungen.length >= MAX_SCHULUNGEN) return;

    const schulung = {
      id: uid(),
      name,
      todos: [],
      offeneThemen: [],
      abgeschlosseneThemen: [],
      chat: []
    };
    state.schulungen.push(schulung);
    activeSchulungId = schulung.id;
    persist();
    closeAddSchulungModal();
    render();
  }

  function openDeleteSchulungModal(id) {
    const schulung = findSchulung(id);
    if (!schulung) return;
    pendingDeleteId = id;
    deleteSchulungText.textContent = `Soll "${schulung.name}" wirklich entfernt werden? Alle zugehörigen Listen gehen verloren.`;
    deleteSchulungModal.classList.add('visible');
  }

  function closeDeleteSchulungModal() {
    pendingDeleteId = null;
    deleteSchulungModal.classList.remove('visible');
  }

  function confirmDeleteSchulung() {
    if (!pendingDeleteId) return;
    state.schulungen = state.schulungen.filter((s) => s.id !== pendingDeleteId);
    if (activeSchulungId === pendingDeleteId) {
      activeSchulungId = state.schulungen.length ? state.schulungen[0].id : null;
    }
    persist();
    closeDeleteSchulungModal();
    render();
  }

  function addItem(schulungId, listKey, text) {
    const schulung = findSchulung(schulungId);
    if (!schulung || !text.trim()) return;
    schulung[listKey].push({ id: uid(), text: text.trim(), done: false });
    persist();
    render();
  }

  function deleteItem(schulungId, listKey, itemId) {
    const schulung = findSchulung(schulungId);
    if (!schulung) return;
    schulung[listKey] = schulung[listKey].filter((i) => i.id !== itemId);
    persist();
    render();
  }

  function toggleTodo(schulungId, itemId) {
    const schulung = findSchulung(schulungId);
    if (!schulung) return;
    const item = schulung.todos.find((i) => i.id === itemId);
    if (!item) return;
    item.done = !item.done;
    persist();
    render();
  }

  function moveThema(schulungId, itemId, fromKey, toKey) {
    const schulung = findSchulung(schulungId);
    if (!schulung) return;
    const idx = schulung[fromKey].findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const [item] = schulung[fromKey].splice(idx, 1);
    schulung[toKey].push(item);
    persist();
    render();
  }

  function addChatMessage(schulungId, text) {
    const schulung = findSchulung(schulungId);
    if (!schulung || !text.trim()) return;
    schulung.chat.push({
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

  function deleteChatMessage(schulungId, messageId) {
    const schulung = findSchulung(schulungId);
    if (!schulung) return;
    schulung.chat = schulung.chat.filter((m) => m.id !== messageId);
    persist();
    render();
  }

  function renderTabs() {
    schulungTabs.innerHTML = '';

    state.schulungen.forEach((schulung) => {
      const tab = document.createElement('div');
      tab.className = 'schulung-tab' + (schulung.id === activeSchulungId ? ' active' : '');
      tab.innerHTML = `<span class="tab-name"></span><span class="remove-x" title="Entfernen">&times;</span>`;
      tab.querySelector('.tab-name').textContent = schulung.name;

      tab.querySelector('.tab-name').addEventListener('click', () => {
        activeSchulungId = schulung.id;
        render();
      });

      tab.querySelector('.remove-x').addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteSchulungModal(schulung.id);
      });

      schulungTabs.appendChild(tab);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-schulung-btn';
    addBtn.textContent = '+ Schulung hinzufügen';
    addBtn.disabled = state.schulungen.length >= MAX_SCHULUNGEN;
    addBtn.title = addBtn.disabled ? 'Maximal 4 Schulungen' : '';
    addBtn.addEventListener('click', openAddSchulungModal);
    schulungTabs.appendChild(addBtn);
  }

  function buildListColumn({ title, extraClass, schulungId, listKey, items, renderItem }) {
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
      addItem(schulungId, listKey, input.value);
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

    if (!state.schulungen.length) {
      content.appendChild(emptyState);
      return;
    }

    const schulung = findSchulung(activeSchulungId) || state.schulungen[0];
    activeSchulungId = schulung.id;

    const panel = document.createElement('div');
    panel.className = 'schulung-panel';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<h2></h2>`;
    header.querySelector('h2').textContent = schulung.name;
    panel.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'lists-grid';

    // Liste eins: To-Do-Liste / Aufgabenliste
    const todoCol = buildListColumn({
      title: 'Liste 1 – To-Do-Liste',
      extraClass: '',
      schulungId: schulung.id,
      listKey: 'todos',
      items: schulung.todos,
      renderItem: (item) => {
        const li = document.createElement('li');
        if (item.done) li.classList.add('completed');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.done;
        checkbox.addEventListener('change', () => toggleTodo(schulung.id, item.id));
        const span = document.createElement('span');
        span.className = 'item-text';
        span.textContent = item.text;
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = '✕';
        delBtn.title = 'Löschen';
        delBtn.addEventListener('click', () => deleteItem(schulung.id, 'todos', item.id));
        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(delBtn);
        return li;
      }
    });

    // Liste zwei: Offene Themen
    const openCol = buildListColumn({
      title: 'Liste 2 – Offene Themen',
      extraClass: 'open',
      schulungId: schulung.id,
      listKey: 'offeneThemen',
      items: schulung.offeneThemen,
      renderItem: (item) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.className = 'item-text';
        span.textContent = item.text;
        const doneBtn = document.createElement('button');
        doneBtn.className = 'icon-btn';
        doneBtn.textContent = '✓';
        doneBtn.title = 'Als abgeschlossen markieren';
        doneBtn.addEventListener('click', () =>
          moveThema(schulung.id, item.id, 'offeneThemen', 'abgeschlosseneThemen')
        );
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = '✕';
        delBtn.title = 'Löschen';
        delBtn.addEventListener('click', () => deleteItem(schulung.id, 'offeneThemen', item.id));
        li.appendChild(span);
        li.appendChild(doneBtn);
        li.appendChild(delBtn);
        return li;
      }
    });

    // Liste drei: Abgeschlossene Themen
    const doneCol = buildListColumn({
      title: 'Liste 3 – Abgeschlossene Themen',
      extraClass: 'done',
      schulungId: schulung.id,
      listKey: 'abgeschlosseneThemen',
      items: schulung.abgeschlosseneThemen,
      renderItem: (item) => {
        const li = document.createElement('li');
        li.classList.add('completed');
        const span = document.createElement('span');
        span.className = 'item-text';
        span.textContent = item.text;
        const undoBtn = document.createElement('button');
        undoBtn.className = 'icon-btn';
        undoBtn.textContent = '↺';
        undoBtn.title = 'Zurück zu offenen Themen';
        undoBtn.addEventListener('click', () =>
          moveThema(schulung.id, item.id, 'abgeschlosseneThemen', 'offeneThemen')
        );
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = '✕';
        delBtn.title = 'Löschen';
        delBtn.addEventListener('click', () => deleteItem(schulung.id, 'abgeschlosseneThemen', item.id));
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

    panel.appendChild(buildChatPanel(schulung));

    content.appendChild(panel);
  }

  function buildChatPanel(schulung) {
    const panel = document.createElement('div');
    panel.className = 'chat-panel';

    const heading = document.createElement('h3');
    heading.textContent = 'Chat / Notizen';
    panel.appendChild(heading);

    const messages = document.createElement('div');
    messages.className = 'chat-messages';
    schulung.chat.forEach((msg) => {
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
      delBtn.addEventListener('click', () => deleteChatMessage(schulung.id, msg.id));

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
      addChatMessage(schulung.id, input.value);
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

  document.getElementById('addSchulungEmptyBtn').addEventListener('click', openAddSchulungModal);
  document.getElementById('cancelAddSchulung').addEventListener('click', closeAddSchulungModal);
  document.getElementById('confirmAddSchulung').addEventListener('click', confirmAddSchulung);
  newSchulungNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddSchulung();
  });

  document.getElementById('cancelDeleteSchulung').addEventListener('click', closeDeleteSchulungModal);
  document.getElementById('confirmDeleteSchulung').addEventListener('click', confirmDeleteSchulung);

  async function init() {
    const loaded = await window.schulungAPI.loadData();
    state = loaded && Array.isArray(loaded.schulungen) ? loaded : { schulungen: [] };
    state.schulungen.forEach((s) => {
      if (!Array.isArray(s.chat)) s.chat = [];
    });
    activeSchulungId = state.schulungen.length ? state.schulungen[0].id : null;
    render();
  }

  init();
})();
