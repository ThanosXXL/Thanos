(function () {
  const MAX_DOZENTEN = 4;
  const LOW_STOCK_THRESHOLD = 3;

  let state = { dozenten: [], inventar: [] };
  let activeDozentId = null;
  let mode = 'dozenten'; // 'dozenten' | 'inventar'

  const appTitle = document.getElementById('appTitle');
  const modeDozentenBtn = document.getElementById('modeDozentenBtn');
  const modeInventarBtn = document.getElementById('modeInventarBtn');

  const dozentTabs = document.getElementById('dozentTabs');
  const inventarToolbar = document.getElementById('inventarToolbar');
  const content = document.getElementById('content');
  const emptyState = document.getElementById('emptyState');

  const addDozentModal = document.getElementById('addDozentModal');
  const newDozentNameInput = document.getElementById('newDozentName');
  const deleteDozentModal = document.getElementById('deleteDozentModal');
  const deleteDozentText = document.getElementById('deleteDozentText');

  let pendingDeleteId = null;

  // ---- Inventar: DOM-Referenzen ----
  const addInventarBtn = document.getElementById('addInventarBtn');
  const addInventarModal = document.getElementById('addInventarModal');
  const invGeraet = document.getElementById('invGeraet');
  const invGeraetMic = document.getElementById('invGeraetMic');
  const invHersteller = document.getElementById('invHersteller');
  const invHerstellerMic = document.getElementById('invHerstellerMic');
  const invZustand = document.getElementById('invZustand');
  const invStueckzahl = document.getElementById('invStueckzahl');
  const invStartCamera = document.getElementById('invStartCamera');
  const invCameraPreview = document.getElementById('invCameraPreview');
  const invCameraCanvas = document.getElementById('invCameraCanvas');
  const invCapturedPhoto = document.getElementById('invCapturedPhoto');
  const invCameraActions = document.getElementById('invCameraActions');
  const invCapturePhotoBtn = document.getElementById('invCapturePhoto');
  const invCancelCameraBtn = document.getElementById('invCancelCamera');
  const invRecognitionBox = document.getElementById('invRecognitionBox');
  const invRecognitionText = document.getElementById('invRecognitionText');
  const invRecognitionYesBtn = document.getElementById('invRecognitionYes');
  const invRecognitionNoBtn = document.getElementById('invRecognitionNo');
  const invFotoStatus = document.getElementById('invFotoStatus');
  const cancelAddInventarBtn = document.getElementById('cancelAddInventar');
  const confirmAddInventarBtn = document.getElementById('confirmAddInventar');

  const ausgabeModal = document.getElementById('ausgabeModal');
  const ausgabeGeraetText = document.getElementById('ausgabeGeraetText');
  const ausgabeMenge = document.getElementById('ausgabeMenge');
  const ausgabeEmpfaenger = document.getElementById('ausgabeEmpfaenger');
  const cancelAusgabeBtn = document.getElementById('cancelAusgabe');
  const confirmAusgabeBtn = document.getElementById('confirmAusgabe');
  let pendingAusgabeId = null;

  const deleteInventarModal = document.getElementById('deleteInventarModal');
  const deleteInventarText = document.getElementById('deleteInventarText');
  const cancelDeleteInventarBtn = document.getElementById('cancelDeleteInventar');
  const confirmDeleteInventarBtn = document.getElementById('confirmDeleteInventar');
  let pendingDeleteInventarId = null;

  let cameraStream = null;
  let capturedPhotoDataUrl = null;
  let recognizedLabel = null;

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

  function render() {
    if (mode === 'dozenten') {
      dozentTabs.hidden = false;
      inventarToolbar.hidden = true;
      renderTabs();
      renderPanel();
    } else {
      dozentTabs.hidden = true;
      inventarToolbar.hidden = false;
      renderInventarPanel();
    }
  }

  function setMode(newMode) {
    if (mode === newMode) return;
    mode = newMode;
    document.body.classList.toggle('mode-inventar', mode === 'inventar');
    appTitle.textContent = mode === 'inventar' ? 'Inventar - Dashboard' : 'Dozenten Dashboard';
    modeDozentenBtn.classList.toggle('active', mode === 'dozenten');
    modeInventarBtn.classList.toggle('active', mode === 'inventar');
    render();
  }

  // ================= Inventar =================

  function findInventarItem(id) {
    return state.inventar.find((i) => i.id === id);
  }

  function showToast(message, variant) {
    const toast = document.createElement('div');
    toast.className = 'toast-reminder' + (variant ? ' ' + variant : '');
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
    invCameraPreview.srcObject = null;
    invCameraPreview.hidden = true;
    invCameraActions.hidden = true;
  }

  function resetInventarForm() {
    invGeraet.value = '';
    invHersteller.value = '';
    invZustand.value = 'OVP';
    invStueckzahl.value = '1';
    invCapturedPhoto.hidden = true;
    invCapturedPhoto.src = '';
    invRecognitionBox.hidden = true;
    invFotoStatus.textContent = '';
    capturedPhotoDataUrl = null;
    recognizedLabel = null;
    stopCamera();
  }

  function openAddInventarModal() {
    resetInventarForm();
    addInventarModal.classList.add('visible');
    invGeraet.focus();
  }

  function closeAddInventarModal() {
    stopCamera();
    addInventarModal.classList.remove('visible');
  }

  function confirmAddInventar() {
    const geraet = invGeraet.value.trim();
    const hersteller = invHersteller.value.trim();
    const zustand = invZustand.value;
    const stueckzahl = Math.max(0, parseInt(invStueckzahl.value, 10) || 0);
    if (!geraet) {
      invGeraet.focus();
      return;
    }

    state.inventar.push({
      id: uid(),
      geraet,
      hersteller,
      zustand,
      stueckzahl,
      photo: capturedPhotoDataUrl,
      ausgaben: []
    });
    persist();
    closeAddInventarModal();
    render();
  }

  function openDeleteInventarModal(id) {
    const item = findInventarItem(id);
    if (!item) return;
    pendingDeleteInventarId = id;
    deleteInventarText.textContent = `Soll "${item.geraet}" wirklich aus dem Inventar entfernt werden?`;
    deleteInventarModal.classList.add('visible');
  }

  function closeDeleteInventarModal() {
    pendingDeleteInventarId = null;
    deleteInventarModal.classList.remove('visible');
  }

  function confirmDeleteInventar() {
    if (!pendingDeleteInventarId) return;
    state.inventar = state.inventar.filter((i) => i.id !== pendingDeleteInventarId);
    persist();
    closeDeleteInventarModal();
    render();
  }

  function updateStueckzahl(id, value) {
    const item = findInventarItem(id);
    if (!item) return;
    const val = Math.max(0, parseInt(value, 10) || 0);
    item.stueckzahl = val;
    persist();
    render();
  }

  function openAusgabeModal(id) {
    const item = findInventarItem(id);
    if (!item) return;
    pendingAusgabeId = id;
    ausgabeGeraetText.textContent = `${item.geraet}${item.hersteller ? ' (' + item.hersteller + ')' : ''} – aktueller Bestand: ${item.stueckzahl} Stück`;
    ausgabeMenge.value = '1';
    ausgabeMenge.max = String(item.stueckzahl || 1);
    ausgabeEmpfaenger.value = '';
    ausgabeModal.classList.add('visible');
    ausgabeMenge.focus();
  }

  function closeAusgabeModal() {
    pendingAusgabeId = null;
    ausgabeModal.classList.remove('visible');
  }

  function confirmAusgabe() {
    if (!pendingAusgabeId) return;
    const item = findInventarItem(pendingAusgabeId);
    if (!item) return;

    const menge = Math.max(1, parseInt(ausgabeMenge.value, 10) || 0);
    const empfaenger = ausgabeEmpfaenger.value.trim();
    const abgegeben = Math.min(menge, item.stueckzahl);

    item.stueckzahl -= abgegeben;
    item.ausgaben.push({
      id: uid(),
      menge: abgegeben,
      empfaenger: empfaenger || 'unbekannt',
      datum: new Date().toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    });
    persist();
    closeAusgabeModal();
    render();

    const wer = empfaenger ? ` an ${empfaenger}` : '';
    if (item.stueckzahl <= LOW_STOCK_THRESHOLD) {
      showToast(
        `⚠️ ${abgegeben}× "${item.geraet}" ausgegeben${wer}. Erinnerung: Nur noch ${item.stueckzahl} Stück auf Lager – Nachbestellung prüfen!`,
        'warning'
      );
    } else {
      showToast(`${abgegeben}× "${item.geraet}" ausgegeben${wer}. Restbestand: ${item.stueckzahl}.`);
    }
  }

  // ---- Mikrofon-Diktat ----

  function attachMic(button, input) {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      button.addEventListener('click', () => {
        showToast('Spracheingabe wird von diesem System nicht unterstützt.', 'warning');
      });
      return;
    }

    let recognition = null;
    let listening = false;

    button.addEventListener('click', () => {
      if (listening) {
        recognition && recognition.stop();
        return;
      }
      recognition = new SpeechRecognitionCtor();
      recognition.lang = 'de-DE';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        listening = true;
        button.classList.add('listening');
        button.textContent = '🎙️';
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        if (transcript) {
          input.value = transcript;
          input.focus();
        }
      };
      recognition.onerror = () => {
        showToast('Spracheingabe fehlgeschlagen. Bitte Mikrofonzugriff erlauben.', 'warning');
      };
      recognition.onend = () => {
        listening = false;
        button.classList.remove('listening');
        button.textContent = '🎤';
      };
      recognition.start();
    });
  }

  // ---- Foto-Erkennung ----

  const COCO_LABELS_DE = {
    laptop: 'Laptop',
    'cell phone': 'Smartphone',
    keyboard: 'Tastatur',
    mouse: 'Maus',
    tv: 'Bildschirm/TV',
    remote: 'Fernbedienung',
    book: 'Buch',
    clock: 'Uhr',
    scissors: 'Schere',
    cup: 'Tasse',
    bottle: 'Flasche',
    chair: 'Stuhl',
    backpack: 'Rucksack',
    handbag: 'Tasche',
    suitcase: 'Koffer',
    microwave: 'Mikrowelle',
    printer: 'Drucker'
  };

  function translateLabel(label) {
    return COCO_LABELS_DE[label] || label.charAt(0).toUpperCase() + label.slice(1);
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Skript konnte nicht geladen werden: ' + src));
      document.head.appendChild(s);
    });
  }

  let cocoModelPromise = null;
  async function ensureCocoModel() {
    if (!cocoModelPromise) {
      cocoModelPromise = (async () => {
        if (!window.tf) {
          await loadScriptOnce('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js');
        }
        if (!window.cocoSsd) {
          await loadScriptOnce('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
        }
        return window.cocoSsd.load();
      })().catch((err) => {
        cocoModelPromise = null;
        throw err;
      });
    }
    return cocoModelPromise;
  }

  async function startCamera() {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err) {
      invFotoStatus.textContent = 'Kein Kamerazugriff möglich. Bitte Berechtigung erteilen.';
      return;
    }
    invCapturedPhoto.hidden = true;
    invRecognitionBox.hidden = true;
    invFotoStatus.textContent = '';
    invCameraPreview.srcObject = cameraStream;
    invCameraPreview.hidden = false;
    invCameraActions.hidden = false;
  }

  async function capturePhoto() {
    if (!cameraStream) return;
    const video = invCameraPreview;
    invCameraCanvas.width = video.videoWidth || 640;
    invCameraCanvas.height = video.videoHeight || 480;
    const ctx = invCameraCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, invCameraCanvas.width, invCameraCanvas.height);
    capturedPhotoDataUrl = invCameraCanvas.toDataURL('image/jpeg', 0.85);

    stopCamera();
    invCapturedPhoto.src = capturedPhotoDataUrl;
    invCapturedPhoto.hidden = false;

    await runRecognition(capturedPhotoDataUrl);
  }

  async function runRecognition(dataUrl) {
    invFotoStatus.textContent = 'Analysiere Foto...';
    invRecognitionBox.hidden = true;
    try {
      const model = await ensureCocoModel();
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });
      const predictions = await model.detect(img);
      invFotoStatus.textContent = '';

      if (!predictions.length) {
        invFotoStatus.textContent = 'Kein Objekt erkannt. Bitte Gerät manuell eingeben.';
        return;
      }

      const best = predictions.reduce((a, b) => (b.score > a.score ? b : a));
      recognizedLabel = translateLabel(best.class);
      const confidence = Math.round(best.score * 100);
      invRecognitionText.textContent = `Erkannt: "${recognizedLabel}" (${confidence}% Sicherheit) – ist das richtig?`;
      invRecognitionBox.hidden = false;
    } catch (err) {
      invFotoStatus.textContent = 'Fotoerkennung nicht verfügbar (Internetverbindung erforderlich). Bitte manuell eingeben.';
    }
  }

  function renderInventarPanel() {
    content.innerHTML = '';

    if (!state.inventar.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<p>Noch keine Geräte im Inventar erfasst.</p>`;
      const btn = document.createElement('button');
      btn.className = 'btn-gold';
      btn.textContent = '+ Neues Gerät';
      btn.addEventListener('click', openAddInventarModal);
      empty.appendChild(btn);
      content.appendChild(empty);
      return;
    }

    const table = document.createElement('table');
    table.className = 'inventar-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th>Gerät</th>
      <th>Hersteller</th>
      <th>OVP/Gebraucht</th>
      <th>Stückzahl</th>
      <th>Aktionen</th>
    </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    state.inventar.forEach((item) => {
      const tr = document.createElement('tr');
      if (item.stueckzahl <= LOW_STOCK_THRESHOLD) tr.classList.add('low-stock');

      const geraetTd = document.createElement('td');
      geraetTd.className = 'geraet-cell';
      if (item.photo) {
        const thumb = document.createElement('img');
        thumb.className = 'geraet-thumb';
        thumb.src = item.photo;
        thumb.alt = item.geraet;
        geraetTd.appendChild(thumb);
      }
      const geraetName = document.createElement('span');
      geraetName.textContent = item.geraet;
      geraetTd.appendChild(geraetName);
      tr.appendChild(geraetTd);

      const herstellerTd = document.createElement('td');
      herstellerTd.textContent = item.hersteller || '–';
      tr.appendChild(herstellerTd);

      const zustandTd = document.createElement('td');
      const zustandBadge = document.createElement('span');
      zustandBadge.className = 'zustand-badge ' + (item.zustand === 'OVP' ? 'ovp' : 'gebraucht');
      zustandBadge.textContent = item.zustand;
      zustandTd.appendChild(zustandBadge);
      tr.appendChild(zustandTd);

      const stueckzahlTd = document.createElement('td');
      const stueckzahlInput = document.createElement('input');
      stueckzahlInput.type = 'number';
      stueckzahlInput.min = '0';
      stueckzahlInput.className = 'stueckzahl-input';
      stueckzahlInput.value = String(item.stueckzahl);
      stueckzahlInput.addEventListener('change', () => updateStueckzahl(item.id, stueckzahlInput.value));
      stueckzahlTd.appendChild(stueckzahlInput);
      if (item.stueckzahl <= LOW_STOCK_THRESHOLD) {
        const warn = document.createElement('span');
        warn.className = 'low-stock-badge';
        warn.textContent = '⚠️ Nachbestellen';
        stueckzahlTd.appendChild(warn);
      }
      tr.appendChild(stueckzahlTd);

      const actionsTd = document.createElement('td');
      actionsTd.className = 'actions-cell';
      const ausgebenBtn = document.createElement('button');
      ausgebenBtn.className = 'btn-gold-outline small';
      ausgebenBtn.textContent = 'Ausgeben';
      ausgebenBtn.disabled = item.stueckzahl <= 0;
      ausgebenBtn.addEventListener('click', () => openAusgabeModal(item.id));
      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn danger';
      delBtn.textContent = '✕';
      delBtn.title = 'Gerät löschen';
      delBtn.addEventListener('click', () => openDeleteInventarModal(item.id));
      actionsTd.appendChild(ausgebenBtn);
      actionsTd.appendChild(delBtn);
      tr.appendChild(actionsTd);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    content.appendChild(table);
  }

  document.getElementById('addDozentEmptyBtn').addEventListener('click', openAddDozentModal);
  document.getElementById('cancelAddDozent').addEventListener('click', closeAddDozentModal);
  document.getElementById('confirmAddDozent').addEventListener('click', confirmAddDozent);
  newDozentNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddDozent();
  });

  document.getElementById('cancelDeleteDozent').addEventListener('click', closeDeleteDozentModal);
  document.getElementById('confirmDeleteDozent').addEventListener('click', confirmDeleteDozent);

  modeDozentenBtn.addEventListener('click', () => setMode('dozenten'));
  modeInventarBtn.addEventListener('click', () => setMode('inventar'));

  addInventarBtn.addEventListener('click', openAddInventarModal);
  cancelAddInventarBtn.addEventListener('click', closeAddInventarModal);
  confirmAddInventarBtn.addEventListener('click', confirmAddInventar);

  attachMic(invGeraetMic, invGeraet);
  attachMic(invHerstellerMic, invHersteller);

  invStartCamera.addEventListener('click', startCamera);
  invCapturePhotoBtn.addEventListener('click', capturePhoto);
  invCancelCameraBtn.addEventListener('click', stopCamera);
  invRecognitionYesBtn.addEventListener('click', () => {
    if (recognizedLabel) invGeraet.value = recognizedLabel;
    invRecognitionBox.hidden = true;
    invStueckzahl.focus();
    invStueckzahl.select();
  });
  invRecognitionNoBtn.addEventListener('click', () => {
    invRecognitionBox.hidden = true;
    invGeraet.focus();
  });

  cancelAusgabeBtn.addEventListener('click', closeAusgabeModal);
  confirmAusgabeBtn.addEventListener('click', confirmAusgabe);

  cancelDeleteInventarBtn.addEventListener('click', closeDeleteInventarModal);
  confirmDeleteInventarBtn.addEventListener('click', confirmDeleteInventar);

  async function init() {
    const loaded = await window.dashboardAPI.loadData();
    state = loaded && Array.isArray(loaded.dozenten) ? loaded : { dozenten: [], inventar: [] };
    if (!Array.isArray(state.inventar)) state.inventar = [];
    state.dozenten.forEach((d) => {
      if (!Array.isArray(d.chat)) d.chat = [];
    });
    state.inventar.forEach((i) => {
      if (!Array.isArray(i.ausgaben)) i.ausgaben = [];
    });
    activeDozentId = state.dozenten.length ? state.dozenten[0].id : null;
    render();
  }

  init();
})();
