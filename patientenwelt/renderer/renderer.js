(function () {
  'use strict';

  const GESCHLECHT_LABEL = { w: 'weiblich', m: 'männlich', d: 'divers' };

  const JOURNAL_TYPEN = ['Anamnese', 'Befund', 'Diagnose', 'Therapie', 'Kontrolle', 'Sonstiges'];

  const TABS = [
    { key: 'basis', label: 'Basis' },
    { key: 'journal', label: 'Verlauf' },
    { key: 'rezepte', label: 'Rezepte' },
    { key: 'termine', label: 'Termine' },
    { key: 'kalender', label: 'Kalender' },
    { key: 'abrechnung', label: 'Abrechnung' },
    { key: 'briefe', label: 'Briefe' },
    { key: 'labor', label: 'Laborwerte' }
  ];

  const ABRECHNUNG_KATEGORIEN = {
    privat: 'Privatliquidation',
    gkv: 'KV-Abrechnung',
    bg: 'BG-Abrechnung'
  };

  // Kleine Ziffern-Auswahl als Ausfüllhilfe (keine offizielle EBM/GOÄ-Datenbank).
  const ZIFFERN_VORSCHLAEGE = [
    { ziffer: '01', bezeichnung: 'Beratung', betrag: 15 },
    { ziffer: '06', bezeichnung: 'Grundpauschale', betrag: 22 },
    { ziffer: '1200', bezeichnung: 'Basisdiagnostik Auge', betrag: 18.5 },
    { ziffer: '06225', bezeichnung: 'Kontrolluntersuchung', betrag: 12 }
  ];

  const WOCHENTAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  // Indiziert wie Date#getDay() (0 = Sonntag), anders als WOCHENTAGE_KURZ (Montag zuerst).
  const WOCHENTAGE_LANG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const MONATSNAMEN = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const ENTRY_LIST_KEYS = [
    'journal', 'rezepte', 'termine', 'briefe', 'labor',
    'laborwerte', 'krankenscheine', 'uebergaben',
    'ueberweisungen', 'befundweiterleitung', 'krankmeldungen'
  ];

  const DRINGLICHKEIT_LABEL = { normal: 'Normal', dringend: 'Dringend' };
  const AU_ART_LABEL = { erst: 'Erstbescheinigung', folge: 'Folgebescheinigung' };
  const KARTENGENERATION_LABEL = { g1: 'G1', g2: 'G2', 'g2.1': 'G2.1' };

  const VERORDNUNGSSTATUS_LABEL = { offen: 'Offen', eingeloest: 'Eingelöst', storniert: 'Storniert' };
  const LEISTUNGSSTATUS_LABEL = { offen: 'Offen', abgerechnet: 'Abgerechnet', bezahlt: 'Bezahlt' };
  const VERSICHERTENKARTE_STATUS_LABEL = { ungeprueft: 'Ungeprüft', geprueft: 'Geprüft', abgelaufen: 'Abgelaufen' };
  const WARTELISTE_STATUS_LABEL = { wartet: 'Wartet', aufgerufen: 'Aufgerufen', fertig: 'Fertig' };
  const WARTELISTE_STATUS_ORDER = ['wartet', 'aufgerufen', 'fertig'];

  let state = { patients: [] };

  const ui = {
    viewMode: 'list', // 'list' | 'patient' | …
    selectedPatientId: null,
    activeTab: 'basis',
    searchQuery: '',
    editingPatientId: null, // set when patientFormModal is in "edit" mode
    entryModalCategory: null, // 'journal' | 'rezepte' | 'termine' | 'briefe' | 'labor'
    sortKey: 'name', // 'name' | 'geburtsdatum' | 'geschlecht' | 'versicherung'
    sortDir: 'asc', // 'asc' | 'desc'
    billingKategorie: 'privat', // 'privat' | 'gkv' | 'bg' – für viewMode === 'billing'
    abrechnungFilter: 'alle', // 'alle' | 'privat' | 'gkv' | 'bg' – Filter im Patienten-Tab "Abrechnung"
    invoicePatientId: null, // für viewMode === 'invoice'
    printEntryId: null // id des zu druckenden Eintrags für viewMode === 'print-ueberweisung' | 'print-befund' | 'print-terminkarte'
  };

  const el = {
    authScreen: document.getElementById('authScreen'),
    authCard: document.getElementById('authCard'),
    appShell: document.getElementById('appShell'),
    headerUser: document.getElementById('headerUser'),
    userChip: document.getElementById('userChip'),
    lockBtn: document.getElementById('lockBtn'),

    sidebar: document.getElementById('sidebar'),
    content: document.getElementById('content'),
    patientSearch: document.getElementById('patientSearch'),
    newPatientBtn: document.getElementById('newPatientBtn'),

    toolPatientListBtn: document.getElementById('toolPatientListBtn'),
    toolNewPatientBtn: document.getElementById('toolNewPatientBtn'),
    toolSearchBtn: document.getElementById('toolSearchBtn'),
    toolTermineBtn: document.getElementById('toolTermineBtn'),
    toolBriefeBtn: document.getElementById('toolBriefeBtn'),
    toolLaborBtn: document.getElementById('toolLaborBtn'),
    toolPrintBtn: document.getElementById('toolPrintBtn'),
    toolReloadBtn: document.getElementById('toolReloadBtn'),

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
    confirmEntryForm: document.getElementById('confirmEntryForm'),

    userFormModal: document.getElementById('userFormModal'),
    fieldUserName: document.getElementById('fieldUserName'),
    fieldUserRole: document.getElementById('fieldUserRole'),
    fieldUserPassword: document.getElementById('fieldUserPassword'),
    fieldUserPasswordConfirm: document.getElementById('fieldUserPasswordConfirm'),
    userFormError: document.getElementById('userFormError'),
    cancelUserForm: document.getElementById('cancelUserForm'),
    confirmUserForm: document.getElementById('confirmUserForm'),

    confirmActionModal: document.getElementById('confirmActionModal'),
    confirmActionTitle: document.getElementById('confirmActionTitle'),
    confirmActionText: document.getElementById('confirmActionText'),
    cancelConfirmAction: document.getElementById('cancelConfirmAction'),
    confirmConfirmAction: document.getElementById('confirmConfirmAction')
  };

  let pendingDeletePatientId = null;
  let currentUser = null; // { id, name, role }
  let idleTimer = null;
  const IDLE_LOCK_MS = 5 * 60 * 1000; // 5 Minuten Inaktivität sperren
  let pendingConfirmAction = null; // async function, vom generischen Bestätigungs-Modal aufgerufen

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

  // Füllt bei älteren, bereits gespeicherten Datensätzen neu hinzugekommene Felder
  // mit sinnvollen Leerwerten auf, damit bestehende Dateien weiter laden.
  function normalizePatient(patient) {
    ENTRY_LIST_KEYS.concat(['abrechnung']).forEach((key) => {
      if (!Array.isArray(patient[key])) patient[key] = [];
    });
    if (!patient.versichertenkarte || typeof patient.versichertenkarte !== 'object') {
      patient.versichertenkarte = { status: 'ungeprueft', geprueftAm: '', gueltigBis: '', kartennummer: '', kartengeneration: '' };
    }
    if (typeof patient.versichertenkarte.kartennummer !== 'string') patient.versichertenkarte.kartennummer = '';
    if (typeof patient.versichertenkarte.kartengeneration !== 'string') patient.versichertenkarte.kartengeneration = '';
    if (typeof patient.scheinrueckseite !== 'string') patient.scheinrueckseite = '';
    if (!patient.archivinfo || typeof patient.archivinfo !== 'object') {
      patient.archivinfo = { sd: '', md: '' };
    }
    if (typeof patient.erstelltAm !== 'string') patient.erstelltAm = '';
    patient.abrechnung.forEach((e) => { if (!e.status) e.status = 'offen'; });
    patient.rezepte.forEach((e) => { if (!e.status) e.status = 'offen'; });
    return patient;
  }

  function normalizeState(s) {
    const next = (s && Array.isArray(s.patients)) ? s : { patients: [] };
    if (!Array.isArray(next.auditLog)) next.auditLog = [];
    if (!Array.isArray(next.kassenbuch)) next.kassenbuch = [];
    if (!Array.isArray(next.formVorlagen)) next.formVorlagen = [];
    if (!Array.isArray(next.druckauftraege)) next.druckauftraege = [];
    if (!Array.isArray(next.recalls)) next.recalls = [];
    if (!Array.isArray(next.warteliste)) next.warteliste = [];
    if (!Array.isArray(next.zusatzleistungen)) next.zusatzleistungen = [];
    next.patients.forEach(normalizePatient);
    return next;
  }

  async function persist() {
    const result = await window.patientenweltAPI.saveData(state);
    if (result && result.success === false) {
      console.warn('Speichern fehlgeschlagen:', result.error);
    }
  }

  function logAction(action, details) {
    if (!currentUser) return;
    if (!Array.isArray(state.auditLog)) state.auditLog = [];
    state.auditLog.unshift({
      id: uid(),
      datum: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      details: details || ''
    });
    if (state.auditLog.length > 500) state.auditLog.length = 500;
  }

  // ---------- Rendering ----------

  function render() {
    renderSidebar();
    renderContent();
    updateToolbarState();
  }

  function updateToolbarState() {
    const hasPatient = !!ui.selectedPatientId;
    el.toolTermineBtn.disabled = !hasPatient;
    el.toolBriefeBtn.disabled = !hasPatient;
    el.toolLaborBtn.disabled = !hasPatient;
  }

  // Menügruppen und die dahinterliegenden echten Funktionen (siehe Referenz-Screenshot
  // der Praxissoftware). Jeder Menüpunkt hat jetzt eine reale Funktion statt eines
  // Platzhalters; einige Beschriftungen (z. B. "Archivinformation SD"/"MD") führen
  // bewusst zur selben zusammengefassten Ansicht, statt Daten künstlich zu splitten.
  const MENU_GROUPS = [
    {
      afterGroup: 'Praxis',
      items: [
        'Praxisgebühr Info', 'Praxisgebühr Kassenbuch', 'Registrierung Versichertenkarte',
        'Krankenkassenkarte lesen', 'Krankenscheinabgabe', 'Formulare', 'Druckauftrag Formular',
        'Recallfunktion', 'Warteliste Eintragen', 'Warteliste Nachsehen'
      ]
    },
    {
      afterGroup: 'Behandlung',
      items: ['Laborwerterfassung', 'Leistungsstatus', 'Verordnungsstatus', 'Überweisung', 'Befund weiterleiten', 'Krankmeldung']
    },
    {
      afterGroup: 'Termine',
      items: ['Nächster Termin']
    },
    {
      title: 'Patientenverwaltung',
      items: [
        'Scheinrückseite', 'Übergabe Patient', 'Patientendaten duplizieren',
        'Archivinformation SD', 'Archivinformation MD'
      ]
    },
    {
      title: 'Auswertung',
      items: ['Analyse allgemein', 'Analyse Leistungen', 'Analyse Verordnungen']
    },
    {
      title: 'Weitere Services',
      items: ['Weitere Services']
    }
  ];

  function gotoView(viewMode) {
    ui.viewMode = viewMode;
    render();
  }

  const MENU_ACTIONS = {
    'Praxisgebühr Info': { activeViewMode: 'praxisgebuehr-info', onClick: () => gotoView('praxisgebuehr-info') },
    'Praxisgebühr Kassenbuch': { activeViewMode: 'kassenbuch', onClick: () => gotoView('kassenbuch') },
    'Registrierung Versichertenkarte': { activeViewMode: 'versichertenkarten', onClick: () => gotoView('versichertenkarten') },
    'Krankenkassenkarte lesen': { activeViewMode: 'tool-krankenkassenkarte', requiresPatient: true, onClick: () => gotoView('tool-krankenkassenkarte') },
    'Krankenscheinabgabe': { activeViewMode: 'tool-krankenscheine', requiresPatient: true, onClick: () => gotoView('tool-krankenscheine') },
    'Formulare': { activeViewMode: 'formulare', onClick: () => gotoView('formulare') },
    'Druckauftrag Formular': { activeViewMode: 'druckauftrag', onClick: () => gotoView('druckauftrag') },
    'Recallfunktion': { activeViewMode: 'recall', onClick: () => gotoView('recall') },
    // Beide Warteliste-Einträge führen bewusst zur selben Ansicht (Eintragen + Nachsehen
    // sind dort kombiniert) — nur einer trägt die Hervorhebung, damit nicht zwei
    // Menüpunkte gleichzeitig als aktiv erscheinen.
    'Warteliste Eintragen': { onClick: () => gotoView('warteliste') },
    'Warteliste Nachsehen': { activeViewMode: 'warteliste', onClick: () => gotoView('warteliste') },

    'Laborwerterfassung': { activeViewMode: 'tool-laborwerte', requiresPatient: true, onClick: () => gotoView('tool-laborwerte') },
    'Leistungsstatus': { activeViewMode: 'tool-leistungsstatus', requiresPatient: true, onClick: () => gotoView('tool-leistungsstatus') },
    'Verordnungsstatus': { activeViewMode: 'tool-verordnungsstatus', requiresPatient: true, onClick: () => gotoView('tool-verordnungsstatus') },
    'Überweisung': { activeViewMode: 'tool-ueberweisungen', requiresPatient: true, onClick: () => gotoView('tool-ueberweisungen') },
    'Befund weiterleiten': { activeViewMode: 'tool-befundweiterleitung', requiresPatient: true, onClick: () => gotoView('tool-befundweiterleitung') },
    'Krankmeldung': { activeViewMode: 'tool-krankmeldungen', requiresPatient: true, onClick: () => gotoView('tool-krankmeldungen') },
    'Nächster Termin': { activeViewMode: 'tool-terminkarte', requiresPatient: true, onClick: () => gotoView('tool-terminkarte') },

    'Scheinrückseite': { activeViewMode: 'tool-scheinrueckseite', requiresPatient: true, onClick: () => gotoView('tool-scheinrueckseite') },
    'Übergabe Patient': { activeViewMode: 'tool-uebergaben', requiresPatient: true, onClick: () => gotoView('tool-uebergaben') },
    'Patientendaten duplizieren': {
      requiresPatient: true,
      onClick: () => {
        const patient = getPatient(ui.selectedPatientId);
        if (patient) duplicatePatient(patient);
      }
    },
    // Beide Archivinformation-Einträge zeigen dieselbe kombinierte Ansicht (SD+MD
    // zusammen); auch hier trägt nur einer die Aktiv-Hervorhebung.
    'Archivinformation SD': { requiresPatient: true, onClick: () => gotoView('tool-archivinfo') },
    'Archivinformation MD': { activeViewMode: 'tool-archivinfo', requiresPatient: true, onClick: () => gotoView('tool-archivinfo') },

    'Analyse allgemein': { activeViewMode: 'analyse-allgemein', onClick: () => gotoView('analyse-allgemein') },
    'Analyse Leistungen': { activeViewMode: 'analyse-leistungen', onClick: () => gotoView('analyse-leistungen') },
    'Analyse Verordnungen': { activeViewMode: 'analyse-verordnungen', onClick: () => gotoView('analyse-verordnungen') },

    'Weitere Services': { activeViewMode: 'weitere-services', onClick: () => gotoView('weitere-services') }
  };

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
    appendMenuGroupItems('Praxis');

    el.sidebar.appendChild(sidebarGroupTitle('Behandlung'));
    el.sidebar.appendChild(sidebarNavBtn('Verlauf (Journal)', hasPatient && ui.viewMode === 'patient' && ui.activeTab === 'journal', () => selectTab('journal'), !hasPatient));
    el.sidebar.appendChild(sidebarNavBtn('Rezepte', hasPatient && ui.viewMode === 'patient' && ui.activeTab === 'rezepte', () => selectTab('rezepte'), !hasPatient));
    el.sidebar.appendChild(sidebarNavBtn('Laborwerte', hasPatient && ui.viewMode === 'patient' && ui.activeTab === 'labor', () => selectTab('labor'), !hasPatient));
    appendMenuGroupItems('Behandlung');

    el.sidebar.appendChild(sidebarGroupTitle('Termine & Kommunikation'));
    el.sidebar.appendChild(sidebarNavBtn('Termine', hasPatient && ui.viewMode === 'patient' && ui.activeTab === 'termine', () => selectTab('termine'), !hasPatient));
    el.sidebar.appendChild(sidebarNavBtn('Kalender', hasPatient && ui.viewMode === 'patient' && ui.activeTab === 'kalender', () => selectTab('kalender'), !hasPatient));
    el.sidebar.appendChild(sidebarNavBtn('Briefe', hasPatient && ui.viewMode === 'patient' && ui.activeTab === 'briefe', () => selectTab('briefe'), !hasPatient));
    appendMenuGroupItems('Termine');

    el.sidebar.appendChild(sidebarGroupTitle('Abrechnung'));
    Object.entries(ABRECHNUNG_KATEGORIEN).forEach(([key, label]) => {
      el.sidebar.appendChild(sidebarNavBtn(
        label,
        ui.viewMode === 'billing' && ui.billingKategorie === key,
        () => {
          ui.viewMode = 'billing';
          ui.billingKategorie = key;
          render();
        }
      ));
    });

    MENU_GROUPS.filter((g) => g.title).forEach((group) => {
      el.sidebar.appendChild(sidebarGroupTitle(group.title));
      group.items.forEach((label) => {
        el.sidebar.appendChild(sidebarActionBtn(label));
      });
    });

    if (currentUser && currentUser.role === 'admin') {
      el.sidebar.appendChild(sidebarGroupTitle('Sicherheit'));
      el.sidebar.appendChild(sidebarNavBtn('Benutzerverwaltung', ui.viewMode === 'users', () => {
        ui.viewMode = 'users';
        loadUsersView();
        render();
      }));
      el.sidebar.appendChild(sidebarNavBtn('Protokoll', ui.viewMode === 'audit', () => {
        ui.viewMode = 'audit';
        render();
      }));
      el.sidebar.appendChild(sidebarNavBtn('Datensicherung', ui.viewMode === 'backups', () => {
        ui.viewMode = 'backups';
        loadBackupsView();
        render();
      }));
      el.sidebar.appendChild(sidebarNavBtn('Datenexport', ui.viewMode === 'export', () => {
        ui.viewMode = 'export';
        render();
      }));
    }
  }

  function appendMenuGroupItems(afterGroup) {
    const group = MENU_GROUPS.find((g) => g.afterGroup === afterGroup);
    if (!group) return;
    group.items.forEach((label) => {
      el.sidebar.appendChild(sidebarActionBtn(label));
    });
  }

  function sidebarActionBtn(label) {
    const action = MENU_ACTIONS[label];
    if (!action) return sidebarNavBtn(label, false, () => {}, true);
    const disabled = !!action.requiresPatient && !ui.selectedPatientId;
    const active = !!action.activeViewMode && ui.viewMode === action.activeViewMode;
    return sidebarNavBtn(label, active, action.onClick, disabled);
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

    if (ui.viewMode === 'users' && currentUser && currentUser.role === 'admin') {
      el.content.appendChild(renderUsersView());
      return;
    }

    if (ui.viewMode === 'audit' && currentUser && currentUser.role === 'admin') {
      el.content.appendChild(renderAuditView());
      return;
    }

    if (ui.viewMode === 'backups' && currentUser && currentUser.role === 'admin') {
      el.content.appendChild(renderBackupsView());
      return;
    }

    if (ui.viewMode === 'export' && currentUser && currentUser.role === 'admin') {
      el.content.appendChild(renderExportView());
      return;
    }

    if (ui.viewMode === 'praxisgebuehr-info') {
      el.content.appendChild(renderPraxisgebuehrInfoView());
      return;
    }
    if (ui.viewMode === 'kassenbuch') {
      el.content.appendChild(renderKassenbuchView());
      return;
    }
    if (ui.viewMode === 'versichertenkarten') {
      el.content.appendChild(renderVersichertenkartenView());
      return;
    }
    if (ui.viewMode === 'formulare') {
      el.content.appendChild(renderFormulareView());
      return;
    }
    if (ui.viewMode === 'druckauftrag') {
      el.content.appendChild(renderDruckauftragView());
      return;
    }
    if (ui.viewMode === 'recall') {
      el.content.appendChild(renderRecallView());
      return;
    }
    if (ui.viewMode === 'warteliste') {
      el.content.appendChild(renderWartelisteView());
      return;
    }
    if (ui.viewMode === 'analyse-allgemein') {
      el.content.appendChild(renderAnalyseAllgemeinView());
      return;
    }
    if (ui.viewMode === 'analyse-leistungen') {
      el.content.appendChild(renderAnalyseLeistungenView());
      return;
    }
    if (ui.viewMode === 'analyse-verordnungen') {
      el.content.appendChild(renderAnalyseVerordnungenView());
      return;
    }
    if (ui.viewMode === 'weitere-services') {
      el.content.appendChild(renderWeitereServicesView());
      return;
    }

    if (ui.viewMode === 'tool-laborwerte') {
      renderPatientToolView((p) => renderEntryListPanel(p, 'laborwerte'));
      return;
    }
    if (ui.viewMode === 'tool-krankenscheine') {
      renderPatientToolView((p) => renderEntryListPanel(p, 'krankenscheine'));
      return;
    }
    if (ui.viewMode === 'tool-uebergaben') {
      renderPatientToolView((p) => renderEntryListPanel(p, 'uebergaben'));
      return;
    }
    if (ui.viewMode === 'tool-leistungsstatus') {
      renderPatientToolView(renderLeistungsstatusView);
      return;
    }
    if (ui.viewMode === 'tool-verordnungsstatus') {
      renderPatientToolView(renderVerordnungsstatusView);
      return;
    }
    if (ui.viewMode === 'tool-scheinrueckseite') {
      renderPatientToolView(renderScheinrueckseiteView);
      return;
    }
    if (ui.viewMode === 'tool-archivinfo') {
      renderPatientToolView(renderArchivinfoView);
      return;
    }
    if (ui.viewMode === 'tool-ueberweisungen') {
      renderPatientToolView((p) => renderEntryListPanel(p, 'ueberweisungen'));
      return;
    }
    if (ui.viewMode === 'tool-befundweiterleitung') {
      renderPatientToolView((p) => renderEntryListPanel(p, 'befundweiterleitung'));
      return;
    }
    if (ui.viewMode === 'tool-krankmeldungen') {
      renderPatientToolView((p) => renderEntryListPanel(p, 'krankmeldungen'));
      return;
    }
    if (ui.viewMode === 'tool-krankenkassenkarte') {
      renderPatientToolView(renderKrankenkassenkarteLesenView);
      return;
    }
    if (ui.viewMode === 'tool-terminkarte') {
      renderPatientToolView(renderTerminkarteToolView);
      return;
    }
    if (ui.viewMode === 'print-ueberweisung') {
      renderPatientToolView(renderUeberweisungPrintView);
      return;
    }
    if (ui.viewMode === 'print-befund') {
      renderPatientToolView(renderBefundPrintView);
      return;
    }
    if (ui.viewMode === 'print-krankmeldung') {
      renderPatientToolView(renderKrankmeldungPrintView);
      return;
    }
    if (ui.viewMode === 'print-terminkarte') {
      renderPatientToolView(renderTerminkartePrintView);
      return;
    }

    if (ui.viewMode === 'billing') {
      el.content.appendChild(renderBillingOverview(ui.billingKategorie));
      return;
    }

    if (ui.viewMode === 'invoice') {
      const invoicePatient = getPatient(ui.invoicePatientId);
      if (invoicePatient) {
        el.content.appendChild(renderInvoiceView(invoicePatient));
        return;
      }
      ui.viewMode = 'list';
    }

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

    if (state.patients.length === 0) {
      const card = document.createElement('div');
      card.className = 'panel-card';
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

    wrap.appendChild(renderOverviewStats());

    const card = document.createElement('div');
    card.className = 'panel-card';

    const filtered = sortPatients(
      state.patients.filter((p) => matchesSearch(p, ui.searchQuery)),
      ui.sortKey,
      ui.sortDir
    );

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
      const headRow = document.createElement('tr');
      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'geburtsdatum', label: 'Geburtsdatum' },
        { key: 'geschlecht', label: 'Geschlecht' },
        { key: 'versicherung', label: 'Krankenkasse' },
        { key: null, label: '' }
      ];
      columns.forEach((col) => {
        const th = document.createElement('th');
        if (col.key) {
          th.className = 'sortable';
          th.textContent = col.label;
          if (ui.sortKey === col.key) {
            const arrow = document.createElement('span');
            arrow.className = 'sort-arrow';
            arrow.textContent = ui.sortDir === 'asc' ? '▲' : '▼';
            th.appendChild(arrow);
          }
          th.addEventListener('click', () => {
            if (ui.sortKey === col.key) {
              ui.sortDir = ui.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
              ui.sortKey = col.key;
              ui.sortDir = 'asc';
            }
            render();
          });
        } else {
          th.textContent = col.label;
        }
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
        if (currentUser && currentUser.role === 'admin') {
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
        }
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

  // ---------- Sicherheit: Benutzerverwaltung / Protokoll / Datensicherung ----------

  let usersCache = { loading: false, users: [] };
  let backupsCache = { loading: false, backups: [] };

  async function loadUsersView() {
    usersCache.loading = true;
    const users = await window.patientenweltAPI.listUsers();
    usersCache = { loading: false, users: users || [] };
    if (ui.viewMode === 'users') render();
  }

  async function loadBackupsView() {
    backupsCache.loading = true;
    const res = await window.patientenweltAPI.listBackups();
    backupsCache = { loading: false, backups: (res && res.success) ? res.backups : [] };
    if (ui.viewMode === 'backups') render();
  }

  function renderUsersView() {
    const wrap = document.createDocumentFragment();
    const card = document.createElement('div');
    card.className = 'panel-card';

    const toolbar = document.createElement('div');
    toolbar.className = 'list-toolbar';
    const heading = document.createElement('h2');
    heading.textContent = 'Benutzerverwaltung';
    heading.style.margin = '0';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-glossy btn-primary btn-small';
    addBtn.textContent = '+ Neuer Benutzer';
    addBtn.addEventListener('click', openUserFormModal);
    toolbar.append(heading, addBtn);
    card.appendChild(toolbar);

    if (usersCache.loading) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Lade Benutzer …';
      card.appendChild(p);
      wrap.appendChild(card);
      return wrap;
    }

    const adminCount = usersCache.users.filter((u) => u.role === 'admin').length;

    const table = document.createElement('table');
    table.className = 'patient-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Name', 'Rolle', ''].forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    usersCache.users.forEach((u) => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.textContent = u.name;
      if (currentUser && u.id === currentUser.id) tdName.textContent += ' (Sie)';
      tr.appendChild(tdName);

      const tdRole = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'role-badge' + (u.role === 'admin' ? ' role-admin' : '');
      badge.textContent = u.role === 'admin' ? 'Administrator' : 'Mitarbeiter';
      tdRole.appendChild(badge);
      tr.appendChild(tdRole);

      const tdActions = document.createElement('td');
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-glossy btn-danger btn-small';
      removeBtn.textContent = 'Entfernen';
      const isLastAdmin = u.role === 'admin' && adminCount <= 1;
      if (isLastAdmin) {
        removeBtn.disabled = true;
        removeBtn.title = 'Der letzte Administrator kann nicht entfernt werden.';
      } else {
        removeBtn.addEventListener('click', () => {
          openConfirm(
            'Benutzer entfernen?',
            `Soll „${u.name}" wirklich entfernt werden? Diese Person kann sich danach nicht mehr anmelden.`,
            async () => {
              const removingSelf = currentUser && u.id === currentUser.id;
              const res = await window.patientenweltAPI.removeUser(u.id);
              if (!res || !res.success) {
                showAuthlessError(res && res.error);
                return;
              }
              if (removingSelf) {
                // Die Sitzung wurde serverseitig bereits beendet (kein DEK mehr im
                // Hauptprozess) — hier nur noch den Renderer-Zustand nachziehen,
                // ohne persist() aufzurufen (das würde ohne Anmeldung fehlschlagen).
                currentUser = null;
                state = { patients: [] };
                ui.viewMode = 'list';
                ui.selectedPatientId = null;
                el.appShell.hidden = true;
                el.authScreen.hidden = false;
                boot();
                return;
              }
              logAction('Benutzer entfernt', u.name);
              await persist();
              usersCache.users = res.users;
              render();
            }
          );
        });
      }
      tdActions.appendChild(removeBtn);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);

    wrap.appendChild(card);
    return wrap;
  }

  function showAuthlessError(message) {
    // Einfache, nicht blockierende Rückmeldung für Aktionen außerhalb von Formularen.
    window.alert(message || 'Aktion fehlgeschlagen.');
  }

  function openUserFormModal() {
    el.fieldUserName.value = '';
    el.fieldUserRole.value = 'mitarbeiter';
    el.fieldUserPassword.value = '';
    el.fieldUserPasswordConfirm.value = '';
    el.userFormError.textContent = '';
    el.userFormModal.classList.add('open');
    el.fieldUserName.focus();
  }

  function closeUserFormModal() {
    el.userFormModal.classList.remove('open');
  }

  async function submitUserForm() {
    const name = el.fieldUserName.value.trim();
    const role = el.fieldUserRole.value;
    const password = el.fieldUserPassword.value;
    const passwordConfirm = el.fieldUserPasswordConfirm.value;

    if (!name) {
      el.userFormError.textContent = 'Name ist erforderlich.';
      return;
    }
    if (password.length < 6) {
      el.userFormError.textContent = 'Passwort muss mindestens 6 Zeichen haben.';
      return;
    }
    if (password !== passwordConfirm) {
      el.userFormError.textContent = 'Passwörter stimmen nicht überein.';
      return;
    }

    const res = await window.patientenweltAPI.addUser(name, password, role);
    if (!res || !res.success) {
      el.userFormError.textContent = (res && res.error) || 'Anlegen fehlgeschlagen.';
      return;
    }

    logAction('Benutzer angelegt', `${name} (${role === 'admin' ? 'Administrator' : 'Mitarbeiter'})`);
    await persist();
    usersCache.users = res.users;
    closeUserFormModal();
    render();
  }

  function renderAuditView() {
    const card = document.createElement('div');
    card.className = 'panel-card';

    const toolbar = document.createElement('div');
    toolbar.className = 'list-toolbar';
    const heading = document.createElement('h2');
    heading.textContent = 'Protokoll';
    heading.style.margin = '0';
    toolbar.appendChild(heading);

    const log = Array.isArray(state.auditLog) ? state.auditLog : [];
    if (log.length > 0) {
      const exportBtn = document.createElement('button');
      exportBtn.className = 'btn-glossy btn-secondary btn-small';
      exportBtn.textContent = 'Als CSV exportieren';
      exportBtn.addEventListener('click', exportAuditLogCSV);
      toolbar.appendChild(exportBtn);
    }
    card.appendChild(toolbar);

    if (log.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine protokollierten Aktionen.';
      card.appendChild(p);
      return card;
    }

    const table = document.createElement('table');
    table.className = 'patient-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Zeitpunkt', 'Benutzer', 'Aktion', 'Details'].forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    log.forEach((entry) => {
      const tr = document.createElement('tr');
      const tdDate = document.createElement('td');
      tdDate.textContent = formatDateTime(entry.datum);
      tr.appendChild(tdDate);
      const tdUser = document.createElement('td');
      tdUser.textContent = entry.userName || '–';
      tr.appendChild(tdUser);
      const tdAction = document.createElement('td');
      tdAction.textContent = entry.action || '–';
      tr.appendChild(tdAction);
      const tdDetails = document.createElement('td');
      tdDetails.textContent = entry.details || '';
      tr.appendChild(tdDetails);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);

    return card;
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso || '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function renderBackupsView() {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Datensicherung';
    card.appendChild(heading);

    const info = document.createElement('p');
    info.className = 'entry-empty';
    info.textContent = 'Bei jedem Speichern wird automatisch eine Sicherung angelegt (die letzten 10 werden aufbewahrt).';
    card.appendChild(info);

    if (backupsCache.loading) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Lade Sicherungen …';
      card.appendChild(p);
      return card;
    }

    if (backupsCache.backups.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine Sicherungen vorhanden.';
      card.appendChild(p);
      return card;
    }

    const list = document.createElement('ul');
    list.className = 'entry-list';
    backupsCache.backups.forEach((b) => {
      const li = document.createElement('li');
      li.className = 'entry-row';

      const date = document.createElement('div');
      date.className = 'entry-date';
      date.textContent = formatDateTime(b.mtime);
      li.appendChild(date);

      const text = document.createElement('div');
      text.className = 'entry-text';
      text.textContent = `${(b.size / 1024).toFixed(1)} KB`;
      li.appendChild(text);

      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'btn-glossy btn-primary btn-small';
      restoreBtn.textContent = 'Wiederherstellen';
      restoreBtn.addEventListener('click', () => {
        openConfirm(
          'Backup wiederherstellen?',
          `Der aktuelle Stand wird zuvor selbst als Sicherung gespeichert. Soll der Stand vom ${formatDateTime(b.mtime)} wiederhergestellt werden?`,
          async () => {
            const res = await window.patientenweltAPI.restoreBackup(b.filename);
            if (res && res.success) {
              state = normalizeState(res.state);
              logAction('Backup wiederhergestellt', formatDateTime(b.mtime));
              await persist();
              loadBackupsView();
              ui.viewMode = 'list';
              ui.selectedPatientId = null;
              render();
            } else {
              showAuthlessError(res && res.error);
            }
          }
        );
      });
      li.appendChild(restoreBtn);

      list.appendChild(li);
    });
    card.appendChild(list);

    return card;
  }

  function openConfirm(title, text, onConfirm) {
    el.confirmActionTitle.textContent = title;
    el.confirmActionText.textContent = text;
    pendingConfirmAction = onConfirm;
    el.confirmActionModal.classList.add('open');
  }

  function closeConfirm() {
    el.confirmActionModal.classList.remove('open');
    pendingConfirmAction = null;
  }

  // ---------- Abrechnung: praxisweite Übersicht & Rechnung ----------

  function renderBillingOverview(kategorie) {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = ABRECHNUNG_KATEGORIEN[kategorie] + (kategorie === 'privat' ? '' : ' (Sammelübersicht)');
    card.appendChild(heading);

    const rows = [];
    state.patients.forEach((patient) => {
      (patient.abrechnung || []).forEach((entry) => {
        if (entry.kategorie === kategorie) rows.push({ patient, entry });
      });
    });
    rows.sort((a, b) => (a.entry.datum || '').localeCompare(b.entry.datum || ''));

    if (rows.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine erfassten Leistungen in dieser Kategorie.';
      card.appendChild(p);
      return card;
    }

    const table = document.createElement('table');
    table.className = 'patient-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Datum', 'Patient', 'Ziffer', 'Bezeichnung', 'Betrag'].forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let sum = 0;
    rows.forEach(({ patient, entry }) => {
      sum += Number(entry.betrag) || 0;
      const tr = document.createElement('tr');
      [
        formatDate(entry.datum),
        `${patient.nachname}, ${patient.vorname}`,
        entry.ziffer,
        entry.bezeichnung,
        formatEuro(entry.betrag)
      ].forEach((val) => {
        const td = document.createElement('td');
        td.textContent = val;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);

    const sumRow = document.createElement('div');
    sumRow.className = 'billing-sum-row';
    sumRow.textContent = `Summe: ${formatEuro(sum)}`;
    card.appendChild(sumRow);

    return card;
  }

  function renderInvoiceView(patient) {
    const wrap = document.createDocumentFragment();

    const backBtn = document.createElement('button');
    backBtn.className = 'btn-glossy btn-secondary btn-small no-print';
    backBtn.textContent = '← Zurück';
    backBtn.style.marginBottom = '12px';
    backBtn.addEventListener('click', () => {
      ui.viewMode = 'patient';
      ui.activeTab = 'abrechnung';
      ui.invoicePatientId = null;
      render();
    });
    wrap.appendChild(backBtn);

    const card = document.createElement('div');
    card.className = 'panel-card invoice-card';

    const header = document.createElement('div');
    header.className = 'invoice-header';
    const praxis = document.createElement('div');
    praxis.className = 'invoice-praxis';
    praxis.textContent = 'PatientenWelt Praxis · Musterstraße 1 · 12345 Musterstadt';
    const printBtn = document.createElement('button');
    printBtn.className = 'btn-glossy btn-primary btn-small no-print';
    printBtn.textContent = 'Drucken';
    printBtn.addEventListener('click', () => window.print());
    header.append(praxis, printBtn);
    card.appendChild(header);

    const title = document.createElement('h2');
    title.textContent = 'Rechnung';
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'invoice-meta';
    const rechnungsnummer = `${new Date().getFullYear()}-${patient.id.slice(-6).toUpperCase()}`;
    [
      ['Rechnungsnummer', rechnungsnummer],
      ['Rechnungsdatum', formatDate(todayISO())],
      ['Patient', `${patient.nachname}, ${patient.vorname}`],
      ['Geburtsdatum', patient.geburtsdatum ? formatDate(patient.geburtsdatum) : '–']
    ].forEach(([label, value]) => {
      const row = document.createElement('div');
      const strong = document.createElement('span');
      strong.className = 'invoice-meta-label';
      strong.textContent = label + ': ';
      row.appendChild(strong);
      row.appendChild(document.createTextNode(value));
      meta.appendChild(row);
    });
    card.appendChild(meta);

    const entries = (patient.abrechnung || []).filter((e) => e.kategorie === 'privat');

    const table = document.createElement('table');
    table.className = 'patient-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Datum', 'Ziffer', 'Bezeichnung', 'Betrag'].forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    let sum = 0;
    entries.forEach((entry) => {
      sum += Number(entry.betrag) || 0;
      const tr = document.createElement('tr');
      [formatDate(entry.datum), entry.ziffer, entry.bezeichnung, formatEuro(entry.betrag)].forEach((val) => {
        const td = document.createElement('td');
        td.textContent = val;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);

    const total = document.createElement('div');
    total.className = 'invoice-total';
    total.textContent = `Gesamtbetrag: ${formatEuro(sum)}`;
    card.appendChild(total);

    const footer = document.createElement('p');
    footer.className = 'invoice-footer-note';
    footer.textContent = 'Bitte überweisen Sie den Betrag innerhalb von 14 Tagen unter Angabe der Rechnungsnummer.';
    card.appendChild(footer);

    wrap.appendChild(card);
    return wrap;
  }

  // ---------- Datenexport (Art. 20 DSGVO – Datenportabilität) ----------

  function sanitizeFilenamePart(text) {
    return String(text || '').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '-').replace(/^-+|-+$/g, '') || 'patient';
  }

  function csvEscape(value) {
    const s = value === null || value === undefined ? '' : String(value);
    if (/[",;\n\r]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function toCSV(headerRow, dataRows) {
    const lines = [headerRow, ...dataRows].map((row) => row.map(csvEscape).join(';'));
    // BOM voranstellen, damit Excel Umlaute in der UTF-8-Datei korrekt anzeigt.
    return '﻿' + lines.join('\r\n');
  }

  async function triggerExport(defaultName, content, filterName, filterExt, logLabel, logDetails) {
    const res = await window.patientenweltAPI.exportFile(defaultName, content, filterName, filterExt);
    if (res && res.success) {
      logAction(logLabel, logDetails);
      await persist();
    } else if (res && !res.canceled) {
      showAuthlessError(res.error);
    }
  }

  async function exportPatientJSON(patient) {
    const content = JSON.stringify(patient, null, 2);
    const name = `patientenakte-${sanitizeFilenamePart(patient.nachname)}-${sanitizeFilenamePart(patient.vorname)}-${todayISO()}.json`;
    await triggerExport(name, content, 'JSON-Datei', 'json', 'Patientenakte exportiert (JSON)', `${patient.nachname}, ${patient.vorname}`);
  }

  function patientCSVRows(patient) {
    const rows = [];
    (patient.journal || []).forEach((e) => rows.push(['Verlauf', e.datum, '', e.typ || '', e.text || '', '']));
    (patient.rezepte || []).forEach((e) => rows.push([
      'Rezept', e.datum, '', e.medikament || '',
      `${e.hinweis || ''} [${VERORDNUNGSSTATUS_LABEL[e.status] || VERORDNUNGSSTATUS_LABEL.offen}]`.trim(), ''
    ]));
    (patient.termine || []).forEach((e) => rows.push(['Termin', e.datum, e.uhrzeit || '', e.grund || '', '', '']));
    (patient.briefe || []).forEach((e) => rows.push(['Brief', e.datum, '', e.betreff || '', e.text || '', '']));
    (patient.labor || []).forEach((e) => rows.push(['Laborwert', e.datum, '', '', e.text || '', '']));
    (patient.abrechnung || []).forEach((e) => rows.push([
      ABRECHNUNG_KATEGORIEN[e.kategorie] || e.kategorie || '',
      e.datum, '', e.ziffer || '', `${e.bezeichnung || ''} [${LEISTUNGSSTATUS_LABEL[e.status] || LEISTUNGSSTATUS_LABEL.offen}]`,
      e.betrag != null ? String(e.betrag).replace('.', ',') : ''
    ]));
    (patient.laborwerte || []).forEach((e) => rows.push([
      'Laborwerterfassung', e.datum, '', e.parameter || '',
      `${e.wert || ''} ${e.einheit || ''}${e.referenzbereich ? ' (Ref: ' + e.referenzbereich + ')' : ''}`.trim(), ''
    ]));
    (patient.krankenscheine || []).forEach((e) => rows.push(['Krankenschein', e.datum, '', e.art || '', e.notiz || '', '']));
    (patient.uebergaben || []).forEach((e) => rows.push([
      'Übergabe', e.datum, '', [e.von, e.an].filter(Boolean).join(' → '), e.text || '', ''
    ]));
    (patient.ueberweisungen || []).forEach((e) => rows.push([
      'Überweisung', e.datum, '',
      e.fachrichtung ? `${e.empfaenger} (${e.fachrichtung})` : e.empfaenger || '',
      `${e.grund || ''}${e.dringlichkeit === 'dringend' ? ' [DRINGEND]' : ''}`, ''
    ]));
    (patient.befundweiterleitung || []).forEach((e) => rows.push([
      'Befund weiterleiten', e.datum, '', `An ${e.empfaenger || ''}: ${e.betreff || ''}`.trim(), e.text || '', ''
    ]));
    (patient.krankmeldungen || []).forEach((e) => rows.push([
      'Krankmeldung', e.datum, '', AU_ART_LABEL[e.art] || e.art || '',
      `${formatDate(e.von)} – ${formatDate(e.bis)}${e.diagnose ? ' — ' + e.diagnose : ''}`, ''
    ]));
    return rows.sort((a, b) => (a[1] || '').localeCompare(b[1] || ''));
  }

  async function exportPatientCSV(patient) {
    const header = ['Kategorie', 'Datum', 'Uhrzeit', 'Titel', 'Beschreibung', 'Betrag'];
    const content = toCSV(header, patientCSVRows(patient));
    const name = `patientenakte-${sanitizeFilenamePart(patient.nachname)}-${sanitizeFilenamePart(patient.vorname)}-${todayISO()}.csv`;
    await triggerExport(name, content, 'CSV-Datei', 'csv', 'Patientenakte exportiert (CSV)', `${patient.nachname}, ${patient.vorname}`);
  }

  async function exportAllPatientsJSON() {
    const content = JSON.stringify(state.patients, null, 2);
    const name = `patientenwelt-alle-patienten-${todayISO()}.json`;
    const count = state.patients.length;
    await triggerExport(name, content, 'JSON-Datei', 'json', 'Alle Patientendaten exportiert', `${count} ${count === 1 ? 'Patient' : 'Patienten'}`);
  }

  async function exportAuditLogCSV() {
    const header = ['Zeitpunkt', 'Benutzer', 'Aktion', 'Details'];
    const rows = (state.auditLog || []).map((e) => [formatDateTime(e.datum), e.userName || '', e.action || '', e.details || '']);
    const content = toCSV(header, rows);
    const name = `patientenwelt-protokoll-${todayISO()}.csv`;
    await triggerExport(name, content, 'CSV-Datei', 'csv', 'Protokoll exportiert', `${rows.length} Einträge`);
  }

  function renderExportView() {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Datenexport';
    card.appendChild(heading);

    const info = document.createElement('p');
    info.className = 'entry-empty';
    info.textContent = 'Für die Datenportabilität (Art. 20 DSGVO) und bei Vertragsende: exportiert ' +
      'alle Patientendaten als maschinenlesbare JSON-Datei. Einzelne Patientenakten lassen sich ' +
      'zusätzlich im jeweiligen Patienten-Tab „Basis" als JSON oder CSV exportieren.';
    card.appendChild(info);

    const btn = document.createElement('button');
    btn.className = 'btn-glossy btn-primary btn-small';
    const count = state.patients.length;
    btn.textContent = `Alle Patientendaten exportieren (${count} ${count === 1 ? 'Patient' : 'Patienten'}, JSON)`;
    btn.addEventListener('click', exportAllPatientsJSON);
    card.appendChild(btn);

    return card;
  }

  function matchesSearch(patient, query) {
    if (!query) return true;
    if (!query) return true;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${patient.nachname} ${patient.vorname}`.toLowerCase().includes(q);
  }

  function sortPatients(list, key, dir) {
    const factor = dir === 'desc' ? -1 : 1;
    return list.slice().sort((a, b) => {
      let av;
      let bv;
      if (key === 'geburtsdatum') {
        av = a.geburtsdatum || '';
        bv = b.geburtsdatum || '';
      } else if (key === 'geschlecht') {
        av = GESCHLECHT_LABEL[a.geschlecht] || '';
        bv = GESCHLECHT_LABEL[b.geschlecht] || '';
      } else if (key === 'versicherung') {
        av = a.versicherung || '';
        bv = b.versicherung || '';
      } else {
        av = `${a.nachname} ${a.vorname}`;
        bv = `${b.nachname} ${b.vorname}`;
      }
      return factor * av.localeCompare(bv, 'de');
    });
  }

  function countUpcomingTermine(patients, days) {
    const today = todayISO();
    const limit = new Date();
    limit.setDate(limit.getDate() + days);
    const limitISO = limit.toISOString().slice(0, 10);
    let count = 0;
    patients.forEach((p) => {
      (p.termine || []).forEach((t) => {
        if (t.datum && t.datum >= today && t.datum <= limitISO) count += 1;
      });
    });
    return count;
  }

  function renderOverviewStats() {
    const grid = document.createElement('div');
    grid.className = 'stat-grid';

    const totalJournalEntries = state.patients.reduce((sum, p) => sum + (p.journal ? p.journal.length : 0), 0);
    const stats = [
      { value: state.patients.length, label: 'Patienten gesamt' },
      { value: countUpcomingTermine(state.patients, 14), label: 'Termine in den nächsten 14 Tagen' },
      { value: totalJournalEntries, label: 'Verlaufseinträge gesamt' }
    ];

    stats.forEach((s) => {
      const tile = document.createElement('div');
      tile.className = 'stat-tile';
      const value = document.createElement('div');
      value.className = 'stat-value';
      value.textContent = String(s.value);
      const label = document.createElement('div');
      label.className = 'stat-label';
      label.textContent = s.label;
      tile.append(value, label);
      grid.appendChild(tile);
    });

    return grid;
  }

  function renderPatientBanner(patient) {
    const banner = document.createElement('div');
    banner.className = 'patient-banner';

    const left = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'patient-name text-glossy-dark';
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
      const label = document.createElement('span');
      label.className = 'tab-label';
      label.textContent = tab.label;
      btn.appendChild(label);
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
    if (ui.activeTab === 'kalender') return renderKalenderPanel(patient);
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

    const actions = document.createElement('div');
    actions.className = 'basis-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-glossy btn-primary btn-small';
    editBtn.textContent = 'Stammdaten bearbeiten';
    editBtn.addEventListener('click', () => openEditPatientModal(patient.id));
    actions.appendChild(editBtn);

    const exportJsonBtn = document.createElement('button');
    exportJsonBtn.className = 'btn-glossy btn-secondary btn-small';
    exportJsonBtn.textContent = 'Patientenakte exportieren (JSON)';
    exportJsonBtn.addEventListener('click', () => exportPatientJSON(patient));
    actions.appendChild(exportJsonBtn);

    const exportCsvBtn = document.createElement('button');
    exportCsvBtn.className = 'btn-glossy btn-secondary btn-small';
    exportCsvBtn.textContent = 'Patientenakte exportieren (CSV)';
    exportCsvBtn.addEventListener('click', () => exportPatientCSV(patient));
    actions.appendChild(exportCsvBtn);

    card.appendChild(actions);

    return card;
  }

  const CATEGORY_META = {
    journal: { title: 'Verlauf', addLabel: '+ Eintrag' },
    rezepte: { title: 'Rezepte', addLabel: '+ Rezept' },
    termine: { title: 'Termine', addLabel: '+ Termin' },
    briefe: { title: 'Briefe', addLabel: '+ Brief' },
    labor: { title: 'Laborwerte', addLabel: '+ Laborwert' },
    abrechnung: { title: 'Abrechnung', addLabel: '+ Leistung' },
    laborwerte: { title: 'Laborwerterfassung', addLabel: '+ Laborwert (strukturiert)' },
    krankenscheine: { title: 'Krankenscheinabgabe', addLabel: '+ Krankenschein' },
    uebergaben: { title: 'Übergabe Patient', addLabel: '+ Übergabe' },
    ueberweisungen: { title: 'Überweisung', addLabel: '+ Überweisung' },
    befundweiterleitung: { title: 'Befund weiterleiten', addLabel: '+ Befund weiterleiten' },
    krankmeldungen: { title: 'Krankmeldung', addLabel: '+ Krankmeldung' }
  };

  // Eintrags-Kategorien, deren Zeilen einen "Drucken"-Button bekommen, und die
  // dabei angesteuerte viewMode für die jeweilige Druckansicht.
  const PRINTABLE_CATEGORY_VIEWS = {
    ueberweisungen: 'print-ueberweisung',
    befundweiterleitung: 'print-befund',
    krankmeldungen: 'print-krankmeldung'
  };

  function formatEuro(value) {
    const n = Number(value) || 0;
    return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

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

    let entries = (patient[category] || []).slice().sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));

    if (category === 'abrechnung') {
      card.appendChild(renderAbrechnungFilterBar(patient));
      if (ui.abrechnungFilter !== 'alle') {
        entries = entries.filter((e) => e.kategorie === ui.abrechnungFilter);
      }
    }

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

    if (category === 'abrechnung') {
      const sum = entries.reduce((acc, e) => acc + (Number(e.betrag) || 0), 0);
      const sumRow = document.createElement('div');
      sumRow.className = 'billing-sum-row';
      sumRow.textContent = `Summe: ${formatEuro(sum)}`;
      card.appendChild(sumRow);
    }

    return card;
  }

  function renderAbrechnungFilterBar(patient) {
    const bar = document.createElement('div');
    bar.className = 'billing-filter-bar';

    const filters = [['alle', 'Alle'], ['privat', 'Privat'], ['gkv', 'GKV'], ['bg', 'BG']];
    filters.forEach(([key, label]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'billing-filter-btn' + (ui.abrechnungFilter === key ? ' active' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => {
        ui.abrechnungFilter = key;
        render();
      });
      bar.appendChild(btn);
    });

    if (ui.abrechnungFilter === 'privat') {
      const invoiceBtn = document.createElement('button');
      invoiceBtn.type = 'button';
      invoiceBtn.className = 'btn-glossy btn-primary btn-small';
      invoiceBtn.textContent = 'Rechnung erstellen';
      invoiceBtn.style.marginLeft = 'auto';
      invoiceBtn.addEventListener('click', () => {
        ui.viewMode = 'invoice';
        ui.invoicePatientId = patient.id;
        render();
      });
      bar.appendChild(invoiceBtn);
    }

    return bar;
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

    if (category === 'abrechnung' && entry.kategorie) {
      const kat = document.createElement('span');
      kat.className = 'entry-type';
      kat.textContent = ABRECHNUNG_KATEGORIEN[entry.kategorie] || entry.kategorie;
      li.appendChild(kat);
    }

    const text = document.createElement('div');
    text.className = 'entry-text';
    text.textContent = entryDisplayText(category, entry);
    li.appendChild(text);

    const printViewMode = PRINTABLE_CATEGORY_VIEWS[category];
    if (printViewMode) {
      const printBtn = document.createElement('button');
      printBtn.className = 'btn-glossy btn-secondary btn-small';
      printBtn.textContent = 'Drucken';
      printBtn.addEventListener('click', () => {
        ui.printEntryId = entry.id;
        ui.viewMode = printViewMode;
        render();
      });
      li.appendChild(printBtn);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-glossy btn-danger btn-icon';
    delBtn.textContent = '✕';
    delBtn.title = 'Eintrag löschen';
    delBtn.addEventListener('click', () => {
      patient[category] = patient[category].filter((e) => e.id !== entry.id);
      logAction(`Eintrag gelöscht (${CATEGORY_META[category].title})`, `${patient.nachname}, ${patient.vorname}`);
      persist();
      render();
    });
    li.appendChild(delBtn);

    return li;
  }

  function entryDisplayText(category, entry) {
    if (category === 'rezepte') {
      const base = entry.hinweis ? `${entry.medikament} — ${entry.hinweis}` : entry.medikament;
      return `${base} [${VERORDNUNGSSTATUS_LABEL[entry.status] || VERORDNUNGSSTATUS_LABEL.offen}]`;
    }
    if (category === 'termine') {
      return entry.grund;
    }
    if (category === 'briefe') {
      return entry.betreff ? `${entry.betreff}: ${entry.text}` : entry.text;
    }
    if (category === 'abrechnung') {
      return `Ziffer ${entry.ziffer} — ${entry.bezeichnung} (${formatEuro(entry.betrag)}) — ${LEISTUNGSSTATUS_LABEL[entry.status] || LEISTUNGSSTATUS_LABEL.offen}`;
    }
    if (category === 'laborwerte') {
      const ref = entry.referenzbereich ? ` (Ref: ${entry.referenzbereich})` : '';
      return `${entry.parameter}: ${entry.wert || ''} ${entry.einheit || ''}${ref}`.trim();
    }
    if (category === 'krankenscheine') {
      return entry.notiz ? `${entry.art} — ${entry.notiz}` : entry.art;
    }
    if (category === 'uebergaben') {
      const wer = [entry.von, entry.an].filter(Boolean).join(' → ');
      return wer ? `${wer}: ${entry.text}` : entry.text;
    }
    if (category === 'ueberweisungen') {
      const ziel = entry.fachrichtung ? `${entry.empfaenger} (${entry.fachrichtung})` : entry.empfaenger;
      const dring = entry.dringlichkeit === 'dringend' ? ' — DRINGEND' : '';
      return `An ${ziel} — ${entry.grund}${dring}`;
    }
    if (category === 'befundweiterleitung') {
      return `An ${entry.empfaenger} — ${entry.betreff}`;
    }
    if (category === 'krankmeldungen') {
      const diag = entry.diagnose ? ` — ${entry.diagnose}` : '';
      return `${formatDate(entry.von)} – ${formatDate(entry.bis)} (${AU_ART_LABEL[entry.art] || entry.art})${diag}`;
    }
    return entry.text;
  }

  // ---------- Kalender ----------

  function renderKalenderPanel(patient) {
    const card = document.createElement('div');
    card.className = 'panel-card';

    const toolbar = document.createElement('div');
    toolbar.className = 'list-toolbar';
    const heading = document.createElement('h2');
    heading.textContent = 'Kalender';
    heading.style.margin = '0';
    const hint = document.createElement('span');
    hint.className = 'entry-empty';
    hint.style.padding = '0';
    hint.textContent = 'Tag anklicken, um einen Termin einzutragen';
    toolbar.append(heading, hint);
    card.appendChild(toolbar);

    const termineByDate = buildTermineByDate(patient);
    const currentYear = new Date().getFullYear();

    [currentYear, currentYear + 1].forEach((year) => {
      card.appendChild(renderCalendarYear(year, termineByDate));
    });

    return card;
  }

  function buildTermineByDate(patient) {
    const map = new Map();
    (patient.termine || []).forEach((t) => {
      if (!t.datum) return;
      if (!map.has(t.datum)) map.set(t.datum, []);
      map.get(t.datum).push(t);
    });
    return map;
  }

  function renderCalendarYear(year, termineByDate) {
    const block = document.createElement('div');
    block.className = 'calendar-year-block';

    const title = document.createElement('h3');
    title.className = 'calendar-year-title';
    title.textContent = String(year);
    block.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'calendar-month-grid';
    for (let month = 0; month < 12; month += 1) {
      grid.appendChild(renderCalendarMonth(year, month, termineByDate));
    }
    block.appendChild(grid);

    return block;
  }

  function renderCalendarMonth(year, monthIndex, termineByDate) {
    const todayIso = todayISO();
    const card = document.createElement('div');
    card.className = 'month-card';

    const header = document.createElement('div');
    header.className = 'month-card-header';
    header.textContent = MONATSNAMEN[monthIndex];
    card.appendChild(header);

    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'month-days-grid month-weekday-row';
    WOCHENTAGE_KURZ.forEach((w) => {
      const cell = document.createElement('div');
      cell.className = 'weekday-cell';
      cell.textContent = w;
      weekdayRow.appendChild(cell);
    });
    card.appendChild(weekdayRow);

    const daysGrid = document.createElement('div');
    daysGrid.className = 'month-days-grid';

    const firstOfMonth = new Date(year, monthIndex, 1);
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // Montag = 0

    for (let i = 0; i < leadingBlanks; i += 1) {
      const blank = document.createElement('div');
      blank.className = 'day-cell padding';
      daysGrid.appendChild(blank);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTermine = termineByDate.get(iso) || [];

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'day-cell';
      if (iso === todayIso) cell.classList.add('today');
      if (dayTermine.length > 0) cell.classList.add('has-termin');

      const num = document.createElement('span');
      num.className = 'day-number';
      num.textContent = String(day);
      cell.appendChild(num);

      if (dayTermine.length > 0) {
        cell.title = dayTermine.map((t) => `${t.uhrzeit ? t.uhrzeit + ' ' : ''}${t.grund}`).join('\n');
      }

      cell.addEventListener('click', () => openEntryModal('termine', iso));
      daysGrid.appendChild(cell);
    }

    card.appendChild(daysGrid);
    return card;
  }

  // ---------- Praxisweite Werkzeuge (Formulare, Kassenbuch, Recall, Warteliste, Analyse) ----------

  function renderPraxisgebuehrInfoView() {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Praxisgebühr Info';
    card.appendChild(heading);

    [
      'Die gesetzliche Praxisgebühr (10 € pro Quartal beim ersten Arztbesuch) wurde zum 1. Januar 2013 in Deutschland vollständig abgeschafft und wird seither von keiner gesetzlichen Krankenkasse mehr erhoben.',
      'Dieser Menüpunkt dient daher rein informativ als Erinnerung an die frühere Regelung. Für Barzahlungen in der Praxis – etwa Selbstzahlerleistungen oder Rezeptgebühren – steht das „Praxisgebühr Kassenbuch" als einfaches, laufendes Kassenbuch zur Verfügung.'
    ].forEach((text) => {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = text;
      card.appendChild(p);
    });

    const btn = document.createElement('button');
    btn.className = 'btn-glossy btn-secondary btn-small';
    btn.textContent = 'Zum Kassenbuch';
    btn.addEventListener('click', () => {
      ui.viewMode = 'kassenbuch';
      render();
    });
    card.appendChild(btn);

    return card;
  }

  function renderKassenbuchView() {
    const wrap = document.createDocumentFragment();
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Praxisgebühr Kassenbuch';
    card.appendChild(heading);

    const formGrid = document.createElement('div');
    formGrid.className = 'form-grid';
    const datumLabel = fieldLabel('Datum', 'kbDatum', 'date');
    const datumInput = datumLabel.querySelector('input');
    datumInput.value = todayISO();
    const artLabel = selectField('Art', 'kbArt', [['einnahme', 'Einnahme'], ['ausgabe', 'Ausgabe']]);
    const artSelect = artLabel.querySelector('select');
    const betragLabel = fieldLabel('Betrag (€)', 'kbBetrag', 'number');
    const betragInput = betragLabel.querySelector('input');
    betragInput.step = '0.01';
    betragInput.min = '0';
    const beschreibungLabel = fieldLabel('Beschreibung', 'kbBeschreibung', 'text');
    const beschreibungInput = beschreibungLabel.querySelector('input');
    formGrid.append(datumLabel, artLabel, betragLabel, beschreibungLabel);
    card.appendChild(formGrid);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-glossy btn-primary btn-small';
    addBtn.textContent = '+ Eintragen';
    addBtn.addEventListener('click', () => {
      const betrag = parseFloat(betragInput.value);
      const beschreibung = beschreibungInput.value.trim();
      if (!(betrag > 0) || !beschreibung) return;
      state.kassenbuch.push({ id: uid(), datum: datumInput.value || todayISO(), art: artSelect.value, betrag, beschreibung });
      logAction('Kassenbucheintrag hinzugefügt', `${artSelect.value === 'einnahme' ? 'Einnahme' : 'Ausgabe'}: ${formatEuro(betrag)}`);
      persist();
      render();
    });
    card.appendChild(addBtn);
    wrap.appendChild(card);

    const listCard = document.createElement('div');
    listCard.className = 'panel-card';
    const entries = state.kassenbuch.slice().sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));
    if (entries.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine Kassenbucheinträge.';
      listCard.appendChild(p);
    } else {
      const table = document.createElement('table');
      table.className = 'patient-table';
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      ['Datum', 'Art', 'Betrag', 'Beschreibung', ''].forEach((h) => {
        const th = document.createElement('th');
        th.textContent = h;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      let saldo = 0;
      entries.forEach((e) => {
        saldo += e.art === 'einnahme' ? (Number(e.betrag) || 0) : -(Number(e.betrag) || 0);
        const tr = document.createElement('tr');
        [formatDate(e.datum), e.art === 'einnahme' ? 'Einnahme' : 'Ausgabe', formatEuro(e.betrag), e.beschreibung].forEach((val) => {
          const td = document.createElement('td');
          td.textContent = val;
          tr.appendChild(td);
        });
        const tdActions = document.createElement('td');
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-glossy btn-danger btn-icon';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          state.kassenbuch = state.kassenbuch.filter((x) => x.id !== e.id);
          logAction('Kassenbucheintrag gelöscht', e.beschreibung);
          persist();
          render();
        });
        tdActions.appendChild(delBtn);
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      listCard.appendChild(table);

      const sumRow = document.createElement('div');
      sumRow.className = 'billing-sum-row';
      sumRow.textContent = `Saldo: ${formatEuro(saldo)}`;
      listCard.appendChild(sumRow);
    }
    wrap.appendChild(listCard);

    return wrap;
  }

  function renderVersichertenkartenView() {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Registrierung Versichertenkarte';
    card.appendChild(heading);

    const hint = document.createElement('p');
    hint.className = 'entry-empty';
    hint.textContent = 'Manuelle Erfassung, da kein eGK-Kartenterminal/TI-Konnektor angebunden ist.';
    card.appendChild(hint);

    if (state.patients.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine Patienten angelegt.';
      card.appendChild(p);
      return card;
    }

    const table = document.createElement('table');
    table.className = 'patient-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Patient', 'Status', 'Gültig bis', 'Geprüft am', ''].forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    state.patients
      .slice()
      .sort((a, b) => `${a.nachname} ${a.vorname}`.localeCompare(`${b.nachname} ${b.vorname}`, 'de'))
      .forEach((patient) => {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        tdName.textContent = `${patient.nachname}, ${patient.vorname}`;
        tr.appendChild(tdName);

        const tdStatus = document.createElement('td');
        const select = document.createElement('select');
        Object.entries(VERSICHERTENKARTE_STATUS_LABEL).forEach(([value, label]) => {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = label;
          select.appendChild(opt);
        });
        select.value = patient.versichertenkarte.status || 'ungeprueft';
        tdStatus.appendChild(select);
        tr.appendChild(tdStatus);

        const tdGueltig = document.createElement('td');
        const gueltigInput = document.createElement('input');
        gueltigInput.type = 'date';
        gueltigInput.value = patient.versichertenkarte.gueltigBis || '';
        tdGueltig.appendChild(gueltigInput);
        tr.appendChild(tdGueltig);

        const tdGeprueft = document.createElement('td');
        tdGeprueft.textContent = patient.versichertenkarte.geprueftAm ? formatDateTime(patient.versichertenkarte.geprueftAm) : '–';
        tr.appendChild(tdGeprueft);

        const tdActions = document.createElement('td');
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-glossy btn-primary btn-small';
        saveBtn.textContent = 'Speichern';
        saveBtn.addEventListener('click', () => {
          patient.versichertenkarte = {
            ...patient.versichertenkarte,
            status: select.value,
            gueltigBis: gueltigInput.value,
            geprueftAm: new Date().toISOString()
          };
          logAction('Versichertenkarte geprüft', `${patient.nachname}, ${patient.vorname}`);
          persist();
          render();
        });
        tdActions.appendChild(saveBtn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      });
    table.appendChild(tbody);
    card.appendChild(table);

    return card;
  }

  function renderKrankenkassenkarteLesenView(patient) {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Krankenkassenkarte lesen';
    card.appendChild(heading);

    const hint = document.createElement('p');
    hint.className = 'entry-empty';
    hint.textContent = 'Manuelle Eingabe der Kartendaten, da kein eGK-Kartenterminal/TI-Konnektor angebunden ist — ersetzt das automatische Einlesen.';
    card.appendChild(hint);

    const formGrid = document.createElement('div');
    formGrid.className = 'form-grid';
    const kkLabel = fieldLabel('Krankenkasse', 'kkName', 'text');
    const kkInput = kkLabel.querySelector('input');
    kkInput.value = patient.versicherung || '';
    const nrLabel = fieldLabel('Versichertennummer', 'kkVersichertenNr', 'text');
    const nrInput = nrLabel.querySelector('input');
    nrInput.value = patient.versichertenNr || '';
    const kartennrLabel = fieldLabel('Kartennummer / Prüfziffer', 'kkKartennummer', 'text');
    const kartennrInput = kartennrLabel.querySelector('input');
    kartennrInput.value = patient.versichertenkarte.kartennummer || '';
    const genLabel = selectField('Kartengeneration', 'kkGeneration', [['', '– unbekannt –'], ...Object.entries(KARTENGENERATION_LABEL)]);
    const genSelect = genLabel.querySelector('select');
    genSelect.value = patient.versichertenkarte.kartengeneration || '';
    const gueltigLabel = fieldLabel('Gültig bis', 'kkGueltigBis', 'date');
    const gueltigInput = gueltigLabel.querySelector('input');
    gueltigInput.value = patient.versichertenkarte.gueltigBis || '';
    const statusLabel = selectField('Status', 'kkStatus', Object.entries(VERSICHERTENKARTE_STATUS_LABEL));
    const statusSelect = statusLabel.querySelector('select');
    statusSelect.value = patient.versichertenkarte.status || 'ungeprueft';
    formGrid.append(kkLabel, nrLabel, kartennrLabel, genLabel, gueltigLabel, statusLabel);
    card.appendChild(formGrid);

    if (patient.versichertenkarte.geprueftAm) {
      const lastRead = document.createElement('p');
      lastRead.className = 'entry-empty';
      lastRead.textContent = `Zuletzt eingelesen am: ${formatDateTime(patient.versichertenkarte.geprueftAm)}`;
      card.appendChild(lastRead);
    }

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-glossy btn-primary btn-small';
    saveBtn.textContent = 'Karte einlesen (manuell) & speichern';
    saveBtn.addEventListener('click', () => {
      patient.versicherung = kkInput.value.trim();
      patient.versichertenNr = nrInput.value.trim();
      patient.versichertenkarte = {
        status: statusSelect.value,
        gueltigBis: gueltigInput.value,
        kartennummer: kartennrInput.value.trim(),
        kartengeneration: genSelect.value,
        geprueftAm: new Date().toISOString()
      };
      logAction('Krankenkassenkarte eingelesen', `${patient.nachname}, ${patient.vorname}`);
      persist();
      render();
    });
    card.appendChild(saveBtn);

    return card;
  }

  function renderFormulareView() {
    const wrap = document.createDocumentFragment();
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Formulare';
    card.appendChild(heading);

    const formGrid = document.createElement('div');
    formGrid.className = 'form-grid';
    const titelLabel = fieldLabel('Titel', 'formTitel', 'text');
    const titelInput = titelLabel.querySelector('input');
    const textLabel = textAreaField('Text/Vorlage', 'formText');
    const textArea = textLabel.querySelector('textarea');
    formGrid.append(titelLabel, textLabel);
    card.appendChild(formGrid);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-glossy btn-primary btn-small';
    addBtn.textContent = '+ Vorlage anlegen';
    addBtn.addEventListener('click', () => {
      const titel = titelInput.value.trim();
      if (!titel) return;
      state.formVorlagen.push({ id: uid(), titel, text: textArea.value.trim() });
      logAction('Formularvorlage angelegt', titel);
      persist();
      render();
    });
    card.appendChild(addBtn);
    wrap.appendChild(card);

    const listCard = document.createElement('div');
    listCard.className = 'panel-card';
    if (state.formVorlagen.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine Formularvorlagen angelegt.';
      listCard.appendChild(p);
    } else {
      const list = document.createElement('ul');
      list.className = 'entry-list';
      state.formVorlagen.forEach((v) => {
        const li = document.createElement('li');
        li.className = 'entry-row';
        const text = document.createElement('div');
        text.className = 'entry-text';
        text.textContent = v.titel;
        li.appendChild(text);
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-glossy btn-danger btn-icon';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          state.formVorlagen = state.formVorlagen.filter((x) => x.id !== v.id);
          logAction('Formularvorlage gelöscht', v.titel);
          persist();
          render();
        });
        li.appendChild(delBtn);
        list.appendChild(li);
      });
      listCard.appendChild(list);
    }
    wrap.appendChild(listCard);

    return wrap;
  }

  function renderDruckauftragView() {
    const wrap = document.createDocumentFragment();
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Druckauftrag Formular';
    card.appendChild(heading);

    if (state.formVorlagen.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine Formularvorlagen vorhanden. Zuerst unter „Formulare" eine Vorlage anlegen.';
      card.appendChild(p);
      const btn = document.createElement('button');
      btn.className = 'btn-glossy btn-secondary btn-small';
      btn.textContent = 'Zu Formulare';
      btn.addEventListener('click', () => { ui.viewMode = 'formulare'; render(); });
      card.appendChild(btn);
      wrap.appendChild(card);
      return wrap;
    }

    const formGrid = document.createElement('div');
    formGrid.className = 'form-grid';
    const vorlageLabel = selectField('Formularvorlage', 'druckVorlage', state.formVorlagen.map((v) => [v.id, v.titel]));
    const vorlageSelect = vorlageLabel.querySelector('select');
    const patientLabel = selectField('Patient (optional)', 'druckPatient', patientSelectOptions(true));
    const patientSelect = patientLabel.querySelector('select');
    formGrid.append(vorlageLabel, patientLabel);
    card.appendChild(formGrid);

    const previewCard = document.createElement('div');
    previewCard.className = 'panel-card';
    const previewTitle = document.createElement('h3');
    const previewText = document.createElement('p');
    previewText.style.whiteSpace = 'pre-wrap';
    previewCard.append(previewTitle, previewText);

    function updatePreview() {
      const vorlage = state.formVorlagen.find((v) => v.id === vorlageSelect.value);
      previewTitle.textContent = vorlage ? vorlage.titel : '';
      previewText.textContent = vorlage ? vorlage.text : '';
    }
    vorlageSelect.addEventListener('change', updatePreview);
    updatePreview();

    const actionBar = document.createElement('div');
    actionBar.className = 'list-toolbar no-print';
    const printBtn = document.createElement('button');
    printBtn.className = 'btn-glossy btn-primary btn-small';
    printBtn.textContent = 'Drucken';
    printBtn.addEventListener('click', () => {
      const vorlage = state.formVorlagen.find((v) => v.id === vorlageSelect.value);
      if (!vorlage) return;
      const patient = patientSelect.value ? getPatient(patientSelect.value) : null;
      state.druckauftraege.push({
        id: uid(),
        datum: new Date().toISOString(),
        formVorlageId: vorlage.id,
        formTitel: vorlage.titel,
        patientId: patient ? patient.id : null,
        patientName: patient ? `${patient.nachname}, ${patient.vorname}` : ''
      });
      logAction('Druckauftrag erstellt', patient ? `${vorlage.titel} — ${patient.nachname}, ${patient.vorname}` : vorlage.titel);
      persist();
      window.print();
      render();
    });
    actionBar.appendChild(printBtn);

    wrap.append(card, previewCard, actionBar);

    const logCard = document.createElement('div');
    logCard.className = 'panel-card no-print';
    const logHeading = document.createElement('h3');
    logHeading.textContent = 'Bisherige Druckaufträge';
    logCard.appendChild(logHeading);
    const jobs = state.druckauftraege.slice().sort((a, b) => (b.datum || '').localeCompare(a.datum || '')).slice(0, 20);
    if (jobs.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine Druckaufträge.';
      logCard.appendChild(p);
    } else {
      const list = document.createElement('ul');
      list.className = 'entry-list';
      jobs.forEach((j) => {
        const li = document.createElement('li');
        li.className = 'entry-row';
        const date = document.createElement('div');
        date.className = 'entry-date';
        date.textContent = formatDateTime(j.datum);
        li.appendChild(date);
        const text = document.createElement('div');
        text.className = 'entry-text';
        text.textContent = j.patientName ? `${j.formTitel} — ${j.patientName}` : j.formTitel;
        li.appendChild(text);
        list.appendChild(li);
      });
      logCard.appendChild(list);
    }
    wrap.appendChild(logCard);

    return wrap;
  }

  function renderRecallView() {
    const wrap = document.createDocumentFragment();
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Recallfunktion';
    card.appendChild(heading);

    if (state.patients.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Zuerst mindestens einen Patienten anlegen.';
      card.appendChild(p);
      wrap.appendChild(card);
      return wrap;
    }

    const formGrid = document.createElement('div');
    formGrid.className = 'form-grid';
    const patientLabel = selectField('Patient', 'recallPatient', patientSelectOptions(false));
    const patientSelect = patientLabel.querySelector('select');
    const grundLabel = fieldLabel('Grund', 'recallGrund', 'text');
    const grundInput = grundLabel.querySelector('input');
    const faelligLabel = fieldLabel('Fällig am', 'recallFaellig', 'date');
    const faelligInput = faelligLabel.querySelector('input');
    faelligInput.value = todayISO();
    formGrid.append(patientLabel, grundLabel, faelligLabel);
    card.appendChild(formGrid);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-glossy btn-primary btn-small';
    addBtn.textContent = '+ Recall anlegen';
    addBtn.addEventListener('click', () => {
      const grund = grundInput.value.trim();
      const patient = getPatient(patientSelect.value);
      if (!grund || !patient) return;
      state.recalls.push({
        id: uid(),
        patientId: patient.id,
        patientName: `${patient.nachname}, ${patient.vorname}`,
        grund,
        faelligAm: faelligInput.value || todayISO(),
        erledigt: false
      });
      logAction('Recall angelegt', `${patient.nachname}, ${patient.vorname} — ${grund}`);
      persist();
      render();
    });
    card.appendChild(addBtn);
    wrap.appendChild(card);

    const listCard = document.createElement('div');
    listCard.className = 'panel-card';
    const offen = state.recalls.filter((r) => !r.erledigt).sort((a, b) => (a.faelligAm || '').localeCompare(b.faelligAm || ''));
    const erledigt = state.recalls.filter((r) => r.erledigt);
    if (offen.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Keine offenen Recalls.';
      listCard.appendChild(p);
    } else {
      const today = todayISO();
      const list = document.createElement('ul');
      list.className = 'entry-list';
      offen.forEach((r) => {
        const li = document.createElement('li');
        li.className = 'entry-row';
        const date = document.createElement('div');
        date.className = 'entry-date';
        date.textContent = formatDate(r.faelligAm);
        if (r.faelligAm && r.faelligAm < today) date.style.color = 'var(--danger)';
        li.appendChild(date);
        const text = document.createElement('div');
        text.className = 'entry-text';
        text.textContent = `${r.patientName} — ${r.grund}`;
        li.appendChild(text);
        const doneBtn = document.createElement('button');
        doneBtn.className = 'btn-glossy btn-secondary btn-small';
        doneBtn.textContent = 'Erledigt';
        doneBtn.addEventListener('click', () => {
          r.erledigt = true;
          logAction('Recall erledigt', `${r.patientName} — ${r.grund}`);
          persist();
          render();
        });
        li.appendChild(doneBtn);
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-glossy btn-danger btn-icon';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          state.recalls = state.recalls.filter((x) => x.id !== r.id);
          persist();
          render();
        });
        li.appendChild(delBtn);
        list.appendChild(li);
      });
      listCard.appendChild(list);
    }
    wrap.appendChild(listCard);

    if (erledigt.length > 0) {
      const doneCard = document.createElement('div');
      doneCard.className = 'panel-card';
      const doneHeading = document.createElement('h3');
      doneHeading.textContent = `Erledigt (${erledigt.length})`;
      doneCard.appendChild(doneHeading);
      wrap.appendChild(doneCard);
    }

    return wrap;
  }

  function renderWartelisteView() {
    const wrap = document.createDocumentFragment();
    const today = todayISO();
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Warteliste';
    card.appendChild(heading);

    const hint = document.createElement('p');
    hint.className = 'entry-empty';
    hint.textContent = `Heutige Warteliste (${formatDate(today)}).`;
    card.appendChild(hint);

    if (state.patients.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Zuerst mindestens einen Patienten anlegen.';
      card.appendChild(p);
      wrap.appendChild(card);
      return wrap;
    }

    const formGrid = document.createElement('div');
    formGrid.className = 'form-grid';
    const patientLabel = selectField('Patient', 'wlPatient', patientSelectOptions(false));
    const patientSelect = patientLabel.querySelector('select');
    const ankunftLabel = fieldLabel('Ankunftszeit', 'wlAnkunft', 'time');
    const ankunftInput = ankunftLabel.querySelector('input');
    const now = new Date();
    ankunftInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    formGrid.append(patientLabel, ankunftLabel);
    card.appendChild(formGrid);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-glossy btn-primary btn-small';
    addBtn.textContent = '+ Eintragen';
    addBtn.addEventListener('click', () => {
      const patient = getPatient(patientSelect.value);
      if (!patient) return;
      state.warteliste.push({
        id: uid(),
        datum: today,
        ankunftszeit: ankunftInput.value || '',
        patientId: patient.id,
        patientName: `${patient.nachname}, ${patient.vorname}`,
        status: 'wartet'
      });
      logAction('In Warteliste eingetragen', `${patient.nachname}, ${patient.vorname}`);
      persist();
      render();
    });
    card.appendChild(addBtn);
    wrap.appendChild(card);

    const listCard = document.createElement('div');
    listCard.className = 'panel-card';
    const todaysList = state.warteliste
      .filter((w) => w.datum === today)
      .sort((a, b) => (a.ankunftszeit || '').localeCompare(b.ankunftszeit || ''));

    if (todaysList.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch niemand auf der heutigen Warteliste.';
      listCard.appendChild(p);
    } else {
      const list = document.createElement('ul');
      list.className = 'entry-list';
      todaysList.forEach((w) => {
        const li = document.createElement('li');
        li.className = 'entry-row';
        const date = document.createElement('div');
        date.className = 'entry-date';
        date.textContent = w.ankunftszeit || '–';
        li.appendChild(date);
        const text = document.createElement('div');
        text.className = 'entry-text';
        text.textContent = w.patientName;
        li.appendChild(text);
        const statusBadge = document.createElement('span');
        statusBadge.className = 'role-badge' + (w.status === 'fertig' ? ' role-admin' : '');
        statusBadge.textContent = WARTELISTE_STATUS_LABEL[w.status] || w.status;
        li.appendChild(statusBadge);
        const currentIdx = WARTELISTE_STATUS_ORDER.indexOf(w.status);
        if (currentIdx < WARTELISTE_STATUS_ORDER.length - 1) {
          const nextBtn = document.createElement('button');
          nextBtn.className = 'btn-glossy btn-secondary btn-small';
          nextBtn.textContent = WARTELISTE_STATUS_LABEL[WARTELISTE_STATUS_ORDER[currentIdx + 1]];
          nextBtn.addEventListener('click', () => {
            w.status = WARTELISTE_STATUS_ORDER[currentIdx + 1];
            persist();
            render();
          });
          li.appendChild(nextBtn);
        }
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-glossy btn-danger btn-icon';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          state.warteliste = state.warteliste.filter((x) => x.id !== w.id);
          persist();
          render();
        });
        li.appendChild(delBtn);
        list.appendChild(li);
      });
      listCard.appendChild(list);
    }
    wrap.appendChild(listCard);

    return wrap;
  }

  function renderAnalyseAllgemeinView() {
    const wrap = document.createDocumentFragment();
    wrap.appendChild(renderOverviewStats());

    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Analyse allgemein';
    card.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'stat-grid';

    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const neuLetzte30Tage = state.patients.filter((p) => p.erstelltAm && new Date(p.erstelltAm) >= cutoff).length;

    const geschlechter = { w: 0, m: 0, d: 0 };
    let ageSum = 0;
    let ageCount = 0;
    state.patients.forEach((p) => {
      if (p.geschlecht && geschlechter[p.geschlecht] !== undefined) geschlechter[p.geschlecht] += 1;
      if (p.geburtsdatum) {
        const birth = new Date(p.geburtsdatum);
        if (!Number.isNaN(birth.getTime())) {
          ageSum += (now.getFullYear() - birth.getFullYear());
          ageCount += 1;
        }
      }
    });

    const stats = [
      { value: neuLetzte30Tage, label: 'Neue Patienten (30 Tage)' },
      { value: geschlechter.w, label: 'weiblich' },
      { value: geschlechter.m, label: 'männlich' },
      { value: geschlechter.d, label: 'divers' },
      { value: ageCount > 0 ? Math.round(ageSum / ageCount) : 0, label: 'Durchschnittsalter (Jahre)' }
    ];
    stats.forEach((s) => {
      const tile = document.createElement('div');
      tile.className = 'stat-tile';
      const value = document.createElement('div');
      value.className = 'stat-value';
      value.textContent = String(s.value);
      const label = document.createElement('div');
      label.className = 'stat-label';
      label.textContent = s.label;
      tile.append(value, label);
      grid.appendChild(tile);
    });
    card.appendChild(grid);
    wrap.appendChild(card);

    return wrap;
  }

  function renderAnalyseLeistungenView() {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Analyse Leistungen';
    card.appendChild(heading);

    const sumByKategorie = { privat: 0, gkv: 0, bg: 0 };
    const countByZiffer = new Map();
    state.patients.forEach((p) => {
      (p.abrechnung || []).forEach((e) => {
        if (sumByKategorie[e.kategorie] !== undefined) sumByKategorie[e.kategorie] += Number(e.betrag) || 0;
        const key = e.ziffer || '–';
        if (!countByZiffer.has(key)) countByZiffer.set(key, { bezeichnung: e.bezeichnung, count: 0, summe: 0 });
        const rec = countByZiffer.get(key);
        rec.count += 1;
        rec.summe += Number(e.betrag) || 0;
      });
    });

    const grid = document.createElement('div');
    grid.className = 'stat-grid';
    Object.entries(ABRECHNUNG_KATEGORIEN).forEach(([key, label]) => {
      const tile = document.createElement('div');
      tile.className = 'stat-tile';
      const value = document.createElement('div');
      value.className = 'stat-value';
      value.textContent = formatEuro(sumByKategorie[key]);
      const lbl = document.createElement('div');
      lbl.className = 'stat-label';
      lbl.textContent = label;
      tile.append(value, lbl);
      grid.appendChild(tile);
    });
    card.appendChild(grid);

    const topZiffern = Array.from(countByZiffer.entries())
      .map(([ziffer, rec]) => ({ ziffer, ...rec }))
      .sort((a, b) => b.summe - a.summe)
      .slice(0, 10);

    if (topZiffern.length > 0) {
      const subHeading = document.createElement('h3');
      subHeading.textContent = 'Häufigste Ziffern';
      card.appendChild(subHeading);
      const table = document.createElement('table');
      table.className = 'patient-table';
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      ['Ziffer', 'Bezeichnung', 'Anzahl', 'Summe'].forEach((h) => {
        const th = document.createElement('th');
        th.textContent = h;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      topZiffern.forEach((z) => {
        const tr = document.createElement('tr');
        [z.ziffer, z.bezeichnung, String(z.count), formatEuro(z.summe)].forEach((val) => {
          const td = document.createElement('td');
          td.textContent = val;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      card.appendChild(table);
    } else {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine erfassten Leistungen.';
      card.appendChild(p);
    }

    return card;
  }

  function renderAnalyseVerordnungenView() {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Analyse Verordnungen';
    card.appendChild(heading);

    let total = 0;
    const byMedikament = new Map();
    const byStatus = { offen: 0, eingeloest: 0, storniert: 0 };
    state.patients.forEach((p) => {
      (p.rezepte || []).forEach((e) => {
        total += 1;
        const key = (e.medikament || '–').trim().toLowerCase();
        if (!byMedikament.has(key)) byMedikament.set(key, { name: e.medikament, count: 0 });
        byMedikament.get(key).count += 1;
        const status = e.status || 'offen';
        if (byStatus[status] !== undefined) byStatus[status] += 1;
      });
    });

    const grid = document.createElement('div');
    grid.className = 'stat-grid';
    const stats = [
      { value: total, label: 'Rezepte gesamt' },
      { value: byStatus.offen, label: VERORDNUNGSSTATUS_LABEL.offen },
      { value: byStatus.eingeloest, label: VERORDNUNGSSTATUS_LABEL.eingeloest },
      { value: byStatus.storniert, label: VERORDNUNGSSTATUS_LABEL.storniert }
    ];
    stats.forEach((s) => {
      const tile = document.createElement('div');
      tile.className = 'stat-tile';
      const value = document.createElement('div');
      value.className = 'stat-value';
      value.textContent = String(s.value);
      const lbl = document.createElement('div');
      lbl.className = 'stat-label';
      lbl.textContent = s.label;
      tile.append(value, lbl);
      grid.appendChild(tile);
    });
    card.appendChild(grid);

    const topMeds = Array.from(byMedikament.values()).sort((a, b) => b.count - a.count).slice(0, 10);
    if (topMeds.length > 0) {
      const subHeading = document.createElement('h3');
      subHeading.textContent = 'Häufigste Verordnungen';
      card.appendChild(subHeading);
      const table = document.createElement('table');
      table.className = 'patient-table';
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      ['Medikament', 'Anzahl'].forEach((h) => {
        const th = document.createElement('th');
        th.textContent = h;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      topMeds.forEach((m) => {
        const tr = document.createElement('tr');
        [m.name, String(m.count)].forEach((val) => {
          const td = document.createElement('td');
          td.textContent = val;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      card.appendChild(table);
    } else {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine erfassten Rezepte.';
      card.appendChild(p);
    }

    return card;
  }

  function renderWeitereServicesView() {
    const wrap = document.createDocumentFragment();
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Weitere Services';
    card.appendChild(heading);

    const hint = document.createElement('p');
    hint.className = 'entry-empty';
    hint.textContent = 'Katalog zusätzlicher Selbstzahlerleistungen (z. B. IGeL-Leistungen), die Ihre Praxis anbietet.';
    card.appendChild(hint);

    const formGrid = document.createElement('div');
    formGrid.className = 'form-grid';
    const nameLabel = fieldLabel('Name', 'zlName', 'text');
    const nameInput = nameLabel.querySelector('input');
    const preisLabel = fieldLabel('Preis (€)', 'zlPreis', 'number');
    const preisInput = preisLabel.querySelector('input');
    preisInput.step = '0.01';
    preisInput.min = '0';
    const beschreibungLabel = textAreaField('Beschreibung', 'zlBeschreibung');
    const beschreibungArea = beschreibungLabel.querySelector('textarea');
    formGrid.append(nameLabel, preisLabel, beschreibungLabel);
    card.appendChild(formGrid);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-glossy btn-primary btn-small';
    addBtn.textContent = '+ Leistung anlegen';
    addBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) return;
      const preis = parseFloat(preisInput.value);
      state.zusatzleistungen.push({ id: uid(), name, preis: Number.isFinite(preis) ? preis : 0, beschreibung: beschreibungArea.value.trim() });
      logAction('Zusatzleistung angelegt', name);
      persist();
      render();
    });
    card.appendChild(addBtn);
    wrap.appendChild(card);

    const listCard = document.createElement('div');
    listCard.className = 'panel-card';
    if (state.zusatzleistungen.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine Zusatzleistungen angelegt.';
      listCard.appendChild(p);
    } else {
      const list = document.createElement('ul');
      list.className = 'entry-list';
      state.zusatzleistungen.forEach((z) => {
        const li = document.createElement('li');
        li.className = 'entry-row';
        const text = document.createElement('div');
        text.className = 'entry-text';
        text.textContent = z.beschreibung ? `${z.name} — ${z.beschreibung} (${formatEuro(z.preis)})` : `${z.name} (${formatEuro(z.preis)})`;
        li.appendChild(text);
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-glossy btn-danger btn-icon';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          state.zusatzleistungen = state.zusatzleistungen.filter((x) => x.id !== z.id);
          logAction('Zusatzleistung gelöscht', z.name);
          persist();
          render();
        });
        li.appendChild(delBtn);
        list.appendChild(li);
      });
      listCard.appendChild(list);
    }
    wrap.appendChild(listCard);

    return wrap;
  }

  // ---------- Patientenbezogene Werkzeuge (Leistungsstatus, Verordnungsstatus, Scheinrückseite, Archiv, Duplizieren) ----------

  function renderLeistungsstatusView(patient) {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Leistungsstatus';
    card.appendChild(heading);

    const entries = (patient.abrechnung || []).slice().sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));
    if (entries.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine erfassten Leistungen.';
      card.appendChild(p);
      return card;
    }

    const table = document.createElement('table');
    table.className = 'patient-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Datum', 'Ziffer', 'Bezeichnung', 'Betrag', 'Status'].forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    entries.forEach((entry) => {
      const tr = document.createElement('tr');
      [formatDate(entry.datum), entry.ziffer, entry.bezeichnung, formatEuro(entry.betrag)].forEach((val) => {
        const td = document.createElement('td');
        td.textContent = val;
        tr.appendChild(td);
      });
      const tdStatus = document.createElement('td');
      const select = document.createElement('select');
      Object.entries(LEISTUNGSSTATUS_LABEL).forEach(([value, label]) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        select.appendChild(opt);
      });
      select.value = entry.status || 'offen';
      select.addEventListener('change', () => {
        entry.status = select.value;
        logAction('Leistungsstatus geändert', `${patient.nachname}, ${patient.vorname} — Ziffer ${entry.ziffer}`);
        persist();
      });
      tdStatus.appendChild(select);
      tr.appendChild(tdStatus);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);
    return card;
  }

  function renderVerordnungsstatusView(patient) {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Verordnungsstatus';
    card.appendChild(heading);

    const entries = (patient.rezepte || []).slice().sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));
    if (entries.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Noch keine Rezepte erfasst.';
      card.appendChild(p);
      return card;
    }

    const table = document.createElement('table');
    table.className = 'patient-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Datum', 'Medikament', 'Hinweis', 'Status'].forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    entries.forEach((entry) => {
      const tr = document.createElement('tr');
      [formatDate(entry.datum), entry.medikament, entry.hinweis || '–'].forEach((val) => {
        const td = document.createElement('td');
        td.textContent = val;
        tr.appendChild(td);
      });
      const tdStatus = document.createElement('td');
      const select = document.createElement('select');
      Object.entries(VERORDNUNGSSTATUS_LABEL).forEach(([value, label]) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        select.appendChild(opt);
      });
      select.value = entry.status || 'offen';
      select.addEventListener('change', () => {
        entry.status = select.value;
        logAction('Verordnungsstatus geändert', `${patient.nachname}, ${patient.vorname} — ${entry.medikament}`);
        persist();
      });
      tdStatus.appendChild(select);
      tr.appendChild(tdStatus);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);
    return card;
  }

  function renderScheinrueckseiteView(patient) {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Scheinrückseite';
    card.appendChild(heading);

    const hint = document.createElement('p');
    hint.className = 'entry-empty';
    hint.textContent = 'Freitext-Notizen, wie früher auf der Rückseite des Behandlungsscheins (z. B. Diagnosen für die Abrechnung, Überweisungsvermerke).';
    card.appendChild(hint);

    const formGrid = document.createElement('div');
    formGrid.className = 'form-grid';
    const label = textAreaField('Notizen', 'scheinrueckseiteText');
    const textarea = label.querySelector('textarea');
    textarea.value = patient.scheinrueckseite || '';
    textarea.rows = 8;
    formGrid.appendChild(label);
    card.appendChild(formGrid);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-glossy btn-primary btn-small';
    saveBtn.textContent = 'Speichern';
    saveBtn.addEventListener('click', () => {
      patient.scheinrueckseite = textarea.value;
      logAction('Scheinrückseite gespeichert', `${patient.nachname}, ${patient.vorname}`);
      persist();
      render();
    });
    card.appendChild(saveBtn);

    return card;
  }

  function renderArchivinfoView(patient) {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Archivinformation';
    card.appendChild(heading);

    const formGrid = document.createElement('div');
    formGrid.className = 'form-grid';
    const sdLabel = fieldLabel('Archivinformation SD', 'archivSd', 'text');
    const sdInput = sdLabel.querySelector('input');
    sdInput.value = patient.archivinfo.sd || '';
    const mdLabel = fieldLabel('Archivinformation MD', 'archivMd', 'text');
    const mdInput = mdLabel.querySelector('input');
    mdInput.value = patient.archivinfo.md || '';
    formGrid.append(sdLabel, mdLabel);
    card.appendChild(formGrid);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-glossy btn-primary btn-small';
    saveBtn.textContent = 'Speichern';
    saveBtn.addEventListener('click', () => {
      patient.archivinfo = { sd: sdInput.value.trim(), md: mdInput.value.trim() };
      logAction('Archivinformation gespeichert', `${patient.nachname}, ${patient.vorname}`);
      persist();
      render();
    });
    card.appendChild(saveBtn);

    return card;
  }

  function duplicatePatient(patient) {
    openConfirm(
      'Patientendaten duplizieren?',
      `Es wird ein neuer Patient mit denselben Stammdaten wie „${patient.nachname}, ${patient.vorname}" angelegt (z. B. für Familienangehörige). Einträge wie Verlauf, Rezepte oder Termine werden nicht übernommen.`,
      () => {
        const copy = normalizePatient({
          id: uid(),
          nachname: patient.nachname,
          vorname: patient.vorname,
          geburtsdatum: '',
          geschlecht: patient.geschlecht,
          versicherung: patient.versicherung,
          versichertenNr: ''
        });
        copy.erstelltAm = new Date().toISOString();
        state.patients.push(copy);
        logAction('Patientendaten dupliziert', `${patient.nachname}, ${patient.vorname} → neuer Patient`);
        ui.selectedPatientId = copy.id;
        ui.viewMode = 'patient';
        ui.activeTab = 'basis';
        persist();
        render();
      }
    );
  }

  function printDocumentHeader(title, onBack) {
    const wrap = document.createDocumentFragment();

    const backBtn = document.createElement('button');
    backBtn.className = 'btn-glossy btn-secondary btn-small no-print';
    backBtn.textContent = '← Zurück';
    backBtn.style.marginBottom = '12px';
    backBtn.addEventListener('click', onBack);
    wrap.appendChild(backBtn);

    const card = document.createElement('div');
    card.className = 'panel-card invoice-card';

    const header = document.createElement('div');
    header.className = 'invoice-header';
    const praxis = document.createElement('div');
    praxis.className = 'invoice-praxis';
    praxis.textContent = 'PatientenWelt Praxis · Musterstraße 1 · 12345 Musterstadt';
    const printBtn = document.createElement('button');
    printBtn.className = 'btn-glossy btn-primary btn-small no-print';
    printBtn.textContent = 'Drucken';
    printBtn.addEventListener('click', () => window.print());
    header.append(praxis, printBtn);
    card.appendChild(header);

    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    card.appendChild(titleEl);

    return { wrap, card };
  }

  function metaRow(label, value) {
    const row = document.createElement('div');
    const strong = document.createElement('span');
    strong.className = 'invoice-meta-label';
    strong.textContent = label + ': ';
    row.appendChild(strong);
    row.appendChild(document.createTextNode(value));
    return row;
  }

  function renderUeberweisungPrintView(patient) {
    const entry = (patient.ueberweisungen || []).find((e) => e.id === ui.printEntryId);
    if (!entry) {
      ui.viewMode = 'tool-ueberweisungen';
      return renderEntryListPanel(patient, 'ueberweisungen');
    }

    const { wrap, card } = printDocumentHeader('Überweisungsschein', () => {
      ui.viewMode = 'tool-ueberweisungen';
      ui.printEntryId = null;
      render();
    });

    const meta = document.createElement('div');
    meta.className = 'invoice-meta';
    meta.appendChild(metaRow('Datum', formatDate(entry.datum)));
    meta.appendChild(metaRow('Patient', `${patient.nachname}, ${patient.vorname}`));
    meta.appendChild(metaRow('Geburtsdatum', patient.geburtsdatum ? formatDate(patient.geburtsdatum) : '–'));
    meta.appendChild(metaRow('Krankenkasse', patient.versicherung || '–'));
    meta.appendChild(metaRow('Überweisung an', entry.fachrichtung ? `${entry.empfaenger} (${entry.fachrichtung})` : entry.empfaenger));
    meta.appendChild(metaRow('Dringlichkeit', DRINGLICHKEIT_LABEL[entry.dringlichkeit] || DRINGLICHKEIT_LABEL.normal));
    card.appendChild(meta);

    const grundHeading = document.createElement('h3');
    grundHeading.textContent = 'Grund / Verdachtsdiagnose';
    card.appendChild(grundHeading);
    const grundText = document.createElement('p');
    grundText.style.whiteSpace = 'pre-wrap';
    grundText.textContent = entry.grund;
    card.appendChild(grundText);

    const footer = document.createElement('p');
    footer.className = 'invoice-footer-note';
    footer.textContent = 'Unterschrift / Praxisstempel: ________________________________';
    card.appendChild(footer);

    wrap.appendChild(card);
    logAction('Überweisung gedruckt', `${patient.nachname}, ${patient.vorname} — an ${entry.empfaenger}`);
    return wrap;
  }

  function renderBefundPrintView(patient) {
    const entry = (patient.befundweiterleitung || []).find((e) => e.id === ui.printEntryId);
    if (!entry) {
      ui.viewMode = 'tool-befundweiterleitung';
      return renderEntryListPanel(patient, 'befundweiterleitung');
    }

    const { wrap, card } = printDocumentHeader('Befundmitteilung', () => {
      ui.viewMode = 'tool-befundweiterleitung';
      ui.printEntryId = null;
      render();
    });

    const meta = document.createElement('div');
    meta.className = 'invoice-meta';
    meta.appendChild(metaRow('Datum', formatDate(entry.datum)));
    meta.appendChild(metaRow('Patient', `${patient.nachname}, ${patient.vorname}`));
    meta.appendChild(metaRow('Geburtsdatum', patient.geburtsdatum ? formatDate(patient.geburtsdatum) : '–'));
    meta.appendChild(metaRow('An', entry.empfaenger));
    meta.appendChild(metaRow('Betreff', entry.betreff || '–'));
    card.appendChild(meta);

    const textHeading = document.createElement('h3');
    textHeading.textContent = 'Befund';
    card.appendChild(textHeading);
    const befundText = document.createElement('p');
    befundText.style.whiteSpace = 'pre-wrap';
    befundText.textContent = entry.text;
    card.appendChild(befundText);

    const footer = document.createElement('p');
    footer.className = 'invoice-footer-note';
    footer.textContent = 'Unterschrift / Praxisstempel: ________________________________';
    card.appendChild(footer);

    wrap.appendChild(card);
    logAction('Befund weitergeleitet (gedruckt)', `${patient.nachname}, ${patient.vorname} — an ${entry.empfaenger}`);
    return wrap;
  }

  function renderKrankmeldungPrintView(patient) {
    const entry = (patient.krankmeldungen || []).find((e) => e.id === ui.printEntryId);
    if (!entry) {
      ui.viewMode = 'tool-krankmeldungen';
      return renderEntryListPanel(patient, 'krankmeldungen');
    }

    const { wrap, card } = printDocumentHeader('Arbeitsunfähigkeitsbescheinigung', () => {
      ui.viewMode = 'tool-krankmeldungen';
      ui.printEntryId = null;
      render();
    });

    const meta = document.createElement('div');
    meta.className = 'invoice-meta';
    meta.appendChild(metaRow('Ausstellungsdatum', formatDate(entry.datum)));
    meta.appendChild(metaRow('Art', AU_ART_LABEL[entry.art] || entry.art));
    meta.appendChild(metaRow('Patient', `${patient.nachname}, ${patient.vorname}`));
    meta.appendChild(metaRow('Geburtsdatum', patient.geburtsdatum ? formatDate(patient.geburtsdatum) : '–'));
    meta.appendChild(metaRow('Arbeitsunfähig von', formatDate(entry.von)));
    meta.appendChild(metaRow('Arbeitsunfähig bis', formatDate(entry.bis)));
    card.appendChild(meta);

    if (entry.diagnose) {
      const diagHeading = document.createElement('h3');
      diagHeading.textContent = 'Diagnose';
      card.appendChild(diagHeading);
      const diagText = document.createElement('p');
      diagText.textContent = entry.diagnose;
      card.appendChild(diagText);
      const diagNote = document.createElement('p');
      diagNote.className = 'entry-empty';
      diagNote.textContent = 'Hinweis: Die Diagnose ist nur für die Patientenunterlagen bestimmt, nicht für die Ausfertigung an den Arbeitgeber.';
      card.appendChild(diagNote);
    }

    const footer = document.createElement('p');
    footer.className = 'invoice-footer-note';
    footer.textContent = 'Unterschrift / Praxisstempel: ________________________________';
    card.appendChild(footer);

    wrap.appendChild(card);
    logAction('Krankmeldung gedruckt', `${patient.nachname}, ${patient.vorname} — ${formatDate(entry.von)} bis ${formatDate(entry.bis)}`);
    return wrap;
  }

  function upcomingTermine(patient) {
    const today = todayISO();
    return (patient.termine || [])
      .filter((t) => t.datum && t.datum >= today)
      .sort((a, b) => (a.datum + (a.uhrzeit || '')).localeCompare(b.datum + (b.uhrzeit || '')));
  }

  function renderTerminkarteToolView(patient) {
    const wrap = document.createDocumentFragment();
    const card = document.createElement('div');
    card.className = 'panel-card';
    const heading = document.createElement('h2');
    heading.textContent = 'Nächster Termin';
    card.appendChild(heading);

    const hint = document.createElement('p');
    hint.className = 'entry-empty';
    hint.textContent = 'Nächsten Arzttermin eintragen und als Terminkarte für den Patienten ausdrucken.';
    card.appendChild(hint);

    const formGrid = document.createElement('div');
    formGrid.className = 'form-grid';
    const datumLabel = fieldLabel('Datum', 'tkDatum', 'date');
    const datumInput = datumLabel.querySelector('input');
    datumInput.value = todayISO();
    const uhrzeitLabel = fieldLabel('Uhrzeit', 'tkUhrzeit', 'time');
    const uhrzeitInput = uhrzeitLabel.querySelector('input');
    const grundLabel = fieldLabel('Grund', 'tkGrund', 'text');
    const grundInput = grundLabel.querySelector('input');
    formGrid.append(datumLabel, uhrzeitLabel, grundLabel);
    card.appendChild(formGrid);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-glossy btn-primary btn-small';
    addBtn.textContent = '+ Termin eintragen';
    addBtn.addEventListener('click', () => {
      const grund = grundInput.value.trim();
      if (!grund || !datumInput.value) return;
      if (!patient.termine) patient.termine = [];
      patient.termine.push({ id: uid(), datum: datumInput.value, uhrzeit: uhrzeitInput.value, grund });
      logAction('Termin eingetragen', `${patient.nachname}, ${patient.vorname} — ${grund}`);
      persist();
      render();
    });
    card.appendChild(addBtn);
    wrap.appendChild(card);

    const listCard = document.createElement('div');
    listCard.className = 'panel-card';
    const upcoming = upcomingTermine(patient);
    if (upcoming.length === 0) {
      const p = document.createElement('p');
      p.className = 'entry-empty';
      p.textContent = 'Kein bevorstehender Termin eingetragen.';
      listCard.appendChild(p);
    } else {
      const list = document.createElement('ul');
      list.className = 'entry-list';
      upcoming.forEach((t) => {
        const li = document.createElement('li');
        li.className = 'entry-row';
        const date = document.createElement('div');
        date.className = 'entry-date';
        date.textContent = formatDate(t.datum) + (t.uhrzeit ? ` ${t.uhrzeit}` : '');
        li.appendChild(date);
        const text = document.createElement('div');
        text.className = 'entry-text';
        text.textContent = t.grund;
        li.appendChild(text);
        const printBtn = document.createElement('button');
        printBtn.className = 'btn-glossy btn-primary btn-small';
        printBtn.textContent = 'Terminkarte drucken';
        printBtn.addEventListener('click', () => {
          ui.printEntryId = t.id;
          ui.viewMode = 'print-terminkarte';
          render();
        });
        li.appendChild(printBtn);
        list.appendChild(li);
      });
      listCard.appendChild(list);
    }
    wrap.appendChild(listCard);

    return wrap;
  }

  function renderTerminkartePrintView(patient) {
    const entry = (patient.termine || []).find((t) => t.id === ui.printEntryId);
    if (!entry) {
      ui.viewMode = 'tool-terminkarte';
      return renderTerminkarteToolView(patient);
    }

    const { wrap, card } = printDocumentHeader('Terminkarte', () => {
      ui.viewMode = 'tool-terminkarte';
      ui.printEntryId = null;
      render();
    });

    const meta = document.createElement('div');
    meta.className = 'invoice-meta';
    meta.appendChild(metaRow('Patient', `${patient.nachname}, ${patient.vorname}`));
    const weekday = WOCHENTAGE_LANG[new Date(entry.datum).getDay()] || '';
    meta.appendChild(metaRow('Nächster Termin', `${weekday}, ${formatDate(entry.datum)}${entry.uhrzeit ? ' um ' + entry.uhrzeit + ' Uhr' : ''}`));
    meta.appendChild(metaRow('Grund', entry.grund || '–'));
    card.appendChild(meta);

    const note = document.createElement('p');
    note.className = 'invoice-footer-note';
    note.textContent = 'Bitte bringen Sie diese Terminkarte zum nächsten Besuch mit und erscheinen Sie pünktlich.';
    card.appendChild(note);

    wrap.appendChild(card);
    logAction('Terminkarte gedruckt', `${patient.nachname}, ${patient.vorname} — ${formatDate(entry.datum)}`);
    return wrap;
  }

  function renderPatientToolView(renderFn) {
    const patient = getPatient(ui.selectedPatientId);
    if (!patient) {
      ui.viewMode = 'list';
      el.content.appendChild(renderPatientListView());
      return;
    }
    el.content.appendChild(renderPatientBanner(patient));
    el.content.appendChild(renderFn(patient));
  }

  // ---------- Patient anlegen / bearbeiten ----------

  function openNewPatientModal() {
    ui.editingPatientId = null;
    el.patientFormTitle.textContent = 'Neuen Patienten anlegen';
    el.fieldNachname.value = '';
    el.fieldVorname.value = '';
    el.fieldGeburtsdatum.value = '';
    el.fieldGeburtsdatum.max = todayISO();
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
    el.fieldGeburtsdatum.max = todayISO();
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
      logAction('Patient bearbeitet', `${nachname}, ${vorname}`);
    } else {
      const patient = normalizePatient({ id: uid(), ...data });
      patient.erstelltAm = new Date().toISOString();
      state.patients.push(patient);
      ui.selectedPatientId = patient.id;
      ui.viewMode = 'patient';
      ui.activeTab = 'basis';
      logAction('Patient angelegt', `${nachname}, ${vorname}`);
    }

    closePatientFormModal();
    persist();
    render();
  }

  // ---------- Patient löschen ----------

  function openDeletePatientModal(patientId) {
    if (!currentUser || currentUser.role !== 'admin') return;
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
    const patient = getPatient(pendingDeletePatientId);
    state.patients = state.patients.filter((p) => p.id !== pendingDeletePatientId);
    if (patient) logAction('Patient gelöscht', `${patient.nachname}, ${patient.vorname}`);
    if (ui.selectedPatientId === pendingDeletePatientId) {
      ui.selectedPatientId = null;
      ui.viewMode = 'list';
    }
    closeDeletePatientModal();
    persist();
    render();
  }

  // ---------- Einträge (Journal/Rezepte/Termine/Briefe/Labor) ----------

  function openEntryModal(category, presetDate) {
    ui.entryModalCategory = category;
    el.entryFormFields.replaceChildren();
    el.entryFormTitle.textContent = CATEGORY_META[category].addLabel.replace('+ ', '') + ' hinzufügen';

    const dateLabel = fieldLabel('Datum', 'entryDatum', 'date');
    dateLabel.querySelector('input').value = presetDate || todayISO();
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
    } else if (category === 'abrechnung') {
      const katLabel = document.createElement('label');
      const katSpan = document.createElement('span');
      katSpan.textContent = 'Kategorie';
      const katSelect = document.createElement('select');
      katSelect.id = 'entryKategorie';
      Object.entries(ABRECHNUNG_KATEGORIEN).forEach(([value, label]) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        katSelect.appendChild(opt);
      });
      katLabel.append(katSpan, katSelect);
      el.entryFormFields.appendChild(katLabel);

      const zifferLabel = fieldLabel('Ziffer (EBM/GOÄ)', 'entryZiffer', 'text');
      const zifferInput = zifferLabel.querySelector('input');
      zifferInput.setAttribute('list', 'zifferVorschlaege');
      const datalist = document.createElement('datalist');
      datalist.id = 'zifferVorschlaege';
      ZIFFERN_VORSCHLAEGE.forEach((z) => {
        const opt = document.createElement('option');
        opt.value = z.ziffer;
        opt.label = z.bezeichnung;
        datalist.appendChild(opt);
      });
      zifferLabel.appendChild(datalist);
      el.entryFormFields.appendChild(zifferLabel);

      const bezeichnungLabel = fieldLabel('Bezeichnung', 'entryBezeichnung', 'text');
      el.entryFormFields.appendChild(bezeichnungLabel);
      const bezeichnungInput = bezeichnungLabel.querySelector('input');

      const betragLabel = fieldLabel('Betrag (€)', 'entryBetrag', 'number');
      const betragInput = betragLabel.querySelector('input');
      betragInput.step = '0.01';
      betragInput.min = '0';
      el.entryFormFields.appendChild(betragLabel);

      zifferInput.addEventListener('change', () => {
        const match = ZIFFERN_VORSCHLAEGE.find((z) => z.ziffer === zifferInput.value);
        if (!match) return;
        // .select() markiert den übernommenen Vorschlag, damit ein Benutzer, der direkt
        // weitertippt, ihn ersetzt statt versehentlich etwas anzuhängen.
        if (!bezeichnungInput.value) {
          bezeichnungInput.value = match.bezeichnung;
          bezeichnungInput.select();
        }
        if (!betragInput.value) {
          betragInput.value = match.betrag;
          betragInput.select();
        }
      });
    } else if (category === 'laborwerte') {
      el.entryFormFields.appendChild(fieldLabel('Parameter', 'entryParameter', 'text'));
      el.entryFormFields.appendChild(fieldLabel('Wert', 'entryWert', 'text'));
      el.entryFormFields.appendChild(fieldLabel('Einheit', 'entryEinheit', 'text'));
      el.entryFormFields.appendChild(fieldLabel('Referenzbereich', 'entryReferenzbereich', 'text'));
    } else if (category === 'krankenscheine') {
      el.entryFormFields.appendChild(fieldLabel('Art', 'entryArt', 'text'));
      el.entryFormFields.appendChild(textAreaField('Notiz', 'entryNotiz'));
    } else if (category === 'uebergaben') {
      el.entryFormFields.appendChild(fieldLabel('Von', 'entryVon', 'text'));
      el.entryFormFields.appendChild(fieldLabel('An', 'entryAn', 'text'));
      el.entryFormFields.appendChild(textAreaField('Text', 'entryText'));
    } else if (category === 'ueberweisungen') {
      el.entryFormFields.appendChild(fieldLabel('Empfänger (Facharzt/Einrichtung)', 'entryEmpfaenger', 'text'));
      el.entryFormFields.appendChild(fieldLabel('Fachrichtung', 'entryFachrichtung', 'text'));
      const dringLabel = selectField('Dringlichkeit', 'entryDringlichkeit', Object.entries(DRINGLICHKEIT_LABEL).map(([v, l]) => [v, l]));
      el.entryFormFields.appendChild(dringLabel);
      el.entryFormFields.appendChild(textAreaField('Grund / Verdachtsdiagnose', 'entryGrund'));
    } else if (category === 'befundweiterleitung') {
      el.entryFormFields.appendChild(fieldLabel('Empfänger (Arzt/Praxis)', 'entryEmpfaenger', 'text'));
      el.entryFormFields.appendChild(fieldLabel('Betreff', 'entryBetreff', 'text'));

      const patient = getPatient(ui.selectedPatientId);
      const vorlagen = [];
      (patient && patient.journal ? patient.journal : []).forEach((e) => {
        vorlagen.push({ label: `Verlauf ${formatDate(e.datum)} (${e.typ || ''}): ${e.text}`.slice(0, 90), text: e.text });
      });
      (patient && patient.laborwerte ? patient.laborwerte : []).forEach((e) => {
        const t = `${e.parameter}: ${e.wert || ''} ${e.einheit || ''}`.trim();
        vorlagen.push({ label: `Laborwert ${formatDate(e.datum)}: ${t}`.slice(0, 90), text: t });
      });
      if (vorlagen.length > 0) {
        const vorlageLabel = selectField(
          'Text übernehmen aus (optional)',
          'entryVorlage',
          [['', '– frei eingeben –'], ...vorlagen.map((v, i) => [String(i), v.label])]
        );
        const vorlageSelect = vorlageLabel.querySelector('select');
        el.entryFormFields.appendChild(vorlageLabel);
        const befundLabel = textAreaField('Befundtext', 'entryText');
        const befundArea = befundLabel.querySelector('textarea');
        el.entryFormFields.appendChild(befundLabel);
        vorlageSelect.addEventListener('change', () => {
          if (vorlageSelect.value === '') return;
          befundArea.value = vorlagen[Number(vorlageSelect.value)].text;
        });
      } else {
        el.entryFormFields.appendChild(textAreaField('Befundtext', 'entryText'));
      }
    } else if (category === 'krankmeldungen') {
      const artLabel = selectField('Art', 'entryArt', Object.entries(AU_ART_LABEL).map(([v, l]) => [v, l]));
      el.entryFormFields.appendChild(artLabel);
      const vonLabel = fieldLabel('Arbeitsunfähig von', 'entryVon', 'date');
      vonLabel.querySelector('input').value = presetDate || todayISO();
      el.entryFormFields.appendChild(vonLabel);
      el.entryFormFields.appendChild(fieldLabel('Arbeitsunfähig bis', 'entryBis', 'date'));
      el.entryFormFields.appendChild(fieldLabel('Diagnose (optional)', 'entryDiagnose', 'text'));
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

  function selectField(labelText, id, options) {
    const label = document.createElement('label');
    const span = document.createElement('span');
    span.textContent = labelText;
    const select = document.createElement('select');
    select.id = id;
    options.forEach(([value, text]) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = text;
      select.appendChild(opt);
    });
    label.append(span, select);
    return label;
  }

  function patientSelectOptions(includeEmpty) {
    const opts = state.patients
      .slice()
      .sort((a, b) => `${a.nachname} ${a.vorname}`.localeCompare(`${b.nachname} ${b.vorname}`, 'de'))
      .map((p) => [p.id, `${p.nachname}, ${p.vorname}`]);
    return includeEmpty ? [['', '– kein Patient –'], ...opts] : opts;
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
      entry.status = 'offen';
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
    } else if (category === 'abrechnung') {
      const ziffer = byId('entryZiffer').value.trim();
      const bezeichnung = byId('entryBezeichnung').value.trim();
      const betrag = parseFloat(byId('entryBetrag').value);
      if (!ziffer || !bezeichnung || !(betrag > 0)) return;
      entry.kategorie = byId('entryKategorie').value;
      entry.ziffer = ziffer;
      entry.bezeichnung = bezeichnung;
      entry.betrag = betrag;
      entry.status = 'offen';
    } else if (category === 'laborwerte') {
      const parameter = byId('entryParameter').value.trim();
      if (!parameter) return;
      entry.parameter = parameter;
      entry.wert = byId('entryWert').value.trim();
      entry.einheit = byId('entryEinheit').value.trim();
      entry.referenzbereich = byId('entryReferenzbereich').value.trim();
    } else if (category === 'krankenscheine') {
      const art = byId('entryArt').value.trim();
      if (!art) return;
      entry.art = art;
      entry.notiz = byId('entryNotiz').value.trim();
    } else if (category === 'uebergaben') {
      const text = byId('entryText').value.trim();
      if (!text) return;
      entry.von = byId('entryVon').value.trim();
      entry.an = byId('entryAn').value.trim();
      entry.text = text;
    } else if (category === 'ueberweisungen') {
      const empfaenger = byId('entryEmpfaenger').value.trim();
      const grund = byId('entryGrund').value.trim();
      if (!empfaenger || !grund) return;
      entry.empfaenger = empfaenger;
      entry.fachrichtung = byId('entryFachrichtung').value.trim();
      entry.dringlichkeit = byId('entryDringlichkeit').value;
      entry.grund = grund;
    } else if (category === 'befundweiterleitung') {
      const empfaenger = byId('entryEmpfaenger').value.trim();
      const text = byId('entryText').value.trim();
      if (!empfaenger || !text) return;
      entry.empfaenger = empfaenger;
      entry.betreff = byId('entryBetreff').value.trim();
      entry.text = text;
    } else if (category === 'krankmeldungen') {
      const von = byId('entryVon').value;
      const bis = byId('entryBis').value;
      if (!von || !bis) return;
      entry.art = byId('entryArt').value;
      entry.von = von;
      entry.bis = bis;
      entry.diagnose = byId('entryDiagnose').value.trim();
    }

    if (!patient[category]) patient[category] = [];
    patient[category].push(entry);
    logAction(`Eintrag hinzugefügt (${CATEGORY_META[category].title})`, `${patient.nachname}, ${patient.vorname}`);

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

  el.cancelUserForm.addEventListener('click', closeUserFormModal);
  el.confirmUserForm.addEventListener('click', submitUserForm);
  el.userFormModal.addEventListener('click', (e) => {
    if (e.target === el.userFormModal) closeUserFormModal();
  });

  el.cancelConfirmAction.addEventListener('click', closeConfirm);
  el.confirmConfirmAction.addEventListener('click', () => {
    const action = pendingConfirmAction;
    closeConfirm();
    if (action) action();
  });
  el.confirmActionModal.addEventListener('click', (e) => {
    if (e.target === el.confirmActionModal) closeConfirm();
  });

  el.lockBtn.addEventListener('click', doLock);

  el.toolPatientListBtn.addEventListener('click', () => {
    ui.viewMode = 'list';
    render();
  });
  el.toolNewPatientBtn.addEventListener('click', openNewPatientModal);
  el.toolSearchBtn.addEventListener('click', () => el.patientSearch.focus());
  el.toolTermineBtn.addEventListener('click', () => {
    if (ui.selectedPatientId) selectTab('termine');
  });
  el.toolBriefeBtn.addEventListener('click', () => {
    if (ui.selectedPatientId) selectTab('briefe');
  });
  el.toolLaborBtn.addEventListener('click', () => {
    if (ui.selectedPatientId) selectTab('labor');
  });
  el.toolPrintBtn.addEventListener('click', () => window.print());
  el.toolReloadBtn.addEventListener('click', async () => {
    const res = await window.patientenweltAPI.reloadData();
    if (res && res.success) {
      state = normalizeState(res.state);
      render();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (el.entryFormModal.classList.contains('open')) closeEntryModal();
      else if (el.deletePatientModal.classList.contains('open')) closeDeletePatientModal();
      else if (el.patientFormModal.classList.contains('open')) closePatientFormModal();
      else if (el.userFormModal.classList.contains('open')) closeUserFormModal();
      else if (el.confirmActionModal.classList.contains('open')) closeConfirm();
      return;
    }
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      if (el.entryFormModal.classList.contains('open') && el.entryFormModal.contains(e.target)) {
        e.preventDefault();
        submitEntryForm();
      } else if (el.patientFormModal.classList.contains('open') && el.patientFormModal.contains(e.target)) {
        e.preventDefault();
        submitPatientForm();
      } else if (el.deletePatientModal.classList.contains('open') && el.deletePatientModal.contains(e.target)) {
        e.preventDefault();
        confirmDeletePatient();
      } else if (el.userFormModal.classList.contains('open') && el.userFormModal.contains(e.target)) {
        e.preventDefault();
        submitUserForm();
      } else if (el.confirmActionModal.classList.contains('open') && el.confirmActionModal.contains(e.target)) {
        e.preventDefault();
        el.confirmConfirmAction.click();
      }
    }
  });

  // ---------- Sperre / Sitzungsende bei Inaktivität ----------

  function resetIdleTimer() {
    if (!currentUser) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(doLock, IDLE_LOCK_MS);
  }

  ['mousemove', 'keydown', 'click', 'wheel'].forEach((evt) => {
    document.addEventListener(evt, resetIdleTimer, { passive: true });
  });

  async function doLock() {
    if (!currentUser) return;
    if (idleTimer) clearTimeout(idleTimer);
    logAction('Sperre aktiviert');
    await persist();
    await window.patientenweltAPI.lock();
    currentUser = null;
    state = { patients: [] };
    ui.viewMode = 'list';
    ui.selectedPatientId = null;
    el.appShell.hidden = true;
    el.authScreen.hidden = false;
    boot();
  }

  // ---------- Anmelde-/Einrichtungsbildschirm ----------

  function renderHeaderUser() {
    el.userChip.replaceChildren();
    if (!currentUser) return;
    el.userChip.append(document.createTextNode(currentUser.name));
    const badge = document.createElement('span');
    badge.className = 'role-badge' + (currentUser.role === 'admin' ? ' role-admin' : '');
    badge.textContent = currentUser.role === 'admin' ? 'Admin' : 'Mitarbeiter';
    el.userChip.appendChild(badge);
  }

  function unlockApp(newState, user) {
    state = normalizeState(newState);
    currentUser = user;
    el.authScreen.hidden = true;
    el.appShell.hidden = false;
    renderHeaderUser();
    render();
    resetIdleTimer();
  }

  function fieldRow(labelText, type) {
    const label = document.createElement('label');
    const span = document.createElement('span');
    span.textContent = labelText;
    const input = document.createElement('input');
    input.type = type;
    label.append(span, input);
    return { label, input };
  }

  function renderSetupScreen() {
    el.authCard.replaceChildren();

    const h1 = document.createElement('h1');
    h1.className = 'text-glossy-blue';
    h1.textContent = 'PatientenWelt';
    el.authCard.appendChild(h1);

    const subtitle = document.createElement('p');
    subtitle.className = 'auth-subtitle';
    subtitle.textContent = 'Erstes Admin-Konto anlegen, um die Praxisdaten verschlüsselt zu speichern.';
    el.authCard.appendChild(subtitle);

    const nameRow = fieldRow('Name', 'text');
    const pwRow = fieldRow('Passwort (mind. 6 Zeichen)', 'password');
    const pwConfirmRow = fieldRow('Passwort bestätigen', 'password');
    el.authCard.append(nameRow.label, pwRow.label, pwConfirmRow.label);

    const error = document.createElement('p');
    error.className = 'auth-error';
    el.authCard.appendChild(error);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'btn-glossy btn-primary';
    submitBtn.textContent = 'Konto anlegen & Daten verschlüsseln';
    el.authCard.appendChild(submitBtn);

    async function submit() {
      const name = nameRow.input.value.trim();
      const password = pwRow.input.value;
      if (!name) { error.textContent = 'Name ist erforderlich.'; return; }
      if (password.length < 6) { error.textContent = 'Passwort muss mindestens 6 Zeichen haben.'; return; }
      if (password !== pwConfirmRow.input.value) { error.textContent = 'Passwörter stimmen nicht überein.'; return; }

      const res = await window.patientenweltAPI.setup(name, password);
      if (!res || !res.success) {
        error.textContent = (res && res.error) || 'Einrichtung fehlgeschlagen.';
        return;
      }
      unlockApp(res.state, res.user);
    }

    submitBtn.addEventListener('click', submit);
    [nameRow.input, pwRow.input, pwConfirmRow.input].forEach((input) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
      });
    });
    nameRow.input.focus();
  }

  function renderLoginScreen(users) {
    el.authCard.replaceChildren();

    const h1 = document.createElement('h1');
    h1.className = 'text-glossy-blue';
    h1.textContent = 'PatientenWelt';
    el.authCard.appendChild(h1);

    const subtitle = document.createElement('p');
    subtitle.className = 'auth-subtitle';
    subtitle.textContent = 'Bitte anmelden, um die verschlüsselten Praxisdaten zu entsperren.';
    el.authCard.appendChild(subtitle);

    const userLabel = document.createElement('label');
    const userSpan = document.createElement('span');
    userSpan.textContent = 'Benutzer';
    const userSelect = document.createElement('select');
    users.forEach((u) => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.name} (${u.role === 'admin' ? 'Administrator' : 'Mitarbeiter'})`;
      userSelect.appendChild(opt);
    });
    userLabel.append(userSpan, userSelect);
    el.authCard.appendChild(userLabel);

    const pwRow = fieldRow('Passwort', 'password');
    el.authCard.appendChild(pwRow.label);

    const error = document.createElement('p');
    error.className = 'auth-error';
    el.authCard.appendChild(error);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'btn-glossy btn-primary';
    submitBtn.textContent = 'Anmelden';
    el.authCard.appendChild(submitBtn);

    async function submit() {
      const res = await window.patientenweltAPI.login(userSelect.value, pwRow.input.value);
      if (!res || !res.success) {
        error.textContent = (res && res.error) || 'Anmeldung fehlgeschlagen.';
        pwRow.input.value = '';
        pwRow.input.focus();
        return;
      }
      unlockApp(res.state, res.user);
    }

    submitBtn.addEventListener('click', submit);
    pwRow.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    pwRow.input.focus();
  }

  // ---------- Initialisierung ----------

  async function boot() {
    const hasAccount = await window.patientenweltAPI.hasAccount();
    if (!hasAccount) {
      renderSetupScreen();
      return;
    }
    const users = await window.patientenweltAPI.listUsers();
    renderLoginScreen(users);
  }

  boot();
})();
