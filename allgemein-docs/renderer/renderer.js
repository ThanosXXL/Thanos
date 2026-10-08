(function () {
  'use strict';

  // ---------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayISO = () => isoDate(new Date());
  const addDays = (iso, n) => {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return isoDate(d);
  };
  const mondayOf = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    return addDays(iso, -((d.getDay() + 6) % 7));
  };
  const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const fmtDate = (iso) => (iso ? iso.split('-').reverse().join('.') : '–');
  const fmtDateLong = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };
  const fmtStamp = (ts) => {
    const d = new Date(ts);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const ageFrom = (iso) => {
    if (!iso) return '';
    const b = new Date(iso + 'T12:00:00');
    const n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  };

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  const ICONS = {
    home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    calendar: 'M4 6h16v15H4zM4 10h16M8 3v6M16 3v6',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2',
    check: 'M4 12l5 5L20 6M3 3h18v18H3z',
    file: 'M6 3h9l5 5v13H6zM14 3v6h6M9 13h8M9 17h8',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3',
    plus: 'M12 5v14M5 12h14',
    pulse: 'M3 12h4l3-8 4 16 3-8h4',
    print: 'M7 9V3h10v6M6 18H4v-7h16v7h-2M7 14h10v7H7z',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
    pill: 'M10.5 20.5l-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7M8.5 8.5l7 7',
    image: 'M3 5h18v14H3zM8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4M21 16l-5-5-8 8',
    left: 'M15 5l-7 7 7 7',
    right: 'M9 5l7 7-7 7',
    save: 'M5 3h12l4 4v14H5zM8 3v6h8V3M8 21v-7h8v7',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5L16 9',
    euro: 'M18 6a7 7 0 1 0 0 12M4 10h10M4 14h10',
    chart: 'M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-9',
    play: 'M5 4l15 8-15 8zM3 21h18',
    help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01',
    download: 'M12 3v12M7 11l5 5 5-5M4 21h16',
    flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8',
    thermo: 'M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0M12 8v8',
    swap: 'M4 8h13l-3-3M20 16H7l3 3',
    card: 'M3 6h18v12H3zM3 10h18M7 15h4',
    book: 'M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 21V5M9 7h6M9 11h6',
    close: 'M6 6l12 12M18 6L6 18'
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', ICONS[name] || ICONS.file);
    svg.appendChild(p);
    return svg;
  }
  const btn = (label, opts = {}) =>
    h('button', { class: 'btn ' + (opts.kind || ''), type: 'button', onclick: opts.onclick }, opts.icon ? icon(opts.icon) : null, label);

  function toast(msg) {
    const t = h('div', { class: 'toast', text: msg });
    document.getElementById('toast-root').appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ---------------------------------------------------------------
  // Zustand
  // ---------------------------------------------------------------
  const AVATARS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
  const avatarSrc = (p) => `img/avatar-${p.avatar || 'a1'}.svg`;
  const KARTEI_TYPEN = ['Anamnese', 'Befund', 'Diagnose', 'Therapie', 'Notiz'];
  const DEFAULT_PRAXIS = 'Praxis für Allgemeinmedizin';

  let state = null;
  const view = { page: 'start', patientId: null, patientTab: 'uebersicht', patientSearch: '', day: todayISO() };

  function demoData() {
    const today = todayISO();
    const stamp = (daysAgo, hh, mm) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      d.setHours(hh, mm, 0, 0);
      return d.getTime();
    };
    const p = (vorname, nachname, geb, geschlecht, versicherung, kasse, telefon, allergien, avatar, diagnosen, medikation, karte, bilder) => ({
      id: uid(), vorname, nachname, geb, geschlecht, versicherung, kasse, telefon, allergien, avatar,
      diagnosen: diagnosen.map(([icd, text]) => ({ id: uid(), icd, text })),
      medikation: medikation.map((text) => ({ id: uid(), text })),
      karte: karte.map(([daysAgo, typ, text]) => ({ id: uid(), ts: stamp(daysAgo, 9, 20), typ, text })),
      bilder
    });
    const patienten = [
      p('Anna', 'Berger', '1978-03-14', 'w', 'gesetzlich', 'AOK Plus', '0151 2345678', 'Penicillin', 'a1',
        [['I10', 'Essentielle Hypertonie'], ['E78.0', 'Reine Hypercholesterinämie']],
        ['Ramipril 5 mg 1-0-0', 'Atorvastatin 20 mg 0-0-1'],
        [[40, 'Anamnese', 'Regelmäßige Kontrolle. Gelegentlich Kopfschmerzen am Morgen. Keine Thoraxschmerzen.'],
         [40, 'Befund', 'RR 148/92 mmHg, Puls 76 regelmäßig. Herz und Lunge unauffällig.'],
         [7, 'Therapie', 'Ramipril auf 5 mg erhöht. Selbstmessung des Blutdrucks protokollieren, Kontrolle in 2 Wochen.']],
        [{ id: uid(), src: 'img/blutdruck.svg', titel: 'Blutdruck-Wochenverlauf' }, { id: uid(), src: 'img/ekg.svg', titel: 'Ruhe-EKG' }]),
      p('Jonas', 'Weber', '1990-11-02', 'm', 'gesetzlich', 'TK', '0170 9876543', '', 'a2',
        [['J45.9', 'Asthma bronchiale']],
        ['Salbutamol Spray bei Bedarf'],
        [[90, 'Anamnese', 'Belastungsabhängiger Husten, v. a. im Frühjahr.'],
         [3, 'Befund', 'Auskultation: leises Giemen exspiratorisch. Peak-Flow 480 l/min.']],
        [{ id: uid(), src: 'img/roentgen.svg', titel: 'Röntgen Thorax p.a.' }]),
      p('Helga', 'Schneider', '1948-07-22', 'w', 'gesetzlich', 'Barmer', '030 5551234', 'Jod, Latex', 'a3',
        [['E11.9', 'Diabetes mellitus Typ 2'], ['I10', 'Essentielle Hypertonie'], ['M54.5', 'Kreuzschmerz']],
        ['Metformin 1000 mg 1-0-1', 'Ramipril 5 mg 1-0-0', 'Ibuprofen 400 mg bei Bedarf'],
        [[14, 'Befund', 'HbA1c 7,1 %. Nüchternblutzucker 118 mg/dl. Fußpulse tastbar.'],
         [14, 'Therapie', 'Therapie unverändert, Ernährungsberatung angeboten.']],
        [{ id: uid(), src: 'img/blutdruck.svg', titel: 'Blutdruck-Wochenverlauf' }]),
      p('Murat', 'Yilmaz', '1985-01-30', 'm', 'privat', 'Debeka', '0176 1112233', '', 'a4',
        [['K21.0', 'Refluxkrankheit']],
        ['Pantoprazol 40 mg 1-0-0'],
        [[30, 'Anamnese', 'Sodbrennen nach dem Essen, v. a. abends.']], []),
      p('Lea', 'Fischer', '2001-09-09', 'w', 'gesetzlich', 'DAK', '0160 4445566', 'Nüsse', 'a5',
        [['J06.9', 'Akute Infektion der oberen Atemwege']], [],
        [[1, 'Anamnese', 'Halsschmerzen und Schnupfen seit 3 Tagen, kein Fieber.']], []),
      p('Karl', 'Hoffmann', '1957-05-18', 'm', 'gesetzlich', 'IKK classic', '0341 777888', '', 'a6',
        [['I25.9', 'Chronische ischämische Herzkrankheit']],
        ['ASS 100 mg 1-0-0', 'Bisoprolol 5 mg 1-0-0'],
        [[60, 'Befund', 'Belastbar, keine Angina pectoris. Ruhe-EKG unauffällig.']],
        [{ id: uid(), src: 'img/ekg.svg', titel: 'Ruhe-EKG' }])
    ];
    const ex = (idx, vorsorge, impfungen, leistungen) => {
      patienten[idx].vorsorge = vorsorge.map(([art, tage]) => ({ id: uid(), art, faellig: addDays(today, tage) }));
      patienten[idx].impfungen = impfungen.map(([name, back, vor]) => ({ id: uid(), name, datum: addDays(today, -back), naechste: vor === null ? '' : addDays(today, vor) }));
      patienten[idx].leistungen = leistungen.map(([text, back, betrag]) => ({ id: uid(), text, datum: addDays(today, -back), betrag }));
    };
    ex(0, [['Gesundheits-Check-up', 12], ['Hautkrebs-Screening', 60]], [['Influenza', 20, 345], ['Tetanus/Diphtherie/Keuchhusten (Tdap)', 1800, 1850]], [['Beratung', 7, 18.5], ['Blutdruck-Langzeitmessung', 7, 32], ['Beratung', 40, 18.5]]);
    ex(1, [['Lungenfunktionskontrolle', -5]], [['Influenza', 300, 65]], [['Lungenfunktion (Spirometrie)', 3, 24], ['Beratung', 3, 18.5]]);
    ex(2, [['Diabetes-Fußuntersuchung', 9], ['Augenärztliche Kontrolle', 25]], [['Pneumokokken', 400, null], ['Influenza', 30, 335], ['Gürtelrose', 200, 20]], [['Diabetes-Check', 14, 41], ['Beratung', 14, 18.5]]);
    ex(3, [['Magenspiegelung klären', 30]], [['Hepatitis B', 900, null]], [['Beratung', 30, 18.5]]);
    ex(4, [['Jugendgesundheitsuntersuchung', -20]], [['Masern', 3000, null], ['COVID-19', 400, 10]], [['Erkältungsberatung', 1, 18.5]]);
    ex(5, [['Darmkrebs-Vorsorge', 4], ['Gesundheits-Check-up', 3]], [['FSME', 500, 230]], [['Ruhe-EKG', 60, 21.5], ['Beratung', 60, 18.5]]);
    ['A123456780', 'B234567891', 'C345678902', 'D456789013', 'E567890124', 'F678901235'].forEach((k, i) => { patienten[i].kvnr = k; });
    const lab = (idx, back, werte, bem) => patienten[idx].labor.push({ id: uid(), datum: addDays(today, -back), labor: 'Labor Beispiel GmbH', werte: Object.entries(werte).map(([name, wert]) => ({ name, wert })), bemerkung: bem || '' });
    patienten.forEach((q) => { q.labor = []; q.rezepte = []; q.krankmeldungen = []; q.ueberweisungen = []; });
    lab(0, 90, { 'Cholesterin gesamt': 232, 'LDL-Cholesterin': 151, 'HDL-Cholesterin': 52, 'Triglyzeride': 140, 'Glukose nüchtern': 96, 'Kreatinin': 0.9, 'TSH': 2.1 });
    lab(0, 10, { 'Cholesterin gesamt': 208, 'LDL-Cholesterin': 128, 'HDL-Cholesterin': 54, 'Triglyzeride': 132, 'Glukose nüchtern': 94, 'Kreatinin': 0.9, 'TSH': 1.9 }, 'Unter Atorvastatin deutlich gebessert.');
    lab(2, 80, { 'HbA1c': 7.4, 'Glukose nüchtern': 138, 'Kreatinin': 1.1, 'eGFR': 68, 'Cholesterin gesamt': 189 });
    lab(2, 14, { 'HbA1c': 7.1, 'Glukose nüchtern': 118, 'Kreatinin': 1.2, 'eGFR': 64, 'Cholesterin gesamt': 181, 'CRP': 3 }, 'Therapie unverändert.');
    lab(5, 20, { 'Hämoglobin': 14.2, 'Leukozyten': 6.8, 'Thrombozyten': 240, 'CRP': 2, 'GGT': 52, 'GPT (ALT)': 31 });
    patienten[0].rezepte.push({ id: uid(), datum: addDays(today, -7), medikament: 'Ramipril 5 mg', dosierung: '1-0-0', packung: 'N3', anzahl: '1', autidem: 'ja', hinweis: 'vor dem Essen', gueltigBis: addDays(today, 21), erezept: { id: '160.100.482.915.337.64', code: 'a3f1c9d27be84c0f91d5e6a7b8c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0', status: 'signiert', abgabe: 'offen' } });
    patienten[2].rezepte.push({ id: uid(), datum: addDays(today, -14), medikament: 'Metformin 1000 mg', dosierung: '1-0-1', packung: 'N3', anzahl: '1', autidem: 'ja', hinweis: '', gueltigBis: addDays(today, 14), erezept: { id: '160.100.771.208.945.12', code: 'b4e2d0a38cf95d1fa2e6f7b8c9d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1', status: 'signiert', abgabe: 'eingelöst' } });
    patienten[4].krankmeldungen.push({ id: uid(), datum: addDays(today, -1), art: 'Erstbescheinigung', von: addDays(today, -1), bis: addDays(today, 2), diagnose: 'J06.9 – Akute Infektion der oberen Atemwege', unfall: 'nein', digital: { kasse: Date.now() - 86000000, ag: Date.now() - 85000000 } });
    patienten[2].ueberweisungen.push({ id: uid(), datum: addDays(today, -14), an: 'Augenheilkunde', diagnose: 'E11.9 – Diabetes mellitus Typ 2', auftrag: 'Jährliche Netzhautuntersuchung', dringend: 'nein' });
    patienten[5].ueberweisungen.push({ id: uid(), datum: addDays(today, -2), an: 'Gastroenterologie', diagnose: 'Darmkrebs-Vorsorge', auftrag: 'Koloskopie', dringend: 'nein' });
    const termin = (idx, tag, zeit, dauer, grund, status) => ({ id: uid(), patientId: patienten[idx].id, datum: addDays(today, tag), zeit, dauer, grund, status: status || 'geplant' });
    return {
      version: 1,
      demo: true,
      karten: [],
      katalogExtra: [],
      einstellungen: { praxis: DEFAULT_PRAXIS, arzt: 'Dr. med. Sabine Lindner' },
      patienten,
      termine: [
        termin(0, 0, '08:30', 20, 'Blutdruckkontrolle'),
        termin(4, 0, '09:00', 15, 'Erkältung'),
        termin(1, 0, '09:30', 30, 'Lungenfunktion'),
        termin(3, 0, '11:00', 20, 'Sodbrennen – Verlaufskontrolle'),
        termin(2, 0, '14:30', 30, 'Diabetes-Check'),
        termin(5, 1, '10:00', 30, 'Gesundheits-Check-up'),
        termin(0, 2, '08:00', 15, 'Rezept abholen'),
        termin(1, 4, '13:30', 20, 'Impfung')
      ],
      wartezimmer: [],
      aufgaben: [
        { id: uid(), text: 'Befund Labor Frau Schneider sichten', done: false },
        { id: uid(), text: 'Rezeptanforderungen bearbeiten', done: false },
        { id: uid(), text: 'Impfstoff-Bestand prüfen', done: false },
        { id: uid(), text: 'Quartalsabrechnung vorbereiten', done: true }
      ],
      bausteine: [
        'Allgemeinzustand gut.', 'Herz und Lunge auskultatorisch unauffällig.', 'Abdomen weich, kein Druckschmerz.',
        'Keine Fieberanamnese.', 'Wiedervorstellung bei Beschwerdepersistenz.', 'Patient über Therapie aufgeklärt.'
      ],
      vorlagen: [
        { id: uid(), titel: 'Rezept', text: 'Rezept\n\nPatient: {{name}}, geboren am {{geb}}\nVersicherung: {{versicherung}}\n\nVerordnung:\n{{medikation}}\n\nDatum: {{datum}}\n\n{{arzt}}' },
        { id: uid(), titel: 'Arbeitsunfähigkeitsbescheinigung', text: 'Arbeitsunfähigkeitsbescheinigung\n\nHiermit wird bescheinigt, dass {{name}}, geboren am {{geb}}, seit dem {{datum}} voraussichtlich bis zum ____________ arbeitsunfähig ist.\n\nDiagnose: {{diagnosen}}\n\n{{praxis}}\n{{arzt}}' },
        { id: uid(), titel: 'Überweisung', text: 'Überweisung\n\nSehr geehrte Kollegin, sehr geehrter Kollege,\n\nich überweise {{name}}, geboren am {{geb}}, zur weiteren Diagnostik und Mitbehandlung.\n\nDiagnosen:\n{{diagnosen}}\n\nAktuelle Medikation:\n{{medikation}}\n\nMit freundlichen kollegialen Grüßen\n{{arzt}}\n{{praxis}}, {{datum}}' },
        { id: uid(), titel: 'Ärztliches Attest', text: 'Ärztliches Attest\n\nHiermit bescheinige ich, dass {{name}}, geboren am {{geb}}, am {{datum}} in meiner Praxis untersucht wurde.\n\nBemerkung: ____________________________\n\n{{arzt}}\n{{praxis}}' },
        { id: uid(), titel: 'Befundbrief', text: 'Befundbrief\n\nPatient: {{name}} (*{{geb}})\n\nDiagnosen:\n{{diagnosen}}\n\nMedikation:\n{{medikation}}\n\nBeurteilung / Procedere:\n____________________________\n\n{{arzt}}, {{datum}}' }
      ]
    };
  }

  const getPatient = (id) => state.patienten.find((x) => x.id === id);
  const fullName = (p) => (p ? `${p.nachname}, ${p.vorname}` : 'Unbekannt');
  const persist = () => window.docsAPI.saveData(state);
  const commit = () => { persist(); render(); };

  // ---------------------------------------------------------------
  // Modal-Helfer
  // ---------------------------------------------------------------
  let closeCurrentModal = null;
  function openModal(title, build, opts = {}) {
    closeModal();
    const root = document.getElementById('modal-root');
    const modal = h('div', { class: 'modal ' + (opts.wide ? 'wide' : '') });
    const backdrop = h('div', { class: 'backdrop', onmousedown: (e) => { if (e.target === backdrop) closeModal(); } }, modal);
    modal.appendChild(h('h2', { text: title }));
    build(modal, closeModal);
    root.appendChild(backdrop);
    closeCurrentModal = () => { backdrop.remove(); closeCurrentModal = null; };
    return modal;
  }
  function closeModal() { if (closeCurrentModal) closeCurrentModal(); }

  function fieldEl(def) {
    let input;
    if (def.type === 'select') {
      input = h('select', { name: def.key }, def.options.map((o) => h('option', { value: o.value, text: o.label, selected: o.value === def.value })));
    } else if (def.type === 'textarea') {
      input = h('textarea', { name: def.key, placeholder: def.placeholder || '', value: def.value || '' });
    } else {
      input = h('input', { name: def.key, type: def.type || 'text', placeholder: def.placeholder || '', value: def.value || '' });
    }
    return h('div', { class: 'field' }, h('label', { text: def.label }), input);
  }

  function formModal(title, defs, onSubmit, submitLabel = 'Speichern') {
    openModal(title, (modal) => {
      const form = h('form', {});
      const rows = [];
      let rowKids = [];
      defs.forEach((d) => {
        const el = fieldEl(d);
        if (d.half) { rowKids.push(el); if (rowKids.length === 2) { rows.push(h('div', { class: 'row' }, rowKids)); rowKids = []; } }
        else { if (rowKids.length) { rows.push(h('div', { class: 'row' }, rowKids)); rowKids = []; } rows.push(el); }
      });
      if (rowKids.length) rows.push(h('div', { class: 'row' }, rowKids));
      rows.forEach((r) => form.appendChild(r));
      form.appendChild(h('div', { class: 'modal-actions' },
        btn('Abbrechen', { onclick: closeModal }),
        h('button', { class: 'btn primary', type: 'submit' }, icon('save'), submitLabel)));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const values = {};
        defs.forEach((d) => { values[d.key] = form.elements[d.key].value.trim(); });
        if (onSubmit(values) !== false) closeModal();
      });
      modal.appendChild(form);
      const first = form.querySelector('input, textarea, select');
      if (first) setTimeout(() => first.focus(), 30);
    });
  }

  function confirmModal(text, onYes) {
    openModal('Bitte bestätigen', (modal) => {
      modal.appendChild(h('p', { text }));
      modal.appendChild(h('div', { class: 'modal-actions' },
        btn('Abbrechen', { onclick: closeModal }),
        btn('Ja, löschen', { kind: 'danger', icon: 'trash', onclick: () => { closeModal(); onYes(); } })));
    });
  }

  // ---------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------
  const NAV = [
    ['Praxis', [['start', 'Start', 'home'], ['patienten', 'Patienten', 'users'], ['karte', 'Karte & E-Rezept', 'card'], ['termine', 'Terminkalender', 'calendar'], ['wartezimmer', 'Wartezimmer', 'clock']]],
    ['Medizin', [['labor', 'Laborergebnisse', 'flask'], ['erezept', 'E-Rezept', 'pill'], ['katalog', 'Medikamentenkatalog', 'book'], ['rezepte', 'Rezepte', 'pill'], ['krankmeldung', 'Krankmeldung', 'thermo'], ['ueberweisungen', 'Überweisungen', 'swap'], ['vorsorge', 'Vorsorge & Recall', 'bell'], ['impfungen', 'Impfungen', 'shield'], ['leistungen', 'Leistungen', 'euro']]],
    ['Organisation', [['aufgaben', 'Aufgaben', 'check'], ['dokumente', 'Dokumente', 'file'], ['auswertung', 'Auswertung', 'chart']]],
    ['System', [['medien', 'Demo & Medien', 'play'], ['hilfe', 'Hilfe & Tipps', 'help'], ['einstellungen', 'Einstellungen', 'settings']]]
  ];
  if (window.docsWeb) NAV[3][1] = NAV[3][1].filter((i) => i[0] !== 'medien');
  const NAV_FLAT = NAV.flatMap(([, items]) => items);

  function goto(page, extra) {
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
    view.page = page;
    Object.assign(view, extra || {});
    render();
    document.getElementById('content').scrollTop = 0;
  }

  function renderNav() {
    const nav = document.getElementById('nav');
    nav.textContent = '';
    const counts = {
      wartezimmer: state.wartezimmer.length,
      aufgaben: state.aufgaben.filter((a) => !a.done).length,
      termine: state.termine.filter((t) => t.datum === todayISO() && t.status !== 'fertig').length,
      vorsorge: allVorsorge().filter((e) => e.faellig <= addDays(todayISO(), 30)).length,
      impfungen: allImpfungen().filter((e) => e.naechste && e.naechste <= addDays(todayISO(), 30)).length
    };
    let n = 0;
    NAV.forEach(([group, items]) => {
      nav.appendChild(h('div', { class: 'nav-group', text: group }));
      items.forEach(([key, label, ic]) => {
        n++;
        nav.appendChild(h('button', { class: 'nav-item' + (view.page === key ? ' active' : ''), type: 'button', title: `Strg ${n <= 9 ? n : 0}`, onclick: () => goto(key) },
          icon(ic), h('span', { text: label }),
          counts[key] ? h('span', { class: 'badge', text: String(counts[key]) }) : null));
      });
    });
    const foot = document.getElementById('sidebar-foot');
    foot.textContent = '';
    foot.appendChild(h('div', { text: state.einstellungen.arzt }));
    foot.appendChild(h('div', { text: state.einstellungen.praxis }));
  }

  function render() {
    renderNav();
    const content = document.getElementById('content');
    content.textContent = '';
    const views = { start: renderStart, patienten: renderPatienten, termine: renderTermine, wartezimmer: renderWartezimmer, karte: renderKarte, labor: renderLabor, erezept: renderErezept, katalog: renderKatalog, rezepte: renderRezepte, krankmeldung: renderKrankmeldungen, ueberweisungen: renderUeberweisungen, vorsorge: renderVorsorge, impfungen: renderImpfungen, leistungen: renderLeistungen, aufgaben: renderAufgaben, dokumente: renderDokumente, auswertung: renderAuswertung, medien: renderMedien, hilfe: renderHilfe, einstellungen: renderEinstellungen };
    content.appendChild((views[view.page] || renderStart)());
  }

  // ---------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------
  function countUp(el, target) {
    const start = performance.now();
    const dur = 800;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1 && el.isConnected) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function ekgSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 400 60');
    svg.setAttribute('class', 'ekg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0 34 H60 q8 -14 16 0 H100 l6 8 l10 -40 l10 56 l8 -24 H190 q10 -16 20 0 H250 l6 8 l10 -40 l10 56 l8 -24 H330 q8 -14 16 0 H400');
    path.setAttribute('pathLength', '520');
    svg.appendChild(path);
    return svg;
  }

  function appointmentRow(t, withDate) {
    const p = getPatient(t.patientId);
    return h('div', { class: 'item clickable', onclick: () => p && goto('patienten', { patientId: p.id, patientTab: 'uebersicht' }) },
      p ? h('img', { class: 'avatar', src: avatarSrc(p), alt: '' }) : null,
      h('div', { class: 'grow' },
        h('div', { class: 'title', text: fullName(p) }),
        h('div', { class: 'soft small', text: t.grund || 'Termin' })),
      h('span', { class: 'pill info', text: (withDate ? fmtDate(t.datum) + ' · ' : '') + t.zeit + ' Uhr' }));
  }

  function renderStart() {
    const hour = new Date().getHours();
    const greet = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
    const today = todayISO();
    const todays = state.termine.filter((t) => t.datum === today).sort((a, b) => a.zeit.localeCompare(b.zeit));
    const upcoming = state.termine.filter((t) => t.datum > today).sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit)).slice(0, 4);
    const openTasks = state.aufgaben.filter((a) => !a.done);

    const stats = [
      ['Termine heute', todays.length, 'calendar', 'termine'],
      ['Im Wartezimmer', state.wartezimmer.length, 'clock', 'wartezimmer'],
      ['Offene Aufgaben', openTasks.length, 'check', 'aufgaben'],
      ['Patienten', state.patienten.length, 'users', 'patienten']
    ];

    const v = h('div', { class: 'view' });
    v.appendChild(h('section', { class: 'card hero' },
      h('div', { class: 'hero-text' },
        h('span', { class: 'pill info', text: fmtDateLong(today) }),
        h('h1', { text: `${greet}, ${state.einstellungen.arzt}` }),
        h('p', { class: 'soft', text: todays.length ? `Heute stehen ${todays.length} Termine an – ${state.wartezimmer.length} Patient(en) warten bereits.` : 'Heute sind keine Termine eingetragen. Ein ruhiger Tag!' }),
        ekgSvg(),
        h('div', { class: 'row' },
          btn('Neuer Patient', { kind: 'primary', icon: 'plus', onclick: () => editPatient(null) }),
          btn('Neuer Termin', { icon: 'calendar', onclick: () => editTermin(null, today) }))),
      h('div', { class: 'hero-img' }, h('img', { src: 'img/hero.svg', alt: 'Illustration: Ärztin im Sprechzimmer' }))));

    const statGrid = h('div', { class: 'grid cols-4', style: 'margin-top:18px' });
    stats.forEach(([label, num, ic, page]) => {
      const numEl = h('div', { class: 'stat-num', text: '0' });
      statGrid.appendChild(h('button', { class: 'card stat', type: 'button', style: 'text-align:left;color:inherit;margin:0', onclick: () => goto(page) },
        h('div', { class: 'stat-icon' }, icon(ic)),
        h('div', {}, numEl, h('div', { class: 'soft small', text: label }))));
      setTimeout(() => countUp(numEl, num), 60);
    });
    v.appendChild(statGrid);

    const left = h('div', { class: 'card' },
      h('div', { class: 'card-title' }, h('h2', { text: 'Heute' }), btn('Kalender', { kind: 'small', onclick: () => goto('termine') })),
      todays.length ? h('div', { class: 'list' }, todays.map((t) => appointmentRow(t))) : h('div', { class: 'empty', text: 'Keine Termine heute.' }),
      upcoming.length ? h('h3', { style: 'margin:20px 0 10px', text: 'Demnächst' }) : null,
      upcoming.length ? h('div', { class: 'list' }, upcoming.map((t) => appointmentRow(t, true))) : null);

    const quick = [
      ['Karte einlesen', 'card', () => goto('karte')],
      ['Rezept ausstellen', 'pill', () => { goto('rezepte'); newRezept(); }],
      ['Krankmeldung', 'thermo', () => { goto('krankmeldung'); newAU(); }],
      ['Überweisung', 'swap', () => { goto('ueberweisungen'); newUeberweisung(); }],
      ['Patient suchen', 'search', openSearch],
      ['Aufgabe notieren', 'check', () => addAufgabe()]
    ];
    const right = h('div', {},
      h('div', { class: 'card' },
        h('div', { class: 'card-title' }, h('h2', { text: 'Schnellzugriff' })),
        h('div', { class: 'grid cols-2' }, quick.map(([label, ic, fn]) =>
          h('button', { class: 'btn quick', type: 'button', onclick: fn }, h('span', { class: 'icon' }, icon(ic)), label)))),
      h('div', { class: 'card' },
        h('div', { class: 'card-title' }, h('h2', { text: 'Offene Aufgaben' }), btn('Alle', { kind: 'small', onclick: () => goto('aufgaben') })),
        openTasks.length ? h('div', { class: 'list' }, openTasks.slice(0, 4).map((a) => h('div', { class: 'item' }, h('div', { class: 'grow title', text: a.text })))) : h('div', { class: 'empty', text: 'Alles erledigt 🎉' })));
    v.appendChild(h('div', { class: 'grid cols-2', style: 'margin-top:18px' }, left, right));
    if (state.demo) v.appendChild(h('p', { class: 'soft small', style: 'margin-top:18px', text: 'Hinweis: Alle Patienten, Termine und Befunde sind frei erfundene Beispieldaten. Unter „Einstellungen“ lassen sie sich entfernen.' }));
    return v;
  }

  // ---------------------------------------------------------------
  // Patienten
  // ---------------------------------------------------------------
  function editPatient(p) {
    const isNew = !p;
    const src = p || { vorname: '', nachname: '', geb: '', geschlecht: 'w', versicherung: 'gesetzlich', kasse: '', telefon: '', allergien: '', avatar: AVATARS[state.patienten.length % AVATARS.length] };
    formModal(isNew ? 'Neuer Patient' : 'Patient bearbeiten', [
      { key: 'vorname', label: 'Vorname', value: src.vorname, half: true },
      { key: 'nachname', label: 'Nachname', value: src.nachname, half: true },
      { key: 'geb', label: 'Geburtsdatum', type: 'date', value: src.geb, half: true },
      { key: 'geschlecht', label: 'Geschlecht', type: 'select', value: src.geschlecht, half: true, options: [{ value: 'w', label: 'weiblich' }, { value: 'm', label: 'männlich' }, { value: 'd', label: 'divers' }] },
      { key: 'versicherung', label: 'Versicherung', type: 'select', value: src.versicherung, half: true, options: [{ value: 'gesetzlich', label: 'gesetzlich' }, { value: 'privat', label: 'privat' }] },
      { key: 'kasse', label: 'Krankenkasse', value: src.kasse, half: true },
      { key: 'kvnr', label: 'Versichertennummer', value: src.kvnr || '', half: true },
      { key: 'telefon', label: 'Telefon', type: 'tel', value: src.telefon, half: true },
      { key: 'avatar', label: 'Beispielbild', type: 'select', value: src.avatar, half: true, options: AVATARS.map((a, i) => ({ value: a, label: 'Bild ' + (i + 1) })) },
      { key: 'allergien', label: 'Allergien / Unverträglichkeiten', value: src.allergien }
    ], (v) => {
      if (!v.vorname || !v.nachname) { toast('Bitte Vor- und Nachname angeben.'); return false; }
      if (isNew) {
        const np = { id: uid(), ...v, diagnosen: [], medikation: [], karte: [], bilder: [], vorsorge: [], impfungen: [], leistungen: [], labor: [], rezepte: [], krankmeldungen: [], ueberweisungen: [] };
        state.patienten.push(np);
        view.patientId = np.id;
        view.patientTab = 'uebersicht';
      } else {
        Object.assign(p, v);
      }
      view.page = 'patienten';
      commit();
      toast(isNew ? 'Patient angelegt.' : 'Änderungen gespeichert.');
    });
  }

  function renderPatienten() {
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Patienten' }), h('p', { text: `${state.patienten.length} Patientenakten` })),
      btn('Neuer Patient', { kind: 'primary', icon: 'plus', onclick: () => editPatient(null) })));

    const q = view.patientSearch.toLowerCase();
    const filtered = state.patienten
      .filter((p) => !q || `${p.vorname} ${p.nachname} ${fmtDate(p.geb)}`.toLowerCase().includes(q))
      .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de'));

    const listCard = h('div', { class: 'card' });
    const searchInput = h('input', { type: 'text', placeholder: 'Name oder Geburtsdatum …', value: view.patientSearch });
    searchInput.addEventListener('input', () => {
      view.patientSearch = searchInput.value;
      const pos = searchInput.selectionStart;
      render();
      const again = document.querySelector('#content input[type=text]');
      if (again) { again.focus(); again.setSelectionRange(pos, pos); }
    });
    listCard.appendChild(h('div', { class: 'field' }, searchInput));
    listCard.appendChild(filtered.length
      ? h('div', { class: 'list' }, filtered.map((p) =>
        h('div', { class: 'item clickable' + (p.id === view.patientId ? ' selected' : ''), onclick: () => { view.patientId = p.id; view.patientTab = 'uebersicht'; render(); } },
          h('img', { class: 'avatar', src: avatarSrc(p), alt: '' }),
          h('div', { class: 'grow' }, h('div', { class: 'title', text: fullName(p) }), h('div', { class: 'soft small', text: `${fmtDate(p.geb)} · ${ageFrom(p.geb)} Jahre` })),
          p.allergien ? h('span', { class: 'pill danger', text: 'Allergie' }) : null)))
      : h('div', { class: 'empty', text: 'Keine Treffer.' }));

    const patient = getPatient(view.patientId);
    const detail = patient ? renderPatientDetail(patient) : h('div', { class: 'card empty', text: 'Wählen Sie links einen Patienten aus oder legen Sie einen neuen an.' });
    v.appendChild(h('div', { class: 'split' }, listCard, detail));
    return v;
  }

  function renderPatientDetail(p) {
    const wrap = h('div', {});
    wrap.appendChild(h('div', { class: 'card' },
      h('div', { class: 'patient-head' },
        h('img', { class: 'avatar big', src: avatarSrc(p), alt: '' }),
        h('div', { style: 'flex:1;min-width:200px' },
          h('h1', { text: `${p.vorname} ${p.nachname}` }),
          h('div', { class: 'soft', text: `geboren ${fmtDate(p.geb)} (${ageFrom(p.geb)} Jahre) · ${p.versicherung}${p.kasse ? ' · ' + p.kasse : ''}` }),
          p.allergien ? h('div', { style: 'margin-top:6px' }, h('span', { class: 'pill danger', text: 'Allergien: ' + p.allergien })) : null),
        h('div', { class: 'row' },
          btn('Termin', { icon: 'calendar', onclick: () => editTermin(null, todayISO(), p.id) }),
          btn('Ins Wartezimmer', { icon: 'clock', onclick: () => checkIn(p.id) }),
          btn('Bearbeiten', { icon: 'edit', onclick: () => editPatient(p) }))),
      h('div', { class: 'tabs' }, [['uebersicht', 'Übersicht'], ['karte', 'Karteikarte'], ['impfungen', 'Impfungen'], ['leistungen', 'Leistungen'], ['bilder', 'Bilder & Befunde'], ['dokumente', 'Dokumente']].map(([k, l]) =>
        h('button', { class: 'tab' + (view.patientTab === k ? ' active' : ''), type: 'button', onclick: () => { view.patientTab = k; render(); } }, l)))));

    const tabs = { uebersicht: tabUebersicht, karte: tabKarte, bilder: tabBilder, dokumente: tabDokumente,
      impfungen: (p) => h('div', { class: 'card' }, h('div', { class: 'card-title' }, h('h2', { text: 'Impfungen' }), btn('Hinzufügen', { kind: 'small', icon: 'plus', onclick: () => addImpfung(p.id) })),
        p.impfungen.length ? h('div', { class: 'list' }, p.impfungen.map((e) => impfRow({ ...e, p }, false))) : h('div', { class: 'empty', text: 'Keine Impfungen dokumentiert.' })),
      leistungen: (p) => h('div', { class: 'card' }, h('div', { class: 'card-title' }, h('h2', { text: 'Leistungen' }), btn('Erfassen', { kind: 'small', icon: 'plus', onclick: () => addLeistung(p.id) })),
        p.leistungen.length ? h('div', { class: 'list' }, p.leistungen.map((e) => h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { class: 'title', text: e.text }), h('div', { class: 'soft small', text: fmtDate(e.datum) })), h('strong', { text: euro(e.betrag) }),
          btn('', { kind: 'small', icon: 'trash', onclick: () => { p.leistungen = p.leistungen.filter((x) => x.id !== e.id); commit(); } })))) : h('div', { class: 'empty', text: 'Keine Leistungen erfasst.' })) };
    wrap.appendChild((tabs[view.patientTab] || tabUebersicht)(p));
    wrap.appendChild(h('div', { style: 'margin-top:18px' }, btn('Patientenakte löschen', { kind: 'danger small', icon: 'trash', onclick: () => confirmModal(`Akte von ${p.vorname} ${p.nachname} samt Terminen wirklich löschen?`, () => {
      state.patienten = state.patienten.filter((x) => x.id !== p.id);
      state.termine = state.termine.filter((t) => t.patientId !== p.id);
      state.wartezimmer = state.wartezimmer.filter((w) => w.patientId !== p.id);
      view.patientId = null;
      commit();
    }) })));
    return wrap;
  }

  function simpleListCard(title, items, textOf, onAdd, onRemove, ic, extra) {
    const card = h('div', { class: 'card' }, h('div', { class: 'card-title' }, h('h2', { text: title }), btn('Hinzufügen', { kind: 'small', icon: 'plus', onclick: onAdd })));
    card.appendChild(items.length
      ? h('div', { class: 'list' }, items.map((it) => h('div', { class: 'item' }, h('span', { class: 'icon', style: 'color:var(--accent)' }, icon(ic)), h('div', { class: 'grow', text: textOf(it) }), extra ? extra(it) : null, btn('', { kind: 'small', icon: 'trash', onclick: () => onRemove(it) }))))
      : h('div', { class: 'empty', text: 'Noch nichts eingetragen.' }));
    return card;
  }

  function addMedikation(p) {
    openModal('Medikament hinzufügen', (modal) => {
      const text = h('input', { type: 'text', placeholder: 'Medikament und Stärke (aus dem Katalog wählen oder eintippen)' });
      const dos = h('input', { type: 'text', placeholder: 'Dosierung, z. B. 1-0-0' });
      modal.appendChild(h('div', { class: 'row' }, h('div', { class: 'field', style: 'flex:2' }, h('label', { text: 'Medikament' }), text), h('div', { class: 'field' }, h('label', { text: 'Dosierung' }), dos)));
      modal.appendChild(medPanel({ onPick: (pk) => { text.value = pk.text; dos.focus(); } }));
      modal.appendChild(h('div', { class: 'modal-actions' }, btn('Abbrechen', { onclick: closeModal }), btn('Hinzufügen', { kind: 'primary', icon: 'plus', onclick: () => {
        if (!text.value.trim()) { toast('Bitte ein Medikament wählen oder eintippen.'); return; }
        p.medikation.push({ id: uid(), text: `${text.value.trim()}${dos.value.trim() ? ' ' + dos.value.trim() : ''}` });
        closeModal(); commit(); toast('Medikament hinzugefügt.');
      } })));
    }, { wide: true });
  }
  function tabUebersicht(p) {
    const v = h('div', {});
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:14px', text: 'Stammdaten' }),
      h('dl', { class: 'kv' },
        h('dt', { text: 'Telefon' }), h('dd', { text: p.telefon || '–' }),
        h('dt', { text: 'Versicherung' }), h('dd', { text: `${p.versicherung}${p.kasse ? ', ' + p.kasse : ''}` }),
        h('dt', { text: 'Versichertennr.' }), h('dd', { text: p.kvnr || '–' }),
        h('dt', { text: 'Letzter Eintrag' }), h('dd', { text: p.karte.length ? fmtStamp(Math.max(...p.karte.map((k) => k.ts))) : '–' }))));
    v.appendChild(simpleListCard('Diagnosen', p.diagnosen, (d) => `${d.icd ? d.icd + ' – ' : ''}${d.text}`,
      () => formModal('Diagnose hinzufügen', [{ key: 'icd', label: 'ICD-10-Code (optional)', placeholder: 'z. B. I10' }, { key: 'text', label: 'Diagnose' }], (f) => {
        if (!f.text) return false;
        p.diagnosen.push({ id: uid(), ...f }); commit();
      }),
      (d) => { p.diagnosen = p.diagnosen.filter((x) => x.id !== d.id); commit(); }, 'pulse'));
    v.appendChild(simpleListCard('Medikation', p.medikation, (m) => m.text,
      () => addMedikation(p),
      (m) => { p.medikation = p.medikation.filter((x) => x.id !== m.id); commit(); }, 'pill',
      (m) => btn('E-Rezept', { kind: 'small', icon: 'pill', onclick: () => { const r = issueErezept(p, m.text); persist(); render(); viewErezept({ ...r, p }); toast('E-Rezept ausgestellt – auf der Karte abrufbar.'); } })));
    return v;
  }

  function tabKarte(p) {
    const v = h('div', {});
    const typ = h('select', {}, KARTEI_TYPEN.map((t) => h('option', { value: t, text: t })));
    const text = h('textarea', { placeholder: 'Neuer Karteieintrag …' });
    const chips = h('div', { class: 'chips' }, state.bausteine.map((b) => h('button', { class: 'chip', type: 'button', onclick: () => { text.value = (text.value ? text.value + ' ' : '') + b; text.focus(); } }, b)));
    v.appendChild(h('div', { class: 'card' },
      h('h2', { style: 'margin-bottom:10px', text: 'Neuer Eintrag' }),
      h('div', { class: 'soft small', text: 'Textbausteine zum Einfügen:' }), chips,
      h('div', { class: 'row' }, h('div', { class: 'field', style: 'max-width:200px' }, typ)),
      h('div', { class: 'field' }, text),
      btn('Eintrag speichern', { kind: 'primary', icon: 'save', onclick: () => {
        if (!text.value.trim()) return;
        p.karte.push({ id: uid(), ts: Date.now(), typ: typ.value, text: text.value.trim() });
        commit(); toast('Eintrag gespeichert.');
      } })));
    const entries = [...p.karte].sort((a, b) => b.ts - a.ts);
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:14px', text: 'Verlauf' }),
      entries.length ? h('div', { class: 'timeline' }, entries.map((k) =>
        h('div', { class: 'tl-entry' },
          h('div', { class: 'meta' }, h('span', { class: 'pill info', text: k.typ }), h('span', { text: fmtStamp(k.ts) }), h('span', { style: 'flex:1' }),
            btn('', { kind: 'small', icon: 'trash', onclick: () => { p.karte = p.karte.filter((x) => x.id !== k.id); commit(); } })),
          h('div', { class: 'body', text: k.text }))))
        : h('div', { class: 'empty', text: 'Noch keine Einträge.' })));
    return v;
  }

  function tabBilder(p) {
    const card = h('div', { class: 'card' });
    const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    file.addEventListener('change', () => {
      const f = file.files[0];
      if (!f) return;
      if (f.size > 3 * 1024 * 1024) { toast('Bild ist größer als 3 MB.'); return; }
      const reader = new FileReader();
      reader.onload = () => { p.bilder.push({ id: uid(), src: reader.result, titel: f.name }); commit(); toast('Bild hinzugefügt.'); };
      reader.readAsDataURL(f);
    });
    card.appendChild(h('div', { class: 'card-title' }, h('h2', { text: 'Bilder & Befunde' }), btn('Bild hochladen', { kind: 'small', icon: 'image', onclick: () => file.click() }), file));
    card.appendChild(p.bilder.length
      ? h('div', { class: 'gallery' }, p.bilder.map((b) => h('figure', { class: 'figure', onclick: () => openModal(b.titel, (m) => {
        m.appendChild(h('div', { class: 'lightbox' }, h('img', { src: b.src, alt: b.titel })));
        m.appendChild(h('div', { class: 'modal-actions' }, btn('Entfernen', { kind: 'danger', icon: 'trash', onclick: () => { p.bilder = p.bilder.filter((x) => x.id !== b.id); closeModal(); commit(); } }), btn('Schließen', { onclick: closeModal })));
      }, { wide: true }) }, h('img', { src: b.src, alt: b.titel }), h('figcaption', { text: b.titel }))))
      : h('div', { class: 'empty', text: 'Noch keine Bilder. Röntgenbilder, Fotos oder Scans lassen sich hier hochladen.' }));
    return card;
  }

  function tabDokumente(p) {
    return h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:14px', text: 'Dokument erstellen' }),
      h('div', { class: 'list' }, state.vorlagen.map((t) => h('div', { class: 'item clickable', onclick: () => openDocument(t, p) },
        h('span', { style: 'color:var(--accent)' }, icon('file')), h('div', { class: 'grow title', text: t.titel }), btn('Erstellen', { kind: 'small primary' })))));
  }

  // ---------------------------------------------------------------
  // Termine
  // ---------------------------------------------------------------
  function patientOptions() {
    return [...state.patienten].sort((a, b) => a.nachname.localeCompare(b.nachname, 'de')).map((p) => ({ value: p.id, label: fullName(p) }));
  }

  function editTermin(t, datum, patientId) {
    if (!state.patienten.length) { toast('Bitte zuerst einen Patienten anlegen.'); return; }
    const src = t || { patientId: patientId || state.patienten[0].id, datum: datum || view.day, zeit: '09:00', dauer: 15, grund: '' };
    formModal(t ? 'Termin bearbeiten' : 'Neuer Termin', [
      { key: 'patientId', label: 'Patient', type: 'select', value: src.patientId, options: patientOptions() },
      { key: 'datum', label: 'Datum', type: 'date', value: src.datum, half: true },
      { key: 'zeit', label: 'Uhrzeit', type: 'time', value: src.zeit, half: true },
      { key: 'dauer', label: 'Dauer', type: 'select', value: String(src.dauer), options: [10, 15, 20, 30, 45, 60].map((n) => ({ value: String(n), label: n + ' Minuten' })) },
      { key: 'grund', label: 'Grund', value: src.grund, placeholder: 'z. B. Blutdruckkontrolle' }
    ], (f) => {
      if (!f.datum || !f.zeit) { toast('Bitte Datum und Uhrzeit angeben.'); return false; }
      const data = { patientId: f.patientId, datum: f.datum, zeit: f.zeit, dauer: Number(f.dauer), grund: f.grund };
      if (t) Object.assign(t, data); else state.termine.push({ id: uid(), status: 'geplant', ...data });
      view.day = f.datum;
      view.page = 'termine';
      commit();
      toast('Termin gespeichert.');
    });
  }

  function checkIn(patientId, terminId) {
    if (state.wartezimmer.some((w) => w.patientId === patientId)) { toast('Patient ist bereits im Wartezimmer.'); return; }
    state.wartezimmer.push({ id: uid(), patientId, terminId: terminId || null, seit: Date.now(), status: 'wartet' });
    if (terminId) { const t = state.termine.find((x) => x.id === terminId); if (t) t.status = 'angekommen'; }
    commit();
    toast('Patient im Wartezimmer eingetragen.');
  }

  function renderTermine() {
    const v = h('div', { class: 'view' });
    const monday = mondayOf(view.day);
    const d = new Date(view.day + 'T12:00:00');
    v.appendChild(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Terminkalender' }), h('p', { text: `${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${fmtDateLong(view.day)}` })),
      h('div', { class: 'row' },
        btn('', { icon: 'left', onclick: () => { view.day = addDays(view.day, -7); render(); } }),
        btn('Heute', { onclick: () => { view.day = todayISO(); render(); } }),
        btn('', { icon: 'right', onclick: () => { view.day = addDays(view.day, 7); render(); } }),
        btn('Neuer Termin', { kind: 'primary', icon: 'plus', onclick: () => editTermin(null, view.day) }))));

    const strip = h('div', { class: 'daystrip' });
    for (let i = 0; i < 7; i++) {
      const iso = addDays(monday, i);
      const n = state.termine.filter((t) => t.datum === iso).length;
      const dd = new Date(iso + 'T12:00:00');
      strip.appendChild(h('button', { class: 'day' + (iso === view.day ? ' active' : '') + (iso === todayISO() ? ' today' : ''), type: 'button', onclick: () => { view.day = iso; render(); } },
        h('div', { class: 'wd', text: WEEKDAYS[dd.getDay()] }), h('div', { class: 'dn', text: String(dd.getDate()) }), h('div', { class: 'cnt', text: n ? `${n} Termin${n > 1 ? 'e' : ''}` : '' })));
    }
    v.appendChild(strip);

    const appts = state.termine.filter((t) => t.datum === view.day).sort((a, b) => a.zeit.localeCompare(b.zeit));
    const slots = [];
    for (let m = 8 * 60; m < 18 * 60; m += 30) slots.push(m);
    const slotOf = (zeit) => {
      const [hh, mm] = zeit.split(':').map(Number);
      const mins = Math.min(Math.max(hh * 60 + mm, 8 * 60), 17 * 60 + 30);
      return Math.floor(mins / 30) * 30;
    };
    const card = h('div', { class: 'card' });
    slots.forEach((m) => {
      const label = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      const body = h('div', { class: 'slot-body' });
      appts.filter((t) => slotOf(t.zeit) === m).forEach((t) => {
        const p = getPatient(t.patientId);
        const stat = t.status === 'fertig' ? ['ok', 'Fertig'] : t.status === 'angekommen' ? ['warn', 'Im Wartezimmer'] : ['info', 'Geplant'];
        body.appendChild(h('div', { class: 'appt ' + t.status, style: 'margin-bottom:6px' },
          p ? h('img', { class: 'avatar', src: avatarSrc(p), alt: '' }) : null,
          h('div', { class: 'grow' }, h('div', { class: 'title', style: 'font-weight:600', text: `${t.zeit} · ${fullName(p)}` }), h('div', { class: 'soft small', text: `${t.grund || 'Termin'} · ${t.dauer} Min.` })),
          h('span', { class: 'pill ' + stat[0], text: stat[1] }),
          t.status === 'geplant' ? btn('Eingetroffen', { kind: 'small', icon: 'clock', onclick: () => checkIn(t.patientId, t.id) }) : null,
          btn('', { kind: 'small', icon: 'edit', onclick: () => editTermin(t) }),
          btn('', { kind: 'small', icon: 'trash', onclick: () => confirmModal('Termin wirklich löschen?', () => { state.termine = state.termine.filter((x) => x.id !== t.id); commit(); }) })));
      });
      card.appendChild(h('div', { class: 'slot' }, h('div', { class: 'time', text: label }), body));
    });
    v.appendChild(card);
    return v;
  }

  // ---------------------------------------------------------------
  // Wartezimmer
  // ---------------------------------------------------------------
  function renderWartezimmer() {
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Wartezimmer' }), h('p', { text: 'Wer ist da, wer wartet am längsten – auf einen Blick.' })),
      btn('Patient eintragen', { kind: 'primary', icon: 'plus', onclick: () => {
        if (!state.patienten.length) return;
        formModal('Patient ins Wartezimmer', [{ key: 'patientId', label: 'Patient', type: 'select', options: patientOptions() }], (f) => { checkIn(f.patientId); }, 'Eintragen');
      } })));
    if (!state.wartezimmer.length) {
      v.appendChild(h('div', { class: 'card empty', text: 'Das Wartezimmer ist leer. Bei einem Termin auf „Eingetroffen“ klicken, um Patienten hier zu sehen.' }));
      return v;
    }
    const grid = h('div', { class: 'grid cols-2' });
    [...state.wartezimmer].sort((a, b) => a.seit - b.seit).forEach((w) => {
      const p = getPatient(w.patientId);
      const min = Math.max(0, Math.floor((Date.now() - w.seit) / 60000));
      const treating = w.status === 'behandlung';
      grid.appendChild(h('div', { class: 'card wait-card ' + (treating ? 'treating' : 'waiting'), style: 'margin:0' },
        p ? h('img', { class: 'avatar big', src: avatarSrc(p), alt: '' }) : null,
        h('div', { style: 'flex:1;min-width:0' },
          h('h2', { text: fullName(p) }),
          h('div', { class: 'soft', text: treating ? 'In Behandlung' : 'Wartet seit ' + fmtStamp(w.seit).slice(-5) + ' Uhr' }),
          h('div', { class: 'row', style: 'margin-top:12px' },
            treating ? null : btn('Aufrufen', { kind: 'primary small', icon: 'bell', onclick: () => { w.status = 'behandlung'; w.seit = Date.now(); commit(); toast(`${fullName(p)} aufgerufen.`); } }),
            btn('Akte', { kind: 'small', icon: 'file', onclick: () => goto('patienten', { patientId: w.patientId, patientTab: 'karte' }) }),
            btn(treating ? 'Fertig' : 'Entfernen', { kind: 'small', icon: 'check', onclick: () => {
              if (w.terminId) { const t = state.termine.find((x) => x.id === w.terminId); if (t) t.status = 'fertig'; }
              state.wartezimmer = state.wartezimmer.filter((x) => x.id !== w.id); commit();
            } }))),
        h('div', { style: 'text-align:center' }, h('div', { class: 'wait-min', text: String(min) }), h('div', { class: 'soft small', text: 'Min.' }))));
    });
    v.appendChild(grid);
    return v;
  }

  // ---------------------------------------------------------------
  // Aufgaben
  // ---------------------------------------------------------------
  function addAufgabe() {
    formModal('Neue Aufgabe', [{ key: 'text', label: 'Aufgabe' }], (f) => {
      if (!f.text) return false;
      state.aufgaben.unshift({ id: uid(), text: f.text, done: false });
      commit(); toast('Aufgabe notiert.');
    });
  }

  function renderAufgaben() {
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Aufgaben' }), h('p', { text: `${state.aufgaben.filter((a) => !a.done).length} offen` })),
      btn('Neue Aufgabe', { kind: 'primary', icon: 'plus', onclick: addAufgabe })));
    const card = h('div', { class: 'card' });
    card.appendChild(state.aufgaben.length
      ? h('div', { class: 'list' }, [...state.aufgaben].sort((a, b) => a.done - b.done).map((a) =>
        h('div', { class: 'item' + (a.done ? ' done' : '') },
          h('input', { type: 'checkbox', checked: a.done, onchange: () => { a.done = !a.done; commit(); } }),
          h('div', { class: 'grow title', text: a.text }),
          btn('', { kind: 'small', icon: 'trash', onclick: () => { state.aufgaben = state.aufgaben.filter((x) => x.id !== a.id); commit(); } }))))
      : h('div', { class: 'empty', text: 'Keine Aufgaben.' }));
    v.appendChild(card);
    return v;
  }

  // ---------------------------------------------------------------
  // Dokumente / Vorlagen
  // ---------------------------------------------------------------
  function fillTemplate(text, p) {
    const map = {
      name: `${p.vorname} ${p.nachname}`,
      geb: fmtDate(p.geb),
      versicherung: p.kasse ? `${p.versicherung}, ${p.kasse}` : p.versicherung,
      datum: fmtDate(todayISO()),
      praxis: state.einstellungen.praxis,
      arzt: state.einstellungen.arzt,
      diagnosen: p.diagnosen.length ? p.diagnosen.map((d) => `• ${d.icd ? d.icd + ' ' : ''}${d.text}`).join('\n') : '–',
      medikation: p.medikation.length ? p.medikation.map((m) => `• ${m.text}`).join('\n') : '–'
    };
    return text.replace(/\{\{(\w+)\}\}/g, (all, k) => (k in map ? map[k] : all));
  }

  function openDocument(t, p) {
    openModal(`${t.titel} – ${p.vorname} ${p.nachname}`, (modal) => {
      const lines = fillTemplate(t.text, p).split('\n');
      const title = lines.shift();
      const doc = h('div', { class: 'doc-preview' },
        h('div', { class: 'letterhead' }, h('img', { src: 'img/logo.svg', alt: '' }), h('div', {}, h('strong', { text: state.einstellungen.praxis }), h('div', { text: state.einstellungen.arzt }))),
        h('strong', { style: 'font-size:20px', text: title }), '\n' + lines.join('\n'));
      modal.appendChild(doc);
      modal.appendChild(h('div', { class: 'modal-actions' }, btn('Schließen', { onclick: closeModal }), btn('Drucken', { kind: 'primary', icon: 'print', onclick: () => window.print() })));
    }, { wide: true });
  }

  function renderDokumente() {
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Dokumente' }), h('p', { text: 'Rezepte, Bescheinigungen und Briefe – Daten werden automatisch eingesetzt.' })),
      btn('Neue Vorlage', { kind: 'primary', icon: 'plus', onclick: () => editVorlage(null) })));
    const patSel = h('select', {}, patientOptions().map((o) => h('option', { value: o.value, text: o.label, selected: o.value === view.docPatient })));
    patSel.addEventListener('change', () => { view.docPatient = patSel.value; });
    view.docPatient = view.docPatient && getPatient(view.docPatient) ? view.docPatient : (state.patienten[0] || {}).id;
    patSel.value = view.docPatient || '';
    v.appendChild(h('div', { class: 'card' }, h('div', { class: 'field' }, h('label', { text: 'Für Patient' }), patSel),
      h('div', { class: 'soft small', text: 'Platzhalter: {{name}} {{geb}} {{versicherung}} {{datum}} {{praxis}} {{arzt}} {{diagnosen}} {{medikation}}' })));
    const grid = h('div', { class: 'grid cols-2', style: 'margin-top:18px' });
    state.vorlagen.forEach((t) => grid.appendChild(h('div', { class: 'card', style: 'margin:0' },
      h('div', { class: 'card-title' }, h('h2', { text: t.titel })),
      h('p', { class: 'soft small', style: 'white-space:pre-wrap;max-height:96px;overflow:hidden', text: t.text.slice(0, 160) + '…' }),
      h('div', { class: 'row' },
        btn('Erstellen', { kind: 'primary small', icon: 'file', onclick: () => { const p = getPatient(patSel.value); if (p) openDocument(t, p); else toast('Bitte Patient wählen.'); } }),
        btn('Bearbeiten', { kind: 'small', icon: 'edit', onclick: () => editVorlage(t) }),
        btn('', { kind: 'small', icon: 'trash', onclick: () => confirmModal(`Vorlage „${t.titel}“ löschen?`, () => { state.vorlagen = state.vorlagen.filter((x) => x.id !== t.id); commit(); }) })))));
    v.appendChild(grid);
    return v;
  }

  function editVorlage(t) {
    formModal(t ? 'Vorlage bearbeiten' : 'Neue Vorlage', [
      { key: 'titel', label: 'Titel', value: t ? t.titel : '' },
      { key: 'text', label: 'Text (erste Zeile = Überschrift)', type: 'textarea', value: t ? t.text : 'Überschrift\n\nPatient: {{name}}\n\n{{arzt}}' }
    ], (f) => {
      if (!f.titel || !f.text) return false;
      if (t) Object.assign(t, f); else state.vorlagen.push({ id: uid(), ...f });
      commit();
    });
  }

  // ---------------------------------------------------------------
  // Einstellungen
  // ---------------------------------------------------------------
  function renderEinstellungen() {
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', { text: 'Einstellungen' }), h('p', { text: 'Praxisdaten, Datensicherung und Beispieldaten.' }))));
    const praxis = h('input', { type: 'text', value: state.einstellungen.praxis });
    const arzt = h('input', { type: 'text', value: state.einstellungen.arzt });
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:14px', text: 'Praxis' }),
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'Praxisname' }), praxis), h('div', { class: 'field' }, h('label', { text: 'Ärztin / Arzt' }), arzt)),
      btn('Speichern', { kind: 'primary', icon: 'save', onclick: () => { state.einstellungen.praxis = praxis.value.trim() || DEFAULT_PRAXIS; state.einstellungen.arzt = arzt.value.trim() || 'Praxisinhaber/in'; commit(); toast('Gespeichert.'); } })));
    const katFile = h('input', { type: 'file', accept: '.csv,.json,text/csv,application/json', style: 'display:none' });
    katFile.addEventListener('change', () => {
      const f = katFile.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const list = parseImport(String(r.result), f.name);
          if (!list.length) { toast('Keine Einträge gefunden.'); return; }
          const extra = state.katalogExtra || [];
          list.forEach((e) => { const i = extra.findIndex((x) => norm(x.name) === norm(e.name)); if (i >= 0) extra[i] = e; else extra.push(e); });
          state.katalogExtra = extra; commit(); toast(`${list.length} Einträge importiert.`);
        } catch (err) { toast('Import nicht möglich: ' + err.message); }
      };
      r.readAsText(f, 'utf-8');
    });
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:6px', text: 'Medikamentenkatalog' }),
      h('p', { class: 'soft', text: `Eingebaut: ${CATALOG.length} Wirkstoffe (Stand ${CATALOG_STAND}, Beispielkatalog). Für die vollständige, aktuelle Auswahl lässt sich der Export einer lizenzierten Arzneimitteldatenbank importieren.` }),
      h('p', { class: 'soft small', text: 'Format: CSV (Semikolon) mit Kopfzeile Name; Staerke; Form; ATC; Gruppe; Alias – oder JSON-Liste mit denselben Feldern. Importierte Einträge ergänzen oder ersetzen gleichnamige Wirkstoffe.' }),
      h('div', { class: 'row' }, btn('Katalog importieren', { icon: 'file', onclick: () => katFile.click() }), katFile,
        btn(`Importierte entfernen (${(state.katalogExtra || []).length})`, { kind: 'danger', icon: 'trash', onclick: () => { state.katalogExtra = []; commit(); toast('Importierte Einträge entfernt.'); } }))));
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:6px', text: 'Datensicherung' }),
      h('p', { class: 'soft', text: 'Alle Daten liegen ausschließlich lokal auf diesem Computer. Eine Sicherung als Datei schützt vor Datenverlust.' }),
      h('div', { class: 'row' },
        btn('Sicherung exportieren', { icon: 'save', onclick: async () => { if (await window.docsAPI.exportBackup(state)) toast('Sicherung gespeichert.'); } }),
        btn('Sicherung laden', { icon: 'file', onclick: async () => {
          const data = await window.docsAPI.importBackup();
          if (data && Array.isArray(data.patienten)) { state = normalize(data); commit(); toast('Sicherung geladen.'); } else if (data !== null) toast('Datei ist keine gültige Sicherung.');
        } }))));
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:6px', text: 'Beispieldaten' }),
      h('p', { class: 'soft', text: 'Entfernt alle Patienten, Termine und Aufgaben und startet mit einer leeren Praxis (Vorlagen und Textbausteine bleiben).' }),
      btn('Alle Daten löschen', { kind: 'danger', icon: 'trash', onclick: () => confirmModal('Wirklich ALLE Patienten, Termine und Aufgaben löschen?', () => {
        Object.assign(state, { demo: false, patienten: [], termine: [], wartezimmer: [], aufgaben: [] });
        view.patientId = null; commit();
      }) }),
      ' ', btn('Beispieldaten neu laden', { icon: 'users', onclick: () => confirmModal('Aktuelle Daten durch Beispieldaten ersetzen?', () => { state = demoData(); view.patientId = null; commit(); }) })));
    return v;
  }


  // ---------------------------------------------------------------
  // Vorsorge, Impfungen, Leistungen
  // ---------------------------------------------------------------
  const VORSORGE_ARTEN = ['Gesundheits-Check-up', 'Hautkrebs-Screening', 'Darmkrebs-Vorsorge', 'Diabetes-Fußuntersuchung', 'Lungenfunktionskontrolle', 'Jugendgesundheitsuntersuchung', 'Augenärztliche Kontrolle', 'Sonstiges'];
  const IMPFSTOFFE = ['Influenza', 'COVID-19', 'Tetanus/Diphtherie/Keuchhusten (Tdap)', 'Pneumokokken', 'Gürtelrose', 'FSME', 'Hepatitis B', 'Masern', 'HPV'];
  const LEISTUNGEN = [['Beratung', 18.5], ['Ruhe-EKG', 21.5], ['Lungenfunktion (Spirometrie)', 24], ['Blutdruck-Langzeitmessung', 32], ['Diabetes-Check', 41], ['Hausbesuch', 55], ['Impfung', 12]];
  const euro = (n) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  const allVorsorge = () => state.patienten.flatMap((p) => p.vorsorge.map((e) => ({ ...e, p })));
  const allImpfungen = () => state.patienten.flatMap((p) => p.impfungen.map((e) => ({ ...e, p })));
  const allLeistungen = () => state.patienten.flatMap((p) => p.leistungen.map((e) => ({ ...e, p })));
  const opt = (arr) => arr.map((x) => ({ value: x, label: x }));

  function dueLabel(iso) {
    const days = Math.round((new Date(iso + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / 86400000);
    if (days < 0) return ['danger', `${-days} Tage überfällig`];
    if (days === 0) return ['warn', 'heute fällig'];
    if (days <= 30) return ['warn', `in ${days} Tagen`];
    return ['ok', fmtDate(iso)];
  }

  function noPatients() { toast('Bitte zuerst einen Patienten anlegen.'); }

  function renderVorsorge() {
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Vorsorge & Recall' }), h('p', { text: 'Wer ist fällig? Nie wieder eine Vorsorge vergessen.' })),
      btn('Vorsorge eintragen', { kind: 'primary', icon: 'plus', onclick: () => {
        if (!state.patienten.length) return noPatients();
        formModal('Vorsorge eintragen', [
          { key: 'patientId', label: 'Patient', type: 'select', options: patientOptions() },
          { key: 'art', label: 'Art', type: 'select', options: opt(VORSORGE_ARTEN) },
          { key: 'faellig', label: 'Fällig am', type: 'date', value: addDays(todayISO(), 30) }
        ], (f) => { getPatient(f.patientId).vorsorge.push({ id: uid(), art: f.art, faellig: f.faellig }); commit(); toast('Vorsorge eingetragen.'); });
      } })));
    const list = allVorsorge().sort((a, b) => a.faellig.localeCompare(b.faellig));
    const overdue = list.filter((e) => e.faellig < todayISO()).length;
    v.appendChild(h('div', { class: 'grid cols-3' },
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('bell')), h('div', {}, h('div', { class: 'stat-num', text: String(list.length) }), h('div', { class: 'soft small', text: 'Offene Vorsorgen' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('clock')), h('div', {}, h('div', { class: 'stat-num', text: String(list.filter((e) => e.faellig >= todayISO() && e.faellig <= addDays(todayISO(), 30)).length) }), h('div', { class: 'soft small', text: 'In 30 Tagen fällig' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('shield')), h('div', {}, h('div', { class: 'stat-num', text: String(overdue) }), h('div', { class: 'soft small', text: 'Überfällig' })))));
    v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' }, list.length ? h('div', { class: 'list' }, list.map((e) => {
      const [cls, txt] = dueLabel(e.faellig);
      return h('div', { class: 'item' },
        h('img', { class: 'avatar', src: avatarSrc(e.p), alt: '' }),
        h('div', { class: 'grow' }, h('div', { class: 'title', text: e.art }), h('div', { class: 'soft small', text: fullName(e.p) })),
        h('span', { class: 'pill ' + cls, text: txt }),
        btn('Termin', { kind: 'small', icon: 'calendar', onclick: () => editTermin(null, e.faellig < todayISO() ? todayISO() : e.faellig, e.p.id) }),
        btn('Erledigt', { kind: 'small', icon: 'check', onclick: () => {
          e.p.vorsorge = e.p.vorsorge.filter((x) => x.id !== e.id);
          e.p.karte.push({ id: uid(), ts: Date.now(), typ: 'Therapie', text: `Vorsorge durchgeführt: ${e.art}` });
          commit(); toast('Als erledigt in der Karteikarte vermerkt.');
        } }));
    })) : h('div', { class: 'empty', text: 'Keine offenen Vorsorgen.' })));
    return v;
  }

  function addImpfung(patientId) {
    if (!state.patienten.length) return noPatients();
    const defs = [];
    if (!patientId) defs.push({ key: 'patientId', label: 'Patient', type: 'select', options: patientOptions() });
    defs.push({ key: 'name', label: 'Impfstoff', type: 'select', options: opt(IMPFSTOFFE) },
      { key: 'datum', label: 'Geimpft am', type: 'date', value: todayISO(), half: true },
      { key: 'naechste', label: 'Auffrischung (optional)', type: 'date', half: true });
    formModal('Impfung dokumentieren', defs, (f) => {
      getPatient(patientId || f.patientId).impfungen.push({ id: uid(), name: f.name, datum: f.datum, naechste: f.naechste });
      commit(); toast('Impfung dokumentiert.');
    });
  }

  function impfRow(e, showPatient) {
    const due = e.naechste ? dueLabel(e.naechste) : ['info', 'keine Auffrischung'];
    return h('div', { class: 'item' },
      showPatient ? h('img', { class: 'avatar', src: avatarSrc(e.p), alt: '' }) : h('span', { style: 'color:var(--accent)' }, icon('shield')),
      h('div', { class: 'grow' }, h('div', { class: 'title', text: e.name }), h('div', { class: 'soft small', text: (showPatient ? fullName(e.p) + ' · ' : '') + 'geimpft am ' + fmtDate(e.datum) })),
      h('span', { class: 'pill ' + due[0], text: e.naechste ? 'Auffrischung ' + due[1] : due[1] }),
      btn('', { kind: 'small', icon: 'trash', onclick: () => { e.p.impfungen = e.p.impfungen.filter((x) => x.id !== e.id); commit(); } }));
  }

  function renderImpfungen() {
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', { text: 'Impfungen' }), h('p', { text: 'Impfstatus aller Patienten und fällige Auffrischungen.' })),
      btn('Impfung dokumentieren', { kind: 'primary', icon: 'plus', onclick: () => addImpfung(null) })));
    const all = allImpfungen();
    const due = all.filter((e) => e.naechste && e.naechste <= addDays(todayISO(), 60)).sort((a, b) => a.naechste.localeCompare(b.naechste));
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:14px', text: 'Auffrischung fällig (60 Tage)' }),
      due.length ? h('div', { class: 'list' }, due.map((e) => impfRow(e, true))) : h('div', { class: 'empty', text: 'Keine Auffrischungen in den nächsten 60 Tagen.' })));
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:14px', text: 'Alle Impfungen' }),
      all.length ? h('div', { class: 'list' }, all.sort((a, b) => b.datum.localeCompare(a.datum)).map((e) => impfRow(e, true))) : h('div', { class: 'empty', text: 'Noch keine Impfungen dokumentiert.' })));
    return v;
  }

  function addLeistung(patientId) {
    if (!state.patienten.length) return noPatients();
    const defs = [];
    if (!patientId) defs.push({ key: 'patientId', label: 'Patient', type: 'select', options: patientOptions() });
    defs.push({ key: 'text', label: 'Leistung', type: 'select', options: LEISTUNGEN.map(([t, b]) => ({ value: t, label: `${t} (${euro(b)})` })) },
      { key: 'datum', label: 'Datum', type: 'date', value: todayISO() });
    formModal('Leistung erfassen', defs, (f) => {
      const betrag = LEISTUNGEN.find(([t]) => t === f.text)[1];
      getPatient(patientId || f.patientId).leistungen.push({ id: uid(), text: f.text, datum: f.datum, betrag });
      commit(); toast('Leistung erfasst.');
    });
  }

  function renderLeistungen() {
    const v = h('div', { class: 'view' });
    const month = todayISO().slice(0, 7);
    const all = allLeistungen().sort((a, b) => b.datum.localeCompare(a.datum));
    const sum = (arr) => arr.reduce((t, e) => t + e.betrag, 0);
    v.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', { text: 'Leistungen' }), h('p', { text: 'Erbrachte Leistungen erfassen und Honorar im Blick behalten.' })),
      btn('Leistung erfassen', { kind: 'primary', icon: 'plus', onclick: () => addLeistung(null) })));
    v.appendChild(h('div', { class: 'grid cols-3' },
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('euro')), h('div', {}, h('div', { class: 'stat-num', text: euro(sum(all.filter((e) => e.datum.startsWith(month)))) }), h('div', { class: 'soft small', text: 'Dieser Monat' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('chart')), h('div', {}, h('div', { class: 'stat-num', text: euro(sum(all)) }), h('div', { class: 'soft small', text: 'Gesamt' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('file')), h('div', {}, h('div', { class: 'stat-num', text: String(all.length) }), h('div', { class: 'soft small', text: 'Leistungen' })))));
    v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' }, all.length ? h('div', { class: 'list' }, all.map((e) => h('div', { class: 'item' },
      h('img', { class: 'avatar', src: avatarSrc(e.p), alt: '' }),
      h('div', { class: 'grow' }, h('div', { class: 'title', text: e.text }), h('div', { class: 'soft small', text: `${fullName(e.p)} · ${fmtDate(e.datum)}` })),
      h('strong', { text: euro(e.betrag) }),
      btn('', { kind: 'small', icon: 'trash', onclick: () => { e.p.leistungen = e.p.leistungen.filter((x) => x.id !== e.id); commit(); } })))) : h('div', { class: 'empty', text: 'Noch keine Leistungen erfasst.' })));
    v.appendChild(h('p', { class: 'soft small', style: 'margin-top:14px', text: 'Hinweis: Die Beträge sind frei gewählte Beispielwerte und keine amtliche Gebührenordnung (EBM/GOÄ). Allgemein Docs ersetzt keine Abrechnungssoftware.' }));
    return v;
  }


  // ---------------------------------------------------------------
  // Dokument-Helfer (Papier-Vorschau, Karteikarten-Vermerk)
  // ---------------------------------------------------------------
  const allOf = (key) => state.patienten.flatMap((p) => (p[key] || []).map((e) => ({ ...e, p })));
  const vermerk = (p, typ, text) => p.karte.push({ id: uid(), ts: Date.now(), typ, text });
  const addDaysISO = (iso, n) => addDays(iso, n);
  const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  const svgEl = (tag, attrs, ...kids) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    kids.flat().forEach((c) => c && el.appendChild(c));
    return el;
  };
  const field = (label, value, cls) => h('div', { class: 'pf ' + (cls || '') }, h('span', { class: 'pf-l', text: label }), h('span', { class: 'pf-v', text: value || '–' }));

  function paperModal(title, build) {
    openModal(title, (modal) => {
      const paper = build();
      modal.appendChild(paper);
      modal.appendChild(h('div', { class: 'modal-actions' }, btn('Schließen', { onclick: closeModal }), btn('Drucken', { kind: 'primary', icon: 'print', onclick: () => window.print() })));
    }, { wide: true });
  }
  const letterhead = () => h('div', { class: 'letterhead' }, h('img', { src: 'img/logo.svg', alt: '' }), h('div', {}, h('strong', { text: state.einstellungen.praxis }), h('div', { text: state.einstellungen.arzt })));
  const patientBlock = (p) => h('div', { class: 'pgrid' }, field('Name, Vorname', `${p.nachname}, ${p.vorname}`), field('geboren am', fmtDate(p.geb)), field('Krankenkasse', p.kasse || p.versicherung), field('Versichertennr.', p.kvnr));
  const demoNote = (text) => h('div', { class: 'paper-note', text });

  function docPage({ title, sub, addLabel, onAdd, rows, emptyText }) {
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', { text: title }), h('p', { text: sub })), btn(addLabel, { kind: 'primary', icon: 'plus', onclick: onAdd })));
    v.appendChild(h('div', { class: 'card' }, rows.length ? h('div', { class: 'list' }, rows.map((r) => h('div', { class: 'item clickable', onclick: r.onView },
      h('img', { class: 'avatar', src: avatarSrc(r.p), alt: '' }),
      h('div', { class: 'grow' }, h('div', { class: 'title', text: r.title }), h('div', { class: 'soft small', text: r.meta })),
      r.pill2 ? h('span', { class: 'pill ' + r.pill2[0], text: r.pill2[1] }) : null,
      r.pill ? h('span', { class: 'pill ' + r.pill[0], text: r.pill[1] }) : null,
      btn('', { kind: 'small', icon: 'print', onclick: (e) => { e.stopPropagation(); r.onView(); } }),
      btn('', { kind: 'small', icon: 'trash', onclick: (e) => { e.stopPropagation(); confirmModal('Eintrag wirklich löschen?', r.onDelete); } })))) : h('div', { class: 'empty', text: emptyText })));
    return v;
  }
  function needPatients() { if (!state.patienten.length) { noPatients(); return true; } return false; }

  // ---------------------------------------------------------------
  // E-Rezept (Demo-Simulation)
  // ---------------------------------------------------------------
  const rndDigits = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b % 10).join('');
  const rndHex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
  const newErezeptMeta = () => ({ id: `160.${rndDigits(3)}.${rndDigits(3)}.${rndDigits(3)}.${rndDigits(3)}.${rndDigits(2)}`, code: rndHex(32), status: 'signiert', abgabe: 'offen' });
  function qrSvg(text, px) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
    return svgEl('svg', { viewBox: `0 0 ${n + 4} ${n + 4}`, width: px, height: px, class: 'qr', 'shape-rendering': 'crispEdges' },
      svgEl('rect', { width: n + 4, height: n + 4, fill: '#fff' }), svgEl('path', { d, fill: '#0b1f4b' }));
  }
  const isE = (r) => !!r.erezept;
  const eStatus = (r) => (r.erezept.abgabe === 'eingelöst' ? ['ok', 'eingelöst'] : r.gueltigBis < todayISO() ? ['danger', 'abgelaufen'] : ['info', 'abrufbar']);

  function parseMed(text) {
    const m = text.match(/\s(\d+(?:[.,]\d+)?(?:-\d+(?:[.,]\d+)?){2,3})\s*$/);
    return m ? { medikament: text.slice(0, m.index).trim(), dosierung: m[1] } : { medikament: text.trim(), dosierung: '' };
  }
  function issueErezept(p, medText, o) {
    o = o || {};
    const pm = parseMed(medText);
    const r = { id: uid(), datum: todayISO(), medikament: pm.medikament, dosierung: pm.dosierung, packung: o.packung || 'N1', anzahl: o.anzahl || '1', autidem: 'ja', hinweis: '', gueltigBis: addDays(todayISO(), 28), erezept: newErezeptMeta() };
    p.rezepte.push(r);
    vermerk(p, 'Therapie', `E-Rezept ausgestellt: ${r.medikament}${r.dosierung ? ' ' + r.dosierung : ''} (${r.anzahl}× ${r.packung})`);
    return r;
  }

  // ---------------------------------------------------------------
  // Rezepte
  // ---------------------------------------------------------------
  function viewRezept(r) {
    const p = r.p;
    if (isE(r)) return viewErezept(r);
    paperModal(`Rezept – ${p.vorname} ${p.nachname}`, () => h('div', { class: 'doc-preview paper-rx' },
      letterhead(),
      h('div', { class: 'paper-title', text: 'Rezept' }),
      patientBlock(p),
      h('div', { class: 'rx-body' },
        h('div', { class: 'rx-sym', text: 'Rp.' }),
        h('div', {}, h('div', { class: 'rx-med', text: r.medikament }),
          h('div', { text: `${r.dosierung ? 'Dosierung: ' + r.dosierung : ''}` }),
          h('div', { text: `Menge: ${r.anzahl}× ${r.packung}` }),
          r.hinweis ? h('div', { text: 'Hinweis: ' + r.hinweis }) : null,
          h('div', { text: r.autidem === 'ja' ? 'aut idem: Austausch zulässig' : 'aut idem: Austausch ausgeschlossen' }))),
      h('div', { class: 'pgrid' }, field('Ausgestellt am', fmtDate(r.datum)), field('Gültig bis', fmtDate(r.gueltigBis))),
      h('div', { class: 'sign' }, h('span', { text: state.einstellungen.arzt }), h('small', { text: 'Unterschrift / Stempel' })),
      demoNote('Beispiel-Dokument (Demo). Gültige Kassenrezepte werden als E-Rezept über die Telematikinfrastruktur ausgestellt.')));
  }
  function viewErezept(r) {
    const p = r.p;
    const [cls, txt] = eStatus(r);
    const token = `Task/${r.erezept.id}/$accept?ac=${r.erezept.code}`;
    paperModal(`E-Rezept – ${p.vorname} ${p.nachname}`, () => h('div', { class: 'doc-preview paper-rx paper-er' },
      letterhead(),
      h('div', { class: 'er-head' }, h('div', {}, h('div', { class: 'paper-title', text: 'E-Rezept' }), h('div', { class: 'paper-sub', text: 'Elektronische Verordnung · einlösbar mit der Versichertenkarte' })), h('span', { class: 'pill ' + cls, text: txt })),
      patientBlock(p),
      h('div', { class: 'er-grid' },
        h('div', { class: 'er-qr' }, qrSvg(token, 190), h('small', { text: 'Token für Apotheke / E-Rezept-App (Demo)' })),
        h('div', {}, h('div', { class: 'rx-body' }, h('div', { class: 'rx-sym', text: 'Rp.' }), h('div', {},
          h('div', { class: 'rx-med', text: r.medikament }),
          h('div', { text: r.dosierung ? 'Dosierung: ' + r.dosierung : 'Dosierung: laut Anweisung' }),
          h('div', { text: `Menge: ${r.anzahl}× ${r.packung}` }),
          r.hinweis ? h('div', { text: 'Hinweis: ' + r.hinweis }) : null,
          h('div', { text: r.autidem === 'ja' ? 'aut idem: Austausch zulässig' : 'aut idem: Austausch ausgeschlossen' }))),
          h('div', { class: 'pgrid one' }, field('E-Rezept-ID', r.erezept.id), field('Ausgestellt / gültig bis', `${fmtDate(r.datum)} / ${fmtDate(r.gueltigBis)}`)))),
      h('div', { class: 'er-steps' },
        h('div', {}, h('b', { text: '1 · Signiert' }), h('span', { text: ' – von ' + state.einstellungen.arzt + ' (Demo)' })),
        h('div', {}, h('b', { text: '2 · Gespeichert' }), h('span', { text: ' – im E-Rezept-Fachdienst (simuliert)' })),
        h('div', {}, h('b', { text: '3 · Eingelöst' }), h('span', { text: ' – Apotheke liest die Karte oder scannt den Token' }))),
      demoNote('Beispiel-Dokument (Demo). Echte E-Rezepte werden mit der qualifizierten elektronischen Signatur (eHBA) erstellt und über die Telematikinfrastruktur im E-Rezept-Fachdienst gespeichert.')));
  }
  function newRezept(preset) {
    preset = preset || {};
    if (needPatients()) return;
    openModal('Rezept ausstellen', (modal) => {
      const form = h('form', {});
      const pSel = h('select', { name: 'patientId' }, patientOptions().map((o) => h('option', { value: o.value, text: o.label })));
      const medSel = h('select', { name: 'med' });
      const fillMeds = () => {
        const p = getPatient(pSel.value);
        medSel.textContent = '';
        p.medikation.forEach((m) => medSel.appendChild(h('option', { value: m.text, text: m.text })));
        medSel.appendChild(h('option', { value: '', text: 'Anderes Medikament …' }));
      };
      if (preset.patientId) pSel.value = preset.patientId;
      pSel.addEventListener('change', fillMeds); fillMeds();
      const artSel = h('select', { name: 'art' }, [['e', 'E-Rezept (über die Karte abrufbar)'], ['p', 'Papierrezept (Muster)']].map(([v, l]) => h('option', { value: v, text: l, selected: v === (preset.art || 'e') })));
      const own = h('input', { type: 'text', name: 'own', placeholder: 'Medikament und Stärke (falls „Anderes“)' });
      if (preset.med) { own.value = preset.med; medSel.value = ''; }
      const katBox = h('div', { class: 'cat-inline', hidden: true });
      const katBtn = btn('Im Medikamentenkatalog suchen', { icon: 'book', onclick: () => {
        katBox.hidden = !katBox.hidden;
        if (!katBox.hidden && !katBox.firstChild) katBox.appendChild(medPanel({ onPick: (pk) => { own.value = pk.text; medSel.value = ''; katBox.hidden = true; toast('Medikament übernommen: ' + pk.text); } }));
      } });
      const dos = h('input', { type: 'text', name: 'dosierung', placeholder: 'z. B. 1-0-0' });
      const packung = h('select', { name: 'packung' }, ['N1', 'N2', 'N3'].map((x) => h('option', { value: x, text: x })));
      const anzahl = h('input', { type: 'text', name: 'anzahl', value: '1' });
      const autidem = h('select', { name: 'autidem' }, [['ja', 'Ja'], ['nein', 'Nein']].map(([v, l]) => h('option', { value: v, text: l })));
      const hint = h('input', { type: 'text', name: 'hinweis', placeholder: 'optional, z. B. vor dem Essen einnehmen' });
      const row = (...f) => h('div', { class: 'row' }, f.map(([l, el]) => h('div', { class: 'field' }, h('label', { text: l }), el)));
      form.append(row(['Patient', pSel], ['Art', artSel]), row(['Medikament aus der Medikation', medSel]), row(['…oder anderes Medikament', own]), h('div', { style: 'margin:-6px 0 12px' }, katBtn, katBox),
        row(['Dosierung', dos], ['Packung', packung], ['Anzahl', anzahl]), row(['aut idem', autidem], ['Hinweis', hint]),
        h('div', { class: 'modal-actions' }, btn('Abbrechen', { onclick: closeModal }), h('button', { class: 'btn primary', type: 'submit' }, icon('pill'), 'Rezept ausstellen')));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const p = getPatient(pSel.value);
        const medikament = own.value.trim() || medSel.value;
        if (!medikament) { toast('Bitte ein Medikament angeben.'); return; }
        const r = { id: uid(), datum: todayISO(), medikament, dosierung: dos.value.trim(), packung: packung.value, anzahl: anzahl.value.trim() || '1', autidem: autidem.value, hinweis: hint.value.trim(), gueltigBis: addDays(todayISO(), artSel.value === 'e' ? 28 : 90) };
        if (artSel.value === 'e') r.erezept = newErezeptMeta();
        p.rezepte.push(r);
        if (own.value.trim() && !p.medikation.some((m) => m.text === medikament)) p.medikation.push({ id: uid(), text: medikament });
        vermerk(p, 'Therapie', `${r.erezept ? 'E-Rezept' : 'Rezept'} ausgestellt: ${medikament} (${r.anzahl}× ${r.packung})`);
        persist(); render(); closeModal(); viewRezept({ ...r, p });
        toast(r.erezept ? 'E-Rezept ausgestellt – auf der Karte abrufbar.' : 'Rezept ausgestellt und in der Karteikarte vermerkt.');
      });
      modal.appendChild(form);
    });
  }
  function renderRezepte() {
    const rows = allOf('rezepte').sort((a, b) => b.datum.localeCompare(a.datum)).map((r) => ({
      p: r.p, title: r.medikament, meta: `${fullName(r.p)} · ${fmtDate(r.datum)} · ${r.anzahl}× ${r.packung}`,
      pill: isE(r) ? [eStatus(r)[0], 'E-Rezept · ' + eStatus(r)[1]] : (r.gueltigBis < todayISO() ? ['danger', 'abgelaufen'] : ['ok', 'gültig bis ' + fmtDate(r.gueltigBis)]),
      onView: () => viewRezept(r), onDelete: () => { r.p.rezepte = r.p.rezepte.filter((x) => x.id !== r.id); commit(); }
    }));
    return docPage({ title: 'Rezepte', sub: 'Medikamente verordnen – Rezept aus der Medikation in drei Klicks.', addLabel: 'Rezept ausstellen', onAdd: newRezept, rows, emptyText: 'Noch keine Rezepte ausgestellt.' });
  }

  // ---------------------------------------------------------------
  // Medikamentenkatalog (Suche, Auswahl, Import)
  // ---------------------------------------------------------------
  const FORM_NAMES = {
    Tbl: 'Tabletten', FTA: 'Filmtabletten', Kautbl: 'Kautabletten', Brausetbl: 'Brausetabletten', Drg: 'Dragees', Kps: 'Kapseln',
    'MSR-Tbl': 'magensaftresistente Tabletten', 'MSR-Kps': 'magensaftresistente Kapseln', 'ret-Tbl': 'Retardtabletten', 'ret-Kps': 'Retardkapseln',
    Sup: 'Zäpfchen', Tr: 'Tropfen', Saft: 'Saft', Susp: 'Suspension', Sirup: 'Sirup', Creme: 'Creme', Salbe: 'Salbe', Gel: 'Gel', Fettsalbe: 'Fettsalbe',
    Pflaster: 'Pflaster', Inj: 'Injektionslösung', Fertigpen: 'Fertigpen', Fertigspritze: 'Fertigspritze', Infusion: 'Infusionslösung',
    Dosieraerosol: 'Dosieraerosol', Inhalator: 'Inhalator', Inhalationskapseln: 'Inhalationskapseln', Respimat: 'Respimat', Pulver: 'Pulver', Granulat: 'Granulat',
    Nasenspray: 'Nasenspray', 'Nasentr.': 'Nasentropfen', Aug: 'Augentropfen', 'Ohrentr.': 'Ohrentropfen', Spray: 'Spray', 'Lösung': 'Lösung',
    Vaginaltbl: 'Vaginaltabletten', Vaginalcreme: 'Vaginalcreme', Nagellack: 'Nagellack', Kaugummi: 'Kaugummi', Hustentropfen: 'Hustentropfen', Schaum: 'Schaum'
  };
  const ATC_GROUPS = { A: 'Magen-Darm & Stoffwechsel', B: 'Blut & Gerinnung', C: 'Herz-Kreislauf', D: 'Haut', G: 'Urogenital & Hormone', H: 'Hormone (systemisch)', J: 'Infektionen & Impfstoffe', L: 'Immunsystem', M: 'Muskel & Skelett', N: 'Nervensystem', P: 'Parasiten', R: 'Atemwege & Allergie', S: 'Augen & Ohren', V: 'Sonstiges' };
  const MED_ORDER = ['C', 'A', 'N', 'M', 'R', 'J', 'B', 'H', 'G', 'D', 'S', 'L', 'P', 'V'];
  function parsePacks(fields) {
    const packs = [];
    fields.forEach((f) => {
      const i = f.indexOf(':');
      if (i < 0) return;
      const form = f.slice(0, i).trim();
      const list = f.slice(i + 1).split(';').map((x) => x.trim()).filter(Boolean);
      const last = list[list.length - 1] || '';
      const um = last.match(/[A-Za-zµ%.Ä-ü][^\d]*$/);
      const unit = /\d/.test(last) && um ? um[0].trim() : '';
      list.forEach((st) => {
        const strength = /[A-Za-zµ%]/.test(st) || !unit ? st : `${st} ${unit}`;
        packs.push({ form, formName: FORM_NAMES[form] || form, strength });
      });
    });
    return packs;
  }
  function parseCatalog(raw) {
    return String(raw || '').split('\n').map((l) => l.trim()).filter((l) => l && l.split('|').length >= 4 && !l.startsWith('/*') && !l.startsWith('Format'))
      .map((l) => {
        const f = l.split('|');
        const atc = f[1].trim();
        return { name: f[0].trim(), atc, grp: ATC_GROUPS[atc[0]] || 'Sonstiges', aliases: f[2].split(';').map((x) => x.trim()).filter(Boolean), packs: parsePacks(f.slice(3)), builtin: true };
      });
  }
  const CATALOG = parseCatalog(window.MED_CATALOG_RAW);
  const CATALOG_STAND = 'Oktober 2026';
  const catalogAll = () => CATALOG.concat(state.katalogExtra || []);
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function searchCatalog(q, grpLetter) {
    const all = catalogAll().filter((e) => !grpLetter || (e.atc || 'V')[0] === grpLetter);
    const t = norm(q).trim();
    if (!t) return null;
    const toks = t.split(/\s+/);
    return all.map((e) => {
      const nm = norm(e.name), al = e.aliases.map(norm), atc = norm(e.atc);
      let score = 0;
      for (const k of toks) {
        let sc = 0;
        if (nm.startsWith(k)) sc = 5; else if (al.some((a) => a.startsWith(k))) sc = 5; else if (nm.includes(k)) sc = 3; else if (al.some((a) => a.includes(k))) sc = 3;
        else if (atc.startsWith(k)) sc = 4; else if (norm(e.grp).includes(k)) sc = 1; else if (e.packs.some((p) => norm(p.strength + ' ' + p.formName).includes(k))) sc = 1;
        if (!sc) return null;
        score += sc;
      }
      return { e, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, 'de')).slice(0, 40).map((x) => x.e);
  }
  const POPULAR = ['Ramipril', 'Bisoprolol', 'Amlodipin', 'Metformin', 'Pantoprazol', 'Ibuprofen', 'Paracetamol', 'Metamizol', 'Atorvastatin', 'Levothyroxin', 'Amoxicillin', 'Cetirizin'];

  // Suchfeld mit Ergebnisliste; onPick({ text, name, atc, form, strength })
  function medPanel(opts) {
    opts = opts || {};
    const wrap = h('div', { class: 'med-panel' });
    let grp = opts.grp || '';
    const input = h('input', { type: 'text', placeholder: 'Wirkstoff, Handelsname oder ATC-Code …', value: opts.query || '', 'aria-label': 'Medikament suchen' });
    const chips = h('div', { class: 'chips med-groups' });
    const results = h('div', { class: 'med-results' });
    const drawChips = () => {
      chips.textContent = '';
      chips.appendChild(h('button', { class: 'chip' + (!grp ? ' on' : ''), type: 'button', onclick: () => { grp = ''; drawChips(); run(); } }, 'Alle'));
      MED_ORDER.forEach((l) => chips.appendChild(h('button', { class: 'chip' + (grp === l ? ' on' : ''), type: 'button', onclick: () => { grp = l; drawChips(); run(); } }, ATC_GROUPS[l])));
    };
    const entry = (e) => h('div', { class: 'med-res' },
      h('div', { class: 'med-head' }, h('strong', { text: e.name }), e.atc ? h('span', { class: 'pill info', text: e.atc }) : null, h('span', { class: 'soft small', text: e.grp }),
        e.aliases.length ? h('span', { class: 'soft small', text: '· ' + e.aliases.slice(0, 3).join(', ') }) : null),
      h('div', { class: 'med-packs' }, e.packs.map((pk) => h('button', { class: 'chip', type: 'button', title: `${e.name} ${pk.strength}, ${pk.formName}`, onclick: () => {
        const text = `${e.name} ${pk.strength}`;
        opts.onPick && opts.onPick({ text, name: e.name, atc: e.atc, form: pk.formName, strength: pk.strength });
      } }, h('span', { text: pk.strength }), h('small', { text: pk.formName })))));
    const run = () => {
      const q = input.value;
      opts.onQuery && opts.onQuery(q, grp);
      results.textContent = '';
      let list = searchCatalog(q, grp);
      if (list === null) {
        const all = catalogAll();
        if (grp) list = all.filter((e) => (e.atc || 'V')[0] === grp).slice(0, 40);
        else {
          results.appendChild(h('div', { class: 'soft small', style: 'margin:8px 0', text: `${all.length} Wirkstoffe · Häufig verordnet:` }));
          list = POPULAR.map((n) => all.find((e) => e.name === n)).filter(Boolean);
        }
      }
      if (!list.length) { results.appendChild(h('div', { class: 'empty', text: 'Kein Treffer. Anderen Suchbegriff versuchen oder einen Katalog importieren (Einstellungen).' })); return; }
      list.forEach((e) => results.appendChild(entry(e)));
    };
    input.addEventListener('input', run);
    wrap.append(h('div', { class: 'field' }, input), chips, results);
    drawChips(); run();
    return wrap;
  }

  function renderKatalog() {
    const v = h('div', { class: 'view' });
    const all = catalogAll();
    const packs = all.reduce((n, e) => n + e.packs.length, 0);
    v.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', { text: 'Medikamentenkatalog' }), h('p', { text: 'Wirkstoffe, Stärken und Darreichungsformen suchen und direkt verordnen.' })),
      btn('Katalog importieren', { icon: 'file', onclick: () => goto('einstellungen') })));
    v.appendChild(h('div', { class: 'grid cols-3' },
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('book')), h('div', {}, h('div', { class: 'stat-num', text: String(all.length) }), h('div', { class: 'soft small', text: 'Wirkstoffe / Präparate' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('pill')), h('div', {}, h('div', { class: 'stat-num', text: String(packs) }), h('div', { class: 'soft small', text: 'Stärken und Darreichungsformen' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('save')), h('div', {}, h('div', { class: 'stat-num', text: String((state.katalogExtra || []).length) }), h('div', { class: 'soft small', text: 'eigene / importierte Einträge' })))));
    v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' },
      h('div', { class: 'card-title' }, h('h2', { text: 'Suchen und verordnen' }), h('span', { class: 'pill info', text: 'Stand ' + CATALOG_STAND })),
      medPanel({ query: view.katQuery || '', grp: view.katGrp || '', onQuery: (q, g) => { view.katQuery = q; view.katGrp = g; },
        onPick: (pick) => { if (needPatients()) return; newRezept({ med: pick.text, art: 'e' }); } }),
      h('p', { class: 'soft small', style: 'margin-top:14px', text: 'Hinweis: Beispielkatalog ohne Preis-, Liefer- und Interaktionsdaten. Für den echten Einsatz eine zugelassene Arzneimitteldatenbank (z. B. ABDATA, ifap, Rote Liste) importieren und die Fachinformation prüfen.' })));
    return v;
  }

  // CSV/JSON-Import (z. B. Export aus einer lizenzierten Arzneimitteldatenbank)
  function parseImport(text, filename) {
    let rows = [];
    if (/\.json$/i.test(filename)) {
      const d = JSON.parse(text);
      rows = Array.isArray(d) ? d : d.medikamente || [];
    } else {
      const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
      const delim = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
      const split = (l) => l.split(delim).map((x) => x.replace(/^"|"$/g, '').trim());
      const head = split(lines[0]).map(norm);
      const col = (names) => head.findIndex((h2) => names.some((n) => h2 === n || h2.startsWith(n)));
      const ix = { name: col(['name', 'wirkstoff', 'bezeichnung', 'praparat']), strength: col(['staerke', 'starke', 'strength', 'dosis']), form: col(['form', 'darreichungsform']), atc: col(['atc']), grp: col(['gruppe', 'group']), alias: col(['alias', 'handelsname']) };
      if (ix.name < 0) throw new Error('Spalte „Name“ fehlt');
      rows = lines.slice(1).map((l) => { const c = split(l); return { name: c[ix.name], strength: ix.strength >= 0 ? c[ix.strength] : '', form: ix.form >= 0 ? c[ix.form] : '', atc: ix.atc >= 0 ? c[ix.atc] : '', grp: ix.grp >= 0 ? c[ix.grp] : '', alias: ix.alias >= 0 ? c[ix.alias] : '' }; });
    }
    const map = new Map();
    rows.filter((r) => r && r.name).forEach((r) => {
      const key = norm(r.name);
      if (!map.has(key)) map.set(key, { name: String(r.name).trim(), atc: (r.atc || '').trim(), grp: r.grp || ATC_GROUPS[(r.atc || 'V')[0]] || 'Sonstiges', aliases: [], packs: [] });
      const e = map.get(key);
      String(r.alias || '').split(/[;,]/).map((x) => x.trim()).filter(Boolean).forEach((a) => { if (!e.aliases.includes(a)) e.aliases.push(a); });
      if (r.strength || r.form) e.packs.push({ form: r.form || '', formName: r.form || 'Packung', strength: r.strength || '–' });
    });
    map.forEach((e) => { if (!e.packs.length) e.packs.push({ form: '', formName: 'Packung', strength: '–' }); });
    return [...map.values()];
  }

  // ---------------------------------------------------------------
  // E-Rezept aus der Medikation
  // ---------------------------------------------------------------
  function viewErezeptBatch(p, list) {
    paperModal(`${list.length} E-Rezepte – ${p.vorname} ${p.nachname}`, () => h('div', { class: 'doc-preview paper-rx paper-er' },
      letterhead(),
      h('div', { class: 'paper-title', text: `${list.length} E-Rezepte ausgestellt` }),
      h('div', { class: 'paper-sub', text: 'Einlösbar mit der Versichertenkarte in jeder Apotheke oder per Token' }),
      patientBlock(p),
      h('div', { class: 'er-batch' }, list.map((r) => h('div', { class: 'er-mini' },
        qrSvg(`Task/${r.erezept.id}/$accept?ac=${r.erezept.code}`, 120),
        h('div', {}, h('div', { class: 'rx-med', text: r.medikament }), h('div', { text: [r.dosierung, `${r.anzahl}× ${r.packung}`].filter(Boolean).join(' · ') }), h('small', { text: r.erezept.id }))))),
      demoNote('Beispiel-Dokument (Demo). Echte E-Rezepte werden mit der qualifizierten elektronischen Signatur (eHBA) erstellt und im E-Rezept-Fachdienst der Telematikinfrastruktur gespeichert.')));
  }
  function renderErezept() {
    const v = h('div', { class: 'view' });
    const all = allOf('rezepte').filter(isE).sort((a, b) => b.datum.localeCompare(a.datum));
    v.appendChild(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'E-Rezept' }), h('p', { text: 'Medikamente aus der Akte direkt als E-Rezept verordnen – einlösbar mit der Karte oder per Token.' })),
      btn('Einzelnes E-Rezept', { kind: 'primary', icon: 'plus', onclick: () => newRezept({ art: 'e' }) })));
    v.appendChild(h('div', { class: 'grid cols-3' },
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('pill')), h('div', {}, h('div', { class: 'stat-num', text: String(all.length) }), h('div', { class: 'soft small', text: 'E-Rezepte gesamt' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('clock')), h('div', {}, h('div', { class: 'stat-num', text: String(all.filter((r) => r.erezept.abgabe === 'offen' && r.gueltigBis >= todayISO()).length) }), h('div', { class: 'soft small', text: 'abrufbar in der Apotheke' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('check')), h('div', {}, h('div', { class: 'stat-num', text: String(all.filter((r) => r.erezept.abgabe === 'eingelöst').length) }), h('div', { class: 'soft small', text: 'eingelöst' })))));

    if (state.patienten.length) {
      if (!view.erPatient || !getPatient(view.erPatient)) view.erPatient = state.patienten[0].id;
      const p = getPatient(view.erPatient);
      view.erSel = view.erSel || {};
      const pSel = h('select', {}, patientOptions().map((o) => h('option', { value: o.value, text: o.label, selected: o.value === view.erPatient })));
      pSel.addEventListener('change', () => { view.erPatient = pSel.value; view.erSel = {}; render(); });
      view.erExtra = view.erExtra || [];
      const chosen = p.medikation.filter((m) => view.erSel[m.id]);
      const total = chosen.length + view.erExtra.length;
      v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' },
        h('div', { class: 'card-title' }, h('h2', { text: 'Aus der Medikation verordnen' }), h('div', { style: 'min-width:240px' }, pSel)),
        p.medikation.length ? h('div', { class: 'list' }, p.medikation.map((m) => h('label', { class: 'item clickable med-pick' },
          h('input', { type: 'checkbox', checked: !!view.erSel[m.id], onchange: (e) => { view.erSel[m.id] = e.target.checked; render(); } }),
          h('div', { class: 'grow' }, h('div', { class: 'title', text: m.text })),
          h('span', { class: 'pill info', text: 'N1' }))))
          : h('div', { class: 'empty', text: 'Für diesen Patienten ist keine Medikation eingetragen.' }),
        h('div', { class: 'actions-row' },
          btn(total ? `${total} E-Rezept${total > 1 ? 'e' : ''} ausstellen` : 'Medikamente auswählen', { kind: 'primary', icon: 'pill', onclick: () => {
            if (!total) { toast('Bitte mindestens ein Medikament auswählen.'); return; }
            const list = chosen.map((m) => issueErezept(p, m.text)).concat(view.erExtra.map((x) => issueErezept(p, x.text, { packung: x.packung })));
            view.erSel = {}; view.erExtra = [];
            persist(); render();
            list.length === 1 ? viewErezept({ ...list[0], p }) : viewErezeptBatch(p, list);
            toast(`${list.length} E-Rezept${list.length > 1 ? 'e' : ''} ausgestellt – auf der Karte abrufbar.`);
          } }),
          btn('Alle auswählen', { icon: 'check', onclick: () => { p.medikation.forEach((m) => { view.erSel[m.id] = true; }); render(); } }))));
      v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' },
        h('div', { class: 'card-title' }, h('h2', { text: 'Aus dem Medikamentenkatalog ergänzen' }), h('span', { class: 'pill info', text: `${catalogAll().length} Wirkstoffe` })),
        view.erExtra.length ? h('div', { class: 'list', style: 'margin-bottom:12px' }, view.erExtra.map((x, i) => h('div', { class: 'item' },
          h('div', { class: 'grow' }, h('div', { class: 'title', text: x.text }), h('div', { class: 'soft small', text: x.form || '' })),
          h('select', { style: 'width:90px', onchange: (e) => { x.packung = e.target.value; } }, ['N1', 'N2', 'N3'].map((n) => h('option', { value: n, text: n, selected: n === x.packung }))),
          btn('', { kind: 'small', icon: 'close', onclick: () => { view.erExtra.splice(i, 1); render(); } })))) : null,
        medPanel({ query: view.erQuery || '', onQuery: (q) => { view.erQuery = q; }, onPick: (pk) => { view.erExtra.push({ text: pk.text, form: pk.form, packung: 'N1' }); render(); toast('Zur Auswahl hinzugefügt: ' + pk.text); } })));
    }

    v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:12px', text: 'Alle E-Rezepte' }),
      all.length ? h('div', { class: 'list' }, all.map((r) => {
        const [cls, txt] = eStatus(r);
        return h('div', { class: 'item clickable', onclick: () => viewErezept(r) }, h('img', { class: 'avatar', src: avatarSrc(r.p), alt: '' }),
          h('div', { class: 'grow' }, h('div', { class: 'title', text: `${r.medikament}${r.dosierung ? ' ' + r.dosierung : ''}` }), h('div', { class: 'soft small', text: `${fullName(r.p)} · ${fmtDate(r.datum)} · ${r.erezept.id}` })),
          h('span', { class: 'pill ' + cls, text: txt }),
          r.erezept.abgabe === 'offen' ? btn('Apotheke', { kind: 'small', onclick: (e) => { e.stopPropagation(); r.erezept.abgabe = 'eingelöst'; vermerk(r.p, 'Notiz', `E-Rezept eingelöst (Demo): ${r.medikament}`); commit(); toast('Einlösung in der Apotheke simuliert.'); } }) : null,
          btn('', { kind: 'small', icon: 'trash', onclick: (e) => { e.stopPropagation(); confirmModal('E-Rezept wirklich löschen?', () => { r.p.rezepte = r.p.rezepte.filter((x) => x.id !== r.id); commit(); }); } }));
      })) : h('div', { class: 'empty', text: 'Noch keine E-Rezepte ausgestellt.' })));
    return v;
  }

  // ---------------------------------------------------------------
  // Krankmeldung (Arbeitsunfähigkeit, „Gelber Schein“)
  // ---------------------------------------------------------------
  function viewAU(a) {
    const p = a.p;
    paperModal(`Krankmeldung – ${p.vorname} ${p.nachname}`, () => h('div', { class: 'paper-wrap' }, auStatusPanel(a), h('div', { class: 'doc-preview paper-au' },
      letterhead(),
      h('div', { class: 'paper-title', text: 'Arbeitsunfähigkeitsbescheinigung' }),
      h('div', { class: 'paper-sub', text: `${a.art} · Dauer: ${dayDiff(a.von, a.bis) + 1} Kalendertage` }),
      patientBlock(p),
      h('div', { class: 'pgrid' }, field('arbeitsunfähig seit', fmtDate(a.von)), field('voraussichtlich bis einschließlich', fmtDate(a.bis)), field('festgestellt am', fmtDate(a.datum)), field('Arbeitsunfall', a.unfall === 'ja' ? 'Ja' : 'Nein')),
      h('div', { class: 'pgrid one' }, field('Diagnose (ICD-10)', a.diagnose)),
      h('div', { class: 'sign' }, h('span', { text: state.einstellungen.arzt }), h('small', { text: 'Unterschrift / Stempel' })),
      demoNote('Beispiel-Dokument (Demo). Die digitale Übermittlung an Krankenkasse und Arbeitgeber wird hier simuliert; echte eAU laufen über die Telematikinfrastruktur (KIM).'))));
  }
  function auStatusPanel(a) {
    const p = a.p;
    const d = a.digital || {};
    const step = (title, text, ts, i) => h('div', { class: 'au-step' + (ts ? ' on' : ''), style: `--i:${i}` },
      h('span', { class: 'au-dot' }, ts ? icon('check') : null), h('div', {}, h('b', { text: title }), h('small', { text: ts ? `${text} · ${fmtStamp(ts)}` : 'noch nicht gesendet' })));
    return h('div', { class: 'au-digital no-print' },
      h('div', { class: 'au-steps' },
        step('Krankenkasse (KV)', 'eAU per KIM übermittelt', d.kasse, 0),
        step('Arbeitgeber (AG)', 'zum Abruf bei der Krankenkasse bereitgestellt', d.ag, 1)),
      btn(d.kasse ? 'Erneut digital senden' : 'Digital an Krankenkasse & Arbeitgeber senden', { kind: d.kasse ? '' : 'primary', icon: 'send', onclick: () => {
        a.digital = { kasse: Date.now(), ag: Date.now() + 1500 };
        const orig = p.krankmeldungen.find((x) => x.id === a.id);
        if (orig) orig.digital = a.digital;
        vermerk(p, 'Notiz', `eAU digital übermittelt: Krankenkasse und Arbeitgeber (Demo, ${fmtDate(a.von)} – ${fmtDate(a.bis)})`);
        persist(); render(); viewAU({ ...(orig || a), p });
        toast('Krankmeldung digital an Krankenkasse und Arbeitgeber gesendet (simuliert).');
      } }));
  }
  function newAU() {
    if (needPatients()) return;
    openModal('Krankmeldung erstellen', (modal) => {
      const form = h('form', {});
      const pSel = h('select', { name: 'patientId' }, patientOptions().map((o) => h('option', { value: o.value, text: o.label })));
      const diag = h('select', { name: 'diag' });
      const fillDiag = () => {
        const p = getPatient(pSel.value);
        diag.textContent = '';
        p.diagnosen.forEach((d) => diag.appendChild(h('option', { value: `${d.icd ? d.icd + ' – ' : ''}${d.text}`, text: `${d.icd ? d.icd + ' – ' : ''}${d.text}` })));
        diag.appendChild(h('option', { value: '', text: 'Andere Diagnose …' }));
      };
      pSel.addEventListener('change', fillDiag); fillDiag();
      const own = h('input', { type: 'text', placeholder: 'z. B. J06.9 – Akute Infektion der oberen Atemwege' });
      const art = h('select', {}, ['Erstbescheinigung', 'Folgebescheinigung'].map((x) => h('option', { value: x, text: x })));
      const von = h('input', { type: 'date', value: todayISO() });
      const bis = h('input', { type: 'date', value: addDays(todayISO(), 2) });
      const unfall = h('select', {}, [['nein', 'Nein'], ['ja', 'Ja']].map(([v, l]) => h('option', { value: v, text: l })));
      const digi = h('select', {}, [['ja', 'Ja – an Krankenkasse (KV) und Arbeitgeber (AG)'], ['nein', 'Nein – nur Papier']].map(([v, l]) => h('option', { value: v, text: l })));
      const row = (...f) => h('div', { class: 'row' }, f.map(([l, el]) => h('div', { class: 'field' }, h('label', { text: l }), el)));
      form.append(row(['Patient', pSel]), row(['Diagnose aus der Akte', diag]), row(['…oder andere Diagnose', own]), row(['Art', art], ['Arbeitsunfähig von', von], ['bis einschließlich', bis]), row(['Arbeitsunfall', unfall], ['Digital übermitteln', digi]),
        h('div', { class: 'modal-actions' }, btn('Abbrechen', { onclick: closeModal }), h('button', { class: 'btn primary', type: 'submit' }, icon('file'), 'Krankmeldung erstellen')));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (bis.value < von.value) { toast('Das Enddatum liegt vor dem Beginn.'); return; }
        const p = getPatient(pSel.value);
        const a = { id: uid(), datum: todayISO(), art: art.value, von: von.value, bis: bis.value, diagnose: own.value.trim() || diag.value, unfall: unfall.value };
        if (digi.value === 'ja') a.digital = { kasse: Date.now(), ag: Date.now() + 1500 };
        p.krankmeldungen.push(a);
        vermerk(p, 'Therapie', `AU ausgestellt: ${fmtDate(a.von)} – ${fmtDate(a.bis)} (${a.diagnose || 'ohne Diagnose'})${a.digital ? ' – digital an Krankenkasse und Arbeitgeber übermittelt (Demo)' : ''}`);
        persist(); render(); closeModal(); viewAU({ ...a, p });
        toast('Krankmeldung erstellt und in der Karteikarte vermerkt.');
      });
      modal.appendChild(form);
    });
  }
  function renderKrankmeldungen() {
    const rows = allOf('krankmeldungen').sort((a, b) => b.datum.localeCompare(a.datum)).map((a) => ({
      p: a.p, title: `${a.art}: ${fmtDate(a.von)} – ${fmtDate(a.bis)}`, meta: `${fullName(a.p)} · ${a.diagnose || 'ohne Diagnose'}`,
      pill: a.bis >= todayISO() ? ['warn', 'läuft'] : ['ok', 'beendet'],
      pill2: a.digital ? ['ok', 'digital · KV & AG'] : ['danger', 'nur Papier'],
      onView: () => viewAU(a), onDelete: () => { a.p.krankmeldungen = a.p.krankmeldungen.filter((x) => x.id !== a.id); commit(); }
    }));
    return docPage({ title: 'Krankmeldung', sub: 'Arbeitsunfähigkeit bescheinigen („Gelber Schein“) und digital an Krankenkasse und Arbeitgeber senden.', addLabel: 'Krankmeldung erstellen', onAdd: newAU, rows, emptyText: 'Noch keine Krankmeldungen.' });
  }

  // ---------------------------------------------------------------
  // Überweisungen
  // ---------------------------------------------------------------
  const FACHRICHTUNGEN = ['Allgemeinmedizin', 'Augenheilkunde', 'Chirurgie', 'Dermatologie', 'Gastroenterologie', 'Gynäkologie', 'HNO', 'Kardiologie', 'Labormedizin', 'Neurologie', 'Orthopädie', 'Pneumologie', 'Radiologie', 'Urologie'];
  function viewUeberweisung(u) {
    const p = u.p;
    paperModal(`Überweisung – ${p.vorname} ${p.nachname}`, () => h('div', { class: 'doc-preview paper-ue' },
      letterhead(),
      h('div', { class: 'paper-title', text: 'Überweisungsschein' }),
      patientBlock(p),
      h('div', { class: 'pgrid' }, field('Überweisung an', u.an), field('Dringlichkeit', u.dringend === 'ja' ? 'DRINGEND' : 'normal', u.dringend === 'ja' ? 'urgent' : ''), field('Ausstellungsdatum', fmtDate(u.datum))),
      h('div', { class: 'pgrid one' }, field('Diagnose / Verdachtsdiagnose', u.diagnose), field('Auftrag', u.auftrag),
        field('Relevante Medikation', p.medikation.length ? p.medikation.map((m) => m.text).join('; ') : 'keine'), field('Allergien', p.allergien || 'keine bekannt')),
      h('div', { class: 'sign' }, h('span', { text: state.einstellungen.arzt }), h('small', { text: 'Unterschrift / Stempel' })),
      demoNote('Beispiel-Dokument (Demo) – kein amtliches Überweisungsformular (Muster 6).')));
  }
  function newUeberweisung() {
    if (needPatients()) return;
    openModal('Überweisung erstellen', (modal) => {
      const form = h('form', {});
      const pSel = h('select', {}, patientOptions().map((o) => h('option', { value: o.value, text: o.label })));
      const an = h('select', {}, FACHRICHTUNGEN.map((x) => h('option', { value: x, text: x })));
      const diag = h('select', {});
      const fillDiag = () => {
        const p = getPatient(pSel.value);
        diag.textContent = '';
        p.diagnosen.forEach((d) => diag.appendChild(h('option', { value: `${d.icd ? d.icd + ' – ' : ''}${d.text}`, text: `${d.icd ? d.icd + ' – ' : ''}${d.text}` })));
        diag.appendChild(h('option', { value: '', text: 'Andere / Verdachtsdiagnose …' }));
      };
      pSel.addEventListener('change', fillDiag); fillDiag();
      const own = h('input', { type: 'text', placeholder: 'Verdachtsdiagnose (falls „Andere“)' });
      const auftrag = h('textarea', { placeholder: 'z. B. Bitte um Abklärung und Mitbehandlung', style: 'min-height:80px' });
      const dring = h('select', {}, [['nein', 'Normal'], ['ja', 'Dringend']].map(([v, l]) => h('option', { value: v, text: l })));
      const row = (...f) => h('div', { class: 'row' }, f.map(([l, el]) => h('div', { class: 'field' }, h('label', { text: l }), el)));
      form.append(row(['Patient', pSel], ['Überweisung an', an]), row(['Diagnose aus der Akte', diag]), row(['…oder Verdachtsdiagnose', own]), row(['Auftrag', auftrag]), row(['Dringlichkeit', dring]),
        h('div', { class: 'modal-actions' }, btn('Abbrechen', { onclick: closeModal }), h('button', { class: 'btn primary', type: 'submit' }, icon('send'), 'Überweisung erstellen')));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const p = getPatient(pSel.value);
        const u = { id: uid(), datum: todayISO(), an: an.value, diagnose: own.value.trim() || diag.value, auftrag: auftrag.value.trim() || 'Bitte um Mitbehandlung', dringend: dring.value };
        p.ueberweisungen.push(u);
        vermerk(p, 'Therapie', `Überweisung an ${u.an}: ${u.auftrag}`);
        persist(); render(); closeModal(); viewUeberweisung({ ...u, p });
        toast('Überweisung erstellt und in der Karteikarte vermerkt.');
      });
      modal.appendChild(form);
    });
  }
  function renderUeberweisungen() {
    const rows = allOf('ueberweisungen').sort((a, b) => b.datum.localeCompare(a.datum)).map((u) => ({
      p: u.p, title: `${u.an} – ${u.auftrag}`, meta: `${fullName(u.p)} · ${fmtDate(u.datum)} · ${u.diagnose || 'ohne Diagnose'}`,
      pill: u.dringend === 'ja' ? ['danger', 'dringend'] : ['info', 'normal'],
      onView: () => viewUeberweisung(u), onDelete: () => { u.p.ueberweisungen = u.p.ueberweisungen.filter((x) => x.id !== u.id); commit(); }
    }));
    return docPage({ title: 'Überweisungen', sub: 'Zu Fachärzten überweisen – Diagnose, Medikation und Allergien werden automatisch mitgegeben.', addLabel: 'Überweisung erstellen', onAdd: newUeberweisung, rows, emptyText: 'Noch keine Überweisungen.' });
  }

  // ---------------------------------------------------------------
  // Laborergebnisse
  // ---------------------------------------------------------------
  const LAB_GROUPS = [
    ['Blutbild', [['Hämoglobin', 'g/dl', 12, 17.5], ['Leukozyten', 'G/l', 4, 10], ['Thrombozyten', 'G/l', 150, 400]]],
    ['Stoffwechsel', [['Glukose nüchtern', 'mg/dl', 70, 100], ['HbA1c', '%', 4, 5.7]]],
    ['Blutfette', [['Cholesterin gesamt', 'mg/dl', 0, 200], ['LDL-Cholesterin', 'mg/dl', 0, 130], ['HDL-Cholesterin', 'mg/dl', 40, 200], ['Triglyzeride', 'mg/dl', 0, 150]]],
    ['Niere', [['Kreatinin', 'mg/dl', 0.6, 1.2], ['eGFR', 'ml/min', 60, 200]]],
    ['Leber', [['GOT (AST)', 'U/l', 0, 35], ['GPT (ALT)', 'U/l', 0, 35], ['GGT', 'U/l', 0, 40]]],
    ['Weitere', [['TSH', 'mU/l', 0.4, 4], ['CRP', 'mg/l', 0, 5]]]
  ];
  const LAB_PARAMS = Object.fromEntries(LAB_GROUPS.flatMap(([, ps]) => ps).map(([name, unit, min, max]) => [name, { unit, min, max }]));
  const labFlag = (name, wert) => { const r = LAB_PARAMS[name]; if (!r) return ''; if (wert < r.min) return 'low'; if (wert > r.max) return 'high'; return ''; };
  const numFmt = (n) => String(n).replace('.', ',');

  function sparkline(values) {
    const w = 90, hh = 26;
    const min = Math.min(...values), max = Math.max(...values);
    const x = (i) => 3 + ((w - 6) * i) / Math.max(1, values.length - 1);
    const y = (v) => (max === min ? hh / 2 : 3 + (hh - 6) * (1 - (v - min) / (max - min)));
    return svgEl('svg', { viewBox: `0 0 ${w} ${hh}`, class: 'spark' },
      svgEl('polyline', { points: values.map((v, i) => `${x(i)},${y(v)}`).join(' '), fill: 'none', stroke: '#4cc9f0', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }),
      svgEl('circle', { cx: x(values.length - 1), cy: y(values[values.length - 1]), r: 3.4, fill: '#ffd166' }));
  }

  function viewLabor(l) {
    const p = l.p;
    openModal(`Laborbefund – ${p.vorname} ${p.nachname}`, (modal) => {
      const history = (name) => p.labor.filter((x) => x.datum <= l.datum && x.werte.some((w) => w.name === name)).sort((a, b) => a.datum.localeCompare(b.datum)).map((x) => x.werte.find((w) => w.name === name).wert);
      const tbl = h('table', { class: 'lab-table' }, h('thead', {}, h('tr', {}, ['Parameter', 'Wert', 'Einheit', 'Referenz', 'Bewertung', 'Verlauf'].map((t) => h('th', { text: t })))),
        h('tbody', {}, l.werte.map((w) => {
          const r = LAB_PARAMS[w.name] || { unit: '', min: 0, max: 0 };
          const f = labFlag(w.name, w.wert);
          const hist = history(w.name);
          return h('tr', { class: f }, h('td', { text: w.name }), h('td', { class: 'lab-val', text: numFmt(w.wert) }), h('td', { text: r.unit }),
            h('td', { text: r.min === 0 ? `< ${numFmt(r.max)}` : r.max >= 200 ? `> ${numFmt(r.min)}` : `${numFmt(r.min)} – ${numFmt(r.max)}` }),
            h('td', {}, f ? h('span', { class: 'pill ' + (f === 'high' ? 'danger' : 'warn'), text: f === 'high' ? '↑ erhöht' : '↓ erniedrigt' }) : h('span', { class: 'pill ok', text: 'normal' })),
            h('td', {}, hist.length > 1 ? sparkline(hist) : h('span', { class: 'soft small', text: '–' })));
        })));
      modal.appendChild(h('div', { class: 'doc-preview paper-lab' }, letterhead(), h('div', { class: 'paper-title', text: 'Laborbefund' }),
        h('div', { class: 'pgrid' }, field('Patient', `${p.nachname}, ${p.vorname}`), field('geboren am', fmtDate(p.geb)), field('Entnahme', fmtDate(l.datum)), field('Labor', l.labor)), tbl,
        l.bemerkung ? h('div', { class: 'pgrid one' }, field('Bemerkung', l.bemerkung)) : null,
        demoNote('Referenzbereiche sind allgemeine Beispielwerte; maßgeblich sind die Referenzwerte des jeweiligen Labors.')));
      const abn = l.werte.filter((w) => labFlag(w.name, w.wert));
      modal.appendChild(h('div', { class: 'modal-actions' },
        btn('In Karteikarte übernehmen', { icon: 'file', onclick: () => { vermerk(p, 'Befund', `Labor ${fmtDate(l.datum)}: ${abn.length ? abn.map((w) => `${w.name} ${numFmt(w.wert)} ${LAB_PARAMS[w.name].unit} (${labFlag(w.name, w.wert) === 'high' ? '↑' : '↓'})`).join(', ') : 'alle Werte im Referenzbereich'}`); commit(); closeModal(); toast('Befund in die Karteikarte übernommen.'); } }),
        btn('Schließen', { onclick: closeModal }), btn('Drucken', { kind: 'primary', icon: 'print', onclick: () => window.print() })));
    }, { wide: true });
  }

  function newLabor() {
    if (needPatients()) return;
    openModal('Laborergebnis eintragen', (modal) => {
      const form = h('form', {});
      const pSel = h('select', {}, patientOptions().map((o) => h('option', { value: o.value, text: o.label })));
      const datum = h('input', { type: 'date', value: todayISO() });
      const labor = h('input', { type: 'text', value: 'Labor Beispiel GmbH' });
      form.appendChild(h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'Patient' }), pSel), h('div', { class: 'field' }, h('label', { text: 'Entnahmedatum' }), datum), h('div', { class: 'field' }, h('label', { text: 'Labor' }), labor)));
      const inputs = {};
      const grid = h('div', { class: 'lab-form' });
      LAB_GROUPS.forEach(([group, ps]) => {
        grid.appendChild(h('h3', { text: group }));
        ps.forEach(([name, unit, min, max]) => {
          inputs[name] = h('input', { type: 'text', placeholder: '–', inputmode: 'decimal' });
          grid.appendChild(h('div', { class: 'lab-line' }, h('label', { text: name }), inputs[name], h('span', { class: 'soft small', text: `${unit} · ${min === 0 ? '< ' + numFmt(max) : max >= 200 ? '> ' + numFmt(min) : numFmt(min) + '–' + numFmt(max)}` })));
        });
      });
      form.appendChild(grid);
      const bem = h('input', { type: 'text', placeholder: 'Bemerkung (optional)' });
      form.appendChild(h('div', { class: 'field', style: 'margin-top:12px' }, h('label', { text: 'Bemerkung' }), bem));
      form.appendChild(h('div', { class: 'modal-actions' }, btn('Abbrechen', { onclick: closeModal }), h('button', { class: 'btn primary', type: 'submit' }, icon('save'), 'Speichern')));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const werte = Object.entries(inputs).map(([name, el]) => [name, parseFloat(el.value.replace(',', '.'))]).filter(([, v]) => Number.isFinite(v)).map(([name, wert]) => ({ name, wert }));
        if (!werte.length) { toast('Bitte mindestens einen Wert eintragen.'); return; }
        const p = getPatient(pSel.value);
        const l = { id: uid(), datum: datum.value, labor: labor.value.trim() || 'Labor', werte, bemerkung: bem.value.trim() };
        p.labor.push(l);
        persist(); render(); closeModal(); viewLabor({ ...l, p });
        toast('Laborergebnis gespeichert.');
      });
      modal.appendChild(form);
    }, { wide: true });
  }

  function renderLabor() {
    const all = allOf('labor').sort((a, b) => b.datum.localeCompare(a.datum));
    const abnormal = (l) => l.werte.filter((w) => labFlag(w.name, w.wert)).length;
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', { text: 'Laborergebnisse' }), h('p', { text: 'Befunde erfassen, Auffälliges sofort sehen, Verläufe vergleichen.' })), btn('Ergebnis eintragen', { kind: 'primary', icon: 'plus', onclick: newLabor })));
    v.appendChild(h('div', { class: 'grid cols-3' },
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('flask')), h('div', {}, h('div', { class: 'stat-num', text: String(all.length) }), h('div', { class: 'soft small', text: 'Befunde' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('bell')), h('div', {}, h('div', { class: 'stat-num', text: String(all.filter((l) => abnormal(l) > 0).length) }), h('div', { class: 'soft small', text: 'mit auffälligen Werten' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('clock')), h('div', {}, h('div', { class: 'stat-num', text: String(all.filter((l) => l.datum >= addDays(todayISO(), -30)).length) }), h('div', { class: 'soft small', text: 'in den letzten 30 Tagen' })))));
    v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' }, all.length ? h('div', { class: 'list' }, all.map((l) => {
      const n = abnormal(l);
      return h('div', { class: 'item clickable', onclick: () => viewLabor(l) }, h('img', { class: 'avatar', src: avatarSrc(l.p), alt: '' }),
        h('div', { class: 'grow' }, h('div', { class: 'title', text: `${fullName(l.p)} – ${fmtDate(l.datum)}` }), h('div', { class: 'soft small', text: `${l.labor} · ${l.werte.length} Werte` })),
        h('span', { class: 'pill ' + (n ? 'danger' : 'ok'), text: n ? `${n} auffällig` : 'unauffällig' }),
        btn('', { kind: 'small', icon: 'trash', onclick: (e) => { e.stopPropagation(); confirmModal('Laborbefund wirklich löschen?', () => { l.p.labor = l.p.labor.filter((x) => x.id !== l.id); commit(); }); } }));
    })) : h('div', { class: 'empty', text: 'Noch keine Laborergebnisse.' })));
    return v;
  }

  // ---------------------------------------------------------------
  // Karte einlesen (Versichertenkarte – Demo-Simulation)
  // ---------------------------------------------------------------
  const kvnrOf = (p) => p.kvnr || '';
  function demoKarten() {
    const fromPatients = state.patienten.slice(0, 3).map((p) => ({ vorname: p.vorname, nachname: p.nachname, geb: p.geb, kasse: p.kasse || 'Krankenkasse', kvnr: p.kvnr || 'Z000000000', versicherung: p.versicherung, label: `${p.vorname} ${p.nachname} (in der Praxis bekannt)` }));
    return [...fromPatients, { vorname: 'Sophie', nachname: 'Kramer', geb: '1993-06-21', kasse: 'Techniker Krankenkasse', kvnr: 'K482916037', versicherung: 'gesetzlich', label: 'Sophie Kramer (neue Patientin)' }];
  }
  function findPatientByCard(c) {
    return state.patienten.find((p) => (c.kvnr && p.kvnr === c.kvnr) || (p.nachname.toLowerCase() === c.nachname.toLowerCase() && p.vorname.toLowerCase() === c.vorname.toLowerCase() && p.geb === c.geb));
  }
  function startReading(card) {
    view.karte = { phase: 'reading', card };
    render();
    setTimeout(() => {
      if (!view.karte || view.karte.card !== card) return;
      view.karte.phase = 'done';
      const found = findPatientByCard(card);
      state.karten.unshift({ id: uid(), ts: Date.now(), name: `${card.vorname} ${card.nachname}`, kvnr: card.kvnr, ergebnis: found ? 'Patient gefunden' : 'Neue Person' });
      state.karten = state.karten.slice(0, 15);
      persist(); render();
    }, 2200);
  }
  function cardVisual(card, phase) {
    return h('div', { class: 'egk-wrap' },
      h('div', { class: 'egk ' + (phase === 'reading' ? 'inserting' : phase === 'done' ? 'inserted' : '') },
        h('div', { class: 'egk-top' }, h('span', { text: 'Gesundheitskarte' }), h('small', { text: 'DEMO' })),
        h('div', { class: 'egk-chip' }),
        h('div', { class: 'egk-name', text: card ? `${card.vorname} ${card.nachname}` : 'Vorname Nachname' }),
        h('div', { class: 'egk-meta', text: card ? `${card.kasse} · ${card.kvnr}` : 'Krankenkasse · Versichertennummer' }),
        h('div', { class: 'egk-sheen' })),
      h('div', { class: 'egk-reader' }, h('div', { class: 'egk-slot' }), h('div', { class: 'egk-led ' + (phase === 'reading' ? 'busy' : phase === 'done' ? 'ok' : '') })));
  }
  function importCardFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!d.vorname || !d.nachname || !d.geb) throw new Error('fehlende Felder');
        startReading({ vorname: String(d.vorname), nachname: String(d.nachname), geb: String(d.geb), kasse: String(d.kasse || ''), kvnr: String(d.kvnr || ''), versicherung: d.versicherung === 'privat' ? 'privat' : 'gesetzlich' });
      } catch (err) { toast('Datei ist keine gültige Kartendatei.'); }
    };
    reader.readAsText(file);
  }
  function erezeptPanel(p) {
    const list = p.rezepte.filter(isE).sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 4);
    return h('div', { class: 'er-panel' },
      h('div', { class: 'card-title' }, h('h3', { text: 'E-Rezept' }), btn('E-Rezept ausstellen', { kind: 'primary small', icon: 'pill', onclick: () => newRezept({ patientId: p.id, art: 'e' }) })),
      list.length ? h('div', { class: 'list' }, list.map((r) => {
        const [cls, txt] = eStatus(r);
        return h('div', { class: 'item' }, h('span', { style: 'color:var(--accent)' }, icon('pill')),
          h('div', { class: 'grow' }, h('div', { class: 'title', text: r.medikament }), h('div', { class: 'soft small', text: `${r.erezept.id} · bis ${fmtDate(r.gueltigBis)}` })),
          h('span', { class: 'pill ' + cls, text: txt }),
          btn('', { kind: 'small', icon: 'file', onclick: () => viewErezept({ ...r, p }) }),
          r.erezept.abgabe === 'offen' ? btn('Apotheke', { kind: 'small', onclick: () => { r.erezept.abgabe = 'eingelöst'; vermerk(p, 'Notiz', `E-Rezept eingelöst (Demo): ${r.medikament}`); commit(); toast('Einlösung in der Apotheke simuliert.'); } }) : null);
      })) : h('div', { class: 'empty', text: 'Noch kein E-Rezept für diese Karte.' }));
  }
  function renderKarte() {
    const k = view.karte || { phase: 'idle', card: null };
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', { text: 'Karte & E-Rezept' }), h('p', { text: 'Versichertenkarte lesen, Patient finden – und das E-Rezept direkt ausstellen.' }))));
    const kartenSel = h('select', {}, demoKarten().map((c, i) => h('option', { value: String(i), text: c.label })));
    const file = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    file.addEventListener('change', () => { if (file.files[0]) importCardFile(file.files[0]); });
    const left = h('div', { class: 'card', style: 'margin:0' }, h('h2', { style: 'margin-bottom:14px', text: 'Kartenterminal' }), cardVisual(k.card, k.phase),
      k.phase === 'reading' ? h('div', { class: 'read-progress' }, h('div', { class: 'read-bar' }), h('div', { class: 'soft', text: 'Karte wird gelesen …' })) : null,
      h('div', { class: 'field', style: 'margin-top:16px' }, h('label', { text: 'Demo-Karte wählen' }), kartenSel),
      h('div', { class: 'row' },
        btn('Karte einlesen', { kind: 'primary', icon: 'card', onclick: () => startReading(demoKarten()[Number(kartenSel.value)]) }),
        btn('Aus Datei', { icon: 'file', onclick: () => file.click() }), file,
        btn('Manuell', { icon: 'edit', onclick: () => formModal('Kartendaten manuell eingeben', [
          { key: 'vorname', label: 'Vorname', half: true }, { key: 'nachname', label: 'Nachname', half: true },
          { key: 'geb', label: 'Geburtsdatum', type: 'date', half: true }, { key: 'kvnr', label: 'Versichertennummer', half: true },
          { key: 'kasse', label: 'Krankenkasse' }
        ], (f) => { if (!f.vorname || !f.nachname || !f.geb) { toast('Bitte Name und Geburtsdatum angeben.'); return false; } setTimeout(() => startReading({ ...f, versicherung: 'gesetzlich' }), 50); }, 'Einlesen') })),
      h('p', { class: 'soft small', style: 'margin-top:14px', text: 'Demo: Echte Gesundheitskarten lesen Sie nur mit einem zugelassenen Kartenterminal und Anbindung an die Telematikinfrastruktur (Konnektor). Hier wird das Einlesen simuliert.' }));

    let right;
    if (k.phase === 'done' && k.card) {
      const c = k.card;
      const found = findPatientByCard(c);
      right = h('div', { class: 'card', style: 'margin:0' }, h('div', { class: 'card-title' }, h('h2', { text: 'Gelesene Daten' }), h('span', { class: 'pill ' + (found ? 'ok' : 'warn'), text: found ? 'Patient gefunden' : 'Neue Person' })),
        h('dl', { class: 'kv' }, h('dt', { text: 'Name' }), h('dd', { text: `${c.nachname}, ${c.vorname}` }), h('dt', { text: 'Geburtsdatum' }), h('dd', { text: `${fmtDate(c.geb)} (${ageFrom(c.geb)} Jahre)` }),
          h('dt', { text: 'Versichertennr.' }), h('dd', { text: c.kvnr || '–' }), h('dt', { text: 'Krankenkasse' }), h('dd', { text: c.kasse || '–' }), h('dt', { text: 'Versichertenart' }), h('dd', { text: c.versicherung })),
        h('div', { class: 'row', style: 'margin-top:18px' },
          found ? btn('Akte öffnen', { kind: 'primary', icon: 'file', onclick: () => goto('patienten', { patientId: found.id, patientTab: 'uebersicht' }) }) : null,
          found ? btn('Daten übernehmen', { icon: 'save', onclick: () => { found.kvnr = c.kvnr || found.kvnr; found.kasse = c.kasse || found.kasse; found.versicherung = c.versicherung; commit(); toast('Kartendaten in die Akte übernommen.'); } }) : null,
          found ? btn('Ins Wartezimmer', { icon: 'clock', onclick: () => checkIn(found.id) }) : null,
          !found ? btn('Als neuen Patienten anlegen', { kind: 'primary', icon: 'plus', onclick: () => {
            const np = { id: uid(), vorname: c.vorname, nachname: c.nachname, geb: c.geb, geschlecht: 'w', versicherung: c.versicherung, kasse: c.kasse, kvnr: c.kvnr, telefon: '', allergien: '', avatar: AVATARS[state.patienten.length % AVATARS.length], diagnosen: [], medikation: [], karte: [], bilder: [], vorsorge: [], impfungen: [], leistungen: [], labor: [], rezepte: [], krankmeldungen: [], ueberweisungen: [] };
            state.patienten.push(np); view.karte = { phase: 'idle', card: null }; goto('patienten', { patientId: np.id, patientTab: 'uebersicht' }); persist(); toast('Patient aus Kartendaten angelegt.');
          } }) : null),
        found ? erezeptPanel(found) : h('p', { class: 'soft small', style: 'margin-top:16px', text: 'E-Rezepte können ausgestellt werden, sobald die Person als Patient angelegt ist.' }));
    } else {
      right = h('div', { class: 'card empty', style: 'margin:0', text: k.phase === 'reading' ? 'Daten werden übertragen …' : 'Wählen Sie eine Demo-Karte und klicken Sie auf „Karte einlesen“.' });
    }
    v.appendChild(h('div', { class: 'grid cols-2' }, left, right));
    v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:12px', text: 'Letzte Einlesevorgänge' }),
      state.karten.length ? h('div', { class: 'list' }, state.karten.slice(0, 6).map((e) => h('div', { class: 'item' }, h('span', { style: 'color:var(--accent)' }, icon('card')), h('div', { class: 'grow' }, h('div', { class: 'title', text: e.name }), h('div', { class: 'soft small', text: `${fmtStamp(e.ts)} · ${e.kvnr || 'ohne Nummer'}` })), h('span', { class: 'pill info', text: e.ergebnis })))) : h('div', { class: 'empty', text: 'Noch keine Karte eingelesen.' })));
    return v;
  }

  // ---------------------------------------------------------------
  // Auswertung
  // ---------------------------------------------------------------
  function bars(title, rows, fmt) {
    const max = Math.max(1, ...rows.map((r) => r[1]));
    return h('div', { class: 'card', style: 'margin:0' }, h('h2', { style: 'margin-bottom:14px', text: title }),
      rows.length ? h('div', { class: 'bars' }, rows.map(([label, val], i) => h('div', { class: 'bar-row' },
        h('div', { class: 'bar-label', text: label }),
        h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: `width:${(val / max) * 100}%;animation-delay:${i * 0.08}s` })),
        h('div', { class: 'bar-val', text: fmt ? fmt(val) : String(val) }))))
        : h('div', { class: 'empty', text: 'Keine Daten.' }));
  }

  function renderAuswertung() {
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', { text: 'Auswertung' }), h('p', { text: 'Ihre Praxis in Zahlen – ohne Excel.' }))));
    const ages = [['0–17', 0, 17], ['18–39', 18, 39], ['40–64', 40, 64], ['65+', 65, 200]].map(([l, lo, hi]) => [l, state.patienten.filter((p) => { const a = ageFrom(p.geb); return a >= lo && a <= hi; }).length]);
    const diag = {};
    state.patienten.forEach((p) => p.diagnosen.forEach((d) => { diag[d.text] = (diag[d.text] || 0) + 1; }));
    const topDiag = Object.entries(diag).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const wd = [1, 2, 3, 4, 5].map((d) => [WEEKDAYS_LONG[d], state.termine.filter((t) => new Date(t.datum + 'T12:00:00').getDay() === d).length]);
    const monthly = {};
    allLeistungen().forEach((e) => { monthly[e.datum.slice(0, 7)] = (monthly[e.datum.slice(0, 7)] || 0) + e.betrag; });
    const months = Object.entries(monthly).sort().slice(-6).map(([k, val]) => [MONTHS[Number(k.slice(5)) - 1] + ' ' + k.slice(2, 4), val]);
    const ins = [['gesetzlich', state.patienten.filter((p) => p.versicherung === 'gesetzlich').length], ['privat', state.patienten.filter((p) => p.versicherung === 'privat').length]];
    v.appendChild(h('div', { class: 'grid cols-2' }, bars('Altersverteilung', ages), bars('Häufigste Diagnosen', topDiag), bars('Termine nach Wochentag', wd), bars('Honorar pro Monat', months, euro), bars('Versicherung', ins)));
    return v;
  }

  // ---------------------------------------------------------------
  // Demo & Medien, Hilfe
  // ---------------------------------------------------------------
  const MEDIA_IMAGES = [
    ['Instagram-Post 1 – Logo', 'media/instagram/post-1-logo.png'],
    ['Instagram-Post 2 – Patientenakte', 'media/instagram/post-2-akte.png'],
    ['Instagram-Post 3 – Wartezimmer', 'media/instagram/post-3-wartezimmer.png'],
    ['Instagram-Post 4 – Dokumente', 'media/instagram/post-4-dokumente.png'],
    ['Instagram-Post 5 – Vorsorge', 'media/instagram/post-5-vorsorge.png'],
    ['Instagram-Post 6 – Karte einlesen', 'media/instagram/post-6-karte.png'],
    ['Instagram-Post 9 – E-Rezept', 'media/instagram/post-9-erezept.png'],
    ['Instagram-Post 10 – Krankmeldung digital', 'media/instagram/post-10-au-digital.png'],
    ['Instagram-Post 11 – Medikamente als E-Rezept', 'media/instagram/post-11-erezept-menue.png'],
    ['Instagram-Post 12 – Medikamentenkatalog', 'media/instagram/post-12-katalog.png'],
    ['Instagram-Post 7 – Laborwerte', 'media/instagram/post-7-labor.png'],
    ['Instagram-Post 8 – Krankmeldung', 'media/instagram/post-8-krankmeldung.png'],
    ['Story / Reel-Cover', 'media/instagram/story-cover.png']
  ];

  function downloadLink(label, href, filename) {
    const a = h('a', { class: 'btn primary', href, download: filename });
    a.appendChild(icon('download'));
    a.appendChild(document.createTextNode(label));
    return a;
  }

  function renderMedien() {
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', { text: 'Demo & Medien' }), h('p', { text: 'Vorführvideo, Social-Media-Reel und Instagram-Bilder zum Herunterladen.' }))));
    v.appendChild(h('div', { class: 'card' }, h('div', { class: 'card-title' }, h('h2', { text: 'Demoversion – Video mit Musik' }), downloadLink('Demo-Video herunterladen', 'media/allgemein-docs-demo.mp4', 'Allgemein-Docs-Demo.mp4')),
      h('video', { class: 'media-video', src: 'media/allgemein-docs-demo.mp4', controls: true, preload: 'metadata', poster: 'media/demo-poster.jpg' })));
    v.appendChild(h('div', { class: 'grid cols-2' },
      h('div', { class: 'card', style: 'margin:0' }, h('div', { class: 'card-title' }, h('h2', { text: 'Social-Media-Reel (9:16)' }), downloadLink('Reel herunterladen', 'media/allgemein-docs-reel.mp4', 'Allgemein-Docs-Reel.mp4')),
        h('video', { class: 'media-video reel', src: 'media/allgemein-docs-reel.mp4', controls: true, preload: 'metadata', poster: 'media/instagram/story-cover.png' })),
      h('div', { class: 'card', style: 'margin:0' }, h('h2', { style: 'margin-bottom:10px', text: 'Hinweis' }), h('p', { class: 'soft', text: 'Beide Videos sind mit der gleichen Hintergrundmusik unterlegt, die exakt so lang ist wie das Video. Reel: 1080×1920 (Instagram Reels, TikTok, Stories). Bilder: 1080×1080 (Feed).' }))));
    v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:14px', text: 'Instagram-Bilder (3D-Hochglanz)' }),
      h('div', { class: 'gallery' }, MEDIA_IMAGES.map(([t, src]) => h('figure', { class: 'figure', style: 'cursor:default' }, h('img', { src, alt: t }),
        h('figcaption', { class: 'row' }, h('span', { style: 'flex:1', text: t }), (() => { const a = h('a', { class: 'btn small', href: src, download: src.split('/').pop() }); a.appendChild(icon('download')); a.appendChild(document.createTextNode('PNG')); return a; })()))))));
    return v;
  }

  function renderHilfe() {
    const v = h('div', { class: 'view' });
    v.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', { text: 'Hilfe & Tipps' }), h('p', { text: 'In fünf Minuten startklar.' }))));
    const steps = [
      ['1', 'Patient anlegen', 'Unter „Patienten“ auf „Neuer Patient“ klicken – Name genügt, alles andere kann später ergänzt werden.'],
      ['2', 'Termin vergeben', 'Im Terminkalender einen Tag wählen und „Neuer Termin“ klicken. Beim Eintreffen: „Eingetroffen“.'],
      ['3', 'Behandeln & dokumentieren', 'Im Wartezimmer „Aufrufen“, dann in der Karteikarte mit Textbausteinen in Sekunden dokumentieren.'],
      ['4', 'Rezept & Co. drucken', 'Unter „Dokumente“ Vorlage wählen – Patientendaten, Diagnosen und Medikation werden automatisch eingesetzt.'],
      ['5', 'Karte, Rezept, AU, Überweisung', 'Karte einlesen, dann Rezept, Krankmeldung oder Überweisung ausstellen – alles landet automatisch in der Karteikarte.'],
      ['6', 'E-Rezept & digitale Krankmeldung', 'Karte einlesen und E-Rezept ausstellen, oder im Menü „E-Rezept“ mehrere Medikamente auf einmal verordnen. Krankmeldungen gehen digital an Krankenkasse und Arbeitgeber (simuliert).'],
      ['7', 'Labor & Vorsorge im Blick', 'Laborwerte mit Ampel und Verlauf, „Vorsorge & Recall“ und „Impfungen“ zeigen sofort, wer fällig ist.']
    ];
    v.appendChild(h('div', { class: 'grid cols-2' }, steps.map(([n, t, d]) => h('div', { class: 'card step', style: 'margin:0' }, h('div', { class: 'step-num', text: n }), h('div', {}, h('h3', { text: t }), h('p', { class: 'soft', style: 'margin:4px 0 0', text: d }))))));
    v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:12px', text: 'Tastenkürzel' }),
      h('dl', { class: 'kv' },
        h('dt', {}, h('kbd', { text: 'Strg K' })), h('dd', { text: 'Globale Suche (Patienten, Vorlagen, Aufgaben)' }),
        h('dt', {}, h('kbd', { text: 'Strg 1 – 9, 0' })), h('dd', { text: 'Menüpunkte direkt öffnen (in Menü-Reihenfolge)' }),
        h('dt', {}, h('kbd', { text: 'Esc' })), h('dd', { text: 'Fenster schließen' }))));
    return v;
  }

  // ---------------------------------------------------------------
  // Globale Suche (Strg+K)
  // ---------------------------------------------------------------
  function openSearch() {
    openModal('Suchen', (modal) => {
      const input = h('input', { type: 'text', placeholder: 'Patient, Vorlage oder Aufgabe …' });
      const results = h('div', { class: 'search-results list' });
      const run = () => {
        const q = input.value.trim().toLowerCase();
        results.textContent = '';
        if (!q) return;
        const hits = [];
        state.patienten.filter((p) => `${p.vorname} ${p.nachname} ${fmtDate(p.geb)} ${p.diagnosen.map((d) => d.text).join(' ')}`.toLowerCase().includes(q))
          .forEach((p) => hits.push(h('div', { class: 'item clickable', onclick: () => { closeModal(); goto('patienten', { patientId: p.id, patientTab: 'uebersicht' }); } },
            h('img', { class: 'avatar', src: avatarSrc(p), alt: '' }), h('div', { class: 'grow' }, h('div', { class: 'title', text: `${p.vorname} ${p.nachname}` }), h('div', { class: 'soft small', text: 'Patient · ' + fmtDate(p.geb) })))));
        state.vorlagen.filter((t) => t.titel.toLowerCase().includes(q))
          .forEach((t) => hits.push(h('div', { class: 'item clickable', onclick: () => { closeModal(); goto('dokumente'); } }, icon('file'), h('div', { class: 'grow', text: 'Vorlage · ' + t.titel }))));
        state.aufgaben.filter((a) => a.text.toLowerCase().includes(q))
          .forEach((a) => hits.push(h('div', { class: 'item clickable', onclick: () => { closeModal(); goto('aufgaben'); } }, icon('check'), h('div', { class: 'grow', text: 'Aufgabe · ' + a.text }))));
        if (!hits.length) results.appendChild(h('div', { class: 'empty', text: 'Nichts gefunden.' }));
        hits.slice(0, 12).forEach((x) => results.appendChild(x));
      };
      input.addEventListener('input', run);
      modal.appendChild(input);
      modal.appendChild(results);
      setTimeout(() => input.focus(), 30);
    });
  }

  // ---------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------
  function normalize(data) {
    const base = demoData();
    const s = Object.assign({}, data);
    s.einstellungen = Object.assign({ praxis: DEFAULT_PRAXIS, arzt: 'Praxisinhaber/in' }, s.einstellungen);
    s.patienten = (s.patienten || []).map((p) => Object.assign({ diagnosen: [], medikation: [], karte: [], bilder: [], vorsorge: [], impfungen: [], leistungen: [], labor: [], rezepte: [], krankmeldungen: [], ueberweisungen: [], kvnr: '', allergien: '', avatar: 'a1' }, p));
    s.karten = s.karten || [];
    s.katalogExtra = s.katalogExtra || [];
    s.termine = s.termine || [];
    s.wartezimmer = s.wartezimmer || [];
    s.aufgaben = s.aufgaben || [];
    s.bausteine = s.bausteine || base.bausteine;
    s.vorlagen = s.vorlagen && s.vorlagen.length ? s.vorlagen : base.vorlagen;
    return s;
  }

  async function init() {
    document.getElementById('search-icon').appendChild(icon('search'));
    document.getElementById('search-btn').addEventListener('click', () => { document.getElementById('sidebar').classList.remove('open'); openSearch(); });
    document.getElementById('menu-toggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
      if ((e.ctrlKey || e.metaKey) && /^[0-9]$/.test(e.key)) {
        const target = NAV_FLAT[e.key === '0' ? 9 : Number(e.key) - 1];
        if (target) { e.preventDefault(); closeModal(); goto(target[0]); }
      }
      if (e.key === 'Escape') closeModal();
    });
    const loaded = await window.docsAPI.loadData();
    state = loaded ? normalize(loaded) : demoData();
    if (!loaded) persist();
    render();
    setInterval(() => { if (view.page === 'wartezimmer' && !closeCurrentModal) render(); }, 30000);
  }

  init();
})();
