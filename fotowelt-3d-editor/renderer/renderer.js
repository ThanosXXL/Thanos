(function () {
  'use strict';

  const FotoEffects = window.FotoEffects;

  const projectSelect = document.getElementById('projectSelect');
  const btnNewProject = document.getElementById('btnNewProject');
  const btnRenameProject = document.getElementById('btnRenameProject');
  const btnDeleteProject = document.getElementById('btnDeleteProject');

  const btnAddImages = document.getElementById('btnAddImages');
  const imageListEl = document.getElementById('imageList');

  const btnAddLogo = document.getElementById('btnAddLogo');
  const btnRemoveLogo = document.getElementById('btnRemoveLogo');
  const logoPreview = document.getElementById('logoPreview');
  const logoControls = document.getElementById('logoControls');
  const logoX = document.getElementById('logoX');
  const logoY = document.getElementById('logoY');
  const logoScale = document.getElementById('logoScale');
  const logoRotation = document.getElementById('logoRotation');
  const logoOpacity = document.getElementById('logoOpacity');
  const logoBlendMode = document.getElementById('logoBlendMode');
  const logoVisible = document.getElementById('logoVisible');

  const btnAddMusic = document.getElementById('btnAddMusic');
  const musicInfo = document.getElementById('musicInfo');
  const audioPlayer = document.getElementById('audioPlayer');

  const previewCanvas = document.getElementById('previewCanvas');
  const previewEmptyEl = document.getElementById('previewEmpty');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const transitionDurationInput = document.getElementById('transitionDuration');
  const transitionValueEl = document.getElementById('transitionValue');
  const resolutionSelect = document.getElementById('resolutionSelect');

  const btnExport = document.getElementById('btnExport');
  const exportProgressWrap = document.getElementById('exportProgressWrap');
  const exportProgressBar = document.getElementById('exportProgressBar');
  const exportProgressLabel = document.getElementById('exportProgressLabel');
  const btnCancelExport = document.getElementById('btnCancelExport');
  const exportResultEl = document.getElementById('exportResult');

  const presetListEl = document.getElementById('presetList');
  const btnSavePreset = document.getElementById('btnSavePreset');
  const activeImageNameEl = document.getElementById('activeImageName');
  const btnApplyAll = document.getElementById('btnApplyAll');
  const btnResetEffects = document.getElementById('btnResetEffects');
  const effectGroupsEl = document.getElementById('effectGroups');

  const toastEl = document.getElementById('toast');

  let state = { projects: [], activeProjectId: null };
  const imageElements = new Map();
  let logoElement = null;
  const frameCache = new Map();

  let playing = false;
  let playStartTime = 0;
  let rafId = null;
  let renderScheduled = false;
  let persistTimer = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function sanitizeFileName(name) {
    return name.replace(/[^a-z0-9äöüß\- _]/gi, '_').trim() || 'fotowelt-loop';
  }

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function computePreviewSize(resolutionValue) {
    const [w, h] = resolutionValue.split('x').map(Number);
    const maxDim = 900;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    return { w: Math.max(2, Math.round(w * scale)), h: Math.max(2, Math.round(h * scale)) };
  }

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      window.editorAPI.saveData(state);
    }, 400);
  }

  function toast(message, isError) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    toastEl.className = 'toast' + (isError ? ' error' : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      toastEl.hidden = true;
    }, 3500);
  }

  function getActiveProject() {
    return state.projects.find((p) => p.id === state.activeProjectId) || null;
  }

  function getActiveImage() {
    const project = getActiveProject();
    if (!project) return null;
    return project.images.find((im) => im.id === project.activeImageId) || null;
  }

  function createEmptyProject(name) {
    return {
      id: uid(),
      name,
      images: [],
      activeImageId: null,
      logo: null,
      music: null,
      transitionDuration: 1,
      resolution: '1920x1080',
      customPresets: []
    };
  }

  // ---------- Rendering pipeline ----------

  function frameCacheKey(image, project, w, h) {
    return JSON.stringify(image.effects) + '|' + JSON.stringify(project.logo) + '|' + w + 'x' + h;
  }

  function getPreviewCanvas(image, project, w, h) {
    const key = frameCacheKey(image, project, w, h);
    const cached = frameCache.get(image.id);
    if (cached && cached.key === key) return cached.canvas;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const imgEl = imageElements.get(image.id);
    if (imgEl) {
      FotoEffects.renderComposite(ctx, w, h, {
        image: imgEl,
        effects: image.effects,
        logoImage: project.logo ? logoElement : null,
        logo: project.logo
      });
    }
    frameCache.set(image.id, { key, canvas });
    return canvas;
  }

  function renderPreview() {
    const project = getActiveProject();
    if (!project) return;
    const { w, h } = computePreviewSize(project.resolution);
    previewCanvas.width = w;
    previewCanvas.height = h;
    previewEmptyEl.hidden = project.images.length > 0;
    if (playing || !project.images.length) return;
    const image = getActiveImage() || project.images[0];
    const canvas = getPreviewCanvas(image, project, w, h);
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(canvas, 0, 0);
  }

  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      renderPreview();
    });
  }

  // ---------- Playback (Loop-Vorschau mit weichen Übergängen + Musik) ----------

  function getTimeline(project) {
    const n = project.images.length;
    const d = project.transitionDuration;
    const audioDur = project.music && project.music.duration;
    const t = Math.max(audioDur ? (audioDur - d) / n : 2.5, 0.05);
    const offsets = [];
    for (let k = 1; k < n; k++) offsets.push(k * t);
    const total = n * t + d;
    return { t, d, offsets, total, n };
  }

  function getFrameAtTime(project, elapsed) {
    const { d, offsets, total, n } = getTimeline(project);
    if (n <= 1) return { idx: 0, nextIdx: 0, alpha: 0 };
    const loopT = ((elapsed % total) + total) % total;
    for (let k = 1; k < n; k++) {
      const start = offsets[k - 1];
      const end = start + d;
      if (loopT >= start && loopT < end) {
        return { idx: k - 1, nextIdx: k, alpha: (loopT - start) / d };
      }
    }
    if (loopT < offsets[0]) return { idx: 0, nextIdx: 0, alpha: 0 };
    for (let k = 1; k < n - 1; k++) {
      const blendEnd = offsets[k - 1] + d;
      if (loopT >= blendEnd && loopT < offsets[k]) return { idx: k, nextIdx: k, alpha: 0 };
    }
    return { idx: n - 1, nextIdx: n - 1, alpha: 0 };
  }

  function drawPlaybackFrame(elapsed) {
    const project = getActiveProject();
    if (!project || !project.images.length) return;
    const { w, h } = computePreviewSize(project.resolution);
    previewCanvas.width = w;
    previewCanvas.height = h;
    const { idx, nextIdx, alpha } = getFrameAtTime(project, elapsed);
    const ctx = previewCanvas.getContext('2d');
    const canvasA = getPreviewCanvas(project.images[idx], project, w, h);
    ctx.globalAlpha = 1;
    ctx.drawImage(canvasA, 0, 0);
    if (alpha > 0) {
      const canvasB = getPreviewCanvas(project.images[nextIdx], project, w, h);
      ctx.globalAlpha = alpha;
      ctx.drawImage(canvasB, 0, 0);
      ctx.globalAlpha = 1;
    }
  }

  function tick() {
    if (!playing) return;
    const elapsed = (performance.now() - playStartTime) / 1000;
    drawPlaybackFrame(elapsed);
    rafId = requestAnimationFrame(tick);
  }

  function startPlayback() {
    const project = getActiveProject();
    if (!project || !project.images.length) {
      toast('Bitte zuerst Bilder importieren.', true);
      return;
    }
    playing = true;
    btnPlayPause.textContent = '⏸ Pause';
    playStartTime = performance.now();
    if (project.music) {
      audioPlayer.currentTime = 0;
      audioPlayer.play().catch(() => {});
    }
    tick();
  }

  function stopPlayback() {
    playing = false;
    btnPlayPause.textContent = '▶ Loop abspielen';
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    audioPlayer.pause();
    renderPreview();
  }

  btnPlayPause.addEventListener('click', () => {
    if (playing) stopPlayback();
    else startPlayback();
  });

  // ---------- Projekte ----------

  function renderProjectSelect() {
    projectSelect.innerHTML = '';
    state.projects.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === state.activeProjectId) opt.selected = true;
      projectSelect.appendChild(opt);
    });
  }

  function onProjectSwitched() {
    stopPlayback();
    frameCache.clear();
    imageElements.clear();
    logoElement = null;
    const project = getActiveProject();
    if (project) {
      project.images.forEach((im) => {
        loadImageElement(im.dataUrl).then((el) => {
          imageElements.set(im.id, el);
          scheduleRender();
        });
      });
      if (project.logo) {
        loadImageElement(project.logo.dataUrl).then((el) => {
          logoElement = el;
          scheduleRender();
        });
      }
      transitionDurationInput.value = project.transitionDuration;
      transitionValueEl.textContent = project.transitionDuration.toFixed(1) + 's';
      resolutionSelect.value = project.resolution;
      audioPlayer.src = project.music ? project.music.fileUrl : '';
    }
    renderImageList();
    buildEffectPanel();
    buildPresetList();
    refreshLogoUI();
    refreshMusicInfo();
    renderPreview();
  }

  projectSelect.addEventListener('change', () => {
    state.activeProjectId = projectSelect.value;
    onProjectSwitched();
    schedulePersist();
  });

  btnNewProject.addEventListener('click', () => {
    const name = prompt('Name des neuen Projekts:', `Projekt ${state.projects.length + 1}`);
    if (!name) return;
    const project = createEmptyProject(name);
    state.projects.push(project);
    state.activeProjectId = project.id;
    renderProjectSelect();
    onProjectSwitched();
    schedulePersist();
  });

  btnRenameProject.addEventListener('click', () => {
    const project = getActiveProject();
    if (!project) return;
    const name = prompt('Neuer Projektname:', project.name);
    if (!name) return;
    project.name = name;
    renderProjectSelect();
    schedulePersist();
  });

  btnDeleteProject.addEventListener('click', () => {
    if (state.projects.length <= 1) {
      toast('Das letzte Projekt kann nicht gelöscht werden.', true);
      return;
    }
    const project = getActiveProject();
    if (!project || !confirm(`Projekt "${project.name}" wirklich löschen?`)) return;
    state.projects = state.projects.filter((p) => p.id !== project.id);
    state.activeProjectId = state.projects[0].id;
    renderProjectSelect();
    onProjectSwitched();
    schedulePersist();
  });

  // ---------- Bilder ----------

  function renderImageList() {
    imageListEl.innerHTML = '';
    const project = getActiveProject();
    if (!project) return;
    project.images.forEach((image, index) => {
      const li = document.createElement('li');
      li.className = 'image-item' + (image.id === project.activeImageId ? ' active' : '');
      li.draggable = true;
      li.dataset.index = String(index);

      const img = document.createElement('img');
      img.src = image.dataUrl;
      img.alt = image.name;

      const name = document.createElement('span');
      name.className = 'image-name';
      name.textContent = image.name;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'image-remove';
      removeBtn.textContent = '✕';
      removeBtn.title = 'Bild entfernen';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeImage(image.id);
      });

      li.addEventListener('click', () => selectImage(image.id));
      li.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(index));
      });
      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        li.classList.add('drag-over');
      });
      li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        li.classList.remove('drag-over');
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (Number.isNaN(fromIndex) || fromIndex === index) return;
        const [moved] = project.images.splice(fromIndex, 1);
        project.images.splice(index, 0, moved);
        renderImageList();
        scheduleRender();
        schedulePersist();
      });

      li.append(img, name, removeBtn);
      imageListEl.appendChild(li);
    });
    previewEmptyEl.hidden = project.images.length > 0;
  }

  function selectImage(id) {
    const project = getActiveProject();
    if (!project) return;
    project.activeImageId = id;
    renderImageList();
    buildEffectPanel();
    scheduleRender();
    schedulePersist();
  }

  function removeImage(id) {
    const project = getActiveProject();
    if (!project) return;
    project.images = project.images.filter((im) => im.id !== id);
    imageElements.delete(id);
    frameCache.delete(id);
    if (project.activeImageId === id) {
      project.activeImageId = project.images.length ? project.images[0].id : null;
    }
    renderImageList();
    buildEffectPanel();
    scheduleRender();
    schedulePersist();
  }

  btnAddImages.addEventListener('click', async () => {
    const files = await window.editorAPI.selectImages();
    if (!files || !files.length) return;
    const project = getActiveProject();
    if (!project) return;
    for (const f of files) {
      const id = uid();
      const image = { id, name: f.name, dataUrl: f.dataUrl, effects: Object.assign({}, FotoEffects.DEFAULT_EFFECTS) };
      project.images.push(image);
      try {
        imageElements.set(id, await loadImageElement(f.dataUrl));
      } catch (err) {
        toast('Bild konnte nicht geladen werden: ' + f.name, true);
      }
      if (!project.activeImageId) project.activeImageId = id;
    }
    renderImageList();
    buildEffectPanel();
    scheduleRender();
    schedulePersist();
  });

  // ---------- Logo ----------

  function refreshLogoUI() {
    const project = getActiveProject();
    const has = !!(project && project.logo);
    logoPreview.hidden = !has;
    logoControls.hidden = !has;
    btnRemoveLogo.hidden = !has;
    if (!has) return;
    const logo = project.logo;
    logoPreview.src = logo.dataUrl;
    logoX.value = logo.x;
    document.getElementById('logoXValue').textContent = logo.x + '%';
    logoY.value = logo.y;
    document.getElementById('logoYValue').textContent = logo.y + '%';
    logoScale.value = logo.scale;
    document.getElementById('logoScaleValue').textContent = logo.scale + '%';
    logoRotation.value = logo.rotation;
    document.getElementById('logoRotationValue').textContent = logo.rotation + '°';
    logoOpacity.value = logo.opacity;
    document.getElementById('logoOpacityValue').textContent = logo.opacity + '%';
    logoBlendMode.value = logo.blendMode;
    logoVisible.checked = logo.visible !== false;
  }

  btnAddLogo.addEventListener('click', async () => {
    const logo = await window.editorAPI.selectLogo();
    if (!logo) return;
    const project = getActiveProject();
    if (!project) return;
    project.logo = {
      path: logo.path,
      name: logo.name,
      dataUrl: logo.dataUrl,
      x: 82,
      y: 85,
      scale: 60,
      rotation: 0,
      opacity: 90,
      blendMode: 'source-over',
      visible: true
    };
    logoElement = await loadImageElement(logo.dataUrl);
    refreshLogoUI();
    scheduleRender();
    schedulePersist();
  });

  btnRemoveLogo.addEventListener('click', () => {
    const project = getActiveProject();
    if (!project) return;
    project.logo = null;
    logoElement = null;
    refreshLogoUI();
    scheduleRender();
    schedulePersist();
  });

  [
    ['logoX', 'x', '%'],
    ['logoY', 'y', '%'],
    ['logoScale', 'scale', '%'],
    ['logoRotation', 'rotation', '°'],
    ['logoOpacity', 'opacity', '%']
  ].forEach(([elId, key, unit]) => {
    const el = document.getElementById(elId);
    el.addEventListener('input', () => {
      const project = getActiveProject();
      if (!project || !project.logo) return;
      project.logo[key] = parseFloat(el.value);
      document.getElementById(elId + 'Value').textContent = el.value + unit;
      scheduleRender();
      schedulePersist();
    });
  });

  logoBlendMode.addEventListener('change', () => {
    const project = getActiveProject();
    if (!project || !project.logo) return;
    project.logo.blendMode = logoBlendMode.value;
    scheduleRender();
    schedulePersist();
  });

  logoVisible.addEventListener('change', () => {
    const project = getActiveProject();
    if (!project || !project.logo) return;
    project.logo.visible = logoVisible.checked;
    scheduleRender();
    schedulePersist();
  });

  // ---------- Musik ----------

  function refreshMusicInfo() {
    const project = getActiveProject();
    if (!project || !project.music) {
      musicInfo.textContent = 'Keine Musik ausgewählt – die Loop-Länge richtet sich nach der Musik.';
      return;
    }
    musicInfo.textContent = `${project.music.name} · ${formatDuration(project.music.duration)}`;
  }

  btnAddMusic.addEventListener('click', async () => {
    const music = await window.editorAPI.selectMusic();
    if (!music) return;
    const project = getActiveProject();
    if (!project) return;
    project.music = music;
    audioPlayer.src = music.fileUrl;
    refreshMusicInfo();
    scheduleRender();
    schedulePersist();
  });

  // ---------- Übergang & Auflösung ----------

  transitionDurationInput.addEventListener('input', () => {
    const project = getActiveProject();
    if (!project) return;
    project.transitionDuration = parseFloat(transitionDurationInput.value);
    transitionValueEl.textContent = project.transitionDuration.toFixed(1) + 's';
    scheduleRender();
    schedulePersist();
  });

  resolutionSelect.addEventListener('change', () => {
    const project = getActiveProject();
    if (!project) return;
    project.resolution = resolutionSelect.value;
    frameCache.clear();
    scheduleRender();
    schedulePersist();
  });

  // ---------- Effekt-Panel (generisch aus effects.js-Konfiguration) ----------

  function buildFieldRow(field, effects) {
    const row = document.createElement('label');
    if (field.type === 'checkbox') {
      row.className = 'control-row control-row-checkbox';
      const span = document.createElement('span');
      span.textContent = field.label;
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!effects[field.key];
      input.addEventListener('change', () => {
        effects[field.key] = input.checked;
        scheduleRender();
        schedulePersist();
      });
      row.append(span, input);
      return row;
    }
    if (field.type === 'color') {
      row.className = 'control-row';
      const span = document.createElement('span');
      span.textContent = field.label;
      const input = document.createElement('input');
      input.type = 'color';
      input.value = effects[field.key];
      const filler = document.createElement('span');
      input.addEventListener('input', () => {
        effects[field.key] = input.value;
        scheduleRender();
        schedulePersist();
      });
      row.append(span, input, filler);
      return row;
    }
    row.className = 'control-row';
    const span = document.createElement('span');
    span.textContent = field.label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(effects[field.key]);
    const output = document.createElement('output');
    output.textContent = `${effects[field.key]}${field.unit || ''}`;
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      effects[field.key] = val;
      output.textContent = `${val}${field.unit || ''}`;
      scheduleRender();
      schedulePersist();
    });
    row.append(span, input, output);
    return row;
  }

  function buildEffectPanel() {
    effectGroupsEl.innerHTML = '';
    const image = getActiveImage();
    activeImageNameEl.textContent = image ? `– ${image.name}` : '– kein Bild ausgewählt';
    if (!image) {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'Wähle links ein Bild aus der Liste, um seine Effekte zu bearbeiten.';
      effectGroupsEl.appendChild(hint);
      return;
    }
    FotoEffects.EFFECT_GROUPS.forEach((group, gi) => {
      const details = document.createElement('details');
      details.className = 'effect-group';
      details.open = gi <= 1;
      const summary = document.createElement('summary');
      summary.textContent = group.title;
      details.appendChild(summary);
      const wrap = document.createElement('div');
      wrap.className = 'controls';
      group.fields.forEach((field) => wrap.appendChild(buildFieldRow(field, image.effects)));
      details.appendChild(wrap);
      effectGroupsEl.appendChild(details);
    });
  }

  btnApplyAll.addEventListener('click', () => {
    const project = getActiveProject();
    const image = getActiveImage();
    if (!project || !image) return;
    project.images.forEach((im) => {
      im.effects = Object.assign({}, image.effects);
    });
    frameCache.clear();
    renderImageList();
    scheduleRender();
    schedulePersist();
    toast('Effekte auf alle Bilder im Projekt angewendet.');
  });

  btnResetEffects.addEventListener('click', () => {
    const image = getActiveImage();
    if (!image) return;
    image.effects = Object.assign({}, FotoEffects.DEFAULT_EFFECTS);
    buildEffectPanel();
    scheduleRender();
    schedulePersist();
  });

  // ---------- Presets ----------

  function applyPreset(effectsPartial) {
    const image = getActiveImage();
    if (!image) {
      toast('Bitte zuerst ein Bild auswählen.', true);
      return;
    }
    image.effects = Object.assign({}, FotoEffects.DEFAULT_EFFECTS, effectsPartial);
    buildEffectPanel();
    scheduleRender();
    schedulePersist();
  }

  function buildPresetList() {
    presetListEl.innerHTML = '';
    const project = getActiveProject();
    FotoEffects.PRESETS.forEach((preset) => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = preset.name;
      btn.addEventListener('click', () => applyPreset(preset.effects));
      presetListEl.appendChild(btn);
    });
    ((project && project.customPresets) || []).forEach((preset) => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn custom';
      btn.title = 'Rechtsklick zum Löschen';
      btn.textContent = preset.name;
      btn.addEventListener('click', () => applyPreset(preset.effects));
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (confirm(`Preset "${preset.name}" löschen?`)) {
          project.customPresets = project.customPresets.filter((p) => p !== preset);
          buildPresetList();
          schedulePersist();
        }
      });
      presetListEl.appendChild(btn);
    });
  }

  btnSavePreset.addEventListener('click', () => {
    const project = getActiveProject();
    const image = getActiveImage();
    if (!project || !image) {
      toast('Bitte zuerst ein Bild auswählen.', true);
      return;
    }
    const name = prompt('Name für das Preset:');
    if (!name) return;
    project.customPresets = project.customPresets || [];
    project.customPresets.push({ name, effects: Object.assign({}, image.effects) });
    buildPresetList();
    schedulePersist();
  });

  // ---------- Export ----------

  function setExportProgress(percent, label) {
    exportProgressBar.style.width = percent + '%';
    exportProgressLabel.textContent = `${percent}% – ${label}`;
  }

  btnExport.addEventListener('click', async () => {
    const project = getActiveProject();
    if (!project || !project.images.length) {
      toast('Bitte zuerst mindestens ein Bild importieren.', true);
      return;
    }
    if (!project.music) {
      toast('Bitte zuerst Hintergrundmusik auswählen – die Loop-Länge wird daran ausgerichtet.', true);
      return;
    }
    const n = project.images.length;
    const d = project.transitionDuration;
    const audioDuration = project.music.duration;
    if (!audioDuration || audioDuration < 1) {
      toast('Die Musikdatei konnte nicht analysiert werden.', true);
      return;
    }
    const t = (audioDuration - d) / n;
    if (t <= d || t <= 0.3) {
      toast('Zu viele Bilder oder Übergang zu lang für die Musiklänge. Übergang verkürzen oder weniger Bilder verwenden.', true);
      return;
    }

    const [width, height] = project.resolution.split('x').map(Number);
    const clipDuration = t + d;
    const offsets = [];
    for (let k = 1; k < n; k++) offsets.push(k * t);

    stopPlayback();
    btnExport.disabled = true;
    exportProgressWrap.hidden = false;
    exportResultEl.textContent = '';
    setExportProgress(0, 'Export wird vorbereitet …');

    let unsubscribe = null;
    try {
      const defaultName = `${sanitizeFileName(project.name)}.mp4`;
      const outputPath = await window.editorAPI.selectExportPath(defaultName);
      if (!outputPath) {
        btnExport.disabled = false;
        exportProgressWrap.hidden = true;
        return;
      }

      const tempDir = await window.editorAPI.exportBegin();

      for (let i = 0; i < n; i++) {
        const image = project.images[i];
        const imgEl = imageElements.get(image.id) || (await loadImageElement(image.dataUrl));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        FotoEffects.renderComposite(ctx, width, height, {
          image: imgEl,
          effects: image.effects,
          logoImage: logoElement,
          logo: project.logo
        });
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        const buffer = new Uint8Array(await blob.arrayBuffer());
        await window.editorAPI.exportWriteFrame(tempDir, i, buffer);
        setExportProgress(Math.round(((i + 1) / n) * 30), `Rendere Bild ${i + 1} von ${n} …`);
      }

      unsubscribe = window.editorAPI.onExportProgress((percent) => {
        setExportProgress(30 + Math.round(percent * 0.7), 'Video wird zusammengesetzt …');
      });

      const result = await window.editorAPI.exportRenderVideo({
        tempDir,
        frameCount: n,
        clipDuration,
        transitionDuration: d,
        offsets,
        totalDuration: audioDuration,
        width,
        height,
        fps: 30,
        musicPath: project.music.path,
        outputPath
      });

      setExportProgress(100, 'Fertig!');
      exportResultEl.innerHTML = '';
      const successText = document.createElement('span');
      successText.textContent = `Loop-Video gespeichert: ${result.outputPath} `;
      const showBtn = document.createElement('button');
      showBtn.className = 'btn-ghost';
      showBtn.textContent = 'Im Ordner anzeigen';
      showBtn.addEventListener('click', () => window.editorAPI.showInFolder(result.outputPath));
      exportResultEl.append(successText, showBtn);
      toast('Export abgeschlossen!');
    } catch (err) {
      toast('Export fehlgeschlagen: ' + (err && err.message ? err.message : String(err)), true);
    } finally {
      if (unsubscribe) unsubscribe();
      btnExport.disabled = false;
      setTimeout(() => {
        exportProgressWrap.hidden = true;
      }, 1500);
    }
  });

  btnCancelExport.addEventListener('click', async () => {
    await window.editorAPI.exportCancel();
    toast('Export abgebrochen.', true);
  });

  // ---------- Initialisierung ----------

  async function init() {
    const loaded = await window.editorAPI.loadData();
    if (loaded && Array.isArray(loaded.projects) && loaded.projects.length) {
      state = loaded;
      state.projects.forEach((p) => {
        if (!p.customPresets) p.customPresets = [];
        if (p.transitionDuration == null) p.transitionDuration = 1;
        if (!p.resolution) p.resolution = '1920x1080';
        p.images.forEach((im) => {
          im.effects = Object.assign({}, FotoEffects.DEFAULT_EFFECTS, im.effects);
        });
      });
      if (!state.projects.find((p) => p.id === state.activeProjectId)) {
        state.activeProjectId = state.projects[0].id;
      }
    } else {
      const project = createEmptyProject('Mein erstes Projekt');
      state = { projects: [project], activeProjectId: project.id };
    }
    renderProjectSelect();
    onProjectSwitched();
  }

  init();
})();
