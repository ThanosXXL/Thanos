(() => {
  const NOTE_FREQS = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25
  };

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const genId = () => `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // ---- Toast ----
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function showToast(message, isError) {
    toastEl.textContent = message;
    toastEl.classList.toggle('error', !!isError);
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 3200);
  }

  // ---- Shared preview <audio> for single-file listening ----
  const previewAudio = new Audio();
  function playPreviewUrl(url) {
    previewAudio.pause();
    previewAudio.src = url;
    previewAudio.currentTime = 0;
    previewAudio.play().catch(() => {});
  }

  // ---- Tabs ----
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // =====================================================================
  // ORDNER 1: Hochgeladene Musik + automatisches Mixen
  // =====================================================================
  let uploads = [];
  const bufferCache = new Map();

  const uploadListEl = document.getElementById('upload-list');
  const mixTrackAEl = document.getElementById('mix-track-a');
  const mixTrackBEl = document.getElementById('mix-track-b');
  const mixWholeLibraryEl = document.getElementById('mix-whole-library');
  const mixStyleEl = document.getElementById('mix-style');
  const mixCrossfadeEl = document.getElementById('mix-crossfade');
  const mixCrossfadeValueEl = document.getElementById('mix-crossfade-value');
  const mixPreviewBtn = document.getElementById('mix-preview-btn');
  const mixStatusEl = document.getElementById('mix-status');
  const mixSavePanel = document.getElementById('mix-save-panel');
  const mixNameEl = document.getElementById('mix-name');

  function setMixStatus(text) { mixStatusEl.textContent = text; }

  async function refreshUploads() {
    uploads = await window.musicHeaven.listUploads();
    renderUploadList();
    populateMixSelects();
  }

  function renderUploadList() {
    uploadListEl.innerHTML = '';
    if (!uploads.length) {
      uploadListEl.innerHTML = '<li class="empty">Noch keine Musik hochgeladen.</li>';
      return;
    }
    uploads.forEach((track) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="track-name">${escapeHtml(track.name)}</span>
        <span class="track-actions">
          <button class="icon-btn" data-play-upload="${track.id}">▶</button>
          <button class="icon-btn" data-del-upload="${track.id}">🗑</button>
        </span>`;
      uploadListEl.appendChild(li);
    });
  }

  uploadListEl.addEventListener('click', async (e) => {
    const playId = e.target.dataset.playUpload;
    const delId = e.target.dataset.delUpload;
    if (playId) {
      const track = uploads.find((t) => t.id === playId);
      if (track) playPreviewUrl(track.url);
    }
    if (delId) {
      bufferCache.delete(delId);
      uploads = await window.musicHeaven.deleteUpload(delId);
      renderUploadList();
      populateMixSelects();
    }
  });

  function populateMixSelects() {
    [mixTrackAEl, mixTrackBEl].forEach((select) => {
      const prev = select.value;
      select.innerHTML = '<option value="">– keiner –</option>';
      uploads.forEach((track) => {
        const opt = document.createElement('option');
        opt.value = track.id;
        opt.textContent = track.name;
        select.appendChild(opt);
      });
      if (uploads.some((t) => t.id === prev)) select.value = prev;
    });
  }

  document.getElementById('btn-upload').addEventListener('click', async () => {
    uploads = await window.musicHeaven.chooseUploads();
    renderUploadList();
    populateMixSelects();
  });

  mixCrossfadeEl.addEventListener('input', () => {
    mixCrossfadeValueEl.textContent = parseFloat(mixCrossfadeEl.value).toFixed(1);
  });

  function getMixSelectionIds() {
    if (mixWholeLibraryEl.checked) return uploads.map((t) => t.id);
    return [mixTrackAEl.value, mixTrackBEl.value].filter(Boolean);
  }

  let mixState = null;
  let mixBlob = null;

  async function startMixPreview() {
    const selectedIds = getMixSelectionIds();
    if (!selectedIds.length) {
      showToast('Bitte mindestens einen Track auswählen.', true);
      return;
    }

    setMixStatus('Lade Audio…');
    const ctx = AudioEngine.getCtx();
    const buffers = [];
    for (const id of selectedIds) {
      const track = uploads.find((t) => t.id === id);
      if (!track) continue;
      if (!bufferCache.has(id)) {
        bufferCache.set(id, await AudioEngine.loadBuffer(track.url));
      }
      buffers.push(bufferCache.get(id));
    }
    if (!buffers.length) { setMixStatus(''); return; }

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    const recorder = AudioEngine.createRecorder(ctx, masterGain);
    recorder.start();

    const style = mixStyleEl.value;
    const crossfade = parseFloat(mixCrossfadeEl.value);
    const { sources, duration } = Mixer.schedule(ctx, masterGain, buffers, style, crossfade);

    mixState = { sources, recorder, masterGain, timer: null };
    mixPreviewBtn.textContent = '■ Stop';
    setMixStatus('Wird abgespielt & aufgenommen…');
    mixState.timer = setTimeout(() => finishMixPreview(), Math.max(300, duration * 1000 + 500));
  }

  async function finishMixPreview() {
    if (!mixState) return;
    const state = mixState;
    mixState = null;
    clearTimeout(state.timer);
    Mixer.stopAll(state.sources);
    const blob = await state.recorder.stop();
    state.masterGain.disconnect();
    mixPreviewBtn.textContent = '▶ Abhören & aufnehmen';
    setMixStatus('Vorschau bereit zum Speichern.');
    mixBlob = blob;
    mixSavePanel.classList.remove('hidden');
  }

  mixPreviewBtn.addEventListener('click', () => {
    if (mixState) finishMixPreview();
    else startMixPreview();
  });

  function resetMixSavePanel() {
    mixBlob = null;
    mixSavePanel.classList.add('hidden');
    mixNameEl.value = '';
    setMixStatus('');
  }

  document.getElementById('mix-save-internal').addEventListener('click', async () => {
    if (!mixBlob) return;
    const bytes = new Uint8Array(await mixBlob.arrayBuffer());
    const name = mixNameEl.value || 'Mein automatischer Mix';
    currentLibrary = await window.musicHeaven.saveToLibrary({ name, type: 'mix', ext: 'webm', bytes });
    renderLibrary(currentLibrary);
    showToast('Mix in Music Heaven gespeichert.');
    resetMixSavePanel();
  });

  document.getElementById('mix-save-external').addEventListener('click', async () => {
    if (!mixBlob) return;
    const bytes = new Uint8Array(await mixBlob.arrayBuffer());
    const name = mixNameEl.value || 'music-heaven-mix';
    const result = await window.musicHeaven.saveExternal({ name, ext: 'webm', bytes });
    if (result.ok) {
      showToast(`Extern gespeichert: ${result.path}`);
      resetMixSavePanel();
    }
  });

  document.getElementById('mix-discard').addEventListener('click', resetMixSavePanel);

  // =====================================================================
  // ORDNER 2: Musikstücke selbst kreieren
  // =====================================================================
  const seqGridEl = document.getElementById('seq-grid');
  const seqBpmEl = document.getElementById('seq-bpm');
  const seqBpmValueEl = document.getElementById('seq-bpm-value');
  const seqLoopsEl = document.getElementById('seq-loops');
  const seqPreviewBtn = document.getElementById('seq-preview-btn');
  const seqStatusEl = document.getElementById('seq-status');
  const seqSavePanel = document.getElementById('seq-save-panel');
  const seqNameEl = document.getElementById('seq-name');

  function setSeqStatus(text) { seqStatusEl.textContent = text; }

  function populateNoteSelects() {
    document.querySelectorAll('.note-select').forEach((select) => {
      Object.keys(NOTE_FREQS).forEach((note) => {
        const opt = document.createElement('option');
        opt.value = note;
        opt.textContent = note;
        select.appendChild(opt);
      });
      select.value = 'C4';
    });
  }
  populateNoteSelects();

  document.querySelectorAll('.pad').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ctx = AudioEngine.getCtx();
      AudioEngine.triggerVoice(btn.dataset.voice, ctx.destination, ctx.currentTime);
    });
  });

  document.querySelectorAll('.equipment-group[data-melodic] .note-select').forEach((select) => {
    const voice = select.closest('.equipment-group').dataset.melodic;
    select.addEventListener('change', () => {
      const ctx = AudioEngine.getCtx();
      AudioEngine.triggerVoice(voice, ctx.destination, ctx.currentTime, NOTE_FREQS[select.value]);
    });
  });

  let seqTracks = [];
  let drumsAdded = false;

  document.querySelector('[data-add-drums]').addEventListener('click', () => {
    if (drumsAdded) {
      showToast('Drums sind bereits in deinem Musikstück.', true);
      return;
    }
    drumsAdded = true;
    [['kick', 'Kick'], ['snare', 'Snare'], ['hihat', 'Hi-Hat'], ['openhat', 'Open Hat'], ['clap', 'Clap']]
      .forEach(([voice, label]) => seqTracks.push(Sequencer.createTrack(genId(), voice, null, label)));
    renderSeqGrid();
  });

  document.querySelectorAll('[data-add-melodic]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const voice = btn.dataset.addMelodic;
      const group = btn.closest('.equipment-group');
      const note = group.querySelector('.note-select').value;
      const label = `${capitalize(voice)} ${note}`;
      seqTracks.push(Sequencer.createTrack(genId(), voice, NOTE_FREQS[note], label));
      renderSeqGrid();
    });
  });

  function renderSeqGrid() {
    if (!seqTracks.length) {
      seqGridEl.innerHTML = '<p class="empty">Füge links Equipment-Spuren hinzu, um dein Musikstück zu bauen.</p>';
      return;
    }
    seqGridEl.innerHTML = seqTracks.map((track) => `
      <div class="seq-row" data-track-id="${track.id}">
        <div class="seq-row-label">
          <span>${escapeHtml(track.label)}</span>
          <button class="remove-track" data-remove="${track.id}">✕</button>
        </div>
        <div class="seq-cells">
          ${track.steps.map((on, i) => `<button class="seq-cell${(i % 4 === 0) ? ' beat' : ''}${on ? ' on' : ''}" data-track="${track.id}" data-step="${i}"></button>`).join('')}
        </div>
      </div>
    `).join('');
  }

  seqGridEl.addEventListener('click', (e) => {
    const removeId = e.target.dataset.remove;
    if (removeId) {
      seqTracks = seqTracks.filter((t) => t.id !== removeId);
      if (!seqTracks.some((t) => ['kick', 'snare', 'hihat', 'openhat', 'clap'].includes(t.voice))) drumsAdded = false;
      renderSeqGrid();
      return;
    }
    const trackId = e.target.dataset.track;
    const step = e.target.dataset.step;
    if (trackId && step !== undefined) {
      const track = seqTracks.find((t) => t.id === trackId);
      if (track) {
        track.steps[step] = !track.steps[step];
        e.target.classList.toggle('on', track.steps[step]);
      }
    }
  });

  seqBpmEl.addEventListener('input', () => { seqBpmValueEl.textContent = seqBpmEl.value; });

  function highlightStep(step) {
    document.querySelectorAll('.seq-cell.playing').forEach((el) => el.classList.remove('playing'));
    if (step >= 0) {
      document.querySelectorAll(`.seq-cell[data-step="${step}"]`).forEach((el) => el.classList.add('playing'));
    }
  }

  let seqState = null;
  let seqBlob = null;

  async function startSeqPreview() {
    if (!seqTracks.length || !seqTracks.some((t) => t.steps.some(Boolean))) {
      showToast('Bitte zuerst Equipment-Spuren hinzufügen und Steps aktivieren.', true);
      return;
    }
    const ctx = AudioEngine.getCtx();
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    const recorder = AudioEngine.createRecorder(ctx, masterGain);
    recorder.start();

    const bpm = parseInt(seqBpmEl.value, 10);
    const loops = parseInt(seqLoopsEl.value, 10);
    const { cancel } = Sequencer.play(ctx, masterGain, seqTracks, bpm, loops, (step, done) => {
      if (done) setTimeout(() => finishSeqPreview(), 1000);
      else highlightStep(step);
    });

    seqState = { masterGain, recorder, cancel };
    seqPreviewBtn.textContent = '■ Stop';
    setSeqStatus('Wird abgespielt & aufgenommen…');
  }

  async function finishSeqPreview() {
    if (!seqState) return;
    const state = seqState;
    seqState = null;
    state.cancel();
    highlightStep(-1);
    const blob = await state.recorder.stop();
    state.masterGain.disconnect();
    seqPreviewBtn.textContent = '▶ Abhören & aufnehmen';
    setSeqStatus('Vorschau bereit zum Speichern.');
    seqBlob = blob;
    seqSavePanel.classList.remove('hidden');
  }

  seqPreviewBtn.addEventListener('click', () => {
    if (seqState) finishSeqPreview();
    else startSeqPreview();
  });

  function resetSeqSavePanel() {
    seqBlob = null;
    seqSavePanel.classList.add('hidden');
    seqNameEl.value = '';
    setSeqStatus('');
  }

  document.getElementById('seq-save-internal').addEventListener('click', async () => {
    if (!seqBlob) return;
    const bytes = new Uint8Array(await seqBlob.arrayBuffer());
    const name = seqNameEl.value || 'Mein Musikstück';
    currentLibrary = await window.musicHeaven.saveToLibrary({ name, type: 'creation', ext: 'webm', bytes });
    renderLibrary(currentLibrary);
    showToast('Musikstück in Music Heaven gespeichert.');
    resetSeqSavePanel();
  });

  document.getElementById('seq-save-external').addEventListener('click', async () => {
    if (!seqBlob) return;
    const bytes = new Uint8Array(await seqBlob.arrayBuffer());
    const name = seqNameEl.value || 'music-heaven-track';
    const result = await window.musicHeaven.saveExternal({ name, ext: 'webm', bytes });
    if (result.ok) {
      showToast(`Extern gespeichert: ${result.path}`);
      resetSeqSavePanel();
    }
  });

  document.getElementById('seq-discard').addEventListener('click', resetSeqSavePanel);

  // =====================================================================
  // Bibliothek (gemeinsam für beide Ordner gespeicherte Ergebnisse)
  // =====================================================================
  const libraryListEl = document.getElementById('library-list');
  let currentLibrary = [];

  function renderLibrary(list) {
    currentLibrary = list;
    libraryListEl.innerHTML = '';
    if (!list.length) {
      libraryListEl.innerHTML = '<li class="empty">Noch nichts gespeichert.</li>';
      return;
    }
    list.forEach((item) => {
      const typeLabel = item.type === 'mix' ? 'Mix' : 'Musikstück';
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="track-name">🎵 ${escapeHtml(item.name)} <span class="hint">(${typeLabel})</span></span>
        <span class="track-actions">
          <button class="icon-btn" data-play-lib="${item.id}">▶</button>
          <button class="icon-btn" data-del-lib="${item.id}">🗑</button>
        </span>`;
      libraryListEl.appendChild(li);
    });
  }

  libraryListEl.addEventListener('click', async (e) => {
    const playId = e.target.dataset.playLib;
    const delId = e.target.dataset.delLib;
    if (playId) {
      const item = currentLibrary.find((i) => i.id === playId);
      if (item) playPreviewUrl(item.url);
    }
    if (delId) {
      currentLibrary = await window.musicHeaven.deleteLibraryItem(delId);
      renderLibrary(currentLibrary);
    }
  });

  // ---- Init ----
  refreshUploads();
  window.musicHeaven.listLibrary().then(renderLibrary);
})();
