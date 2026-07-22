(function () {
  const MAX_DOZENTEN = 4;

  let state = { dozenten: [] };
  let activeDozentId = null;

  const dozentTabs = document.getElementById('dozentTabs');
  const content = document.getElementById('content');
  const emptyState = document.getElementById('emptyState');

  const addDozentModal = document.getElementById('addDozentModal');
  const newDozentNameInput = document.getElementById('newDozentName');
  const deleteDozentModal = document.getElementById('deleteDozentModal');
  const deleteDozentText = document.getElementById('deleteDozentText');

  let pendingDeleteId = null;

  // Zustand für Video-Live-Chat, Audio/Video und Dateifreigabe
  let mediaStream = null;
  const mediaState = { audioOn: true, videoOn: true };
  let fileShareEnabled = false;
  let pendingShareFile = null;
  let sharedFiles = [];
  let activeVideoDozent = null;
  let toastTimer = null;

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
    const h2 = document.createElement('h2');
    h2.textContent = dozent.name;
    header.appendChild(h2);
    header.appendChild(buildToolbar(dozent));
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

  // ===== Werkzeugleiste (Screenshot, Sniping, Video-Chat, Audio/Video) =====

  function mkToolBtn(label, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.textContent = label;
    if (title) btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function buildToolbar(dozent) {
    const bar = document.createElement('div');
    bar.className = 'panel-toolbar';

    bar.appendChild(mkToolBtn('📷 Screenshot', 'Ganzen Bildschirm aufnehmen', () => takeScreenshot(false)));
    bar.appendChild(mkToolBtn('✂️ Sniping', 'Bereichsauswahl-Screenshot', () => takeScreenshot(true)));
    bar.appendChild(mkToolBtn('🎥 Video-Chat', 'Video-Live-Chat öffnen', () => openVideoChat(dozent)));

    const audioToggle = mkToolBtn('🎤 Audio', 'Audio an/aus', toggleAudio);
    audioToggle.dataset.mediaToggle = 'audio';
    bar.appendChild(audioToggle);

    const videoToggle = mkToolBtn('📹 Video', 'Video an/aus', toggleVideo);
    videoToggle.dataset.mediaToggle = 'video';
    bar.appendChild(videoToggle);

    bar.appendChild(mkToolBtn('⚙ Drive', 'Google Drive verbinden', openSettingsModal));

    // Zustände der Umschalter nach dem Neuzeichnen anwenden
    updateMediaButtons();
    return bar;
  }

  // ===== Screenshot / Sniping =====

  async function takeScreenshot(sniping) {
    let dataUrl = await window.dashboardAPI.captureScreen();
    if (!dataUrl) {
      showToast('Screenshot fehlgeschlagen – keine Bildschirmquelle verfügbar.', true);
      return;
    }

    if (sniping) {
      dataUrl = await runSnipSelection(dataUrl);
      if (!dataUrl) return; // abgebrochen oder zu kleiner Bereich
    }

    const result = await window.dashboardAPI.saveScreenshot({ dataUrl, toDrive: true });
    if (!result || !result.ok) {
      showToast('Screenshot konnte nicht gespeichert werden.', true);
      return;
    }

    let msg = `Screenshot gespeichert: ${result.filePath}`;
    if (result.drive) {
      if (result.drive.ok) {
        msg += ' · in Google Drive hochgeladen ✓';
      } else if (result.drive.reason === 'no-token') {
        msg += ' · Google Drive: kein Token hinterlegt (⚙ Drive)';
      } else {
        msg += ` · Google Drive fehlgeschlagen (${result.drive.reason})`;
      }
    }
    showToast(msg);
  }

  function runSnipSelection(dataUrl) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('snipOverlay');
      const img = document.getElementById('snipImage');
      const sel = document.getElementById('snipSelection');
      const dim = overlay.querySelector('.snip-dim');

      img.src = dataUrl;
      overlay.classList.add('visible');
      sel.style.display = 'none';

      let startX = 0;
      let startY = 0;
      let dragging = false;

      function updateSel(x, y) {
        const left = Math.min(startX, x);
        const top = Math.min(startY, y);
        sel.style.left = left + 'px';
        sel.style.top = top + 'px';
        sel.style.width = Math.abs(x - startX) + 'px';
        sel.style.height = Math.abs(y - startY) + 'px';
      }

      function onDown(e) {
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        dim.style.display = 'none';
        sel.style.display = 'block';
        updateSel(e.clientX, e.clientY);
      }

      function onMove(e) {
        if (dragging) updateSel(e.clientX, e.clientY);
      }

      function cleanup() {
        overlay.removeEventListener('mousedown', onDown);
        overlay.removeEventListener('mousemove', onMove);
        overlay.removeEventListener('mouseup', onUp);
        document.removeEventListener('keydown', onKey);
        overlay.classList.remove('visible');
        sel.style.display = 'none';
        dim.style.display = '';
      }

      function onUp(e) {
        if (!dragging) return;
        dragging = false;
        const rect = {
          left: Math.min(startX, e.clientX),
          top: Math.min(startY, e.clientY),
          width: Math.abs(e.clientX - startX),
          height: Math.abs(e.clientY - startY)
        };
        cleanup();
        if (rect.width < 5 || rect.height < 5) {
          resolve(null);
          return;
        }
        cropImage(dataUrl, rect, img.clientWidth, img.clientHeight).then(resolve);
      }

      function onKey(e) {
        if (e.key === 'Escape') {
          cleanup();
          resolve(null);
        }
      }

      overlay.addEventListener('mousedown', onDown);
      overlay.addEventListener('mousemove', onMove);
      overlay.addEventListener('mouseup', onUp);
      document.addEventListener('keydown', onKey);
    });
  }

  function cropImage(dataUrl, rect, displayW, displayH) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const scaleX = image.naturalWidth / displayW;
        const scaleY = image.naturalHeight / displayH;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(rect.width * scaleX));
        canvas.height = Math.max(1, Math.round(rect.height * scaleY));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          image,
          rect.left * scaleX,
          rect.top * scaleY,
          rect.width * scaleX,
          rect.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        );
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => resolve(null);
      image.src = dataUrl;
    });
  }

  // ===== Video-Live-Chat =====

  async function openVideoChat(dozent) {
    activeVideoDozent = dozent || activeVideoDozent;
    const overlay = document.getElementById('videoOverlay');
    const title = document.getElementById('videoChatTitle');
    if (activeVideoDozent) {
      title.textContent = `Video-Live-Chat – ${activeVideoDozent.name}`;
    }
    overlay.classList.add('visible');
    renderSharedFiles();

    const localVideo = document.getElementById('localVideo');
    const localStatus = document.getElementById('localStatus');
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = mediaStream;
      applyMediaState();
    } catch (err) {
      localStatus.innerHTML = '<span class="badge">Kamera/Mikro nicht verfügbar</span>';
    }
  }

  function closeVideoChat() {
    const overlay = document.getElementById('videoOverlay');
    const localVideo = document.getElementById('localVideo');
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    localVideo.srcObject = null;
    overlay.classList.remove('visible');
  }

  function applyMediaState() {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach((t) => (t.enabled = mediaState.audioOn));
      mediaStream.getVideoTracks().forEach((t) => (t.enabled = mediaState.videoOn));
    }
    updateMediaButtons();
    updateLocalStatus();
  }

  function toggleAudio() {
    mediaState.audioOn = !mediaState.audioOn;
    applyMediaState();
  }

  function toggleVideo() {
    mediaState.videoOn = !mediaState.videoOn;
    applyMediaState();
  }

  function updateMediaButtons() {
    document.querySelectorAll('[data-media-toggle="audio"]').forEach((btn) => {
      const on = mediaState.audioOn;
      btn.classList.toggle('off', !on);
      btn.classList.toggle('active', on);
      btn.textContent = `🎤 Audio ${on ? 'an' : 'aus'}`;
    });
    document.querySelectorAll('[data-media-toggle="video"]').forEach((btn) => {
      const on = mediaState.videoOn;
      btn.classList.toggle('off', !on);
      btn.classList.toggle('active', on);
      btn.textContent = `📹 Video ${on ? 'an' : 'aus'}`;
    });
  }

  function updateLocalStatus() {
    const localStatus = document.getElementById('localStatus');
    if (!localStatus) return;
    const badges = [];
    if (!mediaState.audioOn) badges.push('<span class="badge">Mikro aus</span>');
    if (!mediaState.videoOn) badges.push('<span class="badge">Kamera aus</span>');
    localStatus.innerHTML = badges.join('');
  }

  // ===== Dateifreigabe =====

  function setFileShareEnabled(enabled) {
    fileShareEnabled = enabled;
    const openBtn = document.getElementById('openFileBtn');
    const iconBtn = document.getElementById('videoShareFile');
    if (openBtn) openBtn.disabled = !enabled;
    if (iconBtn) iconBtn.disabled = !enabled;
    if (!enabled) clearPendingShare();
  }

  async function chooseFileToShare() {
    if (!fileShareEnabled) {
      showToast('Bitte zuerst die Dateifreigabe einschalten.', true);
      return;
    }
    const result = await window.dashboardAPI.openFileDialog();
    if (result.canceled || !result.files.length) return;
    // Mehrfachauswahl: erste Datei in die Bestätigung, restliche direkt vormerken
    pendingShareFile = result.files;
    showPendingShare();
  }

  function showPendingShare() {
    const box = document.getElementById('fileSharePending');
    const name = document.getElementById('pendingFileName');
    if (!pendingShareFile) {
      box.hidden = true;
      return;
    }
    const label =
      pendingShareFile.length === 1
        ? pendingShareFile[0].name
        : `${pendingShareFile.length} Dateien`;
    name.textContent = label;
    box.hidden = false;
  }

  function clearPendingShare() {
    pendingShareFile = null;
    const box = document.getElementById('fileSharePending');
    if (box) box.hidden = true;
  }

  function confirmShare() {
    if (!pendingShareFile) return;
    const target = document.getElementById('shareTargetSelect').value;
    const targetLabel = target === 'alle' ? 'Alle Teilnehmer' : 'Nur Dozent';
    pendingShareFile.forEach((file) => {
      sharedFiles.push({
        id: uid(),
        name: file.name,
        target,
        targetLabel,
        time: new Date().toLocaleString('de-DE', {
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    });
    const count = pendingShareFile.length;
    clearPendingShare();
    renderSharedFiles();
    showToast(`${count} Datei(en) mit "${targetLabel}" geteilt.`);
  }

  function renderSharedFiles() {
    const list = document.getElementById('sharedFileList');
    if (!list) return;
    list.innerHTML = '';
    sharedFiles.forEach((sf) => {
      const li = document.createElement('li');

      const icon = document.createElement('span');
      icon.textContent = '📄';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'sf-name';
      nameSpan.textContent = `${sf.name} · ${sf.time}`;

      const targetSpan = document.createElement('span');
      targetSpan.className = 'sf-target' + (sf.target === 'alle' ? ' alle' : '');
      targetSpan.textContent = sf.targetLabel;

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn danger';
      delBtn.textContent = '✕';
      delBtn.title = 'Freigabe entfernen';
      delBtn.addEventListener('click', () => {
        sharedFiles = sharedFiles.filter((f) => f.id !== sf.id);
        renderSharedFiles();
      });

      li.appendChild(icon);
      li.appendChild(nameSpan);
      li.appendChild(targetSpan);
      li.appendChild(delBtn);
      list.appendChild(li);
    });
  }

  // ===== Google-Drive-Einstellungen =====

  async function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const input = document.getElementById('driveTokenInput');
    const settings = await window.dashboardAPI.getSettings();
    input.value = (settings && settings.googleDriveToken) || '';
    modal.classList.add('visible');
    input.focus();
  }

  function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('visible');
  }

  async function saveSettingsFromModal() {
    const input = document.getElementById('driveTokenInput');
    const settings = (await window.dashboardAPI.getSettings()) || {};
    settings.googleDriveToken = input.value.trim();
    await window.dashboardAPI.saveSettings(settings);
    closeSettingsModal();
    showToast(
      settings.googleDriveToken
        ? 'Google-Drive-Token gespeichert.'
        : 'Google-Drive-Token entfernt.'
    );
  }

  // ===== Toast =====

  function showToast(message, isError) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast visible' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.className = 'toast';
    }, 6000);
  }

  function render() {
    renderTabs();
    renderPanel();
    updateMediaButtons();
  }

  document.getElementById('addDozentEmptyBtn').addEventListener('click', openAddDozentModal);
  document.getElementById('cancelAddDozent').addEventListener('click', closeAddDozentModal);
  document.getElementById('confirmAddDozent').addEventListener('click', confirmAddDozent);
  newDozentNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddDozent();
  });

  document.getElementById('cancelDeleteDozent').addEventListener('click', closeDeleteDozentModal);
  document.getElementById('confirmDeleteDozent').addEventListener('click', confirmDeleteDozent);

  // Video-Chat-Fenster
  document.getElementById('closeVideoChat').addEventListener('click', closeVideoChat);
  document.getElementById('videoHangup').addEventListener('click', closeVideoChat);
  document.getElementById('videoToggleAudio').addEventListener('click', toggleAudio);
  document.getElementById('videoToggleVideo').addEventListener('click', toggleVideo);

  // Dateifreigabe
  document.getElementById('fileShareToggle').addEventListener('change', (e) => {
    setFileShareEnabled(e.target.checked);
  });
  document.getElementById('openFileBtn').addEventListener('click', chooseFileToShare);
  document.getElementById('videoShareFile').addEventListener('click', chooseFileToShare);
  document.getElementById('confirmShareBtn').addEventListener('click', confirmShare);
  document.getElementById('cancelShareBtn').addEventListener('click', clearPendingShare);

  // Google-Drive-Einstellungen
  document.getElementById('cancelSettings').addEventListener('click', closeSettingsModal);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettingsFromModal);

  async function init() {
    const loaded = await window.dashboardAPI.loadData();
    state = loaded && Array.isArray(loaded.dozenten) ? loaded : { dozenten: [] };
    state.dozenten.forEach((d) => {
      if (!Array.isArray(d.chat)) d.chat = [];
    });
    activeDozentId = state.dozenten.length ? state.dozenten[0].id : null;
    setFileShareEnabled(document.getElementById('fileShareToggle').checked);
    render();
  }

  init();
})();
