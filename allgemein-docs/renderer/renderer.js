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
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4'
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
    const termin = (idx, tag, zeit, dauer, grund, status) => ({ id: uid(), patientId: patienten[idx].id, datum: addDays(today, tag), zeit, dauer, grund, status: status || 'geplant' });
    return {
      version: 1,
      demo: true,
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
    ['start', 'Start', 'home'],
    ['patienten', 'Patienten', 'users'],
    ['termine', 'Terminkalender', 'calendar'],
    ['wartezimmer', 'Wartezimmer', 'clock'],
    ['aufgaben', 'Aufgaben', 'check'],
    ['dokumente', 'Dokumente', 'file'],
    ['einstellungen', 'Einstellungen', 'settings']
  ];

  function goto(page, extra) {
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
      termine: state.termine.filter((t) => t.datum === todayISO() && t.status !== 'fertig').length
    };
    NAV.forEach(([key, label, ic]) => {
      const b = h('button', { class: 'nav-item' + (view.page === key ? ' active' : ''), type: 'button', onclick: () => goto(key) },
        icon(ic), h('span', { text: label }),
        counts[key] ? h('span', { class: 'badge', text: String(counts[key]) }) : null);
      nav.appendChild(b);
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
    const views = { start: renderStart, patienten: renderPatienten, termine: renderTermine, wartezimmer: renderWartezimmer, aufgaben: renderAufgaben, dokumente: renderDokumente, einstellungen: renderEinstellungen };
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
      ['Patient aufrufen', 'bell', () => goto('wartezimmer')],
      ['Rezept erstellen', 'pill', () => goto('dokumente')],
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
      { key: 'telefon', label: 'Telefon', type: 'tel', value: src.telefon, half: true },
      { key: 'avatar', label: 'Beispielbild', type: 'select', value: src.avatar, half: true, options: AVATARS.map((a, i) => ({ value: a, label: 'Bild ' + (i + 1) })) },
      { key: 'allergien', label: 'Allergien / Unverträglichkeiten', value: src.allergien }
    ], (v) => {
      if (!v.vorname || !v.nachname) { toast('Bitte Vor- und Nachname angeben.'); return false; }
      if (isNew) {
        const np = { id: uid(), ...v, diagnosen: [], medikation: [], karte: [], bilder: [] };
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
      h('div', { class: 'tabs' }, [['uebersicht', 'Übersicht'], ['karte', 'Karteikarte'], ['bilder', 'Bilder & Befunde'], ['dokumente', 'Dokumente']].map(([k, l]) =>
        h('button', { class: 'tab' + (view.patientTab === k ? ' active' : ''), type: 'button', onclick: () => { view.patientTab = k; render(); } }, l)))));

    const tabs = { uebersicht: tabUebersicht, karte: tabKarte, bilder: tabBilder, dokumente: tabDokumente };
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

  function simpleListCard(title, items, textOf, onAdd, onRemove, ic) {
    const card = h('div', { class: 'card' }, h('div', { class: 'card-title' }, h('h2', { text: title }), btn('Hinzufügen', { kind: 'small', icon: 'plus', onclick: onAdd })));
    card.appendChild(items.length
      ? h('div', { class: 'list' }, items.map((it) => h('div', { class: 'item' }, h('span', { class: 'icon', style: 'color:var(--accent)' }, icon(ic)), h('div', { class: 'grow', text: textOf(it) }), btn('', { kind: 'small', icon: 'trash', onclick: () => onRemove(it) }))))
      : h('div', { class: 'empty', text: 'Noch nichts eingetragen.' }));
    return card;
  }

  function tabUebersicht(p) {
    const v = h('div', {});
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:14px', text: 'Stammdaten' }),
      h('dl', { class: 'kv' },
        h('dt', { text: 'Telefon' }), h('dd', { text: p.telefon || '–' }),
        h('dt', { text: 'Versicherung' }), h('dd', { text: `${p.versicherung}${p.kasse ? ', ' + p.kasse : ''}` }),
        h('dt', { text: 'Letzter Eintrag' }), h('dd', { text: p.karte.length ? fmtStamp(Math.max(...p.karte.map((k) => k.ts))) : '–' }))));
    v.appendChild(simpleListCard('Diagnosen', p.diagnosen, (d) => `${d.icd ? d.icd + ' – ' : ''}${d.text}`,
      () => formModal('Diagnose hinzufügen', [{ key: 'icd', label: 'ICD-10-Code (optional)', placeholder: 'z. B. I10' }, { key: 'text', label: 'Diagnose' }], (f) => {
        if (!f.text) return false;
        p.diagnosen.push({ id: uid(), ...f }); commit();
      }),
      (d) => { p.diagnosen = p.diagnosen.filter((x) => x.id !== d.id); commit(); }, 'pulse'));
    v.appendChild(simpleListCard('Medikation', p.medikation, (m) => m.text,
      () => formModal('Medikament hinzufügen', [{ key: 'text', label: 'Medikament und Dosierung', placeholder: 'z. B. Ramipril 5 mg 1-0-0' }], (f) => {
        if (!f.text) return false;
        p.medikation.push({ id: uid(), text: f.text }); commit();
      }),
      (m) => { p.medikation = p.medikation.filter((x) => x.id !== m.id); commit(); }, 'pill'));
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
    s.patienten = (s.patienten || []).map((p) => Object.assign({ diagnosen: [], medikation: [], karte: [], bilder: [], allergien: '', avatar: 'a1' }, p));
    s.termine = s.termine || [];
    s.wartezimmer = s.wartezimmer || [];
    s.aufgaben = s.aufgaben || [];
    s.bausteine = s.bausteine || base.bausteine;
    s.vorlagen = s.vorlagen && s.vorlagen.length ? s.vorlagen : base.vorlagen;
    return s;
  }

  async function init() {
    document.getElementById('search-icon').appendChild(icon('search'));
    document.getElementById('search-btn').addEventListener('click', openSearch);
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
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
