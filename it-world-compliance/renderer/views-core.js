// Ansichten: Übersicht, Regelwerke (NIS2 / DSGVO / IT-Sicherheit), Vorfälle, Unternehmen.
(function () {
  'use strict';
  const App = window.App;
  const { h, C, field } = App;

  // ---------- Bausteine ----------

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
  App.ring = ring;
  App.tube = tube;
  App.statusPill = (id) => h('span', { class: 'pill pill-' + id }, App.statusLabel(id));

  // ---------- Dialog: Anforderung bearbeiten ----------

  App.openItemModal = function (fw, it) {
    const cur = Object.assign({ status: 'offen', owner: '', due: '', note: '', evidence: '', file: '', intervall: '', geprueft: '' }, App.state.items[it.id] || {});
    App.openModal((modal, close) => {
      const status = h('select', null, C.STATUS.map((s) => h('option', { value: s.id, selected: s.id === cur.status }, s.label)));
      const owner = h('input', { type: 'text', value: cur.owner, maxlength: '120', placeholder: 'Name oder Rolle' });
      const due = h('input', { type: 'date', value: cur.due });
      const intervall = h('select', null, C.INTERVALLE.map((i) => h('option', { value: i.id, selected: i.id === cur.intervall }, i.label)));
      const evidence = h('textarea', { maxlength: '2000', placeholder: 'Welche Nachweise liegen vor? (Dokumentname, Ablageort, Datum)' });
      evidence.value = cur.evidence;
      const note = h('textarea', { maxlength: '4000', placeholder: 'Interne Notizen, Maßnahmen, offene Punkte' });
      note.value = cur.note;
      let file = cur.file;
      const fileName = h('span', { class: 'file-name', text: file || 'Keine Datei verknüpft' });
      const pickBtn = h('button', {
        class: 'btn btn-ghost btn-small', type: 'button',
        onclick: async () => {
          const r = await App.api.pickEvidenceFile();
          if (r && r.picked) { file = r.filePath; fileName.textContent = file; }
        }
      }, 'Datei verknüpfen');
      const clearBtn = h('button', { class: 'btn btn-ghost btn-small', type: 'button', onclick: () => { file = ''; fileName.textContent = 'Keine Datei verknüpft'; } }, 'Entfernen');
      const showBtn = h('button', {
        class: 'btn btn-ghost btn-small', type: 'button',
        onclick: async () => {
          if (!file) return;
          const r = await App.api.openEvidenceFile(file);
          if (!r || !r.opened) App.toast(r && r.reason === 'network-path' ? 'Netzwerkpfade werden aus Sicherheitsgründen nicht geöffnet.' : 'Datei wurde nicht gefunden.', true);
        }
      }, 'Im Ordner zeigen');

      modal.appendChild(h('h2', null, it.text));
      modal.appendChild(h('p', { class: 'hint' }, `${fw.name} · ${it.ref}`));
      modal.appendChild(h('div', { class: 'help-box' },
        h('strong', null, 'So gehen Sie vor: '), it.hilfe, h('br'), h('strong', null, 'Typische Nachweise: '), it.nachweise));
      modal.appendChild(h('div', { class: 'form-grid' },
        field('Status', status), field('Verantwortlich', owner),
        field('Fällig bis', due), field('Wiedervorlage nach Erledigung', intervall),
        field('Nachweis (Beschreibung)', evidence, true),
        h('div', { class: 'field wide' }, h('span', null, 'Nachweis-Datei (nur Verknüpfung, die Datei bleibt, wo sie ist)'),
          h('div', { class: 'file-row' }, pickBtn, showBtn, clearBtn, fileName)),
        field('Notizen', note, true)));
      if (cur.geprueft) modal.appendChild(h('p', { class: 'hint', style: 'margin:14px 0 0' }, `Zuletzt als erledigt bestätigt: ${App.fmtDate(cur.geprueft)}`));
      modal.appendChild(h('div', { class: 'modal-actions' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: close }, 'Abbrechen'),
        h('button', {
          class: 'btn', type: 'button',
          onclick: async () => {
            close();
            await App.setItem(fw, it, {
              status: status.value, owner: owner.value.trim(), due: due.value, intervall: intervall.value,
              evidence: evidence.value.trim(), note: note.value.trim(), file
            });
            App.toast('Gespeichert');
          }
        }, 'Speichern')));
    });
  };

  // ---------- Übersicht ----------

  function renderDashboard(el) {
    const pct = App.overallPct();
    const bet = App.betroffenheit(App.state.nis2Check);
    const eq = App.evidenceQuote();
    const dl = App.collectDeadlines();
    const overdue = dl.filter((d) => d.overdue).length;
    const fristen = App.offeneFristen();
    const totalOpen = C.FRAMEWORKS.reduce((n, fw) => { const s = App.fwStats(fw); return n + s.open + s.wip; }, 0);

    el.appendChild(h('div', { class: 'card' },
      h('div', { class: 'ring-wrap' }, ring(pct, 'Gesamt'),
        h('div', { class: 'ring-meta', style: 'flex:1' },
          h('h3', null, pct >= 80 ? 'Sehr gut aufgestellt' : pct >= 40 ? 'Auf dem richtigen Weg' : 'Jetzt Grundlagen schaffen'),
          h('p', null, 'Gewichteter Erfüllungsgrad über NIS2, DSGVO und IT-Sicherheitsnachweise. „In Arbeit“ zählt zur Hälfte.'),
          tube(pct)))));

    el.appendChild(h('div', { class: 'grid grid-3', style: 'margin-bottom:22px' }, C.FRAMEWORKS.map((fw) => {
      const s = App.fwStats(fw);
      return h('div', { class: 'card' }, h('div', { class: 'ring-wrap' }, ring(s.pct, fw.name),
        h('div', { class: 'ring-meta' }, h('h3', null, fw.icon + ' ' + fw.name), h('p', null, `${s.done} von ${s.total} erledigt`),
          h('button', { class: 'btn btn-small', type: 'button', onclick: () => App.go(fw.id) }, 'Öffnen'))));
    })));

    el.appendChild(h('div', { class: 'grid grid-4', style: 'margin-bottom:22px' },
      h('div', { class: 'card stat' }, h('div', { class: 'stat-num' }, String(totalOpen)), h('div', { class: 'stat-lbl' }, 'Offene Anforderungen')),
      h('div', { class: 'card stat' + (overdue ? ' bad' : '') }, h('div', { class: 'stat-num' }, String(overdue)), h('div', { class: 'stat-lbl' }, 'Überfällige Termine')),
      h('div', { class: 'card stat' + (fristen.some((x) => x.f.deadline < new Date()) ? ' bad' : '') }, h('div', { class: 'stat-num' }, String(fristen.length)), h('div', { class: 'stat-lbl' }, 'Offene Meldefristen')),
      h('div', { class: 'card stat' }, h('div', { class: 'stat-num' }, eq.pct + '%'), h('div', { class: 'stat-lbl' }, 'Nachweisquote'))));

    const steps = App.nextSteps(5);
    const upcoming = dl.slice(0, 6);
    el.appendChild(h('div', { class: 'grid grid-2', style: 'margin-bottom:22px' },
      h('div', { class: 'card' },
        h('h2', { class: 'card-title' }, 'Nächste Schritte'),
        h('p', { class: 'card-sub' }, 'Offene Anforderungen mit hoher Priorität'),
        steps.length
          ? steps.map(({ fw, it, st }) => h('div', { class: 'list-row clickable', tabindex: '0', role: 'button', onclick: () => App.openItemModal(fw, it), onkeydown: (e) => { if (e.key === 'Enter') App.openItemModal(fw, it); } },
              h('div', null, h('div', null, it.text), h('div', { class: 'sub' }, `${fw.name} · ${it.ref}`)), App.statusPill(st.status)))
          : h('div', { class: 'empty' }, 'Alle Anforderungen mit hoher Priorität sind erledigt. Stark!')),
      h('div', { class: 'card' },
        h('h2', { class: 'card-title' }, 'Nächste Termine'),
        h('p', { class: 'card-sub' }, 'Aufgaben, Wiedervorlagen, Meldefristen und Prüfungen'),
        upcoming.length
          ? upcoming.map((d) => h('div', { class: 'list-row clickable', tabindex: '0', role: 'button', onclick: () => App.go(d.view), onkeydown: (e) => { if (e.key === 'Enter') App.go(d.view); } },
              h('div', null, h('div', null, d.titel), h('div', { class: 'sub' }, d.kat)),
              h('div', { class: d.overdue ? 'overdue' : '' }, d.allDay ? App.fmtDate(App.toIso(d.datum)) : App.fmtDateTime(d.datum))))
          : h('div', { class: 'empty' }, 'Noch keine Termine. Vergeben Sie Fälligkeiten an Anforderungen oder erfassen Sie Register-Einträge.'),
        h('div', { class: 'btn-row', style: 'margin-top:12px' }, h('button', { class: 'btn btn-ghost btn-small', type: 'button', onclick: () => App.go('kalender') }, 'Zum Fristenkalender')))));

    el.appendChild(h('div', { class: 'grid grid-2' },
      h('div', { class: 'card' },
        h('h2', { class: 'card-title' }, 'NIS2-Betroffenheit'),
        h('p', { class: 'card-sub' }, 'Ergebnis Ihres Betroffenheits-Checks'),
        bet
          ? h('div', null, h('div', { class: 'pill pill-hoch', style: 'margin-bottom:10px' }, App.BETROFFENHEIT_LABEL[bet.typ]), h('p', { style: 'margin:8px 0 14px;color:var(--muted)' }, bet.text))
          : h('div', { class: 'empty' }, 'Noch nicht geprüft. Der Check dauert unter einer Minute.'),
        h('button', { class: 'btn btn-small', type: 'button', onclick: () => App.go('nis2') }, bet ? 'Zum Check' : 'Check starten')),
      h('div', { class: 'card' },
        h('h2', { class: 'card-title' }, 'Schutz Ihrer Daten'),
        h('p', { class: 'card-sub' }, App.vault.encrypted ? 'Die Datenablage ist mit Ihrem Passwort verschlüsselt (AES-256).' : 'Die Datenablage ist noch nicht verschlüsselt.'),
        App.vault.encrypted
          ? h('div', { class: 'pill pill-erledigt' }, '🔒 Verschlüsselung aktiv')
          : h('div', null, h('p', { style: 'margin:0 0 12px;color:var(--muted)' }, 'Empfehlung: Aktivieren Sie die Verschlüsselung – Compliance-Daten enthalten sensible Informationen über Schwachstellen und Vorfälle.'),
              h('button', { class: 'btn btn-small', type: 'button', onclick: () => App.go('sicherheit') }, 'Jetzt absichern')))));

    if (!App.state.firma.name) {
      el.appendChild(h('div', { class: 'notice', style: 'margin-top:22px' }, 'Tipp: Hinterlegen Sie zuerst Ihr ',
        h('a', { href: '#', style: 'color:var(--gold-1)', onclick: (e) => { e.preventDefault(); App.go('firma'); } }, 'Unternehmensprofil'), ', damit Berichte Ihren Firmennamen tragen.'));
    }
  }

  App.registerView({ id: 'dashboard', group: 'Überblick', label: 'Übersicht', icon: '🏠', titel: 'Übersicht', sub: 'Ihr aktueller Compliance-Stand auf einen Blick', render: renderDashboard });

  // ---------- Regelwerke ----------

  function itemRow(fw, it) {
    const st = App.itemState(it.id);
    const rv = App.reviewDate(st);
    const select = h('select', {
      'aria-label': 'Status', onclick: (e) => e.stopPropagation(),
      onchange: (e) => { e.stopPropagation(); App.setItem(fw, it, { status: select.value }); }
    }, C.STATUS.map((x) => h('option', { value: x.id, selected: x.id === st.status }, x.label)));
    return h('div', {
      class: 'item s-' + st.status, tabindex: '0', role: 'button', 'aria-label': it.text + ' bearbeiten',
      onclick: () => App.openItemModal(fw, it),
      onkeydown: (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) App.openItemModal(fw, it); }
    },
      h('div', { class: 'item-main' },
        h('div', { class: 'item-text' }, it.text),
        h('div', { class: 'item-meta' },
          h('span', { class: 'pill pill-' + it.prio }, 'Priorität ' + it.prio), h('span', null, it.ref),
          st.owner ? h('span', null, '👤 ' + st.owner) : null,
          st.due && st.status !== 'erledigt' ? h('span', { class: App.isOverdue(st) ? 'overdue' : '' }, '📅 ' + App.fmtDate(st.due) + (App.isOverdue(st) ? ' (überfällig)' : '')) : null,
          rv ? h('span', { class: rv < App.todayIso() ? 'overdue' : '' }, '🔁 Prüfung ' + App.fmtDate(rv)) : null,
          st.evidence || st.file ? h('span', null, '📎 Nachweis hinterlegt') : (st.status === 'erledigt' ? h('span', { class: 'overdue' }, '⚠ Nachweis fehlt') : null))),
      h('div', { class: 'item-actions' }, select));
  }

  function renderBetroffenheit(el) {
    const c = App.state.nis2Check;
    const sektor = h('select', null, h('option', { value: '', selected: !c.sektor }, 'Bitte wählen …'), C.SEKTOREN.map((s) => h('option', { value: s.id, selected: s.id === c.sektor }, s.label)));
    const sonder = h('select', null, C.SONDERFAELLE.map((s) => h('option', { value: s.id, selected: s.id === (c.sonderfall || 'keiner') }, s.label)));
    const ma = h('input', { type: 'number', min: '0', step: '1', value: c.mitarbeiter ?? '', placeholder: 'z. B. 85' });
    const umsatz = h('input', { type: 'number', min: '0', step: '0.1', value: c.umsatz ?? '', placeholder: 'z. B. 12,5' });
    const bilanz = h('input', { type: 'number', min: '0', step: '0.1', value: c.bilanz ?? '', placeholder: 'z. B. 9' });
    const result = h('div');
    const draw = () => {
      result.textContent = '';
      const r = App.betroffenheit({ sektor: sektor.value, sonderfall: sonder.value, mitarbeiter: ma.value, umsatz: umsatz.value, bilanz: bilanz.value });
      if (!r) { result.appendChild(h('div', { class: 'notice', style: 'margin-top:18px' }, 'Wählen Sie Sektor und Mitarbeiterzahl, um die Einstufung zu sehen.')); return; }
      result.appendChild(h('div', { class: 'result res-' + r.typ }, h('h3', null, r.titel), h('p', null, r.text)));
    };
    const save = async () => {
      App.state.nis2Check = { sektor: sektor.value, sonderfall: sonder.value, mitarbeiter: ma.value, umsatz: umsatz.value, bilanz: bilanz.value, geprueft: new Date().toISOString() };
      App.log('NIS2-Betroffenheit geprüft', '', '');
      await App.persist();
      draw();
    };
    [sektor, sonder, ma, umsatz, bilanz].forEach((x) => x.addEventListener('change', save));
    draw();
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Betroffenheits-Check'),
      h('p', { class: 'card-sub' }, 'Fallen Sie unter die NIS2-Regelungen? Die Einstufung hängt von Sektor und Größe ab.'),
      h('div', { class: 'form-grid' }, field('Tätigkeitssektor', sektor, true), field('Beschäftigte (Vollzeitäquivalente)', ma), field('Jahresumsatz (Mio. €)', umsatz), field('Jahresbilanzsumme (Mio. €)', bilanz), field('Besonderer Fall?', sonder, true)),
      result,
      h('p', { class: 'card-sub', style: 'margin-top:14px' }, 'Hinweis: Verbundene Unternehmen und Partnerunternehmen werden bei der Größenermittlung zusammengerechnet. Dieser Check ersetzt keine rechtliche Prüfung.')));
  }

  function renderFramework(el, fw) {
    const s = App.fwStats(fw);
    if (fw.id === 'nis2') renderBetroffenheit(el);
    el.appendChild(h('div', { class: 'card' }, h('div', { class: 'ring-wrap' }, ring(s.pct, fw.name),
      h('div', { class: 'ring-meta', style: 'flex:1' }, h('h3', null, fw.titel),
        h('p', null, `${s.done} erledigt · ${s.wip} in Arbeit · ${s.open} offen · ${s.na} nicht zutreffend · ${s.evid} von ${s.done} mit Nachweis`), tube(s.pct)))));

    const filters = [{ id: 'alle', label: 'Alle' }, { id: 'offen', label: 'Offen' }, { id: 'laeuft', label: 'In Arbeit' }, { id: 'erledigt', label: 'Erledigt' }, { id: 'entfaellt', label: 'Nicht zutreffend' }];
    el.appendChild(h('div', { class: 'chips' }, filters.map((f) => h('button', {
      class: 'chip' + (App.ui.filter[fw.id] === f.id ? ' active' : ''), type: 'button',
      onclick: () => { App.ui.filter[fw.id] = f.id; App.render(); }
    }, f.label))));

    let shown = 0;
    for (const g of fw.gruppen) {
      const items = g.items.filter((it) => App.ui.filter[fw.id] === 'alle' || App.itemState(it.id).status === App.ui.filter[fw.id]);
      if (!items.length) continue;
      shown += items.length;
      el.appendChild(h('div', { class: 'group-title' }, g.name));
      for (const it of items) el.appendChild(itemRow(fw, it));
    }
    if (!shown) el.appendChild(h('div', { class: 'empty' }, 'Keine Anforderungen in diesem Filter.'));
  }

  for (const fw of C.FRAMEWORKS) {
    App.registerView({
      id: fw.id, group: 'Regelwerke', label: fw.name, icon: fw.icon, titel: fw.titel, sub: fw.untertitel,
      badge: () => App.badge(App.fwStats(fw).pct + '%', 'badge-soft'),
      render: (el) => renderFramework(el, fw)
    });
  }

  // ---------- Vorfälle & Fristen ----------

  function openVorfallModal(existing) {
    const cur = Object.assign({ titel: '', art: 'sicherheit', kenntnis: App.toLocalInput(new Date()), beschreibung: '', massnahmen: '', status: 'offen', meldungen: {} }, existing || {});
    App.openModal((modal, close) => {
      const titel = h('input', { type: 'text', maxlength: '160', value: cur.titel, placeholder: 'z. B. Phishing-Mail mit Zugangsdatenabfluss' });
      const art = h('select', null, Object.entries(App.ART_LABEL).map(([k, v]) => h('option', { value: k, selected: k === cur.art }, v)));
      const kenntnis = h('input', { type: 'datetime-local', value: cur.kenntnis });
      const status = h('select', null, Object.entries(App.VSTATUS_LABEL).map(([k, v]) => h('option', { value: k, selected: k === cur.status }, v)));
      const beschreibung = h('textarea', { maxlength: '4000', placeholder: 'Was ist passiert? Welche Systeme und Daten sind betroffen? Wie viele Personen? (datensparsam, keine Klarnamen)' });
      beschreibung.value = cur.beschreibung;
      const massnahmen = h('textarea', { maxlength: '4000', placeholder: 'Sofortmaßnahmen, Ursachenanalyse, Gegenmaßnahmen' });
      massnahmen.value = cur.massnahmen;
      const meldungen = Object.assign({}, cur.meldungen);
      const checks = h('div', { class: 'wide' });
      const drawChecks = () => {
        checks.textContent = '';
        const fr = App.vorfallFristen({ art: art.value, kenntnis: kenntnis.value, meldungen });
        if (!fr.length) { checks.appendChild(h('div', { class: 'notice' }, 'Bitte einen gültigen Zeitpunkt der Kenntnis angeben.')); return; }
        checks.appendChild(h('div', { class: 'help-box' }, h('strong', null, 'Berechnete Fristen – Häkchen setzen, sobald gemeldet')));
        for (const f of fr) {
          const cb = h('input', {
            type: 'checkbox', checked: !!meldungen[f.key],
            onchange: () => { meldungen[f.key] = cb.checked; if (f.key === 'nis72') meldungen.nis72Zeit = cb.checked ? new Date().toISOString() : ''; drawChecks(); }
          });
          const ci = App.countdown(f.deadline, meldungen[f.key]);
          checks.appendChild(h('div', { class: 'list-row' },
            h('label', { style: 'display:flex;gap:10px;align-items:center;cursor:pointer' }, cb, h('div', null, h('div', null, f.label), h('div', { class: 'sub' }, 'Frist: ' + App.fmtDateTime(f.deadline)))),
            h('span', { class: 'countdown ' + ci.cls }, ci.text)));
        }
      };
      art.addEventListener('change', drawChecks);
      kenntnis.addEventListener('change', drawChecks);
      drawChecks();
      modal.appendChild(h('h2', null, existing ? 'Vorfall bearbeiten' : 'Neuen Vorfall erfassen'));
      modal.appendChild(h('p', { class: 'hint' }, 'Die Frist beginnt mit dem Zeitpunkt, zu dem Sie vom Vorfall Kenntnis erlangt haben.'));
      modal.appendChild(h('div', { class: 'form-grid' }, field('Titel', titel, true), field('Art des Vorfalls', art), field('Zeitpunkt der Kenntnis', kenntnis), field('Bearbeitungsstatus', status), checks, field('Beschreibung', beschreibung, true), field('Maßnahmen', massnahmen, true)));
      modal.appendChild(h('div', { class: 'modal-actions' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: close }, 'Abbrechen'),
        h('button', {
          class: 'btn', type: 'button',
          onclick: async () => {
            if (!titel.value.trim()) { App.toast('Bitte einen Titel angeben.', true); return; }
            if (isNaN(new Date(kenntnis.value))) { App.toast('Bitte einen gültigen Zeitpunkt angeben.', true); return; }
            const rec = { id: existing ? existing.id : App.uid(), titel: titel.value.trim(), art: art.value, kenntnis: kenntnis.value, status: status.value, beschreibung: beschreibung.value.trim(), massnahmen: massnahmen.value.trim(), meldungen };
            if (existing) App.state.vorfaelle = App.state.vorfaelle.map((v) => (v.id === existing.id ? rec : v));
            else App.state.vorfaelle.unshift(rec);
            App.log(existing ? 'Vorfall geändert' : 'Vorfall erfasst', rec.titel, `${App.ART_LABEL[rec.art]}; Status: ${App.VSTATUS_LABEL[rec.status]}`);
            close();
            await App.persist();
            App.render();
            App.toast('Vorfall gespeichert');
          }
        }, 'Speichern')));
    });
  }
  App.openVorfallModal = openVorfallModal;

  function renderVorfaelle(el) {
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Meldefristen im Überblick'),
      h('div', { class: 'grid grid-3', style: 'margin-top:12px' },
        [['24 Std.', 'NIS2: Frühwarnung an das BSI'], ['72 Std.', 'NIS2: Vorfallmeldung · DSGVO: Meldung an die Aufsicht'], ['1 Monat', 'NIS2: Abschlussbericht']].map(([n, l]) => h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, n), h('div', { class: 'stat-lbl' }, l)))),
      h('div', { class: 'btn-row', style: 'margin-top:18px' },
        h('button', { class: 'btn', type: 'button', onclick: () => openVorfallModal(null) }, '＋ Vorfall erfassen'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => App.go('vorlagen') }, 'Meldevorlagen öffnen'))));
    if (!App.state.vorfaelle.length) {
      el.appendChild(h('div', { class: 'card' }, h('div', { class: 'empty' }, 'Noch keine Vorfälle erfasst. Auch Datenpannen, die nicht gemeldet werden müssen, sollten Sie dokumentieren (Art. 33 Abs. 5 DSGVO).')));
      return;
    }
    for (const v of App.state.vorfaelle) {
      const fr = App.vorfallFristen(v);
      el.appendChild(h('div', { class: 'card' },
        h('div', { style: 'display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-start' },
          h('div', null, h('h2', { class: 'card-title' }, v.titel), h('p', { class: 'card-sub', style: 'margin:0' }, `${App.ART_LABEL[v.art] || v.art} · Kenntnis: ${App.fmtDateTime(new Date(v.kenntnis))}`)),
          h('span', { class: 'pill pill-' + (v.status === 'abgeschlossen' ? 'erledigt' : v.status === 'gemeldet' ? 'laeuft' : 'offen') }, App.VSTATUS_LABEL[v.status] || v.status)),
        v.beschreibung ? h('p', { style: 'margin:12px 0 0' }, v.beschreibung) : null,
        h('div', { style: 'margin-top:10px' }, fr.map((f) => {
          const ci = App.countdown(f.deadline, f.done);
          return h('div', { class: 'list-row' }, h('div', null, h('div', null, f.label), h('div', { class: 'sub' }, 'Frist: ' + App.fmtDateTime(f.deadline))), h('span', { class: 'countdown ' + ci.cls }, ci.text));
        })),
        h('div', { class: 'btn-row', style: 'margin-top:14px' },
          h('button', { class: 'btn btn-ghost btn-small', type: 'button', onclick: () => openVorfallModal(v) }, 'Bearbeiten'),
          h('button', {
            class: 'btn btn-danger btn-small', type: 'button',
            onclick: () => App.confirmModal('Vorfall löschen?', `„${v.titel}“ wird unwiderruflich aus der Dokumentation entfernt.`, 'Löschen', async () => {
              App.state.vorfaelle = App.state.vorfaelle.filter((x) => x.id !== v.id);
              App.log('Vorfall gelöscht', v.titel, '');
              await App.persist();
              App.render();
            })
          }, 'Löschen'))));
    }
  }

  App.registerView({
    id: 'vorfaelle', group: 'Betrieb', label: 'Vorfälle & Fristen', icon: '🚨', titel: 'Vorfälle & Meldefristen',
    sub: 'Sicherheitsvorfälle und Datenpannen dokumentieren, Meldefristen automatisch berechnen',
    badge: () => { const n = App.offeneFristen().length; return n ? App.badge(n) : null; }, render: renderVorfaelle
  });

  // ---------- Unternehmen ----------

  function renderFirma(el) {
    const f = App.state.firma;
    const defs = [
      ['name', 'Firmenname', 'text', true], ['branche', 'Branche', 'text'], ['adresse', 'Anschrift', 'text', true],
      ['geschaeftsfuehrung', 'Geschäftsleitung', 'text'], ['itleitung', 'IT-/Informationssicherheits-Verantwortliche/r', 'text'],
      ['dsb', 'Datenschutzbeauftragte/r', 'text'], ['email', 'Kontakt E-Mail', 'email'], ['telefon', 'Notfall-Rufnummer (24/7)', 'text']
    ];
    const inputs = {};
    const grid = h('div', { class: 'form-grid' });
    for (const [key, label, type, wide] of defs) {
      inputs[key] = h('input', { type, value: f[key] || '', maxlength: '200', autocomplete: 'off' });
      grid.appendChild(field(label, inputs[key], wide));
    }
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Stammdaten'),
      h('p', { class: 'card-sub' }, 'Diese Angaben erscheinen auf dem Deckblatt Ihres Compliance-Berichts und füllen die Platzhalter in den Vorlagen.'),
      grid,
      h('div', { class: 'btn-row', style: 'margin-top:20px' }, h('button', {
        class: 'btn', type: 'button',
        onclick: async () => {
          App.state.firma = {};
          for (const [key] of defs) App.state.firma[key] = inputs[key].value.trim();
          App.log('Unternehmensprofil geändert', '', '');
          await App.persist();
          App.render();
          App.toast('Unternehmensprofil gespeichert');
        }
      }, 'Speichern'))));
  }

  App.registerView({ id: 'firma', group: 'Einstellungen', label: 'Unternehmen', icon: '🏢', titel: 'Unternehmensprofil', sub: 'Stammdaten und Verantwortliche für Ihre Berichte', render: renderFirma });
})();
