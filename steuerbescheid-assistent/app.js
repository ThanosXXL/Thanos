(function () {
  'use strict';

  const STORAGE_KEY = 'steuerbescheid-assistent-state-v1';
  const MAX_FILE_BYTES = 1.5 * 1024 * 1024; // localStorage-Schutz

  /** @type {any} */
  let state = loadState() || freshState();
  if (!state.amounts) state.amounts = {}; // Backfill für vor der Schätzfunktion gespeicherte Stände

  function freshState() {
    return {
      screen: 'start',
      year: null,
      familyStatus: null,
      situations: [],
      stepIndex: 0,
      docs: {}, // { [stepId]: { [docLabel]: { checked, fileName, fileData, tooBig } } }
      amounts: {}, // { [amountFieldId]: string }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      showToast('Speicher voll – letzte Datei wurde nicht dauerhaft gespeichert.');
    }
  }

  function hasSavedProgress() {
    return !!(state.year && state.familyStatus);
  }

  // ---------- kleiner DOM-Helper (kein innerHTML für Nutzerdaten) ----------
  function h(tag, attrs, ...children) {
    const e = document.createElement(tag);
    attrs = attrs || {};
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v; // nur für statische, selbst erzeugte SVGs
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return e;
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  // ---------- Demo-Video-Modal ----------
  const DEMO_VIDEO_SRC = 'demo/steuerbescheid-assistent-demo.mp4';

  function openVideoModal() {
    const modal = document.getElementById('video-modal');
    const video = document.getElementById('demo-video');
    video.src = DEMO_VIDEO_SRC;
    modal.hidden = false;
    video.play().catch(() => {});
  }

  function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const video = document.getElementById('demo-video');
    video.pause();
    video.removeAttribute('src');
    video.load();
    modal.hidden = true;
  }

  document.getElementById('video-modal-close').addEventListener('click', closeVideoModal);
  document.getElementById('video-modal-backdrop').addEventListener('click', closeVideoModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('video-modal').hidden) closeVideoModal();
  });

  // ---------- Beispielbild (schematisches SVG, keine amtliche Vorlage) ----------
  const EXAMPLES = {
    persoenlich: { icon: '🪪', label: 'Hauptvordruck – Persönliche Daten', field: 'Steuer-Identifikationsnummer' },
    partner: { icon: '💍', label: 'Hauptvordruck – Partnerangaben', field: 'Steuer-ID der Partnerin/des Partners' },
    getrennt: { icon: '✍️', label: 'Hauptvordruck – Trennung', field: 'Datum der Trennung' },
    verwitwet: { icon: '🕊️', label: 'Hauptvordruck – Verwitwet', field: 'Sterbedatum' },
    anlage_n: { icon: '💼', label: 'Anlage N', field: 'Bruttoarbeitslohn lt. Lohnsteuerbescheinigung' },
    homeoffice: { icon: '💻', label: 'Anlage N – Werbungskosten', field: 'Anzahl Homeoffice-Tage' },
    anlage_kind: { icon: '👶', label: 'Anlage Kind', field: 'Kindergeld-Bezugsmonate' },
    ausbildung_erst: { icon: '🎓', label: 'Sonderausgaben – Erstausbildung', field: 'Studien-/Ausbildungsgebühren' },
    ausbildung_zweit: { icon: '🎓', label: 'Anlage N – Zweitausbildung', field: 'Studien-/Ausbildungsgebühren' },
    anlage_kap: { icon: '💶', label: 'Anlage KAP', field: 'Kapitalertragsteuer lt. Bank' },
    anlage_v: { icon: '🏠', label: 'Anlage V', field: 'Mieteinnahmen (kalt)' },
    anlage_sg: { icon: '🧮', label: 'Anlage S/G + EÜR', field: 'Betriebseinnahmen/-ausgaben' },
    anlage_vorsorge: { icon: '🐷', label: 'Anlage Vorsorgeaufwand', field: 'Beiträge Kranken-/Rentenversicherung' },
    sonderausgaben_spenden: { icon: '🎁', label: 'Sonderausgaben – Spenden', field: 'Summe Spenden lt. Bescheinigung' },
    aussergewoehnliche_belastungen: { icon: '🏥', label: 'Außergewöhnliche Belastungen', field: 'Eigenanteil Krankheitskosten' },
    anlage_u: { icon: '🤝', label: 'Anlage U / Unterhalt', field: 'Gezahlter Unterhaltsbetrag' },
    abschluss: { icon: '✅', label: 'Zusammenfassung', field: 'Alle Unterlagen vollständig?' },
  };

  function buildExampleSvg(stepId) {
    const ex = EXAMPLES[stepId] || EXAMPLES.abschluss;
    const lines = [1, 2, 3, 4].map((n) => {
      const y = 92 + n * 26;
      const isHighlight = n === 2;
      return `
        <rect x="30" y="${y - 14}" width="340" height="22" rx="6"
          fill="${isHighlight ? '#ffe08a' : '#fff7e6'}" stroke="${isHighlight ? '#ff8a00' : '#f0d9a8'}" stroke-width="${isHighlight ? 2 : 1}"/>
        ${isHighlight ? `<text x="380" y="${y + 2}" font-size="11" fill="#a34500" font-weight="700" text-anchor="end"></text>` : ''}
      `;
    }).join('');
    return `
      <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Beispielhafte, schematische Formularansicht">
        <defs>
          <linearGradient id="hdr-${stepId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffd166"/>
            <stop offset="1" stop-color="#ff8a00"/>
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="392" height="252" rx="18" fill="#ffffff" stroke="#f0d9a8"/>
        <rect x="4" y="4" width="392" height="56" rx="18" fill="url(#hdr-${stepId})"/>
        <rect x="4" y="34" width="392" height="26" fill="url(#hdr-${stepId})"/>
        <text x="24" y="38" font-size="26">${ex.icon}</text>
        <text x="60" y="38" font-size="14" font-weight="700" fill="#4a2500">${escapeXml(ex.label)}</text>
        ${lines}
        <path d="M 320 172 q 40 -4 46 -20" stroke="#a34500" stroke-width="2" fill="none" marker-end="url(#arrow-${stepId})"/>
        <defs>
          <marker id="arrow-${stepId}" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#a34500"/>
          </marker>
        </defs>
        <rect x="200" y="140" width="176" height="26" rx="6" fill="#fff3cf" stroke="#ff8a00"/>
        <text x="288" y="157" font-size="11" fill="#a34500" font-weight="700" text-anchor="middle">${escapeXml(ex.field)}</text>
        <text x="200" y="238" font-size="12" fill="#c62828" font-weight="700" text-anchor="middle">BEISPIEL – SCHEMATISCH, KEIN AMTLICHES FORMULAR</text>
      </svg>
    `;
  }

  function escapeXml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- Rendering ----------
  function render() {
    const root = document.getElementById('content');
    root.replaceChildren();
    updateProgress();

    if (state.screen === 'start') root.appendChild(renderStart());
    else if (state.screen === 'year') root.appendChild(renderYear());
    else if (state.screen === 'family') root.appendChild(renderFamily());
    else if (state.screen === 'situations') root.appendChild(renderSituations());
    else if (state.screen === 'wizard') root.appendChild(renderWizard());
    else if (state.screen === 'summary') root.appendChild(renderSummary());
  }

  function updateProgress() {
    const wrap = document.getElementById('progress-wrap');
    const fill = document.getElementById('progress-fill');
    const label = document.getElementById('progress-label');
    if (state.screen === 'start') { wrap.hidden = true; return; }
    wrap.hidden = false;

    const phaseOrder = ['year', 'family', 'situations', 'wizard', 'summary'];
    let done = phaseOrder.indexOf(state.screen);
    let total = 4; // year, family, situations, wizard(gesamt), + summary als Ende
    let pct = 0;
    if (state.screen === 'wizard') {
      const steps = currentSteps();
      pct = ((2 + (state.stepIndex + 1) / steps.length) / total) * 100;
      label.textContent = `Schritt ${state.stepIndex + 1} von ${steps.length}`;
    } else if (state.screen === 'summary') {
      pct = 100;
      label.textContent = 'Fertig';
    } else {
      pct = ((done) / total) * 100;
      label.textContent = { year: 'Jahr wählen', family: 'Familienstand', situations: 'Deine Situation' }[state.screen] || '';
    }
    fill.style.width = Math.min(100, Math.max(4, pct)) + '%';
  }

  function currentSteps() {
    return buildSteps(state.year, state.familyStatus, state.situations);
  }

  function disclaimerBanner() {
    return h('div', { class: 'disclaimer' },
      '⚠️ Dieser Assistent ist ein Organisations- und Lernwerkzeug. Er berechnet keine Steuer, prüft keine Rechtslage und sendet nichts an das Finanzamt. Alle Beträge sind Richtwerte. Bitte trage die Werte selbst in ELSTER ein oder lass dich von einer steuerberatenden Person unterstützen.'
    );
  }

  function renderStart() {
    const card = h('div', { class: 'card' },
      h('h2', {}, 'Willkommen beim Steuerbescheid-Assistenten'),
      h('p', {}, 'In wenigen Schritten zeigt dir dieser Assistent, welche Formulare (Anlagen) für deine Situation relevant sind, welche Angaben dort gefragt sind und welche Unterlagen du als Foto oder Scan bereitlegen solltest – rückwirkend ab dem Steuerjahr 2023.'),
      h('button', { class: 'demo-teaser', onclick: openVideoModal },
        h('span', { class: 'demo-teaser-icon' }, '🎬'),
        h('span', {},
          h('strong', {}, 'Demo-Video ansehen'),
          h('span', {}, 'Kurzer Rundgang durch den Assistenten (43 Sekunden, mit Musik)')
        )
      ),
      disclaimerBanner(),
      h('div', { class: 'btn-row' },
        h('button', {
          class: 'btn', onclick: () => {
            const resume = hasSavedProgress();
            if (!resume) state = freshState();
            state.screen = resume ? 'wizard' : 'year';
            persist(); render();
          },
        }, hasSavedProgress() ? 'Weiter wo ich aufgehört habe' : 'Los geht’s'),
        hasSavedProgress() ? h('button', { class: 'btn secondary', onclick: () => { state = freshState(); persist(); state.screen = 'year'; render(); } }, 'Neu starten') : null
      )
    );
    return card;
  }

  function renderYear() {
    return h('div', { class: 'card' },
      h('h2', {}, 'Für welches Steuerjahr möchtest du deine Erklärung vorbereiten?'),
      h('p', {}, 'Rückwirkend einreichbar sind in der Regel die letzten vier Jahre.'),
      h('div', { class: 'tile-grid' },
        TAX_YEARS.map((y) => h('button', {
          class: 'tile' + (state.year === y ? ' selected' : ''),
          onclick: () => { state.year = y; state.screen = 'family'; persist(); render(); },
        }, h('span', { class: 'tile-title' }, String(y)), h('span', { class: 'tile-hint' }, `Erklärung für das Jahr ${y}`)))
      )
    );
  }

  function renderFamily() {
    return h('div', { class: 'card' },
      h('h2', {}, 'Wie war dein Familienstand im Steuerjahr ' + state.year + '?'),
      h('div', { class: 'tile-grid' },
        FAMILY_STATUS.map((f) => h('button', {
          class: 'tile' + (state.familyStatus === f.id ? ' selected' : ''),
          onclick: () => { state.familyStatus = f.id; state.screen = 'situations'; persist(); render(); },
        }, h('span', { class: 'tile-title' }, f.label), h('span', { class: 'tile-hint' }, f.hint)))
      ),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn ghost', onclick: () => { state.screen = 'year'; render(); } }, '← Zurück')
      )
    );
  }

  function renderSituations() {
    return h('div', { class: 'card' },
      h('h2', {}, 'Was trifft auf dich im Steuerjahr ' + state.year + ' zu?'),
      h('p', {}, 'Wähle alles aus, was zutrifft – egal ob angestellt, Studium, Kinder, Vermietung oder Kapitalerträge. Du kannst mehrere Punkte auswählen.'),
      h('div', { class: 'tile-grid' },
        SITUATIONS.map((s) => {
          const selected = state.situations.includes(s.id);
          return h('button', {
            class: 'tile' + (selected ? ' selected' : ''),
            onclick: () => {
              state.situations = selected ? state.situations.filter((x) => x !== s.id) : [...state.situations, s.id];
              persist(); render();
            },
          }, h('span', { class: 'tile-title' }, s.label));
        })
      ),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn ghost', onclick: () => { state.screen = 'family'; render(); } }, '← Zurück'),
        h('button', { class: 'btn', onclick: () => { state.stepIndex = 0; state.screen = 'wizard'; persist(); render(); } }, 'Checkliste erstellen →')
      )
    );
  }

  function factGrid() {
    const facts = YEAR_FACTS[state.year];
    const items = [
      ['Grundfreibetrag (ledig)', facts.grundfreibetragSingle],
      ['Grundfreibetrag (zusammen)', facts.grundfreibetragVerheiratet],
      ['Arbeitnehmerpauschbetrag', facts.arbeitnehmerpauschbetrag],
      ['Sparerpauschbetrag (ledig)', facts.sparerpauschbetragSingle],
      ['Homeoffice-Pauschale', facts.homeofficePauschaleMax],
    ];
    return h('div', { class: 'fact-grid' },
      items.map(([lbl, val]) => h('div', { class: 'fact-tile' }, h('span', { class: 'val' }, val), h('span', { class: 'lbl' }, lbl)))
    );
  }

  function docKey(stepId, label) {
    if (!state.docs[stepId]) state.docs[stepId] = {};
    if (!state.docs[stepId][label]) state.docs[stepId][label] = { checked: false, fileName: null, fileData: null, tooBig: false };
    return state.docs[stepId][label];
  }

  function renderDocItem(step, doc) {
    const entry = docKey(step.id, doc.label);
    const inputId = 'file-' + step.id + '-' + doc.label.replace(/[^a-z0-9]+/gi, '');
    const checkboxId = 'chk-' + step.id + '-' + doc.label.replace(/[^a-z0-9]+/gi, '');

    const row = h('div', { class: 'doc-item-row' },
      h('input', {
        type: 'checkbox', id: checkboxId, checked: entry.checked || null,
        onchange: (e) => { entry.checked = e.target.checked; persist(); },
      }),
      h('label', { for: checkboxId }, doc.label),
      doc.required ? h('span', { class: 'required-tag' }, 'nötig') : null
    );

    const attach = h('div', { class: 'file-attach' },
      h('label', { class: 'file-attach-label', for: inputId }, entry.fileName ? '📎 Foto/Scan ersetzen' : '📎 Foto/Scan hinzufügen'),
      h('input', {
        type: 'file', id: inputId, accept: 'image/*,application/pdf', capture: 'environment',
        onchange: (e) => onFileSelected(e, entry),
      }),
      entry.fileName ? h('span', { class: 'file-name' }, entry.fileName) : null,
      entry.fileData && entry.fileData.startsWith('data:image') ? h('img', { class: 'file-preview', src: entry.fileData, alt: '' }) : null,
      entry.tooBig ? h('span', { class: 'file-name' }, 'nur Name gespeichert (Datei zu groß)') : null
    );

    return h('div', { class: 'doc-item' + (doc.required ? ' required' : '') }, row, attach);
  }

  function onFileSelected(e, entry) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    entry.fileName = file.name;
    entry.tooBig = false;
    if (file.size > MAX_FILE_BYTES) {
      entry.fileData = null;
      entry.tooBig = true;
      persist(); render();
      showToast('Datei ist groß – es wird nur der Dateiname gemerkt.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      entry.fileData = reader.result;
      persist();
      render();
    };
    reader.readAsDataURL(file);
  }

  function renderAmountField(f) {
    const value = state.amounts[f.id] !== undefined ? state.amounts[f.id] : '';
    if (f.type === 'select') {
      return h('label', { class: 'amount-field' },
        h('span', {}, f.label),
        h('select', { onchange: (e) => { state.amounts[f.id] = e.target.value; persist(); } },
          f.options.map((o) => h('option', { value: o.value, selected: value === o.value ? 'selected' : null }, o.label))
        )
      );
    }
    return h('label', { class: 'amount-field' },
      h('span', {}, f.label),
      h('div', { class: 'amount-input-row' },
        h('input', {
          type: 'number', min: '0', step: '1', inputmode: 'decimal', placeholder: '0', value: value,
          oninput: (e) => { state.amounts[f.id] = e.target.value; },
          onblur: () => persist(),
        }),
        h('span', { class: 'amount-unit' }, f.unit || '€')
      )
    );
  }

  function renderAmountsBlock(step) {
    if (!step.amounts || !step.amounts.length) return null;
    return h('div', { class: 'amounts-block' },
      h('strong', {}, '🧮 Werte für die automatische Steuerschätzung'),
      h('p', { class: 'example-caption' }, 'Optional – ohne diese Angaben kann am Ende keine Schätzung berechnet werden.'),
      h('div', { class: 'amounts-grid' }, step.amounts.map((f) => renderAmountField(f)))
    );
  }

  function renderWizard() {
    const steps = currentSteps();
    const step = steps[state.stepIndex];
    const isFirst = state.stepIndex === 0;
    const isLast = state.stepIndex === steps.length - 1;

    const card = h('div', { class: 'card' },
      h('span', { class: 'step-badge' }, `Schritt ${state.stepIndex + 1} / ${steps.length}`),
      h('h2', {}, step.title),
      h('div', { class: 'form-name' }, step.form),
      h('p', {}, step.description),
      step.id === 'persoenlich' ? factGrid() : null,
      h('div', { class: 'example-figure', html: buildExampleSvg(step.id) }),
      h('p', { class: 'example-caption' }, 'Schematische Beispielansicht zur Orientierung – kein amtliches Formular.'),
      step.fields && step.fields.length ? h('div', {},
        h('strong', {}, 'Diese Angaben werden gebraucht:'),
        h('ul', { class: 'field-list' }, step.fields.map((f) => h('li', {}, f)))
      ) : null,
      step.documents && step.documents.length ? h('div', {},
        h('strong', {}, 'Unterlagen (Foto/Scan hochladen und abhaken):'),
        h('div', {}, step.documents.map((d) => renderDocItem(step, d)))
      ) : null,
      renderAmountsBlock(step),
      step.note ? h('div', { class: 'note-box' }, step.note) : null,
      h('div', { class: 'btn-row' },
        h('button', {
          class: 'btn ghost',
          onclick: () => {
            if (isFirst) { state.screen = 'situations'; } else { state.stepIndex -= 1; }
            persist(); render();
          },
        }, '← Zurück'),
        h('button', {
          class: 'btn',
          onclick: () => {
            if (isLast) { state.screen = 'summary'; } else { state.stepIndex += 1; }
            persist(); render(); window.scrollTo(0, 0);
          },
        }, isLast ? 'Zur Zusammenfassung →' : 'Weiter →')
      )
    );
    return card;
  }

  function renderSummary() {
    const steps = currentSteps();
    let totalDocs = 0, checkedDocs = 0;
    steps.forEach((s) => (s.documents || []).forEach((d) => {
      totalDocs += 1;
      const e = state.docs[s.id] && state.docs[s.id][d.label];
      if (e && e.checked) checkedDocs += 1;
    }));

    const overview = steps.map((s) => {
      const docs = s.documents || [];
      const doneCount = docs.filter((d) => state.docs[s.id] && state.docs[s.id][d.label] && state.docs[s.id][d.label].checked).length;
      return h('li', {},
        h('strong', {}, s.title), ' — ', s.form,
        docs.length ? h('span', {}, ` (${doneCount}/${docs.length} Unterlagen abgehakt)`) : null
      );
    });

    const overviewCard = h('div', { class: 'card' },
      h('h2', {}, '🎉 Deine Checkliste für ' + state.year + ' ist fertig'),
      h('p', {}, `Insgesamt hast du ${checkedDocs} von ${totalDocs} Unterlagen als vorhanden markiert.`),
      disclaimerBanner(),
      h('ul', { class: 'checklist' }, overview.map((li) => h('li', {}, li))),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn ghost', onclick: () => { state.screen = 'wizard'; state.stepIndex = steps.length - 1; render(); } }, '← Zurück zu den Schritten'),
        h('button', { class: 'btn secondary', onclick: () => window.print() }, '🖨️ Checkliste drucken/als PDF'),
        h('button', { class: 'btn', onclick: () => { state = freshState(); persist(); render(); window.scrollTo(0, 0); } }, 'Neue Erklärung starten')
      )
    );

    return h('div', {}, overviewCard, renderEstimateCard());
  }

  function renderEstimateCard() {
    const est = computeTaxEstimate(state);

    const estimateWarning = h('div', { class: 'disclaimer estimate-warning' },
      '⚠️ Achtung, ungefährer Richtwert: Diese Zahl ist ',
      h('strong', {}, 'keine verbindliche Steuerberechnung'),
      ' und stimmt nicht immer zu 100 % mit deinem echten Steuerbescheid überein. Häufigster Grund: einzelne absetzbare Posten – allen voran ',
      h('strong', {}, 'Werbungskosten'),
      ', aber auch Sonderausgaben, außergewöhnliche Belastungen oder Freibeträge – werden aus Unerfahrenheit vergessen oder nicht vollständig eingetragen. Auch Sonderfälle wie die Kinderfreibetrag-Günstigerprüfung, Steuerklassenkombinationen bei Ehepaaren oder Verlustvorträge werden hier nicht berücksichtigt. Nutze den Wert nur zur groben Orientierung und lass deinen tatsächlichen Bescheid über ELSTER oder eine steuerberatende Person prüfen.'
    );

    if (!est.hasData) {
      return h('div', { class: 'card estimate-card' },
        h('h2', {}, '🧮 Automatische Steuerschätzung'),
        estimateWarning,
        h('p', {}, 'Du hast noch keine Beträge eingetragen. Geh zurück zu den Schritten und trage z. B. deinen Bruttoarbeitslohn ein (Abschnitt „🧮 Werte für die automatische Steuerschätzung“), um hier eine Schätzung zu sehen.')
      );
    }

    const rows = [
      ['zu versteuerndes Einkommen (geschätzt)', formatEuro(est.zvE)],
      ['geschätzte Einkommensteuer', formatEuro(est.estIncomeTax)],
    ];
    if (est.kirchensteuer > 0) rows.push(['geschätzte Kirchensteuer', formatEuro(est.kirchensteuer)]);
    if (est.soli > 0) rows.push(['geschätzter Solidaritätszuschlag', formatEuro(est.soli)]);
    if (est.abgeltungsteuerGesamt > 0) rows.push(['Abgeltungsteuer auf Kapitalerträge (meist schon von der Bank abgeführt)', formatEuro(est.abgeltungsteuerGesamt)]);

    let diffText = null;
    if (est.differenz !== null) {
      const runde = formatEuro(Math.abs(est.differenz));
      diffText = est.differenz >= 0
        ? `Du hast laut Angabe ca. ${formatEuro(est.gezahlteLohnsteuer)} Lohnsteuer gezahlt, geschätzt fällig wären ca. ${formatEuro(est.estIncomeTax + est.kirchensteuer + est.soli)} — das deutet auf eine mögliche Erstattung von rund ${runde} hin.`
        : `Du hast laut Angabe ca. ${formatEuro(est.gezahlteLohnsteuer)} Lohnsteuer gezahlt, geschätzt fällig wären aber ca. ${formatEuro(est.estIncomeTax + est.kirchensteuer + est.soli)} — das könnte auf eine mögliche Nachzahlung von rund ${runde} hindeuten.`;
    }

    return h('div', { class: 'card estimate-card' },
      h('h2', {}, '🧮 Automatische Steuerschätzung'),
      estimateWarning,
      h('div', { class: 'fact-grid' },
        rows.map(([lbl, val]) => h('div', { class: 'fact-tile' }, h('span', { class: 'val' }, val), h('span', { class: 'lbl' }, lbl))),
        h('div', { class: 'fact-tile highlight' }, h('span', { class: 'val' }, formatEuro(est.gesamtSteuerlast)), h('span', { class: 'lbl' }, 'geschätzte Steuerlast insgesamt'))
      ),
      diffText ? h('p', {}, diffText) : null,
      h('p', { class: 'example-caption' }, 'Häufig vergessene Posten, die dieses Ergebnis verändern können: Fachliteratur, Arbeitsmittel, Fortbildungen, doppelte Haushaltsführung, Handwerkerleistungen und haushaltsnahe Dienstleistungen, Kinderbetreuungskosten, Behinderten-Pauschbetrag, Verlustvorträge aus Vorjahren, Riester-/Rürup-Zulagen u.v.m.'),
      renderDownloadGate(est)
    );
  }

  function requiredDocsStatus(steps) {
    let total = 0, checked = 0;
    const missing = [];
    steps.forEach((s) => (s.documents || []).forEach((d) => {
      if (!d.required) return;
      total += 1;
      const e = state.docs[s.id] && state.docs[s.id][d.label];
      if (e && e.checked) checked += 1;
      else missing.push(`${d.label} (${s.title})`);
    }));
    return { total, checked, missing };
  }

  function renderDownloadGate(est) {
    const steps = currentSteps();
    const req = requiredDocsStatus(steps);
    const allRequiredDone = req.total === 0 || req.checked === req.total;

    if (!allRequiredDone) {
      return h('div', { class: 'download-gate locked' },
        `🔒 Der Download der vollständigen Zusammenfassung wird freigeschaltet, sobald alle Pflicht-Unterlagen abgehakt sind (aktuell ${req.checked}/${req.total}). Noch offen: ${req.missing.join(', ')}.`
      );
    }
    return h('div', { class: 'download-gate unlocked' },
      h('p', {}, '📥 Alle Pflicht-Unterlagen sind abgehakt – deine Zusammenfassung inkl. Schätzung ist bereit.'),
      h('button', { class: 'btn', onclick: () => downloadSummary(steps, est) }, '⬇️ Zusammenfassung & Schätzung herunterladen')
    );
  }

  function buildSummaryHtml(steps, est) {
    const familyLabel = (FAMILY_STATUS.find((f) => f.id === state.familyStatus) || {}).label || '';
    const situationLabels = SITUATIONS.filter((s) => state.situations.includes(s.id)).map((s) => s.label);

    const stepsHtml = steps.map((s) => {
      const docs = (s.documents || []).map((d) => {
        const e = state.docs[s.id] && state.docs[s.id][d.label];
        const checked = e && e.checked;
        return `<li>${checked ? '✅' : '⬜'} ${escapeXml(d.label)}${d.required ? ' <em>(nötig)</em>' : ''}</li>`;
      }).join('');
      return `<div class="step"><h3>${escapeXml(s.title)}</h3><p class="form">${escapeXml(s.form)}</p>${docs ? `<ul>${docs}</ul>` : ''}</div>`;
    }).join('');

    const estRows = [
      ['zu versteuerndes Einkommen (geschätzt)', formatEuro(est.zvE)],
      ['geschätzte Einkommensteuer', formatEuro(est.estIncomeTax)],
    ];
    if (est.kirchensteuer > 0) estRows.push(['geschätzte Kirchensteuer', formatEuro(est.kirchensteuer)]);
    if (est.soli > 0) estRows.push(['geschätzter Solidaritätszuschlag', formatEuro(est.soli)]);
    if (est.abgeltungsteuerGesamt > 0) estRows.push(['Abgeltungsteuer auf Kapitalerträge', formatEuro(est.abgeltungsteuerGesamt)]);
    estRows.push(['geschätzte Steuerlast insgesamt', formatEuro(est.gesamtSteuerlast)]);

    let diffLine = '';
    if (est.differenz !== null) {
      diffLine = est.differenz >= 0
        ? `<p><strong>Mögliche Erstattung (geschätzt): ${formatEuro(est.differenz)}</strong></p>`
        : `<p><strong>Mögliche Nachzahlung (geschätzt): ${formatEuro(-est.differenz)}</strong></p>`;
    }

    return `<!doctype html>
<html lang="de"><head><meta charset="UTF-8"><title>Steuercheckliste ${state.year}</title>
<style>
  body{font-family:"Segoe UI",Roboto,Arial,sans-serif;background:linear-gradient(160deg,#fff2cf,#ffb559);margin:0;padding:30px;color:#3a2400;}
  .sheet{max-width:760px;margin:0 auto;background:#fff;border-radius:20px;padding:32px;box-shadow:0 10px 24px rgba(163,69,0,0.25);}
  h1{color:#a34500;} h2{color:#a34500;margin-top:30px;} h3{margin-bottom:4px;}
  .form{color:#e85d00;font-weight:600;margin-top:0;}
  ul{margin-top:4px;}
  .disclaimer{background:#fff3cf;border:1px solid #ff9500;border-radius:12px;padding:14px 18px;font-size:0.85rem;margin-top:24px;}
  .fact{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0d9a8;}
</style></head>
<body><div class="sheet">
  <h1>Steuercheckliste ${state.year}</h1>
  <p><strong>Familienstand:</strong> ${escapeXml(familyLabel)}</p>
  <p><strong>Situation:</strong> ${escapeXml(situationLabels.join(', ') || '—')}</p>
  <h2>Unterlagen-Checkliste</h2>
  ${stepsHtml}
  <h2>🧮 Automatische Steuerschätzung (Richtwert)</h2>
  ${estRows.map(([l, v]) => `<div class="fact"><span>${escapeXml(l)}</span><strong>${v}</strong></div>`).join('')}
  ${diffLine}
  <div class="disclaimer">⚠️ Ungefährer Richtwert, keine verbindliche Steuerberechnung. Kann von deinem echten Steuerbescheid abweichen, u. a. wenn Werbungskosten oder andere absetzbare Posten nicht vollständig erfasst wurden. Ersetzt keine Steuerberatung. Reiche deine Erklärung über ELSTER ein oder lass sie von einer steuerberatenden Person prüfen.</div>
  <p style="margin-top:24px;font-size:0.75rem;color:#6b4a17;">Erstellt mit dem Steuerbescheid-Assistenten am ${new Date().toLocaleDateString('de-DE')}.</p>
</div></body></html>`;
  }

  function downloadSummary(steps, est) {
    const html = buildSummaryHtml(steps, est);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steuercheckliste-${state.year}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ---------- PWA: Service Worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  render();
})();
