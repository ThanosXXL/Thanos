(function () {
  'use strict';

  // ---------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayISO = () => isoDate(new Date());
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDate(d); };
  const diffDays = (iso) => Math.round((new Date(iso + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / 86400000);
  const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const MO = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const fmtDate = (iso) => (iso ? iso.split('-').reverse().join('.') : '–');
  const fmtShort = (iso) => (iso ? `${iso.slice(8)}.${iso.slice(5, 7)}.` : '');
  const fmtLong = (iso) => { const d = new Date(iso + 'T12:00:00'); return `${WD[d.getDay()]}, ${d.getDate()}. ${MO[d.getMonth()]} ${d.getFullYear()}`; };
  const fmtStamp = (ts) => { const d = new Date(ts); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const numFmt = (n) => String(n).replace('.', ',');
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

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
  const NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    kids.flat().forEach((c) => c && el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return el;
  }
  const ICONS = {
    home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
    calendar: 'M4 6h16v15H4zM4 10h16M8 3v6M16 3v6',
    pill: 'M10.5 20.5l-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7M8.5 8.5l7 7',
    pulse: 'M3 12h4l3-8 4 16 3-8h4',
    file: 'M6 3h9l5 5v13H6zM14 3v6h6M9 13h8M9 17h8',
    chat: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0',
    plus: 'M12 5v14M5 12h14',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    save: 'M5 3h12l4 4v14H5zM8 3v6h8V3M8 21v-7h8v7',
    image: 'M3 5h18v14H3zM8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4M21 16l-5-5-8 8',
    send: 'M3 11l18-8-8 18-2-8z',
    check: 'M4 12l5 5L20 6',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2',
    print: 'M7 9V3h10v6M6 18H4v-7h16v7h-2M7 14h10v7H7z',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5L16 9',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3',
    play: 'M5 4l15 8-15 8zM3 21h18',
    help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01',
    download: 'M12 3v12M7 11l5 5 5-5M4 21h16',
    flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8',
    thermo: 'M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0M12 8v8',
    swap: 'M4 8h13l-3-3M20 16H7l3 3',
    card: 'M3 6h18v12H3zM3 10h18M7 15h4',
    book: 'M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 21V5M9 7h6M9 11h6',
    lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3M12 15v2',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
    qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20h1',
    syringe: 'M18 2l4 4M16 4l4 4M14 6l4 4L9 19l-4-4zM5 15l-3 3M2 22l3-3M11 9l4 4',
    chart: 'M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-9',
    key: 'M15 9a4 4 0 1 0-3.5 4L5 19.5V22h3v-2h2v-2h2l1.5-1.5A4 4 0 0 0 15 9M16 7h.01',
    globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
    close: 'M6 6l12 12M18 6L6 18'
  };
  const icon = (n) => s('svg', { viewBox: '0 0 24 24', fill: 'none', 'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, s('path', { d: ICONS[n] || ICONS.file }));
  const btn = (label, o = {}) => h('button', { class: 'btn ' + (o.kind || ''), type: 'button', onclick: o.onclick, id: o.id, disabled: o.disabled, title: o.title }, o.icon ? icon(o.icon) : null, label);
  const toast = (m) => { const t = h('div', { class: 'toast', role: 'status', text: m }); document.getElementById('toast-root').appendChild(t); setTimeout(() => t.remove(), 3200); };
  const orb = (ic, color) => h('span', { class: 'orb-ic ' + (color || 'blue'), 'aria-hidden': 'true' }, icon(ic));

  // ---------------------------------------------------------------
  // Zustand, Beispieldaten
  // ---------------------------------------------------------------
  const ZEITEN = ['morgens', 'mittags', 'abends', 'nachts'];
  const USER_ID = 'patient';
  let state = null;       // entschlüsselte Daten (nur im Arbeitsspeicher, solange entsperrt)
  let envelope = null;    // verschlüsselter Umschlag (so liegt er in der Datei)
  let session = null;     // Sitzungsschlüssel
  let saveChain = Promise.resolve();
  let lastActivity = Date.now();
  const view = { page: 'start' };

  const rndDigits = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b % 10).join('');
  const rndHex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
  const newErezeptMeta = () => ({ id: `160.${rndDigits(3)}.${rndDigits(3)}.${rndDigits(3)}.${rndDigits(3)}.${rndDigits(2)}`, code: rndHex(32) });

  const DEFAULT_EINSTELLUNGEN = () => ({
    autoLockMin: 5,
    letzteSicherung: 0,
    einwilligungen: { erinnerungen: Date.now(), befundbilder: Date.now() },
    angelegt: Date.now()
  });
  const EMPTY_KARTE = () => ({ kasse: '', kvnr: '', status: 'Mitglied', versichertenart: 'Pflichtversichert', beginn: '', gueltigBis: '', ik: '' });

  function emptyData() {
    return {
      demo: false,
      profil: { name: 'Patient/in', geb: '', allergien: '', notfall: '', praxis: '', avatar: 'a1' },
      termine: [], medikamente: [], einnahmen: {}, werte: [], befunde: [], nachrichten: [],
      labor: [], rezepte: [], krankmeldungen: [], ueberweisungen: [], karte: EMPTY_KARTE(), vorsorge: [], impfungen: [],
      einstellungen: DEFAULT_EINSTELLUNGEN(), sicherheitslog: []
    };
  }

  function demoData() {
    const t = todayISO();
    const v = (back, sys, dia, puls, gew) => ({ id: uid(), datum: addDays(t, -back), sys, dia, puls, gewicht: gew });
    const lab = (back, labor, vals) => ({ id: uid(), datum: addDays(t, -back), labor, werte: Object.entries(vals).map(([name, wert]) => ({ name, wert })) });
    const rez = (back, medikament, packung, anzahl, gueltigTage, status) => ({ id: uid(), datum: addDays(t, -back), medikament, packung, anzahl, arzt: 'Dr. med. Petra Lindner', gueltigBis: addDays(t, -back + gueltigTage), status, eingeloest: status === 'eingelöst' ? addDays(t, -back + 3) : '', erezept: newErezeptMeta() });
    return Object.assign(emptyData(), {
      demo: true,
      profil: { name: 'Anna Berger', geb: '1978-03-14', allergien: 'Penicillin', notfall: 'Markus Berger, 0151 5550123', praxis: 'Praxis für Allgemeinmedizin, Dr. Lindner', avatar: 'a1' },
      termine: [
        { id: uid(), datum: addDays(t, 2), zeit: '09:30', grund: 'Blutdruckkontrolle', status: 'bestätigt' },
        { id: uid(), datum: addDays(t, 16), zeit: '14:00', grund: 'Impfung', status: 'angefragt' }
      ],
      medikamente: [
        { id: uid(), name: 'Ramipril 5 mg', hinweis: '1 Tablette, vor dem Essen', zeiten: ['morgens'], atc: 'C09AA05' },
        { id: uid(), name: 'Atorvastatin 20 mg', hinweis: '1 Tablette', zeiten: ['abends'], atc: 'C10AA05' },
        { id: uid(), name: 'Vitamin D 1000 IE', hinweis: 'zum Frühstück', zeiten: ['morgens'] }
      ],
      werte: [v(6, 148, 92, 78, 71.4), v(5, 144, 90, 76, 71.2), v(4, 146, 91, 80, 71.3), v(3, 140, 88, 74, 71.0), v(2, 138, 86, 72, 70.9), v(1, 136, 85, 73, 70.8), v(0, 134, 84, 71, 70.8)],
      befunde: [
        { id: uid(), titel: 'Ruhe-EKG', datum: addDays(t, -30), src: 'img/ekg.svg' },
        { id: uid(), titel: 'Röntgen Thorax', datum: addDays(t, -90), src: 'img/roentgen.svg' },
        { id: uid(), titel: 'Blutdruck-Wochenverlauf', datum: addDays(t, -7), src: 'img/blutdruck.svg' }
      ],
      nachrichten: [{ id: uid(), ts: Date.now() - 86400000, typ: 'Nachricht', text: 'Guten Tag, könnte ich bitte das Rezept für Ramipril erneuern lassen? Danke!' }],
      labor: [
        lab(168, 'Beispiel-Labor Nord', { Hämoglobin: 13.6, Leukozyten: 6.9, Thrombozyten: 262, 'Glukose nüchtern': 97, HbA1c: 5.5, 'Cholesterin gesamt': 248, 'LDL-Cholesterin': 164, 'HDL-Cholesterin': 52, Triglyceride: 172, Kreatinin: 0.82, Kalium: 4.4, 'GPT (ALT)': 28, TSH: 2.1, 'Vitamin D (25-OH)': 14 }),
        lab(84, 'Beispiel-Labor Nord', { Hämoglobin: 13.4, Leukozyten: 6.5, Thrombozyten: 255, 'Glukose nüchtern': 103, HbA1c: 5.6, 'Cholesterin gesamt': 214, 'LDL-Cholesterin': 128, 'HDL-Cholesterin': 55, Triglyceride: 151, Kreatinin: 0.85, Kalium: 5.3, 'GPT (ALT)': 41, TSH: 2.4, 'Vitamin D (25-OH)': 18 }),
        lab(9, 'Beispiel-Labor Nord', { Hämoglobin: 13.8, Leukozyten: 6.2, Thrombozyten: 249, 'Glukose nüchtern': 103, HbA1c: 5.5, 'Cholesterin gesamt': 206, 'LDL-Cholesterin': 124, 'HDL-Cholesterin': 57, Triglyceride: 128, Kreatinin: 0.84, Kalium: 4.8, 'GPT (ALT)': 33, TSH: 2.2, 'Vitamin D (25-OH)': 22 })
      ],
      rezepte: [
        rez(4, 'Ramipril 5 mg', 'N3 (100 Stück)', 1, 28, 'offen'),
        rez(12, 'Atorvastatin 20 mg', 'N2 (50 Stück)', 1, 28, 'offen'),
        rez(41, 'Ibuprofen 400 mg', 'N1 (20 Stück)', 1, 28, 'eingelöst'),
        rez(120, 'Amoxicillin 1000 mg', 'N1 (10 Stück)', 1, 28, 'eingelöst')
      ],
      krankmeldungen: [
        { id: uid(), von: addDays(t, -34), bis: addDays(t, -28), art: 'Erstbescheinigung', arzt: 'Dr. med. Petra Lindner', diagnose: 'Akute Bronchitis (J20.9)', kasse: true, kasseAm: Date.now() - 34 * 86400000, ag: true },
        { id: uid(), von: addDays(t, -121), bis: addDays(t, -119), art: 'Erstbescheinigung', arzt: 'Dr. med. Petra Lindner', diagnose: 'Rückenschmerzen (M54.5)', kasse: true, kasseAm: Date.now() - 121 * 86400000, ag: true }
      ],
      ueberweisungen: [
        { id: uid(), datum: addDays(t, -6), fachrichtung: 'Kardiologie', auftrag: 'Echokardiographie und Belastungs-EKG bei Bluthochdruck', arzt: 'Dr. med. Petra Lindner', gueltigBis: addDays(t, 60), status: 'offen' },
        { id: uid(), datum: addDays(t, -2), fachrichtung: 'Augenheilkunde', auftrag: 'Augenhintergrund-Kontrolle bei Bluthochdruck', arzt: 'Dr. med. Petra Lindner', gueltigBis: addDays(t, 14), status: 'offen' },
        { id: uid(), datum: addDays(t, -90), fachrichtung: 'Radiologie', auftrag: 'Röntgen Thorax in zwei Ebenen', arzt: 'Dr. med. Petra Lindner', gueltigBis: addDays(t, -60), status: 'eingelöst' }
      ],
      karte: { kasse: 'Beispiel-Krankenkasse (fiktiv)', kvnr: 'X123456789', status: 'Mitglied', versichertenart: 'Pflichtversichert', beginn: '2019-01-01', gueltigBis: '2028-12-31', ik: '109 999 999' },
      vorsorge: [
        { id: uid(), art: 'Hautkrebs-Screening', letzte: addDays(t, -745), faellig: addDays(t, -15), erinnerung: true },
        { id: uid(), art: 'Gesundheits-Check-up', letzte: addDays(t, -1040), faellig: addDays(t, 24), erinnerung: true },
        { id: uid(), art: 'Krebsfrüherkennung (Frauen)', letzte: addDays(t, -320), faellig: addDays(t, 45), erinnerung: false },
        { id: uid(), art: 'Darmkrebs-Vorsorge', letzte: '', faellig: addDays(t, 190), erinnerung: false }
      ],
      impfungen: [
        { id: uid(), name: 'Influenza (Grippe)', datum: addDays(t, -335), naechste: addDays(t, 30), erinnerung: true },
        { id: uid(), name: 'Tetanus / Diphtherie / Keuchhusten (Tdap)', datum: addDays(t, -3500), naechste: addDays(t, 150), erinnerung: true },
        { id: uid(), name: 'COVID-19', datum: addDays(t, -400), naechste: addDays(t, 12), erinnerung: false },
        { id: uid(), name: 'Pneumokokken', datum: addDays(t, -900), naechste: '', erinnerung: false },
        { id: uid(), name: 'Hepatitis B', datum: addDays(t, -2600), naechste: '', erinnerung: false }
      ]
    });
  }

  // Ergänzt fehlende Felder älterer Dateien (siehe CLAUDE.md: neue Felder immer hier auffüllen)
  function normalize(data) {
    const base = emptyData();
    const d = Object.assign({}, data);
    for (const k of Object.keys(base)) if (d[k] === undefined || d[k] === null) d[k] = base[k];
    d.profil = Object.assign(base.profil, d.profil);
    d.karte = Object.assign(EMPTY_KARTE(), d.karte);
    d.einstellungen = Object.assign(DEFAULT_EINSTELLUNGEN(), d.einstellungen);
    d.einstellungen.einwilligungen = Object.assign({ erinnerungen: 0, befundbilder: 0 }, d.einstellungen.einwilligungen);
    d.medikamente = d.medikamente.map((m) => Object.assign({ hinweis: '', zeiten: ['morgens'] }, m));
    return d;
  }

  // ---------------------------------------------------------------
  // Speichern (verschlüsselt, seriell)
  // ---------------------------------------------------------------
  function enqueue(fn) {
    saveChain = saveChain.then(fn).catch((err) => { console.error(err); toast('Speichern fehlgeschlagen: ' + (err && err.message ? err.message : 'unbekannter Fehler')); });
    return saveChain;
  }
  function persist() {
    if (!session || !state) return saveChain;
    return enqueue(async () => {
      if (!session || !state) return;
      envelope = await Vault.seal(envelope, session, state);
      await window.welt.saveData(envelope);
    });
  }
  const commit = () => { persist(); render(); };
  function logEvent(a) {
    if (!state) return;
    state.sicherheitslog.push({ ts: Date.now(), a });
    if (state.sicherheitslog.length > 60) state.sicherheitslog = state.sicherheitslog.slice(-60);
  }
  const LOG_TEXT = {
    tresor_angelegt: 'Verschlüsselter Tresor angelegt', anmeldung: 'Angemeldet', sperre_manuell: 'Manuell gesperrt', sperre_auto: 'Automatisch gesperrt',
    passwort_geaendert: 'Passwort geändert', schluessel_erneuert: 'Wiederherstellungsschlüssel erneuert', passwort_zurueckgesetzt: 'Passwort mit Wiederherstellungsschlüssel zurückgesetzt',
    datenkopie: 'Datenkopie exportiert (Art. 20)', auskunft: 'Auskunftsblatt erstellt (Art. 15)', sicherung_export: 'Verschlüsselte Sicherung exportiert', sicherung_import: 'Sicherung eingespielt',
    eintraege_geloescht: 'Alle Einträge gelöscht', beispieldaten: 'Beispieldaten geladen', einwilligung: 'Einwilligung geändert', fehlversuche: 'Fehlgeschlagene Anmeldungen gemeldet'
  };

  // ---------------------------------------------------------------
  // Modal
  // ---------------------------------------------------------------
  let closeCur = null;
  function openModal(title, build, opts = {}) {
    closeModal();
    const modal = h('div', { class: 'modal' + (opts.wide ? ' wide' : ''), role: 'dialog', 'aria-label': title }, h('h2', { text: title }));
    const bd = h('div', { class: 'backdrop', onmousedown: (e) => { if (e.target === bd) closeModal(); } }, modal);
    build(modal);
    document.getElementById('modal-root').appendChild(bd);
    closeCur = () => { bd.remove(); closeCur = null; };
    return modal;
  }
  function closeModal() { if (closeCur) closeCur(); }
  function formModal(title, defs, onSubmit, label = 'Speichern') {
    openModal(title, (modal) => {
      const form = h('form', {});
      defs.forEach((d) => {
        let input;
        if (d.type === 'select') input = h('select', { name: d.key }, d.options.map((o) => h('option', { value: o, text: o, selected: o === d.value })));
        else if (d.type === 'textarea') input = h('textarea', { name: d.key, placeholder: d.placeholder || '', value: d.value || '' });
        else input = h('input', { name: d.key, type: d.type || 'text', placeholder: d.placeholder || '', value: d.value || '' });
        form.appendChild(h('div', { class: 'field' }, h('label', { text: d.label }), input));
      });
      form.appendChild(h('div', { class: 'modal-actions' }, btn('Abbrechen', { onclick: closeModal }), h('button', { class: 'btn primary', type: 'submit' }, icon('save'), label)));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const vals = {};
        defs.forEach((d) => { vals[d.key] = form.elements[d.key].value.trim(); });
        if (onSubmit(vals) !== false) closeModal();
      });
      modal.appendChild(form);
      setTimeout(() => { const f = form.querySelector('input,textarea,select'); if (f) f.focus(); }, 30);
    });
  }
  function confirmModal(text, yes, label = 'Ja, löschen') {
    openModal('Bitte bestätigen', (m) => {
      m.appendChild(h('p', { text }));
      m.appendChild(h('div', { class: 'modal-actions' }, btn('Abbrechen', { onclick: closeModal }), btn(label, { kind: 'danger', icon: 'trash', onclick: () => { closeModal(); yes(); } })));
    });
  }
  // Druckbares Papierdokument im Dialog
  function paperModal(title, build, extraActions) {
    openModal(title, (modal) => {
      modal.appendChild(build());
      modal.appendChild(h('div', { class: 'modal-actions no-print' }, extraActions || null, btn('Schließen', { onclick: closeModal }), btn('Drucken', { kind: 'primary', icon: 'print', onclick: () => window.print() })));
    }, { wide: true });
  }
  const letterhead = (sub) => h('div', { class: 'letterhead' }, h('img', { src: 'img/logo.svg', alt: '' }), h('div', {}, h('strong', { text: 'Patienten Welt' }), h('div', { class: 'lh-sub', text: sub || 'Persönliche Gesundheits-App' })));
  const pfield = (label, value) => h('div', { class: 'pf' }, h('span', { class: 'pf-l', text: label }), h('span', { class: 'pf-v', text: value || '–' }));
  const demoNote = (text) => h('div', { class: 'paper-note', text });
  const patientBlock = () => h('div', { class: 'pgrid' }, pfield('Name', state.profil.name), pfield('geboren am', fmtDate(state.profil.geb)), pfield('Versichertennr.', state.karte.kvnr), pfield('Krankenkasse', state.karte.kasse));

  const head = (title, sub, ic, ...actions) => h('div', { class: 'page-head' },
    h('div', { class: 'page-title' }, ic ? orb(ic[0], ic[1]) : null, h('div', {}, h('h1', { text: title }), sub ? h('p', { text: sub }) : null)),
    h('div', { class: 'row' }, actions));
  const demoHint = (text) => h('p', { class: 'soft small demo-hint' }, icon('help'), h('span', { text }));

  // Zusatzbefunde für Ampel und Karten
  const statusPill = (cls, text) => h('span', { class: 'pill ' + cls, text });

  // ---------------------------------------------------------------
  // Sperrbildschirm: Einrichtung, Anmeldung, Wiederherstellung
  // ---------------------------------------------------------------
  const secRoot = () => document.getElementById('security-root');
  function pwField(label, o) {
    o = o || {};
    const input = h('input', { type: 'password', autocomplete: o.autocomplete || 'current-password', id: o.id, 'aria-label': label });
    const toggle = h('button', { class: 'pw-toggle', type: 'button', title: 'Anzeigen / Verbergen', 'aria-label': 'Passwort anzeigen oder verbergen', onclick: () => { input.type = input.type === 'password' ? 'text' : 'password'; } }, icon('eye'));
    const field = h('div', { class: 'field' }, h('label', { text: label }), h('div', { class: 'pw-wrap' }, input, toggle));
    if (o.meter) {
      const bar = h('div', { class: 'pw-bar', 'data-s': '0' }, h('i'));
      const hints = h('div', { class: 'soft small pw-hints' });
      field.appendChild(bar); field.appendChild(hints);
      input.addEventListener('input', () => {
        const r = Vault.checkPassword(input.value);
        bar.dataset.s = String(r.score);
        hints.textContent = input.value ? (r.ok ? 'Gute Wahl.' : 'Noch nötig: ' + r.hints.join('; ')) : '';
      });
    }
    return { field, input };
  }
  function mountLock(...children) {
    const r = secRoot();
    r.textContent = '';
    r.appendChild(h('div', { class: 'lockscreen' }, h('div', { class: 'lock-card' }, h('img', { class: 'lock-logo', src: 'img/logo.svg', alt: '' }), children)));
    document.body.classList.add('locked');
    const first = r.querySelector('input, select');
    if (first) setTimeout(() => first.focus(), 50);
  }

  function showSetup(legacy) {
    const name = h('input', { type: 'text', placeholder: 'Ihr Name', id: 'su-name', autocomplete: 'name', value: legacy && legacy.profil ? legacy.profil.name || '' : '' });
    const pw1 = pwField('Passwort (mindestens 12 Zeichen)', { meter: true, autocomplete: 'new-password', id: 'su-pw1' });
    const pw2 = pwField('Passwort wiederholen', { autocomplete: 'new-password', id: 'su-pw2' });
    const modes = legacy
      ? [['legacy', 'Vorhandene Daten übernehmen und verschlüsseln'], ['leer', 'Neu und leer starten (vorhandene Daten gehen verloren)']]
      : [['demo', 'Mit frei erfundenen Beispieldaten starten (Demo)'], ['leer', 'Leer starten (eigene Daten)']];
    const mode = h('select', { id: 'su-mode' }, modes.map(([v, l]) => h('option', { value: v, text: l })));
    const err = h('div', { class: 'form-error', role: 'alert' });
    const go = h('button', { class: 'btn primary', type: 'submit', id: 'su-go' }, icon('lock'), 'Verschlüsselten Tresor anlegen');
    const form = h('form', { class: 'lock-form' }, h('div', { class: 'field' }, h('label', { text: 'Ihr Name' }), name), pw1.field, pw2.field,
      h('div', { class: 'field' }, h('label', { text: 'Startdaten' }), mode), err, go);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      const n = name.value.trim();
      if (!n) { err.textContent = 'Bitte Ihren Namen angeben.'; return; }
      const chk = Vault.checkPassword(pw1.input.value);
      if (!chk.ok) { err.textContent = 'Passwort zu schwach: ' + chk.hints.join('; ') + '.'; return; }
      if (pw1.input.value !== pw2.input.value) { err.textContent = 'Die Passwörter stimmen nicht überein.'; return; }
      go.disabled = true;
      go.lastChild.textContent = 'Verschlüssele …';
      try {
        let st;
        if (mode.value === 'legacy') {
          // Altdaten (Klartext oder alte safeStorage-Hülle) in den Tresor übernehmen; neue Bereiche bei Beispieldaten ergänzen
          const demo = demoData();
          const old = Object.assign({}, legacy);
          if (old.demo) for (const k of ['labor', 'rezepte', 'krankmeldungen', 'ueberweisungen', 'karte', 'vorsorge', 'impfungen']) if (old[k] === undefined) old[k] = demo[k];
          st = normalize(old);
        } else st = normalize(mode.value === 'demo' ? demoData() : emptyData());
        st.profil.name = n;
        const created = await Vault.create({ state: st, user: { id: USER_ID, name: 'Patient/in', password: pw1.input.value } });
        showRecoveryKey(created.recoveryKey, 'Weiter zur App', async () => {
          envelope = created.envelope; session = created.session; state = st;
          await window.welt.saveData(envelope);
          logEvent('tresor_angelegt');
          startApp(0);
          persist();
        });
      } catch (ex) { err.textContent = 'Fehler: ' + ex.message; go.disabled = false; go.lastChild.textContent = 'Verschlüsselten Tresor anlegen'; }
    });
    mountLock(h('h1', { text: 'Willkommen bei Patienten Welt' }),
      h('p', { class: 'soft', text: 'Ihre Gesundheitsdaten werden verschlüsselt (AES-256) nur auf diesem Gerät gespeichert. Legen Sie jetzt Ihr Passwort fest.' }),
      legacy ? h('p', { class: 'lock-note', text: 'Es wurden Daten einer früheren Version gefunden, die noch nicht mit Ihrem Passwort geschützt sind.' }) : null,
      form);
  }

  // Wiederherstellungsschlüssel anzeigen (Einrichtung)
  function showRecoveryKey(key, buttonLabel, onDone) {
    const confirmBox = h('input', { type: 'checkbox', id: 'rk-confirm' });
    const go = h('button', { class: 'btn primary', type: 'button', id: 'rk-go', disabled: true }, buttonLabel);
    confirmBox.addEventListener('change', () => { go.disabled = !confirmBox.checked; });
    go.addEventListener('click', async () => { go.disabled = true; await onDone(); });
    mountLock(h('h1', { text: 'Wiederherstellungsschlüssel' }),
      h('p', { class: 'soft', text: 'Falls Sie Ihr Passwort vergessen, ist dies der einzige Weg zurück zu Ihren Daten. Ohne Passwort und ohne Schlüssel sind die Daten unwiederbringlich verschlüsselt.' }),
      h('div', { class: 'recovery-key', id: 'rk-key', text: key }),
      h('div', { class: 'row', style: 'justify-content:center;margin:12px 0' },
        btn('Kopieren', { icon: 'file', onclick: () => { try { navigator.clipboard.writeText(key); toast('Schlüssel kopiert.'); } catch (e) { toast('Bitte Schlüssel abschreiben.'); } } }),
        btn('Drucken', { icon: 'print', onclick: () => printRecoverySheet(key) })),
      h('label', { class: 'check-row' }, confirmBox, h('span', { text: 'Ich habe den Schlüssel ausgedruckt oder sicher notiert.' })),
      go);
  }
  function printRecoverySheet(key) {
    const sheet = h('div', { class: 'recovery-sheet' },
      h('h2', { text: 'Wiederherstellungsschlüssel – Patienten Welt' }),
      h('p', { text: 'Bewahren Sie dieses Blatt getrennt vom Computer auf. Wer den Schlüssel kennt, kann Ihre Daten entschlüsseln.' }),
      h('div', { class: 'recovery-key', text: key }),
      h('p', { text: `Erstellt am ${fmtDate(todayISO())}.` }));
    document.body.appendChild(sheet);
    document.body.classList.add('print-recovery');
    window.print();
    document.body.classList.remove('print-recovery');
    sheet.remove();
  }

  let loginFails = 0;
  let loginBlockedUntil = 0;
  function showLogin(message) {
    const pw = pwField('Passwort', { id: 'li-pw' });
    const err = h('div', { class: 'form-error', role: 'alert', text: message || '' });
    const go = h('button', { class: 'btn primary', type: 'submit', id: 'li-go' }, icon('lock'), 'Entsperren');
    const form = h('form', { class: 'lock-form' }, pw.field, err, go,
      h('button', { class: 'link-btn', type: 'button', onclick: showRecovery }, 'Passwort vergessen? Wiederherstellungsschlüssel verwenden'));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const wait = loginBlockedUntil - Date.now();
      if (wait > 0) { err.textContent = `Zu viele Versuche. Bitte ${Math.ceil(wait / 1000)} Sekunden warten.`; return; }
      go.disabled = true;
      try {
        const res = await Vault.unlock(envelope, USER_ID, pw.input.value);
        loginFails = 0;
        await onUnlocked(res);
      } catch (ex) {
        if (ex.code === 'auth') {
          loginFails++;
          const secs = loginFails >= 3 ? Math.min(60, 2 ** (loginFails - 2)) : 0;
          loginBlockedUntil = Date.now() + secs * 1000;
          envelope = { ...envelope, events: (envelope.events || []).concat([{ ts: Date.now() }]).slice(-20) };
          window.welt.saveData(envelope);
          err.textContent = 'Anmeldung fehlgeschlagen.' + (secs ? ` Bitte ${secs} Sekunden warten.` : '');
        } else err.textContent = ex.message;
        go.disabled = false;
        pw.input.value = '';
        pw.input.focus();
      }
    });
    mountLock(h('h1', { text: 'Gesperrt' }), h('p', { class: 'soft', text: 'Ihre Gesundheitsdaten sind verschlüsselt. Bitte Passwort eingeben.' }), form);
  }

  async function onUnlocked(res) {
    state = normalize(res.state);
    session = res.session;
    const fails = (envelope.events || []).filter((e) => !e.seen);
    envelope = { ...envelope, events: (envelope.events || []).map((e) => ({ ...e, seen: true })) };
    logEvent('anmeldung');
    if (fails.length) logEvent('fehlversuche');
    startApp(fails.length);
    persist();
  }

  function showRecovery() {
    const key = h('input', { type: 'text', id: 'rc-key', placeholder: 'XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX', autocomplete: 'off', spellcheck: 'false', class: 'mono' });
    const pw1 = pwField('Neues Passwort', { meter: true, autocomplete: 'new-password', id: 'rc-pw1' });
    const pw2 = pwField('Neues Passwort wiederholen', { autocomplete: 'new-password', id: 'rc-pw2' });
    const err = h('div', { class: 'form-error', role: 'alert' });
    const go = h('button', { class: 'btn primary', type: 'submit', id: 'rc-go' }, icon('lock'), 'Zurücksetzen und anmelden');
    const form = h('form', { class: 'lock-form' }, h('div', { class: 'field' }, h('label', { text: 'Wiederherstellungsschlüssel' }), key), pw1.field, pw2.field, err, go,
      h('button', { class: 'link-btn', type: 'button', onclick: () => showLogin() }, 'Zurück zur Anmeldung'));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      const chk = Vault.checkPassword(pw1.input.value);
      if (!chk.ok) { err.textContent = 'Passwort zu schwach: ' + chk.hints.join('; ') + '.'; return; }
      if (pw1.input.value !== pw2.input.value) { err.textContent = 'Die Passwörter stimmen nicht überein.'; return; }
      go.disabled = true;
      try {
        const res = await Vault.unlockWithRecovery(envelope, key.value);
        envelope = await Vault.setPassword(envelope, res.session, USER_ID, pw1.input.value);
        await window.welt.saveData(envelope);
        await onUnlocked({ session: res.session, state: res.state });
        logEvent('passwort_zurueckgesetzt');
        rotateRecoveryFlow('Der bisherige Wiederherstellungsschlüssel wurde verwendet. Erzeugen Sie jetzt einen neuen.');
      } catch (ex) {
        err.textContent = ex.code === 'auth' ? 'Wiederherstellungsschlüssel ungültig.' : ex.message;
        go.disabled = false;
      }
    });
    mountLock(h('h1', { text: 'Passwort zurücksetzen' }), h('p', { class: 'soft', text: 'Mit Ihrem Wiederherstellungsschlüssel vergeben Sie ein neues Passwort. Ihre Daten bleiben erhalten.' }), form);
  }

  async function rotateRecoveryFlow(note) {
    const res = await Vault.rotateRecovery(envelope, session);
    openModal('Neuer Wiederherstellungsschlüssel', (modal) => {
      modal.appendChild(h('p', { class: 'soft', text: note || 'Der alte Schlüssel wird mit der Bestätigung ungültig.' }));
      modal.appendChild(h('div', { class: 'recovery-key', id: 'rk-key2', text: res.recoveryKey }));
      const ok = h('input', { type: 'checkbox', id: 'rk-confirm2' });
      const go = h('button', { class: 'btn primary', type: 'button', id: 'rk-go2', disabled: true }, 'Schlüssel übernehmen');
      ok.addEventListener('change', () => { go.disabled = !ok.checked; });
      go.addEventListener('click', async () => {
        await enqueue(async () => { envelope = { ...envelope, recovery: res.envelope.recovery }; });
        logEvent('schluessel_erneuert'); commit(); closeModal(); toast('Neuer Wiederherstellungsschlüssel aktiv.');
      });
      modal.appendChild(h('div', { class: 'row', style: 'justify-content:center;margin:10px 0' }, btn('Drucken', { icon: 'print', onclick: () => printRecoverySheet(res.recoveryKey) })));
      modal.appendChild(h('label', { class: 'check-row' }, ok, h('span', { text: 'Ich habe den neuen Schlüssel sicher notiert.' })));
      modal.appendChild(h('div', { class: 'modal-actions' }, btn('Später', { onclick: closeModal }), go));
    });
  }

  // Passwort-Bestätigung vor heiklen Aktionen
  function reauth(title, onOk, extra) {
    openModal(title, (modal) => {
      if (extra) modal.appendChild(extra);
      const pw = pwField('Ihr Passwort zur Bestätigung', { id: 'ra-pw' });
      const err = h('div', { class: 'form-error', role: 'alert' });
      const form = h('form', {}, pw.field, err, h('div', { class: 'modal-actions' }, btn('Abbrechen', { onclick: closeModal }), h('button', { class: 'btn primary', type: 'submit', id: 'ra-go' }, 'Bestätigen')));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (await Vault.verifyPassword(envelope, USER_ID, pw.input.value)) { closeModal(); onOk(); } else { err.textContent = 'Passwort falsch.'; pw.input.value = ''; }
      });
      modal.appendChild(form);
      setTimeout(() => pw.input.focus(), 40);
    });
  }

  // ---------------------------------------------------------------
  // Start und Sperre der Sitzung
  // ---------------------------------------------------------------
  let activityBound = false;
  function startApp(failedLogins) {
    document.body.classList.remove('locked');
    secRoot().textContent = '';
    Object.keys(view).forEach((k) => delete view[k]);
    view.page = 'start';
    lastActivity = Date.now();
    if (!activityBound) {
      activityBound = true;
      ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'].forEach((ev) => document.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true }));
      setInterval(() => {
        if (!session || !state) return;
        const min = state.einstellungen.autoLockMin;
        if (min > 0 && Date.now() - lastActivity > min * 60000) lockApp('auto');
      }, 10000);
    }
    render();
    if (failedLogins) {
      openModal('Sicherheitshinweis', (modal) => {
        modal.appendChild(h('p', { text: `Seit der letzten Anmeldung gab es ${plural(failedLogins, 'fehlgeschlagenen Anmeldeversuch', 'fehlgeschlagene Anmeldeversuche')}. Falls Sie diese nicht selbst waren, ändern Sie bitte Ihr Passwort.` }));
        modal.appendChild(h('div', { class: 'modal-actions' }, btn('Verstanden', { kind: 'primary', onclick: closeModal })));
      });
    }
  }
  async function lockApp(reason) {
    if (!session || !state) return;
    logEvent(reason === 'auto' ? 'sperre_auto' : 'sperre_manuell');
    closeModal();
    await persist();
    await saveChain;
    state = null; session = null;
    document.getElementById('content').textContent = '';
    document.getElementById('nav').textContent = '';
    document.getElementById('sidebar-foot').textContent = '';
    document.getElementById('toast-root').textContent = '';
    showLogin(reason === 'auto' ? 'Automatisch gesperrt wegen Inaktivität.' : '');
  }

  function showUnreadable() {
    mountLock(h('h1', { text: 'Datendatei nicht lesbar' }),
      h('p', { class: 'soft', text: 'Die vorhandene Datendatei hat ein unbekanntes Format oder konnte nicht entschlüsselt werden. Um nichts zu überschreiben, wurde sie nicht geändert.' }),
      h('div', { class: 'row', style: 'justify-content:center' }, btn('Neu beginnen (ersetzt die Datei)', { kind: 'danger', icon: 'trash', onclick: () => confirmModal('Die vorhandene Datendatei wird beim Einrichten ersetzt. Wirklich neu beginnen?', () => showSetup(null), 'Ja, neu beginnen') })));
  }

  // ---------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------
  const NAV = [
    ['Übersicht', [['start', 'Start', 'home']]],
    ['Meine Gesundheit', [['medikamente', 'Medikamente', 'pill'], ['werte', 'Meine Werte', 'pulse'], ['labor', 'Laborergebnisse', 'flask'], ['befunde', 'Befunde', 'file'], ['vorsorge', 'Vorsorge & Impfungen', 'shield'], ['katalog', 'Medikamentensuche', 'search']]],
    ['Organisation', [['termine', 'Meine Termine', 'calendar'], ['erezepte', 'E-Rezepte', 'qr'], ['krankmeldungen', 'Krankmeldungen', 'thermo'], ['ueberweisungen', 'Überweisungen', 'swap'], ['karte', 'Gesundheitskarte', 'card'], ['nachrichten', 'Praxis-Nachrichten', 'chat']]],
    ['System', [['medien', 'Demo & Medien', 'play'], ['datenschutz', 'Datenschutz & Sicherheit', 'lock'], ['profil', 'Mein Profil', 'user']]]
  ];
  const NAV_FLAT = NAV.flatMap(([, items]) => items);
  function goto(p, extra) {
    if (!state) return;
    closeModal();
    view.page = p;
    Object.assign(view, extra || {});
    render();
    document.getElementById('content').scrollTop = 0;
  }

  function todaysDoses() {
    const done = state.einnahmen[todayISO()] || [];
    const all = [];
    state.medikamente.forEach((m) => m.zeiten.forEach((z) => all.push({ key: m.id + '|' + z, med: m, zeit: z, done: done.includes(m.id + '|' + z) })));
    return all;
  }
  const rezeptAktiv = (r) => r.status === 'offen' && r.gueltigBis >= todayISO();
  const offeneRezepte = () => state.rezepte.filter(rezeptAktiv).sort((a, b) => a.gueltigBis.localeCompare(b.gueltigBis));
  const faelligVorsorge = () => state.vorsorge.filter((e) => e.faellig && diffDays(e.faellig) <= 30);
  const faelligImpfungen = () => state.impfungen.filter((e) => e.naechste && diffDays(e.naechste) <= 30);
  function reminders() {
    if (!state.einstellungen.einwilligungen.erinnerungen) return [];
    const out = [];
    state.vorsorge.filter((e) => e.erinnerung && e.faellig && diffDays(e.faellig) <= 30).forEach((e) => out.push({ typ: 'Vorsorge', text: e.art, datum: e.faellig, page: 'vorsorge' }));
    state.impfungen.filter((e) => e.erinnerung && e.naechste && diffDays(e.naechste) <= 30).forEach((e) => out.push({ typ: 'Impfung', text: e.name, datum: e.naechste, page: 'vorsorge' }));
    return out.sort((a, b) => a.datum.localeCompare(b.datum));
  }
  const dueText = (iso) => { const d = diffDays(iso); return d < 0 ? `seit ${plural(-d, 'Tag', 'Tagen')} überfällig` : d === 0 ? 'heute fällig' : `in ${plural(d, 'Tag', 'Tagen')}`; };
  const dueClass = (iso) => { const d = diffDays(iso); return d < 0 ? 'danger' : d <= 30 ? 'warn' : 'ok'; };

  function render() {
    if (!state) return;
    const nav = document.getElementById('nav');
    nav.textContent = '';
    const badges = {
      medikamente: todaysDoses().filter((d) => !d.done).length,
      erezepte: offeneRezepte().length,
      vorsorge: faelligVorsorge().length + faelligImpfungen().length,
      ueberweisungen: state.ueberweisungen.filter((u) => u.status === 'offen' && u.gueltigBis >= todayISO()).length
    };
    let n = 0;
    NAV.forEach(([group, items]) => {
      nav.appendChild(h('div', { class: 'nav-group', text: group }));
      items.forEach(([k, l, ic]) => {
        n++;
        nav.appendChild(h('button', { class: 'nav-item' + (view.page === k ? ' active' : ''), type: 'button', title: `Strg ${n <= 9 ? n : n === 10 ? 0 : '–'}`.replace('Strg –', ''), 'aria-current': view.page === k ? 'page' : null, onclick: () => goto(k) },
          icon(ic), h('span', { text: l }), badges[k] ? h('span', { class: 'badge', text: String(badges[k]) }) : null));
      });
    });
    const foot = document.getElementById('sidebar-foot');
    foot.textContent = '';
    foot.appendChild(h('div', { class: 'foot-name', text: state.profil.name }));
    foot.appendChild(h('div', { class: 'soft small', text: state.profil.praxis }));
    foot.appendChild(btn('Sperren (Strg L)', { kind: 'small', icon: 'lock', id: 'lock-now', onclick: () => lockApp('manuell') }));
    const c = document.getElementById('content');
    c.textContent = '';
    const views = { start: rStart, termine: rTermine, medikamente: rMedikamente, werte: rWerte, labor: rLabor, befunde: rBefunde, vorsorge: rVorsorge, katalog: rKatalog, erezepte: rErezepte, krankmeldungen: rKrankmeldungen, ueberweisungen: rUeberweisungen, karte: rKarte, nachrichten: rNachrichten, medien: rMedien, datenschutz: rDatenschutz, profil: rProfil };
    c.appendChild((views[view.page] || rStart)());
  }

  // ---------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------
  function ring(done, total) {
    const C = 2 * Math.PI * 49;
    const pct = total ? done / total : 1;
    const fg = s('circle', { class: 'fg', cx: 60, cy: 60, r: 49, 'stroke-dasharray': C, 'stroke-dashoffset': C });
    setTimeout(() => fg.setAttribute('stroke-dashoffset', String(C * (1 - pct))), 80);
    return h('div', { class: 'ring' }, s('svg', { viewBox: '0 0 120 120' }, s('circle', { class: 'bg', cx: 60, cy: 60, r: 49 }), fg), h('div', { class: 'label', text: total ? `${done}/${total}` : '✓' }));
  }
  function rStart() {
    const hour = new Date().getHours();
    const greet = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
    const first = state.profil.name.split(' ')[0];
    const doses = todaysDoses();
    const next = state.termine.filter((t) => t.datum >= todayISO()).sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit))[0];
    const last = state.werte.length ? [...state.werte].sort((a, b) => a.datum.localeCompare(b.datum)).pop() : null;
    const v = h('div', { class: 'view' });
    v.appendChild(h('section', { class: 'card hero' },
      h('div', { class: 'hero-text' }, h('span', { class: 'pill info', text: fmtLong(todayISO()) }), h('h1', { text: `${greet}, ${first}!` }),
        h('p', { class: 'soft', text: 'Schön, dass Sie auf Ihre Gesundheit achten. Hier ist Ihr Überblick für heute.' }),
        h('div', { class: 'row' }, btn('Termin anfragen', { kind: 'primary', icon: 'calendar', onclick: () => { goto('termine'); anfragen(); } }), btn('Wert eintragen', { icon: 'pulse', onclick: () => { goto('werte'); wertEintragen(); } }))),
      h('div', { class: 'hero-img' }, h('img', { src: 'img/hero.svg', alt: 'Illustration: Ärztin im Sprechzimmer' }))));
    v.appendChild(h('div', { class: 'grid cols-3', style: 'margin-top:18px' },
      h('div', { class: 'card', style: 'margin:0' }, h('h2', { style: 'margin-bottom:14px', text: 'Medikamente heute' }), h('div', { class: 'row' }, ring(doses.filter((d) => d.done).length, doses.length), h('div', {}, h('div', { class: 'soft', text: doses.length ? `${doses.filter((d) => !d.done).length} noch offen` : 'Kein Plan eingetragen' }), btn('Zum Plan', { kind: 'small', onclick: () => goto('medikamente') })))),
      h('div', { class: 'card', style: 'margin:0' }, h('h2', { style: 'margin-bottom:14px', text: 'Nächster Termin' }),
        next ? h('div', {}, h('div', { class: 'big-num', text: `${fmtDate(next.datum)} · ${next.zeit} Uhr` }), h('div', { class: 'soft', text: next.grund }), h('span', { class: 'pill ' + (next.status === 'bestätigt' ? 'ok' : 'warn'), text: next.status }))
          : h('div', { class: 'soft', text: 'Kein Termin geplant.' })),
      h('div', { class: 'card', style: 'margin:0' }, h('h2', { style: 'margin-bottom:14px', text: 'Letzter Blutdruck' }),
        last ? h('div', {}, h('div', { class: 'big-num', style: 'font-size:34px', text: `${last.sys}/${last.dia}` }), h('div', { class: 'soft', text: `Puls ${last.puls} · ${fmtDate(last.datum)}` })) : h('div', { class: 'soft', text: 'Noch kein Wert.' }))));

    // Zweite Reihe: Erinnerungen, E-Rezepte, Laborampel
    const rem = reminders();
    const offen = offeneRezepte();
    const letzterLabor = [...state.labor].sort((a, b) => a.datum.localeCompare(b.datum)).pop();
    const auff = letzterLabor ? letzterLabor.werte.filter((w) => labStatus(w.name, w.wert).cls !== 'ok') : [];
    v.appendChild(h('div', { class: 'grid cols-3', style: 'margin-top:18px' },
      h('div', { class: 'card', style: 'margin:0' }, h('div', { class: 'card-title' }, h('h2', { text: 'Erinnerungen' }), btn('', { kind: 'small', icon: 'shield', title: 'Vorsorge & Impfungen', onclick: () => goto('vorsorge') })),
        rem.length ? h('div', { class: 'list' }, rem.slice(0, 4).map((r) => h('div', { class: 'item clickable', onclick: () => goto(r.page) }, h('span', { class: 'ic-soft' }, icon(r.typ === 'Impfung' ? 'syringe' : 'bell')),
          h('div', { class: 'grow' }, h('div', { class: 'title', text: r.text }), h('div', { class: 'soft small', text: `${r.typ} · ${fmtDate(r.datum)}` })), statusPill(dueClass(r.datum), dueText(r.datum)))))
          : h('div', { class: 'soft', text: state.einstellungen.einwilligungen.erinnerungen ? 'Keine Vorsorge oder Impfung in den nächsten 30 Tagen fällig.' : 'Erinnerungen sind ausgeschaltet (Datenschutz & Sicherheit).' })),
      h('div', { class: 'card', style: 'margin:0' }, h('div', { class: 'card-title' }, h('h2', { text: 'Meine E-Rezepte' }), btn('', { kind: 'small', icon: 'qr', title: 'Zu den E-Rezepten', onclick: () => goto('erezepte') })),
        offen.length ? h('div', { class: 'list' }, offen.slice(0, 3).map((r) => h('div', { class: 'item clickable', onclick: () => { goto('erezepte'); viewErezept(r); } }, h('span', { class: 'ic-soft' }, icon('pill')),
          h('div', { class: 'grow' }, h('div', { class: 'title', text: r.medikament }), h('div', { class: 'soft small', text: `gültig bis ${fmtDate(r.gueltigBis)}` })), statusPill('info', 'offen'))))
          : h('div', { class: 'soft', text: 'Keine offenen E-Rezepte.' })),
      h('div', { class: 'card', style: 'margin:0' }, h('div', { class: 'card-title' }, h('h2', { text: 'Laborwerte' }), btn('', { kind: 'small', icon: 'flask', title: 'Zu den Laborergebnissen', onclick: () => goto('labor') })),
        letzterLabor ? h('div', {}, h('div', { class: 'soft small', text: `Letzter Befund vom ${fmtDate(letzterLabor.datum)}` }),
          h('div', { class: 'lab-dots' }, letzterLabor.werte.map((w) => h('i', { class: 'dot ' + labStatus(w.name, w.wert).cls, title: `${w.name}: ${numFmt(w.wert)}` }))),
          h('div', { text: auff.length ? `${plural(auff.length, 'Wert', 'Werte')} außerhalb des Referenzbereichs` : 'Alle Werte im Referenzbereich' }),
          auff.length ? h('div', { class: 'soft small', text: auff.slice(0, 3).map((w) => w.name).join(', ') }) : null)
          : h('div', { class: 'soft', text: 'Noch keine Laborbefunde.' }))));

    const tiles = [['karte', 'Gesundheitskarte', 'card', 'blue'], ['erezepte', 'E-Rezepte', 'qr', 'gold'], ['krankmeldungen', 'Krankmeldungen', 'thermo', 'red'], ['datenschutz', 'Datenschutz & Sicherheit', 'lock', 'green']];
    v.appendChild(h('div', { class: 'grid cols-4', style: 'margin-top:18px' }, tiles.map(([k, l, ic, col]) => h('button', { class: 'card quick', type: 'button', style: 'margin:0', onclick: () => goto(k) }, orb(ic, col), h('span', { text: l })))));
    if (state.demo) v.appendChild(h('p', { class: 'soft small', style: 'margin-top:18px', text: 'Hinweis: Alle Daten sind frei erfundene Beispieldaten. Patienten Welt ist keine Arztpraxis-Anbindung und ersetzt keine ärztliche Beratung; bei Notfällen rufen Sie 112 an.' }));
    return v;
  }

  // ---------------------------------------------------------------
  // Termine
  // ---------------------------------------------------------------
  function anfragen(preset) {
    preset = preset || {};
    formModal('Termin anfragen', [
      { key: 'datum', label: 'Wunschdatum', type: 'date', value: addDays(todayISO(), 7) },
      { key: 'zeit', label: 'Wunschzeit', type: 'time', value: '09:00' },
      { key: 'grund', label: 'Grund', placeholder: 'z. B. Kontrolle, Impfung, Rezept', value: preset.grund || '' }
    ], (f) => {
      if (!f.datum || !f.zeit || !f.grund) { toast('Bitte alle Felder ausfüllen.'); return false; }
      state.termine.push({ id: uid(), ...f, status: 'angefragt' });
      commit(); toast('Terminanfrage gespeichert (nur lokal – keine Verbindung zur Praxis).');
    }, 'Anfragen');
  }
  function rTermine() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Meine Termine', 'Anstehende und vergangene Termine', ['calendar', 'blue'], btn('Termin anfragen', { kind: 'primary', icon: 'plus', onclick: () => anfragen() })));
    const list = [...state.termine].sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit));
    v.appendChild(h('div', { class: 'card' }, list.length ? h('div', { class: 'list' }, list.map((t) =>
      h('div', { class: 'item' + (t.datum < todayISO() ? ' done' : '') }, h('span', { class: 'ic-soft' }, icon('calendar')),
        h('div', { class: 'grow' }, h('div', { class: 'title', text: `${fmtLong(t.datum)} · ${t.zeit} Uhr` }), h('div', { class: 'soft small', text: t.grund })),
        h('span', { class: 'pill ' + (t.status === 'bestätigt' ? 'ok' : 'warn'), text: t.status }),
        btn('', { kind: 'small', icon: 'trash', title: 'Termin löschen', onclick: () => confirmModal('Termin wirklich löschen?', () => { state.termine = state.termine.filter((x) => x.id !== t.id); commit(); }) }))))
      : h('div', { class: 'empty', text: 'Keine Termine.' })));
    v.appendChild(demoHint('Terminanfragen werden nur auf diesem Gerät gespeichert. Es gibt keine Verbindung zu einer Arztpraxis; „bestätigt“ ist hier ein Beispielstatus.'));
    return v;
  }

  // ---------------------------------------------------------------
  // Medikamente
  // ---------------------------------------------------------------
  function medZeitenModal(preset, onSave) {
    openModal('Medikament hinzufügen', (modal) => {
      const name = h('input', { type: 'text', id: 'med-name', value: preset.name || '', placeholder: 'z. B. Ramipril 5 mg' });
      const hinweis = h('input', { type: 'text', id: 'med-hinweis', value: preset.hinweis || '', placeholder: 'z. B. 1 Tablette vor dem Essen' });
      const checks = ZEITEN.map((z) => ({ z, el: h('input', { type: 'checkbox', checked: z === 'morgens', 'data-z': z, 'aria-label': z }) }));
      modal.appendChild(h('div', { class: 'field' }, h('label', { text: 'Name und Stärke' }), name));
      if (preset.atc) modal.appendChild(h('p', { class: 'soft small', text: `Wirkstoffgruppe (ATC): ${preset.atc}` }));
      modal.appendChild(h('div', { class: 'field' }, h('label', { text: 'Hinweis' }), hinweis));
      modal.appendChild(h('div', { class: 'field' }, h('label', { text: 'Einnahme' }), h('div', { class: 'row' }, checks.map(({ z, el }) => h('label', { class: 'check-row inline' }, el, h('span', { text: z }))))));
      modal.appendChild(h('div', { class: 'modal-actions' }, btn('Abbrechen', { onclick: closeModal }), btn('Hinzufügen', { kind: 'primary', icon: 'plus', id: 'med-save', onclick: () => {
        const n = name.value.trim();
        const zeiten = checks.filter((c) => c.el.checked).map((c) => c.z);
        if (!n) { toast('Bitte einen Namen angeben.'); return; }
        if (!zeiten.length) { toast('Bitte mindestens eine Einnahmezeit wählen.'); return; }
        closeModal(); onSave({ name: n, hinweis: hinweis.value.trim(), zeiten, atc: preset.atc });
      } })));
      setTimeout(() => name.focus(), 30);
    });
  }
  function medHinzu(preset) {
    medZeitenModal(preset || {}, (m) => {
      state.medikamente.push({ id: uid(), ...m });
      commit(); toast('Zum Einnahmeplan hinzugefügt.');
    });
  }
  function rMedikamente() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Medikamente', 'Ihr Einnahmeplan für heute – einfach abhaken', ['pill', 'gold'], btn('Im Katalog suchen', { icon: 'search', onclick: () => goto('katalog') }), btn('Hinzufügen', { kind: 'primary', icon: 'plus', onclick: () => medHinzu() })));
    const done = state.einnahmen[todayISO()] || [];
    const card = h('div', { class: 'card' });
    ZEITEN.forEach((z) => {
      const rows = state.medikamente.filter((m) => m.zeiten.includes(z));
      if (!rows.length) return;
      card.appendChild(h('h3', { style: 'margin:14px 0 8px;text-transform:capitalize', text: z }));
      card.appendChild(h('div', { class: 'list' }, rows.map((m) => {
        const key = m.id + '|' + z;
        const isDone = done.includes(key);
        const rez = state.rezepte.find((r) => rezeptAktiv(r) && r.medikament.toLowerCase() === m.name.toLowerCase());
        return h('div', { class: 'item' + (isDone ? ' done' : '') },
          h('input', { type: 'checkbox', checked: isDone, 'aria-label': m.name + ' eingenommen', onchange: () => {
            const cur = state.einnahmen[todayISO()] || [];
            state.einnahmen[todayISO()] = isDone ? cur.filter((k) => k !== key) : [...cur, key];
            commit();
            if (!isDone) toast('Eingenommen – gut gemacht!');
          } }),
          h('div', { class: 'grow' }, h('div', { class: 'title', text: m.name }), h('div', { class: 'soft small', text: m.hinweis || '' })),
          rez ? h('button', { class: 'pill info pill-btn', type: 'button', title: 'E-Rezept anzeigen', onclick: () => { goto('erezepte'); viewErezept(rez); } }, 'E-Rezept offen') : null,
          btn('Rezept anfragen', { kind: 'small', icon: 'send', onclick: () => {
            state.nachrichten.push({ id: uid(), ts: Date.now(), typ: 'Rezeptanfrage', text: `Bitte um Folgerezept für: ${m.name}` });
            commit(); toast('Rezeptanfrage lokal gespeichert.');
          } }),
          btn('', { kind: 'small', icon: 'trash', title: 'Aus dem Plan entfernen', onclick: () => confirmModal(`„${m.name}“ aus dem Plan entfernen?`, () => { state.medikamente = state.medikamente.filter((x) => x.id !== m.id); commit(); }) }));
      })));
    });
    if (!state.medikamente.length) card.appendChild(h('div', { class: 'empty', text: 'Noch keine Medikamente eingetragen. Suchen Sie im Katalog oder fügen Sie eines selbst hinzu.' }));
    v.appendChild(card);
    return v;
  }

  // ---------------------------------------------------------------
  // Werte
  // ---------------------------------------------------------------
  function wertEintragen() {
    formModal('Messwert eintragen', [
      { key: 'datum', label: 'Datum', type: 'date', value: todayISO() },
      { key: 'sys', label: 'Blutdruck oben (systolisch)', placeholder: '120' },
      { key: 'dia', label: 'Blutdruck unten (diastolisch)', placeholder: '80' },
      { key: 'puls', label: 'Puls', placeholder: '70' },
      { key: 'gewicht', label: 'Gewicht in kg (optional)', placeholder: '70,5' }
    ], (f) => {
      const n = (x) => Number(String(x).replace(',', '.'));
      if (!(n(f.sys) > 0) || !(n(f.dia) > 0)) { toast('Bitte Blutdruckwerte angeben.'); return false; }
      state.werte.push({ id: uid(), datum: f.datum, sys: n(f.sys), dia: n(f.dia), puls: n(f.puls) || 0, gewicht: n(f.gewicht) || 0 });
      commit(); toast('Wert gespeichert.');
    });
  }
  function chart(list) {
    const W = 760, H = 280, L = 44, R = 16, T = 16, B = 34;
    const svg = s('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Blutdruckverlauf' });
    const min = 50, max = 180;
    const y = (val) => T + (H - T - B) * (1 - (val - min) / (max - min));
    const x = (i) => L + (list.length > 1 ? ((W - L - R) * i) / (list.length - 1) : (W - L - R) / 2);
    for (let g = 60; g <= 180; g += 20) { svg.appendChild(s('line', { class: 'grid-line', x1: L, x2: W - R, y1: y(g), y2: y(g) })); svg.appendChild(s('text', { x: 8, y: y(g) + 4 }, String(g))); }
    list.forEach((e, i) => svg.appendChild(s('text', { x: x(i) - 14, y: H - 10 }, e.datum.slice(8) + '.' + e.datum.slice(5, 7) + '.')));
    svg.appendChild(s('polyline', { class: 'l1', points: list.map((e, i) => `${x(i)},${y(e.sys)}`).join(' ') }));
    svg.appendChild(s('polyline', { class: 'l2', points: list.map((e, i) => `${x(i)},${y(e.dia)}`).join(' ') }));
    list.forEach((e, i) => { svg.appendChild(s('circle', { cx: x(i), cy: y(e.sys), r: 4.5, fill: '#4cc9f0' })); svg.appendChild(s('circle', { cx: x(i), cy: y(e.dia), r: 4.5, fill: '#f2b632' })); });
    return svg;
  }
  function rWerte() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Meine Werte', 'Blutdruck-Tagebuch der letzten Messungen', ['pulse', 'red'], btn('Wert eintragen', { kind: 'primary', icon: 'plus', onclick: wertEintragen })));
    const sorted = [...state.werte].sort((a, b) => a.datum.localeCompare(b.datum));
    const last7 = sorted.slice(-7);
    v.appendChild(h('div', { class: 'card' }, h('div', { class: 'card-title' }, h('h2', { text: 'Verlauf' }), h('div', {}, h('span', { class: 'pill info', text: '● oben' }), ' ', h('span', { class: 'pill gold', text: '● unten' }))),
      last7.length ? chart(last7) : h('div', { class: 'empty', text: 'Noch keine Werte.' })));
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:12px', text: 'Alle Messungen' }),
      h('div', { class: 'list' }, [...sorted].reverse().map((e) => h('div', { class: 'item' },
        h('div', { class: 'grow' }, h('div', { class: 'title', text: `${e.sys}/${e.dia} mmHg` }), h('div', { class: 'soft small', text: `${fmtDate(e.datum)} · Puls ${e.puls || '–'}${e.gewicht ? ' · ' + numFmt(e.gewicht) + ' kg' : ''}` })),
        h('span', { class: 'pill ' + (e.sys >= 140 || e.dia >= 90 ? 'warn' : 'ok'), text: e.sys >= 140 || e.dia >= 90 ? 'erhöht' : 'im Zielbereich' }),
        btn('', { kind: 'small', icon: 'trash', title: 'Messung löschen', onclick: () => { state.werte = state.werte.filter((x) => x.id !== e.id); commit(); } }))))));
    return v;
  }

  // ---------------------------------------------------------------
  // Laborergebnisse (Ampel, Referenzbereich, Verlauf)
  // ---------------------------------------------------------------
  // [Name, Einheit, Referenz von, Referenz bis, Nachkommastellen] – Beispielbereiche, maßgeblich sind die Angaben des jeweiligen Labors
  const LAB_GROUPS = [
    ['Blutbild', [['Hämoglobin', 'g/dl', 12, 16, 1], ['Leukozyten', '/nl', 4, 10, 1], ['Thrombozyten', '/nl', 150, 400, 0]]],
    ['Stoffwechsel', [['Glukose nüchtern', 'mg/dl', 70, 99, 0], ['HbA1c', '%', 4, 5.7, 1], ['Vitamin D (25-OH)', 'ng/ml', 30, 60, 0]]],
    ['Blutfette', [['Cholesterin gesamt', 'mg/dl', null, 200, 0], ['LDL-Cholesterin', 'mg/dl', null, 116, 0], ['HDL-Cholesterin', 'mg/dl', 45, null, 0], ['Triglyceride', 'mg/dl', null, 150, 0]]],
    ['Niere, Leber, Elektrolyte', [['Kreatinin', 'mg/dl', 0.5, 0.9, 2], ['Kalium', 'mmol/l', 3.5, 5.1, 1], ['GPT (ALT)', 'U/l', null, 35, 0]]],
    ['Schilddrüse', [['TSH', 'mU/l', 0.4, 4, 1]]]
  ];
  const LAB_PARAMS = Object.fromEntries(LAB_GROUPS.flatMap(([, ps]) => ps).map(([name, unit, min, max, dec]) => [name, { unit, min, max, dec }]));
  const labRef = (p) => (p.min == null ? `< ${numFmt(p.max)}` : p.max == null ? `> ${numFmt(p.min)}` : `${numFmt(p.min)} – ${numFmt(p.max)}`);
  // Ampel: im Bereich = grün, bis 20 % daneben = gelb, deutlich daneben = rot
  function labStatus(name, wert) {
    const p = LAB_PARAMS[name];
    if (!p) return { cls: 'ok', label: 'ohne Referenz', dir: 0 };
    let dev = 0;
    let dir = 0;
    if (p.min != null && wert < p.min) { dev = (p.min - wert) / p.min; dir = -1; }
    else if (p.max != null && wert > p.max) { dev = (wert - p.max) / p.max; dir = 1; }
    if (!dir) return { cls: 'ok', label: 'normal', dir };
    return { cls: dev > 0.2 ? 'danger' : 'warn', label: dir > 0 ? 'erhöht' : 'erniedrigt', dir };
  }
  const labSeries = (name) => state.labor.filter((l) => l.werte.some((w) => w.name === name)).sort((a, b) => a.datum.localeCompare(b.datum)).map((l) => ({ datum: l.datum, wert: l.werte.find((w) => w.name === name).wert }));
  const labFmt = (name, wert) => { const p = LAB_PARAMS[name]; return numFmt(p ? Number(wert).toFixed(p.dec) : wert); };
  const STATUS_COLOR = { ok: '#5bf0a8', warn: '#ffd166', danger: '#ff7e86' };

  function sparkline(series, name) {
    const w = 96, hh = 30;
    const vals = series.map((x) => x.wert);
    const min = Math.min(...vals), max = Math.max(...vals);
    const x = (i) => 4 + ((w - 8) * i) / Math.max(1, vals.length - 1);
    const y = (v) => (max === min ? hh / 2 : 4 + (hh - 8) * (1 - (v - min) / (max - min)));
    const lastSt = labStatus(name, vals[vals.length - 1]).cls;
    return s('svg', { viewBox: `0 0 ${w} ${hh}`, class: 'spark', 'aria-hidden': 'true' },
      s('polyline', { points: vals.map((v, i) => `${x(i)},${y(v)}`).join(' '), fill: 'none', stroke: '#4cc9f0', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }),
      s('circle', { cx: x(vals.length - 1), cy: y(vals[vals.length - 1]), r: 3.6, fill: STATUS_COLOR[lastSt] }));
  }

  // Linien- oder Balkendiagramm mit schraffiertem Referenzband
  function labChart(name, series, kind) {
    const p = LAB_PARAMS[name];
    const W = 640, H = 270, L = 54, R = 40, T = 20, B = 40;
    const vals = series.map((x) => x.wert);
    let lo = Math.min(...vals, p.min == null ? p.max : p.min);
    let hi = Math.max(...vals, p.max == null ? p.min : p.max);
    const padv = (hi - lo) * 0.22 || 1;
    const yMin = kind === 'bar' ? 0 : Math.max(0, lo - padv);
    const yMax = hi + padv;
    const y = (v) => T + (H - T - B) * (1 - (v - yMin) / (yMax - yMin));
    const n = series.length;
    const x = (i) => (kind === 'bar' ? L + ((W - L - R) * (i + 0.5)) / n : L + (n > 1 ? ((W - L - R) * i) / (n - 1) : (W - L - R) / 2));
    const svg = s('svg', { class: 'chart lab-chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Verlauf ${name}` });
    for (let g = 0; g <= 4; g++) {
      const val = yMin + ((yMax - yMin) * g) / 4;
      svg.appendChild(s('line', { class: 'grid-line', x1: L, x2: W - R, y1: y(val), y2: y(val) }));
      svg.appendChild(s('text', { x: 8, y: y(val) + 4 }, labFmt(name, val)));
    }
    const bandTop = p.max == null ? T : y(Math.min(p.max, yMax));
    const bandBot = p.min == null ? H - B : y(Math.max(p.min, yMin));
    svg.appendChild(s('rect', { class: 'ref-band', x: L, y: bandTop, width: W - L - R, height: Math.max(2, bandBot - bandTop), rx: 6 }));
    svg.appendChild(s('text', { class: 'ref-label', x: W - R - 6, y: bandTop + 15, 'text-anchor': 'end' }, `Referenz ${labRef(p)} ${p.unit}`));
    series.forEach((e, i) => svg.appendChild(s('text', { x: x(i), y: H - 12, 'text-anchor': 'middle' }, `${fmtShort(e.datum)}${e.datum.slice(2, 4)}`)));
    if (kind === 'bar') {
      const bw = Math.min(72, ((W - L - R) / n) * 0.5);
      series.forEach((e, i) => {
        const st = labStatus(name, e.wert).cls;
        svg.appendChild(s('rect', { class: 'bar ' + st, x: x(i) - bw / 2, y: y(e.wert), width: bw, height: Math.max(2, H - B - y(e.wert)), rx: 7, style: `animation-delay:${i * 90}ms` }));
        svg.appendChild(s('text', { class: 'val', x: x(i), y: y(e.wert) - 7, 'text-anchor': 'middle' }, labFmt(name, e.wert)));
      });
    } else {
      svg.appendChild(s('polyline', { class: 'l1', points: series.map((e, i) => `${x(i)},${y(e.wert)}`).join(' ') }));
      series.forEach((e, i) => {
        svg.appendChild(s('circle', { cx: x(i), cy: y(e.wert), r: 6, fill: STATUS_COLOR[labStatus(name, e.wert).cls], stroke: '#0b1f4b', 'stroke-width': 2 }));
        svg.appendChild(s('text', { class: 'val', x: x(i), y: y(e.wert) - 12, 'text-anchor': 'middle' }, labFmt(name, e.wert)));
      });
    }
    return svg;
  }

  function viewLabParam(name) {
    const p = LAB_PARAMS[name];
    const series = labSeries(name);
    openModal(name, (modal) => {
      let kind = view.labKind || 'line';
      const box = h('div', { class: 'chart-box' });
      const draw = () => {
        box.textContent = '';
        box.appendChild(labChart(name, series, kind));
        kinds.forEach(([k, b]) => b.classList.toggle('on', k === kind));
      };
      const kinds = [['line', h('button', { class: 'chip', type: 'button', id: 'kind-line', onclick: () => { kind = view.labKind = 'line'; draw(); } }, 'Linie')], ['bar', h('button', { class: 'chip', type: 'button', id: 'kind-bar', onclick: () => { kind = view.labKind = 'bar'; draw(); } }, 'Balken')]];
      const last = series[series.length - 1];
      const st = labStatus(name, last.wert);
      modal.appendChild(h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:6px' },
        h('div', {}, h('div', { class: 'big-num', text: `${labFmt(name, last.wert)} ${p.unit}` }), h('div', { class: 'soft small', text: `Referenzbereich ${labRef(p)} ${p.unit} (Beispiel)` })),
        h('div', { class: 'row' }, statusPill(st.cls, st.label), h('div', { class: 'chips' }, kinds.map(([, b]) => b)))));
      modal.appendChild(box);
      draw();
      modal.appendChild(h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, ['Datum', 'Wert', 'Bewertung'].map((t) => h('th', { text: t })))),
        h('tbody', {}, [...series].reverse().map((e) => { const s2 = labStatus(name, e.wert); return h('tr', {}, h('td', { text: fmtDate(e.datum) }), h('td', { class: 'num', text: `${labFmt(name, e.wert)} ${p.unit}` }), h('td', {}, statusPill(s2.cls, s2.label))); }))));
      modal.appendChild(h('div', { class: 'modal-actions' }, btn('Schließen', { onclick: closeModal })));
    }, { wide: true });
  }

  function viewLabBericht(l) {
    paperModal(`Laborbefund vom ${fmtDate(l.datum)}`, () => h('div', { class: 'doc-preview paper-lab' },
      letterhead('Laborbefund (Beispiel)'), h('div', { class: 'paper-title', text: 'Laborbefund' }),
      h('div', { class: 'pgrid' }, pfield('Patient/in', state.profil.name), pfield('geboren am', fmtDate(state.profil.geb)), pfield('Entnahme', fmtDate(l.datum)), pfield('Labor', l.labor)),
      h('table', { class: 'lab-table' }, h('thead', {}, h('tr', {}, ['Parameter', 'Wert', 'Einheit', 'Referenz', 'Bewertung'].map((t) => h('th', { text: t })))),
        h('tbody', {}, l.werte.map((w) => {
          const p = LAB_PARAMS[w.name] || { unit: '', min: null, max: null };
          const st = labStatus(w.name, w.wert);
          return h('tr', { class: st.cls === 'ok' ? '' : st.dir > 0 ? 'high' : 'low' }, h('td', { text: w.name }), h('td', { class: 'lab-val', text: labFmt(w.name, w.wert) }), h('td', { text: p.unit }), h('td', { text: LAB_PARAMS[w.name] ? labRef(p) : '–' }),
            h('td', {}, h('span', { class: 'pill ' + st.cls, text: st.label })));
        }))),
      demoNote('Beispiel-Befund (Demo, frei erfunden). Referenzbereiche sind beispielhaft; maßgeblich sind die Angaben des Labors. Die Ampel ersetzt keine ärztliche Bewertung.')));
  }

  function rLabor() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Laborergebnisse', 'Ihre Blutwerte mit Ampel, Referenzbereich und Verlauf', ['flask', 'blue'], btn('Zu den Befunden', { icon: 'file', onclick: () => goto('befunde') })));
    const reports = [...state.labor].sort((a, b) => b.datum.localeCompare(a.datum));
    if (!reports.length) {
      v.appendChild(h('div', { class: 'card' }, h('div', { class: 'empty', text: 'Noch keine Laborbefunde vorhanden.' })));
      return v;
    }
    const latest = reports[0];
    const stats = latest.werte.map((w) => labStatus(w.name, w.wert).cls);
    const cnt = (c) => stats.filter((x) => x === c).length;
    v.appendChild(h('div', { class: 'card lab-hero' },
      h('div', { class: 'lab-hero-text' }, h('span', { class: 'pill info', text: `Letzter Befund · ${fmtDate(latest.datum)}` }), h('h2', { text: latest.labor }),
        h('div', { class: 'ampel-row' }, h('span', { class: 'ampel ok' }, h('b', { text: String(cnt('ok')) }), 'im Bereich'), h('span', { class: 'ampel warn' }, h('b', { text: String(cnt('warn')) }), 'leicht abweichend'), h('span', { class: 'ampel danger' }, h('b', { text: String(cnt('danger')) }), 'deutlich abweichend')),
        h('p', { class: 'soft small', text: 'Klicken Sie auf einen Wert, um den Verlauf als Linie oder Balken zu sehen.' })),
      h('img', { class: 'lab-hero-img', src: 'img/labor.svg', alt: 'Illustration: Reagenzgläser und Mikroskop' })));
    LAB_GROUPS.forEach(([group, params]) => {
      const rows = params.filter(([name]) => labSeries(name).length);
      if (!rows.length) return;
      v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:12px', text: group }),
        h('div', { class: 'table-wrap' }, h('table', { class: 'data-table lab-overview' },
          h('thead', {}, h('tr', {}, ['Parameter', 'Wert', 'Referenz', 'Bewertung', 'Verlauf'].map((t) => h('th', { text: t })))),
          h('tbody', {}, rows.map(([name, unit]) => {
            const series = labSeries(name);
            const last = series[series.length - 1];
            const st = labStatus(name, last.wert);
            return h('tr', { class: 'clickable', tabindex: '0', 'data-param': name, onclick: () => viewLabParam(name), onkeydown: (e) => { if (e.key === 'Enter') viewLabParam(name); } },
              h('td', {}, h('span', { class: 'dot ' + st.cls }), ' ', name), h('td', { class: 'num', text: `${labFmt(name, last.wert)} ${unit}` }), h('td', { class: 'soft', text: labRef(LAB_PARAMS[name]) }),
              h('td', {}, statusPill(st.cls, st.label)), h('td', {}, series.length > 1 ? sparkline(series, name) : h('span', { class: 'soft small', text: '–' })));
          }))))));
    });
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:12px', text: 'Meine Laborberichte' }),
      h('div', { class: 'list' }, reports.map((l) => {
        const bad = l.werte.filter((w) => labStatus(w.name, w.wert).cls !== 'ok').length;
        return h('div', { class: 'item clickable', onclick: () => viewLabBericht(l) }, h('span', { class: 'ic-soft' }, icon('flask')),
          h('div', { class: 'grow' }, h('div', { class: 'title', text: `Laborbefund vom ${fmtDate(l.datum)}` }), h('div', { class: 'soft small', text: `${l.labor} · ${plural(l.werte.length, 'Wert', 'Werte')}` })),
          statusPill(bad ? 'warn' : 'ok', bad ? `${bad} auffällig` : 'alles im Bereich'), btn('Ansehen', { kind: 'small', icon: 'print' }));
      }))));
    v.appendChild(demoHint('Beispieldaten und beispielhafte Referenzbereiche. Die Ampel ist eine Orientierung und ersetzt nicht die Bewertung durch Ihre Ärztin oder Ihren Arzt.'));
    return v;
  }

  // ---------------------------------------------------------------
  // Befunde
  // ---------------------------------------------------------------
  function rBefunde() {
    const v = h('div', { class: 'view' });
    const allowed = !!state.einstellungen.einwilligungen.befundbilder;
    const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none', id: 'befund-file' });
    file.addEventListener('change', () => {
      const f = file.files[0];
      if (!f) return;
      if (f.size > 3 * 1024 * 1024) { toast('Bild ist größer als 3 MB.'); return; }
      const r = new FileReader();
      r.onload = () => { state.befunde.push({ id: uid(), titel: f.name, datum: todayISO(), src: r.result }); commit(); toast('Befund hinzugefügt.'); };
      r.readAsDataURL(f);
    });
    v.appendChild(head('Befunde', 'Ihre Bilder und Untersuchungsergebnisse', ['file', 'gold'], btn('Befund hochladen', { kind: 'primary', icon: 'image', disabled: !allowed, title: allowed ? '' : 'Einwilligung unter „Datenschutz & Sicherheit“ erteilen', onclick: () => file.click() }), file));
    if (!allowed) v.appendChild(h('p', { class: 'lock-note', text: 'Das Speichern von Befund-Bildern ist ausgeschaltet. Sie können es unter „Datenschutz & Sicherheit → Einwilligungen“ erlauben.' }));
    if (state.labor.length) {
      const reports = [...state.labor].sort((a, b) => b.datum.localeCompare(a.datum));
      v.appendChild(h('div', { class: 'card' }, h('div', { class: 'card-title' }, h('h2', { text: 'Laborbefunde' }), btn('Alle Laborergebnisse', { kind: 'small', icon: 'flask', onclick: () => goto('labor') })),
        h('div', { class: 'list' }, reports.map((l) => {
          const bad = l.werte.filter((w) => labStatus(w.name, w.wert).cls !== 'ok').length;
          return h('div', { class: 'item clickable', onclick: () => viewLabBericht(l) }, h('span', { class: 'ic-soft' }, icon('flask')),
            h('div', { class: 'grow' }, h('div', { class: 'title', text: `Blutwerte vom ${fmtDate(l.datum)}` }), h('div', { class: 'soft small', text: l.labor })), statusPill(bad ? 'warn' : 'ok', bad ? `${bad} auffällig` : 'unauffällig'));
        }))));
    }
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:12px', text: 'Bilder und Dokumente' }), state.befunde.length ? h('div', { class: 'gallery' }, state.befunde.map((b) =>
      h('figure', { class: 'figure', onclick: () => openModal(b.titel, (m) => {
        m.appendChild(h('div', { class: 'lightbox' }, h('img', { src: b.src, alt: b.titel })));
        m.appendChild(h('div', { class: 'modal-actions' }, btn('Entfernen', { kind: 'danger', icon: 'trash', onclick: () => { state.befunde = state.befunde.filter((x) => x.id !== b.id); closeModal(); commit(); } }), btn('Schließen', { onclick: closeModal })));
      }) }, h('img', { src: b.src, alt: b.titel }), h('figcaption', { text: `${b.titel} · ${fmtDate(b.datum)}` }))))
      : h('div', { class: 'empty', text: 'Noch keine Befund-Bilder.' })));
    return v;
  }

  // ---------------------------------------------------------------
  // Vorsorge & Impfungen
  // ---------------------------------------------------------------
  const VORSORGE_ARTEN = ['Gesundheits-Check-up', 'Hautkrebs-Screening', 'Darmkrebs-Vorsorge', 'Krebsfrüherkennung (Frauen)', 'Krebsfrüherkennung (Männer)', 'Zahnärztliche Kontrolle', 'Augenärztliche Kontrolle', 'Sonstiges'];
  const IMPFSTOFFE = ['Influenza (Grippe)', 'COVID-19', 'Tetanus / Diphtherie / Keuchhusten (Tdap)', 'Pneumokokken', 'Gürtelrose', 'FSME', 'Hepatitis B', 'Masern', 'HPV'];
  function vorsorgeNeu() {
    formModal('Vorsorge eintragen', [
      { key: 'art', label: 'Art', type: 'select', options: VORSORGE_ARTEN, value: VORSORGE_ARTEN[0] },
      { key: 'letzte', label: 'Zuletzt durchgeführt (optional)', type: 'date' },
      { key: 'faellig', label: 'Nächste fällig', type: 'date', value: addDays(todayISO(), 90) }
    ], (f) => {
      if (!f.faellig) { toast('Bitte das Fälligkeitsdatum angeben.'); return false; }
      state.vorsorge.push({ id: uid(), art: f.art, letzte: f.letzte, faellig: f.faellig, erinnerung: true });
      commit(); toast('Vorsorge eingetragen.');
    });
  }
  function impfungNeu() {
    formModal('Impfung eintragen', [
      { key: 'name', label: 'Impfung', type: 'select', options: IMPFSTOFFE, value: IMPFSTOFFE[0] },
      { key: 'datum', label: 'Geimpft am', type: 'date', value: todayISO() },
      { key: 'naechste', label: 'Nächste Auffrischung (optional)', type: 'date' }
    ], (f) => {
      if (!f.datum) { toast('Bitte das Impfdatum angeben.'); return false; }
      state.impfungen.push({ id: uid(), name: f.name, datum: f.datum, naechste: f.naechste, erinnerung: !!f.naechste });
      commit(); toast('Impfung in den Impfpass eingetragen.');
    });
  }
  function dueRow(o) {
    const { e, title, line, due } = o;
    return h('div', { class: 'item' }, h('span', { class: 'ic-soft' }, icon(o.ic)),
      h('div', { class: 'grow' }, h('div', { class: 'title', text: title }), h('div', { class: 'soft small', text: line })),
      due ? statusPill(dueClass(due), dueText(due)) : statusPill('', 'kein Termin geplant'),
      h('button', { class: 'bell-toggle' + (e.erinnerung ? ' on' : ''), type: 'button', 'aria-pressed': e.erinnerung ? 'true' : 'false', title: e.erinnerung ? 'Erinnerung ist an' : 'Erinnerung ist aus', onclick: () => { e.erinnerung = !e.erinnerung; commit(); toast(e.erinnerung ? 'Erinnerung eingeschaltet.' : 'Erinnerung ausgeschaltet.'); } }, icon('bell')),
      due ? btn('Termin anfragen', { kind: 'small', icon: 'calendar', onclick: () => anfragen({ grund: title }) }) : null,
      btn('', { kind: 'small', icon: 'trash', title: 'Eintrag löschen', onclick: () => confirmModal(`„${title}“ löschen?`, () => { o.remove(); commit(); }) }));
  }
  function rVorsorge() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Vorsorge & Impfungen', 'Fällige Untersuchungen, Ihr Impfpass und Erinnerungen', ['shield', 'green'], btn('Vorsorge', { icon: 'plus', onclick: vorsorgeNeu }), btn('Impfung', { kind: 'primary', icon: 'plus', onclick: impfungNeu })));
    const due = faelligVorsorge().length + faelligImpfungen().length;
    const over = state.vorsorge.filter((e) => e.faellig && diffDays(e.faellig) < 0).length + state.impfungen.filter((e) => e.naechste && diffDays(e.naechste) < 0).length;
    v.appendChild(h('div', { class: 'grid cols-3' },
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('bell')), h('div', {}, h('div', { class: 'stat-num', text: String(due) }), h('div', { class: 'soft small', text: 'in 30 Tagen fällig' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon warn' }, icon('clock')), h('div', {}, h('div', { class: 'stat-num', text: String(over) }), h('div', { class: 'soft small', text: 'überfällig' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('syringe')), h('div', {}, h('div', { class: 'stat-num', text: String(state.impfungen.length) }), h('div', { class: 'soft small', text: 'Einträge im Impfpass' })))));
    const vs = [...state.vorsorge].sort((a, b) => (a.faellig || '9').localeCompare(b.faellig || '9'));
    v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:12px', text: 'Vorsorge-Untersuchungen' }),
      vs.length ? h('div', { class: 'list' }, vs.map((e) => dueRow({ e, ic: 'shield', title: e.art, line: `Zuletzt: ${e.letzte ? fmtDate(e.letzte) : 'noch nie'} · nächste: ${fmtDate(e.faellig)}`, due: e.faellig, remove: () => { state.vorsorge = state.vorsorge.filter((x) => x.id !== e.id); } })))
        : h('div', { class: 'empty', text: 'Keine Vorsorge eingetragen.' })));
    const im = [...state.impfungen].sort((a, b) => (a.naechste || '9').localeCompare(b.naechste || '9'));
    v.appendChild(h('div', { class: 'card pass' }, h('div', { class: 'card-title' }, h('h2', { text: 'Impfpass' }), h('img', { class: 'pass-img', src: 'img/impfpass.svg', alt: 'Illustration: Impfpass mit Spritze' })),
      im.length ? h('div', { class: 'list' }, im.map((e) => dueRow({ e, ic: 'syringe', title: e.name, line: `Geimpft am ${fmtDate(e.datum)}${e.naechste ? ' · nächste Auffrischung ' + fmtDate(e.naechste) : ' · keine Auffrischung geplant'}`, due: e.naechste, remove: () => { state.impfungen = state.impfungen.filter((x) => x.id !== e.id); } })))
        : h('div', { class: 'empty', text: 'Noch keine Impfungen eingetragen.' })));
    v.appendChild(demoHint('Die Fristen sind Beispielwerte. Welche Vorsorge und Impfungen für Sie sinnvoll sind, entscheidet Ihre Ärztin oder Ihr Arzt (Empfehlungen der STIKO). Erinnerungen erscheinen nur in dieser App, nicht als Benachrichtigung des Betriebssystems.'));
    return v;
  }

  // ---------------------------------------------------------------
  // Medikamentensuche (Beispielkatalog)
  // ---------------------------------------------------------------
  const FORM_NAMES = {
    Tbl: 'Tabletten', FTA: 'Filmtabletten', Kautbl: 'Kautabletten', Brausetbl: 'Brausetabletten', Drg: 'Dragees', Kps: 'Kapseln', 'MSR-Tbl': 'magensaftresistente Tabletten', 'MSR-Kps': 'magensaftresistente Kapseln',
    'ret-Tbl': 'Retardtabletten', 'ret-Kps': 'Retardkapseln', Sup: 'Zäpfchen', Tr: 'Tropfen', Saft: 'Saft', Susp: 'Suspension', Sirup: 'Sirup', Creme: 'Creme', Salbe: 'Salbe', Gel: 'Gel', Pflaster: 'Pflaster',
    Inj: 'Injektionslösung', Fertigpen: 'Fertigpen', Fertigspritze: 'Fertigspritze', Dosieraerosol: 'Dosieraerosol', Inhalator: 'Inhalator', Pulver: 'Pulver', Granulat: 'Granulat', Nasenspray: 'Nasenspray', Aug: 'Augentropfen', Spray: 'Spray', 'Lösung': 'Lösung'
  };
  const ATC_GROUPS = { A: 'Magen-Darm & Stoffwechsel', B: 'Blut & Gerinnung', C: 'Herz-Kreislauf', D: 'Haut', G: 'Urogenital & Hormone', H: 'Hormone', J: 'Infektionen & Impfstoffe', L: 'Immunsystem', M: 'Muskel & Skelett', N: 'Nervensystem', P: 'Parasiten', R: 'Atemwege & Allergie', S: 'Augen & Ohren', V: 'Sonstiges' };
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
      list.forEach((st) => packs.push({ form, formName: FORM_NAMES[form] || form, strength: /[A-Za-zµ%]/.test(st) || !unit ? st : `${st} ${unit}` }));
    });
    return packs;
  }
  const CATALOG = String(window.MED_CATALOG_RAW || '').split('\n').map((l) => l.trim()).filter((l) => l && l.split('|').length >= 4 && !l.startsWith('/*') && !l.startsWith('Format')).map((l) => {
    const f = l.split('|');
    const atc = f[1].trim();
    return { name: f[0].trim(), atc, grp: ATC_GROUPS[atc[0]] || 'Sonstiges', aliases: f[2].split(';').map((x) => x.trim()).filter(Boolean), packs: parsePacks(f.slice(3)) };
  });
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function searchCatalog(q, grpLetter) {
    const t = norm(q).trim();
    const pool = CATALOG.filter((e) => !grpLetter || e.atc[0] === grpLetter);
    if (!t) return grpLetter ? pool.slice(0, 40) : null;
    const toks = t.split(/\s+/);
    return pool.map((e) => {
      const nm = norm(e.name), al = e.aliases.map(norm), atc = norm(e.atc);
      let score = 0;
      for (const k of toks) {
        let sc = 0;
        if (nm.startsWith(k) || al.some((a) => a.startsWith(k))) sc = 5; else if (nm.includes(k) || al.some((a) => a.includes(k))) sc = 3;
        else if (atc.startsWith(k)) sc = 4; else if (norm(e.grp).includes(k)) sc = 1; else if (e.packs.some((p) => norm(p.strength + ' ' + p.formName).includes(k))) sc = 1;
        if (!sc) return null;
        score += sc;
      }
      return { e, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, 'de')).slice(0, 40).map((x) => x.e);
  }
  const POPULAR = ['Ramipril', 'Bisoprolol', 'Metformin', 'Pantoprazol', 'Ibuprofen', 'Paracetamol', 'Atorvastatin', 'Cetirizin'];

  function rKatalog() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Medikamentensuche', `Beispielkatalog mit ${CATALOG.length} Wirkstoffen: Handelsname, Wirkstoff oder ATC-Code`, ['search', 'gold']));
    const input = h('input', { type: 'text', id: 'kat-input', placeholder: 'Wirkstoff, Handelsname oder ATC-Code …', value: view.katQuery || '', 'aria-label': 'Medikament suchen', autocomplete: 'off' });
    const chips = h('div', { class: 'chips med-groups' });
    const results = h('div', { class: 'med-results', id: 'kat-results' });
    const drawChips = () => {
      chips.textContent = '';
      chips.appendChild(h('button', { class: 'chip' + (!view.katGrp ? ' on' : ''), type: 'button', onclick: () => { view.katGrp = ''; drawChips(); run(); } }, 'Alle'));
      MED_ORDER.forEach((l) => chips.appendChild(h('button', { class: 'chip' + (view.katGrp === l ? ' on' : ''), type: 'button', onclick: () => { view.katGrp = l; drawChips(); run(); } }, ATC_GROUPS[l])));
    };
    const entry = (e) => {
      let sel = e.packs[0] || null;
      const packBtns = e.packs.map((pk, i) => h('button', { class: 'chip pack' + (i === 0 ? ' on' : ''), type: 'button', title: `${e.name} ${pk.strength}, ${pk.formName}`, onclick: (ev) => { sel = pk; packBtns.forEach((b) => b.classList.remove('on')); ev.currentTarget.classList.add('on'); } }, pk.strength, h('small', { text: pk.formName })));
      return h('div', { class: 'med-res' },
        h('div', { class: 'med-head' }, h('strong', { text: e.name }), h('span', { class: 'pill info', text: e.atc }), h('span', { class: 'soft small', text: e.grp }), e.aliases.length ? h('span', { class: 'soft small', text: '· ' + e.aliases.slice(0, 3).join(', ') }) : null),
        packBtns.length ? h('div', { class: 'med-packs' }, packBtns) : null,
        h('div', { class: 'row', style: 'margin-top:10px' }, btn('Zu meinen Medikamenten hinzufügen', { kind: 'small primary', icon: 'plus', onclick: () => medHinzu({ name: sel ? `${e.name} ${sel.strength}` : e.name, hinweis: sel ? sel.formName : '', atc: e.atc }) })));
    };
    const run = () => {
      view.katQuery = input.value;
      results.textContent = '';
      const hits = searchCatalog(input.value, view.katGrp);
      if (hits === null) { results.appendChild(h('div', { class: 'soft', text: 'Tippen Sie einen Suchbegriff ein oder wählen Sie eine Gruppe.' })); return; }
      if (!hits.length) { results.appendChild(h('div', { class: 'empty', text: 'Nichts gefunden. Probieren Sie den Wirkstoff oder einen Teil des Namens.' })); return; }
      results.appendChild(h('div', { class: 'soft small', text: `${plural(hits.length, 'Treffer', 'Treffer')}${hits.length === 40 ? ' (die ersten 40)' : ''}` }));
      hits.forEach((e) => results.appendChild(entry(e)));
    };
    input.addEventListener('input', run);
    drawChips();
    v.appendChild(h('div', { class: 'card' }, h('div', { class: 'field' }, input),
      h('div', { class: 'chips' }, [h('span', { class: 'soft small', text: 'Häufig gesucht:' }), ...POPULAR.map((p) => h('button', { class: 'chip', type: 'button', onclick: () => { input.value = p; run(); } }, p))]),
      chips, results));
    run();
    v.appendChild(demoHint('Beispielkatalog ohne Gewähr, keine zugelassene Arzneimitteldatenbank. Er zeigt weder Wechselwirkungen noch Dosierungen. Packungsbeilage und ärztlichen Rat beachten; eigenständig keine Medikamente ändern.'));
    return v;
  }

  // ---------------------------------------------------------------
  // E-Rezepte (Demo-Simulation, kein gültiger Token)
  // ---------------------------------------------------------------
  function qrSvg(text, px) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
    return s('svg', { viewBox: `0 0 ${n + 4} ${n + 4}`, width: px, height: px, class: 'qr', 'shape-rendering': 'crispEdges', role: 'img', 'aria-label': 'QR-Code (Demo, kein gültiger Token)' },
      s('rect', { width: n + 4, height: n + 4, fill: '#fff' }), s('path', { d, fill: '#0b1f4b' }));
  }
  const erToken = (r) => `DEMO-KEIN-GUELTIGER-TOKEN|Task/${r.erezept.id}/$accept?ac=${r.erezept.code}`;
  const erStatus = (r) => (r.status === 'eingelöst' ? ['ok', 'eingelöst'] : r.gueltigBis < todayISO() ? ['danger', 'abgelaufen'] : ['info', 'offen']);

  function viewErezept(r) {
    const [cls, txt] = erStatus(r);
    paperModal(`E-Rezept – ${r.medikament}`, () => h('div', { class: 'doc-preview paper-rx paper-er' },
      letterhead('E-Rezept (Demo)'),
      h('div', { class: 'er-head' }, h('div', {}, h('div', { class: 'paper-title', text: 'E-Rezept' }), h('div', { class: 'paper-sub', text: 'Elektronische Verordnung · einlösbar mit der Gesundheitskarte' })), h('span', { class: 'pill ' + cls, text: txt })),
      patientBlock(),
      h('div', { class: 'er-grid' },
        h('div', { class: 'er-qr' }, qrSvg(erToken(r), 190), h('small', { text: 'Demo – kein gültiger E-Rezept-Token' })),
        h('div', {}, h('div', { class: 'rx-body' }, h('div', { class: 'rx-sym', text: 'Rp.' }), h('div', {}, h('div', { class: 'rx-med', text: r.medikament }), h('div', { text: `Menge: ${r.anzahl}× ${r.packung}` }), h('div', { text: 'aut idem: Austausch zulässig' }))),
          h('div', { class: 'pgrid one' }, pfield('E-Rezept-ID', r.erezept.id), pfield('Ausgestellt / gültig bis', `${fmtDate(r.datum)} / ${fmtDate(r.gueltigBis)}`), pfield('Ausgestellt von', r.arzt), r.status === 'eingelöst' ? pfield('Eingelöst am', fmtDate(r.eingeloest)) : null))),
      h('div', { class: 'er-steps' },
        h('div', {}, h('b', { text: '1 · Ausgestellt' }), h('span', { text: ' – von Ihrer Praxis (Beispiel)' })),
        h('div', {}, h('b', { text: '2 · Gespeichert' }), h('span', { text: ' – im E-Rezept-Fachdienst (nicht angebunden)' })),
        h('div', {}, h('b', { text: '3 · Eingelöst' }), h('span', { text: ' – Apotheke liest Karte oder Token' }))),
      demoNote('Demo – kein gültiger E-Rezept-Token. Patienten Welt ist nicht an die Telematikinfrastruktur angebunden; dieser QR-Code kann in keiner Apotheke eingelöst werden.')),
    r.status === 'eingelöst'
      ? btn('Wieder auf „offen“ setzen (Demo)', { id: 'er-reopen', onclick: () => { r.status = 'offen'; r.eingeloest = ''; commit(); viewErezept(r); } })
      : btn('Einlösung simulieren', { id: 'er-redeem', icon: 'check', onclick: () => { r.status = 'eingelöst'; r.eingeloest = todayISO(); commit(); viewErezept(r); toast('Als eingelöst markiert (Simulation).'); } }));
  }
  function erCard(r) {
    const [cls, txt] = erStatus(r);
    return h('button', { class: 'card er-card' + (r.status === 'eingelöst' ? ' used' : ''), type: 'button', 'data-er': r.id, onclick: () => viewErezept(r) },
      h('div', { class: 'er-card-qr' }, qrSvg(erToken(r), 112)),
      h('div', { class: 'er-card-body' }, h('span', { class: 'pill ' + cls, text: txt }), h('div', { class: 'title', text: r.medikament }), h('div', { class: 'soft small', text: `${r.anzahl}× ${r.packung}` }), h('div', { class: 'soft small', text: `gültig bis ${fmtDate(r.gueltigBis)}` })));
  }
  function folgerezeptAnfragen() {
    if (!state.medikamente.length) { toast('Tragen Sie zuerst ein Medikament ein.'); return; }
    formModal('Folgerezept anfragen', [
      { key: 'med', label: 'Medikament', type: 'select', options: state.medikamente.map((m) => m.name), value: state.medikamente[0].name },
      { key: 'text', label: 'Nachricht (optional)', type: 'textarea', placeholder: 'z. B. Packung reicht noch für eine Woche' }
    ], (f) => {
      state.nachrichten.push({ id: uid(), ts: Date.now(), typ: 'Rezeptanfrage', text: `Bitte um Folgerezept für: ${f.med}${f.text ? ' – ' + f.text : ''}` });
      commit(); toast('Anfrage lokal gespeichert (keine Verbindung zur Praxis).');
    }, 'Anfragen');
  }
  function rErezepte() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('E-Rezepte', 'Ihre elektronischen Rezepte mit QR-Code', ['qr', 'gold'], btn('Folgerezept anfragen', { kind: 'primary', icon: 'send', onclick: folgerezeptAnfragen })));
    v.appendChild(h('div', { class: 'demo-banner', role: 'note' }, icon('help'), h('span', {}, h('strong', { text: 'Demo – kein gültiger E-Rezept-Token. ' }), 'Die QR-Codes sind Beispiele und lassen sich nicht in einer Apotheke einlösen; es besteht keine Verbindung zum E-Rezept-Fachdienst.')));
    const all = [...state.rezepte].sort((a, b) => b.datum.localeCompare(a.datum));
    const offen = all.filter(rezeptAktiv);
    const rest = all.filter((r) => !rezeptAktiv(r));
    v.appendChild(h('div', { class: 'grid cols-3' },
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('clock')), h('div', {}, h('div', { class: 'stat-num', text: String(offen.length) }), h('div', { class: 'soft small', text: 'offen' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon ok' }, icon('check')), h('div', {}, h('div', { class: 'stat-num', text: String(all.filter((r) => r.status === 'eingelöst').length) }), h('div', { class: 'soft small', text: 'eingelöst' }))),
      h('div', { class: 'card stat', style: 'margin:0' }, h('div', { class: 'stat-icon' }, icon('pill')), h('div', {}, h('div', { class: 'stat-num', text: String(all.length) }), h('div', { class: 'soft small', text: 'Rezepte gesamt' })))));
    v.appendChild(h('h2', { class: 'section-h', text: 'Offene E-Rezepte' }));
    v.appendChild(offen.length ? h('div', { class: 'er-grid-cards' }, offen.map(erCard)) : h('div', { class: 'card' }, h('div', { class: 'empty', text: 'Keine offenen E-Rezepte.' })));
    if (rest.length) {
      v.appendChild(h('h2', { class: 'section-h', text: 'Eingelöst und abgelaufen' }));
      v.appendChild(h('div', { class: 'er-grid-cards' }, rest.map(erCard)));
    }
    return v;
  }

  // ---------------------------------------------------------------
  // Krankmeldungen (eAU)
  // ---------------------------------------------------------------
  const auTage = (k) => Math.round((new Date(k.bis + 'T12:00:00') - new Date(k.von + 'T12:00:00')) / 86400000) + 1;
  function viewAu(k) {
    let copy = 'patient';
    const mount = h('div', { class: 'paper-wrap' });
    const draw = () => {
      mount.textContent = '';
      const ag = copy === 'ag';
      mount.appendChild(h('div', { class: 'no-print chips', style: 'margin:0 0 12px' },
        h('button', { class: 'chip' + (!ag ? ' on' : ''), type: 'button', id: 'au-patient', onclick: () => { copy = 'patient'; draw(); } }, 'Ihre Kopie'),
        h('button', { class: 'chip' + (ag ? ' on' : ''), type: 'button', id: 'au-ag', onclick: () => { copy = 'ag'; draw(); } }, 'Kopie für den Arbeitgeber')));
      mount.appendChild(h('div', { class: 'doc-preview paper-au' },
        letterhead(ag ? 'Kopie für den Arbeitgeber (Demo)' : 'Ausfertigung für Versicherte (Demo)'),
        h('div', { class: 'paper-title', text: 'Arbeitsunfähigkeitsbescheinigung' }),
        h('div', { class: 'paper-sub', text: ag ? 'Kopie für den Arbeitgeber – ohne Diagnose' : 'Ausfertigung für die versicherte Person' }),
        patientBlock(),
        h('div', { class: 'pgrid' }, pfield('Art', k.art), pfield('Arbeitsunfähig seit', fmtDate(k.von)), pfield('Voraussichtlich bis', fmtDate(k.bis)), pfield('Dauer', plural(auTage(k), 'Tag', 'Tage'))),
        ag ? null : h('div', { class: 'pgrid one' }, pfield('Diagnose', k.diagnose)),
        h('div', { class: 'pgrid' }, pfield('Ausgestellt von', k.arzt), pfield('Praxis', state.profil.praxis), pfield('Übermittlung an Krankenkasse', k.kasse ? 'digital gesendet am ' + fmtDate(isoDate(new Date(k.kasseAm))) : 'ausstehend'), pfield('Arbeitgeber', k.ag ? 'Kopie bereitgestellt' : 'noch nicht bereitgestellt')),
        h('div', { class: 'sign' }, h('div', { class: 'sign-line' }), h('small', { text: k.arzt + ' (Beispiel-Unterschrift)' })),
        demoNote('Beispiel-Dokument (Demo, frei erfunden). Eine echte eAU wird von der Praxis digital an die Krankenkasse übermittelt; Patienten Welt ist daran nicht angebunden.')));
    };
    paperModal(`Krankmeldung ${fmtDate(k.von)} – ${fmtDate(k.bis)}`, () => { draw(); return mount; });
  }
  function rKrankmeldungen() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Krankmeldungen', 'Ihre elektronischen Arbeitsunfähigkeitsbescheinigungen (eAU)', ['thermo', 'red'], btn('Krankmeldung anfragen', { kind: 'primary', icon: 'send', onclick: () => formModal('Krankmeldung anfragen', [{ key: 'text', label: 'Anliegen', type: 'textarea', placeholder: 'z. B. Ich bin seit gestern erkältet.' }], (f) => { if (!f.text) { toast('Bitte ein Anliegen angeben.'); return false; } state.nachrichten.push({ id: uid(), ts: Date.now(), typ: 'Krankmeldung', text: f.text }); commit(); toast('Anfrage lokal gespeichert (keine Verbindung zur Praxis).'); }, 'Anfragen') })));
    v.appendChild(h('div', { class: 'grid cols-3' },
      [['1', 'Praxis stellt aus', 'Die Ärztin oder der Arzt stellt die eAU aus.'], ['2', 'Krankenkasse', 'Die Praxis sendet sie digital an Ihre Krankenkasse.'], ['3', 'Arbeitgeber', 'Ihr Arbeitgeber ruft sie bei der Kasse ab; Sie erhalten eine Kopie.']].map(([n, t, d]) =>
        h('div', { class: 'card step', style: 'margin:0' }, h('div', { class: 'step-num', text: n }), h('div', {}, h('h3', { text: t }), h('p', { class: 'soft small', style: 'margin:4px 0 0', text: d }))))));
    const list = [...state.krankmeldungen].sort((a, b) => b.von.localeCompare(a.von));
    v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' }, list.length ? h('div', { class: 'list' }, list.map((k) =>
      h('div', { class: 'item clickable', 'data-au': k.id, onclick: () => viewAu(k) }, h('span', { class: 'ic-soft' }, icon('thermo')),
        h('div', { class: 'grow' }, h('div', { class: 'title', text: `${fmtDate(k.von)} bis ${fmtDate(k.bis)} · ${plural(auTage(k), 'Tag', 'Tage')}` }), h('div', { class: 'soft small', text: `${k.art} · ${k.arzt}` })),
        k.kasse ? statusPill('ok', 'digital an Krankenkasse gesendet') : statusPill('warn', 'Übermittlung ausstehend'),
        k.ag ? statusPill('info', 'Kopie für Arbeitgeber') : statusPill('', 'Kopie ausstehend'),
        btn('Ansehen & drucken', { kind: 'small', icon: 'print' }))))
      : h('div', { class: 'empty', text: 'Keine Krankmeldungen vorhanden.' })));
    v.appendChild(demoHint('Beispieldaten. Die App ist nicht an Krankenkassen oder Arbeitgeber angebunden; die Statusangaben zeigen, wie eine echte Übermittlung aussehen könnte.'));
    return v;
  }

  // ---------------------------------------------------------------
  // Überweisungen
  // ---------------------------------------------------------------
  const ueStatus = (u) => (u.status === 'eingelöst' ? ['ok', 'eingelöst'] : u.gueltigBis < todayISO() ? ['danger', 'abgelaufen'] : ['info', 'gültig']);
  function viewUe(u) {
    const [cls, txt] = ueStatus(u);
    paperModal(`Überweisung – ${u.fachrichtung}`, () => h('div', { class: 'doc-preview paper-ue' },
      letterhead('Überweisung (Demo)'), h('div', { class: 'er-head' }, h('div', { class: 'paper-title', text: 'Überweisungsschein' }), h('span', { class: 'pill ' + cls, text: txt })),
      patientBlock(),
      h('div', { class: 'pgrid' }, pfield('Überweisung an', u.fachrichtung), pfield('Ausgestellt am', fmtDate(u.datum)), pfield('Gültig bis', fmtDate(u.gueltigBis)), pfield('Ausgestellt von', u.arzt)),
      h('div', { class: 'pgrid one' }, pfield('Auftrag', u.auftrag)),
      h('div', { class: 'sign' }, h('div', { class: 'sign-line' }), h('small', { text: u.arzt + ' (Beispiel-Unterschrift)' })),
      demoNote('Beispiel-Dokument (Demo, frei erfunden). Vereinbaren Sie den Termin direkt in der Facharztpraxis.')),
    u.status === 'offen' ? btn('Termin anfragen', { icon: 'calendar', onclick: () => { closeModal(); goto('termine'); anfragen({ grund: 'Facharzt: ' + u.fachrichtung }); } }) : null);
  }
  function rUeberweisungen() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Überweisungen', 'Aufträge Ihrer Praxis an Fachärztinnen und Fachärzte', ['swap', 'blue']));
    const list = [...state.ueberweisungen].sort((a, b) => b.datum.localeCompare(a.datum));
    v.appendChild(h('div', { class: 'card' }, list.length ? h('div', { class: 'list' }, list.map((u) => {
      const [cls, txt] = ueStatus(u);
      return h('div', { class: 'item clickable', 'data-ue': u.id, onclick: () => viewUe(u) }, h('span', { class: 'ic-soft' }, icon('swap')),
        h('div', { class: 'grow' }, h('div', { class: 'title', text: u.fachrichtung }), h('div', { class: 'soft small', text: u.auftrag })),
        h('div', { class: 'ue-valid' }, h('div', { class: 'soft small', text: 'gültig bis' }), h('strong', { text: fmtDate(u.gueltigBis) })),
        statusPill(cls, txt), btn('Ansehen', { kind: 'small', icon: 'print' }));
    })) : h('div', { class: 'empty', text: 'Keine Überweisungen vorhanden.' })));
    v.appendChild(demoHint('Beispieldaten. Überweisungen gelten in der Regel bis zum Ende des Quartals; die Fristen hier sind nur Beispiele.'));
    return v;
  }

  // ---------------------------------------------------------------
  // Gesundheitskarte (Abbildung, keine echte eGK)
  // ---------------------------------------------------------------
  const maskKv = (k) => (k ? k.slice(0, 1) + '•'.repeat(Math.max(0, k.length - 3)) + k.slice(-2) : '–');
  function karteBearbeiten() {
    const k = state.karte;
    formModal('Kartendaten bearbeiten', [
      { key: 'kasse', label: 'Krankenkasse', value: k.kasse },
      { key: 'kvnr', label: 'Versichertennummer', value: k.kvnr },
      { key: 'versichertenart', label: 'Versichertenart', type: 'select', options: ['Pflichtversichert', 'Familienversichert', 'Rentner/in', 'Freiwillig versichert'], value: k.versichertenart },
      { key: 'beginn', label: 'Versicherungsbeginn', type: 'date', value: k.beginn },
      { key: 'gueltigBis', label: 'Karte gültig bis', type: 'date', value: k.gueltigBis }
    ], (f) => { Object.assign(state.karte, f); commit(); toast('Kartendaten gespeichert.'); });
  }
  function rKarte() {
    const k = state.karte;
    const back = !!view.kartRueck;
    const aktiv = !k.gueltigBis || k.gueltigBis >= todayISO();
    const v = h('div', { class: 'view' });
    v.appendChild(head('Gesundheitskarte', 'Ihre Versichertendaten auf einen Blick', ['card', 'blue'], btn(back ? 'Vorderseite' : 'Rückseite', { icon: 'swap', id: 'karte-flip', onclick: () => { view.kartRueck = !view.kartRueck; render(); } }), btn('Daten bearbeiten', { icon: 'save', onclick: karteBearbeiten })));
    const face = back
      ? h('div', { class: 'egk back flip-in' }, h('div', { class: 'egk-strip' }), h('div', { class: 'egk-back-body' }, h('div', { class: 'egk-meta', text: 'Versichertennummer' }), h('div', { class: 'egk-nr', text: k.kvnr || '–' }), h('div', { class: 'egk-meta', text: `IK ${k.ik || '–'} · ${k.versichertenart}` }), h('div', { class: 'egk-sign' }, h('span', { text: state.profil.name }))), h('div', { class: 'egk-sheen' }))
      : h('div', { class: 'egk flip-in' }, h('div', { class: 'egk-top' }, h('span', { text: 'Gesundheitskarte' }), h('small', { text: 'BEISPIEL' })),
        h('div', { class: 'egk-mid' }, h('div', { class: 'egk-chip' }), h('img', { class: 'egk-logo', src: 'img/logo.svg', alt: '' })),
        h('div', { class: 'egk-name', text: state.profil.name }), h('div', { class: 'egk-meta', text: `${k.kasse || 'Krankenkasse'}` }), h('div', { class: 'egk-meta', text: `Nr. ${k.kvnr || '–'} · gültig bis ${k.gueltigBis ? fmtDate(k.gueltigBis).slice(3) : '–'}` }), h('div', { class: 'egk-sheen' }));
    const dl = (rows) => h('dl', { class: 'kv' }, rows.flatMap(([a, b]) => [h('dt', { text: a }), h('dd', { text: b || '–' })]));
    v.appendChild(h('div', { class: 'grid cols-2' },
      h('div', { class: 'card egk-card', style: 'margin:0' }, h('div', { class: 'egk-wrap' }, face), h('p', { class: 'soft small', style: 'text-align:center;margin:18px 0 0', text: 'Abbildung einer Beispielkarte, keine echte Gesundheitskarte.' })),
      h('div', { class: 'card', style: 'margin:0' }, h('div', { class: 'card-title' }, h('h2', { text: 'Versicherungsstatus' }), statusPill(aktiv ? 'ok' : 'danger', aktiv ? 'aktiv' : 'Karte abgelaufen')),
        dl([['Krankenkasse', k.kasse], ['Versichertennummer', view.kvShow ? k.kvnr : maskKv(k.kvnr)], ['Versichertenart', k.versichertenart], ['Status', k.status], ['Versicherungsbeginn', fmtDate(k.beginn)], ['Karte gültig bis', fmtDate(k.gueltigBis)], ['IK-Nummer', k.ik]]),
        h('div', { class: 'row', style: 'margin-top:16px' }, btn(view.kvShow ? 'Nummer verbergen' : 'Nummer anzeigen', { kind: 'small', icon: 'eye', id: 'kv-toggle', onclick: () => { view.kvShow = !view.kvShow; render(); } }),
          btn('Karte aktualisieren (Simulation)', { kind: 'small', icon: 'check', onclick: () => toast('Simulation: Es gibt keine Verbindung zur Krankenkasse.') })))));
    v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:10px', text: 'Wofür die Karte gebraucht wird' }),
      h('div', { class: 'grid cols-3' }, [['E-Rezept einlösen', 'In der Apotheke wird das Rezept über die Karte abgerufen.', 'qr'], ['Praxisbesuch', 'Beim Einlesen in der Praxis werden Ihre Versichertendaten geprüft.', 'user'], ['Krankmeldung', 'Die eAU wird digital an Ihre Krankenkasse gesendet.', 'thermo']].map(([t, d, ic]) =>
        h('div', { class: 'step', style: 'margin:0' }, orb(ic, 'blue'), h('div', {}, h('h3', { text: t }), h('p', { class: 'soft small', style: 'margin:4px 0 0', text: d })))))));
    v.appendChild(demoHint('Demo: Die Daten sind frei erfunden und werden nicht mit einer Krankenkasse abgeglichen. Patienten Welt liest keine echte Gesundheitskarte.'));
    return v;
  }

  // ---------------------------------------------------------------
  // Praxis-Nachrichten
  // ---------------------------------------------------------------
  function rNachrichten() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Praxis-Nachrichten', 'Anfragen und Notizen an Ihre Praxis (nur lokal gespeichert)', ['chat', 'blue']));
    const chatBox = h('div', { class: 'chat' }, [...state.nachrichten].sort((a, b) => a.ts - b.ts).map((n) => h('div', {}, h('div', { class: 'bubble' }, h('strong', { text: n.typ + ': ' }), n.text), h('div', { class: 'stamp', text: fmtStamp(n.ts) }))));
    const ta = h('textarea', { placeholder: 'Ihre Nachricht an die Praxis …', style: 'min-height:80px', id: 'msg-text' });
    v.appendChild(h('div', { class: 'card' }, state.nachrichten.length ? chatBox : h('div', { class: 'empty', text: 'Noch keine Nachrichten.' }), h('div', { class: 'field' }, ta),
      btn('Speichern', { kind: 'primary', icon: 'send', onclick: () => { if (!ta.value.trim()) return; state.nachrichten.push({ id: uid(), ts: Date.now(), typ: 'Nachricht', text: ta.value.trim() }); commit(); } })));
    v.appendChild(demoHint('Nachrichten werden nicht an eine Praxis gesendet. Sie bleiben verschlüsselt auf diesem Gerät.'));
    setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 0);
    return v;
  }

  // ---------------------------------------------------------------
  // Demo & Medien
  // ---------------------------------------------------------------
  const MEDIA_IMAGES = [
    ['Instagram-Post 1 – Logo', 'media/instagram/post-1-logo.png'],
    ['Instagram-Post 2 – Start', 'media/instagram/post-2-start.png'],
    ['Instagram-Post 3 – Medikamente', 'media/instagram/post-3-medikamente.png'],
    ['Instagram-Post 4 – Meine Werte', 'media/instagram/post-4-werte.png'],
    ['Instagram-Post 5 – Laborergebnisse', 'media/instagram/post-5-labor.png'],
    ['Instagram-Post 6 – E-Rezepte', 'media/instagram/post-6-erezept.png'],
    ['Instagram-Post 7 – Krankmeldung', 'media/instagram/post-7-krankmeldung.png'],
    ['Instagram-Post 8 – Gesundheitskarte', 'media/instagram/post-8-gesundheitskarte.png'],
    ['Instagram-Post 9 – Datenschutz', 'media/instagram/post-9-datenschutz.png'],
    ['Instagram-Post 10 – Vorsorge & Impfungen', 'media/instagram/post-10-vorsorge.png'],
    ['Story / Reel-Cover', 'media/instagram/story-cover.png']
  ];
  function downloadLink(label, href, filename, kind) {
    const a = h('a', { class: 'btn ' + (kind || 'primary'), href, download: filename });
    a.appendChild(icon('download'));
    a.appendChild(document.createTextNode(label));
    return a;
  }
  function rMedien() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Demo & Medien', 'Vorführvideo, Social-Media-Reel und Instagram-Bilder zum Herunterladen', ['play', 'gold']));
    v.appendChild(h('div', { class: 'card' }, h('div', { class: 'card-title' }, h('h2', { text: 'Demoversion – Video mit Musik' }), downloadLink('Demo-Video herunterladen', 'media/patienten-welt-demo.mp4', 'Patienten-Welt-Demo.mp4')),
      h('video', { class: 'media-video', src: 'media/patienten-welt-demo.mp4', controls: true, preload: 'metadata', poster: 'media/demo-poster.jpg' })));
    v.appendChild(h('div', { class: 'grid cols-2' },
      h('div', { class: 'card', style: 'margin:0' }, h('div', { class: 'card-title' }, h('h2', { text: 'Social-Media-Reel (9:16)' }), downloadLink('Reel herunterladen', 'media/patienten-welt-reel.mp4', 'Patienten-Welt-Reel.mp4')),
        h('video', { class: 'media-video reel', src: 'media/patienten-welt-reel.mp4', controls: true, preload: 'metadata', poster: 'media/instagram/story-cover.png' })),
      h('div', { class: 'card', style: 'margin:0' }, h('h2', { style: 'margin-bottom:10px', text: 'Hinweis' }), h('p', { class: 'soft', text: 'Beide Videos sind mit derselben Hintergrundmusik unterlegt, die exakt so lang ist wie das Video. Reel: 1080×1920 (Instagram Reels, TikTok, Stories). Demo-Video: 1920×1080. Bilder: 1080×1080 (Feed).' }),
        h('p', { class: 'soft small', text: 'Alle Inhalte zeigen frei erfundene Beispieldaten. Patienten Welt ist eine Demo-App ohne Anbindung an Praxen, Krankenkassen oder die Telematikinfrastruktur und ersetzt keine ärztliche Beratung.' }))));
    v.appendChild(h('div', { class: 'card', style: 'margin-top:18px' }, h('h2', { style: 'margin-bottom:14px', text: 'Instagram-Bilder (3D-Hochglanz)' }),
      h('div', { class: 'gallery' }, MEDIA_IMAGES.map(([t, src]) => h('figure', { class: 'figure', style: 'cursor:default' }, h('img', { src, alt: t, loading: 'lazy' }),
        h('figcaption', { class: 'row' }, h('span', { style: 'flex:1', text: t }), downloadLink('PNG', src, src.split('/').pop(), 'small')))))));
    return v;
  }

  // ---------------------------------------------------------------
  // Datenschutz & Sicherheit
  // ---------------------------------------------------------------
  const DS_TABS = [['check', 'Sicherheits-Check'], ['zugang', 'Passwort & Sperre'], ['daten', 'Meine Daten'], ['sicherung', 'Sicherung'], ['einwilligung', 'Einwilligungen & Hinweise']];
  const daysAgo = (ts) => Math.floor((Date.now() - ts) / 86400000);

  function sicherheitsChecks() {
    const e = state.einstellungen;
    const out = [];
    out.push(['ok', 'Verschlüsselung aktiv', 'Alle Daten liegen als AES-256-GCM-Tresor vor. Der Schlüssel entsteht aus Ihrem Passwort (PBKDF2, 600.000 Runden).']);
    out.push(['ok', 'Passwortschutz', 'Beim Start und nach jeder Sperre ist das Passwort nötig. Nach Fehlversuchen steigt die Wartezeit.']);
    out.push(e.autoLockMin > 0 && e.autoLockMin <= 15 ? ['ok', 'Automatische Sperre', `Nach ${plural(e.autoLockMin, 'Minute', 'Minuten')} ohne Eingabe. Manuell mit Strg+L.`] : ['warn', e.autoLockMin > 0 ? 'Automatische Sperre sehr lang' : 'Automatische Sperre aus', 'Stellen Sie unter „Passwort & Sperre“ höchstens 15 Minuten ein.']);
    const rec = envelope && envelope.recovery ? envelope.recovery.created : 0;
    out.push(['ok', 'Wiederherstellungsschlüssel vorhanden', `Erstellt am ${rec ? fmtDate(isoDate(new Date(rec))) : '–'}. Bewahren Sie ihn getrennt vom Gerät auf.`]);
    out.push(e.letzteSicherung && daysAgo(e.letzteSicherung) <= 90 ? ['ok', 'Aktuelle Sicherung', `Letzte verschlüsselte Sicherung: ${fmtStamp(e.letzteSicherung)}.`] : ['warn', 'Keine aktuelle Sicherung', e.letzteSicherung ? `Die letzte Sicherung ist ${daysAgo(e.letzteSicherung)} Tage alt.` : 'Es wurde noch keine Sicherung erstellt (Reiter „Sicherung“).']);
    out.push(['ok', 'Keine Datenübertragung', 'Die App blockiert alle Internetanfragen und sendet keine Telemetrie. Schriften und Bilder sind lokal eingebunden.']);
    out.push(state.demo ? ['warn', 'Beispieldaten geladen', 'Die angezeigten Daten sind frei erfunden. Löschen Sie sie unter „Meine Daten“, bevor Sie eigene Daten eintragen.'] : ['ok', 'Eigene Daten', 'Es sind keine Beispieldaten geladen.']);
    const fails = (envelope.events || []).length;
    out.push(fails ? ['warn', 'Fehlgeschlagene Anmeldungen', `${plural(fails, 'Versuch', 'Versuche')} seit der letzten Meldung. Ändern Sie Ihr Passwort, falls Sie das nicht waren.`] : ['ok', 'Keine Fehlversuche', 'Seit der letzten Anmeldung wurden keine falschen Passwörter eingegeben.']);
    out.push(['info', 'Ihr Gerät', 'Aktivieren Sie die Festplattenverschlüsselung und die Bildschirmsperre des Betriebssystems und halten Sie es aktuell.']);
    return out;
  }

  function dsCheck() {
    const checks = sicherheitsChecks();
    const scored = checks.filter((c) => c[0] !== 'info');
    const okN = scored.filter((c) => c[0] === 'ok').length;
    const w = h('div', {});
    w.appendChild(h('div', { class: 'card sec-hero' }, ring(okN, scored.length), h('div', { class: 'grow' }, h('h2', { text: okN === scored.length ? 'Alles in Ordnung' : `${scored.length - okN} Punkt${scored.length - okN > 1 ? 'e' : ''} zur Verbesserung` }),
      h('p', { class: 'soft', style: 'margin:4px 0 0', text: `${okN} von ${scored.length} Sicherheitsprüfungen bestanden. Die Prüfung läuft lokal in der App.` })), h('img', { class: 'sec-shield', src: 'img/schild.svg', alt: 'Illustration: Schild mit Schloss' })));
    w.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:12px', text: 'Prüfpunkte' }), h('div', { class: 'list', id: 'sec-checks' }, checks.map(([cls, t, d]) =>
      h('div', { class: 'item' }, h('span', { class: 'chk ' + cls }, icon(cls === 'ok' ? 'check' : cls === 'warn' ? 'bell' : 'help')), h('div', { class: 'grow' }, h('div', { class: 'title', text: t }), h('div', { class: 'soft small', text: d })), statusPill(cls === 'info' ? 'info' : cls, cls === 'ok' ? 'in Ordnung' : cls === 'warn' ? 'prüfen' : 'Hinweis'))))));
    const log = [...state.sicherheitslog].reverse().slice(0, 8);
    w.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:12px', text: 'Letzte Sicherheitsereignisse' }),
      log.length ? h('div', { class: 'list' }, log.map((l) => h('div', { class: 'item' }, h('div', { class: 'grow', text: LOG_TEXT[l.a] || l.a }), h('span', { class: 'soft small', text: fmtStamp(l.ts) })))) : h('div', { class: 'empty', text: 'Noch keine Ereignisse.' }),
      h('p', { class: 'soft small', style: 'margin:10px 0 0', text: 'Das Ereignisprotokoll liegt nur im verschlüsselten Tresor und enthält keine Gesundheitsdaten.' })));
    return w;
  }

  function dsZugang() {
    const e = state.einstellungen;
    const w = h('div', {});
    // Passwort ändern
    const cur = pwField('Aktuelles Passwort', { id: 'pc-cur' });
    const pw1 = pwField('Neues Passwort (mindestens 12 Zeichen)', { meter: true, autocomplete: 'new-password', id: 'pc-pw1' });
    const pw2 = pwField('Neues Passwort wiederholen', { autocomplete: 'new-password', id: 'pc-pw2' });
    const err = h('div', { class: 'form-error', role: 'alert' });
    const form = h('form', { class: 'narrow' }, cur.field, pw1.field, pw2.field, err, btn('Passwort ändern', { kind: 'primary', icon: 'key', id: 'pc-go' }));
    form.lastChild.type = 'submit';
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      err.textContent = '';
      if (!(await Vault.verifyPassword(envelope, USER_ID, cur.input.value))) { err.textContent = 'Das aktuelle Passwort ist falsch.'; return; }
      const chk = Vault.checkPassword(pw1.input.value);
      if (!chk.ok) { err.textContent = 'Neues Passwort zu schwach: ' + chk.hints.join('; ') + '.'; return; }
      if (pw1.input.value !== pw2.input.value) { err.textContent = 'Die Passwörter stimmen nicht überein.'; return; }
      await enqueue(async () => { envelope = await Vault.setPassword(envelope, session, USER_ID, pw1.input.value); });
      logEvent('passwort_geaendert');
      commit();
      toast('Passwort geändert.');
    });
    w.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:6px', text: 'Passwort ändern' }), h('p', { class: 'soft small', text: 'Ihre Daten werden dabei nicht neu verschlüsselt; nur der Schlüsselschutz wird erneuert.' }), form));
    // Auto-Sperre
    const sel = h('select', { id: 'autolock', 'aria-label': 'Automatische Sperre' }, [1, 2, 5, 10, 15, 30, 60, 0].map((n) => h('option', { value: String(n), selected: n === e.autoLockMin, text: n === 0 ? 'nie (nicht empfohlen)' : `nach ${plural(n, 'Minute', 'Minuten')}` })));
    sel.addEventListener('change', () => { e.autoLockMin = Number(sel.value); commit(); toast('Einstellung gespeichert.'); });
    w.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:6px', text: 'Automatische Sperre' }), h('p', { class: 'soft small', text: 'Nach der eingestellten Zeit ohne Mausbewegung oder Tastendruck sperrt sich die App und zeigt nur noch die Anmeldung.' }),
      h('div', { class: 'row' }, h('div', { class: 'field', style: 'margin:0;min-width:260px' }, sel), btn('Jetzt sperren (Strg L)', { icon: 'lock', onclick: () => lockApp('manuell') }))));
    // Wiederherstellungsschlüssel
    const rec = envelope.recovery ? envelope.recovery.created : 0;
    w.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:6px', text: 'Wiederherstellungsschlüssel' }),
      h('p', { class: 'soft', text: `Aktueller Schlüssel erstellt am ${rec ? fmtDate(isoDate(new Date(rec))) : '–'}. Er ist der einzige Weg zurück, falls Sie das Passwort vergessen.` }),
      btn('Neuen Schlüssel erzeugen', { icon: 'key', id: 'rk-new', onclick: () => reauth('Passwort bestätigen', () => rotateRecoveryFlow()) })));
    return w;
  }

  // Übersicht der gespeicherten Daten (Auskunft und Löschung)
  function datenInventar() {
    return [['Profil, Allergien, Notfallkontakt', 1], ['Termine', state.termine.length], ['Medikamente', state.medikamente.length], ['Einnahme-Häkchen (Tage)', Object.keys(state.einnahmen).length], ['Messwerte (Blutdruck, Puls, Gewicht)', state.werte.length],
      ['Laborbefunde', state.labor.length], ['Befund-Bilder', state.befunde.length], ['E-Rezepte', state.rezepte.length], ['Krankmeldungen', state.krankmeldungen.length], ['Überweisungen', state.ueberweisungen.length],
      ['Vorsorge-Erinnerungen', state.vorsorge.length], ['Impfpass-Einträge', state.impfungen.length], ['Notizen und Anfragen', state.nachrichten.length], ['Kartendaten (Krankenkasse, Versichertennummer)', state.karte.kvnr || state.karte.kasse ? 1 : 0]];
  }
  function viewAuskunft() {
    logEvent('auskunft'); persist();
    paperModal('Auskunftsblatt zu Ihren Daten', () => {
      const sec = (title, ...kids) => h('div', { class: 'ask-sec' }, h('h3', { text: title }), kids);
      return h('div', { class: 'doc-preview paper-ask' }, letterhead('Auskunft über gespeicherte Daten'),
        h('div', { class: 'paper-title', text: 'Auskunft über Ihre gespeicherten Daten' }), h('div', { class: 'paper-sub', text: `Stand: ${fmtDate(todayISO())} · Orientiert an Art. 15 DSGVO` }),
        h('div', { class: 'pgrid' }, pfield('Name', state.profil.name), pfield('geboren am', fmtDate(state.profil.geb))),
        sec('Verantwortlich', h('p', { text: 'Sie selbst. Patienten Welt verarbeitet Ihre Daten ausschließlich lokal auf diesem Gerät für Ihre persönliche Gesundheitsverwaltung. Es gibt keinen Server, kein Benutzerkonto bei einem Anbieter und keinen Zugriff des Herausgebers auf Ihre Daten.' })),
        sec('Gespeicherte Daten', h('table', { class: 'lab-table' }, h('tbody', {}, datenInventar().map(([k, n]) => h('tr', {}, h('td', { text: k }), h('td', { class: 'lab-val', text: String(n) })))))),
        sec('Zweck', h('p', { text: 'Übersicht über Termine, Medikamente, Messwerte, Befunde, Rezepte, Krankmeldungen, Überweisungen, Vorsorge und Impfungen.' })),
        sec('Herkunft der Daten', h('p', { text: state.demo ? 'Frei erfundene Beispieldaten der App.' : 'Eigene Eingaben sowie von Ihnen eingespielte Sicherungen und Befunde.' })),
        sec('Empfänger', h('p', { text: 'Keine. Daten werden nicht übermittelt, nicht an Praxen, Krankenkassen oder Dritte und nicht an den Herausgeber der App. Es gibt keine Telemetrie.' })),
        sec('Speicherdauer', h('p', { text: 'Bis Sie die Daten selbst löschen. Unter „Datenschutz & Sicherheit → Meine Daten“ können Sie alles unwiderruflich entfernen.' })),
        sec('Schutz', h('p', { text: 'Verschlüsselter Tresor (AES-256-GCM), Passwortsperre, automatische Sperre, Wiederherstellungsschlüssel.' })),
        sec('Ihre Rechte', h('p', { text: 'Auskunft (dieses Blatt), Berichtigung (alle Einträge sind bearbeitbar), Löschung (Art. 17), Datenübertragbarkeit (Art. 20: Datenkopie als Datei) und Widerruf von Einwilligungen (Reiter „Einwilligungen“).' })),
        demoNote('Muster-Auskunft. Sie beschreibt, was die App technisch speichert; sie ist keine Rechtsberatung.'));
    });
  }
  function exportDatenkopie() {
    reauth('Datenkopie exportieren', async () => {
      const data = { exportiert: new Date().toISOString(), grundlage: 'Art. 20 DSGVO (Datenübertragbarkeit), Format JSON', anwendung: 'Patienten Welt', daten: state };
      const r = await window.welt.saveTextFile({ title: 'Datenkopie speichern', defaultName: `Patienten-Welt-Datenkopie-${todayISO()}.json`, text: JSON.stringify(data, null, 2), filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (r && r.ok) { logEvent('datenkopie'); commit(); toast('Datenkopie gespeichert. Sie ist NICHT verschlüsselt – sicher aufbewahren.'); }
    }, h('p', { class: 'lock-note', text: 'Achtung: Die Datenkopie enthält Ihre Gesundheitsdaten im Klartext (JSON-Datei, nicht verschlüsselt). Bewahren Sie sie sicher auf und löschen Sie sie, wenn Sie sie nicht mehr brauchen. Für eine verschlüsselte Kopie nutzen Sie „Sicherung“.' }));
  }
  function alleEintraegeLoeschen() {
    confirmModal('Alle Einträge (Termine, Medikamente, Werte, Befunde, Rezepte, …) löschen? Passwort und Tresor bleiben bestehen.', () => {
      const keep = { einstellungen: state.einstellungen, sicherheitslog: state.sicherheitslog, profil: Object.assign({}, state.profil) };
      state = Object.assign(emptyData(), keep, { demo: false });
      logEvent('eintraege_geloescht');
      view.page = 'datenschutz';
      commit(); toast('Alle Einträge gelöscht.');
    }, 'Ja, alles löschen');
  }
  function beispieldatenLaden() {
    confirmModal('Aktuelle Einträge durch frei erfundene Beispieldaten ersetzen?', () => {
      const keep = { einstellungen: state.einstellungen, sicherheitslog: state.sicherheitslog };
      state = Object.assign(normalize(demoData()), keep);
      logEvent('beispieldaten'); commit(); toast('Beispieldaten geladen.');
    }, 'Ja, ersetzen');
  }
  function unwiderruflichLoeschen() {
    openModal('Alle Daten unwiderruflich löschen', (modal) => {
      modal.appendChild(h('p', { text: 'Löscht den verschlüsselten Tresor, die Sicherheitskopie und alle Reste auf diesem Gerät (Art. 17 DSGVO). Danach beginnt die App wie bei der ersten Einrichtung. Das lässt sich nicht rückgängig machen. Exportierte Sicherungen und Datenkopien bleiben bestehen und müssen von Ihnen selbst gelöscht werden.' }));
      const word = h('input', { type: 'text', id: 'del-word', placeholder: 'LÖSCHEN', autocomplete: 'off', spellcheck: 'false' });
      const pw = pwField('Passwort zur Bestätigung', { id: 'del-pw' });
      const err = h('div', { class: 'form-error', role: 'alert' });
      const go = h('button', { class: 'btn danger', type: 'submit', id: 'del-go', disabled: true }, icon('trash'), 'Endgültig löschen');
      const check = () => { go.disabled = word.value.trim() !== 'LÖSCHEN' || !pw.input.value; };
      word.addEventListener('input', check); pw.input.addEventListener('input', check);
      const form = h('form', {}, h('div', { class: 'field' }, h('label', { text: 'Zur Bestätigung „LÖSCHEN“ eintippen' }), word), pw.field, err, h('div', { class: 'modal-actions' }, btn('Abbrechen', { onclick: closeModal }), go));
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        if (!(await Vault.verifyPassword(envelope, USER_ID, pw.input.value))) { err.textContent = 'Passwort falsch.'; pw.input.value = ''; check(); return; }
        closeModal();
        const stale = saveChain;
        state = null; session = null; // verhindert, dass noch etwas zurückgeschrieben wird
        await stale;
        await window.welt.deleteAllData();
        envelope = null;
        document.getElementById('content').textContent = ''; document.getElementById('nav').textContent = ''; document.getElementById('sidebar-foot').textContent = '';
        showSetup(null);
      });
      modal.appendChild(form);
      setTimeout(() => word.focus(), 40);
    });
  }
  function dsDaten() {
    const w = h('div', {});
    w.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:6px', text: 'Was gespeichert ist' }), h('p', { class: 'soft small', text: 'Alles liegt verschlüsselt in einer Datei auf diesem Gerät.' }),
      h('div', { class: 'inventory' }, datenInventar().map(([k, n]) => h('div', { class: 'inv' }, h('strong', { text: String(n) }), h('span', { text: k }))))));
    w.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:6px', text: 'Auskunft und Datenkopie' }),
      h('p', { class: 'soft', text: 'Auskunftsblatt (Art. 15) zum Ausdrucken und eine Datenkopie in einem gängigen Format (Art. 20).' }),
      h('div', { class: 'row' }, btn('Auskunftsblatt anzeigen & drucken', { icon: 'print', id: 'ds-auskunft', onclick: viewAuskunft }), btn('Datenkopie als Datei (JSON)', { icon: 'save', id: 'ds-export', onclick: exportDatenkopie }))));
    w.appendChild(h('div', { class: 'card danger-zone' }, h('h2', { style: 'margin-bottom:6px', text: 'Löschen (Art. 17)' }),
      h('p', { class: 'soft', text: 'Sie können einzelne Einträge in den jeweiligen Menüs löschen oder hier alles auf einmal.' }),
      h('div', { class: 'row' }, btn('Beispieldaten laden', { icon: 'user', onclick: beispieldatenLaden }), btn('Alle Einträge löschen', { kind: 'danger', icon: 'trash', id: 'ds-clear', onclick: alleEintraegeLoeschen }),
        btn('Alles unwiderruflich löschen …', { kind: 'danger', icon: 'trash', id: 'ds-wipe', onclick: unwiderruflichLoeschen }))));
    return w;
  }

  async function sicherungExport() {
    state.einstellungen.letzteSicherung = Date.now();
    logEvent('sicherung_export');
    await persist();
    const r = await window.welt.saveTextFile({ title: 'Verschlüsselte Sicherung speichern', defaultName: `Patienten-Welt-Sicherung-${todayISO()}.pwbackup`, text: JSON.stringify(envelope), filters: [{ name: 'Patienten Welt Sicherung', extensions: ['pwbackup'] }] });
    if (r && r.ok) { toast('Verschlüsselte Sicherung gespeichert.'); render(); } else { state.einstellungen.letzteSicherung = 0; persist(); }
  }
  async function sicherungImport() {
    const f = await window.welt.openTextFile({ title: 'Sicherung öffnen', filters: [{ name: 'Patienten Welt Sicherung', extensions: ['pwbackup', 'json'] }] });
    if (!f) return;
    let env = null;
    try { env = JSON.parse(f.text); } catch (e) { /* ungültig */ }
    if (!Vault.isEnvelope(env)) { toast('Datei ist keine gültige verschlüsselte Sicherung.'); return; }
    confirmModal('Die aktuellen Daten werden durch die Sicherung ersetzt. Danach melden Sie sich mit dem Passwort an, das beim Erstellen der Sicherung galt. Fortfahren?', async () => {
      logEvent('sicherung_import'); await persist(); await saveChain;
      await window.welt.saveData(env);
      envelope = env; state = null; session = null;
      document.getElementById('content').textContent = ''; document.getElementById('nav').textContent = ''; document.getElementById('sidebar-foot').textContent = '';
      showLogin('Sicherung eingespielt. Bitte mit dem Passwort der Sicherung anmelden.');
    }, 'Ja, einspielen');
  }
  function dsSicherung() {
    const e = state.einstellungen;
    const w = h('div', {});
    w.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:6px', text: 'Verschlüsselte Sicherung' }),
      h('p', { class: 'soft', text: 'Die Sicherung ist genauso verschlüsselt wie Ihre Daten (Dateiendung .pwbackup). Sie lässt sich nur mit Ihrem Passwort oder dem Wiederherstellungsschlüssel öffnen. Bewahren Sie sie getrennt vom Gerät auf, z. B. auf einem USB-Stick.' }),
      h('p', { class: 'small ' + (e.letzteSicherung && daysAgo(e.letzteSicherung) <= 90 ? 'ok-text' : 'err-text'), id: 'last-backup', text: e.letzteSicherung ? 'Letzte Sicherung: ' + fmtStamp(e.letzteSicherung) : 'Es wurde noch keine Sicherung erstellt.' }),
      h('div', { class: 'row' }, btn('Sicherung exportieren', { kind: 'primary', icon: 'save', id: 'bk-export', onclick: sicherungExport }), btn('Sicherung einspielen', { icon: 'download', id: 'bk-import', onclick: sicherungImport }))));
    w.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:6px', text: 'Wichtig beim Einspielen' }),
      h('ul', { class: 'plain-list' }, h('li', { text: 'Die aktuellen Daten auf diesem Gerät werden ersetzt.' }), h('li', { text: 'Es gilt das Passwort (und der Wiederherstellungsschlüssel) aus der Zeit der Sicherung.' }), h('li', { text: 'Eine beschädigte oder veränderte Sicherung wird beim Öffnen erkannt.' }))));
    return w;
  }

  function consentRow(key, title, text) {
    const ts = state.einstellungen.einwilligungen[key];
    const box = h('input', { type: 'checkbox', checked: !!ts, id: 'cons-' + key, 'aria-label': title });
    box.addEventListener('change', () => { state.einstellungen.einwilligungen[key] = box.checked ? Date.now() : 0; logEvent('einwilligung'); commit(); toast(box.checked ? 'Einwilligung erteilt.' : 'Einwilligung widerrufen.'); });
    return h('label', { class: 'consent' }, box, h('div', {}, h('div', { class: 'title', text: title }), h('div', { class: 'soft small', text }), h('div', { class: 'soft small', text: ts ? `Erteilt am ${fmtStamp(ts)}` : 'Nicht erteilt' })));
  }
  function dsEinwilligung() {
    const w = h('div', {});
    w.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:10px', text: 'Einwilligungen' }),
      consentRow('erinnerungen', 'Erinnerungen anzeigen', 'Fällige Vorsorge und Impfungen erscheinen auf der Startseite. Es werden keine Benachrichtigungen an das Betriebssystem oder an Dritte gesendet.'),
      consentRow('befundbilder', 'Befund-Bilder speichern', 'Hochgeladene Bilder werden verschlüsselt im Tresor abgelegt (bis 3 MB je Bild). Ohne Einwilligung ist das Hochladen gesperrt.')));
    const facts = [['ok', 'Lokale Speicherung', 'Ihre Daten liegen nur in einer verschlüsselten Datei auf diesem Gerät.'], ['ok', 'Keine Übertragung', 'Die App stellt keine Verbindung zum Internet her; alle Anfragen werden blockiert.'], ['ok', 'Keine Telemetrie', 'Es werden keine Nutzungs-, Absturz- oder Standortdaten erhoben.'], ['info', 'Keine Praxis-Anbindung', 'Termin-, Rezept- und Krankmeldungsanfragen werden nur lokal gespeichert. Die App ist nicht mit Praxen, Krankenkassen oder der Telematikinfrastruktur verbunden.'], ['info', 'Demo', 'Beispieldaten sind frei erfunden. QR-Codes und Statusangaben sind Simulationen.']];
    w.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:12px', text: 'Datenschutzhinweis' }),
      h('div', { class: 'list' }, facts.map(([cls, t, d]) => h('div', { class: 'item' }, h('span', { class: 'chk ' + cls }, icon(cls === 'ok' ? 'check' : 'help')), h('div', { class: 'grow' }, h('div', { class: 'title', text: t }), h('div', { class: 'soft small', text: d }))))),
      h('p', { class: 'soft small', style: 'margin:12px 0 0', text: 'Verantwortlich für die Daten sind Sie selbst. Ihre Rechte (Auskunft, Berichtigung, Löschung, Datenübertragbarkeit, Widerruf) üben Sie direkt in der App aus: Reiter „Meine Daten“. Dieser Hinweis ist ein Muster und keine Rechtsberatung.' })));
    return w;
  }

  function rDatenschutz() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Datenschutz & Sicherheit', 'Verschlüsselung, Sperre, Ihre Datenrechte und Sicherung', ['lock', 'green'], btn('Sperren (Strg L)', { icon: 'lock', onclick: () => lockApp('manuell') })));
    view.dsTab = view.dsTab || 'check';
    v.appendChild(h('div', { class: 'tabs', style: 'margin-top:0' }, DS_TABS.map(([k, l]) => h('button', { class: 'tab' + (view.dsTab === k ? ' active' : ''), type: 'button', onclick: () => { view.dsTab = k; render(); } }, l))));
    v.appendChild({ check: dsCheck, zugang: dsZugang, daten: dsDaten, sicherung: dsSicherung, einwilligung: dsEinwilligung }[view.dsTab]());
    return v;
  }

  // ---------------------------------------------------------------
  // Profil
  // ---------------------------------------------------------------
  function rProfil() {
    const p = state.profil;
    const v = h('div', { class: 'view' });
    v.appendChild(head('Mein Profil', 'Ihre Angaben und Notfallinformationen', ['user', 'blue']));
    const f = {};
    const inp = (key, label, type) => { f[key] = h('input', { type: type || 'text', value: p[key] || '', id: 'pf-' + key }); return h('div', { class: 'field' }, h('label', { text: label }), f[key]); };
    v.appendChild(h('div', { class: 'card' }, h('div', { class: 'patient-head', style: 'margin-bottom:18px' }, h('img', { class: 'avatar big', src: `img/avatar-${p.avatar || 'a1'}.svg`, alt: '' }), h('h1', { text: p.name })),
      h('div', { class: 'row' }, inp('name', 'Name'), inp('geb', 'Geburtsdatum', 'date')),
      h('div', { class: 'row' }, inp('allergien', 'Allergien'), inp('notfall', 'Notfallkontakt')),
      inp('praxis', 'Meine Praxis'),
      btn('Speichern', { kind: 'primary', icon: 'save', onclick: () => { ['name', 'geb', 'allergien', 'notfall', 'praxis'].forEach((k) => { p[k] = f[k].value.trim(); }); if (!p.name) p.name = 'Patient/in'; commit(); toast('Profil gespeichert.'); } })));
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:6px', text: 'Datensicherung und Datenschutz' }),
      h('p', { class: 'soft', text: 'Ihre Daten bleiben verschlüsselt ausschließlich auf diesem Gerät. Sicherung, Datenkopie, Löschung und Passwort finden Sie unter „Datenschutz & Sicherheit“.' }),
      h('div', { class: 'row' }, btn('Datenschutz & Sicherheit öffnen', { kind: 'primary', icon: 'lock', onclick: () => goto('datenschutz') }), btn('Sicherung', { icon: 'save', onclick: () => goto('datenschutz', { dsTab: 'sicherung' }) }))));
    return v;
  }

  // ---------------------------------------------------------------
  // Start der App
  // ---------------------------------------------------------------
  async function init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
      if (!state) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'l') { e.preventDefault(); lockApp('manuell'); }
      if (mod && /^[0-9]$/.test(e.key)) {
        const target = NAV_FLAT[e.key === '0' ? 9 : Number(e.key) - 1];
        if (target) { e.preventDefault(); goto(target[0]); }
      }
    });
    const stored = await window.welt.loadData();
    if (Vault.isEnvelope(stored)) { envelope = stored; showLogin(); }
    else if (stored && stored.profil) showSetup(stored); // Klartext oder alte safeStorage-Daten einer früheren Version
    else if (stored) showUnreadable();
    else showSetup(null);
  }
  init();
})();
