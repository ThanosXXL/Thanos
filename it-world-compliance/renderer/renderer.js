(function () {
  'use strict';

  const { STATUS, FRAMEWORKS, SEKTOREN, SONDERFAELLE } = window.CATALOG;

  const NIS2_FRIST_ERSTMELDUNG_H = 24;
  const NIS2_FRIST_MELDUNG_H = 72;
  const DSGVO_FRIST_H = 72;
  const HOUR = 3600 * 1000;

  const VIEWS = [
    { id: 'dashboard', label: 'Übersicht', icon: '🏠', titel: 'Übersicht', sub: 'Ihr aktueller Compliance-Stand auf einen Blick' },
    { id: 'nis2', label: 'NIS2', icon: '🛡️', fw: 'nis2' },
    { id: 'dsgvo', label: 'DSGVO', icon: '🔏', fw: 'dsgvo' },
    { id: 'itsec', label: 'IT-Sicherheit', icon: '🔐', fw: 'itsec' },
    { id: 'vorfaelle', label: 'Vorfälle & Fristen', icon: '🚨', titel: 'Vorfälle & Meldefristen', sub: 'Sicherheitsvorfälle und Datenpannen dokumentieren, Meldefristen automatisch berechnen' },
    { id: 'bericht', label: 'Bericht & Export', icon: '📄', titel: 'Bericht & Export', sub: 'Nachweismappe für Geschäftsleitung, Kunden, Versicherer und Auditoren' },
    { id: 'firma', label: 'Unternehmen', icon: '🏢', titel: 'Unternehmensprofil', sub: 'Stammdaten und Verantwortliche für Ihre Berichte' }
  ];

  let state = { firma: {}, nis2Check: {}, items: {}, vorfaelle: [] };
  const ui = { view: 'dashboard', filter: { nis2: 'alle', dsgvo: 'alle', itsec: 'alle' } };

  // ---------- Hilfsfunktionen ----------

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // Zentraler DOM-Helfer: alle Texte laufen über textContent, nie über innerHTML.
  function h(tag, attrs, ...children) {
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
  }

  function fmtDate(iso) {
    if (!iso) return '–';
    const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return '–';
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function fmtDateTime(ts) {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (isNaN(d)) return '–';
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  }

  function todayIso() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function toLocalInput(date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
  }

  function toast(msg, isError) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), isError ? 5000 : 2600);
  }

  async function persist() {
    try {
      await window.complianceAPI.saveData(state);
    } catch (err) {
      toast('Speichern fehlgeschlagen: ' + (err && err.message ? err.message : err), true);
    }
  }

  // ---------- Fachlogik ----------

  function itemState(id) {
    return state.items[id] || { status: 'offen' };
  }

  function allItems(fw) {
    return fw.gruppen.flatMap((g) => g.items);
  }

  function statusWeight(id) {
    const s = STATUS.find((x) => x.id === itemState(id).status);
    return s ? s.weight : 0;
  }

  function fwStats(fw) {
    const items = allItems(fw);
    let done = 0, open = 0, wip = 0, na = 0, score = 0, counted = 0;
    for (const it of items) {
      const st = itemState(it.id).status;
      if (st === 'erledigt') done++;
      else if (st === 'laeuft') wip++;
      else if (st === 'entfaellt') na++;
      else open++;
      const w = statusWeight(it.id);
      if (w !== null) {
        counted++;
        score += w;
      }
    }
    const pct = counted ? Math.round((score / counted) * 100) : 100;
    return { total: items.length, done, open, wip, na, pct };
  }

  function overallPct() {
    let score = 0, counted = 0;
    for (const fw of FRAMEWORKS) {
      for (const it of allItems(fw)) {
        const w = statusWeight(it.id);
        if (w !== null) {
          counted++;
          score += w;
        }
      }
    }
    return counted ? Math.round((score / counted) * 100) : 100;
  }

  function dueTasks() {
    const out = [];
    for (const fw of FRAMEWORKS) {
      for (const it of allItems(fw)) {
        const st = itemState(it.id);
        if (st.due && st.status !== 'erledigt' && st.status !== 'entfaellt') {
          out.push({ fw, it, st });
        }
      }
    }
    out.sort((a, b) => a.st.due.localeCompare(b.st.due));
    return out;
  }

  function isOverdue(st) {
    return !!st.due && st.status !== 'erledigt' && st.status !== 'entfaellt' && st.due < todayIso();
  }

  function overdueCount() {
    return dueTasks().filter((t) => isOverdue(t.st)).length;
  }

  function computeBetroffenheit(c) {
    const sektor = SEKTOREN.find((s) => s.id === c.sektor) || SEKTOREN[0];
    const ma = Number(c.mitarbeiter);
    const umsatz = Number(c.umsatz);
    const bilanz = Number(c.bilanz);
    if (!c.sektor || c.mitarbeiter === '' || c.mitarbeiter === undefined) return null;

    const hatUmsatz = c.umsatz !== '' && c.umsatz !== undefined;
    const hatBilanz = c.bilanz !== '' && c.bilanz !== undefined;
    // Größenklassen nach EU-KMU-Empfehlung 2003/361/EG (Mio. €)
    const gross = ma >= 250 || (hatUmsatz && hatBilanz && umsatz > 50 && bilanz > 43);
    const mittel = gross || ma >= 50 || (hatUmsatz && hatBilanz && umsatz > 10 && bilanz > 10);
    const groesse = gross ? 'groß' : mittel ? 'mittel' : 'klein/Kleinstunternehmen';

    if (c.sonderfall === 'groessenunabhaengig') {
      return {
        typ: 'wichtig',
        titel: 'Voraussichtlich betroffen (größenunabhängig)',
        text: 'Für DNS-Dienste, TLD-Registries, Vertrauensdienste und öffentliche Telekommunikation gelten die NIS2-Pflichten unabhängig von der Unternehmensgröße. Die Einstufung als „besonders wichtig“ oder „wichtig“ hängt vom Einzelfall ab und sollte rechtlich bestätigt werden.',
        groesse
      };
    }
    if (c.sonderfall === 'kritis') {
      return {
        typ: 'wesentlich',
        titel: 'Voraussichtlich besonders wichtige Einrichtung',
        text: 'Betreiber Kritischer Anlagen gelten grundsätzlich als besonders wichtige Einrichtungen und unterliegen zusätzlichen Anforderungen. Prüfen Sie zusätzlich die KRITIS-Vorgaben.',
        groesse
      };
    }
    if (sektor.gruppe === 'hoch' && gross) {
      return {
        typ: 'wesentlich',
        titel: 'Voraussichtlich besonders wichtige Einrichtung',
        text: `Sektor mit hoher Kritikalität und Größenklasse „${groesse}“: Es gelten die strengsten Pflichten inkl. Registrierung, Risikomanagement, Meldepflichten und regelmäßige Nachweise gegenüber dem BSI.`,
        groesse
      };
    }
    if ((sektor.gruppe === 'hoch' && mittel) || (sektor.gruppe === 'sonstig' && mittel)) {
      return {
        typ: 'wichtig',
        titel: 'Voraussichtlich wichtige Einrichtung',
        text: `Sektor „${sektor.label}“ und Größenklasse „${groesse}“: Die NIS2-Pflichten zu Risikomanagement, Registrierung und Meldung von Vorfällen gelten voraussichtlich auch für Sie.`,
        groesse
      };
    }
    return {
      typ: 'nein',
      titel: 'Voraussichtlich nicht direkt betroffen',
      text: sektor.gruppe === 'keiner'
        ? 'Ihr Sektor ist nicht in den Anhängen der NIS2-Richtlinie genannt. Als Zulieferer betroffener Unternehmen können Ihre Kunden dennoch Sicherheitsnachweise verlangen.'
        : `Als ${groesse} fallen Sie trotz relevantem Sektor voraussichtlich nicht direkt unter NIS2. Als Lieferant betroffener Unternehmen können Ihre Kunden dennoch Nachweise verlangen.`,
      groesse
    };
  }

  const BETROFFENHEIT_LABEL = { wesentlich: 'Besonders wichtige Einrichtung', wichtig: 'Wichtige Einrichtung', nein: 'Voraussichtlich nicht betroffen' };

  function vorfallFristen(v) {
    const start = new Date(v.kenntnis);
    if (isNaN(start)) return [];
    const out = [];
    const nis = v.art === 'sicherheit' || v.art === 'beides';
    const dsg = v.art === 'datenpanne' || v.art === 'beides';
    if (nis) {
      out.push({ key: 'nis24', label: 'NIS2: Frühwarnung an das BSI', deadline: new Date(start.getTime() + NIS2_FRIST_ERSTMELDUNG_H * HOUR), done: v.meldungen && v.meldungen.nis24 });
      out.push({ key: 'nis72', label: 'NIS2: Vorfallmeldung mit Erstbewertung', deadline: new Date(start.getTime() + NIS2_FRIST_MELDUNG_H * HOUR), done: v.meldungen && v.meldungen.nis72 });
      const abschlussBasis = v.meldungen && v.meldungen.nis72Zeit ? new Date(v.meldungen.nis72Zeit) : new Date(start.getTime() + NIS2_FRIST_MELDUNG_H * HOUR);
      const abschluss = new Date(abschlussBasis);
      abschluss.setMonth(abschluss.getMonth() + 1);
      out.push({ key: 'nis30', label: 'NIS2: Abschlussbericht (1 Monat nach Vorfallmeldung)', deadline: abschluss, done: v.meldungen && v.meldungen.nis30 });
    }
    if (dsg) {
      out.push({ key: 'dsgvo72', label: 'DSGVO: Meldung an die Datenschutzaufsicht (Art. 33)', deadline: new Date(start.getTime() + DSGVO_FRIST_H * HOUR), done: v.meldungen && v.meldungen.dsgvo72 });
    }
    return out;
  }

  function countdownInfo(deadline, done) {
    if (done) return { text: 'erledigt', cls: 'ok' };
    const diff = deadline.getTime() - Date.now();
    const abs = Math.abs(diff);
    const hrs = Math.floor(abs / HOUR);
    const days = Math.floor(hrs / 24);
    const txt = days >= 2 ? `${days} Tage` : `${hrs} Std. ${Math.floor((abs % HOUR) / 60000)} Min.`;
    if (diff < 0) return { text: `seit ${txt} überfällig`, cls: 'over' };
    return { text: `noch ${txt}`, cls: diff < 12 * HOUR ? 'soon' : 'ok' };
  }

  function offeneFristen() {
    const out = [];
    for (const v of state.vorfaelle) {
      if (v.status === 'abgeschlossen') continue;
      for (const f of vorfallFristen(v)) {
        if (!f.done) out.push({ v, f });
      }
    }
    out.sort((a, b) => a.f.deadline - b.f.deadline);
    return out;
  }

  // ---------- Wiederverwendbare Bausteine ----------

  function ring(pct, label) {
    const el = h('div', { class: 'ring', role: 'img', 'aria-label': `${label}: ${pct} Prozent` },
      h('div', { class: 'ring-inner' },
        h('div', { class: 'ring-pct' }, String(pct), h('small', null, '%')),
        h('div', { class: 'ring-lbl' }, label)));
    el.style.setProperty('--pct', String(pct));
    return el;
  }

  function tube(pct) {
    const fill = h('div', { class: 'tube-fill' });
    fill.style.width = pct + '%';
    return h('div', { class: 'tube', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' }, fill);
  }

  function statusPill(id) {
    const s = STATUS.find((x) => x.id === id) || STATUS[0];
    return h('span', { class: 'pill pill-' + s.id }, s.label);
  }

  function field(label, input, wide) {
    return h('label', { class: 'field' + (wide ? ' wide' : '') }, h('span', null, label), input);
  }

  function openModal(build) {
    const root = document.getElementById('modal-root');
    const close = () => {
      root.textContent = '';
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const modal = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
    build(modal, close);
    const backdrop = h('div', { class: 'modal-backdrop', onmousedown: (e) => { if (e.target === backdrop) close(); } }, modal);
    root.textContent = '';
    root.appendChild(backdrop);
    document.addEventListener('keydown', onKey);
    const first = modal.querySelector('select, input, textarea, button');
    if (first) first.focus();
  }

  function confirmModal(titel, text, okLabel, onOk) {
    openModal((modal, close) => {
      modal.appendChild(h('h2', null, titel));
      modal.appendChild(h('p', { class: 'hint' }, text));
      modal.appendChild(h('div', { class: 'modal-actions' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: close }, 'Abbrechen'),
        h('button', { class: 'btn btn-danger', type: 'button', onclick: () => { close(); onOk(); } }, okLabel)));
    });
  }

  // ---------- Dialog: Anforderung bearbeiten ----------

  function openItemModal(fw, it) {
    const cur = Object.assign({ status: 'offen', owner: '', due: '', note: '', evidence: '', file: '' }, state.items[it.id] || {});
    openModal((modal, close) => {
      const status = h('select', null, STATUS.map((s) => h('option', { value: s.id, selected: s.id === cur.status }, s.label)));
      const owner = h('input', { type: 'text', value: cur.owner, maxlength: '120', placeholder: 'Name oder Rolle' });
      const due = h('input', { type: 'date', value: cur.due });
      const evidence = h('textarea', { maxlength: '2000', placeholder: 'Welche Nachweise liegen vor? (Dokumentname, Ablageort, Datum)' });
      evidence.value = cur.evidence;
      const note = h('textarea', { maxlength: '4000', placeholder: 'Interne Notizen, Maßnahmen, offene Punkte' });
      note.value = cur.note;
      let file = cur.file;
      const fileName = h('span', { class: 'file-name', text: file || 'Keine Datei verknüpft' });
      const pickBtn = h('button', {
        class: 'btn btn-ghost btn-small', type: 'button',
        onclick: async () => {
          const r = await window.complianceAPI.pickEvidenceFile();
          if (r && r.picked) {
            file = r.filePath;
            fileName.textContent = file;
          }
        }
      }, 'Datei verknüpfen');
      const clearBtn = h('button', {
        class: 'btn btn-ghost btn-small', type: 'button',
        onclick: () => { file = ''; fileName.textContent = 'Keine Datei verknüpft'; }
      }, 'Entfernen');
      const showBtn = h('button', {
        class: 'btn btn-ghost btn-small', type: 'button',
        onclick: async () => {
          if (!file) return;
          const r = await window.complianceAPI.openEvidenceFile(file);
          if (!r || !r.opened) toast('Datei wurde nicht gefunden.', true);
        }
      }, 'Im Ordner zeigen');

      modal.appendChild(h('h2', null, it.text));
      modal.appendChild(h('p', { class: 'hint' }, [fw.name, ' · ', it.ref].join('')));
      modal.appendChild(h('div', { class: 'help-box' },
        h('strong', null, 'So gehen Sie vor: '), it.hilfe,
        h('br'), h('strong', null, 'Typische Nachweise: '), it.nachweise));
      modal.appendChild(h('div', { class: 'form-grid' },
        field('Status', status),
        field('Verantwortlich', owner),
        field('Fällig bis', due),
        field('Nachweis (Beschreibung)', evidence, true),
        h('div', { class: 'field wide' }, h('span', null, 'Nachweis-Datei (nur Verknüpfung, die Datei bleibt, wo sie ist)'),
          h('div', { class: 'file-row' }, pickBtn, showBtn, clearBtn, fileName)),
        field('Notizen', note, true)));
      modal.appendChild(h('div', { class: 'modal-actions' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: close }, 'Abbrechen'),
        h('button', {
          class: 'btn', type: 'button',
          onclick: async () => {
            state.items[it.id] = {
              status: status.value,
              owner: owner.value.trim(),
              due: due.value,
              evidence: evidence.value.trim(),
              note: note.value.trim(),
              file,
              updated: new Date().toISOString()
            };
            close();
            await persist();
            render();
            toast('Gespeichert');
          }
        }, 'Speichern')));
    });
  }

  // ---------- Ansicht: Übersicht ----------

  function renderDashboard(el) {
    const pct = overallPct();
    const bet = computeBetroffenheit(state.nis2Check);
    const overdue = overdueCount();
    const fristen = offeneFristen();
    const totalOpen = FRAMEWORKS.reduce((n, fw) => n + fwStats(fw).open + fwStats(fw).wip, 0);

    el.appendChild(h('div', { class: 'card' },
      h('div', { class: 'ring-wrap' },
        ring(pct, 'Gesamt'),
        h('div', { class: 'ring-meta', style: 'flex:1' },
          h('h3', null, pct >= 80 ? 'Sehr gut aufgestellt' : pct >= 40 ? 'Auf dem richtigen Weg' : 'Jetzt Grundlagen schaffen'),
          h('p', null, 'Gewichteter Erfüllungsgrad über NIS2, DSGVO und IT-Sicherheitsnachweise. „In Arbeit“ zählt zur Hälfte.'),
          tube(pct)))));

    el.appendChild(h('div', { class: 'grid grid-3', style: 'margin-bottom:22px' },
      FRAMEWORKS.map((fw) => {
        const s = fwStats(fw);
        return h('div', { class: 'card' },
          h('div', { class: 'ring-wrap' },
            ring(s.pct, fw.name),
            h('div', { class: 'ring-meta' },
              h('h3', null, fw.icon + ' ' + fw.name),
              h('p', null, `${s.done} von ${s.total} erledigt`),
              h('button', { class: 'btn btn-small', type: 'button', onclick: () => go(fw.id) }, 'Öffnen'))));
      })));

    el.appendChild(h('div', { class: 'grid grid-3', style: 'margin-bottom:22px' },
      h('div', { class: 'card stat' }, h('div', { class: 'stat-num' }, String(totalOpen)), h('div', { class: 'stat-lbl' }, 'Offene Anforderungen')),
      h('div', { class: 'card stat' + (overdue ? ' bad' : '') }, h('div', { class: 'stat-num' }, String(overdue)), h('div', { class: 'stat-lbl' }, 'Überfällige Aufgaben')),
      h('div', { class: 'card stat' + (fristen.some((x) => x.f.deadline < new Date()) ? ' bad' : '') }, h('div', { class: 'stat-num' }, String(fristen.length)), h('div', { class: 'stat-lbl' }, 'Offene Meldefristen'))));

    const due = dueTasks().slice(0, 6);
    el.appendChild(h('div', { class: 'grid grid-2' },
      h('div', { class: 'card' },
        h('h2', { class: 'card-title' }, 'Nächste Fälligkeiten'),
        h('p', { class: 'card-sub' }, 'Aufgaben mit Fälligkeitsdatum, älteste zuerst'),
        due.length
          ? due.map(({ fw, it, st }) => h('div', { class: 'list-row' },
              h('div', null, h('div', null, it.text), h('div', { class: 'sub' }, fw.name + (st.owner ? ' · ' + st.owner : ''))),
              h('div', { class: isOverdue(st) ? 'overdue' : '' }, fmtDate(st.due))))
          : h('div', { class: 'empty' }, 'Noch keine Fälligkeiten vergeben. Setzen Sie ein Datum direkt an der jeweiligen Anforderung.')),
      h('div', { class: 'card' },
        h('h2', { class: 'card-title' }, 'NIS2-Betroffenheit'),
        h('p', { class: 'card-sub' }, 'Ergebnis Ihres Betroffenheits-Checks'),
        bet
          ? h('div', null, h('div', { class: 'pill pill-hoch', style: 'margin-bottom:10px' }, BETROFFENHEIT_LABEL[bet.typ]), h('p', { style: 'margin:8px 0 14px;color:var(--muted)' }, bet.text))
          : h('div', { class: 'empty' }, 'Noch nicht geprüft. Der Check dauert unter einer Minute.'),
        h('button', { class: 'btn btn-small', type: 'button', onclick: () => go('nis2') }, bet ? 'Zum Check' : 'Check starten'))));

    if (!state.firma.name) {
      el.appendChild(h('div', { class: 'notice', style: 'margin-top:22px' },
        'Tipp: Hinterlegen Sie zuerst Ihr ',
        h('a', { href: '#', style: 'color:var(--gold-1)', onclick: (e) => { e.preventDefault(); go('firma'); } }, 'Unternehmensprofil'),
        ', damit Berichte Ihren Firmennamen tragen.'));
    }
  }

  // ---------- Ansicht: Anforderungen (NIS2 / DSGVO / IT-Sicherheit) ----------

  function renderFramework(el, fw) {
    const s = fwStats(fw);

    if (fw.id === 'nis2') renderBetroffenheit(el);

    el.appendChild(h('div', { class: 'card' },
      h('div', { class: 'ring-wrap' },
        ring(s.pct, fw.name),
        h('div', { class: 'ring-meta', style: 'flex:1' },
          h('h3', null, fw.titel),
          h('p', null, `${s.done} erledigt · ${s.wip} in Arbeit · ${s.open} offen · ${s.na} nicht zutreffend`),
          tube(s.pct)))));

    const filters = [{ id: 'alle', label: 'Alle' }, { id: 'offen', label: 'Offen' }, { id: 'laeuft', label: 'In Arbeit' }, { id: 'erledigt', label: 'Erledigt' }, { id: 'entfaellt', label: 'Nicht zutreffend' }];
    el.appendChild(h('div', { class: 'chips' }, filters.map((f) =>
      h('button', {
        class: 'chip' + (ui.filter[fw.id] === f.id ? ' active' : ''), type: 'button',
        onclick: () => { ui.filter[fw.id] = f.id; render(); }
      }, f.label))));

    let shown = 0;
    for (const g of fw.gruppen) {
      const items = g.items.filter((it) => ui.filter[fw.id] === 'alle' || itemState(it.id).status === ui.filter[fw.id]);
      if (!items.length) continue;
      shown += items.length;
      el.appendChild(h('div', { class: 'group-title' }, g.name));
      for (const it of items) el.appendChild(itemRow(fw, it));
    }
    if (!shown) el.appendChild(h('div', { class: 'empty' }, 'Keine Anforderungen in diesem Filter.'));
  }

  function itemRow(fw, it) {
    const st = itemState(it.id);
    const select = h('select', {
      'aria-label': 'Status', onclick: (e) => e.stopPropagation(),
      onchange: async (e) => {
        e.stopPropagation();
        state.items[it.id] = Object.assign({}, st, { status: select.value, updated: new Date().toISOString() });
        await persist();
        render();
      }
    }, STATUS.map((x) => h('option', { value: x.id, selected: x.id === st.status }, x.label)));

    return h('div', {
      class: 'item s-' + st.status, tabindex: '0', role: 'button', 'aria-label': it.text + ' bearbeiten',
      onclick: () => openItemModal(fw, it),
      onkeydown: (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openItemModal(fw, it); }
    },
      h('div', { class: 'item-main' },
        h('div', { class: 'item-text' }, it.text),
        h('div', { class: 'item-meta' },
          h('span', { class: 'pill pill-' + it.prio }, 'Priorität ' + it.prio),
          h('span', null, it.ref),
          st.owner ? h('span', null, '👤 ' + st.owner) : null,
          st.due ? h('span', { class: isOverdue(st) ? 'overdue' : '' }, '📅 ' + fmtDate(st.due) + (isOverdue(st) ? ' (überfällig)' : '')) : null,
          (st.evidence || st.file) ? h('span', null, '📎 Nachweis hinterlegt') : null)),
      h('div', { class: 'item-actions' }, select));
  }

  function renderBetroffenheit(el) {
    const c = state.nis2Check;
    const sektor = h('select', null,
      h('option', { value: '', selected: !c.sektor }, 'Bitte wählen …'),
      SEKTOREN.map((s) => h('option', { value: s.id, selected: s.id === c.sektor }, s.label)));
    const sonder = h('select', null, SONDERFAELLE.map((s) => h('option', { value: s.id, selected: s.id === (c.sonderfall || 'keiner') }, s.label)));
    const ma = h('input', { type: 'number', min: '0', step: '1', value: c.mitarbeiter ?? '', placeholder: 'z. B. 85' });
    const umsatz = h('input', { type: 'number', min: '0', step: '0.1', value: c.umsatz ?? '', placeholder: 'z. B. 12,5' });
    const bilanz = h('input', { type: 'number', min: '0', step: '0.1', value: c.bilanz ?? '', placeholder: 'z. B. 9' });

    const result = h('div');
    const draw = () => {
      result.textContent = '';
      const r = computeBetroffenheit({ sektor: sektor.value, sonderfall: sonder.value, mitarbeiter: ma.value, umsatz: umsatz.value, bilanz: bilanz.value });
      if (!r) {
        result.appendChild(h('div', { class: 'notice', style: 'margin-top:18px' }, 'Wählen Sie Sektor und Mitarbeiterzahl, um die Einstufung zu sehen.'));
        return;
      }
      result.appendChild(h('div', { class: 'result res-' + r.typ },
        h('h3', null, r.titel), h('p', null, r.text)));
    };
    const save = async () => {
      state.nis2Check = { sektor: sektor.value, sonderfall: sonder.value, mitarbeiter: ma.value, umsatz: umsatz.value, bilanz: bilanz.value, geprueft: new Date().toISOString() };
      await persist();
      draw();
    };
    [sektor, sonder, ma, umsatz, bilanz].forEach((x) => x.addEventListener('change', save));
    draw();

    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Betroffenheits-Check'),
      h('p', { class: 'card-sub' }, 'Fallen Sie unter die NIS2-Regelungen? Die Einstufung hängt von Sektor und Größe ab.'),
      h('div', { class: 'form-grid' },
        field('Tätigkeitssektor', sektor, true),
        field('Beschäftigte (Vollzeitäquivalente)', ma),
        field('Jahresumsatz (Mio. €)', umsatz),
        field('Jahresbilanzsumme (Mio. €)', bilanz),
        field('Besonderer Fall?', sonder, true)),
      result,
      h('p', { class: 'card-sub', style: 'margin-top:14px' },
        'Hinweis: Verbundene Unternehmen und Partnerunternehmen werden bei der Größenermittlung zusammengerechnet. Dieser Check ersetzt keine rechtliche Prüfung.')));
  }

  // ---------- Ansicht: Vorfälle & Fristen ----------

  const ART_LABEL = { sicherheit: 'Sicherheitsvorfall (NIS2)', datenpanne: 'Datenpanne (DSGVO)', beides: 'Sicherheitsvorfall mit Datenabfluss (NIS2 + DSGVO)' };
  const VSTATUS_LABEL = { offen: 'Offen', gemeldet: 'Gemeldet', abgeschlossen: 'Abgeschlossen' };

  function openVorfallModal(existing) {
    const cur = Object.assign({ titel: '', art: 'sicherheit', kenntnis: toLocalInput(new Date()), beschreibung: '', massnahmen: '', status: 'offen', meldungen: {} }, existing || {});
    openModal((modal, close) => {
      const titel = h('input', { type: 'text', maxlength: '160', value: cur.titel, placeholder: 'z. B. Phishing-Mail mit Zugangsdatenabfluss' });
      const art = h('select', null, Object.entries(ART_LABEL).map(([k, v]) => h('option', { value: k, selected: k === cur.art }, v)));
      const kenntnis = h('input', { type: 'datetime-local', value: cur.kenntnis });
      const status = h('select', null, Object.entries(VSTATUS_LABEL).map(([k, v]) => h('option', { value: k, selected: k === cur.status }, v)));
      const beschreibung = h('textarea', { maxlength: '4000', placeholder: 'Was ist passiert? Welche Systeme und Daten sind betroffen? Wie viele Personen?' });
      beschreibung.value = cur.beschreibung;
      const massnahmen = h('textarea', { maxlength: '4000', placeholder: 'Sofortmaßnahmen, Ursachenanalyse, Gegenmaßnahmen' });
      massnahmen.value = cur.massnahmen;

      const meldungen = Object.assign({}, cur.meldungen);
      const checks = h('div', { class: 'wide' });
      const drawChecks = () => {
        checks.textContent = '';
        const fr = vorfallFristen({ art: art.value, kenntnis: kenntnis.value, meldungen });
        if (!fr.length) {
          checks.appendChild(h('div', { class: 'notice' }, 'Bitte einen gültigen Zeitpunkt der Kenntnis angeben.'));
          return;
        }
        checks.appendChild(h('div', { class: 'help-box' }, h('strong', null, 'Berechnete Fristen')));
        for (const f of fr) {
          const cb = h('input', {
            type: 'checkbox', checked: !!meldungen[f.key],
            onchange: () => {
              meldungen[f.key] = cb.checked;
              if (f.key === 'nis72') meldungen.nis72Zeit = cb.checked ? new Date().toISOString() : '';
              drawChecks();
            }
          });
          const ci = countdownInfo(f.deadline, meldungen[f.key]);
          checks.appendChild(h('div', { class: 'list-row' },
            h('label', { style: 'display:flex;gap:10px;align-items:center;cursor:pointer' }, cb,
              h('div', null, h('div', null, f.label), h('div', { class: 'sub' }, 'Frist: ' + fmtDateTime(f.deadline)))),
            h('span', { class: 'countdown ' + ci.cls }, ci.text)));
        }
      };
      art.addEventListener('change', drawChecks);
      kenntnis.addEventListener('change', drawChecks);
      drawChecks();

      modal.appendChild(h('h2', null, existing ? 'Vorfall bearbeiten' : 'Neuen Vorfall erfassen'));
      modal.appendChild(h('p', { class: 'hint' }, 'Die Frist beginnt mit dem Zeitpunkt, zu dem Sie vom Vorfall Kenntnis erlangt haben.'));
      modal.appendChild(h('div', { class: 'form-grid' },
        field('Titel', titel, true), field('Art des Vorfalls', art), field('Zeitpunkt der Kenntnis', kenntnis),
        field('Bearbeitungsstatus', status), checks,
        field('Beschreibung', beschreibung, true), field('Maßnahmen', massnahmen, true)));
      modal.appendChild(h('div', { class: 'modal-actions' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: close }, 'Abbrechen'),
        h('button', {
          class: 'btn', type: 'button',
          onclick: async () => {
            if (!titel.value.trim()) { toast('Bitte einen Titel angeben.', true); return; }
            if (isNaN(new Date(kenntnis.value))) { toast('Bitte einen gültigen Zeitpunkt angeben.', true); return; }
            const rec = {
              id: existing ? existing.id : uid(),
              titel: titel.value.trim(), art: art.value, kenntnis: kenntnis.value, status: status.value,
              beschreibung: beschreibung.value.trim(), massnahmen: massnahmen.value.trim(), meldungen
            };
            if (existing) state.vorfaelle = state.vorfaelle.map((v) => (v.id === existing.id ? rec : v));
            else state.vorfaelle.unshift(rec);
            close();
            await persist();
            render();
            toast('Vorfall gespeichert');
          }
        }, 'Speichern')));
    });
  }

  function renderVorfaelle(el) {
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Meldefristen im Überblick'),
      h('div', { class: 'grid grid-3', style: 'margin-top:12px' },
        [['24 Std.', 'NIS2: Frühwarnung an das BSI'], ['72 Std.', 'NIS2: Vorfallmeldung · DSGVO: Meldung an die Aufsicht'], ['1 Monat', 'NIS2: Abschlussbericht']].map(([n, l]) =>
          h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, n), h('div', { class: 'stat-lbl' }, l)))),
      h('div', { class: 'btn-row', style: 'margin-top:18px' },
        h('button', { class: 'btn', type: 'button', onclick: () => openVorfallModal(null) }, '＋ Vorfall erfassen'))));

    if (!state.vorfaelle.length) {
      el.appendChild(h('div', { class: 'card' }, h('div', { class: 'empty' }, 'Noch keine Vorfälle erfasst. Auch Datenpannen, die nicht gemeldet werden müssen, sollten Sie dokumentieren.')));
      return;
    }

    for (const v of state.vorfaelle) {
      const fr = vorfallFristen(v);
      el.appendChild(h('div', { class: 'card' },
        h('div', { style: 'display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-start' },
          h('div', null,
            h('h2', { class: 'card-title' }, v.titel),
            h('p', { class: 'card-sub', style: 'margin:0' }, `${ART_LABEL[v.art] || v.art} · Kenntnis: ${fmtDateTime(new Date(v.kenntnis))}`)),
          h('span', { class: 'pill pill-' + (v.status === 'abgeschlossen' ? 'erledigt' : v.status === 'gemeldet' ? 'laeuft' : 'offen') }, VSTATUS_LABEL[v.status] || v.status)),
        v.beschreibung ? h('p', { style: 'margin:12px 0 0' }, v.beschreibung) : null,
        h('div', { style: 'margin-top:10px' }, fr.map((f) => {
          const ci = countdownInfo(f.deadline, f.done);
          return h('div', { class: 'list-row' },
            h('div', null, h('div', null, f.label), h('div', { class: 'sub' }, 'Frist: ' + fmtDateTime(f.deadline))),
            h('span', { class: 'countdown ' + ci.cls }, ci.text));
        })),
        h('div', { class: 'btn-row', style: 'margin-top:14px' },
          h('button', { class: 'btn btn-ghost btn-small', type: 'button', onclick: () => openVorfallModal(v) }, 'Bearbeiten'),
          h('button', {
            class: 'btn btn-danger btn-small', type: 'button',
            onclick: () => confirmModal('Vorfall löschen?', `„${v.titel}“ wird unwiderruflich aus der Dokumentation entfernt.`, 'Löschen', async () => {
              state.vorfaelle = state.vorfaelle.filter((x) => x.id !== v.id);
              await persist();
              render();
            })
          }, 'Löschen'))));
    }
  }

  // ---------- Ansicht: Unternehmen ----------

  function renderFirma(el) {
    const f = state.firma;
    const defs = [
      ['name', 'Firmenname', 'text', true],
      ['branche', 'Branche', 'text'],
      ['adresse', 'Anschrift', 'text', true],
      ['geschaeftsfuehrung', 'Geschäftsleitung', 'text'],
      ['itleitung', 'IT-/Informationssicherheits-Verantwortliche/r', 'text'],
      ['dsb', 'Datenschutzbeauftragte/r', 'text'],
      ['email', 'Kontakt E-Mail', 'email'],
      ['telefon', 'Notfall-Rufnummer (24/7)', 'text']
    ];
    const inputs = {};
    const grid = h('div', { class: 'form-grid' });
    for (const [key, label, type, wide] of defs) {
      inputs[key] = h('input', { type, value: f[key] || '', maxlength: '200' });
      grid.appendChild(field(label, inputs[key], wide));
    }
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Stammdaten'),
      h('p', { class: 'card-sub' }, 'Diese Angaben erscheinen auf dem Deckblatt Ihres Compliance-Berichts.'),
      grid,
      h('div', { class: 'btn-row', style: 'margin-top:20px' },
        h('button', {
          class: 'btn', type: 'button',
          onclick: async () => {
            state.firma = {};
            for (const [key] of defs) state.firma[key] = inputs[key].value.trim();
            await persist();
            render();
            toast('Unternehmensprofil gespeichert');
          }
        }, 'Speichern'))));

    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Datenschutz dieser Anwendung'),
      h('p', { class: 'card-sub', style: 'margin:0' },
        'Der Compliance-Assistent arbeitet vollständig offline. Es werden keine Daten übertragen, keine Telemetrie erhoben und keine Konten benötigt. Alle Eingaben liegen verschlüsselungsfähig in einer lokalen Datei nur für Ihren Benutzer lesbar. Nachweisdateien werden nur verknüpft, nicht kopiert.')));

    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Alle Daten löschen'),
      h('p', { class: 'card-sub' }, 'Entfernt Unternehmensprofil, Bearbeitungsstände, Nachweise und Vorfälle von diesem Gerät.'),
      h('button', {
        class: 'btn btn-danger btn-small', type: 'button',
        onclick: () => confirmModal('Wirklich alle Daten löschen?', 'Sichern Sie vorher Ihre Daten. Dieser Schritt kann nicht rückgängig gemacht werden.', 'Alles löschen', async () => {
          state = { firma: {}, nis2Check: {}, items: {}, vorfaelle: [] };
          await persist();
          go('dashboard');
          toast('Alle Daten wurden gelöscht');
        })
      }, 'Alle Daten löschen')));
  }

  // ---------- Bericht ----------

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function buildReportHtml(logo) {
    const f = state.firma;
    const pct = overallPct();
    const bet = computeBetroffenheit(state.nis2Check);
    const now = new Date();
    const sName = (id) => (STATUS.find((s) => s.id === id) || STATUS[0]).label;

    let body = '';
    for (const fw of FRAMEWORKS) {
      const s = fwStats(fw);
      body += `<section><h2>${esc(fw.titel)} <span class="score">${s.pct}%</span></h2>
        <p class="meta">${s.done} erledigt · ${s.wip} in Arbeit · ${s.open} offen · ${s.na} nicht zutreffend</p>`;
      for (const g of fw.gruppen) {
        body += `<h3>${esc(g.name)}</h3><table><thead><tr><th>Anforderung</th><th>Status</th><th>Verantwortlich</th><th>Fällig</th><th>Nachweis</th></tr></thead><tbody>`;
        for (const it of g.items) {
          const st = itemState(it.id);
          const ev = [st.evidence, st.file ? 'Datei: ' + st.file : '', st.note ? 'Notiz: ' + st.note : ''].filter(Boolean).join(' | ');
          body += `<tr class="s-${esc(st.status)}"><td><strong>${esc(it.text)}</strong><br><span class="ref">${esc(it.ref)}</span></td>
            <td>${esc(sName(st.status))}</td><td>${esc(st.owner || '–')}</td><td>${esc(fmtDate(st.due))}</td><td>${esc(ev || '–')}</td></tr>`;
        }
        body += '</tbody></table>';
      }
      body += '</section>';
    }

    let vf = '';
    if (state.vorfaelle.length) {
      vf = '<section><h2>Vorfälle und Datenpannen</h2><table><thead><tr><th>Vorfall</th><th>Art</th><th>Kenntnis</th><th>Status</th><th>Maßnahmen</th></tr></thead><tbody>';
      for (const v of state.vorfaelle) {
        vf += `<tr><td><strong>${esc(v.titel)}</strong><br>${esc(v.beschreibung)}</td><td>${esc(ART_LABEL[v.art] || v.art)}</td>
          <td>${esc(fmtDateTime(new Date(v.kenntnis)))}</td><td>${esc(VSTATUS_LABEL[v.status] || v.status)}</td><td>${esc(v.massnahmen || '–')}</td></tr>`;
      }
      vf += '</tbody></table></section>';
    }

    return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">
<title>Compliance-Bericht ${esc(f.name || '')}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Open Sans','Segoe UI',Arial,sans-serif;color:#2b2112;margin:0;background:#fff;font-size:12.5px;line-height:1.5}
  .cover{background:#050403;color:#f3e6c8;text-align:center;padding:36px 30px 30px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cover img{width:230px;height:auto}
  .cover h1{margin:6px 0 4px;font-size:28px;color:#f0cc66;letter-spacing:.5px}
  .cover p{margin:2px 0;color:#d8c79c}
  .wrap{padding:22px 30px}
  .overall{display:flex;gap:18px;align-items:center;margin:4px 0 18px}
  .big{font-size:44px;font-weight:700;color:#a67820}
  .score{float:right;color:#a67820}
  h2{font-size:18px;margin:22px 0 4px;border-bottom:2px solid #d9a93e;padding-bottom:4px;color:#3d2a0a;page-break-after:avoid}
  h3{font-size:12px;text-transform:uppercase;letter-spacing:1.4px;color:#8c6218;margin:14px 0 6px;page-break-after:avoid}
  table{width:100%;border-collapse:collapse;margin-bottom:6px}
  th{background:#f4e6bd;text-align:left;font-size:11px;padding:5px 7px;border:1px solid #d9c48a}
  td{vertical-align:top;padding:5px 7px;border:1px solid #e3d6ae}
  tr{page-break-inside:avoid}
  .ref{color:#8b7b55;font-size:10.5px}
  .meta{color:#6e5f3d;margin:0 0 6px}
  tr.s-erledigt td:nth-child(2){color:#2f7a2b;font-weight:700}
  tr.s-offen td:nth-child(2){color:#b03520;font-weight:700}
  tr.s-laeuft td:nth-child(2){color:#a06a00;font-weight:700}
  .box{border:1px solid #d9c48a;background:#fbf4de;padding:10px 14px;border-radius:6px}
  .foot{margin-top:26px;padding-top:8px;border-top:1px solid #d9c48a;color:#6e5f3d;font-size:11px}
</style></head><body>
<div class="cover">
  ${logo ? `<img src="${esc(logo)}" alt="IT-WORLD">` : ''}
  <h1>Compliance-Bericht</h1>
  <p>NIS2 · DSGVO · IT-Sicherheitsnachweise</p>
  <p><strong>${esc(f.name || 'Unternehmen')}</strong>${f.branche ? ' · ' + esc(f.branche) : ''}</p>
  <p>Stand: ${esc(fmtDateTime(now))}</p>
</div>
<div class="wrap">
  <div class="overall"><div class="big">${pct}%</div><div><strong>Gesamter Erfüllungsgrad</strong><br>„In Arbeit“ zählt zur Hälfte, „nicht zutreffend“ bleibt unberücksichtigt.</div></div>
  <div class="box">
    <strong>Stammdaten</strong><br>
    Geschäftsleitung: ${esc(f.geschaeftsfuehrung || '–')} · IT-/Informationssicherheit: ${esc(f.itleitung || '–')} · Datenschutz: ${esc(f.dsb || '–')}<br>
    Anschrift: ${esc(f.adresse || '–')} · E-Mail: ${esc(f.email || '–')} · Notfall-Rufnummer: ${esc(f.telefon || '–')}
    ${bet ? `<br><strong>NIS2-Einstufung:</strong> ${esc(BETROFFENHEIT_LABEL[bet.typ])} (Größenklasse: ${esc(bet.groesse)})` : ''}
  </div>
  ${body}
  ${vf}
  <div class="foot">Erstellt mit dem IT-WORLD Compliance-Assistenten. Dieser Bericht dient der Dokumentation und Orientierung und ersetzt keine Rechtsberatung oder Zertifizierung.</div>
</div></body></html>`;
  }

  function renderBericht(el) {
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Compliance-Bericht erstellen'),
      h('p', { class: 'card-sub' }, 'Alle Anforderungen mit Status, Verantwortlichen, Fristen und Nachweisen, ergänzt um Ihre Vorfälle. Als PDF zum Weitergeben oder als HTML-Datei.'),
      h('div', { class: 'btn-row' },
        h('button', {
          class: 'btn', type: 'button',
          onclick: async () => {
            try {
              const logo = await window.complianceAPI.getLogo();
              const r = await window.complianceAPI.exportReportPdf(buildReportHtml(logo));
              if (r && r.exported) toast('PDF gespeichert');
            } catch (err) { toast('Export fehlgeschlagen: ' + err.message, true); }
          }
        }, '📄 Als PDF speichern'),
        h('button', {
          class: 'btn btn-ghost', type: 'button',
          onclick: async () => {
            try {
              const logo = await window.complianceAPI.getLogo();
              const r = await window.complianceAPI.exportReportHtml(buildReportHtml(logo));
              if (r && r.exported) toast('HTML-Bericht gespeichert');
            } catch (err) { toast('Export fehlgeschlagen: ' + err.message, true); }
          }
        }, 'Als HTML speichern'))));

    el.appendChild(h('div', { class: 'grid grid-3' }, FRAMEWORKS.map((fw) => {
      const s = fwStats(fw);
      return h('div', { class: 'card' },
        h('h2', { class: 'card-title' }, fw.icon + ' ' + fw.name),
        h('p', { class: 'card-sub' }, `${s.done} / ${s.total} erledigt`),
        tube(s.pct));
    })));

    el.appendChild(h('div', { class: 'card', style: 'margin-top:22px' },
      h('h2', { class: 'card-title' }, 'Datensicherung'),
      h('p', { class: 'card-sub' }, 'Sichern Sie alle Eingaben als JSON-Datei oder spielen Sie eine frühere Sicherung zurück, z. B. beim Gerätewechsel.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: doExport }, 'Daten sichern'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: doImport }, 'Sicherung laden'))));
  }

  async function doExport() {
    try {
      const r = await window.complianceAPI.exportData(state);
      if (r && r.exported) toast('Sicherung gespeichert');
    } catch (err) { toast('Sicherung fehlgeschlagen: ' + err.message, true); }
  }

  async function doImport() {
    try {
      const r = await window.complianceAPI.importData();
      if (!r || !r.imported) return;
      confirmModal('Sicherung einspielen?', 'Die aktuellen Daten auf diesem Gerät werden durch den Inhalt der Datei ersetzt.', 'Einspielen', async () => {
        state = normalize(r.data);
        await persist();
        render();
        toast('Sicherung eingespielt');
      });
    } catch (err) { toast('Import fehlgeschlagen: ' + err.message, true); }
  }

  // ---------- Navigation / Rendering ----------

  function go(view) {
    ui.view = view;
    render();
    document.getElementById('content').scrollTop = 0;
  }

  function renderNav() {
    const nav = document.getElementById('nav');
    nav.textContent = '';
    for (const v of VIEWS) {
      let badge = null;
      if (v.id === 'vorfaelle') {
        const n = offeneFristen().length;
        if (n) badge = h('span', { class: 'nav-badge' }, String(n));
      } else if (v.fw) {
        const s = fwStats(FRAMEWORKS.find((f) => f.id === v.fw));
        badge = h('span', { class: 'nav-badge', style: 'background:linear-gradient(180deg,#3a2c12,#17100a);color:var(--gold-1);box-shadow:inset 0 1px 0 rgba(255,235,170,.3)' }, s.pct + '%');
      }
      nav.appendChild(h('button', {
        class: 'nav-item' + (ui.view === v.id ? ' active' : ''), type: 'button',
        'aria-current': ui.view === v.id ? 'page' : null,
        onclick: () => go(v.id)
      }, h('span', { class: 'nav-icon' }, v.icon), h('span', { class: 'nav-label' }, v.label), badge));
    }
  }

  function render() {
    renderNav();
    const view = VIEWS.find((v) => v.id === ui.view) || VIEWS[0];
    const fw = view.fw ? FRAMEWORKS.find((f) => f.id === view.fw) : null;
    document.getElementById('view-title').textContent = fw ? fw.titel : view.titel;
    document.getElementById('view-sub').textContent = fw ? fw.untertitel : view.sub;

    const tb = document.getElementById('topbar-company');
    tb.textContent = '';
    if (state.firma.name) {
      tb.appendChild(h('strong', null, state.firma.name));
      if (state.firma.branche) tb.appendChild(document.createTextNode(state.firma.branche));
    } else {
      tb.appendChild(document.createTextNode('Unternehmensprofil noch nicht ausgefüllt'));
    }

    const el = document.getElementById('content');
    el.textContent = '';
    if (fw) renderFramework(el, fw);
    else if (view.id === 'dashboard') renderDashboard(el);
    else if (view.id === 'vorfaelle') renderVorfaelle(el);
    else if (view.id === 'bericht') renderBericht(el);
    else if (view.id === 'firma') renderFirma(el);
  }

  // Ältere/fremde Datensätze auf die aktuelle Form bringen (neue Felder
  // hier ergänzen, damit bestehende Dateien weiter laden).
  function normalize(d) {
    const s = d && typeof d === 'object' ? d : {};
    return {
      firma: s.firma && typeof s.firma === 'object' ? s.firma : {},
      nis2Check: s.nis2Check && typeof s.nis2Check === 'object' ? s.nis2Check : {},
      items: s.items && typeof s.items === 'object' && !Array.isArray(s.items) ? s.items : {},
      vorfaelle: Array.isArray(s.vorfaelle) ? s.vorfaelle.map((v) => Object.assign({ meldungen: {}, status: 'offen' }, v)) : []
    };
  }

  async function init() {
    document.getElementById('btn-export').addEventListener('click', doExport);
    document.getElementById('btn-import').addEventListener('click', doImport);
    try {
      state = normalize(await window.complianceAPI.loadData());
    } catch (err) {
      toast('Daten konnten nicht geladen werden.', true);
    }
    render();
    // Meldefristen laufen in Echtzeit: Anzeige jede Minute auffrischen,
    // aber nie, solange ein Dialog offen ist (sonst gehen Eingaben verloren).
    setInterval(() => {
      if (!document.getElementById('modal-root').firstChild && (ui.view === 'vorfaelle' || ui.view === 'dashboard')) render();
    }, 60000);
  }

  init();
})();
