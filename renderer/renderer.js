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

  // Zustand für PowerPoint-Präsentationen (auf allen Bildschirmen teilen)
  let pendingPresentationFile = null;
  let presentTargetDozentId = null;

  // Unterricht/Teilnehmer, Unterrichts-Chat und Privat-/Gruppenchats
  let participants = [];
  let lessonChat = [];
  let conversations = [];
  let activeConversationId = null;
  let groupBuilderActive = false;
  let allMuted = false;
  const LOCAL_ID = 'me';

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
      chat: [],
      homework: [],
      exams: [],
      presentation: null
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

    if (dozent.presentation) {
      panel.appendChild(buildPresentationBanner(dozent));
    }

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
    panel.appendChild(buildHomeworkFolder(dozent));
    panel.appendChild(buildCalendarFolder(dozent));

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
    bar.appendChild(
      mkToolBtn('📊 PowerPoint', 'PowerPoint-Präsentation auf allen Bildschirmen teilen', () =>
        sharePowerPoint(dozent)
      )
    );
    bar.appendChild(mkToolBtn('⚙ Drive', 'Google Drive verbinden', openSettingsModal));
    bar.appendChild(mkToolBtn('🎥 Video-Chat', 'Video-Live-Chat öffnen', () => openVideoChat(dozent)));

    const audioToggle = mkToolBtn('🎤 Audio', 'Audio an/aus', toggleAudio);
    audioToggle.dataset.mediaToggle = 'audio';
    bar.appendChild(audioToggle);

    const videoToggle = mkToolBtn('📹 Video', 'Video an/aus', toggleVideo);
    videoToggle.dataset.mediaToggle = 'video';
    bar.appendChild(videoToggle);

    // Zustände der Umschalter nach dem Neuzeichnen anwenden
    updateMediaButtons();
    return bar;
  }

  function buildPresentationBanner(dozent) {
    const banner = document.createElement('div');
    banner.className = 'presentation-banner';

    const text = document.createElement('span');
    text.textContent = `📊 "${dozent.presentation.name}" wird von ${dozent.presentation.presenter} auf allen Bildschirmen geteilt (seit ${dozent.presentation.time})`;

    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn-secondary btn-sm';
    stopBtn.textContent = 'Beenden';
    stopBtn.addEventListener('click', () => stopPresenting(dozent));

    banner.appendChild(text);
    banner.appendChild(stopBtn);
    return banner;
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
    const dozentName = activeVideoDozent ? activeVideoDozent.name : 'Dozent';
    title.textContent = `Video-Live-Chat – Unterricht bei ${dozentName}`;
    overlay.classList.add('visible');

    // Teilnehmerliste initialisieren: Dozent (Übertragung) + eigener Zugang
    if (!participants.length) {
      participants = [
        { id: 'dozent', name: dozentName, isLocal: false, audioOn: true, videoOn: true },
        { id: LOCAL_ID, name: 'Ich', isLocal: true, audioOn: true, videoOn: true }
      ];
    } else {
      const dz = participants.find((p) => p.id === 'dozent');
      if (dz) dz.name = dozentName;
    }

    renderSharedFiles();
    renderParticipants();
    setMuteAllButtonLabel();
    renderLessonChat();
    renderConversations();
    updateLessonPresentationLabel(activeVideoDozent);

    const lessonVideo = document.getElementById('lessonVideo');
    const localStatus = document.getElementById('localStatus');
    try {
      // Anmeldung am Unterricht erfolgt immer mit Videochat (Kamera + Mikro).
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      lessonVideo.srcObject = mediaStream;
      attachLocalStreamToThumb();
      applyMediaState();
    } catch (err) {
      localStatus.innerHTML = '<span class="badge">Kamera/Mikro nicht verfügbar</span>';
      showToast('Ohne Kamera-/Mikrofonfreigabe ist keine Teilnahme am Unterricht möglich.', true);
    }
  }

  function attachLocalStreamToThumb() {
    const thumbVideo = document.querySelector(`.participant-thumb[data-id="${LOCAL_ID}"] video`);
    if (thumbVideo && mediaStream) thumbVideo.srcObject = mediaStream;
  }

  function closeVideoChat() {
    const overlay = document.getElementById('videoOverlay');
    const lessonVideo = document.getElementById('lessonVideo');
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    if (lessonVideo) lessonVideo.srcObject = null;
    overlay.classList.remove('visible');
  }

  // ===== Teilnehmer-Leiste =====

  function isDozent(p) {
    return p.id === 'dozent';
  }

  function participantBadges(p) {
    const mini = [];
    if (!isDozent(p) && !p.audioOn) mini.push('<span class="mini">🔇</span>');
    if (!p.videoOn) mini.push('<span class="mini">📹</span>');
    if (p.handRaised) mini.push('<span class="mini hand">✋</span>');
    return mini.join('');
  }

  function renderParticipants() {
    const strip = document.getElementById('participantThumbs');
    const countEl = document.getElementById('participantCount');
    if (!strip) return;
    strip.innerHTML = '';
    countEl.textContent = String(participants.length);

    participants.forEach((p) => {
      const thumb = document.createElement('div');
      thumb.className = 'participant-thumb';
      thumb.dataset.id = p.id;
      thumb.title = p.isLocal
        ? 'Das bin ich'
        : isDozent(p)
        ? 'Dozent (Übertragung)'
        : `Privatchat mit ${p.name}`;

      const videoBox = document.createElement('div');
      videoBox.className = 'thumb-video';

      const avatar = document.createElement('div');
      avatar.className = 'thumb-avatar';
      avatar.textContent = isDozent(p) ? '🎓' : '👤';
      videoBox.appendChild(avatar);

      if (p.isLocal) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        videoBox.appendChild(video);
      }

      const badges = document.createElement('div');
      badges.className = 'thumb-badges';
      badges.innerHTML = participantBadges(p);
      videoBox.appendChild(badges);

      // Entfernen nur für hinzugefügte Teilnehmer (nicht Dozent, nicht ich)
      if (!p.isLocal && !isDozent(p)) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'thumb-remove';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Teilnehmer entfernen';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeParticipant(p.id);
        });
        videoBox.appendChild(removeBtn);
      }

      // Aktionen: Melden (Teilnehmer) und Freischalten (Dozent)
      if (!isDozent(p)) {
        const actions = document.createElement('div');
        actions.className = 'thumb-actions';

        const handBtn = document.createElement('button');
        handBtn.textContent = p.handRaised ? '✋ meldet' : '✋';
        handBtn.title = p.handRaised ? 'Meldung zurücknehmen' : 'Melden';
        if (p.handRaised) handBtn.classList.add('active');
        handBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleHand(p.id);
        });
        actions.appendChild(handBtn);

        if (!p.audioOn) {
          const unmuteBtn = document.createElement('button');
          unmuteBtn.textContent = '🔊';
          unmuteBtn.title = 'Freischalten (Dozent) – Teilnehmer kann sprechen';
          unmuteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            freischalten(p.id);
          });
          actions.appendChild(unmuteBtn);
        }

        videoBox.appendChild(actions);
      }

      const name = document.createElement('span');
      name.className = 'thumb-name';
      name.textContent = p.name;

      thumb.appendChild(videoBox);
      thumb.appendChild(name);

      // Klick auf einen Teilnehmer öffnet einen Privatchat
      if (!p.isLocal && !isDozent(p)) {
        thumb.addEventListener('click', () => openPrivateChat(p.id));
      }

      strip.appendChild(thumb);
    });

    attachLocalStreamToThumb();
    updateLocalStatus();
  }

  // ===== Moderation: Stummschalten & Melden =====

  function setMuteAllButtonLabel() {
    const btn = document.getElementById('muteAllBtn');
    if (!btn) return;
    btn.textContent = allMuted ? '🔊 Stummschaltung aufheben' : '🔇 Alle stummschalten';
    btn.classList.toggle('active', allMuted);
  }

  function toggleMuteAll() {
    allMuted = !allMuted;
    participants.forEach((p) => {
      if (!isDozent(p)) {
        p.audioOn = !allMuted;
        if (!allMuted) p.handRaised = false;
      }
    });
    // Eigenes Mikrofon entsprechend schalten
    mediaState.audioOn = !allMuted;
    applyMediaState();
    setMuteAllButtonLabel();
    renderParticipants();
    showToast(
      allMuted
        ? 'Alle Teilnehmer stummgeschaltet – nur der Dozent ist zu hören.'
        : 'Stummschaltung aufgehoben.'
    );
  }

  function toggleHand(id) {
    const p = participants.find((x) => x.id === id);
    if (!p) return;
    p.handRaised = !p.handRaised;
    renderParticipants();
    if (p.handRaised) {
      showToast(`${p.name} meldet sich zu Wort.`);
    }
  }

  function raiseLocalHand() {
    toggleHand(LOCAL_ID);
  }

  // Dozent schaltet eine gemeldete Person frei – sie kann sprechen, alle hören es.
  function freischalten(id) {
    const p = participants.find((x) => x.id === id);
    if (!p) return;
    p.audioOn = true;
    p.handRaised = false;
    if (p.isLocal) {
      mediaState.audioOn = true;
      applyMediaState();
    }
    renderParticipants();
    showToast(`${p.name} wurde freigeschaltet und kann jetzt sprechen.`);
  }

  function showAddParticipant() {
    const box = document.getElementById('participantAdd');
    const input = document.getElementById('newParticipantName');
    box.hidden = false;
    input.value = '';
    input.focus();
  }

  function cancelAddParticipant() {
    document.getElementById('participantAdd').hidden = true;
  }

  function confirmAddParticipant() {
    const input = document.getElementById('newParticipantName');
    const name = input.value.trim();
    if (!name) return;
    participants.push({
      id: uid(),
      name,
      isLocal: false,
      audioOn: true,
      videoOn: true
    });
    cancelAddParticipant();
    renderParticipants();
    if (groupBuilderActive) renderGroupMembers();
    showToast(`${name} ist dem Unterricht beigetreten.`);
  }

  function removeParticipant(id) {
    participants = participants.filter((p) => p.id !== id);
    // Betroffene Unterhaltungen bereinigen
    conversations = conversations.filter((c) => {
      if (c.isGroup) {
        c.memberIds = c.memberIds.filter((m) => m !== id);
        return c.memberIds.length > 0;
      }
      return !c.memberIds.includes(id);
    });
    if (activeConversationId && !conversations.some((c) => c.id === activeConversationId)) {
      activeConversationId = null;
    }
    renderParticipants();
    renderConversations();
    if (groupBuilderActive) renderGroupMembers();
  }

  // ===== Unterrichts-Chat (alle Teilnehmer) =====

  function renderLessonChat() {
    const box = document.getElementById('lessonChatMessages');
    if (!box) return;
    box.innerHTML = '';
    lessonChat.forEach((m) => {
      const el = document.createElement('div');
      el.className = 'lesson-msg' + (m.type === 'pause' ? ' pause' : '');
      if (m.type === 'pause') {
        el.textContent = `⏸ Pause – ${m.author} (${m.time})`;
      } else {
        el.innerHTML =
          `<span class="who"></span><span class="when"></span><br><span class="body"></span>`;
        el.querySelector('.who').textContent = m.author + ':';
        el.querySelector('.when').textContent = m.time;
        el.querySelector('.body').textContent = m.text;
      }
      box.appendChild(el);
    });
    requestAnimationFrame(() => {
      box.scrollTop = box.scrollHeight;
    });
  }

  function pushLessonMessage(entry) {
    lessonChat.push(
      Object.assign(
        {
          id: uid(),
          author: 'Ich',
          time: new Date().toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
          })
        },
        entry
      )
    );
    renderLessonChat();
  }

  function sendLessonMessage() {
    const input = document.getElementById('lessonChatInput');
    const text = input.value.trim();
    if (!text) return;
    pushLessonMessage({ type: 'msg', text });
    input.value = '';
    input.focus();
  }

  function enterPause() {
    pushLessonMessage({ type: 'pause' });
    showToast('Pause im Unterrichts-Chat eingetragen.');
  }

  // ===== Privat- & Gruppenchat =====

  function openPrivateChat(participantId) {
    const p = participants.find((x) => x.id === participantId);
    if (!p) return;
    let conv = conversations.find(
      (c) => !c.isGroup && c.memberIds.length === 1 && c.memberIds[0] === participantId
    );
    if (!conv) {
      conv = { id: uid(), name: p.name, isGroup: false, memberIds: [participantId], messages: [] };
      conversations.push(conv);
    }
    activeConversationId = conv.id;
    renderConversations();
  }

  function startGroupBuilder() {
    groupBuilderActive = true;
    document.getElementById('groupBuilder').hidden = false;
    document.getElementById('groupNameInput').value = '';
    renderGroupMembers();
  }

  function cancelGroupBuilder() {
    groupBuilderActive = false;
    document.getElementById('groupBuilder').hidden = true;
  }

  function renderGroupMembers() {
    const box = document.getElementById('groupMembers');
    box.innerHTML = '';
    participants
      .filter((p) => !p.isLocal)
      .forEach((p) => {
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = p.id;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(p.name));
        box.appendChild(label);
      });
    if (!box.children.length) {
      box.textContent = 'Noch keine weiteren Teilnehmer. Zuerst „+ Teilnehmer" hinzufügen.';
    }
  }

  function createGroup() {
    const name = document.getElementById('groupNameInput').value.trim();
    const checked = Array.from(
      document.querySelectorAll('#groupMembers input:checked')
    ).map((cb) => cb.value);
    if (!name) {
      showToast('Bitte einen Gruppennamen eingeben.', true);
      return;
    }
    if (!checked.length) {
      showToast('Bitte mindestens einen Teilnehmer auswählen.', true);
      return;
    }
    const conv = { id: uid(), name, isGroup: true, memberIds: checked, messages: [] };
    conversations.push(conv);
    activeConversationId = conv.id;
    cancelGroupBuilder();
    renderConversations();
    showToast(`Gruppenchat "${name}" mit ${checked.length} Teilnehmer(n) erstellt.`);
  }

  function renderConversations() {
    const list = document.getElementById('conversationList');
    if (!list) return;
    list.innerHTML = '';
    conversations.forEach((c) => {
      const li = document.createElement('li');
      li.className = c.id === activeConversationId ? 'active' : '';

      const kind = document.createElement('span');
      kind.className = 'conv-kind';
      kind.textContent = c.isGroup ? '👥' : '💬';

      const label = document.createElement('span');
      const memberNames = c.memberIds
        .map((id) => (participants.find((p) => p.id === id) || {}).name)
        .filter(Boolean)
        .join(', ');
      label.textContent = c.isGroup ? `${c.name} (${memberNames})` : c.name;

      li.appendChild(kind);
      li.appendChild(label);
      li.addEventListener('click', () => {
        activeConversationId = c.id;
        renderConversations();
      });
      list.appendChild(li);
    });

    renderConversationView();
  }

  function renderConversationView() {
    const view = document.getElementById('conversationView');
    if (!view) return;
    const conv = conversations.find((c) => c.id === activeConversationId);
    view.innerHTML = '';

    if (!conv) {
      const empty = document.createElement('div');
      empty.className = 'conversation-empty';
      empty.textContent = 'Teilnehmer oder Gruppe anklicken, um zu chatten.';
      view.appendChild(empty);
      return;
    }

    const title = document.createElement('div');
    title.className = 'conversation-title';
    title.textContent = conv.isGroup ? `Gruppe: ${conv.name}` : `Privatchat: ${conv.name}`;
    view.appendChild(title);

    const messages = document.createElement('div');
    messages.className = 'conversation-messages';
    conv.messages.forEach((m) => {
      const bubble = document.createElement('div');
      bubble.className = 'conv-bubble' + (m.mine ? ' mine' : '');
      bubble.textContent = m.text;
      messages.appendChild(bubble);
    });
    view.appendChild(messages);

    const row = document.createElement('div');
    row.className = 'add-item-row';
    row.style.padding = '8px';
    row.style.margin = '0';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Nachricht…';
    const sendBtn = document.createElement('button');
    sendBtn.textContent = 'Senden';
    const send = () => {
      const text = input.value.trim();
      if (!text) return;
      conv.messages.push({ id: uid(), text, mine: true });
      input.value = '';
      renderConversationView();
    };
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') send();
    });
    row.appendChild(input);
    row.appendChild(sendBtn);
    view.appendChild(row);

    requestAnimationFrame(() => {
      messages.scrollTop = messages.scrollHeight;
    });
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
    if (localStatus) {
      const badges = [];
      if (!mediaState.audioOn) badges.push('<span class="badge">Mikro aus</span>');
      if (!mediaState.videoOn) badges.push('<span class="badge">Kamera aus</span>');
      localStatus.innerHTML = badges.join('');
    }

    const me = participants.find((p) => p.id === LOCAL_ID);
    if (me) {
      me.audioOn = mediaState.audioOn;
      me.videoOn = mediaState.videoOn;
    }

    // Mini-Badges auf der eigenen Teilnehmer-Kachel
    const thumbBadges = document.querySelector(
      `.participant-thumb[data-id="${LOCAL_ID}"] .thumb-badges`
    );
    if (thumbBadges && me) {
      thumbBadges.innerHTML = participantBadges(me);
    }
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

  // ===== PowerPoint-Präsentation teilen (auf allen Bildschirmen) =====

  async function sharePowerPoint(dozent) {
    const result = await window.dashboardAPI.openFileDialog({
      title: 'PowerPoint-Präsentation auswählen',
      filters: [{ name: 'PowerPoint', extensions: ['pptx', 'ppt', 'ppsx', 'pps'] }],
      multiSelections: false
    });
    if (result.canceled || !result.files.length) return;

    pendingPresentationFile = result.files[0];
    presentTargetDozentId = dozent.id;
    document.getElementById('presentFileName').textContent = '📊 ' + pendingPresentationFile.name;
    const input = document.getElementById('presenterNameInput');
    input.value = '';
    document.getElementById('presentModal').classList.add('visible');
    input.focus();
  }

  function closePresentModal() {
    pendingPresentationFile = null;
    presentTargetDozentId = null;
    document.getElementById('presentModal').classList.remove('visible');
  }

  function confirmPresent() {
    if (!pendingPresentationFile || !presentTargetDozentId) return;
    const dozent = findDozent(presentTargetDozentId);
    if (!dozent) return;
    const presenter = document.getElementById('presenterNameInput').value.trim() || 'Unbekannt';

    dozent.presentation = {
      name: pendingPresentationFile.name,
      presenter,
      time: nowStr()
    };
    const fileName = dozent.presentation.name;
    closePresentModal();
    persist();
    render();
    updateLessonPresentationLabel(dozent);
    showToast(`"${fileName}" wird von ${presenter} auf allen Bildschirmen geteilt.`);
  }

  function stopPresenting(dozent) {
    dozent.presentation = null;
    persist();
    render();
    updateLessonPresentationLabel(dozent);
    showToast('Präsentation beendet.');
  }

  // Aktualisiert die Anzeige im Video-Chat-Fenster, falls es gerade für diesen Dozenten offen ist.
  function updateLessonPresentationLabel(dozent) {
    const label = document.getElementById('lessonVideoLabel');
    if (!label || !activeVideoDozent || activeVideoDozent.id !== dozent.id) return;
    label.textContent = dozent.presentation
      ? `📊 ${dozent.presentation.presenter} präsentiert: ${dozent.presentation.name}`
      : 'Live-Übertragung – Unterricht';
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

  // ===== Ordner 1: Hausaufgaben =====

  function nowStr() {
    return new Date().toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function addHomework(dozentId, author, text, attachments) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    if (!author.trim() || !text.trim()) {
      showToast('Bitte Name und Aufgabe ausfüllen.', true);
      return;
    }
    dozent.homework.push({
      id: uid(),
      author: author.trim(),
      text: text.trim(),
      attachments: attachments || [],
      submittedAt: nowStr(),
      feedback: '',
      corrected: false,
      returnedAt: null
    });
    persist();
    render();
  }

  function correctHomework(dozentId, hwId, feedback) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    const hw = dozent.homework.find((h) => h.id === hwId);
    if (!hw) return;
    hw.feedback = (feedback || '').trim();
    hw.corrected = true;
    hw.returnedAt = nowStr();
    persist();
    render();
    showToast(`Hausaufgabe von ${hw.author} korrigiert und zurückgegeben.`);
  }

  function deleteHomework(dozentId, hwId) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    dozent.homework = dozent.homework.filter((h) => h.id !== hwId);
    persist();
    render();
  }

  function buildHomeworkFolder(dozent) {
    const folder = document.createElement('div');
    folder.className = 'folder homework-folder';

    const title = document.createElement('h3');
    title.className = 'folder-title';
    title.textContent = '📁 Ordner: Hausaufgaben';
    folder.appendChild(title);

    const hint = document.createElement('p');
    hint.className = 'folder-hint';
    hint.textContent =
      'Teilnehmer reichen Hausaufgaben ein; der Dozent korrigiert sie hier und gibt sie zurück.';
    folder.appendChild(hint);

    // Eingabe-Bereich
    const addRow = document.createElement('div');
    addRow.className = 'hw-add';
    const author = document.createElement('input');
    author.type = 'text';
    author.placeholder = 'Name des Teilnehmers';
    author.className = 'hw-author';
    const text = document.createElement('input');
    text.type = 'text';
    text.placeholder = 'Aufgabe / Beschreibung';
    text.className = 'hw-text';

    let pendingAttachments = [];
    const attachBtn = document.createElement('button');
    attachBtn.className = 'btn-secondary btn-sm';
    attachBtn.textContent = '📎 Datei';
    const attachLabel = document.createElement('span');
    attachLabel.className = 'hw-attach';
    attachBtn.addEventListener('click', async () => {
      const res = await window.dashboardAPI.openFileDialog();
      if (res.canceled) return;
      pendingAttachments = res.files.map((f) => f.name);
      attachLabel.textContent = pendingAttachments.join(', ');
    });

    const submit = document.createElement('button');
    submit.className = 'btn-primary btn-sm';
    submit.textContent = 'Einreichen';
    submit.addEventListener('click', () =>
      addHomework(dozent.id, author.value, text.value, pendingAttachments)
    );

    addRow.appendChild(author);
    addRow.appendChild(text);
    addRow.appendChild(attachBtn);
    addRow.appendChild(submit);
    folder.appendChild(addRow);
    if (attachLabel.textContent) folder.appendChild(attachLabel);

    // Liste der Hausaufgaben
    const list = document.createElement('div');
    list.className = 'hw-list';
    if (!dozent.homework.length) {
      const empty = document.createElement('p');
      empty.className = 'folder-empty';
      empty.textContent = 'Noch keine Hausaufgaben eingereicht.';
      list.appendChild(empty);
    }
    dozent.homework.forEach((hw) => {
      list.appendChild(buildHomeworkItem(dozent, hw));
    });
    folder.appendChild(list);

    return folder;
  }

  function buildHomeworkItem(dozent, hw) {
    const item = document.createElement('div');
    item.className = 'hw-item' + (hw.corrected ? ' corrected' : '');

    const head = document.createElement('div');
    head.className = 'hw-item-head';
    const who = document.createElement('span');
    who.className = 'hw-who';
    who.textContent = hw.author;
    const when = document.createElement('span');
    when.className = 'hw-when';
    when.textContent = 'eingereicht am ' + hw.submittedAt;
    const status = document.createElement('span');
    status.className = 'hw-status' + (hw.corrected ? ' done' : '');
    status.textContent = hw.corrected ? 'Korrigiert & zurückgegeben' : 'Eingereicht';
    const del = document.createElement('button');
    del.className = 'icon-btn danger';
    del.textContent = '✕';
    del.title = 'Löschen';
    del.addEventListener('click', () => deleteHomework(dozent.id, hw.id));
    head.appendChild(who);
    head.appendChild(when);
    head.appendChild(status);
    head.appendChild(del);
    item.appendChild(head);

    const body = document.createElement('div');
    body.className = 'hw-body';
    body.textContent = hw.text;
    item.appendChild(body);

    if (hw.attachments && hw.attachments.length) {
      const att = document.createElement('div');
      att.className = 'hw-files';
      att.textContent = '📎 ' + hw.attachments.join(', ');
      item.appendChild(att);
    }

    if (hw.corrected) {
      const fb = document.createElement('div');
      fb.className = 'hw-feedback';
      fb.innerHTML = '<strong>Rückgabe des Dozenten:</strong> ';
      fb.appendChild(document.createTextNode(hw.feedback || '(ohne Kommentar)'));
      const ret = document.createElement('div');
      ret.className = 'hw-when';
      ret.textContent = 'zurückgegeben am ' + hw.returnedAt;
      item.appendChild(fb);
      item.appendChild(ret);
    } else {
      const correctRow = document.createElement('div');
      correctRow.className = 'hw-correct';
      const fbInput = document.createElement('input');
      fbInput.type = 'text';
      fbInput.placeholder = 'Korrektur / Feedback des Dozenten…';
      const correctBtn = document.createElement('button');
      correctBtn.className = 'btn-primary btn-sm';
      correctBtn.textContent = 'Korrigieren & zurückgeben';
      correctBtn.addEventListener('click', () =>
        correctHomework(dozent.id, hw.id, fbInput.value)
      );
      correctRow.appendChild(fbInput);
      correctRow.appendChild(correctBtn);
      item.appendChild(correctRow);
    }

    return item;
  }

  // ===== Ordner 2: Kalender – Tests & Prüfungen =====

  function startClock() {
    const update = () => {
      const clock = document.getElementById('liveClock');
      if (clock) {
        clock.textContent = new Date().toLocaleString('de-DE', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    };
    update();
    setInterval(update, 1000);
  }

  function addExam(dozentId, title, date, time) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    if (!title.trim() || !date) {
      showToast('Bitte Titel und Datum angeben.', true);
      return;
    }
    dozent.exams.push({
      id: uid(),
      title: title.trim(),
      date,
      time: time || '00:00'
    });
    persist();
    render();
  }

  function deleteExam(dozentId, examId) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    dozent.exams = dozent.exams.filter((e) => e.id !== examId);
    persist();
    render();
  }

  function examCountdown(dt) {
    const diff = dt.getTime() - Date.now();
    if (diff < 0) return 'vorbei';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `in ${days} Tag(en), ${hours} Std.`;
    const mins = Math.floor((diff % 3600000) / 60000);
    return `in ${hours} Std. ${mins} Min.`;
  }

  function buildCalendarFolder(dozent) {
    const folder = document.createElement('div');
    folder.className = 'folder calendar-folder';

    const title = document.createElement('h3');
    title.className = 'folder-title';
    title.textContent = '📁 Ordner: Kalender – Tests & Prüfungen';
    folder.appendChild(title);

    const clock = document.createElement('div');
    clock.className = 'live-clock';
    clock.id = 'liveClock';
    folder.appendChild(clock);

    // Eingabe-Bereich
    const addRow = document.createElement('div');
    addRow.className = 'exam-add';
    const examTitle = document.createElement('input');
    examTitle.type = 'text';
    examTitle.placeholder = 'Titel (z. B. Java-Prüfung)';
    const examDate = document.createElement('input');
    examDate.type = 'date';
    const examTime = document.createElement('input');
    examTime.type = 'time';
    const submit = document.createElement('button');
    submit.className = 'btn-primary btn-sm';
    submit.textContent = 'Eintragen';
    submit.addEventListener('click', () =>
      addExam(dozent.id, examTitle.value, examDate.value, examTime.value)
    );
    addRow.appendChild(examTitle);
    addRow.appendChild(examDate);
    addRow.appendChild(examTime);
    addRow.appendChild(submit);
    folder.appendChild(addRow);

    // Liste kommender Tests/Prüfungen
    const list = document.createElement('ul');
    list.className = 'exam-list';
    const sorted = dozent.exams
      .slice()
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    if (!sorted.length) {
      const empty = document.createElement('li');
      empty.className = 'folder-empty';
      empty.textContent = 'Keine Tests oder Prüfungen eingetragen.';
      list.appendChild(empty);
    }

    sorted.forEach((ex) => {
      const dt = new Date(`${ex.date}T${ex.time || '00:00'}`);
      const li = document.createElement('li');
      const past = dt.getTime() < Date.now();
      if (past) li.classList.add('past');

      const info = document.createElement('div');
      info.className = 'exam-info';
      const t = document.createElement('span');
      t.className = 'exam-title';
      t.textContent = ex.title;
      const d = document.createElement('span');
      d.className = 'exam-date';
      d.textContent = isNaN(dt.getTime())
        ? `${ex.date} ${ex.time}`
        : dt.toLocaleString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
      info.appendChild(t);
      info.appendChild(d);

      const cd = document.createElement('span');
      cd.className = 'exam-countdown';
      cd.textContent = isNaN(dt.getTime()) ? '' : examCountdown(dt);

      const del = document.createElement('button');
      del.className = 'icon-btn danger';
      del.textContent = '✕';
      del.title = 'Löschen';
      del.addEventListener('click', () => deleteExam(dozent.id, ex.id));

      li.appendChild(info);
      li.appendChild(cd);
      li.appendChild(del);
      list.appendChild(li);
    });
    folder.appendChild(list);

    return folder;
  }

  function render() {
    renderTabs();
    renderPanel();
    updateMediaButtons();
  }

  // Download-Seite: in Electron über ein eigenes Fenster öffnen (target="_blank"
  // funktioniert dort standardmäßig nicht); im echten Browser normal per Link/Tab.
  const headerDownloadLink = document.querySelector('.header-download-link');
  if (headerDownloadLink && !window.__isBrowserFallback && window.dashboardAPI && window.dashboardAPI.openDownloadPage) {
    headerDownloadLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.dashboardAPI.openDownloadPage();
    });
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

  // Moderation: Melden / Alle stummschalten
  document.getElementById('raiseHandBtn').addEventListener('click', raiseLocalHand);
  document.getElementById('muteAllBtn').addEventListener('click', toggleMuteAll);

  // Teilnehmer, Unterrichts-Chat, Privat-/Gruppenchat
  document.getElementById('addParticipantBtn').addEventListener('click', showAddParticipant);
  document.getElementById('confirmParticipantBtn').addEventListener('click', confirmAddParticipant);
  document.getElementById('cancelParticipantBtn').addEventListener('click', cancelAddParticipant);
  document.getElementById('newParticipantName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddParticipant();
    if (e.key === 'Escape') cancelAddParticipant();
  });
  document.getElementById('lessonChatSend').addEventListener('click', sendLessonMessage);
  document.getElementById('lessonChatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendLessonMessage();
  });
  document.getElementById('pauseBtn').addEventListener('click', enterPause);
  document.getElementById('newGroupBtn').addEventListener('click', startGroupBuilder);
  document.getElementById('createGroupBtn').addEventListener('click', createGroup);
  document.getElementById('cancelGroupBtn').addEventListener('click', cancelGroupBuilder);

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

  // PowerPoint-Präsentation teilen
  document.getElementById('cancelPresent').addEventListener('click', closePresentModal);
  document.getElementById('confirmPresent').addEventListener('click', confirmPresent);
  document.getElementById('presenterNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmPresent();
    if (e.key === 'Escape') closePresentModal();
  });

  async function init() {
    const loaded = await window.dashboardAPI.loadData();
    state = loaded && Array.isArray(loaded.dozenten) ? loaded : { dozenten: [] };
    state.dozenten.forEach((d) => {
      if (!Array.isArray(d.chat)) d.chat = [];
      if (!Array.isArray(d.homework)) d.homework = [];
      if (!Array.isArray(d.exams)) d.exams = [];
      if (d.presentation === undefined) d.presentation = null;
    });
    activeDozentId = state.dozenten.length ? state.dozenten[0].id : null;
    setFileShareEnabled(document.getElementById('fileShareToggle').checked);
    startClock();
    render();
  }

  init();
})();
