(() => {
  const NOTE_FREQS = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25
  };

  const VOCAL_STYLE_NAMES = {
    gesang: 'Gesang', woerter: 'Einzelne Wörter', chor: 'Chor', rapsoul: 'Rap/Soul',
    house: 'House/Electro', jazz: 'Jazz', pop: 'Pop', hiphop: 'Hip Hop'
  };
  const GUITAR_STYLE_NAMES = { akustik: 'Akustik', electric: 'E-Gitarre' };
  const SYNTH_STYLE_NAMES = { lead: 'Lead', pad: 'Pad' };
  const BASE_LABELS = { piano: 'Piano', sax: 'Saxophon', bass: 'Bass', strings: 'Streicher', brass: 'Bläser' };

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const genId = () => `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // Wandelt eine Aufnahme bei Bedarf nach WAV (verlustfrei) oder MP3 (fuer
  // unterwegs) um, sonst bleibt es beim kompakten WebM-Original.
  async function prepareExport(blob, format) {
    if (format === 'wav') {
      return { blob: await AudioEngine.blobToWav(blob), ext: 'wav' };
    }
    if (format === 'mp3') {
      return { blob: await AudioEngine.blobToMp3(blob), ext: 'mp3' };
    }
    return { blob, ext: 'webm' };
  }

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
  const mixListenBtn = document.getElementById('mix-listen-btn');
  const mixRecordBtn = document.getElementById('mix-record-btn');
  const mixStatusEl = document.getElementById('mix-status');
  const mixSavePanel = document.getElementById('mix-save-panel');
  const mixNameEl = document.getElementById('mix-name');
  const mixFormatEl = document.getElementById('mix-format');

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

  // mode: 'listen' spielt nur ab, 'record' spielt ab UND nimmt die Wiedergabe
  // fuer den Save-Panel gleichzeitig auf - zwei getrennte Optionen statt einer
  // kombinierten Schaltflaeche.
  async function startMix(mode) {
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
    let recorder = null;
    if (mode === 'record') {
      recorder = AudioEngine.createRecorder(ctx, masterGain);
      recorder.start();
    }

    const style = mixStyleEl.value;
    const crossfade = parseFloat(mixCrossfadeEl.value);
    const { sources, duration } = Mixer.schedule(ctx, masterGain, buffers, style, crossfade);

    mixState = { sources, recorder, masterGain, timer: null };
    mixListenBtn.textContent = mode === 'listen' ? '■ Stop' : '▶ Anhören';
    mixRecordBtn.textContent = mode === 'record' ? '■ Stop' : '⏺ Aufnehmen';
    setMixStatus(mode === 'record' ? 'Wird abgespielt & aufgenommen…' : 'Wird abgespielt…');
    mixState.timer = setTimeout(() => finishMix(), Math.max(300, duration * 1000 + 500));
  }

  async function finishMix() {
    if (!mixState) return;
    const state = mixState;
    mixState = null;
    clearTimeout(state.timer);
    Mixer.stopAll(state.sources);
    const blob = state.recorder ? await state.recorder.stop() : null;
    state.masterGain.disconnect();
    mixListenBtn.textContent = '▶ Anhören';
    mixRecordBtn.textContent = '⏺ Aufnehmen';
    if (blob) {
      setMixStatus('Vorschau bereit zum Speichern.');
      mixBlob = blob;
      mixSavePanel.classList.remove('hidden');
    } else {
      setMixStatus('');
    }
  }

  mixListenBtn.addEventListener('click', () => {
    if (mixState) finishMix();
    else startMix('listen');
  });

  mixRecordBtn.addEventListener('click', () => {
    if (mixState) finishMix();
    else startMix('record');
  });

  function resetMixSavePanel() {
    mixBlob = null;
    mixSavePanel.classList.add('hidden');
    mixNameEl.value = '';
    setMixStatus('');
  }

  document.getElementById('mix-save-internal').addEventListener('click', async () => {
    if (!mixBlob) return;
    const { blob: outBlob, ext } = await prepareExport(mixBlob, mixFormatEl.value);
    const bytes = new Uint8Array(await outBlob.arrayBuffer());
    const name = mixNameEl.value || 'Mein automatischer Mix';
    currentLibrary = await window.musicHeaven.saveToLibrary({ name, type: 'mix', ext, bytes });
    renderLibrary(currentLibrary);
    showToast('Mix in Music Heaven gespeichert.');
    resetMixSavePanel();
  });

  document.getElementById('mix-save-external').addEventListener('click', async () => {
    if (!mixBlob) return;
    const { blob: outBlob, ext } = await prepareExport(mixBlob, mixFormatEl.value);
    const bytes = new Uint8Array(await outBlob.arrayBuffer());
    const name = mixNameEl.value || 'music-heaven-mix';
    const result = await window.musicHeaven.saveExternal({ name, ext, bytes });
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
  const seqMasterEl = document.getElementById('seq-master');
  const seqMasterValueEl = document.getElementById('seq-master-value');
  const seqBarsEl = document.getElementById('seq-bars');
  const seqResetBtn = document.getElementById('seq-reset');
  const seqListenBtn = document.getElementById('seq-listen-btn');
  const seqRecordBtn = document.getElementById('seq-record-btn');
  const seqStatusEl = document.getElementById('seq-status');
  const seqSavePanel = document.getElementById('seq-save-panel');
  const seqNameEl = document.getElementById('seq-name');
  const seqFormatEl = document.getElementById('seq-format');

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

  document.querySelectorAll('.pad[data-voice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ctx = AudioEngine.getCtx();
      AudioEngine.triggerVoice(btn.dataset.voice, ctx.destination, ctx.currentTime);
    });
  });

  let vocalStyle = 'gesang';
  const vocalGroup = document.querySelector('.equipment-group[data-melodic="vocal"]');

  vocalGroup.querySelectorAll('.pad[data-vocal-style]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vocalStyle = btn.dataset.vocalStyle;
      vocalGroup.querySelectorAll('.pad[data-vocal-style]').forEach((b) => {
        const isSelected = b === btn;
        b.classList.toggle('selected', isSelected);
        b.setAttribute('aria-pressed', String(isSelected));
      });
      const note = vocalGroup.querySelector('.note-select').value;
      const ctx = AudioEngine.getCtx();
      AudioEngine.triggerVoice(`vocal-${vocalStyle}`, ctx.destination, ctx.currentTime, NOTE_FREQS[note]);
    });
  });

  // Generischer Stil-Umschalter fuer Equipment-Gruppen mit mehreren Klangvarianten
  // (aktuell Gitarre: Akustik/E-Gitarre, Synth: Lead/Pad) - analog zu Vocals oben.
  function createStyleGroup(base, defaultStyle) {
    const state = { style: defaultStyle };
    const group = document.querySelector(`.equipment-group[data-melodic="${base}"]`);
    group.querySelectorAll('.pad[data-style]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.style = btn.dataset.style;
        group.querySelectorAll('.pad[data-style]').forEach((b) => {
          const isSelected = b === btn;
          b.classList.toggle('selected', isSelected);
          b.setAttribute('aria-pressed', String(isSelected));
        });
        const note = group.querySelector('.note-select').value;
        const ctx = AudioEngine.getCtx();
        AudioEngine.triggerVoice(`${base}-${state.style}`, ctx.destination, ctx.currentTime, NOTE_FREQS[note]);
      });
    });
    return state;
  }

  const guitarState = createStyleGroup('guitar', 'akustik');
  const synthState = createStyleGroup('synth', 'lead');
  const STYLE_GETTERS = { vocal: () => vocalStyle, guitar: () => guitarState.style, synth: () => synthState.style };

  document.querySelectorAll('.equipment-group[data-melodic] .note-select').forEach((select) => {
    const group = select.closest('.equipment-group');
    const baseVoice = group.dataset.melodic;
    select.addEventListener('change', () => {
      const ctx = AudioEngine.getCtx();
      const voice = STYLE_GETTERS[baseVoice] ? `${baseVoice}-${STYLE_GETTERS[baseVoice]()}` : baseVoice;
      AudioEngine.triggerVoice(voice, ctx.destination, ctx.currentTime, NOTE_FREQS[select.value]);
    });
  });

  let seqTracks = [];
  let seqStepCount = Sequencer.DEFAULT_STEPS;

  const FIXED_GROUPS = {
    drums: [['kick', 'Kick'], ['snare', 'Snare'], ['hihat', 'Hi-Hat'], ['openhat', 'Open Hat'], ['clap', 'Clap']],
    percussion: [['conga', 'Conga'], ['bongo', 'Bongo'], ['shaker', 'Shaker'], ['tabla', 'Tabla'], ['cajon', 'Cajón']],
    efx: [['riser', 'Riser'], ['downlifter', 'Downlifter'], ['impact', 'Impact'], ['noisesweep', 'Noise Sweep'], ['reversecymbal', 'Reverse Cymbal']],
    loops: [['drumloop', 'Drum Loop'], ['bassloop', 'Bass Loop'], ['percloop', 'Perc Loop'], ['arploop', 'Arp Loop']],
    scratch: [
      ['scratchbaby', 'Baby Scratch'], ['scratchchirp', 'Chirp Scratch'], ['scratchtransformer', 'Transformer'],
      ['scratchcrab', 'Crab Scratch'], ['scratchflare', 'Flare Scratch'], ['scratchtear', 'Tear Scratch']
    ]
  };
  const FIXED_GROUP_NAMES = { drums: 'Drums', percussion: 'Percussion/World', efx: 'EFX', loops: 'Loops', scratch: 'Scratch' };
  const addedFixedGroups = new Set();

  document.querySelectorAll('[data-add-fixed]').forEach((btn) => {
    const key = btn.dataset.addFixed;
    btn.addEventListener('click', () => {
      if (addedFixedGroups.has(key)) {
        showToast(`${FIXED_GROUP_NAMES[key]} sind bereits in deinem Musikstück.`, true);
        return;
      }
      addedFixedGroups.add(key);
      FIXED_GROUPS[key].forEach(([voice, label]) => seqTracks.push(Sequencer.createTrack(genId(), voice, null, label, seqStepCount)));
      renderSeqGrid();
      saveDraft();
    });
  });

  document.querySelectorAll('[data-add-melodic]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const base = btn.dataset.addMelodic;
      const group = btn.closest('.equipment-group');
      const note = group.querySelector('.note-select').value;
      let voice = base;
      let label = `${BASE_LABELS[base] || capitalize(base)} ${note}`;
      if (base === 'vocal') {
        voice = `vocal-${vocalStyle}`;
        label = `Vocals – ${VOCAL_STYLE_NAMES[vocalStyle]} (${note})`;
      } else if (base === 'guitar') {
        voice = `guitar-${guitarState.style}`;
        label = `Gitarre – ${GUITAR_STYLE_NAMES[guitarState.style]} (${note})`;
      } else if (base === 'synth') {
        voice = `synth-${synthState.style}`;
        label = `Synth – ${SYNTH_STYLE_NAMES[synthState.style]} (${note})`;
      }
      seqTracks.push(Sequencer.createTrack(genId(), voice, NOTE_FREQS[note], label, seqStepCount));
      renderSeqGrid();
      saveDraft();
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
          <span class="label-text">${escapeHtml(track.label)}</span>
          <span class="seq-row-controls">
            <button class="mini-btn mute${track.muted ? ' active' : ''}" data-mute="${track.id}" title="Stummschalten">M</button>
            <button class="mini-btn solo${track.solo ? ' active' : ''}" data-solo="${track.id}" title="Solo">S</button>
            <button class="remove-track" data-remove="${track.id}" title="Entfernen">✕</button>
          </span>
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
      Object.entries(FIXED_GROUPS).forEach(([key, defs]) => {
        const voices = defs.map(([voice]) => voice);
        if (!seqTracks.some((t) => voices.includes(t.voice))) addedFixedGroups.delete(key);
      });
      renderSeqGrid();
      saveDraft();
      return;
    }
    const muteId = e.target.dataset.mute;
    if (muteId) {
      const track = seqTracks.find((t) => t.id === muteId);
      if (track) { track.muted = !track.muted; renderSeqGrid(); saveDraft(); }
      return;
    }
    const soloId = e.target.dataset.solo;
    if (soloId) {
      const track = seqTracks.find((t) => t.id === soloId);
      if (track) { track.solo = !track.solo; renderSeqGrid(); saveDraft(); }
      return;
    }
    const trackId = e.target.dataset.track;
    const step = e.target.dataset.step;
    if (trackId && step !== undefined) {
      const track = seqTracks.find((t) => t.id === trackId);
      if (track) {
        track.steps[step] = !track.steps[step];
        e.target.classList.toggle('on', track.steps[step]);
        saveDraft();
      }
    }
  });

  seqBpmEl.addEventListener('input', () => { seqBpmValueEl.textContent = seqBpmEl.value; saveDraft(); });

  seqMasterEl.addEventListener('input', () => {
    seqMasterValueEl.textContent = seqMasterEl.value;
    saveDraft();
  });

  seqLoopsEl.addEventListener('change', saveDraft);

  seqBarsEl.addEventListener('change', () => {
    const newStepCount = seqBarsEl.value === '2' ? 32 : 16;
    seqTracks.forEach((track) => Sequencer.resizeTrack(track, newStepCount));
    seqStepCount = newStepCount;
    renderSeqGrid();
    saveDraft();
  });

  seqResetBtn.addEventListener('click', () => {
    if (!seqTracks.length) return;
    if (!window.confirm('Wirklich das komplette Muster zurücksetzen? Das kann nicht rückgängig gemacht werden.')) return;
    seqTracks = [];
    addedFixedGroups.clear();
    renderSeqGrid();
    saveDraft();
    showToast('Muster zurückgesetzt.');
  });

  function highlightStep(step) {
    document.querySelectorAll('.seq-cell.playing').forEach((el) => el.classList.remove('playing'));
    if (step >= 0) {
      document.querySelectorAll(`.seq-cell[data-step="${step}"]`).forEach((el) => el.classList.add('playing'));
    }
  }

  let seqState = null;
  let seqBlob = null;

  // mode: 'listen' spielt nur ab, 'record' spielt ab UND nimmt die Wiedergabe
  // fuer den Save-Panel gleichzeitig auf - zwei getrennte Optionen statt einer
  // kombinierten Schaltflaeche.
  async function startSeq(mode) {
    if (!seqTracks.length || !seqTracks.some((t) => t.steps.some(Boolean))) {
      showToast('Bitte zuerst Equipment-Spuren hinzufügen und Steps aktivieren.', true);
      return;
    }
    const ctx = AudioEngine.getCtx();
    const masterGain = ctx.createGain();
    masterGain.gain.value = parseInt(seqMasterEl.value, 10) / 100;
    masterGain.connect(ctx.destination);
    let recorder = null;
    if (mode === 'record') {
      recorder = AudioEngine.createRecorder(ctx, masterGain);
      recorder.start();
    }

    const bpm = parseInt(seqBpmEl.value, 10);
    const loops = parseInt(seqLoopsEl.value, 10);
    const { cancel } = Sequencer.play(ctx, masterGain, seqTracks, bpm, loops, seqStepCount, (step, done) => {
      if (done) setTimeout(() => finishSeq(), 1000);
      else highlightStep(step);
    });

    seqState = { masterGain, recorder, cancel };
    seqListenBtn.textContent = mode === 'listen' ? '■ Stop' : '▶ Anhören';
    seqRecordBtn.textContent = mode === 'record' ? '■ Stop' : '⏺ Aufnehmen';
    setSeqStatus(mode === 'record' ? 'Wird abgespielt & aufgenommen…' : 'Wird abgespielt…');
  }

  async function finishSeq() {
    if (!seqState) return;
    const state = seqState;
    seqState = null;
    state.cancel();
    highlightStep(-1);
    const blob = state.recorder ? await state.recorder.stop() : null;
    state.masterGain.disconnect();
    seqListenBtn.textContent = '▶ Anhören';
    seqRecordBtn.textContent = '⏺ Aufnehmen';
    if (blob) {
      setSeqStatus('Vorschau bereit zum Speichern.');
      seqBlob = blob;
      seqSavePanel.classList.remove('hidden');
    } else {
      setSeqStatus('');
    }
  }

  seqListenBtn.addEventListener('click', () => {
    if (seqState) finishSeq();
    else startSeq('listen');
  });

  seqRecordBtn.addEventListener('click', () => {
    if (seqState) finishSeq();
    else startSeq('record');
  });

  function resetSeqSavePanel() {
    seqBlob = null;
    seqSavePanel.classList.add('hidden');
    seqNameEl.value = '';
    setSeqStatus('');
  }

  document.getElementById('seq-save-internal').addEventListener('click', async () => {
    if (!seqBlob) return;
    const { blob: outBlob, ext } = await prepareExport(seqBlob, seqFormatEl.value);
    const bytes = new Uint8Array(await outBlob.arrayBuffer());
    const name = seqNameEl.value || 'Mein Musikstück';
    currentLibrary = await window.musicHeaven.saveToLibrary({ name, type: 'creation', ext, bytes });
    renderLibrary(currentLibrary);
    showToast('Musikstück in Music Heaven gespeichert.');
    resetSeqSavePanel();
  });

  document.getElementById('seq-save-external').addEventListener('click', async () => {
    if (!seqBlob) return;
    const { blob: outBlob, ext } = await prepareExport(seqBlob, seqFormatEl.value);
    const bytes = new Uint8Array(await outBlob.arrayBuffer());
    const name = seqNameEl.value || 'music-heaven-track';
    const result = await window.musicHeaven.saveExternal({ name, ext, bytes });
    if (result.ok) {
      showToast(`Extern gespeichert: ${result.path}`);
      resetSeqSavePanel();
    }
  });

  document.getElementById('seq-discard').addEventListener('click', resetSeqSavePanel);

  // ---- Pattern-Entwurf: bleibt beim Neuladen erhalten (localStorage) ----
  const DRAFT_KEY = 'music-heaven-sequencer-draft';

  function saveDraft() {
    try {
      const draft = {
        version: 1,
        bpm: parseInt(seqBpmEl.value, 10),
        loops: parseInt(seqLoopsEl.value, 10),
        stepCount: seqStepCount,
        masterVolume: parseInt(seqMasterEl.value, 10),
        tracks: seqTracks.map((t) => ({
          voice: t.voice, note: t.note, label: t.label, steps: t.steps, muted: t.muted, solo: t.solo
        }))
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (err) { /* z. B. Speicher voll oder localStorage gesperrt - Entwurf einfach nicht sichern */ }
  }

  function loadDraft() {
    let draft;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      draft = JSON.parse(raw);
    } catch (err) { return; }
    if (!draft || !Array.isArray(draft.tracks) || !draft.tracks.length) return;

    seqStepCount = draft.stepCount === 32 ? 32 : 16;
    seqBarsEl.value = String(seqStepCount === 32 ? 2 : 1);

    seqTracks = draft.tracks.map((t) => {
      const track = Sequencer.createTrack(genId(), t.voice, t.note, t.label, seqStepCount);
      if (Array.isArray(t.steps)) {
        for (let i = 0; i < seqStepCount; i++) track.steps[i] = !!t.steps[i];
      }
      track.muted = !!t.muted;
      track.solo = !!t.solo;
      return track;
    });

    addedFixedGroups.clear();
    Object.entries(FIXED_GROUPS).forEach(([key, defs]) => {
      const voices = defs.map(([voice]) => voice);
      if (seqTracks.some((t) => voices.includes(t.voice))) addedFixedGroups.add(key);
    });

    if (draft.bpm) {
      seqBpmEl.value = String(draft.bpm);
      seqBpmValueEl.textContent = String(draft.bpm);
    }
    if (draft.loops) seqLoopsEl.value = String(draft.loops);
    if (draft.masterVolume != null) {
      seqMasterEl.value = String(draft.masterVolume);
      seqMasterValueEl.textContent = String(draft.masterVolume);
    }

    renderSeqGrid();
  }

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

  // =====================================================================
  // Globale Werkzeugleiste (immer sichtbar, unabhängig vom aktiven Ordner)
  // =====================================================================
  const globalListenBtn = document.getElementById('global-listen-btn');
  const globalRecordBtn = document.getElementById('global-record-btn');
  const globalSaveBtn = document.getElementById('global-save-btn');
  const globalSaveAsBtn = document.getElementById('global-save-as-btn');
  const globalOpenBtn = document.getElementById('global-open-btn');
  const globalToolbarStatusEl = document.getElementById('global-toolbar-status');

  function activeOrdner() {
    return document.getElementById('tab-create').classList.contains('active') ? 'create' : 'upload';
  }

  function syncGlobalLabels() {
    const isCreate = activeOrdner() === 'create';
    globalListenBtn.textContent = isCreate ? seqListenBtn.textContent : mixListenBtn.textContent;
    globalRecordBtn.textContent = isCreate ? seqRecordBtn.textContent : mixRecordBtn.textContent;
    globalToolbarStatusEl.textContent = isCreate ? seqStatusEl.textContent : mixStatusEl.textContent;
  }

  [mixListenBtn, mixRecordBtn, seqListenBtn, seqRecordBtn, mixStatusEl, seqStatusEl].forEach((el) => {
    new MutationObserver(syncGlobalLabels).observe(el, { characterData: true, childList: true, subtree: true });
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', syncGlobalLabels);
  });
  syncGlobalLabels();

  globalListenBtn.addEventListener('click', () => {
    const target = activeOrdner() === 'create' ? seqListenBtn : mixListenBtn;
    target.click();
  });

  globalRecordBtn.addEventListener('click', () => {
    const target = activeOrdner() === 'create' ? seqRecordBtn : mixRecordBtn;
    target.click();
  });

  globalSaveBtn.addEventListener('click', () => {
    if (activeOrdner() === 'create') {
      if (!seqBlob) { showToast('Bitte zuerst aufnehmen.', true); return; }
      document.getElementById('seq-save-internal').click();
    } else {
      if (!mixBlob) { showToast('Bitte zuerst aufnehmen.', true); return; }
      document.getElementById('mix-save-internal').click();
    }
  });

  globalSaveAsBtn.addEventListener('click', () => {
    if (activeOrdner() === 'create') {
      if (!seqBlob) { showToast('Bitte zuerst aufnehmen.', true); return; }
      document.getElementById('seq-save-external').click();
    } else {
      if (!mixBlob) { showToast('Bitte zuerst aufnehmen.', true); return; }
      document.getElementById('mix-save-external').click();
    }
  });

  globalOpenBtn.addEventListener('click', async () => {
    const result = await window.musicHeaven.openLibraryFolder();
    if (result && result.ok) {
      showToast('Ordner mit gespeicherter Musik geöffnet.');
    } else if (result && result.browserFallback) {
      document.querySelector('.library-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
      showToast('Im Browser: Bibliothek unten – zum Herunterladen „Speichern unter…“ nutzen.');
    } else {
      showToast('Ordner konnte nicht geöffnet werden.', true);
    }
  });

  // ---- Init ----
  refreshUploads();
  window.musicHeaven.listLibrary().then(renderLibrary);
  loadDraft();
})();
