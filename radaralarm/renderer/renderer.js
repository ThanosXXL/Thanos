(function () {
  const STATUS_LABELS = { offen: 'Offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt' };
  const STATUS_ORDER = ['offen', 'in_bearbeitung', 'erledigt'];
  const PRIORITY_LABELS = { normal: 'Normal', hoch: 'Hoch', dringend: 'Dringend' };

  let state = { projects: [] };
  let activeProjectId = null;
  let demoLimits = { maxProjects: 2, maxDefectsPerProject: 8 };
  let pinPlacementDefectId = null;
  let pinPlacementFloorId = null;
  let openDetailDefectId = null;
  let lastDeleted = null;
  let toastTimeoutId = null;
  let pendingDeleteProjectId = null;
  let pendingNewDefectPhoto = null;
  let currentFloorProjectId = null;
  let activeFloorId = null;
  let viewMode = 'list'; // 'list' | 'kanban'
  let showDashboard = false;

  const projectTabs = document.getElementById('projectTabs');
  const content = document.getElementById('content');
  const emptyState = document.getElementById('emptyState');
  const savedIndicator = document.getElementById('savedIndicator');
  const pinHint = document.getElementById('pinHint');
  const cancelPinPlacementBtn = document.getElementById('cancelPinPlacementBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');

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
  const newDefectAssignee = document.getElementById('newDefectAssignee');
  const newDefectPhotoBtn = document.getElementById('newDefectPhotoBtn');
  const newDefectPhotoStatus = document.getElementById('newDefectPhotoStatus');
  const addDefectError = document.getElementById('addDefectError');

  const defectDetailModal = document.getElementById('defectDetailModal');
  const defectDetailTitle = document.getElementById('defectDetailTitle');
  const detailStatus = document.getElementById('detailStatus');
  const detailPriority = document.getElementById('detailPriority');
  const detailTrade = document.getElementById('detailTrade');
  const detailDueDate = document.getElementById('detailDueDate');
  const detailAssignee = document.getElementById('detailAssignee');
  const detailDescription = document.getElementById('detailDescription');
  const detailPhotoPreview = document.getElementById('detailPhotoPreview');
  const detailPhotoBtn = document.getElementById('detailPhotoBtn');
  const detailPlacePinBtn = document.getElementById('detailPlacePinBtn');
  const detailComments = document.getElementById('detailComments');
  const detailCommentInput = document.getElementById('detailCommentInput');
  const detailActivity = document.getElementById('detailActivity');

  const teamModal = document.getElementById('teamModal');
  const teamList = document.getElementById('teamList');
  const newTeamName = document.getElementById('newTeamName');
  const newTeamRole = document.getElementById('newTeamRole');

  const undoToast = document.getElementById('undoToast');
  const toastMessage = document.getElementById('toastMessage');
  const toastUndoBtn = document.getElementById('toastUndoBtn');

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function nowLabel() {
    return new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
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

  function findFloor(project, floorId) {
    return project.floors.find((f) => f.id === floorId);
  }

  function findTeamMember(project, memberId) {
    return project.team.find((t) => t.id === memberId);
  }

  function formatDate(isoOrTimestamp) {
    return new Date(isoOrTimestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function isOverdue(defect) {
    if (!defect.dueDate || defect.status === 'erledigt') return false;
    return new Date(defect.dueDate).setHours(23, 59, 59, 999) < Date.now();
  }

  function logActivity(defect, text) {
    defect.activity.push({ id: uid(), text, time: nowLabel() });
  }

  function notify(title, body) {
    window.radarAlarmAPI.notify(title, body);
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

  // ---------- Download & Übersicht ----------

  downloadBtn.addEventListener('click', () => {
    window.radarAlarmAPI.openExternal('https://github.com/ThanosXXL/Thanos/releases');
  });

  dashboardBtn.addEventListener('click', () => {
    showDashboard = !showDashboard;
    render();
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
      floors: [{ id: uid(), name: 'Erdgeschoss', image: null }],
      pins: [],
      team: [],
      defects: []
    };
    state.projects.push(project);
    activeProjectId = project.id;
    showDashboard = false;
    persist();
    closeAddProjectModal();
    render();
  }

  function openDeleteProjectModal(id) {
    const project = findProject(id);
    if (!project) return;
    pendingDeleteProjectId = id;
    deleteProjectText.textContent = `Soll "${project.name}" wirklich entfernt werden? Alle Mängel, Etagen und Team-Zuordnungen gehen verloren.`;
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

  // ---------- Team ----------

  function openTeamModal() {
    const project = findProject(activeProjectId);
    if (!project) return;
    renderTeamList(project);
    newTeamName.value = '';
    teamModal.classList.add('visible');
  }

  function renderTeamList(project) {
    teamList.innerHTML = '';
    if (!project.team.length) {
      const p = document.createElement('p');
      p.className = 'settings-hint';
      p.textContent = 'Noch keine Team-Mitglieder.';
      teamList.appendChild(p);
      return;
    }
    project.team.forEach((member) => {
      const row = document.createElement('div');
      row.className = 'team-row';
      const label = document.createElement('span');
      label.textContent = `${member.name} · ${member.role}`;
      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn danger';
      delBtn.textContent = '✕';
      delBtn.title = 'Entfernen';
      delBtn.addEventListener('click', () => {
        project.team = project.team.filter((t) => t.id !== member.id);
        project.defects.forEach((d) => { if (d.assigneeId === member.id) d.assigneeId = null; });
        persist();
        renderTeamList(project);
      });
      row.appendChild(label);
      row.appendChild(delBtn);
      teamList.appendChild(row);
    });
  }

  document.getElementById('addTeamMemberBtn').addEventListener('click', () => {
    const project = findProject(activeProjectId);
    const name = newTeamName.value.trim();
    if (!project || !name) return;
    project.team.push({ id: uid(), name, role: newTeamRole.value });
    newTeamName.value = '';
    persist();
    renderTeamList(project);
  });

  document.getElementById('closeTeamModalBtn').addEventListener('click', () => {
    teamModal.classList.remove('visible');
    render();
  });

  function fillAssigneeSelect(selectEl, project, selectedId) {
    selectEl.innerHTML = '<option value="">Nicht zugewiesen</option>';
    project.team.forEach((member) => {
      const opt = document.createElement('option');
      opt.value = member.id;
      opt.textContent = `${member.name} (${member.role})`;
      if (member.id === selectedId) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  // ---------- Etagen & Pins ----------

  function ensureActiveFloor(project) {
    if (currentFloorProjectId !== project.id) {
      currentFloorProjectId = project.id;
      activeFloorId = project.floors.length ? project.floors[0].id : null;
    }
    if (!findFloor(project, activeFloorId) && project.floors.length) {
      activeFloorId = project.floors[0].id;
    }
  }

  let pendingFloorProjectId = null;

  function openAddFloorModal(project) {
    pendingFloorProjectId = project.id;
    const newFloorName = document.getElementById('newFloorName');
    newFloorName.value = `Etage ${project.floors.length + 1}`;
    document.getElementById('addFloorModal').classList.add('visible');
    newFloorName.focus();
  }

  function closeAddFloorModal() {
    pendingFloorProjectId = null;
    document.getElementById('addFloorModal').classList.remove('visible');
  }

  function confirmAddFloor() {
    const project = findProject(pendingFloorProjectId);
    const name = document.getElementById('newFloorName').value.trim();
    if (!project || !name) return;
    const floor = { id: uid(), name, image: null };
    project.floors.push(floor);
    activeFloorId = floor.id;
    persist();
    closeAddFloorModal();
    render();
  }

  document.getElementById('cancelAddFloor').addEventListener('click', closeAddFloorModal);
  document.getElementById('confirmAddFloor').addEventListener('click', confirmAddFloor);
  document.getElementById('newFloorName').addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmAddFloor(); });

  function deleteFloor(project, floorId) {
    if (project.floors.length <= 1) {
      alert('Mindestens eine Etage muss vorhanden bleiben.');
      return;
    }
    project.floors = project.floors.filter((f) => f.id !== floorId);
    project.pins = project.pins.filter((p) => p.floorId !== floorId);
    if (activeFloorId === floorId) activeFloorId = project.floors[0].id;
    persist();
    render();
  }

  async function uploadFloorImage(floor) {
    try {
      const dataUrl = await window.radarAlarmAPI.pickImage();
      if (!dataUrl) return;
      floor.image = dataUrl;
      persist();
      render();
    } catch (err) {
      alert('Bild konnte nicht geladen werden: ' + err.message);
    }
  }

  function startPinPlacement(defectId, floorId) {
    pinPlacementDefectId = defectId;
    pinPlacementFloorId = floorId;
    pinHint.style.display = 'inline';
    cancelPinPlacementBtn.style.display = 'inline-flex';
  }

  function stopPinPlacement() {
    pinPlacementDefectId = null;
    pinPlacementFloorId = null;
    pinHint.style.display = 'none';
    cancelPinPlacementBtn.style.display = 'none';
  }

  cancelPinPlacementBtn.addEventListener('click', stopPinPlacement);

  function placePinAt(project, defectId, floorId, x, y) {
    const defect = findDefect(project, defectId);
    if (!defect) return;
    let pin = project.pins.find((p) => p.id === defect.pinId);
    if (!pin) {
      pin = { id: uid(), floorId, x, y, defectId };
      project.pins.push(pin);
      defect.pinId = pin.id;
    } else {
      pin.floorId = floorId;
      pin.x = x;
      pin.y = y;
    }
    logActivity(defect, `Auf Grundriss "${findFloor(project, floorId).name}" platziert.`);
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
    fillAssigneeSelect(newDefectAssignee, project, null);
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
    const defect = {
      id: uid(),
      title,
      description: newDefectDescription.value.trim(),
      status: 'offen',
      priority: newDefectPriority.value,
      trade: newDefectTrade.value.trim(),
      dueDate: newDefectDueDate.value || null,
      assigneeId: newDefectAssignee.value || null,
      photo: pendingNewDefectPhoto,
      pinId: null,
      comments: [],
      activity: []
    };
    logActivity(defect, 'Mangel erstellt.');
    project.defects.push(defect);
    persist();
    closeAddDefectModal();
    render();
    notify('Neuer Mangel', `"${title}" wurde in "${project.name}" angelegt.`);
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
      persist();
      render();
    });
  }

  function moveDefectStatus(project, defect, direction) {
    const idx = STATUS_ORDER.indexOf(defect.status);
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= STATUS_ORDER.length) return;
    const newStatus = STATUS_ORDER[nextIdx];
    logActivity(defect, `Status geändert: ${STATUS_LABELS[defect.status]} → ${STATUS_LABELS[newStatus]}.`);
    defect.status = newStatus;
    persist();
    render();
    if (newStatus === 'erledigt') {
      notify('Mangel erledigt', `"${defect.title}" wurde als erledigt markiert.`);
    }
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
    fillAssigneeSelect(detailAssignee, project, defect.assigneeId);

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

    detailActivity.innerHTML = '';
    defect.activity.slice().reverse().forEach((a) => {
      const row = document.createElement('div');
      row.className = 'activity-row';
      const text = document.createElement('span');
      text.textContent = a.text;
      const time = document.createElement('span');
      time.className = 'chat-time';
      time.textContent = a.time;
      row.appendChild(text);
      row.appendChild(time);
      detailActivity.appendChild(row);
    });
  }

  function saveDetailField(field, value) {
    const project = findProject(activeProjectId);
    const defect = project && findDefect(project, openDetailDefectId);
    if (!defect) return;
    defect[field] = value;
    persist();
  }

  detailStatus.addEventListener('change', () => {
    const project = findProject(activeProjectId);
    const defect = project && findDefect(project, openDetailDefectId);
    if (!defect) return;
    logActivity(defect, `Status geändert: ${STATUS_LABELS[defect.status]} → ${STATUS_LABELS[detailStatus.value]}.`);
    defect.status = detailStatus.value;
    persist();
    renderDefectDetail();
    if (defect.status === 'erledigt') notify('Mangel erledigt', `"${defect.title}" wurde als erledigt markiert.`);
  });
  detailPriority.addEventListener('change', () => saveDetailField('priority', detailPriority.value));
  detailTrade.addEventListener('change', () => saveDetailField('trade', detailTrade.value.trim()));
  detailDueDate.addEventListener('change', () => saveDetailField('dueDate', detailDueDate.value || null));
  detailDescription.addEventListener('change', () => saveDetailField('description', detailDescription.value.trim()));
  detailAssignee.addEventListener('change', () => {
    const project = findProject(activeProjectId);
    const defect = project && findDefect(project, openDetailDefectId);
    if (!defect) return;
    const member = detailAssignee.value ? findTeamMember(project, detailAssignee.value) : null;
    logActivity(defect, member ? `Zugewiesen an ${member.name}.` : 'Zuweisung entfernt.');
    defect.assigneeId = detailAssignee.value || null;
    persist();
    renderDefectDetail();
  });

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
    if (!project) return;
    ensureActiveFloor(project);
    const floor = findFloor(project, activeFloorId);
    if (!floor || !floor.image) {
      alert('Bitte zuerst ein Bild für die aktuelle Etage hochladen.');
      return;
    }
    closeDefectDetail();
    startPinPlacement(openDetailDefectId, activeFloorId);
  });

  detailCommentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('detailCommentSendBtn').click();
  });

  document.getElementById('detailCommentSendBtn').addEventListener('click', () => {
    const project = findProject(activeProjectId);
    const defect = project && findDefect(project, openDetailDefectId);
    const text = detailCommentInput.value.trim();
    if (!defect || !text) return;
    defect.comments.push({ id: uid(), text, time: nowLabel() });
    detailCommentInput.value = '';
    persist();
    renderDefectDetail();
    notify('Neuer Kommentar', `Bei "${defect.title}": ${text.slice(0, 80)}`);
  });

  document.getElementById('deleteDefectBtn').addEventListener('click', () => {
    const project = findProject(activeProjectId);
    if (!project || !openDetailDefectId) return;
    deleteDefect(project, openDetailDefectId);
  });
  document.getElementById('closeDefectDetailBtn').addEventListener('click', closeDefectDetail);

  // ---------- Export ----------

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function buildReportHtml(project) {
    const rows = project.defects.map((d) => {
      const assignee = d.assigneeId ? (findTeamMember(project, d.assigneeId) || {}).name || '' : '';
      const photoImg = d.photo ? `<img src="${d.photo}" style="max-width:120px;max-height:90px;border:1px solid #ccc;">` : '';
      return `<tr>
        <td>${escapeHtml(d.title)}</td>
        <td>${STATUS_LABELS[d.status]}</td>
        <td>${PRIORITY_LABELS[d.priority]}</td>
        <td>${escapeHtml(d.trade)}</td>
        <td>${escapeHtml(assignee)}</td>
        <td>${d.dueDate ? formatDate(d.dueDate) : ''}</td>
        <td>${escapeHtml(d.description)}</td>
        <td>${photoImg}</td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><style>
      body { font-family: Arial, sans-serif; color: #111; padding: 24px; }
      h1 { color: #8a6d1f; margin-bottom: 2px; }
      .meta { color: #555; margin-bottom: 18px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
      th { background: #f1e6c4; }
    </style></head><body>
      <h1>Mängelbericht – ${escapeHtml(project.name)}</h1>
      <div class="meta">${escapeHtml(project.address || '')} · erstellt am ${formatDate(Date.now())} · ${project.defects.length} Mängel</div>
      <table>
        <thead><tr><th>Titel</th><th>Status</th><th>Priorität</th><th>Gewerk</th><th>Zugewiesen</th><th>Fällig</th><th>Beschreibung</th><th>Foto</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;
  }

  function csvEscape(v) {
    const s = String(v == null ? '' : v);
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function buildCsv(project) {
    const header = ['Titel', 'Status', 'Priorität', 'Gewerk', 'Zugewiesen', 'Fällig', 'Kommentare', 'Beschreibung'];
    const lines = [header.join(';')];
    project.defects.forEach((d) => {
      const assignee = d.assigneeId ? (findTeamMember(project, d.assigneeId) || {}).name || '' : '';
      lines.push([
        csvEscape(d.title), csvEscape(STATUS_LABELS[d.status]), csvEscape(PRIORITY_LABELS[d.priority]),
        csvEscape(d.trade), csvEscape(assignee), csvEscape(d.dueDate ? formatDate(d.dueDate) : ''),
        csvEscape(d.comments.length), csvEscape(d.description)
      ].join(';'));
    });
    return lines.join('\r\n');
  }

  async function exportPdf(project) {
    const ok = await window.radarAlarmAPI.exportPdfReport(buildReportHtml(project), `${project.name}-Maengelbericht.pdf`);
    if (ok === false) return;
  }

  async function exportCsv(project) {
    await window.radarAlarmAPI.exportCsvReport(buildCsv(project), `${project.name}-Maengel.csv`);
  }

  // ---------- Rendering ----------

  function renderTabs() {
    projectTabs.innerHTML = '';

    state.projects.forEach((project) => {
      const tab = document.createElement('div');
      tab.className = 'project-tab' + (!showDashboard && project.id === activeProjectId ? ' active' : '');
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
        showDashboard = false;
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
    ensureActiveFloor(project);
    const panel = document.createElement('div');
    panel.className = 'floorplan-panel';

    const heading = document.createElement('h3');
    heading.textContent = 'Grundriss';
    panel.appendChild(heading);

    const floorTabs = document.createElement('div');
    floorTabs.className = 'floor-tabs';
    project.floors.forEach((floor) => {
      const tab = document.createElement('span');
      tab.className = 'floor-tab' + (floor.id === activeFloorId ? ' active' : '');
      tab.textContent = floor.name;
      tab.addEventListener('click', () => { activeFloorId = floor.id; render(); });
      floorTabs.appendChild(tab);
      if (project.floors.length > 1) {
        const del = document.createElement('span');
        del.className = 'floor-tab-remove';
        del.textContent = '×';
        del.title = 'Etage entfernen';
        del.addEventListener('click', (e) => { e.stopPropagation(); deleteFloor(project, floor.id); });
        tab.appendChild(del);
      }
    });
    const addFloorBtn = document.createElement('button');
    addFloorBtn.className = 'btn-secondary small';
    addFloorBtn.textContent = '+ Etage';
    addFloorBtn.addEventListener('click', () => openAddFloorModal(project));
    floorTabs.appendChild(addFloorBtn);
    panel.appendChild(floorTabs);

    const floor = findFloor(project, activeFloorId);

    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn-secondary';
    uploadBtn.textContent = floor && floor.image ? 'Bild ersetzen' : 'Bild hochladen';
    uploadBtn.addEventListener('click', () => uploadFloorImage(floor));
    panel.appendChild(uploadBtn);

    const stage = document.createElement('div');
    stage.className = 'floorplan-stage';

    if (floor && floor.image) {
      const img = document.createElement('img');
      img.src = floor.image;
      img.className = 'floorplan-image';
      stage.appendChild(img);

      project.pins.filter((p) => p.floorId === floor.id).forEach((pin) => {
        const defect = findDefect(project, pin.defectId);
        if (!defect) return;
        const marker = document.createElement('div');
        marker.className = 'pin-marker priority-' + defect.priority;
        marker.style.left = (pin.x * 100) + '%';
        marker.style.top = (pin.y * 100) + '%';
        marker.title = defect.title;
        marker.textContent = defect.status === 'erledigt' ? '✓' : '!';
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
        placePinAt(project, pinPlacementDefectId, pinPlacementFloorId || floor.id, x, y);
      });
      if (pinPlacementDefectId) stage.classList.add('placement-mode');
    } else {
      const hint = document.createElement('p');
      hint.className = 'settings-hint';
      hint.textContent = 'Für diese Etage ist noch kein Bild hinterlegt.';
      stage.appendChild(hint);
    }

    panel.appendChild(stage);
    return panel;
  }

  function renderDefectCard(project, defect, compact) {
    const card = document.createElement('div');
    card.className = 'defect-card' + (isOverdue(defect) ? ' overdue' : '') + (compact ? ' compact' : '');
    card.addEventListener('click', () => openDefectDetail(defect.id));

    if (defect.photo && !compact) {
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
    if (!compact) {
      const statusBadge = document.createElement('span');
      statusBadge.className = 'status-badge status-' + defect.status;
      statusBadge.textContent = STATUS_LABELS[defect.status];
      titleRow.appendChild(statusBadge);
    }
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
    if (defect.assigneeId) {
      const member = findTeamMember(project, defect.assigneeId);
      if (member) {
        const who = document.createElement('span');
        who.className = 'due-badge assignee-badge';
        who.textContent = '👤 ' + member.name;
        meta.appendChild(who);
      }
    }
    body.appendChild(meta);

    if (compact) {
      const moveRow = document.createElement('div');
      moveRow.className = 'kanban-move-row';
      const idx = STATUS_ORDER.indexOf(defect.status);
      const backBtn = document.createElement('button');
      backBtn.className = 'icon-btn';
      backBtn.textContent = '◀';
      backBtn.disabled = idx === 0;
      backBtn.addEventListener('click', (e) => { e.stopPropagation(); moveDefectStatus(project, defect, -1); });
      const fwdBtn = document.createElement('button');
      fwdBtn.className = 'icon-btn';
      fwdBtn.textContent = '▶';
      fwdBtn.disabled = idx === STATUS_ORDER.length - 1;
      fwdBtn.addEventListener('click', (e) => { e.stopPropagation(); moveDefectStatus(project, defect, 1); });
      moveRow.appendChild(backBtn);
      moveRow.appendChild(fwdBtn);
      body.appendChild(moveRow);
    }

    card.appendChild(body);
    return card;
  }

  function renderDefectsList(project) {
    const list = document.createElement('div');
    list.className = 'defect-list';
    project.defects.forEach((defect) => list.appendChild(renderDefectCard(project, defect, false)));
    return list;
  }

  function renderDefectsKanban(project) {
    const board = document.createElement('div');
    board.className = 'kanban-board';
    STATUS_ORDER.forEach((status) => {
      const col = document.createElement('div');
      col.className = 'kanban-column';
      const h4 = document.createElement('h4');
      h4.textContent = STATUS_LABELS[status];
      col.appendChild(h4);
      project.defects.filter((d) => d.status === status).forEach((d) => col.appendChild(renderDefectCard(project, d, true)));
      board.appendChild(col);
    });
    return board;
  }

  function renderDashboardPanel() {
    const panel = document.createElement('div');
    panel.className = 'dashboard-panel';

    const h2 = document.createElement('h2');
    h2.textContent = 'Übersicht';
    panel.appendChild(h2);

    const allDefects = state.projects.flatMap((p) => p.defects);
    const totals = [
      { label: 'Projekte', value: state.projects.length },
      { label: 'Offene Mängel', value: allDefects.filter((d) => d.status !== 'erledigt').length },
      { label: 'Überfällig', value: allDefects.filter(isOverdue).length, warn: true },
      { label: 'Erledigt', value: allDefects.filter((d) => d.status === 'erledigt').length }
    ];
    const statsRow = document.createElement('div');
    statsRow.className = 'stats-bar';
    totals.forEach((t) => {
      const pill = document.createElement('span');
      pill.className = 'stat-pill' + (t.warn && t.value > 0 ? ' warn' : '');
      pill.textContent = `${t.label}: ${t.value}`;
      statsRow.appendChild(pill);
    });
    panel.appendChild(statsRow);

    const cards = document.createElement('div');
    cards.className = 'dashboard-cards';
    state.projects.forEach((project) => {
      const card = document.createElement('div');
      card.className = 'dashboard-card';
      card.addEventListener('click', () => {
        showDashboard = false;
        activeProjectId = project.id;
        render();
      });
      const title = document.createElement('h3');
      title.textContent = project.name;
      card.appendChild(title);
      if (project.address) {
        const addr = document.createElement('p');
        addr.className = 'settings-hint';
        addr.textContent = project.address;
        card.appendChild(addr);
      }
      const open = project.defects.filter((d) => d.status !== 'erledigt').length;
      const overdue = project.defects.filter(isOverdue).length;
      const stat = document.createElement('div');
      stat.className = 'stats-bar';
      [
        { label: 'Offen', value: open },
        { label: 'Überfällig', value: overdue, warn: true },
        { label: 'Team', value: project.team.length }
      ].forEach((s) => {
        const pill = document.createElement('span');
        pill.className = 'stat-pill' + (s.warn && s.value > 0 ? ' warn' : '');
        pill.textContent = `${s.label}: ${s.value}`;
        stat.appendChild(pill);
      });
      card.appendChild(stat);
      cards.appendChild(card);
    });
    panel.appendChild(cards);

    content.appendChild(panel);
  }

  function renderPanel() {
    content.innerHTML = '';

    if (showDashboard) {
      renderDashboardPanel();
      return;
    }

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
    const teamBtn = document.createElement('button');
    teamBtn.className = 'btn-secondary small';
    teamBtn.textContent = `👥 Team (${project.team.length})`;
    teamBtn.addEventListener('click', openTeamModal);
    header.appendChild(teamBtn);
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

    const viewToggle = document.createElement('button');
    viewToggle.className = 'btn-secondary small';
    viewToggle.textContent = viewMode === 'list' ? '🗂 Kanban' : '📋 Liste';
    viewToggle.addEventListener('click', () => { viewMode = viewMode === 'list' ? 'kanban' : 'list'; render(); });
    defectsHeading.appendChild(viewToggle);

    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'btn-secondary small';
    pdfBtn.textContent = '📄 PDF';
    pdfBtn.title = 'Mängelbericht als PDF exportieren';
    pdfBtn.disabled = !project.defects.length;
    pdfBtn.addEventListener('click', () => exportPdf(project));
    defectsHeading.appendChild(pdfBtn);

    const csvBtn = document.createElement('button');
    csvBtn.className = 'btn-secondary small';
    csvBtn.textContent = '📊 CSV';
    csvBtn.title = 'Als CSV exportieren (Excel-kompatibel)';
    csvBtn.disabled = !project.defects.length;
    csvBtn.addEventListener('click', () => exportCsv(project));
    defectsHeading.appendChild(csvBtn);

    const addDefectBtn = document.createElement('button');
    addDefectBtn.className = 'btn-primary';
    addDefectBtn.textContent = '+ Mangel';
    addDefectBtn.disabled = project.defects.length >= demoLimits.maxDefectsPerProject;
    addDefectBtn.addEventListener('click', openAddDefectModal);
    defectsHeading.appendChild(addDefectBtn);

    defectsPanel.appendChild(defectsHeading);
    defectsPanel.appendChild(viewMode === 'kanban' ? renderDefectsKanban(project) : renderDefectsList(project));

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

  function migrate(project) {
    if (!Array.isArray(project.floors)) {
      project.floors = [{ id: uid(), name: 'Erdgeschoss', image: project.floorPlanImage || null }];
      const defaultFloorId = project.floors[0].id;
      (project.pins || []).forEach((p) => { if (!p.floorId) p.floorId = defaultFloorId; });
    }
    delete project.floorPlanImage;
    if (!Array.isArray(project.pins)) project.pins = [];
    if (!Array.isArray(project.defects)) project.defects = [];
    if (!Array.isArray(project.team)) project.team = [];
    project.defects.forEach((d) => {
      if (!Array.isArray(d.comments)) d.comments = [];
      if (!Array.isArray(d.activity)) d.activity = [{ id: uid(), text: 'Mangel erstellt.', time: nowLabel() }];
      if (d.assigneeId === undefined) d.assigneeId = null;
    });
  }

  async function init() {
    demoLimits = await window.radarAlarmAPI.getDemoLimits();
    const loaded = await window.radarAlarmAPI.loadData();
    state = loaded && Array.isArray(loaded.projects) ? loaded : { projects: [] };
    state.projects.forEach(migrate);
    activeProjectId = state.projects.length ? state.projects[0].id : null;
    render();
  }

  init();
})();
