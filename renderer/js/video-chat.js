// ===== Video-Live-Chat / Unterricht: Teilnehmer, Moderation, Lektions-Chat, Privat-/Gruppenchat =====

let mediaStream = null;
const mediaState = { audioOn: true, videoOn: true };
let activeVideoDozent = null;

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

  // ===== Video-Live-Chat =====

  // Kurzer, stabiler Raum-Code je Dozent, gut vorlesbar/teilbar.
  function shortRoomCode(dozent) {
    const base = (dozent && dozent.id ? dozent.id : 'raum').replace(/[^a-z0-9]/gi, '');
    return (base.slice(-6) || 'RAUM01').toUpperCase();
  }

  async function openVideoChat(dozent) {
    activeVideoDozent = dozent || activeVideoDozent;
    const overlay = document.getElementById('videoOverlay');
    const title = document.getElementById('videoChatTitle');
    const dozentName = activeVideoDozent ? activeVideoDozent.name : 'Dozent';
    title.textContent = `Video-Live-Chat – Unterricht bei ${dozentName}`;
    overlay.classList.add('visible');

    // Server-Adresse (zuletzt verwendet) und Raum-Code vorschlagen, ohne eine bestehende
    // Verbindung oder eine bereits begonnene Eingabe zu überschreiben.
    if (!roomClient.connected) {
      const serverInput = document.getElementById('roomServerInput');
      const roomInput = document.getElementById('roomCodeInput');
      const rememberedServer = localStorage.getItem('itschulung-room-server');
      if (rememberedServer && !serverInput.value) serverInput.value = rememberedServer;
      if (!roomInput.value && activeVideoDozent) roomInput.value = shortRoomCode(activeVideoDozent);
    }
    updateRoomCodeDisplay();

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
    disconnectFromRoom();
  }

  // ===== Netzwerk: echter Mehrgeräte-Video-Chat über den Signaling-Server =====
  // Ohne Verbindung bleibt der Video-Chat wie bisher rein lokal (keine Regression).
  // Verbunden werden echte Teilnehmer auf anderen Geräten automatisch als Teilnehmer
  // ergänzt (mit echtem WebRTC-Audio/Video), zusätzlich zu evtl. manuell hinzugefügten
  // lokalen Platzhalter-Teilnehmern.

  function updateRoomStatusUI(connected) {
    const status = document.getElementById('roomStatus');
    const connectBtn = document.getElementById('roomConnectBtn');
    const disconnectBtn = document.getElementById('roomDisconnectBtn');
    if (!status) return;
    if (connected) {
      status.textContent = `🟢 Verbunden (Raum „${roomClient.roomCode}")`;
      status.classList.add('connected');
      connectBtn.hidden = true;
      disconnectBtn.hidden = false;
    } else {
      status.textContent = '🔌 Nicht verbunden (nur lokale Ansicht)';
      status.classList.remove('connected');
      connectBtn.hidden = false;
      disconnectBtn.hidden = true;
    }
    updateRoomCodeDisplay();
  }

  // Zeigt den aktuell im Eingabefeld stehenden (oder tatsächlich verbundenen) Raum-Code
  // groß und gut lesbar an, damit der Dozent ihn mündlich an Teilnehmer weitergeben kann.
  function updateRoomCodeDisplay() {
    const big = document.getElementById('roomCodeBig');
    if (!big) return;
    const code = roomClient.connected
      ? roomClient.roomCode
      : document.getElementById('roomCodeInput').value.trim();
    big.textContent = code || '–';
  }

  function copyRoomCode() {
    const code = document.getElementById('roomCodeBig').textContent;
    if (!code || code === '–') return;
    navigator.clipboard.writeText(code).then(
      () => showToast(`Raum-Code „${code}" kopiert.`),
      () => showToast('Kopieren nicht möglich – Code manuell markieren.', true)
    );
  }

  async function connectToRoom() {
    const serverUrl = document.getElementById('roomServerInput').value.trim();
    const roomCode = document.getElementById('roomCodeInput').value.trim() || (activeVideoDozent && activeVideoDozent.name) || 'default';
    if (!serverUrl) {
      showToast('Bitte eine Server-Adresse eingeben (z. B. ws://localhost:8787).', true);
      return;
    }
    const myName = activeVideoDozent && participants.find((p) => p.isLocal)
      ? participants.find((p) => p.isLocal).name
      : 'Ich';

    roomClient.onPeerJoined = (peerId, name) => {
      if (!participants.some((p) => p.id === peerId)) {
        participants.push({ id: peerId, name, isLocal: false, isRemote: true, audioOn: true, videoOn: true });
      }
      renderParticipants();
      if (groupBuilderActive) renderGroupMembers();
      showToast(`${name} ist dem Raum beigetreten.`);
    };
    roomClient.onPeerLeft = (peerId) => {
      const p = participants.find((x) => x.id === peerId);
      removeParticipant(peerId);
      if (p) showToast(`${p.name} hat den Raum verlassen.`);
    };
    roomClient.onRemoteStream = (peerId, stream) => {
      const p = participants.find((x) => x.id === peerId);
      if (p) p.stream = stream;
      renderParticipants();
    };
    roomClient.onBroadcast = handleRoomBroadcast;
    roomClient.onConnectionChange = updateRoomStatusUI;
    roomClient.onDataFull = handleDataFull;

    try {
      await roomClient.connect(serverUrl, roomCode, myName, mediaStream);
      localStorage.setItem('itschulung-room-server', serverUrl);
      showToast(`Mit Raum „${roomCode}" verbunden.`);
    } catch (err) {
      showToast('Verbindung zum Server fehlgeschlagen: ' + err.message, true);
    }
  }

  // Empfängt den serverweiten Dozenten-Datenstand (Listen, Hausaufgaben, Kalender, Chat)
  // und übernimmt ihn lokal. "Letzter Stand gewinnt" – kein Konfliktmanagement für
  // gleichzeitige Änderungen auf mehreren Geräten.
  function handleDataFull(receivedState) {
    if (receivedState === null) {
      // Server hat noch keine Daten gespeichert – unser aktueller Stand wird zur Quelle.
      roomClient.pushData(state);
      return;
    }
    state = normalizeState(receivedState);
    if (!findDozent(activeDozentId)) {
      activeDozentId = state.dozenten.length ? state.dozenten[0].id : null;
    }
    window.dashboardAPI.saveData(state); // lokal übernehmen, ohne den Server erneut anzustoßen
    render();
    showToast('Dozenten-Daten mit dem Server synchronisiert.');
  }

  function disconnectFromRoom() {
    if (!roomClient.connected) return;
    // Echte Netzwerk-Teilnehmer aus der lokalen Ansicht entfernen, lokale Platzhalter bleiben.
    participants = participants.filter((p) => !p.isRemote);
    roomClient.disconnect();
    updateRoomStatusUI(false);
    renderParticipants();
  }

  function handleRoomBroadcast(fromPeerId, payload) {
    if (payload.kind === 'lesson-chat') {
      lessonChat.push(payload.entry);
      renderLessonChat();
      return;
    }

    if (payload.kind === 'mute-all') {
      allMuted = payload.allMuted;
      setMuteAllButtonLabel();
      mediaState.audioOn = !allMuted;
      applyMediaState();
      const me = participants.find((p) => p.id === LOCAL_ID);
      if (me) {
        me.audioOn = !allMuted;
        if (!allMuted) me.handRaised = false;
      }
      renderParticipants();
      showToast(allMuted ? 'Der Dozent hat alle stummgeschaltet.' : 'Stummschaltung aufgehoben.');
      return;
    }

    if (payload.kind === 'freischalten' && payload.targetPeerId === roomClient.peerId) {
      mediaState.audioOn = true;
      applyMediaState();
      const me = participants.find((p) => p.id === LOCAL_ID);
      if (me) {
        me.audioOn = true;
        me.handRaised = false;
      }
      renderParticipants();
      showToast('Du wurdest freigeschaltet und kannst jetzt sprechen.');
      return;
    }

    if (payload.kind === 'hand-raise') {
      const p = participants.find((x) => x.id === fromPeerId);
      if (p) {
        p.handRaised = payload.raised;
        renderParticipants();
      }
      return;
    }

    if (payload.kind === 'presentation-start' || payload.kind === 'presentation-stop') {
      const dozent =
        findDozent(payload.dozentId) ||
        (activeVideoDozent && activeVideoDozent.id === payload.dozentId ? activeVideoDozent : null);
      if (!dozent) return;
      dozent.presentation =
        payload.kind === 'presentation-start'
          ? { name: payload.name, presenter: payload.presenter, time: payload.time }
          : null;
      render();
      updateLessonPresentationLabel(dozent);
      return;
    }
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
      } else if (p.isRemote && p.stream) {
        // Echter Video/Audio-Stream eines anderen Geräts (WebRTC, Peer-zu-Peer)
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = p.stream;
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
    if (roomClient.connected) {
      roomClient.broadcast({ kind: 'mute-all', allMuted });
    }
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
    if (id === LOCAL_ID && roomClient.connected) {
      roomClient.broadcast({ kind: 'hand-raise', raised: p.handRaised });
    }
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
    if (p.isRemote && roomClient.connected && roomClient.peers.has(id)) {
      roomClient.broadcast({ kind: 'freischalten', targetPeerId: id });
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
    const fullEntry = Object.assign(
      {
        id: uid(),
        author: 'Ich',
        time: new Date().toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit'
        })
      },
      entry
    );
    lessonChat.push(fullEntry);
    renderLessonChat();
    if (roomClient.connected) {
      roomClient.broadcast({ kind: 'lesson-chat', entry: fullEntry });
    }
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

