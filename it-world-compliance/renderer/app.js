// Kern der Oberfläche: Hilfsfunktionen, Zustand, Protokoll, Dialoge, Fachlogik, Navigation.
// Die Ansichten (views-*.js) registrieren sich über App.registerView(); boot.js startet alles.
(function () {
  'use strict';

  const C = window.CATALOG;
  const S = window.SCHEMA;
  const api = window.complianceAPI;
  const HOUR = 3600 * 1000;
  const GROUPS = ['Überblick', 'Regelwerke', 'Register', 'Betrieb', 'Berichte', 'Einstellungen'];
  // Gleiche Bereinigung wie im Hauptprozess (lib/validate.js), damit Hash-Ketten stabil bleiben.
  const BAD_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;

  const App = (window.App = {
    api, C, S, HOUR,
    views: [],
    actions: {},
    ui: { view: 'dashboard', filter: { nis2: 'alle', dsgvo: 'alle', itsec: 'alle' }, search: {}, locked: false },
    state: null,
    vault: { encrypted: false },
    info: null
  });

  // ---------- Hilfsfunktionen ----------

  App.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Alle Texte laufen über textContent – nie über innerHTML.
  App.h = function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        // style über das CSSOM setzen: ein style="…"-Attribut würde die strikte CSP verletzen.
        else if (k === 'style') el.style.cssText = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return el;
  };
  const h = App.h;

  App.esc = (s) =>
    String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  App.clean = (s, max) => String(s === undefined || s === null ? '' : s).slice(0, max + 64).replace(BAD_CHARS, '').slice(0, max);

  App.fmtDate = function (iso) {
    if (!iso) return '–';
    const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    return isNaN(d) ? '–' : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  App.fmtDateTime = function (ts) {
    const d = ts instanceof Date ? ts : new Date(ts);
    return isNaN(d)
      ? '–'
      : d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  };

  const p2 = (n) => String(n).padStart(2, '0');
  App.toIso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  App.todayIso = () => App.toIso(new Date());
  App.toLocalInput = (d) => `${App.toIso(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}`;

  App.addMonths = function (iso, n) {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return '';
    const day = d.getDate();
    d.setMonth(d.getMonth() + n);
    if (d.getDate() !== day) d.setDate(0); // 31.01. + 1 Monat = 28./29.02.
    return App.toIso(d);
  };

  // Fehlertexte aus dem Hauptprozess enthalten ein technisches Präfix – wegschneiden.
  App.cleanErr = (err) => String(err && err.message ? err.message : err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

  App.toast = function (msg, isError) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    clearTimeout(App.toast.t);
    App.toast.t = setTimeout(() => el.classList.remove('show'), isError ? 5500 : 2600);
  };

  // ---------- Zustand ----------

  App.emptyState = () => ({
    firma: {}, nis2Check: {}, items: {}, vorfaelle: [],
    vvt: [], dienstleister: [], anfragen: [], schulungen: [], protokoll: [],
    einstellungen: { benutzer: '', autoLockMin: 10 }
  });

  App.normalize = function (d) {
    const base = App.emptyState();
    const s = d && typeof d === 'object' ? d : {};
    for (const k of Object.keys(base)) {
      if (s[k] !== undefined && s[k] !== null && typeof s[k] === typeof base[k] && Array.isArray(s[k]) === Array.isArray(base[k])) base[k] = s[k];
    }
    base.einstellungen = Object.assign({ benutzer: '', autoLockMin: 10 }, base.einstellungen);
    return base;
  };
  App.state = App.emptyState();

  // ---------- Änderungsprotokoll (Hash-Kette: Manipulationen werden erkennbar) ----------

  const entryString = (e) => [e.prev, e.ts, e.aktion, e.ziel, e.detail, e.benutzer].join('\u001f');

  async function sha256(s) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  App.log = function (aktion, ziel, detail) {
    const s = App.state;
    s.protokoll.push({
      id: App.uid(), ts: new Date().toISOString(),
      aktion: App.clean(aktion, 60), ziel: App.clean(ziel, 200), detail: App.clean(detail, 500),
      benutzer: App.clean(s.einstellungen.benutzer, 80), prev: '', hash: ''
    });
    if (s.protokoll.length > 3000) s.protokoll.splice(0, s.protokoll.length - 3000);
  };

  async function chainLog() {
    const p = App.state.protokoll;
    for (let i = 0; i < p.length; i++) {
      if (!p[i].hash) {
        p[i].prev = i > 0 ? p[i - 1].hash : p[i].prev || '';
        p[i].hash = await sha256(entryString(p[i]));
      }
    }
  }

  App.verifyLog = async function () {
    const p = App.state.protokoll;
    for (let i = 0; i < p.length; i++) {
      if (!p[i].hash || (await sha256(entryString(p[i]))) !== p[i].hash) return { ok: false, index: i };
      if (i > 0 && p[i].prev !== p[i - 1].hash) return { ok: false, index: i };
    }
    return { ok: true, count: p.length };
  };

  App.persist = async function () {
    try {
      await chainLog();
      await api.saveData(App.state);
    } catch (err) {
      App.toast('Speichern fehlgeschlagen: ' + App.cleanErr(err), true);
    }
  };

  // ---------- Dialoge ----------

  let closeCurrent = null;

  App.openModal = function (build, opts) {
    const o = opts || {};
    if (closeCurrent) closeCurrent(true);
    const root = document.getElementById('modal-root');
    const previous = document.activeElement;
    const modal = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
    const onKey = (e) => {
      if (e.key === 'Escape' && !o.sticky) close();
      else if (e.key === 'Tab') {
        const f = Array.from(modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    function close(silent) {
      root.textContent = '';
      document.removeEventListener('keydown', onKey);
      closeCurrent = null;
      if (!silent && previous && previous.focus && document.contains(previous)) previous.focus();
    }
    build(modal, close);
    const backdrop = h('div', { class: 'modal-backdrop', onmousedown: (e) => { if (e.target === backdrop && !o.sticky) close(); } }, modal);
    root.textContent = '';
    root.appendChild(backdrop);
    document.addEventListener('keydown', onKey);
    closeCurrent = close;
    const first = modal.querySelector('[data-autofocus], select, input, textarea, button');
    if (first) first.focus();
    return close;
  };

  App.closeModal = function () {
    if (closeCurrent) closeCurrent(true);
  };

  App.confirmModal = function (titel, text, okLabel, onOk, opts) {
    const o = opts || {};
    App.openModal((modal, close) => {
      const typed = o.typed ? h('input', { type: 'text', 'aria-label': 'Bestätigung', placeholder: `Zur Bestätigung „${o.typed}“ eingeben`, autocomplete: 'off' }) : null;
      const ok = h('button', { class: 'btn btn-danger', type: 'button', disabled: !!typed, onclick: () => { close(); onOk(); } }, okLabel);
      if (typed) typed.addEventListener('input', () => { ok.disabled = typed.value.trim() !== o.typed; });
      modal.appendChild(h('h2', null, titel));
      modal.appendChild(h('p', { class: 'hint' }, text));
      if (typed) modal.appendChild(typed);
      modal.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: close }, 'Abbrechen'), ok));
    });
  };

  App.field = (label, input, wide) => h('label', { class: 'field' + (wide ? ' wide' : '') }, h('span', null, label), input);

  // ---------- Fachlogik: Anforderungen ----------

  App.itemState = (id) => App.state.items[id] || { status: 'offen' };
  App.allItems = (fw) => fw.gruppen.flatMap((g) => g.items);
  App.statusLabel = (id) => (C.STATUS.find((s) => s.id === id) || C.STATUS[0]).label;
  const weight = (id) => {
    const s = C.STATUS.find((x) => x.id === App.itemState(id).status);
    return s ? s.weight : 0;
  };

  App.fwStats = function (fw) {
    let done = 0, open = 0, wip = 0, na = 0, score = 0, counted = 0, evid = 0;
    const items = App.allItems(fw);
    for (const it of items) {
      const st = App.itemState(it.id);
      if (st.status === 'erledigt') { done++; if (st.evidence || st.file) evid++; }
      else if (st.status === 'laeuft') wip++;
      else if (st.status === 'entfaellt') na++;
      else open++;
      const w = weight(it.id);
      if (w !== null) { counted++; score += w; }
    }
    return { total: items.length, done, open, wip, na, evid, pct: counted ? Math.round((score / counted) * 100) : 100 };
  };

  App.overallPct = function () {
    let score = 0, counted = 0;
    for (const fw of C.FRAMEWORKS) {
      for (const it of App.allItems(fw)) {
        const w = weight(it.id);
        if (w !== null) { counted++; score += w; }
      }
    }
    return counted ? Math.round((score / counted) * 100) : 100;
  };

  // Anteil der erledigten Anforderungen, für die ein Nachweis hinterlegt ist.
  App.evidenceQuote = function () {
    let done = 0, evid = 0;
    for (const fw of C.FRAMEWORKS) {
      const s = App.fwStats(fw);
      done += s.done;
      evid += s.evid;
    }
    return { done, evid, pct: done ? Math.round((evid / done) * 100) : 0 };
  };

  App.isOverdue = (st) => !!st.due && st.status !== 'erledigt' && st.status !== 'entfaellt' && st.due < App.todayIso();

  App.reviewDate = function (st) {
    if (st.status === 'erledigt' && st.intervall && st.geprueft) return App.addMonths(st.geprueft, Number(st.intervall));
    return '';
  };

  App.nextSteps = function (limit) {
    const out = [];
    for (const fw of C.FRAMEWORKS) {
      for (const it of App.allItems(fw)) {
        const st = App.itemState(it.id);
        if (it.prio === 'hoch' && (st.status === 'offen' || st.status === 'laeuft')) out.push({ fw, it, st });
      }
    }
    out.sort((a, b) => (a.st.status === 'laeuft' ? 0 : 1) - (b.st.status === 'laeuft' ? 0 : 1));
    return out.slice(0, limit);
  };

  // Alle Änderungen an einer Anforderung laufen hier durch: speichern + protokollieren.
  App.setItem = async function (fw, it, patch) {
    const old = Object.assign({ status: 'offen' }, App.state.items[it.id]);
    const next = Object.assign({}, old, patch, { updated: new Date().toISOString() });
    if (next.status === 'erledigt' && (old.status !== 'erledigt' || !next.geprueft)) next.geprueft = App.todayIso();
    App.state.items[it.id] = next;
    const ch = [];
    if (old.status !== next.status) ch.push(`Status: ${App.statusLabel(old.status)} → ${App.statusLabel(next.status)}`);
    if ((old.evidence || '') !== (next.evidence || '') || (old.file || '') !== (next.file || '')) ch.push('Nachweis aktualisiert');
    if ((old.due || '') !== (next.due || '')) ch.push('Fällig: ' + App.fmtDate(next.due));
    if ((old.owner || '') !== (next.owner || '')) ch.push('Verantwortlich: ' + (next.owner || '–'));
    if (ch.length) App.log('Anforderung geändert', `${fw.name}: ${it.text}`, ch.join('; '));
    await App.persist();
    App.render();
  };

  // ---------- Fachlogik: Betroffenheit ----------

  App.betroffenheit = function (c) {
    const sektor = C.SEKTOREN.find((s) => s.id === c.sektor) || C.SEKTOREN[0];
    const ma = Number(c.mitarbeiter);
    if (!c.sektor || c.mitarbeiter === '' || c.mitarbeiter === undefined) return null;
    const umsatz = Number(c.umsatz), bilanz = Number(c.bilanz);
    const hatU = c.umsatz !== '' && c.umsatz !== undefined, hatB = c.bilanz !== '' && c.bilanz !== undefined;
    // Größenklassen nach EU-KMU-Empfehlung 2003/361/EG (Mio. €)
    const gross = ma >= 250 || (hatU && hatB && umsatz > 50 && bilanz > 43);
    const mittel = gross || ma >= 50 || (hatU && hatB && umsatz > 10 && bilanz > 10);
    const groesse = gross ? 'groß' : mittel ? 'mittel' : 'klein/Kleinstunternehmen';
    if (c.sonderfall === 'groessenunabhaengig') {
      return { typ: 'wichtig', groesse, titel: 'Voraussichtlich betroffen (größenunabhängig)', text: 'Für DNS-Dienste, TLD-Registries, Vertrauensdienste und öffentliche Telekommunikation gelten die NIS2-Pflichten unabhängig von der Unternehmensgröße. Die Einstufung als „besonders wichtig“ oder „wichtig“ hängt vom Einzelfall ab und sollte rechtlich bestätigt werden.' };
    }
    if (c.sonderfall === 'kritis') {
      return { typ: 'wesentlich', groesse, titel: 'Voraussichtlich besonders wichtige Einrichtung', text: 'Betreiber Kritischer Anlagen gelten grundsätzlich als besonders wichtige Einrichtungen und unterliegen zusätzlichen Anforderungen. Prüfen Sie zusätzlich die KRITIS-Vorgaben.' };
    }
    if (sektor.gruppe === 'hoch' && gross) {
      return { typ: 'wesentlich', groesse, titel: 'Voraussichtlich besonders wichtige Einrichtung', text: `Sektor mit hoher Kritikalität und Größenklasse „${groesse}“: Es gelten die strengsten Pflichten inkl. Registrierung, Risikomanagement, Meldepflichten und regelmäßige Nachweise gegenüber dem BSI.` };
    }
    if (sektor.gruppe !== 'keiner' && mittel) {
      return { typ: 'wichtig', groesse, titel: 'Voraussichtlich wichtige Einrichtung', text: `Sektor „${sektor.label}“ und Größenklasse „${groesse}“: Die NIS2-Pflichten zu Risikomanagement, Registrierung und Meldung von Vorfällen gelten voraussichtlich auch für Sie.` };
    }
    return {
      typ: 'nein', groesse, titel: 'Voraussichtlich nicht direkt betroffen',
      text: sektor.gruppe === 'keiner'
        ? 'Ihr Sektor ist nicht in den Anhängen der NIS2-Richtlinie genannt. Als Zulieferer betroffener Unternehmen können Ihre Kunden dennoch Sicherheitsnachweise verlangen.'
        : `Als ${groesse} fallen Sie trotz relevantem Sektor voraussichtlich nicht direkt unter NIS2. Als Lieferant betroffener Unternehmen können Ihre Kunden dennoch Nachweise verlangen.`
    };
  };
  App.BETROFFENHEIT_LABEL = { wesentlich: 'Besonders wichtige Einrichtung', wichtig: 'Wichtige Einrichtung', nein: 'Voraussichtlich nicht betroffen' };

  // ---------- Fachlogik: Vorfälle, Fristen ----------

  App.ART_LABEL = { sicherheit: 'Sicherheitsvorfall (NIS2)', datenpanne: 'Datenpanne (DSGVO)', beides: 'Sicherheitsvorfall mit Datenabfluss (NIS2 + DSGVO)' };
  App.VSTATUS_LABEL = { offen: 'Offen', gemeldet: 'Gemeldet', abgeschlossen: 'Abgeschlossen' };

  App.vorfallFristen = function (v) {
    const start = new Date(v.kenntnis);
    if (isNaN(start)) return [];
    const m = v.meldungen || {};
    const out = [];
    const nis = v.art === 'sicherheit' || v.art === 'beides';
    const dsg = v.art === 'datenpanne' || v.art === 'beides';
    if (nis) {
      out.push({ key: 'nis24', label: 'NIS2: Frühwarnung an das BSI', deadline: new Date(start.getTime() + 24 * HOUR), done: !!m.nis24 });
      out.push({ key: 'nis72', label: 'NIS2: Vorfallmeldung mit Erstbewertung', deadline: new Date(start.getTime() + 72 * HOUR), done: !!m.nis72 });
      const basis = m.nis72Zeit ? new Date(m.nis72Zeit) : new Date(start.getTime() + 72 * HOUR);
      const ab = new Date(basis);
      ab.setMonth(ab.getMonth() + 1);
      out.push({ key: 'nis30', label: 'NIS2: Abschlussbericht (1 Monat nach Vorfallmeldung)', deadline: ab, done: !!m.nis30 });
    }
    if (dsg) out.push({ key: 'dsgvo72', label: 'DSGVO: Meldung an die Datenschutzaufsicht (Art. 33)', deadline: new Date(start.getTime() + 72 * HOUR), done: !!m.dsgvo72 });
    return out;
  };

  App.countdown = function (deadline, done) {
    if (done) return { text: 'erledigt', cls: 'ok' };
    const diff = deadline.getTime() - Date.now();
    const abs = Math.abs(diff);
    const hrs = Math.floor(abs / HOUR);
    const days = Math.floor(hrs / 24);
    const txt = days >= 2 ? `${days} Tage` : `${hrs} Std. ${Math.floor((abs % HOUR) / 60000)} Min.`;
    if (diff < 0) return { text: `seit ${txt} überfällig`, cls: 'over' };
    return { text: `noch ${txt}`, cls: diff < 12 * HOUR ? 'soon' : 'ok' };
  };

  App.offeneFristen = function () {
    const out = [];
    for (const v of App.state.vorfaelle) {
      if (v.status === 'abgeschlossen') continue;
      for (const f of App.vorfallFristen(v)) if (!f.done) out.push({ v, f });
    }
    out.sort((a, b) => a.f.deadline - b.f.deadline);
    return out;
  };

  // Frist für Betroffenenanfragen: ein Monat, mit Verlängerung drei Monate (Art. 12 Abs. 3 DSGVO).
  App.anfrageFrist = (a) => (a.eingang ? App.addMonths(a.eingang, a.verlaengert ? 3 : 1) : '');
  App.anfrageOffen = (a) => a.status === 'Offen' || a.status === 'In Bearbeitung';

  // Sammelt alle Termine aus allen Bereichen für Kalender, Dashboard und .ics-Export.
  App.collectDeadlines = function () {
    const out = [];
    const today = App.todayIso();
    const push = (iso, titel, kat, view, extra) => {
      if (!iso) return;
      out.push(Object.assign({ datum: new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso), allDay: iso.length <= 10, titel, kat, view, overdue: iso.slice(0, 10) < today }, extra));
    };
    for (const fw of C.FRAMEWORKS) {
      for (const it of App.allItems(fw)) {
        const st = App.itemState(it.id);
        if (st.due && st.status !== 'erledigt' && st.status !== 'entfaellt') push(st.due, it.text, `Aufgabe · ${fw.name}`, fw.id, { item: it, fw });
        const rv = App.reviewDate(st);
        if (rv) push(rv, `Wiedervorlage: ${it.text}`, `Wiedervorlage · ${fw.name}`, fw.id, { item: it, fw });
      }
    }
    for (const { v, f } of App.offeneFristen()) {
      out.push({ datum: f.deadline, allDay: false, titel: `${f.label} – ${v.titel}`, kat: 'Meldefrist', view: 'vorfaelle', overdue: f.deadline < new Date() });
    }
    for (const a of App.state.anfragen) {
      if (App.anfrageOffen(a)) push(App.anfrageFrist(a), `Betroffenenanfrage beantworten: ${a.art}${a.referenz ? ' · ' + a.referenz : ''}`, 'Betroffenenanfrage', 'anfragen');
    }
    for (const d of App.state.dienstleister) push(d.pruefung, `Dienstleister prüfen: ${d.name}`, 'Dienstleister', 'dienstleister');
    for (const v of App.state.vvt) push(v.pruefung, `VVT überprüfen: ${v.name}`, 'Verarbeitungsverzeichnis', 'vvt');
    for (const s of App.state.schulungen) push(s.naechste, `Schulung wiederholen: ${s.thema}`, 'Schulung', 'schulungen');
    out.sort((a, b) => a.datum - b.datum);
    return out;
  };

  // ---------- Navigation und Rendering ----------

  App.registerView = (v) => App.views.push(v);

  App.go = function (view, opts) {
    if (!App.views.find((v) => v.id === view)) return;
    App.ui.view = view;
    if (opts && opts.keepScroll) App.render();
    else {
      App.render();
      document.getElementById('content').scrollTop = 0;
    }
  };

  function renderNav() {
    const nav = document.getElementById('nav');
    nav.textContent = '';
    for (const g of GROUPS) {
      const views = App.views.filter((v) => v.group === g);
      if (!views.length) continue;
      nav.appendChild(h('div', { class: 'nav-group', 'aria-hidden': 'true' }, g));
      for (const v of views) {
        const badge = v.badge ? v.badge() : null;
        nav.appendChild(h('button', {
          class: 'nav-item' + (App.ui.view === v.id ? ' active' : ''), type: 'button',
          'aria-current': App.ui.view === v.id ? 'page' : null,
          onclick: () => App.go(v.id)
        }, h('span', { class: 'nav-icon' }, v.icon), h('span', { class: 'nav-label' }, v.label), badge));
      }
    }
    document.getElementById('btn-lock').hidden = !App.vault.encrypted;
  }

  App.render = function () {
    if (App.ui.locked) return;
    renderNav();
    const view = App.views.find((v) => v.id === App.ui.view) || App.views[0];
    document.getElementById('view-title').textContent = view.titel;
    document.getElementById('view-sub').textContent = view.sub || '';
    const tb = document.getElementById('topbar-company');
    tb.textContent = '';
    const f = App.state.firma;
    if (f.name) {
      tb.appendChild(h('strong', null, f.name));
      if (f.branche) tb.appendChild(document.createTextNode(f.branche));
    } else tb.appendChild(document.createTextNode('Unternehmensprofil noch nicht ausgefüllt'));
    const el = document.getElementById('content');
    el.textContent = '';
    view.render(el);
  };

  App.badge = (text, cls) => h('span', { class: 'nav-badge' + (cls ? ' ' + cls : '') }, String(text));

  // ---------- Aktionen (Menü, Seitenleiste, Tastenkürzel) ----------

  App.actions.backup = async function () {
    try {
      const r = await api.exportData(App.state);
      if (r && r.exported) {
        App.log('Datensicherung erstellt', r.encrypted ? 'verschlüsselt' : 'unverschlüsselt', '');
        await App.persist();
        App.toast(r.encrypted ? 'Verschlüsselte Sicherung gespeichert' : 'Sicherung gespeichert (unverschlüsselt)');
      }
    } catch (err) { App.toast('Sicherung fehlgeschlagen: ' + App.cleanErr(err), true); }
  };

  async function applyImport(data) {
    App.confirmModal('Sicherung einspielen?', 'Die aktuellen Daten auf diesem Gerät werden durch den Inhalt der Datei ersetzt.', 'Einspielen', async () => {
      App.state = App.normalize(data);
      App.log('Datensicherung eingespielt', '', '');
      await App.persist();
      App.render();
      App.toast('Sicherung eingespielt');
    });
  }

  App.actions.restore = async function () {
    try {
      const r = await api.importData();
      if (!r) return;
      if (r.needsPassword) {
        App.openModal((modal, close) => {
          const pw = h('input', { type: 'password', autocomplete: 'off', 'data-autofocus': '', 'aria-label': 'Passwort der Sicherung' });
          const msg = h('p', { class: 'form-error' });
          const go = async () => {
            msg.textContent = '';
            try {
              const d = await api.importDecrypt(pw.value);
              if (d.imported) { close(); applyImport(d.data); }
              else msg.textContent = d.message || 'Passwort falsch.';
            } catch (err) { msg.textContent = App.cleanErr(err); }
          };
          pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
          modal.appendChild(h('h2', null, 'Verschlüsselte Sicherung'));
          modal.appendChild(h('p', { class: 'hint' }, 'Diese Sicherung ist passwortgeschützt. Geben Sie das Passwort ein, mit dem sie erstellt wurde.'));
          modal.appendChild(pw);
          modal.appendChild(msg);
          modal.appendChild(h('div', { class: 'modal-actions' },
            h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { api.importCancel(); close(); } }, 'Abbrechen'),
            h('button', { class: 'btn', type: 'button', onclick: go }, 'Entschlüsseln')));
        }, { sticky: true });
        return;
      }
      if (r.imported) applyImport(r.data);
    } catch (err) { App.toast('Import fehlgeschlagen: ' + App.cleanErr(err), true); }
  };

  const MENU_ACTIONS = ['backup', 'restore', 'report-pdf', 'report-html', 'ics', 'lock', 'search'];
  function onMenu(action) {
    if (typeof action !== 'string' || App.ui.locked) return;
    if (action.startsWith('goto:')) return App.go(action.slice(5));
    if (MENU_ACTIONS.includes(action) && typeof App.actions[action] === 'function') App.actions[action]();
  }

  // ---------- Start ----------

  App.afterUnlock = async function (data) {
    App.state = App.normalize(data);
    App.ui.locked = false;
    document.getElementById('lock-root').textContent = '';
    document.getElementById('app').hidden = false;
    const st = await api.vaultStatus();
    App.vault.encrypted = st.encrypted;
    App.render();
  };

  App.start = async function () {
    document.getElementById('btn-export').addEventListener('click', () => App.actions.backup());
    document.getElementById('btn-import').addEventListener('click', () => App.actions.restore());
    document.getElementById('btn-lock').addEventListener('click', () => App.actions.lock());
    document.getElementById('btn-search').addEventListener('click', () => App.actions.search());
    api.onMenu(onMenu);
    api.onLocked(() => App.actions.lockLocal && App.actions.lockLocal());
    try { App.info = await api.getInfo(); } catch (err) { App.info = null; }

    let res;
    try { res = await api.loadData(); } catch (err) {
      App.toast('Daten konnten nicht geladen werden: ' + App.cleanErr(err), true);
      res = { locked: false, data: App.emptyState() };
    }
    if (res.locked) {
      App.vault.encrypted = true;
      App.actions.showLock();
      return;
    }
    await App.afterUnlock(res.data);
    // Meldefristen laufen in Echtzeit: jede Minute auffrischen, nie bei offenem Dialog.
    setInterval(() => {
      if (!App.ui.locked && !document.getElementById('modal-root').firstChild && ['vorfaelle', 'dashboard', 'kalender'].includes(App.ui.view)) App.render();
    }, 60000);
  };
})();
