// Register: Verarbeitungsverzeichnis, Dienstleister & AV-Verträge, Betroffenenanfragen, Schulungen.
// Eine generische Listen-/Formular-Maschine, gesteuert durch das gemeinsame Schema (schema.js).
(function () {
  'use strict';
  const App = window.App;
  const { h, S } = App;

  const ICONS = { vvt: '📒', dienstleister: '🤝', anfragen: '📨', schulungen: '🎓' };

  function recTitle(reg, rec) {
    return reg.titelFelder.map((k) => rec[k]).filter(Boolean).join(' · ') || '(ohne Bezeichnung)';
  }

  // Kennzeichnung auffälliger Einträge (Pills), je Register.
  function flags(reg, rec) {
    const out = [];
    const today = App.todayIso();
    const late = (d) => d && d < today;
    if (reg.id === 'vvt') {
      if (rec.besondere) out.push(['Art. 9', 'warn']);
      if (rec.drittland && rec.drittland.startsWith('Ja – ohne')) out.push(['Drittland ohne Garantien', 'bad']);
      else if (rec.drittland && rec.drittland.startsWith('Ja')) out.push(['Drittland', 'warn']);
      if (!rec.rechtsgrundlage) out.push(['Rechtsgrundlage fehlt', 'bad']);
      if (late(rec.pruefung)) out.push(['Prüfung überfällig', 'bad']);
    } else if (reg.id === 'dienstleister') {
      if (rec.avv === 'Fehlt') out.push(['AV-Vertrag fehlt', 'bad']);
      else if (rec.avv === 'In Verhandlung') out.push(['AVV in Arbeit', 'warn']);
      if (rec.standort && rec.standort.includes('ohne Garantien')) out.push(['Drittland ohne Garantien', 'bad']);
      if (rec.risiko === 'Hoch') out.push(['Hohes Risiko', 'warn']);
      if (late(rec.pruefung)) out.push(['Prüfung überfällig', 'bad']);
    } else if (reg.id === 'anfragen') {
      if (App.anfrageOffen(rec)) {
        const frist = App.anfrageFrist(rec);
        out.push([`Frist ${App.fmtDate(frist)}`, late(frist) ? 'bad' : 'warn']);
      }
    } else if (reg.id === 'schulungen') {
      if (late(rec.naechste)) out.push(['Wiederholung überfällig', 'bad']);
    }
    return out;
  }

  function matches(reg, rec, q) {
    if (!q) return true;
    const needle = q.toLowerCase();
    return reg.fields.some((f) => typeof rec[f.k] === 'string' && rec[f.k].toLowerCase().includes(needle));
  }

  function openRecordModal(reg, existing, preset) {
    const cur = Object.assign({}, preset || {}, existing || {});
    if (reg.id === 'anfragen' && !existing && !cur.eingang) cur.eingang = App.todayIso();
    App.openModal((modal, close) => {
      const inputs = {};
      const grid = h('div', { class: 'form-grid' });
      for (const f of reg.fields) {
        let el;
        const v = cur[f.k];
        if (f.t === 'textarea') { el = h('textarea', { maxlength: String(f.max || 1000) }); el.value = v || ''; }
        else if (f.t === 'select') el = h('select', null, f.o.map((o) => h('option', { value: o, selected: o === (v !== undefined && v !== '' ? v : f.o[0]) }, o === '' ? '– bitte wählen –' : o)));
        else if (f.t === 'date') el = h('input', { type: 'date', value: v || '' });
        else if (f.t === 'number') el = h('input', { type: 'number', min: '0', step: '1', value: v || '' });
        else if (f.t === 'bool') {
          el = h('input', { type: 'checkbox', checked: !!v });
          inputs[f.k] = el;
          grid.appendChild(h('label', { class: 'field check wide' }, el, h('span', null, f.l)));
          continue;
        } else el = h('input', { type: 'text', value: v || '', maxlength: String(f.max || 200), autocomplete: 'off' });
        inputs[f.k] = el;
        grid.appendChild(App.field(f.l + (f.req ? ' *' : ''), el, f.wide));
      }
      modal.appendChild(h('h2', null, existing ? `${reg.einzahl} bearbeiten` : `${reg.einzahl} anlegen`));
      modal.appendChild(grid);
      modal.appendChild(h('div', { class: 'modal-actions' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: close }, 'Abbrechen'),
        h('button', {
          class: 'btn', type: 'button',
          onclick: async () => {
            const rec = { id: existing ? existing.id : App.uid(), erstellt: existing ? existing.erstellt : new Date().toISOString(), geaendert: new Date().toISOString() };
            for (const f of reg.fields) rec[f.k] = f.t === 'bool' ? inputs[f.k].checked : inputs[f.k].value.trim();
            const missing = reg.fields.find((f) => f.req && !rec[f.k]);
            if (missing) { App.toast(`Bitte „${missing.l}“ ausfüllen.`, true); return; }
            const list = App.state[reg.id];
            if (existing) App.state[reg.id] = list.map((r) => (r.id === existing.id ? rec : r));
            else if (list.length >= reg.max) { App.toast('Maximale Anzahl an Einträgen erreicht.', true); return; }
            else list.unshift(rec);
            App.log(existing ? `${reg.einzahl} geändert` : `${reg.einzahl} angelegt`, recTitle(reg, rec), reg.titel);
            close();
            await App.persist();
            App.render();
            App.toast('Gespeichert');
          }
        }, 'Speichern')));
    });
  }

  function openVorlagenModal(reg) {
    App.openModal((modal, close) => {
      modal.appendChild(h('h2', null, 'Aus Vorlage anlegen'));
      modal.appendChild(h('p', { class: 'hint' }, 'Typische Verarbeitungstätigkeiten als Ausgangspunkt. Passen Sie die Inhalte danach an Ihr Unternehmen an.'));
      for (const v of reg.vorlagen) {
        modal.appendChild(h('div', { class: 'list-row clickable', tabindex: '0', role: 'button', onclick: () => { close(); openRecordModal(reg, null, v); }, onkeydown: (e) => { if (e.key === 'Enter') { close(); openRecordModal(reg, null, v); } } },
          h('div', null, h('div', null, v.name), h('div', { class: 'sub' }, v.zweck)), h('span', { class: 'pill pill-hoch' }, 'Verwenden')));
      }
      modal.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: close }, 'Schließen')));
    });
  }

  function renderRegister(el, reg) {
    const list = App.state[reg.id];
    const q = App.ui.search[reg.id] || '';
    const withFlags = list.map((r) => ({ r, f: flags(reg, r) }));
    const problems = withFlags.filter((x) => x.f.some((y) => y[1] === 'bad')).length;

    const search = h('input', { type: 'search', placeholder: 'Suchen …', value: q, 'aria-label': 'Suchen', autocomplete: 'off' });
    search.addEventListener('input', () => {
      App.ui.search[reg.id] = search.value;
      App.render();
      const again = document.querySelector('#content input[type="search"]');
      if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    });

    el.appendChild(h('div', { class: 'card' },
      h('div', { class: 'stats-inline' },
        h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, String(list.length)), h('div', { class: 'stat-lbl' }, 'Einträge')),
        h('div', { class: 'stat' + (problems ? ' bad' : '') }, h('div', { class: 'stat-num' }, String(problems)), h('div', { class: 'stat-lbl' }, 'Mit Handlungsbedarf'))),
      h('div', { class: 'btn-row', style: 'margin-top:16px' },
        h('button', { class: 'btn', type: 'button', onclick: () => openRecordModal(reg) }, `＋ ${reg.einzahl} anlegen`),
        reg.vorlagen ? h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => openVorlagenModal(reg) }, 'Aus Vorlage anlegen') : null,
        h('div', { class: 'search-wrap' }, search))));

    const shown = withFlags.filter((x) => matches(reg, x.r, q));
    if (!shown.length) {
      el.appendChild(h('div', { class: 'card' }, h('div', { class: 'empty' }, list.length ? 'Keine Treffer.' : `Noch keine Einträge. Legen Sie die erste ${reg.einzahl} an.`)));
      return;
    }
    for (const { r, f } of shown) {
      const meta = reg.listenFelder.map((k) => r[k]).filter((x) => x !== '' && x !== undefined);
      el.appendChild(h('div', { class: 'card record' },
        h('div', { class: 'record-head' },
          h('h2', { class: 'card-title', style: 'margin:0' }, recTitle(reg, r)),
          h('div', { class: 'flags' }, f.map(([t, c]) => h('span', { class: 'pill flag-' + c }, t)))),
        meta.length ? h('p', { class: 'card-sub', style: 'margin:6px 0 0' }, meta.join(' · ')) : null,
        h('div', { class: 'btn-row', style: 'margin-top:14px' },
          h('button', { class: 'btn btn-ghost btn-small', type: 'button', onclick: () => openRecordModal(reg, r) }, 'Bearbeiten'),
          reg.id === 'anfragen' && App.anfrageOffen(r) ? h('button', {
            class: 'btn btn-small', type: 'button',
            onclick: async () => {
              Object.assign(r, { status: 'Beantwortet', erledigtAm: App.todayIso(), geaendert: new Date().toISOString() });
              App.log('Betroffenenanfrage beantwortet', recTitle(reg, r), '');
              await App.persist();
              App.render();
            }
          }, 'Als beantwortet markieren') : null,
          h('button', {
            class: 'btn btn-danger btn-small', type: 'button',
            onclick: () => App.confirmModal(`${reg.einzahl} löschen?`, `„${recTitle(reg, r)}“ wird unwiderruflich entfernt.`, 'Löschen', async () => {
              App.state[reg.id] = App.state[reg.id].filter((x) => x.id !== r.id);
              App.log(`${reg.einzahl} gelöscht`, recTitle(reg, r), reg.titel);
              await App.persist();
              App.render();
            })
          }, 'Löschen'))));
    }
  }

  App.recTitle = recTitle;
  for (const key of ['vvt', 'dienstleister', 'anfragen', 'schulungen']) {
    const reg = S.REGISTER[key];
    App.registerView({
      id: key, group: 'Register', label: key === 'dienstleister' ? 'Dienstleister & AVV' : reg.titel, icon: ICONS[key], titel: reg.titel, sub: reg.sub,
      badge: () => {
        const n = App.state[key].filter((r) => flags(reg, r).some((x) => x[1] === 'bad')).length;
        return n ? App.badge(n) : null;
      },
      render: (el) => renderRegister(el, reg)
    });
  }
})();
