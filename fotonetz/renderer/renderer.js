(function () {
  const MAX_AUFTRAEGE = 6;
  const AUFTRAGSARTEN = [
    'Hochzeit',
    'Verlobung / Paarshooting',
    'Portrait',
    'Familie',
    'Business / Corporate',
    'Event',
    'Produkt',
    'Sonstiges'
  ];
  const ZAHLUNGSSTATUS = [
    { value: 'offen', label: 'Offen' },
    { value: 'angezahlt', label: 'Angezahlt' },
    { value: 'bezahlt', label: 'Bezahlt' }
  ];

  let state = { auftraege: [] };
  let activeAuftragId = null;

  const auftragTabs = document.getElementById('auftragTabs');
  const content = document.getElementById('content');
  const emptyState = document.getElementById('emptyState');

  const addAuftragModal = document.getElementById('addAuftragModal');
  const newAuftragNameInput = document.getElementById('newAuftragName');
  const deleteAuftragModal = document.getElementById('deleteAuftragModal');
  const deleteAuftragText = document.getElementById('deleteAuftragText');

  let pendingDeleteId = null;

  const imageEditorModal = document.getElementById('imageEditorModal');
  const editorCanvas = document.getElementById('editorCanvas');
  const editorCtx = editorCanvas.getContext('2d');
  const editBrightness = document.getElementById('editBrightness');
  const editContrast = document.getElementById('editContrast');
  const editSaturation = document.getElementById('editSaturation');
  const editRotateBtn = document.getElementById('editRotateBtn');

  let videoSelection = new Set();
  let editorState = null; // { auftragId, image, rotation }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function persist() {
    window.studioAPI.saveData(state);
  }

  function findAuftrag(id) {
    return state.auftraege.find((a) => a.id === id);
  }

  function openAddAuftragModal() {
    if (state.auftraege.length >= MAX_AUFTRAEGE) return;
    newAuftragNameInput.value = '';
    addAuftragModal.classList.add('visible');
    newAuftragNameInput.focus();
  }

  function closeAddAuftragModal() {
    addAuftragModal.classList.remove('visible');
  }

  function confirmAddAuftrag() {
    const titel = newAuftragNameInput.value.trim();
    if (!titel) return;
    if (state.auftraege.length >= MAX_AUFTRAEGE) return;

    const auftrag = {
      id: uid(),
      titel,
      art: AUFTRAGSARTEN[0],
      kunde: '',
      termin: '',
      link: '',
      preis: '',
      zahlungsstatus: ZAHLUNGSSTATUS[0].value,
      notizen: '',
      todos: [],
      offeneEdits: [],
      fertigeEdits: [],
      referenzen: [],
      chat: [],
      medien: { bilder: [], musikStueck: null, videos: [] }
    };
    state.auftraege.push(auftrag);
    activeAuftragId = auftrag.id;
    persist();
    closeAddAuftragModal();
    render();
  }

  function openDeleteAuftragModal(id) {
    const auftrag = findAuftrag(id);
    if (!auftrag) return;
    pendingDeleteId = id;
    deleteAuftragText.textContent = `Soll "${auftrag.titel}" wirklich entfernt werden? Alle zugehörigen Listen gehen verloren.`;
    deleteAuftragModal.classList.add('visible');
  }

  function closeDeleteAuftragModal() {
    pendingDeleteId = null;
    deleteAuftragModal.classList.remove('visible');
  }

  function confirmDeleteAuftrag() {
    if (!pendingDeleteId) return;
    state.auftraege = state.auftraege.filter((a) => a.id !== pendingDeleteId);
    if (activeAuftragId === pendingDeleteId) {
      activeAuftragId = state.auftraege.length ? state.auftraege[0].id : null;
    }
    persist();
    closeDeleteAuftragModal();
    render();
  }

  function updateAuftragField(auftragId, field, value) {
    const auftrag = findAuftrag(auftragId);
    if (!auftrag) return;
    if (auftrag[field] === value) return;
    auftrag[field] = value;
    persist();
    render();
  }

  function addItem(auftragId, listKey, text) {
    const auftrag = findAuftrag(auftragId);
    if (!auftrag || !text.trim()) return;
    auftrag[listKey].push({ id: uid(), text: text.trim(), done: false });
    persist();
    render();
  }

  function deleteItem(auftragId, listKey, itemId) {
    const auftrag = findAuftrag(auftragId);
    if (!auftrag) return;
    auftrag[listKey] = auftrag[listKey].filter((i) => i.id !== itemId);
    persist();
    render();
  }

  function toggleTodo(auftragId, itemId) {
    const auftrag = findAuftrag(auftragId);
    if (!auftrag) return;
    const item = auftrag.todos.find((i) => i.id === itemId);
    if (!item) return;
    item.done = !item.done;
    persist();
    render();
  }

  function moveEdit(auftragId, itemId, fromKey, toKey) {
    const auftrag = findAuftrag(auftragId);
    if (!auftrag) return;
    const idx = auftrag[fromKey].findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const [item] = auftrag[fromKey].splice(idx, 1);
    auftrag[toKey].push(item);
    persist();
    render();
  }

  function addChatMessage(auftragId, text) {
    const auftrag = findAuftrag(auftragId);
    if (!auftrag || !text.trim()) return;
    auftrag.chat.push({
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

  function deleteChatMessage(auftragId, messageId) {
    const auftrag = findAuftrag(auftragId);
    if (!auftrag) return;
    auftrag.chat = auftrag.chat.filter((m) => m.id !== messageId);
    persist();
    render();
  }

  function ensureMedien(auftrag) {
    if (!auftrag.medien || typeof auftrag.medien !== 'object') {
      auftrag.medien = { bilder: [], musikStueck: null, videos: [] };
    }
    return auftrag.medien;
  }

  async function importImages(auftragId) {
    const neueBilder = await window.studioAPI.importImages(auftragId);
    if (!neueBilder || !neueBilder.length) return;
    const auftrag = findAuftrag(auftragId);
    if (!auftrag) return;
    const medien = ensureMedien(auftrag);
    neueBilder.forEach((b) => medien.bilder.push({ ...b, quelle: 'original' }));
    persist();
    render();
  }

  async function deleteBild(auftragId, bildId) {
    const auftrag = findAuftrag(auftragId);
    if (!auftrag) return;
    const medien = ensureMedien(auftrag);
    const bild = medien.bilder.find((b) => b.id === bildId);
    if (!bild) return;
    await window.studioAPI.deleteMediaFile(bild.pfad);
    medien.bilder = medien.bilder.filter((b) => b.id !== bildId);
    videoSelection.delete(bildId);
    persist();
    render();
  }

  function toggleVideoSelection(bildId) {
    if (videoSelection.has(bildId)) videoSelection.delete(bildId);
    else videoSelection.add(bildId);
    render();
  }

  async function pickMusic(auftragId) {
    const musikStueck = await window.studioAPI.pickMusic(auftragId);
    if (!musikStueck) return;
    const auftrag = findAuftrag(auftragId);
    if (!auftrag) return;
    const medien = ensureMedien(auftrag);
    medien.musikStueck = musikStueck;
    persist();
    render();
  }

  function entferneMusik(auftragId) {
    const auftrag = findAuftrag(auftragId);
    if (!auftrag) return;
    const medien = ensureMedien(auftrag);
    medien.musikStueck = null;
    persist();
    render();
  }

  async function generateVideo(auftragId, sekundenProBild, buttonEl) {
    const auftrag = findAuftrag(auftragId);
    if (!auftrag) return;
    const medien = ensureMedien(auftrag);
    const bildPfade = medien.bilder
      .filter((b) => videoSelection.has(b.id))
      .map((b) => b.pfad);
    if (!bildPfade.length) return;

    const originalLabel = buttonEl.textContent;
    buttonEl.disabled = true;
    buttonEl.textContent = 'Video wird erstellt...';
    try {
      const video = await window.studioAPI.createSlideshowVideo({
        auftragId,
        bildPfade,
        sekundenProBild,
        musikPfad: medien.musikStueck ? medien.musikStueck.pfad : null
      });
      medien.videos.push(video);
      videoSelection.clear();
      persist();
    } catch (err) {
      window.alert('Video konnte nicht erstellt werden: ' + err.message);
    } finally {
      buttonEl.disabled = false;
      buttonEl.textContent = originalLabel;
      render();
    }
  }

  async function deleteVideo(auftragId, videoId) {
    const auftrag = findAuftrag(auftragId);
    if (!auftrag) return;
    const medien = ensureMedien(auftrag);
    const video = medien.videos.find((v) => v.id === videoId);
    if (!video) return;
    await window.studioAPI.deleteMediaFile(video.pfad);
    medien.videos = medien.videos.filter((v) => v.id !== videoId);
    persist();
    render();
  }

  function openImageEditor(auftragId, bild) {
    const image = new Image();
    image.onload = () => {
      editorState = { auftragId, bild, image, rotation: 0 };
      editBrightness.value = 100;
      editContrast.value = 100;
      editSaturation.value = 100;
      drawEditorCanvas();
      imageEditorModal.classList.add('visible');
    };
    image.src = bild.url;
  }

  function closeImageEditor() {
    editorState = null;
    imageEditorModal.classList.remove('visible');
  }

  function drawEditorCanvas() {
    if (!editorState) return;
    const { image, rotation } = editorState;
    const maxWidth = 760;
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    const swapped = rotation % 180 !== 0;

    editorCanvas.width = swapped ? h : w;
    editorCanvas.height = swapped ? w : h;

    editorCtx.save();
    editorCtx.filter = `brightness(${editBrightness.value}%) contrast(${editContrast.value}%) saturate(${editSaturation.value}%)`;
    editorCtx.translate(editorCanvas.width / 2, editorCanvas.height / 2);
    editorCtx.rotate((rotation * Math.PI) / 180);
    editorCtx.drawImage(image, -w / 2, -h / 2, w, h);
    editorCtx.restore();
  }

  function rotateEditorImage() {
    if (!editorState) return;
    editorState.rotation = (editorState.rotation + 90) % 360;
    drawEditorCanvas();
  }

  async function saveEditedImage() {
    if (!editorState) return;
    const { auftragId } = editorState;
    const dataUrl = editorCanvas.toDataURL('image/jpeg', 0.92);
    const gespeichert = await window.studioAPI.saveEditedImage({ auftragId, dataUrl });
    const auftrag = findAuftrag(auftragId);
    if (auftrag) {
      const medien = ensureMedien(auftrag);
      medien.bilder.push({ ...gespeichert, quelle: 'bearbeitet' });
      persist();
    }
    closeImageEditor();
    render();
  }

  function renderTabs() {
    auftragTabs.innerHTML = '';

    state.auftraege.forEach((auftrag) => {
      const tab = document.createElement('div');
      tab.className = 'auftrag-tab' + (auftrag.id === activeAuftragId ? ' active' : '');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'tab-name';
      nameSpan.textContent = auftrag.titel;

      const removeSpan = document.createElement('span');
      removeSpan.className = 'remove-x';
      removeSpan.title = 'Entfernen';
      removeSpan.textContent = '×';

      nameSpan.addEventListener('click', () => {
        activeAuftragId = auftrag.id;
        render();
      });

      removeSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteAuftragModal(auftrag.id);
      });

      tab.appendChild(nameSpan);
      tab.appendChild(removeSpan);
      auftragTabs.appendChild(tab);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-auftrag-btn';
    addBtn.textContent = '+ Auftrag hinzufügen';
    addBtn.disabled = state.auftraege.length >= MAX_AUFTRAEGE;
    addBtn.title = addBtn.disabled ? `Maximal ${MAX_AUFTRAEGE} Aufträge` : '';
    addBtn.addEventListener('click', openAddAuftragModal);
    auftragTabs.appendChild(addBtn);
  }

  function buildListColumn({ title, extraClass, auftragId, listKey, items, placeholder, renderItem }) {
    const col = document.createElement('div');
    col.className = 'list-column' + (extraClass ? ' ' + extraClass : '');

    const heading = document.createElement('h3');
    heading.textContent = title;
    col.appendChild(heading);

    const addRow = document.createElement('div');
    addRow.className = 'add-item-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder || 'Neuer Eintrag...';
    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => {
      addItem(auftragId, listKey, input.value);
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

  function buildMetaSection(auftrag) {
    const section = document.createElement('div');
    section.className = 'auftrag-meta';

    const artField = document.createElement('div');
    artField.className = 'meta-field';
    const artLabel = document.createElement('label');
    artLabel.textContent = 'Auftragsart';
    const artSelect = document.createElement('select');
    AUFTRAGSARTEN.forEach((art) => {
      const option = document.createElement('option');
      option.value = art;
      option.textContent = art;
      if (art === auftrag.art) option.selected = true;
      artSelect.appendChild(option);
    });
    artSelect.addEventListener('change', () =>
      updateAuftragField(auftrag.id, 'art', artSelect.value)
    );
    artField.appendChild(artLabel);
    artField.appendChild(artSelect);

    const kundeField = document.createElement('div');
    kundeField.className = 'meta-field';
    const kundeLabel = document.createElement('label');
    kundeLabel.textContent = 'Kunde';
    const kundeInput = document.createElement('input');
    kundeInput.type = 'text';
    kundeInput.placeholder = 'Name des Kunden';
    kundeInput.value = auftrag.kunde;
    kundeInput.addEventListener('blur', () =>
      updateAuftragField(auftrag.id, 'kunde', kundeInput.value.trim())
    );
    kundeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') kundeInput.blur();
    });
    kundeField.appendChild(kundeLabel);
    kundeField.appendChild(kundeInput);

    const terminField = document.createElement('div');
    terminField.className = 'meta-field';
    const terminLabel = document.createElement('label');
    terminLabel.textContent = 'Termin & Ort';
    const terminInput = document.createElement('input');
    terminInput.type = 'text';
    terminInput.placeholder = 'z. B. 12.10. – Schloss Bellevue';
    terminInput.value = auftrag.termin;
    terminInput.addEventListener('blur', () =>
      updateAuftragField(auftrag.id, 'termin', terminInput.value.trim())
    );
    terminInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') terminInput.blur();
    });
    terminField.appendChild(terminLabel);
    terminField.appendChild(terminInput);

    const linkField = document.createElement('div');
    linkField.className = 'meta-field link-field';
    const linkLabel = document.createElement('label');
    linkLabel.textContent = 'Galerie- / Liefer-Link';
    const linkRow = document.createElement('div');
    linkRow.className = 'link-row';
    const linkInput = document.createElement('input');
    linkInput.type = 'text';
    linkInput.placeholder = 'https://...';
    linkInput.value = auftrag.link;
    linkInput.addEventListener('blur', () =>
      updateAuftragField(auftrag.id, 'link', linkInput.value.trim())
    );
    linkInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') linkInput.blur();
    });
    const openLinkBtn = document.createElement('button');
    openLinkBtn.type = 'button';
    openLinkBtn.textContent = 'Öffnen';
    openLinkBtn.addEventListener('click', () => {
      if (auftrag.link) window.studioAPI.openExternal(auftrag.link);
    });
    linkRow.appendChild(linkInput);
    linkRow.appendChild(openLinkBtn);
    linkField.appendChild(linkLabel);
    linkField.appendChild(linkRow);

    const preisField = document.createElement('div');
    preisField.className = 'meta-field';
    const preisLabel = document.createElement('label');
    preisLabel.textContent = 'Honorar';
    const preisInput = document.createElement('input');
    preisInput.type = 'text';
    preisInput.placeholder = 'z. B. 1.200 €';
    preisInput.value = auftrag.preis;
    preisInput.addEventListener('blur', () =>
      updateAuftragField(auftrag.id, 'preis', preisInput.value.trim())
    );
    preisInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') preisInput.blur();
    });
    preisField.appendChild(preisLabel);
    preisField.appendChild(preisInput);

    const zahlungField = document.createElement('div');
    zahlungField.className = 'meta-field';
    const zahlungLabel = document.createElement('label');
    zahlungLabel.textContent = 'Zahlungsstatus';
    const zahlungSelect = document.createElement('select');
    zahlungSelect.className = 'zahlungsstatus-select status-' + auftrag.zahlungsstatus;
    ZAHLUNGSSTATUS.forEach(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      if (value === auftrag.zahlungsstatus) option.selected = true;
      zahlungSelect.appendChild(option);
    });
    zahlungSelect.addEventListener('change', () => {
      zahlungSelect.className = 'zahlungsstatus-select status-' + zahlungSelect.value;
      updateAuftragField(auftrag.id, 'zahlungsstatus', zahlungSelect.value);
    });
    zahlungField.appendChild(zahlungLabel);
    zahlungField.appendChild(zahlungSelect);

    section.appendChild(artField);
    section.appendChild(kundeField);
    section.appendChild(terminField);
    section.appendChild(linkField);
    section.appendChild(preisField);
    section.appendChild(zahlungField);

    const notizenBlock = document.createElement('div');
    notizenBlock.className = 'auftrag-notizen';
    const notizenLabel = document.createElement('label');
    notizenLabel.textContent = 'Notizen';
    const notizenInput = document.createElement('textarea');
    notizenInput.placeholder = 'Ausrüstung, Wünsche des Kunden, Stil, Locations ...';
    notizenInput.value = auftrag.notizen;
    notizenInput.addEventListener('blur', () =>
      updateAuftragField(auftrag.id, 'notizen', notizenInput.value.trim())
    );
    notizenBlock.appendChild(notizenLabel);
    notizenBlock.appendChild(notizenInput);

    const wrapper = document.createElement('div');
    wrapper.appendChild(section);
    wrapper.appendChild(notizenBlock);
    return wrapper;
  }

  function renderPanel() {
    content.innerHTML = '';

    if (!state.auftraege.length) {
      content.appendChild(emptyState);
      return;
    }

    const auftrag = findAuftrag(activeAuftragId) || state.auftraege[0];
    activeAuftragId = auftrag.id;

    const panel = document.createElement('div');
    panel.className = 'auftrag-panel';

    const header = document.createElement('div');
    header.className = 'panel-header';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';
    const h2 = document.createElement('h2');
    h2.textContent = auftrag.titel;
    titleGroup.appendChild(h2);
    if (auftrag.art) {
      const artBadge = document.createElement('span');
      artBadge.className = 'art-badge';
      artBadge.textContent = auftrag.art;
      titleGroup.appendChild(artBadge);
    }
    header.appendChild(titleGroup);
    panel.appendChild(header);

    panel.appendChild(buildMetaSection(auftrag));

    const grid = document.createElement('div');
    grid.className = 'lists-grid';

    // Liste eins: To-Do-Liste
    const todoCol = buildListColumn({
      title: 'Liste 1 – To-Do-Liste',
      extraClass: '',
      auftragId: auftrag.id,
      listKey: 'todos',
      items: auftrag.todos,
      placeholder: 'Neue Aufgabe...',
      renderItem: (item) => {
        const li = document.createElement('li');
        if (item.done) li.classList.add('completed');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.done;
        checkbox.addEventListener('change', () => toggleTodo(auftrag.id, item.id));
        const span = document.createElement('span');
        span.className = 'item-text';
        span.textContent = item.text;
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = '✕';
        delBtn.title = 'Löschen';
        delBtn.addEventListener('click', () => deleteItem(auftrag.id, 'todos', item.id));
        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(delBtn);
        return li;
      }
    });

    // Liste zwei: Offene Bearbeitungen
    const openCol = buildListColumn({
      title: 'Liste 2 – Offene Bearbeitungen',
      extraClass: 'open',
      auftragId: auftrag.id,
      listKey: 'offeneEdits',
      items: auftrag.offeneEdits,
      placeholder: 'z. B. Portraits sichten...',
      renderItem: (item) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.className = 'item-text';
        span.textContent = item.text;
        const doneBtn = document.createElement('button');
        doneBtn.className = 'icon-btn';
        doneBtn.textContent = '✓';
        doneBtn.title = 'Als fertig markieren';
        doneBtn.addEventListener('click', () =>
          moveEdit(auftrag.id, item.id, 'offeneEdits', 'fertigeEdits')
        );
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = '✕';
        delBtn.title = 'Löschen';
        delBtn.addEventListener('click', () => deleteItem(auftrag.id, 'offeneEdits', item.id));
        li.appendChild(span);
        li.appendChild(doneBtn);
        li.appendChild(delBtn);
        return li;
      }
    });

    // Liste drei: Fertige Bearbeitungen
    const doneCol = buildListColumn({
      title: 'Liste 3 – Fertige Bearbeitungen',
      extraClass: 'done',
      auftragId: auftrag.id,
      listKey: 'fertigeEdits',
      items: auftrag.fertigeEdits,
      placeholder: 'z. B. Highlight-Reel exportiert...',
      renderItem: (item) => {
        const li = document.createElement('li');
        li.classList.add('completed');
        const span = document.createElement('span');
        span.className = 'item-text';
        span.textContent = item.text;
        const undoBtn = document.createElement('button');
        undoBtn.className = 'icon-btn';
        undoBtn.textContent = '↺';
        undoBtn.title = 'Zurück zu offenen Bearbeitungen';
        undoBtn.addEventListener('click', () =>
          moveEdit(auftrag.id, item.id, 'fertigeEdits', 'offeneEdits')
        );
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = '✕';
        delBtn.title = 'Löschen';
        delBtn.addEventListener('click', () => deleteItem(auftrag.id, 'fertigeEdits', item.id));
        li.appendChild(span);
        li.appendChild(undoBtn);
        li.appendChild(delBtn);
        return li;
      }
    });

    // Liste vier: Referenzen / Moodboard
    const referenzenCol = buildListColumn({
      title: 'Liste 4 – Referenzen',
      extraClass: 'referenzen',
      auftragId: auftrag.id,
      listKey: 'referenzen',
      items: auftrag.referenzen,
      placeholder: 'Inspirations-Link oder Stichwort...',
      renderItem: (item) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.className = 'item-text';
        span.textContent = item.text;
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = '✕';
        delBtn.title = 'Löschen';
        delBtn.addEventListener('click', () => deleteItem(auftrag.id, 'referenzen', item.id));
        li.appendChild(span);
        li.appendChild(delBtn);
        return li;
      }
    });

    grid.appendChild(todoCol);
    grid.appendChild(openCol);
    grid.appendChild(doneCol);
    grid.appendChild(referenzenCol);
    panel.appendChild(grid);

    panel.appendChild(buildMedienPanel(auftrag));
    panel.appendChild(buildChatPanel(auftrag));

    content.appendChild(panel);
  }

  function buildMedienPanel(auftrag) {
    const medien = ensureMedien(auftrag);
    const panel = document.createElement('div');
    panel.className = 'medien-panel';

    const heading = document.createElement('h3');
    heading.textContent = 'Medien – Bilder bearbeiten & Video erstellen';
    panel.appendChild(heading);

    const toolbar = document.createElement('div');
    toolbar.className = 'medien-toolbar';

    const importBtn = document.createElement('button');
    importBtn.className = 'btn-primary';
    importBtn.type = 'button';
    importBtn.textContent = '+ Bilder importieren';
    importBtn.addEventListener('click', () => importImages(auftrag.id));
    toolbar.appendChild(importBtn);

    panel.appendChild(toolbar);

    const grid = document.createElement('div');
    grid.className = 'medien-grid';
    if (!medien.bilder.length) {
      const hint = document.createElement('p');
      hint.className = 'medien-hint';
      hint.textContent = 'Noch keine Bilder importiert.';
      grid.appendChild(hint);
    }
    medien.bilder.forEach((bild) => {
      const card = document.createElement('div');
      card.className = 'medien-card';

      const img = document.createElement('img');
      img.src = bild.url;
      img.alt = bild.dateiname;
      card.appendChild(img);

      const selectLabel = document.createElement('label');
      selectLabel.className = 'medien-select-label';
      const selectBox = document.createElement('input');
      selectBox.type = 'checkbox';
      selectBox.checked = videoSelection.has(bild.id);
      selectBox.addEventListener('change', () => toggleVideoSelection(bild.id));
      selectLabel.appendChild(selectBox);
      selectLabel.appendChild(document.createTextNode(' Für Video'));
      card.appendChild(selectLabel);

      if (bild.quelle === 'bearbeitet') {
        const tag = document.createElement('span');
        tag.className = 'medien-tag';
        tag.textContent = 'bearbeitet';
        card.appendChild(tag);
      }

      const actions = document.createElement('div');
      actions.className = 'medien-card-actions';
      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.textContent = '✎ Bearbeiten';
      editBtn.addEventListener('click', () => openImageEditor(auftrag.id, bild));
      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn danger';
      delBtn.textContent = '✕';
      delBtn.title = 'Löschen';
      delBtn.addEventListener('click', () => deleteBild(auftrag.id, bild.id));
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      card.appendChild(actions);

      grid.appendChild(card);
    });
    panel.appendChild(grid);

    const videoBuilder = document.createElement('div');
    videoBuilder.className = 'video-builder';

    const sekundenLabel = document.createElement('label');
    sekundenLabel.className = 'sekunden-label';
    sekundenLabel.textContent = 'Sekunden pro Bild';
    const sekundenInput = document.createElement('input');
    sekundenInput.type = 'number';
    sekundenInput.min = '1';
    sekundenInput.max = '15';
    sekundenInput.value = '3';
    sekundenLabel.appendChild(sekundenInput);
    videoBuilder.appendChild(sekundenLabel);

    const musikBtn = document.createElement('button');
    musikBtn.className = 'btn-secondary';
    musikBtn.type = 'button';
    musikBtn.textContent = medien.musikStueck
      ? `🎵 ${medien.musikStueck.dateiname}`
      : '🎵 Hintergrundmusik wählen';
    musikBtn.addEventListener('click', () => pickMusic(auftrag.id));
    videoBuilder.appendChild(musikBtn);

    if (medien.musikStueck) {
      const removeMusikBtn = document.createElement('button');
      removeMusikBtn.className = 'icon-btn danger';
      removeMusikBtn.title = 'Musik entfernen';
      removeMusikBtn.textContent = '✕';
      removeMusikBtn.addEventListener('click', () => entferneMusik(auftrag.id));
      videoBuilder.appendChild(removeMusikBtn);
    }

    const generateBtn = document.createElement('button');
    generateBtn.className = 'btn-primary';
    generateBtn.type = 'button';
    generateBtn.textContent = '🎬 Video erstellen';
    generateBtn.disabled = !videoSelection.size;
    generateBtn.title = generateBtn.disabled ? 'Zuerst Bilder für das Video auswählen' : '';
    generateBtn.addEventListener('click', () =>
      generateVideo(auftrag.id, Number(sekundenInput.value) || 3, generateBtn)
    );
    videoBuilder.appendChild(generateBtn);

    panel.appendChild(videoBuilder);

    if (medien.videos.length) {
      const videoList = document.createElement('div');
      videoList.className = 'video-list';
      medien.videos.forEach((video) => {
        const row = document.createElement('div');
        row.className = 'video-row';

        const name = document.createElement('span');
        name.className = 'video-name';
        name.textContent = `${video.dateiname} (${video.sekunden}s)`;
        row.appendChild(name);

        const playBtn = document.createElement('button');
        playBtn.className = 'btn-secondary';
        playBtn.type = 'button';
        playBtn.textContent = '▶ Abspielen';
        playBtn.addEventListener('click', () => window.studioAPI.openMediaPath(video.pfad));
        row.appendChild(playBtn);

        const revealBtn = document.createElement('button');
        revealBtn.className = 'btn-secondary';
        revealBtn.type = 'button';
        revealBtn.textContent = 'Ordner öffnen';
        revealBtn.addEventListener('click', () => window.studioAPI.revealMediaPath(video.pfad));
        row.appendChild(revealBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.textContent = '✕';
        delBtn.title = 'Löschen';
        delBtn.addEventListener('click', () => deleteVideo(auftrag.id, video.id));
        row.appendChild(delBtn);

        videoList.appendChild(row);
      });
      panel.appendChild(videoList);
    }

    return panel;
  }

  function buildChatPanel(auftrag) {
    const panel = document.createElement('div');
    panel.className = 'chat-panel';

    const heading = document.createElement('h3');
    heading.textContent = 'Chat / Notizen';
    panel.appendChild(heading);

    const messages = document.createElement('div');
    messages.className = 'chat-messages';
    auftrag.chat.forEach((msg) => {
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
      delBtn.addEventListener('click', () => deleteChatMessage(auftrag.id, msg.id));

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
      addChatMessage(auftrag.id, input.value);
      input.value = '';
      input.focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendBtn.click();
    });
    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);
    panel.appendChild(inputRow);

    requestAnimationFrame(() => {
      messages.scrollTop = messages.scrollHeight;
    });

    return panel;
  }

  function render() {
    renderTabs();
    renderPanel();
  }

  document.getElementById('addAuftragEmptyBtn').addEventListener('click', openAddAuftragModal);
  document.getElementById('cancelAddAuftrag').addEventListener('click', closeAddAuftragModal);
  document.getElementById('confirmAddAuftrag').addEventListener('click', confirmAddAuftrag);
  newAuftragNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddAuftrag();
  });

  document.getElementById('cancelDeleteAuftrag').addEventListener('click', closeDeleteAuftragModal);
  document.getElementById('confirmDeleteAuftrag').addEventListener('click', confirmDeleteAuftrag);

  document.getElementById('cancelEditImage').addEventListener('click', closeImageEditor);
  document.getElementById('saveEditedImageBtn').addEventListener('click', saveEditedImage);
  editRotateBtn.addEventListener('click', rotateEditorImage);
  [editBrightness, editContrast, editSaturation].forEach((slider) => {
    slider.addEventListener('input', drawEditorCanvas);
  });

  async function init() {
    const loaded = await window.studioAPI.loadData();
    state = loaded && Array.isArray(loaded.auftraege) ? loaded : { auftraege: [] };
    state.auftraege.forEach((a) => {
      if (!Array.isArray(a.chat)) a.chat = [];
      if (!Array.isArray(a.referenzen)) a.referenzen = [];
      if (!Array.isArray(a.offeneEdits)) a.offeneEdits = [];
      if (!Array.isArray(a.fertigeEdits)) a.fertigeEdits = [];
      if (!Array.isArray(a.todos)) a.todos = [];
      if (typeof a.kunde !== 'string') a.kunde = '';
      if (typeof a.termin !== 'string') a.termin = '';
      if (typeof a.link !== 'string') a.link = '';
      if (typeof a.notizen !== 'string') a.notizen = '';
      if (typeof a.titel !== 'string') a.titel = a.name || 'Auftrag';
      if (typeof a.art !== 'string' || !a.art) a.art = AUFTRAGSARTEN[0];
      if (typeof a.preis !== 'string') a.preis = '';
      if (!ZAHLUNGSSTATUS.some((s) => s.value === a.zahlungsstatus)) {
        a.zahlungsstatus = ZAHLUNGSSTATUS[0].value;
      }
      ensureMedien(a);
    });
    activeAuftragId = state.auftraege.length ? state.auftraege[0].id : null;
    render();
  }

  init();
})();
