// IT - World · Internal Admin & Ops Dashboard – Oberfläche (Vanilla JS, keine Abhängigkeiten).
// DOM wird ausschließlich über createElement/textContent aufgebaut (kein innerHTML mit Nutzerdaten).
(function () {
  'use strict';

  // ======================================================================
  // Grundbausteine
  // ======================================================================
  const state = {
    user: null,
    settings: null,
    users: [],          // für Zuweisungen (id → Name)
    route: 'overview',
    refreshTimer: null,
    ui: {               // nicht-persistenter Seitenzustand
      trafficAsTable: false,
      selectedService: null,
      metric: 'cpu',
      range: '1h',
      incidentFilter: 'active',
      tickets: { q: '', status: '', priority: '', mine: false },
      deployEnv: '',
      audit: { q: '', action: '', page: 1 },
    },
  };

  const $ = (id) => document.getElementById(id);

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    append(el, children);
    return el;
  }
  function append(el, children) {
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...children) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v !== undefined && v !== null) el.setAttribute(k, v);
    for (const c of children.flat()) if (c) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  }

  async function api(method, path, body) {
    const opts = { method, headers: { 'X-Requested-With': 'IT-World' }, credentials: 'same-origin' };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch('/api' + path, opts);
    if (res.status === 401 && !path.startsWith('/auth/password')) { location.href = '/login'; throw new Error('Nicht angemeldet.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
    return data;
  }

  function toast(msg, type) {
    const t = h('div', { class: 'toast' + (type === 'error' ? ' error' : ''), role: 'status', text: msg });
    $('toasts').append(t);
    setTimeout(() => t.remove(), type === 'error' ? 6000 : 3500);
  }
  const fail = (e) => toast(e.message || String(e), 'error');

  // ---------- Formatierung ----------
  const nf = new Intl.NumberFormat('de-DE');
  const fmtNum = (n) => nf.format(n);
  function fmtCompact(n) {
    if (n >= 1e9) return (n / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Mrd.';
    if (n >= 1e6) return (n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Mio.';
    if (n >= 1e4) return (n / 1e3).toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' Tsd.';
    return fmtNum(Math.round(n));
  }
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–';
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  function relTime(iso) {
    if (!iso) return '–';
    const d = (Date.now() - Date.parse(iso)) / 1000;
    if (d < 60) return 'gerade eben';
    if (d < 3600) return `vor ${Math.floor(d / 60)} Min.`;
    if (d < 86400) return `vor ${Math.floor(d / 3600)} Std.`;
    return `vor ${Math.floor(d / 86400)} Tg.`;
  }
  const userName = (id) => (state.users.find(u => u.id === id) || {}).name || '–';
  const initials = (name) => name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();

  // ---------- Status-Darstellung (immer Symbol + Text, nie nur Farbe) ----------
  const STATUS = {
    service: {
      operational: ['good', '●', 'Betriebsbereit'], degraded: ['warning', '▲', 'Eingeschränkt'],
      down: ['critical', '✖', 'Ausfall'], maintenance: ['info', '◆', 'Wartung'],
    },
    severity: { SEV1: ['critical', '✖', 'SEV1'], SEV2: ['serious', '▲', 'SEV2'], SEV3: ['warning', '■', 'SEV3'], SEV4: ['info', '●', 'SEV4'] },
    incident: {
      open: ['critical', '●', 'Offen'], investigating: ['serious', '◎', 'Analyse'],
      monitoring: ['warning', '◐', 'Beobachtung'], resolved: ['good', '✔', 'Gelöst'],
    },
    priority: { kritisch: ['critical', '✖', 'Kritisch'], hoch: ['serious', '▲', 'Hoch'], mittel: ['warning', '■', 'Mittel'], niedrig: ['info', '●', 'Niedrig'] },
    ticket: { offen: ['gold', '○', 'Offen'], 'in Arbeit': ['info', '◐', 'In Arbeit'], wartend: ['warning', '❚❚', 'Wartend'], erledigt: ['good', '✔', 'Erledigt'] },
    deploy: { erfolgreich: ['good', '✔', 'Erfolgreich'], fehlgeschlagen: ['critical', '✖', 'Fehlgeschlagen'], läuft: ['info', '⟳', 'Läuft'], zurückgerollt: ['warning', '↺', 'Zurückgerollt'] },
    role: { admin: ['gold', '★', 'Administrator'], ops: ['info', '⚙', 'Operations'], viewer: ['', '◉', 'Nur Lesen'] },
  };
  function pill(kind, key) {
    const [cls, ic, label] = (STATUS[kind] && STATUS[kind][key]) || ['', '●', key];
    return h('span', { class: `pill ${cls}` }, h('span', { class: 'ic', 'aria-hidden': 'true', text: ic }), label);
  }
  const labelOf = (kind, key) => ((STATUS[kind] || {})[key] || [0, 0, key])[2];

  const ROLE_RANK = { viewer: 1, ops: 2, admin: 3 };
  const can = (min) => state.user && ROLE_RANK[state.user.role] >= ROLE_RANK[min];

  // ======================================================================
  // Modal-Dialoge
  // ======================================================================
  function openModal(title, body, { wide = false, onClose } = {}) {
    const prevFocus = document.activeElement;
    const box = h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('h2', { text: title }), body);
    const backdrop = h('div', { class: 'modal-backdrop' }, box);
    function close() {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
      if (onClose) onClose();
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey);
    $('modalRoot').append(backdrop);
    const first = box.querySelector('input, select, textarea, button');
    if (first) first.focus();
    return { close, box };
  }
  const modalOpen = () => $('modalRoot').children.length > 0;

  // Formular-Dialog: fields = [{ name, label, type, options, value, required, placeholder }]
  function formModal(title, fields, submitLabel, onSubmit, extra) {
    const inputs = {};
    const err = h('div', { class: 'form-error hidden', role: 'alert' });
    const rows = fields.map(f => {
      if (f.row) return h('div', { class: 'row' }, f.row.map(fieldEl));
      return fieldEl(f);
    });
    function fieldEl(f) {
      const id = 'f_' + f.name;
      let input;
      if (f.type === 'select') {
        input = h('select', { class: 'input', id, name: f.name },
          f.options.map(([v, l]) => h('option', { value: v, text: l })));
        input.value = f.value ?? f.options[0][0];
      } else if (f.type === 'textarea') {
        input = h('textarea', { class: 'input', id, name: f.name, placeholder: f.placeholder, maxlength: f.maxlength });
        input.value = f.value ?? '';
      } else if (f.type === 'checkbox') {
        input = h('input', { type: 'checkbox', id, name: f.name, checked: !!f.value });
        inputs[f.name] = input;
        return h('div', { class: 'field' }, h('label', { class: 'check', for: id }, input, h('span', { text: f.label })));
      } else {
        input = h('input', { class: 'input', id, name: f.name, type: f.type || 'text', placeholder: f.placeholder,
          required: f.required, maxlength: f.maxlength, min: f.min, max: f.max, step: f.step, autocomplete: f.autocomplete || 'off' });
        input.value = f.value ?? '';
      }
      if (f.disabled) input.disabled = true;
      inputs[f.name] = input;
      return h('div', { class: 'field' }, h('label', { for: id, text: f.label }), input);
    }
    const submit = h('button', { class: 'btn btn-primary', type: 'submit', text: submitLabel });
    const form = h('form', { novalidate: true }, err, extra || null, rows,
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn', type: 'button', text: 'Abbrechen', onClick: () => m.close() }), submit));
    const m = openModal(title, form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.classList.add('hidden');
      const values = {};
      for (const [k, el] of Object.entries(inputs)) values[k] = el.type === 'checkbox' ? el.checked : el.value;
      for (const f of fields.flatMap(f => f.row || [f])) {
        if (f.required && !String(values[f.name] || '').trim()) { err.textContent = `Bitte „${f.label}“ ausfüllen.`; err.classList.remove('hidden'); return; }
      }
      submit.disabled = true;
      try { await onSubmit(values); m.close(); } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); } finally { submit.disabled = false; }
    });
    return m;
  }

  function confirmModal(title, text, confirmLabel, onConfirm) {
    const btn = h('button', { class: 'btn btn-danger', type: 'button', text: confirmLabel });
    const m = openModal(title, h('div', null, h('p', { class: 'muted', text }),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn', type: 'button', text: 'Abbrechen', onClick: () => m.close() }), btn)));
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await onConfirm(); m.close(); } catch (e) { fail(e); btn.disabled = false; }
    });
  }

  // ======================================================================
  // Diagramme (SVG, ein Goldton pro Diagramm, Crosshair-/Hover-Tooltip)
  // ======================================================================
  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }

  // Wächst mit dem Container: zeichnet bei jeder Größenänderung neu
  function responsiveChart(draw) {
    const wrap = h('div', { class: 'chart' });
    let lastW = 0;
    const ro = new ResizeObserver(() => {
      const w = Math.round(wrap.clientWidth);
      if (w && w !== lastW) { lastW = w; wrap.replaceChildren(); draw(wrap, w); }
    });
    ro.observe(wrap);
    return wrap;
  }

  // Flächen-/Liniendiagramm für Zeitreihen. points: [{ t, v }]
  function lineChart(points, { height = 240, yFormat = fmtNum, tipLabel = '', xFormat = fmtTime, xTicks = 6 } = {}) {
    return responsiveChart((wrap, W) => {
      const H = height, m = { t: 12, r: 12, b: 26, l: 56 };
      const iw = W - m.l - m.r, ih = H - m.t - m.b;
      const max = niceMax(Math.max(...points.map(p => p.v)) * 1.1);
      const x = (i) => m.l + (points.length < 2 ? iw / 2 : (i / (points.length - 1)) * iw);
      const y = (v) => m.t + ih - (v / max) * ih;
      const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': tipLabel || 'Zeitreihe' });
      svg.append(s('defs', null, s('linearGradient', { id: 'goldArea', x1: 0, y1: 0, x2: 0, y2: 1 },
        s('stop', { offset: 0, 'stop-color': '#d4a53a', 'stop-opacity': 0.35 }), s('stop', { offset: 1, 'stop-color': '#d4a53a', 'stop-opacity': 0 }))));
      for (let i = 0; i <= 4; i++) {
        const v = (max / 4) * i, yy = y(v);
        svg.append(s('line', { class: 'grid-line', x1: m.l, x2: W - m.r, y1: yy, y2: yy }));
        svg.append(s('text', { class: 'axis-label', x: m.l - 8, y: yy + 4, 'text-anchor': 'end' }, yFormat(v)));
      }
      const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(iw / 90))));
      points.forEach((p, i) => {
        if (i % every === 0 && xTicks) svg.append(s('text', { class: 'axis-label', x: x(i), y: H - 6, 'text-anchor': 'middle' }, xFormat(p.t)));
      });
      const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
      svg.append(s('path', { class: 'series-area', d: `${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z` }));
      svg.append(s('path', { class: 'series-line', d: line }));
      // Hover-Ebene
      const cross = s('line', { class: 'crosshair', y1: m.t, y2: m.t + ih, visibility: 'hidden' });
      const dot = s('circle', { class: 'hover-dot', r: 5, visibility: 'hidden' });
      const hit = s('rect', { x: m.l, y: 0, width: iw, height: H, fill: 'transparent' });
      svg.append(cross, dot, hit);
      const tip = h('div', { class: 'tooltip hidden' });
      wrap.append(svg, tip);
      function move(clientX) {
        const r = svg.getBoundingClientRect();
        const px = clientX - r.left;
        const i = Math.max(0, Math.min(points.length - 1, Math.round(((px - m.l) / iw) * (points.length - 1))));
        const p = points[i];
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
        dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(p.v)); dot.setAttribute('visibility', 'visible');
        tip.replaceChildren(h('div', { class: 'tv', text: yFormat(p.v, true) }), h('div', { class: 'tl', text: `${tipLabel} · ${fmtDate(p.t)}` }));
        tip.classList.remove('hidden');
        tip.style.left = `${Math.min(Math.max(x(i), 70), W - 70)}px`;
        tip.style.top = `${y(p.v)}px`;
      }
      function leave() { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tip.classList.add('hidden'); }
      hit.addEventListener('mousemove', (e) => move(e.clientX));
      hit.addEventListener('touchmove', (e) => { move(e.touches[0].clientX); }, { passive: true });
      hit.addEventListener('mouseleave', leave);
      hit.addEventListener('touchend', leave);
    });
  }

  // Horizontales Balkendiagramm. items: [{ label, v }]
  function barChart(items, { unit = '' } = {}) {
    return responsiveChart((wrap, W) => {
      const rowH = 34, m = { l: 96, r: 40 };
      const H = items.length * rowH;
      const max = Math.max(1, ...items.map(i => i.v));
      const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': items.map(i => `${i.label}: ${i.v}`).join(', ') });
      const tip = h('div', { class: 'tooltip hidden' });
      items.forEach((it, idx) => {
        const yy = idx * rowH;
        const bw = Math.max(4, ((W - m.l - m.r) * it.v) / max);
        svg.append(s('text', { class: 'bar-label', x: 0, y: yy + rowH / 2 + 4 }, it.label));
        const bar = s('rect', { class: 'bar', x: m.l, y: yy + 8, width: bw, height: rowH - 16, rx: 4 });
        const hit = s('rect', { x: 0, y: yy, width: W, height: rowH, fill: 'transparent' });
        svg.append(bar, s('text', { class: 'bar-value', x: m.l + bw + 8, y: yy + rowH / 2 + 4 }, fmtNum(it.v)), hit);
        hit.addEventListener('mouseenter', () => {
          bar.classList.add('hl');
          tip.replaceChildren(h('div', { class: 'tv', text: `${fmtNum(it.v)} ${unit}` }), h('div', { class: 'tl', text: it.label }));
          tip.classList.remove('hidden');
          tip.style.left = `${m.l + bw / 2}px`; tip.style.top = `${yy + 8}px`;
        });
        hit.addEventListener('mouseleave', () => { bar.classList.remove('hl'); tip.classList.add('hidden'); });
      });
      wrap.append(svg, tip);
    });
  }

  // ======================================================================
  // Navigation & Layout
  // ======================================================================
  const ICON = {
    overview: 'M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z',
    monitoring: 'M3 12h4l3 8 4-16 3 8h4',
    incidents: 'M12 3 2 20h20L12 3zm0 6v5m0 3v.5',
    tickets: 'M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4zM10 7v12',
    deployments: 'M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3',
    users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8',
    audit: 'M9 4h10v16H5V8zM9 4v4H5M9 12h6M9 16h6',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.1V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  };
  const PAGES = [
    { id: 'overview', title: 'Übersicht', section: 'Betrieb', render: renderOverview, refresh: true },
    { id: 'monitoring', title: 'Monitoring', render: renderMonitoring, refresh: true },
    { id: 'incidents', title: 'Incidents', render: renderIncidents, refresh: true },
    { id: 'tickets', title: 'Tickets', section: 'Service Desk', render: renderTickets },
    { id: 'deployments', title: 'Deployments', render: renderDeployments, refresh: true },
    { id: 'users', title: 'Benutzer', section: 'Verwaltung', render: renderUsers, role: 'admin' },
    { id: 'audit', title: 'Audit-Log', render: renderAudit, role: 'admin' },
    { id: 'settings', title: 'Einstellungen', render: renderSettings },
  ];

  function renderNav(badges = {}) {
    const nav = $('nav');
    nav.replaceChildren();
    for (const p of PAGES) {
      if (p.role && !can(p.role)) continue;
      if (p.section) nav.append(h('div', { class: 'nav-section', text: p.section }));
      const icon = s('svg', { viewBox: '0 0 24 24', fill: 'none', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
        s('path', { d: ICON[p.id] }));
      nav.append(h('a', { href: `#/${p.id}`, class: state.route === p.id ? 'active' : null, 'aria-current': state.route === p.id ? 'page' : null },
        icon, h('span', { text: p.title }), badges[p.id] ? h('span', { class: 'badge', text: String(badges[p.id]) }) : null));
    }
  }

  function renderBanners() {
    const b = $('banners');
    b.replaceChildren();
    if (state.settings && state.settings.maintenanceMode) {
      b.append(h('div', { class: 'banner warn', role: 'status' }, h('strong', { text: '◆ Wartungsmodus aktiv' }),
        h('span', { text: can('admin') ? 'Nur Administratoren können Änderungen vornehmen.' : 'Änderungen sind vorübergehend gesperrt.' })));
    }
    if (state.user && state.user.mustChangePassword) {
      b.append(h('div', { class: 'banner warn', role: 'status' }, h('strong', { text: '▲ Sicherheit' }),
        h('span', { text: 'Bitte ändere dein Initialpasswort.' }), h('button', { class: 'btn btn-sm', text: 'Jetzt ändern', onClick: changePassword })));
    }
  }

  async function navigate() {
    const id = (location.hash.replace(/^#\/?/, '') || 'overview').split('?')[0];
    const page = PAGES.find(p => p.id === id && (!p.role || can(p.role))) || PAGES[0];
    state.route = page.id;
    $('pageTitle').textContent = page.title;
    document.title = `${page.title} · IT - World`;
    $('sidebar').classList.remove('open');
    renderNav(state.badges);
    await renderPage(page, true);
    clearInterval(state.refreshTimer);
    if (page.refresh) {
      state.refreshTimer = setInterval(() => {
        if (!modalOpen() && !document.hidden && state.route === page.id) renderPage(page, false);
      }, (state.settings.autoRefreshSec || 15) * 1000);
    }
  }

  async function renderPage(page, focus) {
    const content = $('content');
    try {
      const node = await page.render();
      if (state.route !== page.id) return; // zwischenzeitlich weiternavigiert
      const y = window.scrollY;
      content.replaceChildren(node);
      if (!focus) window.scrollTo(0, y); else content.focus({ preventScroll: true });
    } catch (e) {
      content.replaceChildren(h('div', { class: 'card empty', text: `Fehler beim Laden: ${e.message}` }));
    }
  }
  const rerender = () => { const p = PAGES.find(x => x.id === state.route); if (p) renderPage(p, false); };

  function card(title, body, ...headExtras) {
    return h('section', { class: 'card' }, title ? h('div', { class: 'card-head' }, h('h2', { text: title }), h('div', { class: 'spacer' }), headExtras) : null, body);
  }
  function kpi(label, value, sub) {
    return h('div', { class: 'card kpi' }, h('div', { class: 'label', text: label }), h('div', { class: 'value', text: value }), sub ? h('div', { class: 'sub', text: sub }) : null);
  }
  function table(headers, rows, emptyText = 'Keine Einträge vorhanden.') {
    return h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, headers.map(t => h('th', { scope: 'col', text: t })))),
      h('tbody', null, rows.length ? rows : h('tr', null, h('td', { class: 'empty', colspan: headers.length, text: emptyText })))));
  }
  function seg(options, value, onChange, label) {
    return h('div', { class: 'seg', role: 'group', 'aria-label': label },
      options.map(([v, l]) => h('button', { type: 'button', class: v === value ? 'on' : null, 'aria-pressed': String(v === value), text: l, onClick: () => onChange(v) })));
  }
  function exportBtn(kind) {
    return h('a', { class: 'btn btn-sm', href: `/api/export/${kind}`, download: '', text: '⭳ CSV-Export' });
  }

  // ======================================================================
  // 1 · Übersicht
  // ======================================================================
  async function renderOverview() {
    const d = await api('GET', '/overview');
    const k = d.kpis;
    state.badges = { incidents: k.openIncidents };
    renderNav(state.badges);

    const kpis = h('div', { class: 'grid grid-kpi' },
      kpi('Services betriebsbereit', `${k.servicesOperational} / ${k.servicesTotal}`, `${k.servicesTotal - k.servicesOperational} mit Einschränkung`),
      kpi('Offene Incidents', fmtNum(k.openIncidents), `${k.criticalIncidents} davon SEV1/SEV2`),
      kpi('Offene Tickets', fmtNum(k.openTickets), 'nicht erledigt'),
      kpi('Deploy-Erfolgsquote', `${k.deploySuccessRate.toLocaleString('de-DE')} %`, 'letzte 30 Tage'),
      kpi('Requests (24 h)', fmtCompact(k.requests24h), `Ø Latenz ${k.avgLatency} ms`),
      kpi('Aktive Sessions', fmtNum(k.activeSessions), `${k.users} aktive Benutzer`));

    const trafficPts = d.traffic.map(p => ({ t: p.t, v: p.requests }));
    const trafficBody = state.ui.trafficAsTable
      ? table(['Stunde', 'Requests', 'Fehler'], d.traffic.map(p => h('tr', null, h('td', { text: fmtDate(p.t) }), h('td', { class: 'num', text: fmtNum(p.requests) }), h('td', { class: 'num', text: fmtNum(p.errors) }))))
      : lineChart(trafficPts, { height: 260, yFormat: (v, full) => full ? fmtNum(Math.round(v)) : fmtCompact(v), tipLabel: 'Requests/Std.' });
    const traffic = card('Traffic · Requests pro Stunde (24 h)', trafficBody,
      seg([['chart', 'Diagramm'], ['table', 'Tabelle']], state.ui.trafficAsTable ? 'table' : 'chart', (v) => { state.ui.trafficAsTable = v === 'table'; rerender(); }, 'Ansicht'));

    const health = card('Service-Status', h('div', { class: 'health-list' }, d.services.map(sv =>
      h('div', { class: 'health-row' }, h('div', { class: 'n', text: sv.name }),
        h('div', { class: 'm', text: sv.status === 'down' ? '–' : `${sv.metrics.latency} ms` }), pill('service', sv.status)))),
    h('a', { class: 'btn btn-sm btn-ghost', href: '#/monitoring', text: 'Details →' }));

    const tb = d.ticketsByStatus;
    const tickets = card('Tickets nach Status', barChart(Object.keys(tb).map(key => ({ label: labelOf('ticket', key), v: tb[key] })), { unit: 'Tickets' }),
      h('a', { class: 'btn btn-sm btn-ghost', href: '#/tickets', text: 'Alle →' }));

    const inc = card('Aktive Incidents', d.incidents.length ? h('div', { class: 'feed' }, d.incidents.map(i =>
      h('div', { class: 'feed-item' }, pill('severity', i.severity), h('div', { class: 'grow' },
        h('div', { class: 't', text: i.title }), h('div', { class: 'd', text: `${d.serviceNames[i.serviceId] || '–'} · ${labelOf('incident', i.status)} · ${relTime(i.createdAt)}` })))))
      : h('div', { class: 'empty', text: '✔ Keine aktiven Incidents' }),
    h('a', { class: 'btn btn-sm btn-ghost', href: '#/incidents', text: 'Alle →' }));

    const deps = card('Letzte Deployments', h('div', { class: 'feed' }, d.deployments.map(x =>
      h('div', { class: 'feed-item' }, pill('deploy', x.status), h('div', null,
        h('div', { class: 't', text: `${d.serviceNames[x.serviceId] || 'Service'} ${x.version}` }),
        h('div', { class: 'd', text: `${x.environment} · ${x.by} · ${relTime(x.createdAt)}` }))))),
    h('a', { class: 'btn btn-sm btn-ghost', href: '#/deployments', text: 'Alle →' }));

    return h('div', { class: 'grid' }, kpis,
      h('div', { class: 'grid grid-2' }, traffic, health),
      h('div', { class: 'grid grid-2e' }, inc, h('div', { class: 'grid' }, tickets, deps)));
  }

  // ======================================================================
  // 2 · Monitoring
  // ======================================================================
  const METRICS = {
    cpu: ['CPU', (v) => `${Math.round(v)} %`], memory: ['Arbeitsspeicher', (v) => `${Math.round(v)} %`],
    latency: ['Latenz', (v) => `${Math.round(v)} ms`], rps: ['Requests/s', (v) => fmtNum(Math.round(v))], errorRate: ['Fehlerrate', (v) => `${(+v).toFixed(2)} %`],
  };

  async function renderMonitoring() {
    const services = await api('GET', '/services');
    if (!services.find(x => x.id === state.ui.selectedService)) state.ui.selectedService = services[0] && services[0].id;
    const sel = services.find(x => x.id === state.ui.selectedService);
    const series = sel ? await api('GET', `/services/${sel.id}/metrics?range=${state.ui.range}`) : [];

    const meter = (v) => h('div', { class: 'meter' }, (() => { const i = h('i', { class: v > 80 ? 'hot' : null }); i.style.width = `${Math.min(100, v)}%`; return i; })());
    const grid = h('div', { class: 'svc-grid' }, services.map(sv =>
      h('div', { class: 'card svc' + (sv.id === state.ui.selectedService ? ' selected' : ''), tabindex: 0, role: 'button', 'aria-pressed': String(sv.id === state.ui.selectedService),
        onClick: () => { state.ui.selectedService = sv.id; rerender(); },
        onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); state.ui.selectedService = sv.id; rerender(); } } },
      h('div', { class: 'svc-top' }, h('div', null, h('div', { class: 'svc-name', text: sv.name }), h('div', { class: 'svc-meta', text: `${sv.type} · ${sv.region} · ${sv.version}` })), pill('service', sv.status)),
      h('div', { class: 'svc-stats' },
        h('div', { class: 'svc-stat' }, h('div', { class: 'l', text: 'CPU' }), h('div', { class: 'v', text: `${Math.round(sv.metrics.cpu)} %` }), meter(sv.metrics.cpu)),
        h('div', { class: 'svc-stat' }, h('div', { class: 'l', text: 'RAM' }), h('div', { class: 'v', text: `${Math.round(sv.metrics.memory)} %` }), meter(sv.metrics.memory)),
        h('div', { class: 'svc-stat' }, h('div', { class: 'l', text: 'Latenz' }), h('div', { class: 'v', text: sv.status === 'down' ? '–' : `${sv.metrics.latency} ms` }))))));

    let detail = null;
    if (sel) {
      const [mLabel, mFmt] = METRICS[state.ui.metric];
      const actions = [];
      if (can('ops')) {
        const statusSel = h('select', { class: 'input', 'aria-label': 'Status setzen' },
          Object.keys(STATUS.service).map(k => h('option', { value: k, text: labelOf('service', k) })));
        statusSel.value = sel.status;
        statusSel.addEventListener('change', () => api('PATCH', `/services/${sel.id}`, { status: statusSel.value })
          .then(() => { toast(`Status von ${sel.name} geändert.`); rerender(); }).catch(fail));
        actions.push(statusSel,
          h('button', { class: 'btn btn-sm', text: '⟳ Neustart', onClick: () => confirmModal('Service neu starten?', `${sel.name} wird per Rolling Restart neu gestartet.`, 'Neu starten',
            () => api('POST', `/services/${sel.id}/restart`).then(() => { toast(`${sel.name} wird neu gestartet.`); rerender(); })) }));
      }
      if (can('admin')) {
        actions.push(h('button', { class: 'btn btn-sm btn-danger', text: 'Entfernen', onClick: () => confirmModal('Service entfernen?', `„${sel.name}“ wird aus dem Monitoring entfernt.`, 'Entfernen',
          () => api('DELETE', `/services/${sel.id}`).then(() => { state.ui.selectedService = null; toast('Service entfernt.'); rerender(); })) }));
      }
      const latest = series[series.length - 1] || {};
      detail = card(`${sel.name} · ${mLabel}`,
        h('div', null,
          h('div', { class: 'toolbar' },
            seg(Object.entries(METRICS).map(([k, [l]]) => [k, l]), state.ui.metric, (v) => { state.ui.metric = v; rerender(); }, 'Metrik'),
            seg([['1h', '1 Std.'], ['24h', '24 Std.']], state.ui.range, (v) => { state.ui.range = v; rerender(); }, 'Zeitraum'),
            h('div', { class: 'spacer' }), actions),
          lineChart(series.map(p => ({ t: p.t, v: p[state.ui.metric] })), { height: 260, yFormat: mFmt, tipLabel: mLabel }),
          h('dl', { class: 'kv' },
            h('dt', { text: 'Aktuell' }), h('dd', { class: 'num', text: latest[state.ui.metric] !== undefined ? mFmt(latest[state.ui.metric]) : '–' }),
            h('dt', { text: 'Letzter Neustart' }), h('dd', { text: fmtDate(sel.lastRestart) }))));
    }

    const head = h('div', { class: 'page-head' }, h('p', { text: `${services.length} Services · automatische Aktualisierung alle ${state.settings.autoRefreshSec} s` }), h('div', { class: 'spacer' }),
      can('admin') ? h('button', { class: 'btn btn-primary', text: '+ Service hinzufügen', onClick: () => formModal('Service hinzufügen', [
        { name: 'name', label: 'Name', required: true, maxlength: 60 },
        { row: [{ name: 'type', label: 'Typ', type: 'select', options: ['Microservice', 'Gateway', 'Datenbank', 'Cache', 'Queue', 'Infrastruktur'].map(x => [x, x]) },
          { name: 'region', label: 'Region', value: 'eu-central-1', maxlength: 40 }] },
        { name: 'version', label: 'Version', value: 'v1.0.0', maxlength: 30 },
      ], 'Hinzufügen', async (v) => { const sv = await api('POST', '/services', v); state.ui.selectedService = sv.id; toast('Service hinzugefügt.'); rerender(); }) }) : null);
    return h('div', { class: 'grid' }, head, detail, grid);
  }

  // ======================================================================
  // 3 · Incidents
  // ======================================================================
  async function renderIncidents() {
    const [list, services] = await Promise.all([api('GET', `/incidents?status=${state.ui.incidentFilter}`), api('GET', '/services')]);
    const svcName = (id) => (services.find(x => x.id === id) || {}).name || '–';
    const rows = list.map(i => h('tr', { class: 'clickable', tabindex: 0, onClick: () => incidentDetail(i, services), onKeydown: (e) => { if (e.key === 'Enter') incidentDetail(i, services); } },
      h('td', null, pill('severity', i.severity)),
      h('td', null, h('div', { class: 'strong', text: i.title })),
      h('td', { text: svcName(i.serviceId) }),
      h('td', null, pill('incident', i.status)),
      h('td', { text: userName(i.assignee) }),
      h('td', { class: 'small muted', text: `${fmtDate(i.createdAt)}` }),
      h('td', { class: 'small muted', text: i.resolvedAt ? durationText(i.createdAt, i.resolvedAt) : relTime(i.createdAt) })));
    return h('div', { class: 'grid' },
      h('div', { class: 'page-head' },
        seg([['active', 'Aktiv'], ['resolved', 'Gelöst'], ['all', 'Alle']], state.ui.incidentFilter, (v) => { state.ui.incidentFilter = v; rerender(); }, 'Filter'),
        h('div', { class: 'spacer' }), can('ops') ? exportBtn('incidents') : null,
        can('ops') ? h('button', { class: 'btn btn-primary', text: '+ Incident melden', onClick: () => newIncident(services) }) : null),
      card(null, table(['Schwere', 'Titel', 'Service', 'Status', 'Zuständig', 'Eröffnet', 'Dauer / Alter'], rows, 'Keine Incidents in dieser Ansicht.')));
  }
  function durationText(a, b) {
    const m = Math.round((Date.parse(b) - Date.parse(a)) / 60000);
    return m < 60 ? `${m} Min. Dauer` : `${Math.floor(m / 60)} Std. ${m % 60} Min. Dauer`;
  }
  function userOptions(withEmpty) {
    const opts = state.users.map(u => [u.id, u.name]);
    return withEmpty ? [['', '– niemand –'], ...opts] : opts;
  }
  function newIncident(services) {
    formModal('Incident melden', [
      { name: 'title', label: 'Titel', required: true, maxlength: 120, placeholder: 'z. B. Checkout liefert 500-Fehler' },
      { row: [{ name: 'severity', label: 'Schweregrad', type: 'select', value: 'SEV3', options: [['SEV1', 'SEV1 – Totalausfall'], ['SEV2', 'SEV2 – Stark eingeschränkt'], ['SEV3', 'SEV3 – Teilweise betroffen'], ['SEV4', 'SEV4 – Gering']] },
        { name: 'serviceId', label: 'Betroffener Service', type: 'select', options: [['', '– keiner –'], ...services.map(x => [x.id, x.name])] }] },
      { name: 'assignee', label: 'Zuständig', type: 'select', options: userOptions(false), value: state.user.id },
      { name: 'description', label: 'Beschreibung', type: 'textarea', maxlength: 1000 },
    ], 'Melden', async (v) => { await api('POST', '/incidents', v); toast('Incident gemeldet.'); rerender(); });
  }
  function incidentDetail(inc, services) {
    const svc = services.find(x => x.id === inc.serviceId);
    const tl = h('div', { class: 'timeline' }, [...inc.updates].reverse().map(u => h('div', { class: 'ev' }, h('div', { text: u.text }), h('div', { class: 'meta', text: `${u.by} · ${fmtDate(u.time)}` }))));
    const body = h('div', null,
      h('dl', { class: 'kv' },
        h('dt', { text: 'Schweregrad' }), h('dd', null, pill('severity', inc.severity)),
        h('dt', { text: 'Status' }), h('dd', null, pill('incident', inc.status)),
        h('dt', { text: 'Service' }), h('dd', { text: svc ? svc.name : '–' }),
        h('dt', { text: 'Zuständig' }), h('dd', { text: userName(inc.assignee) }),
        h('dt', { text: 'Eröffnet' }), h('dd', { text: fmtDate(inc.createdAt) }),
        h('dt', { text: 'Gelöst' }), h('dd', { text: inc.resolvedAt ? `${fmtDate(inc.resolvedAt)} (${durationText(inc.createdAt, inc.resolvedAt)})` : '–' })),
      h('h3', { class: 'small muted', text: 'VERLAUF' }), tl);
    if (can('ops')) {
      const statusSel = h('select', { class: 'input', 'aria-label': 'Status' }, Object.keys(STATUS.incident).map(k => h('option', { value: k, text: labelOf('incident', k) })));
      statusSel.value = inc.status;
      const sevSel = h('select', { class: 'input', 'aria-label': 'Schweregrad' }, Object.keys(STATUS.severity).map(k => h('option', { value: k, text: k })));
      sevSel.value = inc.severity;
      const text = h('textarea', { class: 'input', placeholder: 'Status-Update für das Team …', maxlength: 1000 });
      body.append(h('div', { class: 'field' }, h('label', { text: 'Neues Update' }), text),
        h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'Status' }), statusSel), h('div', { class: 'field' }, h('label', { text: 'Schweregrad' }), sevSel)),
        h('div', { class: 'modal-actions' },
          h('button', { class: 'btn', type: 'button', text: 'Schließen', onClick: () => m.close() }),
          h('button', { class: 'btn btn-primary', type: 'button', text: 'Speichern', onClick: async () => {
            try {
              if (text.value.trim()) await api('POST', `/incidents/${inc.id}/updates`, { text: text.value });
              const patch = {};
              if (statusSel.value !== inc.status) patch.status = statusSel.value;
              if (sevSel.value !== inc.severity) patch.severity = sevSel.value;
              if (Object.keys(patch).length) await api('PATCH', `/incidents/${inc.id}`, patch);
              toast('Incident aktualisiert.'); m.close(); rerender();
            } catch (e) { fail(e); }
          } })));
    } else body.append(h('div', { class: 'modal-actions' }, h('button', { class: 'btn', type: 'button', text: 'Schließen', onClick: () => m.close() })));
    const m = openModal(inc.title, body, { wide: true });
  }

  // ======================================================================
  // 4 · Tickets
  // ======================================================================
  async function renderTickets() {
    const f = state.ui.tickets;
    const qs = new URLSearchParams({ q: f.q, status: f.status, priority: f.priority, mine: f.mine ? '1' : '' });
    const list = await api('GET', `/tickets?${qs}`);
    const search = h('input', { class: 'input search', type: 'search', placeholder: 'Suchen (Nr., Titel, Beschreibung) …', value: f.q, 'aria-label': 'Tickets durchsuchen' });
    let t;
    search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(async () => { f.q = search.value; await refreshTable(); }, 250); });
    const statusSel = h('select', { class: 'input', 'aria-label': 'Status' }, h('option', { value: '', text: 'Alle Status' }), Object.keys(STATUS.ticket).map(k => h('option', { value: k, text: labelOf('ticket', k) })));
    statusSel.value = f.status;
    statusSel.addEventListener('change', () => { f.status = statusSel.value; refreshTable(); });
    const prioSel = h('select', { class: 'input', 'aria-label': 'Priorität' }, h('option', { value: '', text: 'Alle Prioritäten' }), Object.keys(STATUS.priority).map(k => h('option', { value: k, text: labelOf('priority', k) })));
    prioSel.value = f.priority;
    prioSel.addEventListener('change', () => { f.priority = prioSel.value; refreshTable(); });
    const mine = h('input', { type: 'checkbox', checked: f.mine });
    mine.addEventListener('change', () => { f.mine = mine.checked; refreshTable(); });

    const tableHost = h('div');
    const counter = h('span', { class: 'muted small' });
    function fill(items) {
      counter.textContent = `${items.length} Tickets`;
      tableHost.replaceChildren(table(['Nr.', 'Titel', 'Priorität', 'Status', 'Zuständig', 'Anfragende Stelle', 'Aktualisiert'], items.map(tk =>
        h('tr', { class: 'clickable', tabindex: 0, onClick: () => ticketDetail(tk), onKeydown: (e) => { if (e.key === 'Enter') ticketDetail(tk); } },
          h('td', { class: 'num muted', text: `#${tk.number}` }), h('td', null, h('div', { class: 'strong', text: tk.title })),
          h('td', null, pill('priority', tk.priority)), h('td', null, pill('ticket', tk.status)),
          h('td', { text: userName(tk.assignee) }), h('td', { text: tk.requester }), h('td', { class: 'small muted', text: relTime(tk.updatedAt) }))), 'Keine Tickets gefunden.'));
    }
    async function refreshTable() {
      const q = new URLSearchParams({ q: f.q, status: f.status, priority: f.priority, mine: f.mine ? '1' : '' });
      try { fill(await api('GET', `/tickets?${q}`)); } catch (e) { fail(e); }
    }
    fill(list);
    return h('div', { class: 'grid' },
      h('div', { class: 'page-head' }, counter, h('div', { class: 'spacer' }), can('ops') ? exportBtn('tickets') : null,
        can('ops') ? h('button', { class: 'btn btn-primary', text: '+ Neues Ticket', onClick: newTicket }) : null),
      card(null, h('div', null, h('div', { class: 'toolbar' }, search, statusSel, prioSel, h('label', { class: 'check small' }, mine, h('span', { text: 'Nur meine' }))), tableHost)));
  }
  function newTicket() {
    formModal('Neues Ticket', [
      { name: 'title', label: 'Titel', required: true, maxlength: 140 },
      { name: 'description', label: 'Beschreibung', type: 'textarea', maxlength: 4000 },
      { row: [{ name: 'priority', label: 'Priorität', type: 'select', value: 'mittel', options: Object.keys(STATUS.priority).map(k => [k, labelOf('priority', k)]) },
        { name: 'assignee', label: 'Zuständig', type: 'select', options: userOptions(true) }] },
      { name: 'requester', label: 'Anfragende Stelle', maxlength: 80, placeholder: 'z. B. Vertrieb' },
    ], 'Anlegen', async (v) => { const tk = await api('POST', '/tickets', v); toast(`Ticket #${tk.number} angelegt.`); rerender(); });
  }
  function ticketDetail(tk) {
    const editable = can('ops');
    const titleIn = h('input', { class: 'input', maxlength: 140, value: tk.title, disabled: !editable });
    const descIn = h('textarea', { class: 'input', maxlength: 4000, disabled: !editable }); descIn.value = tk.description;
    const mk = (opts, val) => { const el = h('select', { class: 'input', disabled: !editable }, opts.map(([v, l]) => h('option', { value: v, text: l }))); el.value = val ?? ''; return el; };
    const prio = mk(Object.keys(STATUS.priority).map(k => [k, labelOf('priority', k)]), tk.priority);
    const status = mk(Object.keys(STATUS.ticket).map(k => [k, labelOf('ticket', k)]), tk.status);
    const assignee = mk(userOptions(true), tk.assignee || '');
    const comments = h('div', { class: 'timeline' }, tk.comments.length ? tk.comments.map(c => h('div', { class: 'ev' }, h('div', { text: c.text }), h('div', { class: 'meta', text: `${c.by} · ${fmtDate(c.time)}` })))
      : h('div', { class: 'muted small', text: 'Noch keine Kommentare.' }));
    const commentIn = h('textarea', { class: 'input', placeholder: 'Kommentar hinzufügen …', maxlength: 2000 });
    const body = h('div', null,
      h('p', { class: 'muted small', text: `Angelegt ${fmtDate(tk.createdAt)} von ${tk.requester} · zuletzt aktualisiert ${relTime(tk.updatedAt)}` }),
      h('div', { class: 'field' }, h('label', { text: 'Titel' }), titleIn),
      h('div', { class: 'field' }, h('label', { text: 'Beschreibung' }), descIn),
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'Priorität' }), prio), h('div', { class: 'field' }, h('label', { text: 'Status' }), status),
        h('div', { class: 'field' }, h('label', { text: 'Zuständig' }), assignee)),
      h('h3', { class: 'small muted', text: 'KOMMENTARE' }), comments,
      editable ? h('div', { class: 'field' }, h('label', { text: 'Neuer Kommentar' }), commentIn) : null,
      h('div', { class: 'modal-actions' },
        can('admin') ? h('button', { class: 'btn btn-danger', type: 'button', text: 'Löschen', onClick: () => { m.close(); confirmModal('Ticket löschen?', `Ticket #${tk.number} wird dauerhaft gelöscht.`, 'Löschen', () => api('DELETE', `/tickets/${tk.id}`).then(() => { toast('Ticket gelöscht.'); rerender(); })); } }) : null,
        h('div', { class: 'spacer' }),
        h('button', { class: 'btn', type: 'button', text: 'Schließen', onClick: () => m.close() }),
        editable ? h('button', { class: 'btn btn-primary', type: 'button', text: 'Speichern', onClick: async () => {
          try {
            await api('PATCH', `/tickets/${tk.id}`, { title: titleIn.value, description: descIn.value, priority: prio.value, status: status.value, assignee: assignee.value || null });
            if (commentIn.value.trim()) await api('POST', `/tickets/${tk.id}/comments`, { text: commentIn.value });
            toast(`Ticket #${tk.number} gespeichert.`); m.close(); rerender();
          } catch (e) { fail(e); }
        } }) : null));
    const m = openModal(`Ticket #${tk.number}`, body, { wide: true });
  }

  // ======================================================================
  // 5 · Deployments
  // ======================================================================
  async function renderDeployments() {
    const [list, services] = await Promise.all([api('GET', `/deployments?environment=${state.ui.deployEnv}`), api('GET', '/services')]);
    const svcName = (id) => (services.find(x => x.id === id) || {}).name || '–';
    // Laufende Deployments schneller nachladen
    if (list.some(d => d.status === 'läuft')) setTimeout(() => { if (state.route === 'deployments' && !modalOpen()) rerender(); }, 2500);
    const rows = list.map(d => h('tr', null,
      h('td', null, h('div', { class: 'strong', text: svcName(d.serviceId) })),
      h('td', { class: 'num', text: d.version }),
      h('td', null, h('span', { class: `pill ${d.environment === 'production' ? 'gold' : ''}`, text: d.environment === 'production' ? 'Produktion' : 'Staging' })),
      h('td', null, pill('deploy', d.status)),
      h('td', { text: d.by }),
      h('td', { class: 'small muted', text: fmtDate(d.createdAt) }),
      h('td', { class: 'num small', text: d.duration ? `${Math.floor(d.duration / 60)}:${String(d.duration % 60).padStart(2, '0')} min` : '–' }),
      h('td', { class: 'small muted', text: d.notes || '' }),
      h('td', { class: 'actions' }, can('ops') && d.status === 'erfolgreich' ? h('button', { class: 'btn btn-sm', text: '↺ Rollback', onClick: () => confirmModal('Rollback durchführen?',
        `${svcName(d.serviceId)} ${d.version} (${d.environment}) wird zurückgerollt${d.previousVersion ? ` auf ${d.previousVersion}` : ''}.`, 'Rollback',
        () => api('POST', `/deployments/${d.id}/rollback`).then(() => { toast('Rollback durchgeführt.'); rerender(); })) }) : null)));
    return h('div', { class: 'grid' },
      h('div', { class: 'page-head' },
        seg([['', 'Alle'], ['production', 'Produktion'], ['staging', 'Staging']], state.ui.deployEnv, (v) => { state.ui.deployEnv = v; rerender(); }, 'Umgebung'),
        h('div', { class: 'spacer' }), can('ops') ? exportBtn('deployments') : null,
        can('ops') ? h('button', { class: 'btn btn-primary', text: '🚀 Deployment starten', onClick: () => formModal('Deployment starten', [
          { name: 'serviceId', label: 'Service', type: 'select', options: services.map(x => [x.id, `${x.name} (aktuell ${x.version})`]) },
          { row: [{ name: 'version', label: 'Neue Version', required: true, maxlength: 30, placeholder: 'z. B. v4.13.0' },
            { name: 'environment', label: 'Umgebung', type: 'select', value: 'staging', options: [['staging', 'Staging'], ['production', 'Produktion']] }] },
          { name: 'notes', label: 'Release-Notiz', maxlength: 300 },
        ], 'Starten', async (v) => { await api('POST', '/deployments', v); toast('Deployment gestartet – Pipeline läuft.'); rerender(); }) }) : null),
      card(null, table(['Service', 'Version', 'Umgebung', 'Status', 'Von', 'Zeitpunkt', 'Dauer', 'Notiz', ''], rows)));
  }

  // ======================================================================
  // 6 · Benutzer (Admin)
  // ======================================================================
  async function renderUsers() {
    const list = await api('GET', '/users');
    const rows = list.map(u => h('tr', null,
      h('td', null, h('div', { class: 'user-cell' }, h('div', { class: 'avatar', text: initials(u.name) }), h('div', null, h('div', { class: 'strong', text: u.name }), h('div', { class: 'small muted', text: u.email })))),
      h('td', null, pill('role', u.role)),
      h('td', null, u.active ? h('span', { class: 'pill good' }, '✔ Aktiv') : h('span', { class: 'pill' }, '○ Deaktiviert'), u.mustChangePassword ? h('div', { class: 'small muted', text: 'PW-Wechsel ausstehend' }) : null),
      h('td', { class: 'small muted', text: u.lastLogin ? relTime(u.lastLogin) : 'nie' }),
      h('td', { class: 'small muted date', text: fmtDate(u.createdAt) }),
      h('td', { class: 'actions' },
        h('button', { class: 'btn btn-sm', text: 'Bearbeiten', onClick: () => formModal(`Benutzer bearbeiten`, [
          { name: 'name', label: 'Name', value: u.name, required: true, maxlength: 80 },
          { name: 'role', label: 'Rolle', type: 'select', value: u.role, options: Object.keys(STATUS.role).map(k => [k, labelOf('role', k)]) },
          { name: 'active', label: 'Konto aktiv', type: 'checkbox', value: u.active },
        ], 'Speichern', async (v) => { await api('PATCH', `/users/${u.id}`, v); toast('Benutzer gespeichert.'); await loadUsers(); rerender(); }) }),
        ' ',
        h('button', { class: 'btn btn-sm', text: 'Passwort zurücksetzen', onClick: () => confirmModal('Passwort zurücksetzen?', `Für ${u.name} wird ein temporäres Passwort erzeugt. Alle Sitzungen werden beendet.`, 'Zurücksetzen',
          async () => { const r = await api('POST', `/users/${u.id}/reset-password`); showTempPassword(u, r.temporaryPassword); }) }),
        ' ',
        u.id !== state.user.id ? h('button', { class: 'btn btn-sm btn-danger', text: 'Löschen', onClick: () => confirmModal('Benutzer löschen?', `${u.name} (${u.email}) wird dauerhaft gelöscht.`, 'Löschen',
          () => api('DELETE', `/users/${u.id}`).then(async () => { toast('Benutzer gelöscht.'); await loadUsers(); rerender(); })) }) : null)));
    const counts = { admin: 0, ops: 0, viewer: 0 };
    list.forEach(u => { if (u.active) counts[u.role]++; });
    return h('div', { class: 'grid' },
      h('div', { class: 'grid grid-kpi' }, kpi('Administratoren', String(counts.admin)), kpi('Operations', String(counts.ops)), kpi('Nur Lesen', String(counts.viewer)), kpi('Gesamt', String(list.length), `${list.filter(u => !u.active).length} deaktiviert`)),
      h('div', { class: 'page-head' }, h('p', { text: 'Rollen: Administrator (alles) · Operations (Betrieb, Tickets, Deployments) · Nur Lesen' }), h('div', { class: 'spacer' }), exportBtn('users'),
        h('button', { class: 'btn btn-primary', text: '+ Benutzer anlegen', onClick: () => formModal('Benutzer anlegen', [
          { name: 'name', label: 'Name', required: true, maxlength: 80 },
          { name: 'email', label: 'E-Mail', type: 'email', required: true, maxlength: 160 },
          { row: [{ name: 'role', label: 'Rolle', type: 'select', value: 'viewer', options: Object.keys(STATUS.role).map(k => [k, labelOf('role', k)]) },
            { name: 'password', label: 'Startpasswort (min. 10 Zeichen)', type: 'password', required: true, autocomplete: 'new-password' }] },
        ], 'Anlegen', async (v) => { await api('POST', '/users', v); toast('Benutzer angelegt.'); await loadUsers(); rerender(); }) })),
      card(null, table(['Benutzer', 'Rolle', 'Status', 'Letzter Login', 'Angelegt', ''], rows)));
  }
  function showTempPassword(u, pw) {
    const m = openModal('Temporäres Passwort', h('div', null,
      h('p', { class: 'muted', text: `Gib dieses Passwort sicher an ${u.name} weiter. Es wird nur jetzt angezeigt; beim nächsten Login muss es geändert werden.` }),
      h('div', { class: 'code', text: pw }),
      h('div', { class: 'modal-actions' },
        h('button', { class: 'btn', type: 'button', text: 'Kopieren', onClick: () => navigator.clipboard.writeText(pw).then(() => toast('Kopiert.')).catch(() => {}) }),
        h('button', { class: 'btn btn-primary', type: 'button', text: 'Fertig', onClick: () => { m.close(); rerender(); } }))));
  }

  // ======================================================================
  // 7 · Audit-Log (Admin)
  // ======================================================================
  const AUDIT_GROUPS = [['', 'Alle Aktionen'], ['auth', 'Anmeldung'], ['user', 'Benutzer'], ['service', 'Services'], ['incident', 'Incidents'],
    ['ticket', 'Tickets'], ['deployment', 'Deployments'], ['settings', 'Einstellungen'], ['export', 'Exporte']];
  async function renderAudit() {
    const a = state.ui.audit;
    const data = await api('GET', `/audit?${new URLSearchParams({ q: a.q, action: a.action, page: a.page, size: 25 })}`);
    const pages = Math.max(1, Math.ceil(data.total / data.size));
    const search = h('input', { class: 'input search', type: 'search', placeholder: 'Suchen (Benutzer, Aktion, Ziel, IP) …', value: a.q, 'aria-label': 'Audit-Log durchsuchen' });
    let t;
    search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { a.q = search.value; a.page = 1; rerender(); setTimeout(() => { const el = document.querySelector('.content input[type=search]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 50); }, 350); });
    const sel = h('select', { class: 'input', 'aria-label': 'Aktionstyp' }, AUDIT_GROUPS.map(([v, l]) => h('option', { value: v, text: l })));
    sel.value = a.action;
    sel.addEventListener('change', () => { a.action = sel.value; a.page = 1; rerender(); });
    const actionCls = (act) => act.includes('failed') || act.includes('deleted') ? 'critical' : act.startsWith('auth') ? 'info' : act.includes('created') ? 'good' : '';
    const rows = data.items.map(x => h('tr', null,
      h('td', { class: 'small num', text: fmtDate(x.time) }),
      h('td', { class: 'strong', text: x.userName }),
      h('td', null, h('span', { class: `pill ${actionCls(x.action)}`, text: x.action })),
      h('td', { text: x.target }),
      h('td', { class: 'small muted', text: x.details }),
      h('td', { class: 'small muted num', text: x.ip })));
    return h('div', { class: 'grid' },
      h('div', { class: 'page-head' }, h('p', { text: `${fmtNum(data.total)} Einträge · unveränderliches Protokoll aller Aktionen` }), h('div', { class: 'spacer' }), exportBtn('audit')),
      card(null, h('div', null, h('div', { class: 'toolbar' }, search, sel),
        table(['Zeit', 'Benutzer', 'Aktion', 'Ziel', 'Details', 'IP'], rows, 'Keine Einträge gefunden.'),
        h('div', { class: 'pager' },
          h('button', { class: 'btn btn-sm', text: '← Zurück', disabled: a.page <= 1, onClick: () => { a.page--; rerender(); } }),
          h('span', { class: 'small muted', text: `Seite ${a.page} von ${pages}` }),
          h('button', { class: 'btn btn-sm', text: 'Weiter →', disabled: a.page >= pages, onClick: () => { a.page++; rerender(); } })))));
  }

  // ======================================================================
  // 8 · Einstellungen
  // ======================================================================
  async function renderSettings() {
    const st = await api('GET', '/settings');
    state.settings = st;
    const admin = can('admin');
    const f = (name, label, type, value, attrs = {}) => {
      const input = h('input', Object.assign({ class: 'input', id: 's_' + name, name, type, value: String(value), disabled: !admin }, attrs));
      return h('div', { class: 'field' }, h('label', { for: 's_' + name, text: label }), input);
    };
    const maint = h('input', { type: 'checkbox', name: 'maintenanceMode', checked: st.maintenanceMode, disabled: !admin });
    const form = h('form', { novalidate: true },
      h('div', { class: 'row' }, f('companyName', 'Firmenname', 'text', st.companyName, { maxlength: 60 }), f('alertEmail', 'Alarm-E-Mail', 'email', st.alertEmail, { maxlength: 160 })),
      h('div', { class: 'row' },
        f('sessionTimeoutMin', 'Session-Timeout (Minuten)', 'number', st.sessionTimeoutMin, { min: 5, max: 720 }),
        f('uptimeTarget', 'SLA-Ziel Verfügbarkeit (%)', 'number', st.uptimeTarget, { min: 90, max: 100, step: 0.01 }),
        f('autoRefreshSec', 'Auto-Aktualisierung (Sekunden)', 'number', st.autoRefreshSec, { min: 5, max: 300 })),
      h('div', { class: 'field' }, h('label', { class: 'check' }, maint, h('span', { text: 'Wartungsmodus – nur Administratoren dürfen Änderungen vornehmen' }))),
      admin ? h('div', { class: 'modal-actions' }, h('button', { class: 'btn btn-primary', type: 'submit', text: 'Einstellungen speichern' })) : h('p', { class: 'muted small', text: 'Nur Administratoren können Systemeinstellungen ändern.' }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(form));
      try {
        state.settings = await api('PUT', '/settings', {
          companyName: v.companyName, alertEmail: v.alertEmail, sessionTimeoutMin: Number(v.sessionTimeoutMin),
          uptimeTarget: Number(v.uptimeTarget), autoRefreshSec: Number(v.autoRefreshSec), maintenanceMode: maint.checked,
        });
        toast('Einstellungen gespeichert.'); renderBanners();
      } catch (ex) { fail(ex); }
    });
    const u = state.user;
    const profile = card('Mein Profil', h('div', null,
      h('dl', { class: 'kv' },
        h('dt', { text: 'Name' }), h('dd', { text: u.name }),
        h('dt', { text: 'E-Mail' }), h('dd', { text: u.email }),
        h('dt', { text: 'Rolle' }), h('dd', null, pill('role', u.role)),
        h('dt', { text: 'Letzter Login' }), h('dd', { text: fmtDate(u.lastLogin) })),
      h('button', { class: 'btn', text: 'Passwort ändern', onClick: changePassword })));
    const security = card('Sicherheit', h('ul', { class: 'muted' },
      h('li', { text: 'Passwörter mit scrypt gehasht (Salt pro Benutzer)' }),
      h('li', { text: 'HttpOnly-/SameSite=Strict-Session-Cookies, gleitender Ablauf' }),
      h('li', { text: 'CSRF-Schutz, Content-Security-Policy, HSTS in Produktion' }),
      h('li', { text: 'Login-Rate-Limit gegen Brute-Force-Angriffe' }),
      h('li', { text: 'Rollenbasierte Rechte (RBAC) serverseitig geprüft' }),
      h('li', { text: 'Lückenloses Audit-Log inkl. CSV-Export' })));
    return h('div', { class: 'grid' }, card('System', form), h('div', { class: 'grid grid-2e' }, profile, security));
  }

  function changePassword() {
    formModal('Passwort ändern', [
      { name: 'current', label: 'Aktuelles Passwort', type: 'password', required: true, autocomplete: 'current-password' },
      { name: 'next', label: 'Neues Passwort (min. 10 Zeichen, Buchstaben + Ziffern)', type: 'password', required: true, autocomplete: 'new-password' },
      { name: 'repeat', label: 'Neues Passwort wiederholen', type: 'password', required: true, autocomplete: 'new-password' },
    ], 'Ändern', async (v) => {
      if (v.next !== v.repeat) throw new Error('Die neuen Passwörter stimmen nicht überein.');
      await api('POST', '/auth/password', { current: v.current, next: v.next });
      state.user.mustChangePassword = false;
      renderBanners();
      toast('Passwort geändert.');
    });
  }

  // ======================================================================
  // Start
  // ======================================================================
  async function loadUsers() { state.users = await api('GET', '/users'); }

  async function init() {
    const me = await api('GET', '/auth/me');
    state.user = me.user; state.settings = me.settings;
    await loadUsers();
    $('userName').textContent = state.user.name;
    $('userRole').textContent = labelOf('role', state.user.role);
    $('userAvatar').textContent = initials(state.user.name);

    const chip = $('userChip'), menu = $('userMenu');
    const toggleMenu = (show) => menu.classList.toggle('hidden', show === undefined ? !menu.classList.contains('hidden') : !show);
    chip.addEventListener('click', (e) => { if (!menu.contains(e.target)) toggleMenu(); });
    chip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(); } });
    document.addEventListener('click', (e) => { if (!chip.contains(e.target)) toggleMenu(false); });
    menu.addEventListener('click', async (e) => {
      const cmd = e.target.dataset.cmd;
      toggleMenu(false);
      if (cmd === 'password') changePassword();
      if (cmd === 'logout') { await api('POST', '/auth/logout').catch(() => {}); location.href = '/login'; }
    });
    $('menuToggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));

    renderBanners();
    window.addEventListener('hashchange', navigate);
    navigate();
  }

  init().catch((e) => { if (e.message !== 'Nicht angemeldet.') fail(e); });
})();
