(function () {
  'use strict';

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayISO = () => isoDate(new Date());
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDate(d); };
  const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const MO = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const fmtDate = (iso) => (iso ? iso.split('-').reverse().join('.') : '–');
  const fmtLong = (iso) => { const d = new Date(iso + 'T12:00:00'); return `${WD[d.getDay()]}, ${d.getDate()}. ${MO[d.getMonth()]} ${d.getFullYear()}`; };
  const fmtStamp = (ts) => { const d = new Date(ts); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

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
    check: 'M4 12l5 5L20 6'
  };
  const icon = (n) => s('svg', { viewBox: '0 0 24 24', fill: 'none', 'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s('path', { d: ICONS[n] || ICONS.file }));
  const btn = (label, o = {}) => h('button', { class: 'btn ' + (o.kind || ''), type: 'button', onclick: o.onclick }, o.icon ? icon(o.icon) : null, label);
  const toast = (m) => { const t = h('div', { class: 'toast', text: m }); document.getElementById('toast-root').appendChild(t); setTimeout(() => t.remove(), 3000); };

  // ---------------- Zustand ----------------
  const ZEITEN = ['morgens', 'mittags', 'abends', 'nachts'];
  let state = null;
  const view = { page: 'start' };

  function demoData() {
    const t = todayISO();
    const v = (back, sys, dia, puls, gew) => ({ id: uid(), datum: addDays(t, -back), sys, dia, puls, gewicht: gew });
    return {
      demo: true,
      profil: { name: 'Anna Berger', geb: '1978-03-14', allergien: 'Penicillin', notfall: 'Markus Berger, 0151 5550123', praxis: 'Praxis für Allgemeinmedizin, Dr. Lindner', avatar: 'a1' },
      termine: [
        { id: uid(), datum: addDays(t, 2), zeit: '09:30', grund: 'Blutdruckkontrolle', status: 'bestätigt' },
        { id: uid(), datum: addDays(t, 16), zeit: '14:00', grund: 'Impfung', status: 'angefragt' }
      ],
      medikamente: [
        { id: uid(), name: 'Ramipril 5 mg', hinweis: '1 Tablette, vor dem Essen', zeiten: ['morgens'] },
        { id: uid(), name: 'Atorvastatin 20 mg', hinweis: '1 Tablette', zeiten: ['abends'] },
        { id: uid(), name: 'Vitamin D 1000 IE', hinweis: 'zum Frühstück', zeiten: ['morgens'] }
      ],
      einnahmen: {},
      werte: [v(6, 148, 92, 78, 71.4), v(5, 144, 90, 76, 71.2), v(4, 146, 91, 80, 71.3), v(3, 140, 88, 74, 71.0), v(2, 138, 86, 72, 70.9), v(1, 136, 85, 73, 70.8), v(0, 134, 84, 71, 70.8)],
      befunde: [
        { id: uid(), titel: 'Ruhe-EKG', datum: addDays(t, -30), src: 'img/ekg.svg' },
        { id: uid(), titel: 'Röntgen Thorax', datum: addDays(t, -90), src: 'img/roentgen.svg' },
        { id: uid(), titel: 'Blutdruck-Wochenverlauf', datum: addDays(t, -7), src: 'img/blutdruck.svg' }
      ],
      nachrichten: [{ id: uid(), ts: Date.now() - 86400000, typ: 'Nachricht', text: 'Guten Tag, könnte ich bitte das Rezept für Ramipril erneuern lassen? Danke!' }]
    };
  }
  const persist = () => window.welt.saveData(state);
  const commit = () => { persist(); render(); };

  // ---------------- Modal ----------------
  let closeCur = null;
  function openModal(title, build) {
    closeModal();
    const modal = h('div', { class: 'modal' }, h('h2', { text: title }));
    const bd = h('div', { class: 'backdrop', onmousedown: (e) => { if (e.target === bd) closeModal(); } }, modal);
    build(modal);
    document.getElementById('modal-root').appendChild(bd);
    closeCur = () => { bd.remove(); closeCur = null; };
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
  function confirmModal(text, yes) {
    openModal('Bitte bestätigen', (m) => {
      m.appendChild(h('p', { text }));
      m.appendChild(h('div', { class: 'modal-actions' }, btn('Abbrechen', { onclick: closeModal }), btn('Ja, löschen', { kind: 'danger', icon: 'trash', onclick: () => { closeModal(); yes(); } })));
    });
  }

  // ---------------- Navigation ----------------
  const NAV = [['start', 'Start', 'home'], ['termine', 'Meine Termine', 'calendar'], ['medikamente', 'Medikamente', 'pill'], ['werte', 'Meine Werte', 'pulse'], ['befunde', 'Befunde', 'file'], ['nachrichten', 'Praxis-Nachrichten', 'chat'], ['profil', 'Mein Profil', 'user']];
  function goto(p) { view.page = p; render(); document.getElementById('content').scrollTop = 0; }

  function todaysDoses() {
    const done = state.einnahmen[todayISO()] || [];
    const all = [];
    state.medikamente.forEach((m) => m.zeiten.forEach((z) => all.push({ key: m.id + '|' + z, med: m, zeit: z, done: done.includes(m.id + '|' + z) })));
    return all;
  }

  function render() {
    const nav = document.getElementById('nav');
    nav.textContent = '';
    const open = todaysDoses().filter((d) => !d.done).length;
    NAV.forEach(([k, l, ic]) => nav.appendChild(h('button', { class: 'nav-item' + (view.page === k ? ' active' : ''), type: 'button', onclick: () => goto(k) }, icon(ic), h('span', { text: l }), k === 'medikamente' && open ? h('span', { class: 'badge', text: String(open) }) : null)));
    const foot = document.getElementById('sidebar-foot');
    foot.textContent = '';
    foot.appendChild(h('div', { text: state.profil.name }));
    foot.appendChild(h('div', { text: state.profil.praxis }));
    const c = document.getElementById('content');
    c.textContent = '';
    const views = { start: rStart, termine: rTermine, medikamente: rMedikamente, werte: rWerte, befunde: rBefunde, nachrichten: rNachrichten, profil: rProfil };
    c.appendChild((views[view.page] || rStart)());
  }

  const head = (title, sub, ...actions) => h('div', { class: 'page-head' }, h('div', {}, h('h1', { text: title }), sub ? h('p', { text: sub }) : null), h('div', { class: 'row' }, actions));

  // ---------------- Start ----------------
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
        next ? h('div', {}, h('div', { style: 'font-size:22px;font-weight:700', text: `${fmtDate(next.datum)} · ${next.zeit} Uhr` }), h('div', { class: 'soft', text: next.grund }), h('span', { class: 'pill ' + (next.status === 'bestätigt' ? 'ok' : 'warn'), text: next.status }))
          : h('div', { class: 'soft', text: 'Kein Termin geplant.' })),
      h('div', { class: 'card', style: 'margin:0' }, h('h2', { style: 'margin-bottom:14px', text: 'Letzter Blutdruck' }),
        last ? h('div', {}, h('div', { style: 'font-size:30px;font-weight:700', text: `${last.sys}/${last.dia}` }), h('div', { class: 'soft', text: `Puls ${last.puls} · ${fmtDate(last.datum)}` })) : h('div', { class: 'soft', text: 'Noch kein Wert.' }))));
    if (state.demo) v.appendChild(h('p', { class: 'soft small', style: 'margin-top:18px', text: 'Hinweis: Alle Daten sind frei erfundene Beispieldaten. Patienten Welt ersetzt keine ärztliche Beratung; bei Notfällen rufen Sie 112 an.' }));
    return v;
  }

  // ---------------- Termine ----------------
  function anfragen() {
    formModal('Termin anfragen', [
      { key: 'datum', label: 'Wunschdatum', type: 'date', value: addDays(todayISO(), 7) },
      { key: 'zeit', label: 'Wunschzeit', type: 'time', value: '09:00' },
      { key: 'grund', label: 'Grund', placeholder: 'z. B. Kontrolle, Impfung, Rezept' }
    ], (f) => {
      if (!f.datum || !f.zeit || !f.grund) { toast('Bitte alle Felder ausfüllen.'); return false; }
      state.termine.push({ id: uid(), ...f, status: 'angefragt' });
      commit(); toast('Terminanfrage gespeichert.');
    }, 'Anfragen');
  }
  function rTermine() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Meine Termine', 'Anstehende und vergangene Termine', btn('Termin anfragen', { kind: 'primary', icon: 'plus', onclick: anfragen })));
    const list = [...state.termine].sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit));
    v.appendChild(h('div', { class: 'card' }, list.length ? h('div', { class: 'list' }, list.map((t) =>
      h('div', { class: 'item' + (t.datum < todayISO() ? ' done' : '') }, h('span', { style: 'color:var(--accent)' }, icon('calendar')),
        h('div', { class: 'grow' }, h('div', { class: 'title', text: `${fmtLong(t.datum)} · ${t.zeit} Uhr` }), h('div', { class: 'soft small', text: t.grund })),
        h('span', { class: 'pill ' + (t.status === 'bestätigt' ? 'ok' : 'warn'), text: t.status }),
        btn('', { kind: 'small', icon: 'trash', onclick: () => confirmModal('Termin wirklich löschen?', () => { state.termine = state.termine.filter((x) => x.id !== t.id); commit(); }) }))))
      : h('div', { class: 'empty', text: 'Keine Termine.' })));
    return v;
  }

  // ---------------- Medikamente ----------------
  function medHinzu() {
    formModal('Medikament hinzufügen', [
      { key: 'name', label: 'Name und Stärke', placeholder: 'z. B. Ramipril 5 mg' },
      { key: 'hinweis', label: 'Hinweis', placeholder: 'z. B. 1 Tablette vor dem Essen' },
      { key: 'zeit', label: 'Einnahme', type: 'select', value: 'morgens', options: ZEITEN }
    ], (f) => {
      if (!f.name) return false;
      state.medikamente.push({ id: uid(), name: f.name, hinweis: f.hinweis, zeiten: [f.zeit] });
      commit();
    });
  }
  function rMedikamente() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Medikamente', 'Ihr Einnahmeplan für heute – einfach abhaken', btn('Hinzufügen', { kind: 'primary', icon: 'plus', onclick: medHinzu })));
    const done = state.einnahmen[todayISO()] || [];
    const card = h('div', { class: 'card' });
    ZEITEN.forEach((z) => {
      const rows = state.medikamente.filter((m) => m.zeiten.includes(z));
      if (!rows.length) return;
      card.appendChild(h('h3', { style: 'margin:14px 0 8px;text-transform:capitalize', text: z }));
      card.appendChild(h('div', { class: 'list' }, rows.map((m) => {
        const key = m.id + '|' + z;
        const isDone = done.includes(key);
        return h('div', { class: 'item' + (isDone ? ' done' : '') },
          h('input', { type: 'checkbox', checked: isDone, onchange: () => {
            const cur = state.einnahmen[todayISO()] || [];
            state.einnahmen[todayISO()] = isDone ? cur.filter((k) => k !== key) : [...cur, key];
            commit();
            if (!isDone) toast('Eingenommen – gut gemacht!');
          } }),
          h('div', { class: 'grow' }, h('div', { class: 'title', text: m.name }), h('div', { class: 'soft small', text: m.hinweis || '' })),
          btn('Rezept anfragen', { kind: 'small', icon: 'send', onclick: () => {
            state.nachrichten.push({ id: uid(), ts: Date.now(), typ: 'Rezeptanfrage', text: `Bitte um Folgerezept für: ${m.name}` });
            commit(); toast('Rezeptanfrage an die Praxis gespeichert.');
          } }),
          btn('', { kind: 'small', icon: 'trash', onclick: () => confirmModal(`„${m.name}“ aus dem Plan entfernen?`, () => { state.medikamente = state.medikamente.filter((x) => x.id !== m.id); commit(); }) }));
      })));
    });
    if (!state.medikamente.length) card.appendChild(h('div', { class: 'empty', text: 'Noch keine Medikamente eingetragen.' }));
    v.appendChild(card);
    return v;
  }

  // ---------------- Werte ----------------
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
    const svg = s('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}` });
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
    v.appendChild(head('Meine Werte', 'Blutdruck-Tagebuch der letzten Messungen', btn('Wert eintragen', { kind: 'primary', icon: 'plus', onclick: wertEintragen })));
    const sorted = [...state.werte].sort((a, b) => a.datum.localeCompare(b.datum));
    const last7 = sorted.slice(-7);
    v.appendChild(h('div', { class: 'card' }, h('div', { class: 'card-title' }, h('h2', { text: 'Verlauf' }), h('div', {}, h('span', { class: 'pill info', text: '● oben' }), ' ', h('span', { class: 'pill warn', text: '● unten' }))),
      last7.length ? chart(last7) : h('div', { class: 'empty', text: 'Noch keine Werte.' })));
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:12px', text: 'Alle Messungen' }),
      h('div', { class: 'list' }, [...sorted].reverse().map((e) => h('div', { class: 'item' },
        h('div', { class: 'grow' }, h('div', { class: 'title', text: `${e.sys}/${e.dia} mmHg` }), h('div', { class: 'soft small', text: `${fmtDate(e.datum)} · Puls ${e.puls || '–'}${e.gewicht ? ' · ' + String(e.gewicht).replace('.', ',') + ' kg' : ''}` })),
        h('span', { class: 'pill ' + (e.sys >= 140 || e.dia >= 90 ? 'warn' : 'ok'), text: e.sys >= 140 || e.dia >= 90 ? 'erhöht' : 'im Zielbereich' }),
        btn('', { kind: 'small', icon: 'trash', onclick: () => { state.werte = state.werte.filter((x) => x.id !== e.id); commit(); } }))))));
    return v;
  }

  // ---------------- Befunde ----------------
  function rBefunde() {
    const v = h('div', { class: 'view' });
    const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    file.addEventListener('change', () => {
      const f = file.files[0];
      if (!f) return;
      if (f.size > 3 * 1024 * 1024) { toast('Bild ist größer als 3 MB.'); return; }
      const r = new FileReader();
      r.onload = () => { state.befunde.push({ id: uid(), titel: f.name, datum: todayISO(), src: r.result }); commit(); toast('Befund hinzugefügt.'); };
      r.readAsDataURL(f);
    });
    v.appendChild(head('Befunde', 'Ihre Bilder und Untersuchungsergebnisse', btn('Befund hochladen', { kind: 'primary', icon: 'image', onclick: () => file.click() }), file));
    v.appendChild(h('div', { class: 'card' }, state.befunde.length ? h('div', { class: 'gallery' }, state.befunde.map((b) =>
      h('figure', { class: 'figure', onclick: () => openModal(b.titel, (m) => {
        m.appendChild(h('div', { class: 'lightbox' }, h('img', { src: b.src, alt: b.titel })));
        m.appendChild(h('div', { class: 'modal-actions' }, btn('Entfernen', { kind: 'danger', icon: 'trash', onclick: () => { state.befunde = state.befunde.filter((x) => x.id !== b.id); closeModal(); commit(); } }), btn('Schließen', { onclick: closeModal })));
      }) }, h('img', { src: b.src, alt: b.titel }), h('figcaption', { text: `${b.titel} · ${fmtDate(b.datum)}` }))))
      : h('div', { class: 'empty', text: 'Noch keine Befunde.' })));
    return v;
  }

  // ---------------- Nachrichten ----------------
  function rNachrichten() {
    const v = h('div', { class: 'view' });
    v.appendChild(head('Praxis-Nachrichten', 'Anfragen und Notizen an Ihre Praxis (lokal gespeichert)'));
    const chatBox = h('div', { class: 'chat' }, [...state.nachrichten].sort((a, b) => a.ts - b.ts).map((n) => h('div', {}, h('div', { class: 'bubble' }, h('strong', { text: n.typ + ': ' }), n.text), h('div', { class: 'stamp', text: fmtStamp(n.ts) }))));
    const ta = h('textarea', { placeholder: 'Ihre Nachricht an die Praxis …', style: 'min-height:80px' });
    v.appendChild(h('div', { class: 'card' }, state.nachrichten.length ? chatBox : h('div', { class: 'empty', text: 'Noch keine Nachrichten.' }), h('div', { class: 'field' }, ta),
      btn('Speichern', { kind: 'primary', icon: 'send', onclick: () => { if (!ta.value.trim()) return; state.nachrichten.push({ id: uid(), ts: Date.now(), typ: 'Nachricht', text: ta.value.trim() }); commit(); } })));
    setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 0);
    return v;
  }

  // ---------------- Profil ----------------
  function rProfil() {
    const p = state.profil;
    const v = h('div', { class: 'view' });
    v.appendChild(head('Mein Profil', 'Ihre Angaben und Notfallinformationen'));
    const f = {};
    const inp = (key, label, type) => { f[key] = h('input', { type: type || 'text', value: p[key] || '' }); return h('div', { class: 'field' }, h('label', { text: label }), f[key]); };
    v.appendChild(h('div', { class: 'card' }, h('div', { class: 'patient-head', style: 'margin-bottom:18px' }, h('img', { class: 'avatar big', src: `img/avatar-${p.avatar || 'a1'}.svg`, alt: '' }), h('h1', { text: p.name })),
      h('div', { class: 'row' }, inp('name', 'Name'), inp('geb', 'Geburtsdatum', 'date')),
      h('div', { class: 'row' }, inp('allergien', 'Allergien'), inp('notfall', 'Notfallkontakt')),
      inp('praxis', 'Meine Praxis'),
      btn('Speichern', { kind: 'primary', icon: 'save', onclick: () => { ['name', 'geb', 'allergien', 'notfall', 'praxis'].forEach((k) => { p[k] = f[k].value.trim(); }); if (!p.name) p.name = 'Patient/in'; commit(); toast('Profil gespeichert.'); } })));
    v.appendChild(h('div', { class: 'card' }, h('h2', { style: 'margin-bottom:6px', text: 'Datensicherung & Beispieldaten' }),
      h('p', { class: 'soft', text: 'Ihre Daten bleiben ausschließlich auf diesem Gerät.' }),
      h('div', { class: 'row' },
        btn('Sicherung exportieren', { icon: 'save', onclick: async () => { if (await window.welt.exportBackup(state)) toast('Sicherung gespeichert.'); } }),
        btn('Sicherung laden', { icon: 'file', onclick: async () => { const d = await window.welt.importBackup(); if (d && d.profil) { state = Object.assign(demoData(), d); commit(); toast('Sicherung geladen.'); } else if (d !== null) toast('Keine gültige Sicherung.'); } }),
        btn('Alle Daten löschen', { kind: 'danger', icon: 'trash', onclick: () => confirmModal('Wirklich alle Daten löschen?', () => { state = { demo: false, profil: { name: 'Patient/in', geb: '', allergien: '', notfall: '', praxis: '', avatar: 'a1' }, termine: [], medikamente: [], einnahmen: {}, werte: [], befunde: [], nachrichten: [] }; commit(); }) }))));
    return v;
  }

  async function init() {
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    const loaded = await window.welt.loadData();
    state = loaded && loaded.profil ? Object.assign(demoData(), loaded) : demoData();
    if (!loaded) persist();
    render();
  }
  init();
})();
