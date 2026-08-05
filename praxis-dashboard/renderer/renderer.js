(function () {
  'use strict';

  const GESCHLECHT_LABEL = { w: 'weiblich', m: 'männlich', d: 'divers' };

  const JOURNAL_TYPEN = ['Anamnese', 'Befund', 'Diagnose', 'Therapie', 'Kontrolle', 'Sonstiges'];

  const TABS = [
    { key: 'basis', label: 'Basis' },
    { key: 'journal', label: 'Verlauf' },
    { key: 'rezepte', label: 'Rezepte' },
    { key: 'termine', label: 'Termine' },
    { key: 'briefe', label: 'Briefe' },
    { key: 'labor', label: 'Laborwerte' }
  ];

  const ENTRY_LIST_KEYS = ['journal', 'rezepte', 'termine', 'briefe', 'labor'];

  let state = { patients: [] };

  const ui = {
    viewMode: 'list', // 'list' | 'patient'
    selectedPatientId: null,
    activeTab: 'basis',
    searchQuery: '',
    editingPatientId: null, // set when patientFormModal is in "edit" mode
    entryModalCategory: null // 'journal' | 'rezepte' | 'termine' | 'briefe' | 'labor'
  };

  const el = {
    sidebar: document.getElementById('sidebar'),
    content: document.getElementById('content'),
    patientSearch: document.getElementById('patientSearch'),
    newPatientBtn: document.getElementById('newPatientBtn'),

    patientFormModal: document.getElementById('patientFormModal'),
    patientFormTitle: document.getElementById('patientFormTitle'),
    fieldNachname: document.getElementById('fieldNachname'),
    fieldVorname: document.getElementById('fieldVorname'),
    fieldGeburtsdatum: document.getElementById('fieldGeburtsdatum'),
    fieldGeschlecht: document.getElementById('fieldGeschlecht'),
    fieldVersicherung: document.getElementById('fieldVersicherung'),
    fieldVersichertenNr: document.getElementById('fieldVersichertenNr'),
    cancelPatientForm: document.getElementById('cancelPatientForm'),
    confirmPatientForm: document.getElementById('confirmPatientForm'),

    deletePatientModal: document.getElementById('deletePatientModal'),
    deletePatientText: document.getElementById('deletePatientText'),
    cancelDeletePatient: document.getElementById('cancelDeletePatient'),
    confirmDeletePatient: document.getElementById('confirmDeletePatient'),

    entryFormModal: document.getElementById('entryFormModal'),
    entryFormTitle: document.getElementById('entryFormTitle'),
    entryFormFields: document.getElementById('entryFormFields'),
    cancelEntryForm: document.getElementById('cancelEntryForm'),
    confirmEntryForm: document.getElementById('confirmEntryForm')
  };

  let pendingDeletePatientId = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}.${m}.${y}`;
  }

  function computeAge(birthISO) {
    const birth = new Date(birthISO);
    if (Number.isNaN(birth.getTime())) return '';
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (now.getDate() < birth.getDate()) months -= 1;
    if (months < 0) { years -= 1; months += 12; }
    if (years < 0) return '';
    return `${years}J ${months}M`;
  }

  function getPatient(id) {
    return state.patients.find((p) => p.id === id) || null;
  }

  async function persist() {
    await window.praxisAPI.saveData(state);
  }

  // ---------- Rendering ----------

  function render() {
    renderSidebar();
    renderContent();
  }

  function renderSidebar() {
    el.sidebar.replaceChildren();
    const hasPatient = !!ui.selectedPatientId;

    el.sidebar.appendChild(sidebarGroupTitle('Praxis'));
    el.sidebar.appendChild(sidebarNavBtn('Patient wählen', ui.viewMode === 'list', () => {
      ui.viewMode = 'list';
      render();
    }));
    el.sidebar.appendChild(sidebarNavBtn('Patientendaten erfassen', false, openNewPatientModal));
    el.sidebar.appendChild(sidebarNavBtn('Patientendaten ändern', false, () => {
      if (hasPatient) openEditPatientModal(ui.selectedPatientId);
    }, !hasPatient));

    el.sidebar.appendChild(sidebarGroupTitle('Behandlung'));
    el.sidebar.appendChild(sidebarNavBtn('Verlauf (Journal)', hasPatient && ui.viewMode === 'patient' && ui.activeTab === 'journal', () => selectTab('journal'), !hasPatient));
    el.sidebar.appendChild(sidebarNavBtn('Rezepte', hasPatient && ui.viewMode === 'patient' && ui.activeTab === 'rezepte', () => selectTab('rezepte'), !hasPatient));
    el.sidebar.appendChild(sidebarNavBtn('Laborwerte', hasPatient && ui.viewMode === 'patient' && ui.activeTab === 'labor', () => selectTab('labor'), !hasPatient));

    el.sidebar.appendChild(sidebarGroupTitle('Termine & Kommunikation'));
    el.sidebar.appendChild(sidebarNavBtn('Termine', hasPatient && ui.viewMode === 'patient' && ui.activeTab === 'termine', () => selectTab('termine'), !hasPatient));
    el.sidebar.appendChild(sidebarNavBtn('Briefe', hasPatient && ui.viewMode === 'patient' && ui.activeTab === 'briefe', () => selectTab('briefe'), !hasPatient));
  }

  function sidebarGroupTitle(text) {
    const div = document.createElement('div');
    div.className = 'sidebar-group-title';
    div.textContent = text;
    return div;
  }

  function sidebarNavBtn(label, active, onClick, disabled) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-btn' + (active ? ' active' : '');
    btn.textContent = label;
    if (disabled) {
      btn.disabled = true;
    } else {
      btn.addEventListener('click', onClick);
    }
    return btn;
  }

  function selectTab(tabKey) {
    ui.viewMode = 'patient';
    ui.activeTab = tabKey;
    render();
  }

  function renderContent() {
    el.content.replaceChildren();

    if (ui.viewMode === 'list' || !ui.selectedPatientId) {
      el.content.appendChild(renderPatientListView());
      return;
    }

    const patient = getPatient(ui.selectedPatientId);
    if (!patient) {
      ui.viewMode = 'list';
      ui.selectedPatientId = null;
      el.content.appendChild(renderPatientListView());
      return;
    }

    el.content.appendChild(renderPatientBanner(patient));
    el.content.appendChild(renderTabBar());
    el.content.appendChild(renderTabPanel(patient));
  }

  function renderPatientListView() {
    const wrap = document.createDocumentFragment();
    const card = document.createElement('div');
    card.className = 'panel-card';

    const filtered = state.patients
      .filter((p) => matchesSearch(p, ui.searchQuery))
      .sort((a, b) => `${a.nachname} ${a.vorname}`.localeCompare(`${b.nachname} ${b.vorname}`, 'de'));

    if (state.patients.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const p = document.createElement('p');
      p.textContent = 'Noch keine Patienten angelegt.';
      const btn = document.createElement('button');
      btn.className = 'btn-glossy btn-primary';
      btn.textContent = '+ Patient anlegen';
      btn.addEventListener('click', openNewPatientModal);
      empty.append(p, btn);
      card.appendChild(empty);
      wrap.appendChild(card);
      return wrap;
    }

    const heading = document.createElement('h2');
    heading.textContent = 'Patient wählen';
    card.appendChild(heading);

    if (filtered.length === 0) {
      const none = document.createElement('p');
      none.className = 'entry-empty';
      none.textContent = 'Keine Patienten gefunden.';
      card.appendChild(none);
    } else {
      const table = document.createElement('table');
      table.className = 'patient-table';
      const thead = document.createElement('thead');
      thead.innerHTML = '';
      const headRow = document.createElement('tr');
      ['Name', 'Geburtsdatum', 'Geschlecht', 'Krankenkasse', ''].forEach((h) => {
        const th = document.createElement('th');
        th.textContent = h;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      filtered.forEach((p) => {
        const tr = document.createElement('tr');
        tr.className = 'patient-row';

        const tdName = document.createElement('td');
        tdName.textContent = `${p.nachname}, ${p.vorname}`;
        tr.appendChild(tdName);

        const tdGeb = document.createElement('td');
        tdGeb.textContent = p.geburtsdatum ? `${formatDate(p.geburtsdatum)} (${computeAge(p.geburtsdatum)})` : '–';
        tr.appendChild(tdGeb);

        const tdGeschl = document.createElement('td');
        tdGeschl.textContent = GESCHLECHT_LABEL[p.geschlecht] || '–';
        tr.appendChild(tdGeschl);

        const tdVers = document.createElement('td');
        tdVers.textContent = p.versicherung || '–';
        tr.appendChild(tdVers);

        const tdActions = document.createElement('td');
        const actions = document.createElement('div');
        actions.className = 'row-actions';
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-glossy btn-danger btn-small';
        delBtn.textContent = 'Entfernen';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openDeletePatientModal(p.id);
        });
        actions.appendChild(delBtn);
        tdActions.appendChild(actions);
        tr.appendChild(tdActions);

        tr.addEventListener('click', () => {
          ui.selectedPatientId = p.id;
          ui.viewMode = 'patient';
          ui.activeTab = 'basis';
          render();
        });

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      card.appendChild(table);
    }

    wrap.appendChild(card);
    return wrap;
  }

  function matchesSearch(patient, query) {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${patient.nachname} ${patient.vorname}`.toLowerCase().includes(q);
  }

  function renderPatientBanner(patient) {
    const banner = document.createElement('div');
    banner.className = 'patient-banner';

    const left = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'patient-name';
    name.textContent = `${patient.nachname}, ${patient.vorname}`;
    left.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'patient-meta';
    const badges = [];
    if (patient.geburtsdatum) {
      badges.push(`* ${formatDate(patient.geburtsdatum)} (${computeAge(patient.geburtsdatum)})`);
    }
    if (patient.geschlecht) badges.push(GESCHLECHT_LABEL[patient.geschlecht]);
    if (patient.versicherung) badges.push(patient.versicherung);
    if (patient.versichertenNr) badges.push(`Vers.-Nr. ${patient.versichertenNr}`);
    badges.forEach((text) => {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = text;
      meta.appendChild(b);
    });
    left.appendChild(meta);

    banner.appendChild(left);
    return banner;
  }

  function renderTabBar() {
    const bar = document.createElement('div');
    bar.className = 'tab-bar';
    TABS.forEach((tab) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-btn' + (ui.activeTab === tab.key ? ' active' : '');
      btn.textContent = tab.label;
      btn.addEventListener('click', () => {
        ui.activeTab = tab.key;
        render();
      });
      bar.appendChild(btn);
    });
    return bar;
  }

  function renderTabPanel(patient) {
    if (ui.activeTab === 'basis') return renderBasisPanel(patient);
    return renderEntryListPanel(patient, ui.activeTab);
  }

  function renderBasisPanel(patient) {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Stammdaten';
    card.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'form-grid';
    const rows = [
      ['Nachname', patient.nachname || '–'],
      ['Vorname', patient.vorname || '–'],
      ['Geburtsdatum', patient.geburtsdatum ? `${formatDate(patient.geburtsdatum)} (${computeAge(patient.geburtsdatum)})` : '–'],
      ['Geschlecht', GESCHLECHT_LABEL[patient.geschlecht] || '–'],
      ['Krankenkasse', patient.versicherung || '–'],
      ['Versichertennummer', patient.versichertenNr || '–']
    ];
    rows.forEach(([label, value]) => {
      const wrapLabel = document.createElement('label');
      const strong = document.createElement('span');
      strong.textContent = label;
      const span = document.createElement('div');
      span.textContent = value;
      span.style.fontWeight = '600';
      span.style.color = 'var(--ink)';
      span.style.fontSize = '14px';
      wrapLabel.append(strong, span);
      grid.appendChild(wrapLabel);
    });
    card.appendChild(grid);

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-glossy btn-primary btn-small';
    editBtn.textContent = 'Stammdaten bearbeiten';
    editBtn.addEventListener('click', () => openEditPatientModal(patient.id));
    card.appendChild(editBtn);

    return card;
  }

  const CATEGORY_META = {
    journal: { title: 'Verlauf', addLabel: '+ Eintrag' },
    rezepte: { title: 'Rezepte', addLabel: '+ Rezept' },
    termine: { title: 'Termine', addLabel: '+ Termin' },
    briefe: { title: 'Briefe', addLabel: '+ Brief' },
    labor: { title: 'Laborwerte', addLabel: '+ Laborwert' }
  };

  function renderEntryListPanel(patient, category) {
    const meta = CATEGORY_META[category];
    const card = document.createElement('div');
    card.className = 'panel-card';

    const toolbar = document.createElement('div');
    toolbar.className = 'list-toolbar';
    const heading = document.createElement('h2');
    heading.textContent = meta.title;
    heading.style.margin = '0';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-glossy btn-primary btn-small';
    addBtn.textContent = meta.addLabel;
    addBtn.addEventListener('click', () => openEntryModal(category));
    toolbar.append(heading, addBtn);
    card.appendChild(toolbar);

    const entries = (patient[category] || []).slice().sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));

    if (entries.length === 0) {
      const none = document.createElement('p');
      none.className = 'entry-empty';
      none.textContent = 'Noch keine Einträge vorhanden.';
      card.appendChild(none);
      return card;
    }

    const list = document.createElement('ul');
    list.className = 'entry-list';
    entries.forEach((entry) => {
      list.appendChild(renderEntryRow(patient, category, entry));
    });
    card.appendChild(list);

    return card;
  }

  function renderEntryRow(patient, category, entry) {
    const li = document.createElement('li');
    li.className = 'entry-row';

    const date = document.createElement('div');
    date.className = 'entry-date';
    date.textContent = formatDate(entry.datum) + (entry.uhrzeit ? ` ${entry.uhrzeit}` : '');
    li.appendChild(date);

    if (category === 'journal' && entry.typ) {
      const typ = document.createElement('span');
      typ.className = 'entry-type';
      typ.textContent = entry.typ;
      li.appendChild(typ);
    }

    const text = document.createElement('div');
    text.className = 'entry-text';
    text.textContent = entryDisplayText(category, entry);
    li.appendChild(text);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-glossy btn-danger btn-icon';
    delBtn.textContent = '✕';
    delBtn.title = 'Eintrag löschen';
    delBtn.addEventListener('click', () => {
      patient[category] = patient[category].filter((e) => e.id !== entry.id);
      persist();
      render();
    });
    li.appendChild(delBtn);

    return li;
  }

  function entryDisplayText(category, entry) {
    if (category === 'rezepte') {
      return entry.hinweis ? `${entry.medikament} — ${entry.hinweis}` : entry.medikament;
    }
    if (category === 'termine') {
      return entry.grund;
    }
    if (category === 'briefe') {
      return entry.betreff ? `${entry.betreff}: ${entry.text}` : entry.text;
    }
    return entry.text;
  }

  // ---------- Patient anlegen / bearbeiten ----------

  function openNewPatientModal() {
    ui.editingPatientId = null;
    el.patientFormTitle.textContent = 'Neuen Patienten anlegen';
    el.fieldNachname.value = '';
    el.fieldVorname.value = '';
    el.fieldGeburtsdatum.value = '';
    el.fieldGeschlecht.value = 'w';
    el.fieldVersicherung.value = '';
    el.fieldVersichertenNr.value = '';
    el.patientFormModal.classList.add('open');
    el.fieldNachname.focus();
  }

  function openEditPatientModal(patientId) {
    const patient = getPatient(patientId);
    if (!patient) return;
    ui.editingPatientId = patientId;
    el.patientFormTitle.textContent = 'Patientendaten ändern';
    el.fieldNachname.value = patient.nachname || '';
    el.fieldVorname.value = patient.vorname || '';
    el.fieldGeburtsdatum.value = patient.geburtsdatum || '';
    el.fieldGeschlecht.value = patient.geschlecht || 'w';
    el.fieldVersicherung.value = patient.versicherung || '';
    el.fieldVersichertenNr.value = patient.versichertenNr || '';
    el.patientFormModal.classList.add('open');
    el.fieldNachname.focus();
  }

  function closePatientFormModal() {
    el.patientFormModal.classList.remove('open');
    ui.editingPatientId = null;
  }

  function submitPatientForm() {
    const nachname = el.fieldNachname.value.trim();
    const vorname = el.fieldVorname.value.trim();
    if (!nachname || !vorname) {
      el.fieldNachname.focus();
      return;
    }

    const data = {
      nachname,
      vorname,
      geburtsdatum: el.fieldGeburtsdatum.value || '',
      geschlecht: el.fieldGeschlecht.value,
      versicherung: el.fieldVersicherung.value.trim(),
      versichertenNr: el.fieldVersichertenNr.value.trim()
    };

    if (ui.editingPatientId) {
      const patient = getPatient(ui.editingPatientId);
      if (patient) Object.assign(patient, data);
    } else {
      const patient = {
        id: uid(),
        ...data,
        journal: [],
        rezepte: [],
        termine: [],
        briefe: [],
        labor: []
      };
      state.patients.push(patient);
      ui.selectedPatientId = patient.id;
      ui.viewMode = 'patient';
      ui.activeTab = 'basis';
    }

    closePatientFormModal();
    persist();
    render();
  }

  // ---------- Patient löschen ----------

  function openDeletePatientModal(patientId) {
    const patient = getPatient(patientId);
    if (!patient) return;
    pendingDeletePatientId = patientId;
    el.deletePatientText.textContent = `Soll „${patient.nachname}, ${patient.vorname}" wirklich entfernt werden? Alle Einträge gehen verloren.`;
    el.deletePatientModal.classList.add('open');
  }

  function closeDeletePatientModal() {
    el.deletePatientModal.classList.remove('open');
    pendingDeletePatientId = null;
  }

  function confirmDeletePatient() {
    if (!pendingDeletePatientId) return;
    state.patients = state.patients.filter((p) => p.id !== pendingDeletePatientId);
    if (ui.selectedPatientId === pendingDeletePatientId) {
      ui.selectedPatientId = null;
      ui.viewMode = 'list';
    }
    closeDeletePatientModal();
    persist();
    render();
  }

  // ---------- Einträge (Journal/Rezepte/Termine/Briefe/Labor) ----------

  function openEntryModal(category) {
    ui.entryModalCategory = category;
    el.entryFormFields.replaceChildren();
    el.entryFormTitle.textContent = CATEGORY_META[category].addLabel.replace('+ ', '') + ' hinzufügen';

    const dateLabel = fieldLabel('Datum', 'entryDatum', 'date');
    dateLabel.querySelector('input').value = todayISO();
    el.entryFormFields.appendChild(dateLabel);

    if (category === 'journal') {
      const typLabel = document.createElement('label');
      const span = document.createElement('span');
      span.textContent = 'Typ';
      const select = document.createElement('select');
      select.id = 'entryTyp';
      JOURNAL_TYPEN.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        select.appendChild(opt);
      });
      typLabel.append(span, select);
      el.entryFormFields.appendChild(typLabel);
      el.entryFormFields.appendChild(textAreaField('Text', 'entryText'));
    } else if (category === 'rezepte') {
      el.entryFormFields.appendChild(fieldLabel('Medikament', 'entryMedikament', 'text'));
      el.entryFormFields.appendChild(fieldLabel('Hinweis (Dosierung)', 'entryHinweis', 'text'));
    } else if (category === 'termine') {
      el.entryFormFields.appendChild(fieldLabel('Uhrzeit', 'entryUhrzeit', 'time'));
      el.entryFormFields.appendChild(fieldLabel('Grund', 'entryGrund', 'text'));
    } else if (category === 'briefe') {
      el.entryFormFields.appendChild(fieldLabel('Betreff', 'entryBetreff', 'text'));
      el.entryFormFields.appendChild(textAreaField('Text', 'entryText'));
    } else if (category === 'labor') {
      el.entryFormFields.appendChild(textAreaField('Befund', 'entryText'));
    }

    el.entryFormModal.classList.add('open');
  }

  function fieldLabel(labelText, id, type) {
    const label = document.createElement('label');
    const span = document.createElement('span');
    span.textContent = labelText;
    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    label.append(span, input);
    return label;
  }

  function textAreaField(labelText, id) {
    const label = document.createElement('label');
    label.className = 'full-width';
    const span = document.createElement('span');
    span.textContent = labelText;
    const textarea = document.createElement('textarea');
    textarea.id = id;
    label.append(span, textarea);
    return label;
  }

  function closeEntryModal() {
    el.entryFormModal.classList.remove('open');
    ui.entryModalCategory = null;
  }

  function submitEntryForm() {
    const category = ui.entryModalCategory;
    if (!category || !ui.selectedPatientId) return;
    const patient = getPatient(ui.selectedPatientId);
    if (!patient) return;

    const byId = (id) => document.getElementById(id);
    const datum = byId('entryDatum') ? byId('entryDatum').value : '';

    let entry = { id: uid(), datum };

    if (category === 'journal') {
      const text = byId('entryText').value.trim();
      if (!text) return;
      entry.typ = byId('entryTyp').value;
      entry.text = text;
    } else if (category === 'rezepte') {
      const medikament = byId('entryMedikament').value.trim();
      if (!medikament) return;
      entry.medikament = medikament;
      entry.hinweis = byId('entryHinweis').value.trim();
    } else if (category === 'termine') {
      const grund = byId('entryGrund').value.trim();
      if (!grund) return;
      entry.uhrzeit = byId('entryUhrzeit').value;
      entry.grund = grund;
    } else if (category === 'briefe') {
      const text = byId('entryText').value.trim();
      if (!text) return;
      entry.betreff = byId('entryBetreff').value.trim();
      entry.text = text;
    } else if (category === 'labor') {
      const text = byId('entryText').value.trim();
      if (!text) return;
      entry.text = text;
    }

    if (!patient[category]) patient[category] = [];
    patient[category].push(entry);

    closeEntryModal();
    persist();
    render();
  }

  // ---------- Event-Listener ----------

  el.newPatientBtn.addEventListener('click', openNewPatientModal);

  el.patientSearch.addEventListener('input', (e) => {
    ui.searchQuery = e.target.value;
    render();
  });

  el.cancelPatientForm.addEventListener('click', closePatientFormModal);
  el.confirmPatientForm.addEventListener('click', submitPatientForm);
  el.patientFormModal.addEventListener('click', (e) => {
    if (e.target === el.patientFormModal) closePatientFormModal();
  });

  el.cancelDeletePatient.addEventListener('click', closeDeletePatientModal);
  el.confirmDeletePatient.addEventListener('click', confirmDeletePatient);
  el.deletePatientModal.addEventListener('click', (e) => {
    if (e.target === el.deletePatientModal) closeDeletePatientModal();
  });

  el.cancelEntryForm.addEventListener('click', closeEntryModal);
  el.confirmEntryForm.addEventListener('click', submitEntryForm);
  el.entryFormModal.addEventListener('click', (e) => {
    if (e.target === el.entryFormModal) closeEntryModal();
  });

  // ---------- Initialisierung ----------

  async function init() {
    const loaded = await window.praxisAPI.loadData();
    state = loaded && Array.isArray(loaded.patients) ? loaded : { patients: [] };
    render();
  }

  init();
})();
