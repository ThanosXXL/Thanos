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
  const logoLoopEnabled = document.getElementById('logoLoopEnabled');
  const logoLoopSpeed = document.getElementById('logoLoopSpeed');

  const btnAddMusic = document.getElementById('btnAddMusic');
  const musicInfo = document.getElementById('musicInfo');
  const audioPlayer = document.getElementById('audioPlayer');

  const collageTemplateGrid = document.getElementById('collageTemplateGrid');
  const collageBorderStyle = document.getElementById('collageBorderStyle');
  const collageSlotList = document.getElementById('collageSlotList');
  const collageSizeRow = document.getElementById('collageSizeRow');
  const printSizeRow = document.getElementById('printSizeRow');
  const btnModeSingle = document.getElementById('btnModeSingle');
  const btnModeCollage = document.getElementById('btnModeCollage');

  const previewCanvas = document.getElementById('previewCanvas');
  const previewEmptyEl = document.getElementById('previewEmpty');
  const btnSaveImage = document.getElementById('btnSaveImage');
  const btnShareImage = document.getElementById('btnShareImage');
  const imageActionsHint = document.getElementById('imageActionsHint');
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

  const suggestionCard = document.getElementById('suggestionCard');
  const suggestionText = document.getElementById('suggestionText');
  const btnSuggestionAccept = document.getElementById('btnSuggestionAccept');
  const btnSuggestionReject = document.getElementById('btnSuggestionReject');

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
  const dismissedSuggestions = new Set();
  let currentSuggestion = null;

  let playing = false;
  let playStartTime = 0;
  const clockStart = performance.now();
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

  function createBlackPlaceholderDataUrl(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    return canvas.toDataURL('image/png');
  }

  // Das mitgelieferte FotoWelt-Kamera-Logo, groß und mit Glanz-Loop – Standard für das
  // allererste Projekt, damit es dauerhaft (über die normale Persistenz) erhalten bleibt.
  function createDefaultLogo() {
    return Object.assign({}, FotoEffects.DEFAULT_LOGO, {
      path: null,
      name: 'FotoWelt Logo',
      dataUrl: 'assets/fotowelt-logo.svg',
      x: 50,
      y: 50,
      scale: 200,
      rotation: 0,
      opacity: 100,
      loopEnabled: true,
      loopSpeed: 2.6,
      blendMode: 'source-over'
    });
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
      customPresets: [],
      previewMode: 'single',
      collage: { templateId: null, slots: [], borderStyle: 'none' },
      photoSize: '10x15',
      collageSize: '30x40'
    };
  }

  // ---------- Rendering pipeline ----------
  // Der Bild-Hintergrund (teure Effekte: Weichzeichner, Duoton, Grain, …) wird pro Bild
  // gecacht und nur bei Änderung neu berechnet. Das Logo wird JEDEN Frame separat obendrauf
  // gezeichnet, damit sein Gold-Glanz-Loop unabhängig vom Cache kontinuierlich animiert.

  function baseCacheKey(image, w, h) {
    return JSON.stringify(image.effects) + '|' + w + 'x' + h;
  }

  function getBaseCanvas(image, w, h) {
    const key = baseCacheKey(image, w, h);
    const cached = frameCache.get(image.id);
    if (cached && cached.key === key) return cached.canvas;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const imgEl = imageElements.get(image.id);
    if (imgEl) {
      FotoEffects.renderBase(ctx, w, h, { image: imgEl, effects: image.effects });
    }
    frameCache.set(image.id, { key, canvas });
    return canvas;
  }

  // scheduleRender() ist aus Kompatibilität an vielen Stellen aufgerufen, aber die
  // durchgehende mainLoop() unten liest Zustand live – ein manuelles Neuzeichnen ist
  // nicht mehr nötig.
  function scheduleRender() {}

  function getCollageTemplate(project) {
    if (!project || !project.collage || !project.collage.templateId) return null;
    return FotoEffects.COLLAGE_TEMPLATES.find((t) => t.id === project.collage.templateId) || null;
  }

  function buildSlotImages(project, template) {
    const slots = (project.collage && project.collage.slots) || [];
    return template.slots.map((_, i) => {
      const imageId = slots[i];
      if (!imageId) return null;
      const imageObj = project.images.find((im) => im.id === imageId);
      const imgEl = imageElements.get(imageId);
      if (!imageObj || !imgEl) return null;
      return { image: imgEl, effects: imageObj.effects };
    });
  }

  function mainLoop() {
    const project = getActiveProject();
    const ctx = previewCanvas.getContext('2d');
    if (!project) {
      previewEmptyEl.hidden = false;
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      requestAnimationFrame(mainLoop);
      return;
    }

    const nowSec = (performance.now() - clockStart) / 1000;

    if (project.previewMode === 'collage') {
      const template = getCollageTemplate(project);
      const slotImages = template ? buildSlotImages(project, template) : [];
      const hasAnyImage = slotImages.some((s) => s);
      if (!template || !hasAnyImage) {
        previewEmptyEl.textContent = 'Wähle eine Collage-Vorlage und ordne Bilder den Feldern zu.';
        previewEmptyEl.hidden = false;
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        requestAnimationFrame(mainLoop);
        return;
      }
      previewEmptyEl.hidden = true;
      const { w, h } = computePreviewSize(project.resolution);
      if (previewCanvas.width !== w || previewCanvas.height !== h) {
        previewCanvas.width = w;
        previewCanvas.height = h;
      }
      FotoEffects.renderCollage(ctx, w, h, {
        template,
        slotImages,
        logoImage: project.logo && logoElement ? logoElement : null,
        logo: project.logo,
        time: nowSec,
        borderStyle: project.collage.borderStyle
      });
      requestAnimationFrame(mainLoop);
      return;
    }

    if (!project.images.length) {
      previewEmptyEl.textContent = 'Importiere Bilder, um die 3D-Hochglanz-Vorschau zu sehen';
      previewEmptyEl.hidden = false;
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      requestAnimationFrame(mainLoop);
      return;
    }
    previewEmptyEl.hidden = true;
    const { w, h } = computePreviewSize(project.resolution);
    if (previewCanvas.width !== w || previewCanvas.height !== h) {
      previewCanvas.width = w;
      previewCanvas.height = h;
    }

    let idx, nextIdx, alpha;
    if (playing) {
      const elapsed = (performance.now() - playStartTime) / 1000;
      ({ idx, nextIdx, alpha } = getFrameAtTime(project, elapsed));
    } else {
      const activeImage = getActiveImage() || project.images[0];
      idx = project.images.indexOf(activeImage);
      if (idx < 0) idx = 0;
      nextIdx = idx;
      alpha = 0;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.drawImage(getBaseCanvas(project.images[idx], w, h), 0, 0);
    if (alpha > 0) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(getBaseCanvas(project.images[nextIdx], w, h), 0, 0);
      ctx.globalAlpha = 1;
    }

    if (project.logo && logoElement) {
      FotoEffects.compositeLogo(ctx, w, h, { logoImage: logoElement, logo: project.logo, time: nowSec });
    }

    requestAnimationFrame(mainLoop);
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
  }

  function stopPlayback() {
    playing = false;
    btnPlayPause.textContent = '▶ Loop abspielen';
    audioPlayer.pause();
  }

  btnPlayPause.addEventListener('click', () => {
    if (playing) stopPlayback();
    else startPlayback();
  });

  // ---------- Bild speichern & teilen ----------
  // Schnelle Aktionen für das AKTUELL bearbeitete Einzelbild (mit Effekten + Logo), unabhängig
  // vom vollen Loop-Video-Export weiter unten.

  function getActivePrintSize(project) {
    const isCollage = project.previewMode === 'collage';
    const list = isCollage ? FotoEffects.COLLAGE_SIZES : FotoEffects.PHOTO_SIZES;
    const id = isCollage ? project.collageSize : project.photoSize;
    return list.find((s) => s.id === id) || list[0];
  }

  async function renderCurrentViewToBlob() {
    const project = getActiveProject();
    if (!project) return null;
    const size = getActivePrintSize(project);
    const width = FotoEffects.cmToPx(size.widthCm);
    const height = FotoEffects.cmToPx(size.heightCm);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (project.previewMode === 'collage') {
      const template = getCollageTemplate(project);
      if (!template) return null;
      const slotImages = buildSlotImages(project, template);
      if (!slotImages.some((s) => s)) return null;
      FotoEffects.renderCollage(ctx, width, height, {
        template,
        slotImages,
        logoImage: logoElement,
        logo: project.logo,
        time: null,
        borderStyle: project.collage.borderStyle
      });
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    }

    const image = getActiveImage();
    if (!image) return null;
    const imgEl = imageElements.get(image.id) || (await loadImageElement(image.dataUrl));
    FotoEffects.renderBase(ctx, width, height, { image: imgEl, effects: image.effects });
    FotoEffects.compositeLogo(ctx, width, height, { logoImage: logoElement, logo: project.logo, time: null });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  function currentViewIsReady() {
    const project = getActiveProject();
    if (!project) return false;
    if (project.previewMode === 'collage') {
      const template = getCollageTemplate(project);
      return !!(template && buildSlotImages(project, template).some((s) => s));
    }
    return !!getActiveImage();
  }

  btnSaveImage.addEventListener('click', async () => {
    if (!currentViewIsReady()) {
      toast('Bitte zuerst ein Bild bzw. eine Collage mit Bildern auswählen.', true);
      return;
    }
    const project = getActiveProject();
    const blob = await renderCurrentViewToBlob();
    if (!blob) return;
    const buffer = new Uint8Array(await blob.arrayBuffer());
    const isCollage = project.previewMode === 'collage';
    const image = getActiveImage();
    const size = getActivePrintSize(project);
    const sizeSuffix = `${size.widthCm}x${size.heightCm}cm`;
    const baseName = isCollage
      ? sanitizeFileName(project.name) + '-collage-' + sizeSuffix
      : (sanitizeFileName(image.name.replace(/\.[^.]+$/, '')) || 'fotowelt-bild') + '-' + sizeSuffix;
    const savedPath = await window.editorAPI.saveImage(`${baseName}.png`, buffer);
    if (savedPath) {
      toast('Bild gespeichert.');
      imageActionsHint.textContent = `Gespeichert: ${savedPath}`;
    }
  });

  btnShareImage.addEventListener('click', async () => {
    if (!currentViewIsReady()) {
      toast('Bitte zuerst ein Bild bzw. eine Collage mit Bildern auswählen.', true);
      return;
    }
    const blob = await renderCurrentViewToBlob();
    if (!blob) return;
    const buffer = new Uint8Array(await blob.arrayBuffer());
    await window.editorAPI.copyImageToClipboard(buffer);
    imageActionsHint.textContent = 'In der Zwischenablage – jetzt irgendwo einfügen (Mail, Chat, Dokument …).';
    toast('Bild in die Zwischenablage kopiert.');
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
    btnModeSingle.classList.toggle('active', (project ? project.previewMode : 'single') !== 'collage');
    btnModeCollage.classList.toggle('active', !!project && project.previewMode === 'collage');
    buildCollageTemplateGrid();
    buildCollageSlotList();
    buildPhotoSizeButtons();
    buildCollageSizeButtons();
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
    dismissedSuggestions.delete(id);
    if (project.activeImageId === id) {
      project.activeImageId = project.images.length ? project.images[0].id : null;
    }
    if (project.collage && project.collage.slots) {
      project.collage.slots = project.collage.slots.map((slotId) => (slotId === id ? null : slotId));
    }
    renderImageList();
    buildEffectPanel();
    buildCollageSlotList();
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
    buildCollageSlotList();
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
    logoLoopEnabled.checked = logo.loopEnabled !== false;
    logoLoopSpeed.value = logo.loopSpeed != null ? logo.loopSpeed : 2.5;
    document.getElementById('logoLoopSpeedValue').textContent = (logo.loopSpeed != null ? logo.loopSpeed : 2.5).toFixed(1) + 's';
  }

  btnAddLogo.addEventListener('click', async () => {
    const logo = await window.editorAPI.selectLogo();
    if (!logo) return;
    const project = getActiveProject();
    if (!project) return;
    project.logo = Object.assign({}, FotoEffects.DEFAULT_LOGO, {
      path: logo.path,
      name: logo.name,
      dataUrl: logo.dataUrl
    });
    logoElement = await loadImageElement(logo.dataUrl);
    refreshLogoUI();
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
    schedulePersist();
  });

  logoLoopEnabled.addEventListener('change', () => {
    const project = getActiveProject();
    if (!project || !project.logo) return;
    project.logo.loopEnabled = logoLoopEnabled.checked;
    schedulePersist();
  });

  logoLoopSpeed.addEventListener('input', () => {
    const project = getActiveProject();
    if (!project || !project.logo) return;
    project.logo.loopSpeed = parseFloat(logoLoopSpeed.value);
    document.getElementById('logoLoopSpeedValue').textContent = parseFloat(logoLoopSpeed.value).toFixed(1) + 's';
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

  // ---------- Vorschau-Modus (Einzelbild / Collage) ----------

  function setPreviewMode(mode) {
    const project = getActiveProject();
    if (!project) return;
    project.previewMode = mode;
    btnModeSingle.classList.toggle('active', mode === 'single');
    btnModeCollage.classList.toggle('active', mode === 'collage');
    schedulePersist();
  }

  btnModeSingle.addEventListener('click', () => setPreviewMode('single'));
  btnModeCollage.addEventListener('click', () => setPreviewMode('collage'));

  // ---------- Collagen ----------
  // Vorlagen kombinieren mehrere der bereits importierten (echten) Bilder in festen
  // Feldern; jedes Feld behält die für das jeweilige Bild eingestellten Effekte.

  function buildCollageTemplateGrid() {
    collageTemplateGrid.innerHTML = '';
    const project = getActiveProject();
    if (!project) return;
    collageBorderStyle.value = project.collage.borderStyle || 'none';
    FotoEffects.COLLAGE_TEMPLATES.forEach((template) => {
      const btn = document.createElement('button');
      btn.className = 'collage-template-btn' + (project.collage.templateId === template.id ? ' active' : '');
      btn.title = template.name;
      template.slots.forEach((slot) => {
        const preview = document.createElement('span');
        preview.className = 'slot-preview';
        preview.style.left = slot.x * 100 + '%';
        preview.style.top = slot.y * 100 + '%';
        preview.style.width = slot.w * 100 + '%';
        preview.style.height = slot.h * 100 + '%';
        btn.appendChild(preview);
      });
      btn.addEventListener('click', () => selectCollageTemplate(template.id));
      collageTemplateGrid.appendChild(btn);
    });
  }

  function selectCollageTemplate(templateId) {
    const project = getActiveProject();
    if (!project) return;
    const template = FotoEffects.COLLAGE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const oldSlots = project.collage.slots || [];
    project.collage = {
      templateId,
      slots: template.slots.map((_, i) => oldSlots[i] || null),
      borderStyle: project.collage.borderStyle || 'none'
    };
    buildCollageTemplateGrid();
    buildCollageSlotList();
    schedulePersist();
  }

  collageBorderStyle.addEventListener('change', () => {
    const project = getActiveProject();
    if (!project) return;
    project.collage.borderStyle = collageBorderStyle.value;
    schedulePersist();
  });

  // ---------- Druckgrößen (Bildergröße / Collagen-Größe) ----------
  // Feste cm-Zielgrößen für Speichern & Teilen, statt freier Pixel-Auflösung –
  // das gespeicherte/geteilte Bild passt dann direkt für einen echten Fotoabzug.

  function buildPhotoSizeButtons() {
    printSizeRow.innerHTML = '';
    const project = getActiveProject();
    if (!project) return;
    FotoEffects.PHOTO_SIZES.forEach((size) => {
      const btn = document.createElement('button');
      btn.className = 'print-size-btn' + (project.photoSize === size.id ? ' active' : '');
      btn.textContent = size.label;
      btn.addEventListener('click', () => {
        project.photoSize = size.id;
        buildPhotoSizeButtons();
        schedulePersist();
      });
      printSizeRow.appendChild(btn);
    });
  }

  function buildCollageSizeButtons() {
    collageSizeRow.innerHTML = '';
    const project = getActiveProject();
    if (!project) return;
    FotoEffects.COLLAGE_SIZES.forEach((size) => {
      const btn = document.createElement('button');
      btn.className = 'print-size-btn' + (project.collageSize === size.id ? ' active' : '');
      btn.textContent = size.label;
      btn.addEventListener('click', () => {
        project.collageSize = size.id;
        buildCollageSizeButtons();
        schedulePersist();
      });
      collageSizeRow.appendChild(btn);
    });
  }

  function buildCollageSlotList() {
    collageSlotList.innerHTML = '';
    const project = getActiveProject();
    if (!project) return;
    const template = getCollageTemplate(project);
    if (!template) {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'Wähle oben eine Vorlage aus.';
      collageSlotList.appendChild(hint);
      return;
    }
    template.slots.forEach((slot, i) => {
      const row = document.createElement('div');
      row.className = 'collage-slot-row';

      const label = document.createElement('span');
      label.className = 'slot-label';
      label.textContent = `Feld ${i + 1}`;

      const select = document.createElement('select');
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '– kein Bild –';
      select.appendChild(emptyOpt);
      project.images.forEach((image) => {
        const opt = document.createElement('option');
        opt.value = image.id;
        opt.textContent = image.name;
        if (project.collage.slots[i] === image.id) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener('change', () => {
        project.collage.slots[i] = select.value || null;
        if (select.value) selectImage(select.value);
        schedulePersist();
      });

      row.append(label, select);
      collageSlotList.appendChild(row);
    });
  }

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
      updateSuggestion();
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
    updateSuggestion();
  }

  // ---------- Automatische Verbesserung ----------

  function updateSuggestion() {
    const image = getActiveImage();
    if (!image || dismissedSuggestions.has(image.id)) {
      currentSuggestion = null;
      suggestionCard.hidden = true;
      return;
    }
    const imgEl = imageElements.get(image.id);
    const suggestion = imgEl ? FotoEffects.suggestImprovement(imgEl, image.effects) : null;
    if (!suggestion) {
      currentSuggestion = null;
      suggestionCard.hidden = true;
      return;
    }
    currentSuggestion = suggestion;
    suggestionText.textContent = suggestion.description;
    suggestionCard.hidden = false;
  }

  btnSuggestionAccept.addEventListener('click', () => {
    const image = getActiveImage();
    if (!image || !currentSuggestion) return;
    Object.assign(image.effects, currentSuggestion.changes);
    suggestionCard.hidden = true;
    currentSuggestion = null;
    buildEffectPanel();
    schedulePersist();
    toast('Verbesserung übernommen.');
  });

  btnSuggestionReject.addEventListener('click', () => {
    const image = getActiveImage();
    if (!image) return;
    dismissedSuggestions.add(image.id);
    currentSuggestion = null;
    suggestionCard.hidden = true;
  });

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
    dismissedSuggestions.delete(image.id);
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
    if (!project) return;
    const isCollageExport = project.previewMode === 'collage';

    let collageTemplate = null;
    let collageSlotImages = null;
    if (isCollageExport) {
      collageTemplate = getCollageTemplate(project);
      collageSlotImages = collageTemplate ? buildSlotImages(project, collageTemplate) : null;
      if (!collageTemplate || !collageSlotImages.some((s) => s)) {
        toast('Bitte zuerst eine Collage-Vorlage wählen und Bilder zuordnen.', true);
        return;
      }
    } else if (!project.images.length) {
      toast('Bitte zuerst mindestens ein Bild importieren.', true);
      return;
    }
    if (!project.music) {
      toast('Bitte zuerst Hintergrundmusik auswählen – die Loop-Länge wird daran ausgerichtet.', true);
      return;
    }
    const audioDuration = project.music.duration;
    if (!audioDuration || audioDuration < 1) {
      toast('Die Musikdatei konnte nicht analysiert werden.', true);
      return;
    }

    // Eine Collage ist EIN Motiv (kein Bilderwechsel) – die Loop-Länge entspricht
    // direkt der Musiklänge, kein Übergang zwischen mehreren Szenen nötig.
    let n, d, t, clipDuration, offsets;
    if (isCollageExport) {
      n = 1;
      d = 0;
      t = audioDuration;
      clipDuration = audioDuration;
      offsets = [];
    } else {
      n = project.images.length;
      d = project.transitionDuration;
      t = (audioDuration - d) / n;
      if (t <= d || t <= 0.3) {
        toast('Zu viele Bilder oder Übergang zu lang für die Musiklänge. Übergang verkürzen oder weniger Bilder verwenden.', true);
        return;
      }
      clipDuration = t + d;
      offsets = [];
      for (let k = 1; k < n; k++) offsets.push(k * t);
    }

    const [width, height] = project.resolution.split('x').map(Number);

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

      const subFps = 8;
      const hasMotion = project.logo && project.logo.motionType && project.logo.motionType !== 'none';
      const animateLogo = !!(
        project.logo &&
        project.logo.visible !== false &&
        logoElement &&
        (project.logo.loopEnabled !== false || hasMotion)
      );

      for (let i = 0; i < n; i++) {
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = width;
        baseCanvas.height = height;

        if (isCollageExport) {
          // Collage-Basis (Felder + Rand-Effekt) OHNE Logo – das Logo kommt gleich
          // separat pro Subframe obendrauf, damit sein Glanz-Loop animieren kann.
          FotoEffects.renderCollage(baseCanvas.getContext('2d'), width, height, {
            template: collageTemplate,
            slotImages: collageSlotImages,
            logoImage: null,
            logo: null,
            time: null,
            borderStyle: project.collage.borderStyle
          });
        } else {
          const image = project.images[i];
          const imgEl = imageElements.get(image.id) || (await loadImageElement(image.dataUrl));
          FotoEffects.renderBase(baseCanvas.getContext('2d'), width, height, { image: imgEl, effects: image.effects });
        }

        if (animateLogo) {
          const subFrameCount = Math.max(2, Math.round(clipDuration * subFps));
          for (let k = 0; k < subFrameCount; k++) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(baseCanvas, 0, 0);
            FotoEffects.compositeLogo(ctx, width, height, {
              logoImage: logoElement,
              logo: project.logo,
              time: k / subFps
            });
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            const buffer = new Uint8Array(await blob.arrayBuffer());
            await window.editorAPI.exportWriteFrame(tempDir, i, k, buffer);
          }
        } else {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(baseCanvas, 0, 0);
          FotoEffects.compositeLogo(ctx, width, height, { logoImage: logoElement, logo: project.logo, time: null });
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
          const buffer = new Uint8Array(await blob.arrayBuffer());
          await window.editorAPI.exportWriteFrame(tempDir, i, 0, buffer);
        }
        setExportProgress(
          Math.round(((i + 1) / n) * 30),
          isCollageExport ? 'Rendere Collage …' : `Rendere Bild ${i + 1} von ${n} …`
        );
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
        outputPath,
        animateLogo,
        subFps
      });

      setExportProgress(100, 'Fertig!');
      exportResultEl.innerHTML = '';
      const successText = document.createElement('span');
      successText.textContent = `Loop-Video gespeichert: ${result.outputPath} `;
      const showBtn = document.createElement('button');
      showBtn.className = 'btn-ghost';
      showBtn.textContent = 'Im Ordner anzeigen';
      showBtn.addEventListener('click', () => window.editorAPI.showInFolder(result.outputPath));
      const shareBtn = document.createElement('button');
      shareBtn.className = 'btn-ghost';
      shareBtn.textContent = '📤 Pfad kopieren (Teilen)';
      shareBtn.addEventListener('click', async () => {
        await window.editorAPI.copyTextToClipboard(result.outputPath);
        toast('Dateipfad kopiert – zum Teilen einfügen.');
      });
      exportResultEl.append(successText, showBtn, shareBtn);
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
        if (!p.previewMode) p.previewMode = 'single';
        if (!p.collage) p.collage = { templateId: null, slots: [], borderStyle: 'none' };
        if (!p.collage.borderStyle) p.collage.borderStyle = 'none';
        if (!p.photoSize) p.photoSize = '10x15';
        if (!p.collageSize) p.collageSize = '30x40';
        if (p.logo) p.logo = Object.assign({}, FotoEffects.DEFAULT_LOGO, p.logo);
        p.images.forEach((im) => {
          im.effects = Object.assign({}, FotoEffects.DEFAULT_EFFECTS, im.effects);
        });
      });
      if (!state.projects.find((p) => p.id === state.activeProjectId)) {
        state.activeProjectId = state.projects[0].id;
      }
    } else {
      const project = createEmptyProject('Mein erstes Projekt');
      const blackBg = {
        id: uid(),
        name: 'Schwarzer Hintergrund',
        dataUrl: createBlackPlaceholderDataUrl(1920, 1080),
        effects: Object.assign({}, FotoEffects.DEFAULT_EFFECTS)
      };
      project.images.push(blackBg);
      project.activeImageId = blackBg.id;
      project.logo = createDefaultLogo();
      state = { projects: [project], activeProjectId: project.id };
    }
    renderProjectSelect();
    onProjectSwitched();
  }

  requestAnimationFrame(mainLoop);
  init();
})();
