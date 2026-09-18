(function () {
  'use strict';

  // VideoWelt UI is an interactive timeline editor: unlike a simple CRUD
  // dashboard, clip dragging/trimming and video playback need direct,
  // targeted DOM/element updates instead of a full teardown-rebuild on
  // every mutation. Structural changes (add/remove/reorder/import) still
  // go through renderAll(); live scrubbing and effect sliders update only
  // the affected pixels/elements for smooth interaction.

  const TRACK_LABEL_OFFSET = 60;

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function clamp(v, min, max) {
    v = Number(v);
    if (isNaN(v)) v = min;
    return Math.min(max, Math.max(min, v));
  }

  function formatTime(sec) {
    sec = Math.max(0, sec || 0);
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function toFileUrl(p) {
    let pathName = String(p).replace(/\\/g, '/');
    if (!pathName.startsWith('/')) pathName = '/' + pathName;
    return 'file://' + encodeURI(pathName);
  }

  const TRANSITION_GROUPS = [
    { label: 'Kein Übergang', options: [{ value: 'none', label: 'Hartschnitt' }] },
    {
      label: 'Überblenden', options: [
        { value: 'fade', label: 'Überblenden' },
        { value: 'fadeblack', label: 'Schwarzblende' },
        { value: 'fadewhite', label: 'Weißblende' },
        { value: 'fadegrays', label: 'Graublende' },
        { value: 'dissolve', label: 'Auflösen' }
      ]
    },
    {
      label: 'Wischen', options: [
        { value: 'wipeleft', label: 'Wischen nach links' },
        { value: 'wiperight', label: 'Wischen nach rechts' },
        { value: 'wipeup', label: 'Wischen nach oben' },
        { value: 'wipedown', label: 'Wischen nach unten' }
      ]
    },
    {
      label: 'Gleiten', options: [
        { value: 'slideleft', label: 'Gleiten nach links' },
        { value: 'slideright', label: 'Gleiten nach rechts' },
        { value: 'slideup', label: 'Gleiten nach oben' },
        { value: 'slidedown', label: 'Gleiten nach unten' }
      ]
    },
    {
      label: 'Weiches Wischen', options: [
        { value: 'smoothleft', label: 'Weich nach links' },
        { value: 'smoothright', label: 'Weich nach rechts' },
        { value: 'smoothup', label: 'Weich nach oben' },
        { value: 'smoothdown', label: 'Weich nach unten' }
      ]
    },
    {
      label: 'Formen', options: [
        { value: 'circleopen', label: 'Kreis öffnen' },
        { value: 'circleclose', label: 'Kreis schließen' },
        { value: 'circlecrop', label: 'Kreis-Zuschnitt' },
        { value: 'rectcrop', label: 'Rechteck-Zuschnitt' }
      ]
    },
    {
      label: 'Öffnen / Schließen', options: [
        { value: 'vertopen', label: 'Vertikal öffnen' },
        { value: 'vertclose', label: 'Vertikal schließen' },
        { value: 'horzopen', label: 'Horizontal öffnen' },
        { value: 'horzclose', label: 'Horizontal schließen' }
      ]
    },
    {
      label: 'Diagonal', options: [
        { value: 'diagtl', label: 'Diagonal oben-links' },
        { value: 'diagtr', label: 'Diagonal oben-rechts' },
        { value: 'diagbl', label: 'Diagonal unten-links' },
        { value: 'diagbr', label: 'Diagonal unten-rechts' }
      ]
    },
    {
      label: 'Spezial', options: [
        { value: 'pixelize', label: 'Verpixeln' },
        { value: 'radial', label: 'Radial' },
        { value: 'hblur', label: 'Bewegungsunschärfe' },
        { value: 'zoomin', label: 'Hineinzoomen' },
        { value: 'squeezeh', label: 'Horizontal quetschen' },
        { value: 'squeezev', label: 'Vertikal quetschen' },
        { value: 'distance', label: 'Distanz-Morph' }
      ]
    }
  ];

  function transitionLabel(type) {
    for (const group of TRANSITION_GROUPS) {
      const found = group.options.find((o) => o.value === type);
      if (found) return found.label;
    }
    return type;
  }

  function defaultEffects() {
    return {
      brightness: 0, contrast: 1, saturation: 1, grayscale: false, sepia: false,
      blur: 0, rotate: 0, speed: 1, fadeIn: 0, fadeOut: 0, muted: false, volume: 1,
      hue: 0, sharpen: 0, vignette: false, flipH: false, flipV: false, smoothSlowmo: false
    };
  }

  function emptyState() {
    return {
      projectName: 'Unbenanntes Projekt',
      mediaLibrary: [],
      timeline: { videoTrack: [], audioTrack: [], textOverlays: [] }
    };
  }

  let state = emptyState();
  let currentProjectPath = null;
  let lastExportPath = null;
  let dirty = false;

  const MAX_HISTORY = 50;
  let undoStack = [];
  let redoStack = [];

  const ui = {
    selection: null,
    playhead: 0,
    playing: false,
    pxPerSecond: 60,
    frontIsA: true,
    activeClipId: null,
    blending: false,
    blendNextClipId: null,
    exportUnsubscribe: null
  };

  const audioElements = new Map();
  const el = {};

  function qs(id) { return document.getElementById(id); }

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheEls();
    bindGlobalEvents();
    updateUndoRedoMenu();
    renderAll();

    setTimeout(() => {
      qs('splash').style.opacity = '0';
      setTimeout(() => {
        qs('splash').classList.add('hidden');
        qs('app').classList.remove('hidden');
      }, 600);
    }, 1500);

    setTimeout(tryReopenLastProject, 1700);
  }

  function cacheEls() {
    el.mediaList = qs('media-list');
    el.timelineEl = qs('timeline');
    el.ruler = qs('ruler');
    el.trackVideoBody = qs('track-video-body');
    el.trackAudioBody = qs('track-audio-body');
    el.trackTextBody = qs('track-text-body');
    el.playheadEl = qs('playhead');
    el.timelineScroll = qs('timeline-scroll');
    el.propsContent = qs('props-content');
    el.videoA = qs('video-a');
    el.videoB = qs('video-b');
    el.fadeOverlay = qs('fade-overlay');
    el.textOverlayLayer = qs('text-overlay-layer');
    el.previewEmpty = qs('preview-empty');
    el.btnPlay = qs('btn-play');
    el.timeDisplay = qs('time-display');
    el.seekBar = qs('seek-bar');
    el.projectNameInput = qs('project-name-display');
    el.saveStateEl = qs('save-state');
    el.exportModal = qs('export-modal');
    el.exportFormat = qs('export-format');
    el.exportResolution = qs('export-resolution');
    el.exportQuality = qs('export-quality');
    el.exportFps = qs('export-fps');
    el.exportProgressWrap = qs('export-progress-wrap');
    el.exportProgressFill = qs('export-progress-fill');
    el.exportProgressLabel = qs('export-progress-label');
    el.startExportBtn = qs('start-export-btn');
    el.exportDoneModal = qs('export-done-modal');
    el.exportDoneText = qs('export-done-text');
    el.menubar = qs('menubar');
    el.menuUndo = qs('menu-undo');
    el.menuRedo = qs('menu-redo');
    el.shortcutsModal = qs('shortcuts-modal');
    el.aboutModal = qs('about-modal');
  }

  function bindGlobalEvents() {
    document.querySelector('.topbar').addEventListener('click', onHeaderClick);
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#menubar')) closeAllMenus();
    });
    document.querySelector('.timeline-toolbar').addEventListener('click', onTimelineToolbarClick);
    el.exportModal.addEventListener('click', onExportModalClick);
    el.exportDoneModal.addEventListener('click', onExportDoneModalClick);
    el.shortcutsModal.addEventListener('click', onSimpleModalClick);
    el.aboutModal.addEventListener('click', onSimpleModalClick);
    el.btnPlay.addEventListener('click', () => { ui.playing ? pause() : play(); });
    el.seekBar.addEventListener('input', () => {
      pause();
      const total = totalProjectDuration();
      seekTo((parseFloat(el.seekBar.value) / 1000) * total);
    });
    el.projectNameInput.addEventListener('change', () => {
      pushHistory();
      state.projectName = el.projectNameInput.value.trim() || 'Unbenanntes Projekt';
      markUnsaved();
    });
    el.timelineScroll.addEventListener('mousedown', onTimelineScrollMouseDown);
    document.addEventListener('keydown', onGlobalKeyDown);
    window.addEventListener('beforeunload', () => { pause(); });
  }

  // ---------- Menu bar / action dispatch ----------

  function closeAllMenus() {
    document.querySelectorAll('.menu.open').forEach((m) => m.classList.remove('open'));
  }

  function toggleMenu(menuEl) {
    const wasOpen = menuEl.classList.contains('open');
    closeAllMenus();
    if (!wasOpen) menuEl.classList.add('open');
  }

  function onHeaderClick(e) {
    const trigger = e.target.closest('.menu-trigger');
    if (trigger) {
      toggleMenu(trigger.parentElement);
      return;
    }
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    closeAllMenus();
    dispatchAction(btn.dataset.action);
  }

  function dispatchAction(action) {
    if (action === 'new-project') newProject();
    else if (action === 'open-project') openProject();
    else if (action === 'save-project') saveProject(false);
    else if (action === 'save-project-as') saveProject(true);
    else if (action === 'reopen-last-project') tryReopenLastProject();
    else if (action === 'show-last-export') showLastExport();
    else if (action === 'export') openExportModal();
    else if (action === 'export-frame') exportCurrentFrame();
    else if (action === 'undo') undo();
    else if (action === 'redo') redo();
    else if (action === 'duplicate-clip') duplicateSelectedClip();
    else if (action === 'loop-sequence') loopSequence();
    else if (action === 'slowmo-sequence') slowmoSequence();
    else if (action === 'delete-clip') deleteSelected();
    else if (action === 'deselect') deselectAll();
    else if (action === 'import-video') importVideos();
    else if (action === 'import-audio') importAudio();
    else if (action === 'import-demo-music') importDemoMusic();
    else if (action === 'import-intro-logo') importIntroLogo();
    else if (action === 'add-text') addTextOverlay();
    else if (action === 'split') splitAtPlayhead();
    else if (action === 'reset-effects') resetSelectedClipEffects();
    else if (action === 'toggle-mute') toggleSelectedClipMute();
    else if (action === 'preset-reset') applyPreset('reset');
    else if (action === 'preset-bw') applyPreset('bw');
    else if (action === 'preset-sepia') applyPreset('sepia');
    else if (action === 'preset-warm') applyPreset('warm');
    else if (action === 'preset-cool') applyPreset('cool');
    else if (action === 'preset-cinematic') applyPreset('cinematic');
    else if (action === 'toggle-vignette') toggleSelectedClipVignette();
    else if (action === 'toggle-flip') toggleSelectedClipFlip();
    else if (action === 'zoom-in') zoomTimeline(1.3);
    else if (action === 'zoom-out') zoomTimeline(1 / 1.3);
    else if (action === 'zoom-reset') { ui.pxPerSecond = 60; renderTimeline(); }
    else if (action === 'show-shortcuts') el.shortcutsModal.classList.remove('hidden');
    else if (action === 'close-shortcuts') el.shortcutsModal.classList.add('hidden');
    else if (action === 'show-about') el.aboutModal.classList.remove('hidden');
    else if (action === 'close-about') el.aboutModal.classList.add('hidden');
  }

  function onSimpleModalClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    dispatchAction(btn.dataset.action);
  }

  function onGlobalKeyDown(e) {
    if (e.code === 'Space' && document.activeElement === document.body) {
      e.preventDefault();
      ui.playing ? pause() : play();
      return;
    }
    if (e.key === 'Escape') {
      closeAllMenus();
      el.shortcutsModal.classList.add('hidden');
      el.aboutModal.classList.add('hidden');
      return;
    }
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    else if (key === 's') { e.preventDefault(); saveProject(false); }
    else if (key === 'd') { e.preventDefault(); duplicateSelectedClip(); }
    else if (key === '+' || key === '=') { e.preventDefault(); zoomTimeline(1.3); }
    else if (key === '-') { e.preventDefault(); zoomTimeline(1 / 1.3); }
  }

  function onTimelineToolbarClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'split') splitAtPlayhead();
    else if (action === 'delete-clip') deleteSelected();
    else if (action === 'zoom-in') zoomTimeline(1.3);
    else if (action === 'zoom-out') zoomTimeline(1 / 1.3);
  }

  function onExportModalClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'cancel-export') closeExportModal();
    else if (btn.dataset.action === 'start-export') startExport();
  }

  function onExportDoneModalClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'close-export-done') el.exportDoneModal.classList.add('hidden');
    else if (btn.dataset.action === 'show-in-folder') {
      if (lastExportPath) window.videoWeltAPI.showItemInFolder(lastExportPath);
    }
  }

  function onTimelineScrollMouseDown(e) {
    if (e.button !== 0) return;
    const bodyEl = e.target.closest('.track-body');
    if (!bodyEl) return;
    const rect = bodyEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < 0) return;
    pause();
    seekTo(x / ui.pxPerSecond);
  }

  // ---------- Project lifecycle ----------

  function markUnsaved() { dirty = true; el.saveStateEl.textContent = 'Nicht gespeichert'; }
  function markSaved() { dirty = false; el.saveStateEl.textContent = 'Gespeichert'; }

  function newProject() {
    if (dirty && !confirm('Neues Projekt starten? Nicht gespeicherte Änderungen gehen verloren.')) return;
    pause();
    state = emptyState();
    currentProjectPath = null;
    ui.selection = null;
    ui.playhead = 0;
    ui.activeClipId = null;
    resetHistory();
    renderAll();
    markSaved();
  }

  async function saveProject(forceDialog) {
    const targetPath = forceDialog ? null : currentProjectPath;
    const result = await window.videoWeltAPI.saveProject(state, targetPath);
    if (result.canceled) return;
    if (result.error) { alert(result.error); return; }
    currentProjectPath = result.path;
    markSaved();
  }

  async function openProject() {
    if (dirty && !confirm('Projekt öffnen? Nicht gespeicherte Änderungen gehen verloren.')) return;
    const result = await window.videoWeltAPI.loadProject();
    if (result.canceled) return;
    if (result.error) { alert(result.error); return; }
    applyLoadedProject(result.data, result.path);
  }

  async function tryReopenLastProject() {
    try {
      const last = await window.videoWeltAPI.getLastProjectPath();
      if (last && confirm('Letztes Projekt weiter bearbeiten?\n' + last)) {
        const result = await window.videoWeltAPI.loadProjectByPath(last);
        if (!result.error) applyLoadedProject(result.data, result.path);
      }
    } catch (err) { /* ignore */ }
  }

  function applyLoadedProject(data, path) {
    pause();
    state = normalizeLoadedState(data);
    currentProjectPath = path;
    ui.selection = null;
    ui.playhead = 0;
    ui.activeClipId = null;
    resetHistory();
    renderAll();
    markSaved();
  }

  function normalizeLoadedState(data) {
    const base = emptyState();
    if (!data) return base;
    return {
      projectName: data.projectName || base.projectName,
      mediaLibrary: Array.isArray(data.mediaLibrary) ? data.mediaLibrary : [],
      timeline: {
        videoTrack: (data.timeline && Array.isArray(data.timeline.videoTrack)) ? data.timeline.videoTrack : [],
        audioTrack: (data.timeline && Array.isArray(data.timeline.audioTrack)) ? data.timeline.audioTrack : [],
        textOverlays: (data.timeline && Array.isArray(data.timeline.textOverlays)) ? data.timeline.textOverlays : []
      }
    };
  }

  // ---------- Media import ----------

  function getMedia(id) { return state.mediaLibrary.find((m) => m.id === id); }

  async function importVideos() {
    const items = await window.videoWeltAPI.importVideos();
    if (items && items.length) {
      state.mediaLibrary.push(...items);
      renderMediaList();
      markUnsaved();
    }
  }

  async function importAudio() {
    const items = await window.videoWeltAPI.importAudio();
    if (items && items.length) {
      state.mediaLibrary.push(...items);
      renderMediaList();
      markUnsaved();
    }
  }

  async function importDemoMusic() {
    const result = await window.videoWeltAPI.importDemoMusic();
    if (result.error) { alert(result.error); return; }
    let media = state.mediaLibrary.find((m) => m.path === result.item.path);
    if (!media) {
      media = result.item;
      state.mediaLibrary.push(media);
    }
    addMediaToTimeline(media);
    const added = state.timeline.audioTrack[state.timeline.audioTrack.length - 1];
    if (added && added.mediaId === media.id) {
      fitAudioToVideoLength(added);
      ui.selection = { type: 'audio', id: added.id };
    }
    markUnsaved();
    renderAll();
  }

  async function importIntroLogo() {
    const result = await window.videoWeltAPI.importIntroLogo();
    if (result.error) { alert(result.error); return; }
    let media = state.mediaLibrary.find((m) => m.path === result.item.path);
    if (!media) {
      media = result.item;
      state.mediaLibrary.push(media);
    }
    pushHistory();
    const clip = {
      id: uid('clip'), mediaId: media.id,
      inPoint: 0, outPoint: media.duration || 1,
      effects: defaultEffects(),
      transitionOut: { type: 'fade', duration: 0.6 }
    };
    state.timeline.videoTrack.unshift(clip);
    ui.selection = { type: 'video', id: clip.id };
    markUnsaved();
    renderAll();
  }

  function addMediaToTimeline(media) {
    pushHistory();
    if (media.hasVideo) {
      const clip = {
        id: uid('clip'), mediaId: media.id,
        inPoint: 0, outPoint: media.duration || 1,
        effects: defaultEffects(),
        transitionOut: { type: 'none', duration: 0.6 }
      };
      state.timeline.videoTrack.push(clip);
      ui.selection = { type: 'video', id: clip.id };
    } else if (media.hasAudio) {
      const lastEnd = (state.timeline.audioTrack || []).reduce(
        (m, i) => Math.max(m, (i.start || 0) + audioItemEffDuration(i)), 0);
      const item = {
        id: uid('aud'), mediaId: media.id,
        inPoint: 0, outPoint: media.duration || 1,
        start: lastEnd, volume: 1, fadeIn: 0, fadeOut: 0,
        loop: false, stretchDuration: null
      };
      state.timeline.audioTrack.push(item);
      ui.selection = { type: 'audio', id: item.id };
    }
    markUnsaved();
    renderAll();
  }

  // ---------- Timeline layout ----------

  function clipEffDuration(clip) {
    const speed = clamp(clip.effects.speed || 1, 0.25, 4);
    return Math.max(0.05, (clip.outPoint - clip.inPoint) / speed);
  }

  function videoTrackLayout() {
    let t = 0;
    return state.timeline.videoTrack.map((clip) => {
      const start = t;
      const dur = clipEffDuration(clip);
      t += dur;
      return { clip, start, dur };
    });
  }

  function videoTrackTotalDuration() {
    const layout = videoTrackLayout();
    if (!layout.length) return 0;
    const last = layout[layout.length - 1];
    return last.start + last.dur;
  }

  function audioItemEffDuration(item) {
    if (item.loop && item.stretchDuration) return Math.max(0.05, item.stretchDuration);
    return Math.max(0.05, item.outPoint - item.inPoint);
  }

  function totalProjectDuration() {
    const videoDur = videoTrackTotalDuration();
    const audioEnd = (state.timeline.audioTrack || []).reduce(
      (m, i) => Math.max(m, (i.start || 0) + audioItemEffDuration(i)), 0);
    const textEnd = (state.timeline.textOverlays || []).reduce((m, i) => Math.max(m, i.end || 0), 0);
    return Math.max(videoDur, audioEnd, textEnd);
  }

  function clearAudioLoop(item) {
    item.loop = false;
    item.stretchDuration = null;
  }

  function fitAudioToVideoLength(item) {
    const media = getMedia(item.mediaId);
    if (!media) return;
    const needed = videoTrackTotalDuration();
    if (needed <= 0) {
      alert('Die Video-Timeline ist noch leer. Füge zuerst ein Video hinzu, bevor du die Musik daran anpasst.');
      return;
    }
    item.start = 0;
    item.inPoint = 0;
    if ((media.duration || 0) >= needed) {
      item.outPoint = needed;
      clearAudioLoop(item);
    } else {
      item.outPoint = media.duration || needed;
      item.loop = true;
      item.stretchDuration = needed;
    }
  }

  function findClipAtTime(t) {
    const layout = videoTrackLayout();
    for (const item of layout) {
      if (t >= item.start && t < item.start + item.dur) return item;
    }
    return null;
  }

  function layoutForClipId(id) {
    return videoTrackLayout().find((l) => l.clip.id === id) || null;
  }

  // ---------- Rendering ----------

  function renderAll() {
    renderMediaList();
    renderTimeline();
    renderProps();
    updateTransportUI();
    if (!ui.playing) syncPreviewToPlayhead();
    updateTextOverlayPreview();
    updatePreviewEmptyState();
  }

  function updatePreviewEmptyState() {
    el.previewEmpty.classList.toggle('hidden', state.timeline.videoTrack.length > 0);
  }

  function renderMediaList() {
    el.mediaList.textContent = '';
    el.projectNameInput.value = state.projectName;
    if (!state.mediaLibrary.length) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Noch keine Medien importiert.';
      el.mediaList.appendChild(p);
      return;
    }
    state.mediaLibrary.forEach((media) => {
      const item = document.createElement('div');
      item.className = 'media-item';

      const thumb = document.createElement('div');
      thumb.className = 'media-thumb';
      if (media.thumbnail) {
        thumb.style.backgroundImage = 'url("' + toFileUrl(media.thumbnail) + '")';
        thumb.style.backgroundSize = 'cover';
      } else {
        thumb.textContent = media.hasVideo === false ? '♪' : '🎬';
      }
      item.appendChild(thumb);

      const meta = document.createElement('div');
      meta.className = 'media-meta';
      const name = document.createElement('div');
      name.className = 'media-name';
      name.textContent = media.name;
      name.title = media.name;
      const dur = document.createElement('div');
      dur.className = 'media-dur';
      dur.textContent = media.error ? media.error : formatTime(media.duration || 0);
      meta.appendChild(name);
      meta.appendChild(dur);
      item.appendChild(meta);

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'media-add-btn';
      addBtn.textContent = '+';
      addBtn.title = 'Zur Timeline hinzufügen';
      addBtn.addEventListener('click', (e) => { e.stopPropagation(); addMediaToTimeline(media); });
      item.appendChild(addBtn);

      item.addEventListener('dblclick', () => addMediaToTimeline(media));
      el.mediaList.appendChild(item);
    });
  }

  function renderTimeline() {
    const totalDur = Math.max(totalProjectDuration(), 5);
    const width = Math.max(600, totalDur * ui.pxPerSecond + 100);
    el.timelineEl.style.width = width + 'px';

    renderRuler(totalDur, width);
    renderVideoTrack(videoTrackLayout(), width);
    renderAudioTrack(width);
    renderTextTrack(width);
    updatePlayheadPosition();
  }

  function renderRuler(totalDur, width) {
    el.ruler.textContent = '';
    el.ruler.style.width = width + 'px';
    const step = ui.pxPerSecond < 20 ? 30 : ui.pxPerSecond < 40 ? 10 : ui.pxPerSecond < 90 ? 5 : 1;
    for (let t = 0; t <= totalDur + step; t += step) {
      const tick = document.createElement('div');
      tick.className = 'ruler-tick';
      tick.style.left = (t * ui.pxPerSecond) + 'px';
      tick.textContent = formatTime(t);
      el.ruler.appendChild(tick);
    }
  }

  function renderVideoTrack(layout, width) {
    el.trackVideoBody.textContent = '';
    el.trackVideoBody.style.width = width + 'px';
    layout.forEach(({ clip, start, dur }, idx) => {
      const media = getMedia(clip.mediaId);
      const div = document.createElement('div');
      div.className = 'clip clip-video' + (isSelected('video', clip.id) ? ' selected' : '');
      div.style.left = (start * ui.pxPerSecond) + 'px';
      div.style.width = Math.max(4, dur * ui.pxPerSecond) + 'px';

      const label = document.createElement('span');
      label.className = 'clip-label';
      label.textContent = media ? media.name : 'Clip';
      div.appendChild(label);

      const leftHandle = document.createElement('div');
      leftHandle.className = 'clip-trim-handle left';
      div.appendChild(leftHandle);
      const rightHandle = document.createElement('div');
      rightHandle.className = 'clip-trim-handle right';
      div.appendChild(rightHandle);

      if (clip.transitionOut && clip.transitionOut.type !== 'none' && idx < layout.length - 1) {
        const badge = document.createElement('div');
        badge.className = 'transition-badge';
        badge.textContent = clip.transitionOut.type === 'fadeblack' ? '◐' : '⇄';
        badge.title = transitionLabel(clip.transitionOut.type);
        div.appendChild(badge);
      }

      div.addEventListener('mousedown', (e) => {
        if (e.target === leftHandle || e.target === rightHandle) return;
        selectItem('video', clip.id);
      });
      bindTrimHandle(leftHandle, clip, media, 'left');
      bindTrimHandle(rightHandle, clip, media, 'right');

      el.trackVideoBody.appendChild(div);
    });
  }

  function renderAudioTrack(width) {
    el.trackAudioBody.textContent = '';
    el.trackAudioBody.style.width = width + 'px';
    (state.timeline.audioTrack || []).forEach((item) => {
      const media = getMedia(item.mediaId);
      const dur = audioItemEffDuration(item);
      const div = document.createElement('div');
      div.className = 'clip clip-audio' + (isSelected('audio', item.id) ? ' selected' : '');
      div.style.left = ((item.start || 0) * ui.pxPerSecond) + 'px';
      div.style.width = Math.max(4, dur * ui.pxPerSecond) + 'px';

      const label = document.createElement('span');
      label.className = 'clip-label';
      label.textContent = media ? media.name : 'Audio';
      div.appendChild(label);

      if (item.loop) {
        // Looping stretches the clip to the video length; trim handles would
        // edit the (now irrelevant) single-play source range, so skip them.
        const badge = document.createElement('div');
        badge.className = 'transition-badge';
        badge.textContent = '🔁';
        badge.title = 'Wiederholt sich (Loop), bis das Video endet';
        div.appendChild(badge);
      } else {
        const leftHandle = document.createElement('div');
        leftHandle.className = 'clip-trim-handle left';
        div.appendChild(leftHandle);
        const rightHandle = document.createElement('div');
        rightHandle.className = 'clip-trim-handle right';
        div.appendChild(rightHandle);
        bindTrimHandle(leftHandle, item, media, 'left');
        bindTrimHandle(rightHandle, item, media, 'right');
      }
      bindMoveDrag(div, item, 'audio');

      el.trackAudioBody.appendChild(div);
    });
  }

  function renderTextTrack(width) {
    el.trackTextBody.textContent = '';
    el.trackTextBody.style.width = width + 'px';
    (state.timeline.textOverlays || []).forEach((item) => {
      const dur = Math.max(0.1, item.end - item.start);
      const div = document.createElement('div');
      div.className = 'clip clip-text' + (isSelected('text', item.id) ? ' selected' : '');
      div.style.left = (item.start * ui.pxPerSecond) + 'px';
      div.style.width = Math.max(4, dur * ui.pxPerSecond) + 'px';

      const label = document.createElement('span');
      label.className = 'clip-label';
      label.textContent = item.text || 'Text';
      div.appendChild(label);

      const leftHandle = document.createElement('div');
      leftHandle.className = 'clip-trim-handle left';
      div.appendChild(leftHandle);
      const rightHandle = document.createElement('div');
      rightHandle.className = 'clip-trim-handle right';
      div.appendChild(rightHandle);

      bindTextTrimHandle(leftHandle, item, 'left');
      bindTextTrimHandle(rightHandle, item, 'right');
      bindMoveDragText(div, item);

      el.trackTextBody.appendChild(div);
    });
  }

  function isSelected(type, id) { return ui.selection && ui.selection.type === type && ui.selection.id === id; }

  function selectItem(type, id) {
    ui.selection = { type, id };
    renderTimeline();
    renderProps();
  }

  function zoomTimeline(factor) {
    ui.pxPerSecond = clamp(ui.pxPerSecond * factor, 10, 400);
    renderTimeline();
  }

  // ---------- Drag interactions ----------

  function bindTrimHandle(handleEl, item, media, side) {
    handleEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const kind = state.timeline.videoTrack.includes(item) ? 'video' : 'audio';
      selectItem(kind, item.id);
      const startX = e.clientX;
      const origIn = item.inPoint;
      const origOut = item.outPoint;
      let historyPushed = false;
      function onMove(ev) {
        if (!historyPushed) { pushHistory(); historyPushed = true; }
        const deltaSec = (ev.clientX - startX) / ui.pxPerSecond;
        if (side === 'left') {
          item.inPoint = clamp(origIn + deltaSec, 0, origOut - 0.1);
        } else {
          const maxOut = media && media.duration ? media.duration : origOut + 999;
          item.outPoint = clamp(origOut + deltaSec, origIn + 0.1, maxOut);
        }
        renderTimeline();
        if (ui.selection && ui.selection.id === item.id) renderProps();
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        markUnsaved();
        if (!ui.playing) syncPreviewToPlayhead();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function bindTextTrimHandle(handleEl, item, side) {
    handleEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectItem('text', item.id);
      const startX = e.clientX;
      const origStart = item.start;
      const origEnd = item.end;
      let historyPushed = false;
      function onMove(ev) {
        if (!historyPushed) { pushHistory(); historyPushed = true; }
        const deltaSec = (ev.clientX - startX) / ui.pxPerSecond;
        if (side === 'left') item.start = clamp(origStart + deltaSec, 0, origEnd - 0.2);
        else item.end = clamp(origEnd + deltaSec, origStart + 0.2, 100000);
        renderTimeline();
        if (ui.selection && ui.selection.id === item.id) renderProps();
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        markUnsaved();
        updateTextOverlayPreview();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function bindMoveDrag(div, item, kind) {
    div.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('clip-trim-handle')) return;
      const startX = e.clientX;
      const origStart = item.start || 0;
      let moved = false;
      let historyPushed = false;
      function onMove(ev) {
        if (Math.abs(ev.clientX - startX) > 3) moved = true;
        if (!moved) return;
        if (!historyPushed) { pushHistory(); historyPushed = true; }
        item.start = clamp(origStart + (ev.clientX - startX) / ui.pxPerSecond, 0, 100000);
        renderTimeline();
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        selectItem(kind, item.id);
        if (moved) markUnsaved();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function bindMoveDragText(div, item) {
    div.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('clip-trim-handle')) return;
      const startX = e.clientX;
      const origStart = item.start;
      const span = item.end - item.start;
      let moved = false;
      let historyPushed = false;
      function onMove(ev) {
        if (Math.abs(ev.clientX - startX) > 3) moved = true;
        if (!moved) return;
        if (!historyPushed) { pushHistory(); historyPushed = true; }
        const newStart = clamp(origStart + (ev.clientX - startX) / ui.pxPerSecond, 0, 100000);
        item.start = newStart;
        item.end = newStart + span;
        renderTimeline();
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        selectItem('text', item.id);
        if (moved) { markUnsaved(); updateTextOverlayPreview(); }
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // ---------- Timeline actions ----------

  function splitAtPlayhead() {
    const found = videoTrackLayout().find((l) => ui.playhead > l.start + 0.02 && ui.playhead < l.start + l.dur - 0.02);
    if (!found) return;
    pushHistory();
    const clip = found.clip;
    const idx = state.timeline.videoTrack.indexOf(clip);
    const localOut = ui.playhead - found.start;
    const speed = clamp(clip.effects.speed || 1, 0.25, 4);
    const splitSourceTime = clip.inPoint + localOut * speed;

    const firstHalf = Object.assign({}, clip, { effects: Object.assign({}, clip.effects), outPoint: splitSourceTime, transitionOut: { type: 'none', duration: 0.6 } });
    const secondHalf = Object.assign({}, clip, { id: uid('clip'), effects: Object.assign({}, clip.effects), inPoint: splitSourceTime, transitionOut: Object.assign({}, clip.transitionOut) });

    state.timeline.videoTrack.splice(idx, 1, firstHalf, secondHalf);
    ui.selection = { type: 'video', id: secondHalf.id };
    markUnsaved();
    renderAll();
  }

  function deleteSelected() {
    if (!ui.selection) return;
    removeClip(ui.selection.type, ui.selection.id);
  }

  function removeClip(kind, id) {
    pushHistory();
    if (kind === 'video') state.timeline.videoTrack = state.timeline.videoTrack.filter((c) => c.id !== id);
    else if (kind === 'audio') {
      state.timeline.audioTrack = state.timeline.audioTrack.filter((c) => c.id !== id);
      const a = audioElements.get(id);
      if (a) { a.pause(); audioElements.delete(id); }
    } else if (kind === 'text') state.timeline.textOverlays = state.timeline.textOverlays.filter((c) => c.id !== id);

    if (ui.selection && ui.selection.id === id) ui.selection = null;
    if (ui.activeClipId === id) { ui.activeClipId = null; pause(); }
    markUnsaved();
    renderAll();
  }

  function swapClips(i, j) {
    const arr = state.timeline.videoTrack;
    if (j < 0 || j >= arr.length) return;
    pushHistory();
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
    markUnsaved();
    renderAll();
  }

  function addTextOverlay() {
    pushHistory();
    const item = {
      id: uid('txt'), text: 'Dein Text',
      start: ui.playhead, end: ui.playhead + 3,
      x: 0.5, y: 0.85, fontSize: 42, color: '#ffffff', fontFamily: 'Montserrat'
    };
    state.timeline.textOverlays.push(item);
    ui.selection = { type: 'text', id: item.id };
    markUnsaved();
    renderAll();
  }

  // ---------- Undo / Redo history ----------

  function snapshotState() {
    return JSON.stringify({ state, selection: ui.selection });
  }

  function pushHistory() {
    undoStack.push(snapshotState());
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    updateUndoRedoMenu();
  }

  function applySnapshot(json) {
    const data = JSON.parse(json);
    state = data.state;
    ui.selection = data.selection;
    ui.activeClipId = null;
    pause();
    markUnsaved();
    renderAll();
  }

  function undo() {
    if (!undoStack.length) return;
    const current = snapshotState();
    const prev = undoStack.pop();
    redoStack.push(current);
    applySnapshot(prev);
    updateUndoRedoMenu();
  }

  function redo() {
    if (!redoStack.length) return;
    const current = snapshotState();
    const next = redoStack.pop();
    undoStack.push(current);
    applySnapshot(next);
    updateUndoRedoMenu();
  }

  function updateUndoRedoMenu() {
    if (el.menuUndo) el.menuUndo.disabled = undoStack.length === 0;
    if (el.menuRedo) el.menuRedo.disabled = redoStack.length === 0;
  }

  function resetHistory() {
    undoStack = [];
    redoStack = [];
    updateUndoRedoMenu();
  }

  // ---------- More menu actions ----------

  function deselectAll() {
    ui.selection = null;
    renderProps();
    renderTimeline();
  }

  function showLastExport() {
    if (!lastExportPath) { alert('Es wurde in dieser Sitzung noch nichts exportiert.'); return; }
    window.videoWeltAPI.showItemInFolder(lastExportPath);
  }

  function duplicateSelectedClip() {
    if (!ui.selection) return;
    pushHistory();
    if (ui.selection.type === 'video') {
      const idx = state.timeline.videoTrack.findIndex((c) => c.id === ui.selection.id);
      if (idx === -1) return;
      const copy = JSON.parse(JSON.stringify(state.timeline.videoTrack[idx]));
      copy.id = uid('clip');
      state.timeline.videoTrack.splice(idx + 1, 0, copy);
      ui.selection = { type: 'video', id: copy.id };
    } else if (ui.selection.type === 'audio') {
      const orig = state.timeline.audioTrack.find((a) => a.id === ui.selection.id);
      if (!orig) return;
      const copy = JSON.parse(JSON.stringify(orig));
      copy.id = uid('aud');
      copy.start = (orig.start || 0) + audioItemEffDuration(orig) + 0.2;
      state.timeline.audioTrack.push(copy);
      ui.selection = { type: 'audio', id: copy.id };
    } else if (ui.selection.type === 'text') {
      const orig = state.timeline.textOverlays.find((t) => t.id === ui.selection.id);
      if (!orig) return;
      const copy = JSON.parse(JSON.stringify(orig));
      copy.id = uid('txt');
      const span = orig.end - orig.start;
      copy.start = orig.end + 0.2;
      copy.end = copy.start + span;
      state.timeline.textOverlays.push(copy);
      ui.selection = { type: 'text', id: copy.id };
    }
    markUnsaved();
    renderAll();
  }

  function loopSequence() {
    const clip = getSelectedVideoClip();
    if (!clip) { alert('Bitte zuerst einen Videoclip in der Timeline auswählen.'); return; }
    const idx = state.timeline.videoTrack.indexOf(clip);
    pushHistory();
    const copy = JSON.parse(JSON.stringify(clip));
    copy.id = uid('clip');
    state.timeline.videoTrack.splice(idx + 1, 0, copy);
    ui.selection = { type: 'video', id: copy.id };
    markUnsaved();
    renderAll();
  }

  function slowmoSequence() {
    const clip = getSelectedVideoClip();
    if (!clip) { alert('Bitte zuerst einen Videoclip in der Timeline auswählen.'); return; }
    const idx = state.timeline.videoTrack.indexOf(clip);
    pushHistory();
    const copy = JSON.parse(JSON.stringify(clip));
    copy.id = uid('clip');
    copy.effects.speed = clamp((clip.effects.speed || 1) * 0.5, 0.25, 4);
    state.timeline.videoTrack.splice(idx + 1, 0, copy);
    ui.selection = { type: 'video', id: copy.id };
    markUnsaved();
    renderAll();
  }

  function getSelectedVideoClip() {
    if (!ui.selection || ui.selection.type !== 'video') return null;
    return state.timeline.videoTrack.find((c) => c.id === ui.selection.id) || null;
  }

  function resetSelectedClipEffects() {
    const clip = getSelectedVideoClip();
    if (!clip) return;
    pushHistory();
    clip.effects = defaultEffects();
    markUnsaved();
    liveFilterUpdate(clip);
    renderAll();
  }

  function toggleSelectedClipMute() {
    const clip = getSelectedVideoClip();
    if (!clip) return;
    pushHistory();
    clip.effects.muted = !clip.effects.muted;
    markUnsaved();
    renderAll();
  }

  function toggleSelectedClipVignette() {
    const clip = getSelectedVideoClip();
    if (!clip) return;
    pushHistory();
    clip.effects.vignette = !clip.effects.vignette;
    markUnsaved();
    liveFilterUpdate(clip);
    renderAll();
  }

  function toggleSelectedClipFlip() {
    const clip = getSelectedVideoClip();
    if (!clip) return;
    pushHistory();
    clip.effects.flipH = !clip.effects.flipH;
    markUnsaved();
    liveFilterUpdate(clip);
    renderAll();
  }

  function applyPreset(name) {
    const clip = getSelectedVideoClip();
    if (!clip) {
      alert('Bitte zuerst einen Videoclip in der Timeline auswählen.');
      return;
    }
    pushHistory();
    const fx = clip.effects;
    if (name === 'reset') {
      Object.assign(fx, defaultEffects());
    } else if (name === 'bw') {
      fx.grayscale = true; fx.sepia = false; fx.contrast = 1.15; fx.hue = 0;
    } else if (name === 'sepia') {
      fx.sepia = true; fx.grayscale = false; fx.saturation = 0.9;
    } else if (name === 'warm') {
      fx.grayscale = false; fx.sepia = false; fx.saturation = 1.2; fx.brightness = 0.03; fx.hue = 8;
    } else if (name === 'cool') {
      fx.grayscale = false; fx.sepia = false; fx.saturation = 1.05; fx.hue = -12;
    } else if (name === 'cinematic') {
      fx.contrast = 1.2; fx.saturation = 0.85; fx.vignette = true; fx.brightness = -0.03;
    }
    markUnsaved();
    liveFilterUpdate(clip);
    renderAll();
  }

  // ---------- Properties panel ----------

  function renderProps() {
    const root = el.propsContent;
    root.textContent = '';
    if (!ui.selection) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Wähle einen Clip in der Timeline aus, um Effekte zu bearbeiten.';
      root.appendChild(p);
      return;
    }
    if (ui.selection.type === 'video') renderVideoProps(root);
    else if (ui.selection.type === 'audio') renderAudioProps(root);
    else if (ui.selection.type === 'text') renderTextProps(root);
  }

  function addSlider(root, labelText, opts, onChange) {
    const wrap = document.createElement('label');
    wrap.appendChild(document.createTextNode(labelText + ' '));
    const badge = document.createElement('span');
    badge.className = 'value-badge';
    badge.textContent = opts.format ? opts.format(opts.value) : String(opts.value);
    wrap.appendChild(badge);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(opts.min); input.max = String(opts.max); input.step = String(opts.step); input.value = String(opts.value);
    let historyPushed = false;
    input.addEventListener('input', () => {
      if (!historyPushed) { pushHistory(); historyPushed = true; }
      const v = parseFloat(input.value);
      badge.textContent = opts.format ? opts.format(v) : String(v);
      onChange(v);
      markUnsaved();
    });
    input.addEventListener('change', () => { historyPushed = false; });
    wrap.appendChild(input);
    root.appendChild(wrap);
    return input;
  }

  function addCheckbox(root, labelText, checked, onChange) {
    const row = document.createElement('div');
    row.className = 'checkbox-row';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.id = uid('chk');
    input.addEventListener('change', () => { pushHistory(); onChange(input.checked); markUnsaved(); });
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = labelText;
    row.appendChild(input);
    row.appendChild(label);
    root.appendChild(row);
    return input;
  }

  function addSelect(root, labelText, options, value, onChange) {
    const wrap = document.createElement('label');
    wrap.appendChild(document.createTextNode(labelText));
    const select = document.createElement('select');
    options.forEach((opt) => {
      const o = document.createElement('option');
      o.value = String(opt.value);
      o.textContent = opt.label;
      if (String(opt.value) === String(value)) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', () => { pushHistory(); onChange(select.value); markUnsaved(); });
    wrap.appendChild(select);
    root.appendChild(wrap);
    return select;
  }

  function addGroupedSelect(root, labelText, groups, value, onChange) {
    const wrap = document.createElement('label');
    wrap.appendChild(document.createTextNode(labelText));
    const select = document.createElement('select');
    groups.forEach((group) => {
      const og = document.createElement('optgroup');
      og.label = group.label;
      group.options.forEach((opt) => {
        const o = document.createElement('option');
        o.value = String(opt.value);
        o.textContent = opt.label;
        if (String(opt.value) === String(value)) o.selected = true;
        og.appendChild(o);
      });
      select.appendChild(og);
    });
    select.addEventListener('change', () => { pushHistory(); onChange(select.value); markUnsaved(); });
    wrap.appendChild(select);
    root.appendChild(wrap);
    return select;
  }

  function addNumberField(root, labelText, value, step, onChange) {
    const wrap = document.createElement('label');
    wrap.appendChild(document.createTextNode(labelText));
    const input = document.createElement('input');
    input.type = 'number';
    input.step = String(step);
    input.value = String(Math.round(value * 100) / 100);
    input.addEventListener('change', () => { pushHistory(); onChange(parseFloat(input.value) || 0); markUnsaved(); });
    wrap.appendChild(input);
    root.appendChild(wrap);
    return input;
  }

  function addTextArea(root, labelText, value, onInput) {
    const wrap = document.createElement('label');
    wrap.appendChild(document.createTextNode(labelText));
    const ta = document.createElement('textarea');
    ta.value = value;
    let historyPushed = false;
    ta.addEventListener('input', () => {
      if (!historyPushed) { pushHistory(); historyPushed = true; }
      onInput(ta.value);
      markUnsaved();
    });
    ta.addEventListener('blur', () => { historyPushed = false; });
    wrap.appendChild(ta);
    root.appendChild(wrap);
    return ta;
  }

  function renderVideoProps(root) {
    const clip = state.timeline.videoTrack.find((c) => c.id === ui.selection.id);
    if (!clip) { ui.selection = null; renderProps(); return; }
    const media = getMedia(clip.mediaId);
    const idx = state.timeline.videoTrack.indexOf(clip);

    const reorderRow = document.createElement('div');
    reorderRow.className = 'props-row';
    const leftBtn = document.createElement('button');
    leftBtn.className = 'tb-btn'; leftBtn.textContent = '◀ links'; leftBtn.disabled = idx === 0;
    leftBtn.addEventListener('click', () => swapClips(idx, idx - 1));
    const rightBtn = document.createElement('button');
    rightBtn.className = 'tb-btn'; rightBtn.textContent = 'rechts ▶'; rightBtn.disabled = idx === state.timeline.videoTrack.length - 1;
    rightBtn.addEventListener('click', () => swapClips(idx, idx + 1));
    reorderRow.appendChild(leftBtn);
    reorderRow.appendChild(rightBtn);
    root.appendChild(reorderRow);

    const nameP = document.createElement('p');
    nameP.className = 'hint';
    nameP.textContent = media ? media.name : 'Unbekanntes Medium';
    root.appendChild(nameP);

    const trimRow = document.createElement('div');
    trimRow.className = 'props-row';
    addNumberField(trimRow, 'Start (s)', clip.inPoint, 0.1, (v) => { clip.inPoint = clamp(v, 0, clip.outPoint - 0.1); afterClipEdit(clip); });
    addNumberField(trimRow, 'Ende (s)', clip.outPoint, 0.1, (v) => { clip.outPoint = clamp(v, clip.inPoint + 0.1, media ? media.duration : v); afterClipEdit(clip); });
    root.appendChild(trimRow);

    addSlider(root, 'Geschwindigkeit', { min: 0.25, max: 4, step: 0.05, value: clip.effects.speed, format: (v) => v.toFixed(2) + 'x' }, (v) => { clip.effects.speed = v; afterClipEdit(clip); });
    addCheckbox(root, 'Weiche Zeitlupe (nur bei < 1x wirksam)', clip.effects.smoothSlowmo, (v) => { clip.effects.smoothSlowmo = v; });
    addSlider(root, 'Helligkeit', { min: -1, max: 1, step: 0.05, value: clip.effects.brightness, format: (v) => Math.round(v * 100) + '%' }, (v) => { clip.effects.brightness = v; liveFilterUpdate(clip); });
    addSlider(root, 'Kontrast', { min: 0, max: 3, step: 0.05, value: clip.effects.contrast, format: (v) => Math.round(v * 100) + '%' }, (v) => { clip.effects.contrast = v; liveFilterUpdate(clip); });
    addSlider(root, 'Sättigung', { min: 0, max: 3, step: 0.05, value: clip.effects.saturation, format: (v) => Math.round(v * 100) + '%' }, (v) => { clip.effects.saturation = v; liveFilterUpdate(clip); });
    addCheckbox(root, 'Graustufen', clip.effects.grayscale, (v) => { clip.effects.grayscale = v; liveFilterUpdate(clip); });
    addCheckbox(root, 'Sepia', clip.effects.sepia, (v) => { clip.effects.sepia = v; liveFilterUpdate(clip); });
    addSlider(root, 'Weichzeichnen', { min: 0, max: 20, step: 1, value: clip.effects.blur, format: (v) => v + 'px' }, (v) => { clip.effects.blur = v; liveFilterUpdate(clip); });
    addSlider(root, 'Schärfen', { min: 0, max: 5, step: 0.25, value: clip.effects.sharpen || 0, format: (v) => v.toFixed(2) }, (v) => { clip.effects.sharpen = v; });
    addSlider(root, 'Farbton (Hue)', { min: -180, max: 180, step: 5, value: clip.effects.hue || 0, format: (v) => v + '°' }, (v) => { clip.effects.hue = v; liveFilterUpdate(clip); });
    addSelect(root, 'Rotation', [{ value: 0, label: '0°' }, { value: 90, label: '90°' }, { value: 180, label: '180°' }, { value: 270, label: '270°' }], clip.effects.rotate, (v) => { clip.effects.rotate = parseInt(v, 10); liveFilterUpdate(clip); });
    addCheckbox(root, 'Horizontal spiegeln', clip.effects.flipH, (v) => { clip.effects.flipH = v; liveFilterUpdate(clip); });
    addCheckbox(root, 'Vertikal spiegeln', clip.effects.flipV, (v) => { clip.effects.flipV = v; liveFilterUpdate(clip); });
    addCheckbox(root, 'Vignette', clip.effects.vignette, (v) => { clip.effects.vignette = v; liveFilterUpdate(clip); });
    addSlider(root, 'Einblenden (Fade-In)', { min: 0, max: 3, step: 0.1, value: clip.effects.fadeIn, format: (v) => v.toFixed(1) + 's' }, (v) => { clip.effects.fadeIn = v; });
    addSlider(root, 'Ausblenden (Fade-Out)', { min: 0, max: 3, step: 0.1, value: clip.effects.fadeOut, format: (v) => v.toFixed(1) + 's' }, (v) => { clip.effects.fadeOut = v; });

    addCheckbox(root, 'Stumm', clip.effects.muted, (v) => { clip.effects.muted = v; renderProps(); });
    if (!clip.effects.muted) {
      addSlider(root, 'Lautstärke', { min: 0, max: 4, step: 0.1, value: clip.effects.volume, format: (v) => Math.round(v * 100) + '%' }, (v) => { clip.effects.volume = v; });
    }

    if (idx < state.timeline.videoTrack.length - 1) {
      addGroupedSelect(root, 'Übergang zum nächsten Clip', TRANSITION_GROUPS, clip.transitionOut.type, (v) => { clip.transitionOut.type = v; renderTimeline(); });
      addSlider(root, 'Übergangsdauer', { min: 0.2, max: 3, step: 0.1, value: clip.transitionOut.duration, format: (v) => v.toFixed(1) + 's' }, (v) => { clip.transitionOut.duration = v; });
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'props-danger';
    delBtn.textContent = 'Clip aus Timeline entfernen';
    delBtn.addEventListener('click', () => removeClip('video', clip.id));
    root.appendChild(delBtn);
  }

  function afterClipEdit(clip) {
    renderTimeline();
    liveFilterUpdate(clip);
  }

  function liveFilterUpdate(clip) {
    if (ui.activeClipId === clip.id) applyCssFilters(frontElement(), clip.effects);
    if (!ui.playing) syncPreviewToPlayhead();
  }

  function renderAudioProps(root) {
    const item = state.timeline.audioTrack.find((a) => a.id === ui.selection.id);
    if (!item) { ui.selection = null; renderProps(); return; }
    const media = getMedia(item.mediaId);

    const nameP = document.createElement('p');
    nameP.className = 'hint';
    nameP.textContent = media ? media.name : 'Audio';
    root.appendChild(nameP);

    const fitBtn = document.createElement('button');
    fitBtn.type = 'button';
    fitBtn.className = 'tb-btn';
    fitBtn.style.width = '100%';
    fitBtn.textContent = 'Auf Videolänge anpassen';
    fitBtn.title = 'Setzt Start/Ende so, dass die Musik genauso lang wie die Video-Timeline ist (wiederholt sich in einer Schleife, falls sie kürzer ist)';
    fitBtn.addEventListener('click', () => {
      fitAudioToVideoLength(item);
      markUnsaved();
      renderTimeline();
      renderProps();
      if (!ui.playing) updateAudioTrackPreview();
    });
    root.appendChild(fitBtn);

    if (item.loop) {
      const loopHint = document.createElement('p');
      loopHint.className = 'hint';
      loopHint.textContent = '🔁 Wird in einer Schleife wiederholt, bis das Video endet.';
      root.appendChild(loopHint);
    }

    const trimRow = document.createElement('div');
    trimRow.className = 'props-row';
    addNumberField(trimRow, 'Start im Original (s)', item.inPoint, 0.1, (v) => { item.inPoint = clamp(v, 0, item.outPoint - 0.1); clearAudioLoop(item); renderTimeline(); renderProps(); });
    addNumberField(trimRow, 'Ende im Original (s)', item.outPoint, 0.1, (v) => { item.outPoint = clamp(v, item.inPoint + 0.1, media ? media.duration : v); clearAudioLoop(item); renderTimeline(); renderProps(); });
    root.appendChild(trimRow);

    addNumberField(root, 'Position auf Timeline (s)', item.start || 0, 0.1, (v) => { item.start = Math.max(0, v); renderTimeline(); });
    addSlider(root, 'Lautstärke', { min: 0, max: 4, step: 0.1, value: item.volume != null ? item.volume : 1, format: (v) => Math.round(v * 100) + '%' }, (v) => { item.volume = v; });
    addSlider(root, 'Einblenden', { min: 0, max: 3, step: 0.1, value: item.fadeIn || 0, format: (v) => v.toFixed(1) + 's' }, (v) => { item.fadeIn = v; });
    addSlider(root, 'Ausblenden', { min: 0, max: 3, step: 0.1, value: item.fadeOut || 0, format: (v) => v.toFixed(1) + 's' }, (v) => { item.fadeOut = v; });

    const delBtn = document.createElement('button');
    delBtn.className = 'props-danger';
    delBtn.textContent = 'Audiospur entfernen';
    delBtn.addEventListener('click', () => removeClip('audio', item.id));
    root.appendChild(delBtn);
  }

  function renderTextProps(root) {
    const item = state.timeline.textOverlays.find((t) => t.id === ui.selection.id);
    if (!item) { ui.selection = null; renderProps(); return; }

    addTextArea(root, 'Text', item.text, (v) => { item.text = v; renderTimeline(); updateTextOverlayPreview(); });

    const trimRow = document.createElement('div');
    trimRow.className = 'props-row';
    addNumberField(trimRow, 'Start (s)', item.start, 0.1, (v) => { item.start = clamp(v, 0, item.end - 0.1); renderTimeline(); updateTextOverlayPreview(); });
    addNumberField(trimRow, 'Ende (s)', item.end, 0.1, (v) => { item.end = Math.max(item.start + 0.1, v); renderTimeline(); updateTextOverlayPreview(); });
    root.appendChild(trimRow);

    addSlider(root, 'Position horizontal', { min: 0, max: 1, step: 0.01, value: item.x, format: (v) => Math.round(v * 100) + '%' }, (v) => { item.x = v; updateTextOverlayPreview(); });
    addSlider(root, 'Position vertikal', { min: 0, max: 1, step: 0.01, value: item.y, format: (v) => Math.round(v * 100) + '%' }, (v) => { item.y = v; updateTextOverlayPreview(); });
    addSlider(root, 'Schriftgröße', { min: 14, max: 120, step: 1, value: item.fontSize, format: (v) => v + 'px' }, (v) => { item.fontSize = v; updateTextOverlayPreview(); });
    addSelect(root, 'Schriftart', [
      { value: 'Montserrat', label: 'Montserrat (geometrisch)' },
      { value: 'Open Sans', label: 'Open Sans (humanistisch)' }
    ], item.fontFamily || 'Montserrat', (v) => { item.fontFamily = v; updateTextOverlayPreview(); });

    const colorWrap = document.createElement('label');
    colorWrap.appendChild(document.createTextNode('Farbe'));
    const swatches = document.createElement('div');
    swatches.className = 'color-swatches';
    ['#ffffff', '#f4c430', '#ff3b30', '#2ecc71', '#3498db', '#111111'].forEach((color) => {
      const sw = document.createElement('div');
      sw.className = 'color-swatch' + (item.color === color ? ' selected' : '');
      sw.style.background = color;
      sw.addEventListener('click', () => { item.color = color; markUnsaved(); renderProps(); updateTextOverlayPreview(); });
      swatches.appendChild(sw);
    });
    colorWrap.appendChild(swatches);
    root.appendChild(colorWrap);

    const delBtn = document.createElement('button');
    delBtn.className = 'props-danger';
    delBtn.textContent = 'Text entfernen';
    delBtn.addEventListener('click', () => removeClip('text', item.id));
    root.appendChild(delBtn);
  }

  // ---------- Preview / playback engine ----------

  function frontElement() { return ui.frontIsA ? el.videoA : el.videoB; }
  function backElement() { return ui.frontIsA ? el.videoB : el.videoA; }

  function applyCssFilters(videoEl, fx) {
    const b = 1 + clamp(fx.brightness || 0, -1, 1);
    const c = clamp(fx.contrast != null ? fx.contrast : 1, 0, 3);
    const s = fx.grayscale ? 0 : clamp(fx.saturation != null ? fx.saturation : 1, 0, 3);
    const blurPx = clamp(fx.blur || 0, 0, 20) * 0.5;
    const hue = clamp(fx.hue || 0, -180, 180);
    let filter = 'brightness(' + b + ') contrast(' + c + ') saturate(' + s + ')';
    if (hue) filter += ' hue-rotate(' + hue + 'deg)';
    if (fx.sepia) filter += ' sepia(0.7)';
    if (blurPx > 0) filter += ' blur(' + blurPx + 'px)';
    videoEl.style.filter = filter;
    videoEl.style.boxShadow = fx.vignette ? 'inset 0 0 100px 30px rgba(0,0,0,0.55)' : '';

    const transforms = [];
    if (fx.flipH) transforms.push('scaleX(-1)');
    if (fx.flipV) transforms.push('scaleY(-1)');
    if (fx.rotate) transforms.push('rotate(' + fx.rotate + 'deg)');
    videoEl.style.transform = transforms.join(' ');
  }

  function loadClipIntoFront(item, seekLocalOutputTime) {
    const media = getMedia(item.clip.mediaId);
    if (!media) return;
    const front = frontElement();
    const back = backElement();
    back.pause();
    back.style.opacity = '0';
    ui.blending = false;
    ui.blendNextClipId = null;
    el.fadeOverlay.style.opacity = '0';

    const speed = clamp(item.clip.effects.speed || 1, 0.25, 4);
    const sourceTime = item.clip.inPoint + (seekLocalOutputTime || 0) * speed;
    applyCssFilters(front, item.clip.effects);
    front.playbackRate = speed;
    front.style.opacity = '1';
    if (front.dataset.mediaPath !== media.path) {
      front.dataset.mediaPath = media.path;
      front.src = toFileUrl(media.path);
      const onLoaded = () => { front.currentTime = sourceTime; front.removeEventListener('loadedmetadata', onLoaded); };
      front.addEventListener('loadedmetadata', onLoaded);
    } else {
      front.currentTime = sourceTime;
    }
    ui.activeClipId = item.clip.id;
  }

  function syncPreviewToPlayhead() {
    const item = findClipAtTime(ui.playhead);
    if (!item) {
      el.videoA.style.opacity = '0';
      el.videoB.style.opacity = '0';
      ui.activeClipId = null;
      return;
    }
    loadClipIntoFront(item, ui.playhead - item.start);
  }

  function seekTo(t) {
    ui.playhead = clamp(t, 0, totalProjectDuration());
    if (!ui.playing) syncPreviewToPlayhead();
    updateTransportUI();
    updatePlayheadPosition();
    updateTextOverlayPreview();
    updateAudioTrackPreview();
  }

  function play() {
    const layout = videoTrackLayout();
    if (!layout.length) return;
    if (ui.playhead >= totalProjectDuration() - 0.02) ui.playhead = 0;
    const item = findClipAtTime(ui.playhead) || layout[0];
    if (ui.activeClipId !== item.clip.id) loadClipIntoFront(item, ui.playhead - item.start);
    ui.playing = true;
    el.btnPlay.textContent = '⏸ Pause';
    frontElement().play().catch(() => {});
    requestAnimationFrame(playbackTick);
  }

  function pause() {
    ui.playing = false;
    el.btnPlay.textContent = '▶ Wiedergabe';
    el.videoA.pause();
    el.videoB.pause();
    audioElements.forEach((a) => a.pause());
  }

  function playbackTick() {
    if (!ui.playing) return;
    const front = frontElement();
    const back = backElement();
    const cur = layoutForClipId(ui.activeClipId);
    if (!cur) { ui.playing = false; return; }

    const speed = clamp(cur.clip.effects.speed || 1, 0.25, 4);
    const localOut = (front.currentTime - cur.clip.inPoint) / speed;
    ui.playhead = cur.start + localOut;
    const remaining = cur.dur - localOut;

    const layout = videoTrackLayout();
    const curIdx = layout.findIndex((l) => l.clip.id === cur.clip.id);
    const next = layout[curIdx + 1] || null;
    const trans = cur.clip.transitionOut && cur.clip.transitionOut.type !== 'none' ? cur.clip.transitionOut : null;

    if (trans && next && remaining <= trans.duration && remaining > 0) {
      if (!ui.blending) {
        const media = getMedia(next.clip.mediaId);
        if (media) {
          back.dataset.mediaPath = media.path;
          back.src = toFileUrl(media.path);
          applyCssFilters(back, next.clip.effects);
          back.playbackRate = clamp(next.clip.effects.speed || 1, 0.25, 4);
          const onLoaded = () => {
            back.currentTime = next.clip.inPoint;
            back.play().catch(() => {});
            back.removeEventListener('loadedmetadata', onLoaded);
          };
          back.addEventListener('loadedmetadata', onLoaded);
          ui.blending = true;
          ui.blendNextClipId = next.clip.id;
        }
      }
      const progress = clamp(1 - remaining / trans.duration, 0, 1);
      if (trans.type === 'crossfade') {
        front.style.opacity = String(1 - progress);
        back.style.opacity = String(progress);
        el.fadeOverlay.style.opacity = '0';
      } else if (trans.type === 'fadeblack') {
        const k = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        el.fadeOverlay.style.opacity = String(k);
        front.style.opacity = progress < 0.5 ? '1' : '0';
        back.style.opacity = progress >= 0.5 ? '1' : '0';
      }
    }

    if (remaining <= 0.02) {
      front.pause();
      if (next) {
        if (ui.blending && ui.blendNextClipId === next.clip.id) {
          ui.frontIsA = !ui.frontIsA;
          front.style.opacity = '0';
          frontElement().style.opacity = '1';
          ui.activeClipId = next.clip.id;
        } else {
          const nextItem = next;
          loadClipIntoFront(nextItem, 0);
          frontElement().play().catch(() => {});
        }
        ui.blending = false;
        ui.blendNextClipId = null;
        el.fadeOverlay.style.opacity = '0';
      } else {
        ui.playing = false;
        el.btnPlay.textContent = '▶ Wiedergabe';
        ui.playhead = totalProjectDuration();
      }
    }

    updateTransportUI();
    updatePlayheadPosition();
    updateTextOverlayPreview();
    updateAudioTrackPreview();

    if (ui.playing) requestAnimationFrame(playbackTick);
  }

  function updateTransportUI() {
    const total = totalProjectDuration();
    el.timeDisplay.textContent = formatTime(ui.playhead) + ' / ' + formatTime(total);
  }

  function updatePlayheadPosition() {
    el.playheadEl.style.left = (TRACK_LABEL_OFFSET + ui.playhead * ui.pxPerSecond) + 'px';
    const total = totalProjectDuration();
    if (total > 0) el.seekBar.value = String(Math.round((ui.playhead / total) * 1000));
  }

  function updateTextOverlayPreview() {
    const layer = el.textOverlayLayer;
    layer.textContent = '';
    (state.timeline.textOverlays || []).forEach((item) => {
      if (ui.playhead >= item.start && ui.playhead < item.end) {
        const div = document.createElement('div');
        div.className = 'text-overlay-item';
        div.textContent = item.text || '';
        div.style.left = (item.x * 100) + '%';
        div.style.top = (item.y * 100) + '%';
        div.style.fontSize = (item.fontSize || 42) + 'px';
        div.style.color = item.color || '#ffffff';
        div.style.fontFamily = "'" + (item.fontFamily || 'Montserrat') + "', sans-serif";
        layer.appendChild(div);
      }
    });
  }

  function getAudioEl(item) {
    let a = audioElements.get(item.id);
    if (!a) {
      a = new Audio();
      a.dataset.mediaPath = '';
      audioElements.set(item.id, a);
    }
    return a;
  }

  function updateAudioTrackPreview() {
    const activeIds = new Set();
    (state.timeline.audioTrack || []).forEach((item) => {
      const media = getMedia(item.mediaId);
      if (!media) return;
      const dur = audioItemEffDuration(item);
      const start = item.start || 0;
      const within = ui.playhead >= start && ui.playhead < start + dur;
      if (!within) return;
      activeIds.add(item.id);
      const a = getAudioEl(item);
      if (a.dataset.mediaPath !== media.path) {
        a.src = toFileUrl(media.path);
        a.dataset.mediaPath = media.path;
      }
      a.loop = !!item.loop;
      a.volume = clamp(item.volume != null ? item.volume : 1, 0, 1);
      const elapsed = ui.playhead - start;
      // Native <audio loop> restarts playback on its own; here we only
      // correct drift, wrapping the target into the source's own length so
      // scrubbing while looped doesn't seek past the end of the file.
      const target = item.loop && media.duration
        ? item.inPoint + (elapsed % Math.max(0.05, media.duration))
        : item.inPoint + elapsed;
      if (Math.abs(a.currentTime - target) > 0.2) a.currentTime = target;
      if (ui.playing) { if (a.paused) a.play().catch(() => {}); }
      else if (!a.paused) a.pause();
    });
    audioElements.forEach((a, id) => { if (!activeIds.has(id) && !a.paused) a.pause(); });
  }

  // ---------- Export ----------

  async function exportCurrentFrame() {
    const item = findClipAtTime(ui.playhead);
    if (!item) {
      alert('Kein Videobild an der aktuellen Position. Bewege den Playhead auf einen Clip in der Timeline.');
      return;
    }
    const media = getMedia(item.clip.mediaId);
    if (!media) return;
    const speed = clamp(item.clip.effects.speed || 1, 0.25, 4);
    const sourceTime = item.clip.inPoint + (ui.playhead - item.start) * speed;
    const result = await window.videoWeltAPI.exportFrame({
      mediaPath: media.path,
      sourceTime,
      effects: item.clip.effects,
      suggestedName: (state.projectName || 'VideoWelt') + '-Standbild'
    });
    if (result.canceled) return;
    if (result.error) { alert('Standbild-Export fehlgeschlagen: ' + result.error); return; }
    lastExportPath = result.path;
    el.exportDoneText.textContent = 'Das Standbild wurde erfolgreich gespeichert:\n' + result.path;
    el.exportDoneModal.classList.remove('hidden');
  }

  function openExportModal() {
    if (!state.timeline.videoTrack.length) {
      alert('Die Timeline enthält noch kein Video. Bitte zuerst einen Clip hinzufügen.');
      return;
    }
    pause();
    el.exportModal.classList.remove('hidden');
    el.exportProgressWrap.classList.add('hidden');
    el.exportProgressFill.style.width = '0%';
    el.exportProgressLabel.textContent = '0%';
    el.startExportBtn.disabled = false;
  }

  function closeExportModal() {
    el.exportModal.classList.add('hidden');
    if (ui.exportUnsubscribe) { ui.exportUnsubscribe(); ui.exportUnsubscribe = null; }
  }

  async function startExport() {
    const settings = {
      format: el.exportFormat.value,
      resolution: el.exportResolution.value,
      quality: el.exportQuality.value,
      fps: parseInt(el.exportFps.value, 10),
      suggestedName: (state.projectName || 'VideoWelt-Export').replace(/[^a-z0-9äöüß_\- ]/gi, '_')
    };
    el.startExportBtn.disabled = true;
    el.exportProgressWrap.classList.remove('hidden');
    ui.exportUnsubscribe = window.videoWeltAPI.onExportProgress((progress) => {
      const pct = Math.round(progress.percent || 0);
      el.exportProgressFill.style.width = pct + '%';
      el.exportProgressLabel.textContent = pct + '%';
    });
    try {
      const result = await window.videoWeltAPI.exportVideo(JSON.parse(JSON.stringify(state)), settings);
      if (ui.exportUnsubscribe) { ui.exportUnsubscribe(); ui.exportUnsubscribe = null; }
      el.startExportBtn.disabled = false;
      if (result.canceled) return;
      if (result.error) { alert('Export fehlgeschlagen: ' + result.error); return; }
      closeExportModal();
      lastExportPath = result.path;
      el.exportDoneText.textContent = 'Die Datei wurde erfolgreich gespeichert:\n' + result.path;
      el.exportDoneModal.classList.remove('hidden');
    } catch (err) {
      if (ui.exportUnsubscribe) { ui.exportUnsubscribe(); ui.exportUnsubscribe = null; }
      el.startExportBtn.disabled = false;
      alert('Export fehlgeschlagen: ' + (err && err.message ? err.message : err));
    }
  }
})();
