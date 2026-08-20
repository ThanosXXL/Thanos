(function () {
  const STATUS_LABELS = { offen: 'Offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt' };
  const PRIORITY_LABELS = { normal: 'Normal', hoch: 'Hoch', dringend: 'Dringend' };

  let state = { projects: [] };
  let activeProjectId = null;
  let demoLimits = { maxProjects: 2, maxDefectsPerProject: 8 };
  let pinPlacementDefectId = null;
  let openDetailDefectId = null;
  let lastDeleted = null;
  let toastTimeoutId = null;
  let pendingDeleteProjectId = null;

  const projectTabs = document.getElementById('projectTabs');
  const content = document.getElementById('content');
  const emptyState = document.getElementById('emptyState');
  const savedIndicator = document.getElementById('savedIndicator');
  const pinHint = document.getElementById('pinHint');
  const cancelPinPlacementBtn = document.getElementById('cancelPinPlacementBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  const addProjectModal = document.getElementById('addProjectModal');
  const newProjectName = document.getElementById('newProjectName');
  const newProjectAddress = document.getElementById('newProjectAddress');
  const addProjectHint = document.getElementById('addProjectHint');

  const deleteProjectModal = document.getElementById('deleteProjectModal');
  const deleteProjectText = document.getElementById('deleteProjectText');

  const addDefectModal = document.getElementById('addDefectModal');
  const newDefectTitle = document.getElementById('newDefectTitle');
  const newDefectDescription = document.getElementById('newDefectDescription');
  const newDefectPriority = document.getElementById('newDefectPriority');
  const newDefectTrade = document.getElementById('newDefectTrade');
  const newDefectDueDate = document.getElementById('newDefectDueDate');
  const newDefectPhotoBtn = document.getElementById('newDefectPhotoBtn');
  const newDefectPhotoStatus = document.getElementById('newDefectPhotoStatus');
  const addDefectError = document.getElementById('addDefectError');

  const defectDetailModal = document.getElementById('defectDetailModal');
  const defectDetailTitle = document.getElementById('defectDetailTitle');
  const detailStatus = document.getElementById('detailStatus');
  const detailPriority = document.getElementById('detailPriority');
  const detailTrade = document.getElementById('detailTrade');
  const detailDueDate = document.getElementById('detailDueDate');
  const detailDescription = document.getElementById('detailDescription');
  const detailPhotoPreview = document.getElementById('detailPhotoPreview');
  const detailPhotoBtn = document.getElementById('detailPhotoBtn');
  const detailPlacePinBtn = document.getElementById('detailPlacePinBtn');
  const detailComments = document.getElementById('detailComments');
  const detailCommentInput = document.getElementById('detailCommentInput');

  const undoToast = document.getElementById('undoToast');
  const toastMessage = document.getElementById('toastMessage');
  const toastUndoBtn = document.getElementById('toastUndoBtn');

  let pendingNewDefectPhoto = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function persist() {
    window.radarAlarmAPI.saveData(state)
      .then(() => {
        savedIndicator.classList.remove('save-error');
        savedIndicator.textContent = 'Gespeichert um ' + new Date().toLocaleTimeString('de-DE');
      })
      .catch(() => {
        savedIndicator.classList.add('save-error');
        savedIndicator.textContent = 'Speichern fehlgeschlagen!';
      });
  }

  function findProject(id) {
    return state.projects.find((p) => p.id === id);
  }

  function findDefect(project, defectId) {
    return project.defects.find((d) => d.id === defectId);
  }

  function formatDate(isoOrTimestamp) {
    return new Date(isoOrTimestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function isOverdue(defect) {
    if (!defect.dueDate || defect.status === 'erledigt') return false;
    return new Date(defect.dueDate).setHours(23, 59, 59, 999) < Date.now();
  }

  function showUndoToast(message, undoFn) {
    lastDeleted = { undoFn };
    toastMessage.textContent = message;
    undoToast.classList.add('visible');
    clearTimeout(toastTimeoutId);
    toastTimeoutId = setTimeout(() => undoToast.classList.remove('visible'), 6000);
  }

  toastUndoBtn.addEventListener('click', () => {
    if (lastDeleted && lastDeleted.undoFn) lastDeleted.undoFn();
    undoToast.classList.remove('visible');
    lastDeleted = null;
  });

  // ---------- Download ----------

  downloadBtn.addEventListener('click', () => {
    window.radarAlarmAPI.openExternal('https://github.com/ThanosXXL/Thanos/releases');
  });

  // ---------- Projekte ----------

  function openAddProjectModal() {
    addProjectHint.textContent = state.projects.length >= demoLimits.maxProjects
      ? `Demo-Grenze erreicht: maximal ${demoLimits.maxProjects} Projekte.`
      : '';
    newProjectName.value = '';
    newProjectAddress.value = '';
    addProjectModal.classList.add('visible');
    newProjectName.focus();
  }

  function closeAddProjectModal() {
    addProjectModal.classList.remove('visible');
  }

  function confirmAddProject() {
    const name = newProjectName.value.trim();
    if (!name) return;
    if (state.projects.length >= demoLimits.maxProjects) {
      addProjectHint.textContent = `Demo-Grenze erreicht: maximal ${demoLimits.maxProjects} Projekte.`;
      return;
    }
    const project = {
      id: uid(),
      name,
      address: newProjectAddress.value.trim(),
      floorPlanImage: null,
      pins: [],
      defects: []
    };
    state.projects.push(project);
    activeProjectId = project.id;
    persist();
    closeAddProjectModal();
    render();
  }

  function openDeleteProjectModal(id) {
    const project = findProject(id);
    if (!project) return;
    pendingDeleteProjectId = id;
    deleteProjectText.textContent = `Soll "${project.name}" wirklich entfernt werden? Alle Mängel und der Grundriss gehen verloren.`;
    deleteProjectModal.classList.add('visible');
  }

  function closeDeleteProjectModal() {
    pendingDeleteProjectId = null;
    deleteProjectModal.classList.remove('visible');
  }

  function confirmDeleteProject() {
    if (!pendingDeleteProjectId) return;
    const idx = state.projects.findIndex((p) => p.id === pendingDeleteProjectId);
    if (idx === -1) { closeDeleteProjectModal(); return; }
    const [removed] = state.projects.splice(idx, 1);
    if (activeProjectId === pendingDeleteProjectId) {
      activeProjectId = state.projects.length ? state.projects[0].id : null;
    }
    persist();
    closeDeleteProjectModal();
    render();
    showUndoToast(`Projekt "${removed.name}" entfernt.`, () => {
      state.projects.splice(idx, 0, removed);
      activeProjectId = removed.id;
      persist();
      render();
    });
  }

  // ---------- Grundriss & Pins ----------

  async function uploadFloorPlan(project) {
    try {
      const dataUrl = await window.radarAlarmAPI.pickImage();
      if (!dataUrl) return;
      project.floorPlanImage = dataUrl;
      persist();
      render();
    } catch (err) {
      alert('Bild konnte nicht geladen werden: ' + err.message);
    }
  }

  function startPinPlacement(defectId) {
    pinPlacementDefectId = defectId;
    pinHint.style.display = 'inline';
    cancelPinPlacementBtn.style.display = 'inline-flex';
  }

  function stopPinPlacement() {
    pinPlacementDefectId = null;
    pinHint.style.display = 'none';
    cancelPinPlacementBtn.style.display = 'none';
  }

  cancelPinPlacementBtn.addEventListener('click', stopPinPlacement);

  function placePinAt(project, defectId, x, y) {
    const defect = findDefect(project, defectId);
    if (!defect) return;
    let pin = project.pins.find((p) => p.id === defect.pinId);
    if (!pin) {
      pin = { id: uid(), x, y, defectId };
      project.pins.push(pin);
      defect.pinId = pin.id;
    } else {
      pin.x = x;
      pin.y = y;
    }
    persist();
    stopPinPlacement();
    render();
  }

  // ---------- Mängel ----------

  function openAddDefectModal() {
    const project = findProject(activeProjectId);
    if (!project) return;
    addDefectError.textContent = project.defects.length >= demoLimits.maxDefectsPerProject
      ? `Demo-Grenze erreicht: maximal ${demoLimits.maxDefectsPerProject} Mängel pro Projekt.`
      : '';
    newDefectTitle.value = '';
    newDefectDescription.value = '';
    newDefectPriority.value = 'normal';
    newDefectTrade.value = '';
    newDefectDueDate.value = '';
    newDefectPhotoStatus.textContent = '';
    pendingNewDefectPhoto = null;
    addDefectModal.classList.add('visible');
    newDefectTitle.focus();
  }

  function closeAddDefectModal() {
    addDefectModal.classList.remove('visible');
  }

  newDefectPhotoBtn.addEventListener('click', async () => {
    try {
      const dataUrl = await window.radarAlarmAPI.pickImage();
      if (!dataUrl) return;
      pendingNewDefectPhoto = dataUrl;
      newDefectPhotoStatus.textContent = 'Foto ausgewählt ✓';
    } catch (err) {
      newDefectPhotoStatus.textContent = 'Fehler: ' + err.message;
    }
  });

  function confirmAddDefect() {
    const project = findProject(activeProjectId);
    if (!project) return;
    const title = newDefectTitle.value.trim();
    if (!title) return;
    if (project.defects.length >= demoLimits.maxDefectsPerProject) {
      addDefectError.textContent = `Demo-Grenze erreicht: maximal ${demoLimits.maxDefectsPerProject} Mängel pro Projekt.`;
      return;
    }
    project.defects.push({
      id: uid(),
      title,
      description: newDefectDescription.value.trim(),
      status: 'offen',
      priority: newDefectPriority.value,
      trade: newDefectTrade.value.trim(),
      dueDate: newDefectDueDate.value || null,
      photo: pendingNewDefectPhoto,
      pinId: null,
      comments: []
    });
    persist();
    closeAddDefectModal();
    render();
  }

  function deleteDefect(project, defectId) {
    const idx = project.defects.findIndex((d) => d.id === defectId);
    if (idx === -1) return;
    const [removed] = project.defects.splice(idx, 1);
    project.pins = project.pins.filter((p) => p.defectId !== defectId);
    persist();
    closeDefectDetail();
    render();
    showUndoToast(`Mangel "${removed.title}" gelöscht.`, () => {
      project.defects.splice(idx, 0, removed);
      if (removed.pinId) project.pins.push({ id: removed.pinId, x: 0.5, y: 0.5, defectId: removed.id });
      persist();
      render();
    });
  }

  function openDefectDetail(defectId) {
    const project = findProject(activeProjectId);
    const defect = project && findDefect(project, defectId);
    if (!defect) return;
    openDetailDefectId = defectId;
    renderDefectDetail();
    defectDetailModal.classList.add('visible');
  }

  function closeDefectDetail() {
    openDetailDefectId = null;
    defectDetailModal.classList.remove('visible');
  }

  function renderDefectDetail() {
    const project = findProject(activeProjectId);
    const defect = project && findDefect(project, openDetailDefectId);
    if (!defect) return;

    defectDetailTitle.textContent = defect.title;
    detailStatus.value = defect.status;
    detailPriority.value = defect.priority;
    detailTrade.value = defect.trade || '';
    detailDueDate.value = defect.dueDate || '';
    detailDescription.value = defect.description || '';

    if (defect.photo) {
      detailPhotoPreview.src = defect.photo;
      detailPhotoPreview.style.display = 'inline-block';
    } else {
      detailPhotoPreview.style.display = 'none';
    }

    detailComments.innerHTML = '';
    defect.comments.forEach((c) => {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      const text = document.createElement('span');
      text.className = 'chat-text';
      text.textContent = c.text;
      const time = document.createElement('span');
      time.className = 'chat-time';
      time.textContent = c.time;
      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn danger chat-delete';
      delBtn.textContent = '✕';
      delBtn.title = 'Löschen';
      delBtn.addEventListener('click', () => {
        defect.comments = defect.comments.filter((m) => m.id !== c.id);
        persist();
        renderDefectDetail();
      });
      bubble.appendChild(text);
      bubble.appendChild(time);
      bubble.appendChild(delBtn);
      detailComments.appendChild(bubble);
    });
    requestAnimationFrame(() => { detailComments.scrollTop = detailComments.scrollHeight; });
  }

  function saveDetailField(field, value) {
    const project = findProject(activeProjectId);
    const defect = project && findDefect(project, openDetailDefectId);
    if (!defect) return;
    defect[field] = value;
    persist();
  }

  detailStatus.addEventListener('change', () => saveDetailField('status', detailStatus.value));
  detailPriority.addEventListener('change', () => saveDetailField('priority', detailPriority.value));
  detailTrade.addEventListener('change', () => saveDetailField('trade', detailTrade.value.trim()));
  detailDueDate.addEventListener('change', () => saveDetailField('dueDate', detailDueDate.value || null));
  detailDescription.addEventListener('change', () => saveDetailField('description', detailDescription.value.trim()));

  detailPhotoBtn.addEventListener('click', async () => {
    try {
      const dataUrl = await window.radarAlarmAPI.pickImage();
      if (!dataUrl) return;
      saveDetailField('photo', dataUrl);
      renderDefectDetail();
    } catch (err) {
      alert('Bild konnte nicht geladen werden: ' + err.message);
    }
  });

  detailPlacePinBtn.addEventListener('click', () => {
    const project = findProject(activeProjectId);
    if (!project || !project.floorPlanImage) {
      alert('Bitte zuerst einen Grundriss für dieses Projekt hochladen.');
      return;
    }
    closeDefectDetail();
    startPinPlacement(openDetailDefectId);
  });

  detailCommentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('detailCommentSendBtn').click();
  });

  document.getElementById('detailCommentSendBtn').addEventListener('click', () => {
    const project = findProject(activeProjectId);
    const defect = project && findDefect(project, openDetailDefectId);
    const text = detailCommentInput.value.trim();
    if (!defect || !text) return;
    defect.comments.push({
      id: uid(),
      text,
      time: new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    });
    detailCommentInput.value = '';
    persist();
    renderDefectDetail();
  });

  document.getElementById('deleteDefectBtn').addEventListener('click', () => {
    const project = findProject(activeProjectId);
    if (!project || !openDetailDefectId) return;
    deleteDefect(project, openDetailDefectId);
  });
  document.getElementById('closeDefectDetailBtn').addEventListener('click', closeDefectDetail);

  // ---------- Rendering ----------

  function renderTabs() {
    projectTabs.innerHTML = '';

    state.projects.forEach((project) => {
      const tab = document.createElement('div');
      tab.className = 'project-tab' + (project.id === activeProjectId ? ' active' : '');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'tab-name';
      nameSpan.textContent = project.name;
      const removeSpan = document.createElement('span');
      removeSpan.className = 'remove-x';
      removeSpan.title = 'Entfernen';
      removeSpan.textContent = '×';
      tab.appendChild(nameSpan);
      tab.appendChild(removeSpan);

      nameSpan.addEventListener('click', () => {
        activeProjectId = project.id;
        stopPinPlacement();
        render();
      });
      removeSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteProjectModal(project.id);
      });

      projectTabs.appendChild(tab);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-project-btn';
    addBtn.textContent = '+ Projekt anlegen';
    addBtn.disabled = state.projects.length >= demoLimits.maxProjects;
    addBtn.title = addBtn.disabled ? `Demo: maximal ${demoLimits.maxProjects} Projekte` : '';
    addBtn.addEventListener('click', openAddProjectModal);
    projectTabs.appendChild(addBtn);
  }

  function renderFloorPlan(project) {
    const panel = document.createElement('div');
    panel.className = 'floorplan-panel';

    const heading = document.createElement('h3');
    heading.textContent = 'Grundriss';
    panel.appendChild(heading);

    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn-secondary';
    uploadBtn.textContent = project.floorPlanImage ? 'Grundriss ersetzen' : 'Grundriss hochladen';
    uploadBtn.addEventListener('click', () => uploadFloorPlan(project));
    panel.appendChild(uploadBtn);

    const stage = document.createElement('div');
    stage.className = 'floorplan-stage';

    if (project.floorPlanImage) {
      const img = document.createElement('img');
      img.src = project.floorPlanImage;
      img.className = 'floorplan-image';
      stage.appendChild(img);

      project.pins.forEach((pin) => {
        const defect = findDefect(project, pin.defectId);
        if (!defect) return;
        const marker = document.createElement('div');
        marker.className = 'pin-marker priority-' + defect.priority;
        marker.style.left = (pin.x * 100) + '%';
        marker.style.top = (pin.y * 100) + '%';
        marker.title = defect.title;
        marker.textContent = STATUS_LABELS[defect.status] === 'Erledigt' ? '✓' : '!';
        marker.addEventListener('click', (e) => {
          e.stopPropagation();
          openDefectDetail(defect.id);
        });
        stage.appendChild(marker);
      });

      stage.addEventListener('click', (e) => {
        if (!pinPlacementDefectId) return;
        const rect = img.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        if (x < 0 || x > 1 || y < 0 || y > 1) return;
        placePinAt(project, pinPlacementDefectId, x, y);
      });
      if (pinPlacementDefectId) stage.classList.add('placement-mode');
    } else {
      const hint = document.createElement('p');
      hint.className = 'settings-hint';
      hint.textContent = 'Noch kein Grundriss hochgeladen.';
      stage.appendChild(hint);
    }

    panel.appendChild(stage);
    return panel;
  }

  function renderDefectCard(project, defect) {
    const card = document.createElement('div');
    card.className = 'defect-card' + (isOverdue(defect) ? ' overdue' : '');
    card.addEventListener('click', () => openDefectDetail(defect.id));

    if (defect.photo) {
      const thumb = document.createElement('img');
      thumb.className = 'defect-thumb';
      thumb.src = defect.photo;
      card.appendChild(thumb);
    }

    const body = document.createElement('div');
    body.className = 'defect-body';

    const titleRow = document.createElement('div');
    titleRow.className = 'defect-title-row';
    const title = document.createElement('span');
    title.className = 'defect-title';
    title.textContent = defect.title;
    titleRow.appendChild(title);

    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge status-' + defect.status;
    statusBadge.textContent = STATUS_LABELS[defect.status];
    titleRow.appendChild(statusBadge);
    body.appendChild(titleRow);

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    const prio = document.createElement('span');
    prio.className = 'priority-badge priority-' + defect.priority;
    prio.textContent = PRIORITY_LABELS[defect.priority];
    meta.appendChild(prio);
    if (defect.trade) {
      const trade = document.createElement('span');
      trade.className = 'due-badge';
      trade.textContent = defect.trade;
      meta.appendChild(trade);
    }
    if (defect.dueDate) {
      const due = document.createElement('span');
      due.className = 'due-badge' + (isOverdue(defect) ? ' overdue' : '');
      due.textContent = formatDate(defect.dueDate);
      meta.appendChild(due);
    }
    body.appendChild(meta);

    card.appendChild(body);
    return card;
  }

  function renderPanel() {
    content.innerHTML = '';

    if (!state.projects.length) {
      content.appendChild(emptyState);
      return;
    }

    const project = findProject(activeProjectId) || state.projects[0];
    activeProjectId = project.id;

    const panel = document.createElement('div');
    panel.className = 'radar-panel';

    const header = document.createElement('div');
    header.className = 'panel-header';
    const h2 = document.createElement('h2');
    h2.textContent = project.name;
    header.appendChild(h2);
    if (project.address) {
      const addr = document.createElement('span');
      addr.className = 'project-address';
      addr.textContent = project.address;
      header.appendChild(addr);
    }
    panel.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'radar-grid';

    grid.appendChild(renderFloorPlan(project));

    const defectsPanel = document.createElement('div');
    defectsPanel.className = 'defects-panel';
    const defectsHeading = document.createElement('div');
    defectsHeading.className = 'defects-heading';
    const h3 = document.createElement('h3');
    h3.textContent = `Mängel (${project.defects.length}/${demoLimits.maxDefectsPerProject})`;
    defectsHeading.appendChild(h3);
    const addDefectBtn = document.createElement('button');
    addDefectBtn.className = 'btn-primary';
    addDefectBtn.textContent = '+ Mangel';
    addDefectBtn.disabled = project.defects.length >= demoLimits.maxDefectsPerProject;
    addDefectBtn.addEventListener('click', openAddDefectModal);
    defectsHeading.appendChild(addDefectBtn);
    defectsPanel.appendChild(defectsHeading);

    const list = document.createElement('div');
    list.className = 'defect-list';
    project.defects.forEach((defect) => list.appendChild(renderDefectCard(project, defect)));
    defectsPanel.appendChild(list);

    grid.appendChild(defectsPanel);
    panel.appendChild(grid);

    content.appendChild(panel);
  }

  function render() {
    renderTabs();
    renderPanel();
  }

  document.getElementById('addProjectEmptyBtn').addEventListener('click', openAddProjectModal);
  document.getElementById('cancelAddProject').addEventListener('click', closeAddProjectModal);
  document.getElementById('confirmAddProject').addEventListener('click', confirmAddProject);
  newProjectName.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmAddProject(); });

  document.getElementById('cancelDeleteProject').addEventListener('click', closeDeleteProjectModal);
  document.getElementById('confirmDeleteProject').addEventListener('click', confirmDeleteProject);

  document.getElementById('cancelAddDefect').addEventListener('click', closeAddDefectModal);
  document.getElementById('confirmAddDefect').addEventListener('click', confirmAddDefect);

  async function init() {
    demoLimits = await window.radarAlarmAPI.getDemoLimits();
    const loaded = await window.radarAlarmAPI.loadData();
    state = loaded && Array.isArray(loaded.projects) ? loaded : { projects: [] };
    state.projects.forEach((p) => {
      if (!Array.isArray(p.pins)) p.pins = [];
      if (!Array.isArray(p.defects)) p.defects = [];
      p.defects.forEach((d) => { if (!Array.isArray(d.comments)) d.comments = []; });
    });
    activeProjectId = state.projects.length ? state.projects[0].id : null;
    render();
  }

  init();
})();
