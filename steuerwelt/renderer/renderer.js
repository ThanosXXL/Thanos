(function () {
  const MODULES = [
    { id: 'uebersicht', label: 'Übersicht', global: true },
    { id: 'mandanten', label: 'Mandanten', global: true },
    { id: 'fristen', label: 'Fristen', global: false },
    { id: 'dokumente', label: 'Dokumente', global: false },
    { id: 'zeiterfassung', label: 'Zeiterfassung', global: false },
    { id: 'rechnungen', label: 'Rechnungen', global: false },
    { id: 'notizen', label: 'Notizen', global: false }
  ];

  const DOKUMENT_KATEGORIEN = ['Eingangsrechnung', 'Ausgangsrechnung', 'Bescheid', 'Vertrag', 'Sonstiges'];
  const DEFAULT_VORLAGEN = ['USt-Voranmeldung', 'Lohnsteueranmeldung', 'Jahresabschluss', 'Einkommensteuererklärung'];

  let state = { mandanten: [], fristenVorlagen: [], users: [] };
  let activeModule = 'uebersicht';
  let activeMandantId = null;
  let currentUserId = null;
  let mandantFilter = '';
  let runningTimer = null; // { mandantId, startedAt }

  const el = (id) => document.getElementById(id);
  const modalRoot = el('modalRoot');
  const content = el('content');

  // ---------- Hilfsfunktionen ----------

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function persist() {
    window.dashboardAPI.saveData(state);
  }

  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function formatDate(iso) {
    if (!iso) return '–';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '–';
    return d.toLocaleDateString('de-DE');
  }

  function formatDateTime(iso) {
    if (!iso) return '–';
    const d = new Date(iso);
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  }

  function formatMinutes(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h} Std. ${m} Min.` : `${m} Min.`;
  }

  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function daysUntil(iso) {
    if (!iso) return null;
    const target = new Date(iso);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - startOfToday()) / 86400000);
  }

  function findMandant(id) {
    return state.mandanten.find((m) => m.id === id);
  }

  function touchMandant(mandant) {
    mandant.lastEditedAt = new Date().toISOString();
  }

  function currentUser() {
    return state.users.find((u) => u.id === currentUserId) || null;
  }

  function el2(tag, opts) {
    const node = document.createElement(tag);
    if (!opts) return node;
    if (opts.className) node.className = opts.className;
    if (opts.text !== undefined) node.textContent = opts.text;
    if (opts.attrs) Object.entries(opts.attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  // ---------- Generisches Modal ----------

  function closeModal() {
    modalRoot.innerHTML = '';
  }

  function openModal(title, buildBody, onConfirm, confirmLabel) {
    modalRoot.innerHTML = '';
    const overlay = el2('div', { className: 'modal-overlay' });
    const card = el2('div', { className: 'modal-card' });
    const h2 = el2('h2', { text: title });
    card.appendChild(h2);

    const body = el2('div');
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.gap = '10px';
    const getValues = buildBody(body);
    card.appendChild(body);

    const actions = el2('div', { className: 'modal-actions' });
    const cancelBtn = el2('button', { className: 'btn-3d ghost small', text: 'Abbrechen' });
    cancelBtn.addEventListener('click', closeModal);
    const okBtn = el2('button', { className: 'btn-3d small', text: confirmLabel || 'Speichern' });
    okBtn.addEventListener('click', () => onConfirm(getValues(), closeModal));
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    card.appendChild(actions);

    overlay.appendChild(card);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    modalRoot.appendChild(overlay);
  }

  function confirmDialog(message, onConfirm) {
    openModal(
      'Bitte bestätigen',
      (body) => {
        body.appendChild(el2('p', { text: message }));
        return () => true;
      },
      () => {
        onConfirm();
        closeModal();
      },
      'Löschen'
    );
  }

  function labeledInput(body, labelText, inputAttrs) {
    body.appendChild(el2('label', { text: labelText }));
    const input = el2('input', { attrs: inputAttrs || {} });
    body.appendChild(input);
    return input;
  }

  function labeledSelect(body, labelText, options, selected) {
    body.appendChild(el2('label', { text: labelText }));
    const select = el2('select');
    options.forEach((opt) => {
      const o = el2('option', { text: opt.label !== undefined ? opt.label : opt });
      o.value = opt.value !== undefined ? opt.value : opt;
      if (o.value === selected) o.selected = true;
      select.appendChild(o);
    });
    body.appendChild(select);
    return select;
  }

  // ---------- Bildschirm 1: Lizenz ----------

  async function initLicenseScreen() {
    const status = await window.licenseAPI.status();
    if (status.activated) {
      if (status.warning) {
        console.warn(status.warning);
      }
      startUserScreen();
      return;
    }
    el('screen-license').hidden = false;
    if (status.reason) {
      showLicenseError(status.reason);
    }
  }

  function showLicenseError(message) {
    const box = el('licenseError');
    box.textContent = message;
    box.hidden = false;
  }

  async function handleActivate() {
    const key = el('licenseKeyInput').value;
    const btn = el('activateBtn');
    btn.disabled = true;
    btn.textContent = 'Prüfe…';
    const result = await window.licenseAPI.activate(key);
    btn.disabled = false;
    btn.textContent = 'Aktivieren';
    if (!result.ok) {
      showLicenseError(result.error || 'Aktivierung fehlgeschlagen.');
      return;
    }
    el('screen-license').hidden = true;
    startUserScreen();
  }

  // ---------- Bildschirm 2: Benutzerkennung ----------

  function startUserScreen() {
    el('screen-user').hidden = false;
    renderUserList();
  }

  function renderUserList() {
    const list = el('userList');
    list.innerHTML = '';
    if (!state.users.length) {
      list.appendChild(el2('p', { text: 'Noch niemand angelegt — leg dein Profil an.' }));
      return;
    }
    state.users.forEach((u) => {
      const row = el2('div', { className: 'user-row' });
      row.appendChild(el2('span', { className: 'name', text: u.name }));

      const pinInput = el2('input', {
        className: 'field-input small',
        attrs: { type: 'password', inputmode: 'numeric', placeholder: 'PIN', maxlength: '8' }
      });
      const loginBtn = el2('button', { className: 'btn-3d small', text: 'Los' });
      loginBtn.addEventListener('click', () => attemptLogin(u, pinInput.value));
      pinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') attemptLogin(u, pinInput.value);
      });

      row.appendChild(pinInput);
      row.appendChild(loginBtn);
      list.appendChild(row);
    });
  }

  async function attemptLogin(user, pin) {
    const hash = await sha256Hex(user.pinSalt + pin);
    if (hash !== user.pinHash) {
      alert('PIN stimmt nicht.');
      return;
    }
    currentUserId = user.id;
    enterApp();
  }

  function openNewUserModal() {
    openModal(
      'Neues Profil',
      (body) => {
        const name = labeledInput(body, 'Name', { type: 'text', placeholder: 'z. B. Anna Beispiel' });
        const pin = labeledInput(body, 'PIN (4–8 Ziffern)', { type: 'password', inputmode: 'numeric', maxlength: '8' });
        return () => ({ name: name.value.trim(), pin: pin.value.trim() });
      },
      async ({ name, pin }, close) => {
        if (!name || !/^\d{4,8}$/.test(pin)) {
          alert('Bitte einen Namen und eine 4- bis 8-stellige PIN eingeben.');
          return;
        }
        const salt = uid();
        const hash = await sha256Hex(salt + pin);
        const user = { id: uid(), name, pinSalt: salt, pinHash: hash };
        state.users.push(user);
        persist();
        currentUserId = user.id;
        close();
        enterApp();
      },
      'Anlegen'
    );
  }

  // ---------- Bildschirm 3: App ----------

  function enterApp() {
    el('screen-user').hidden = true;
    el('app-shell').hidden = false;
    renderModuleTabs();
    updateUserBadge();
    renderSidebar();
    renderContent();
  }

  function switchUser() {
    currentUserId = null;
    activeMandantId = null;
    el('app-shell').hidden = true;
    el('screen-user').hidden = false;
    renderUserList();
  }

  function updateUserBadge() {
    const u = currentUser();
    el('userBadge').textContent = (u ? u.name : '?') + ' ⇄';
  }

  function renderModuleTabs() {
    const nav = el('moduleTabs');
    nav.innerHTML = '';
    MODULES.forEach((mod) => {
      const btn = el2('button', { className: 'module-tab' + (mod.id === activeModule ? ' active' : ''), text: mod.label });
      btn.addEventListener('click', () => {
        activeModule = mod.id;
        renderModuleTabs();
        renderContent();
      });
      nav.appendChild(btn);
    });
  }

  function renderSidebar() {
    const list = el('mandantenList');
    list.innerHTML = '';
    const q = mandantFilter.trim().toLowerCase();
    const sorted = [...state.mandanten].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    const filtered = q ? sorted.filter((m) => m.name.toLowerCase().includes(q)) : sorted;

    if (!filtered.length) {
      list.appendChild(el2('div', { className: 'empty-hint', text: q ? 'Keine Treffer.' : 'Noch keine Mandanten.' }));
      return;
    }

    filtered.forEach((m) => {
      const row = el2('div', {
        className: 'mandant-row' + (m.id === activeMandantId ? ' active' : '') + (m.status === 'ehemalig' ? ' inactive' : '')
      });
      const nameCol = el2('div');
      nameCol.appendChild(el2('div', { className: 'm-name', text: m.name }));
      nameCol.appendChild(el2('div', { className: 'm-sub', text: m.rechtsform || 'Ohne Rechtsform' }));
      row.appendChild(nameCol);
      row.addEventListener('click', () => {
        activeMandantId = m.id;
        if (MODULES.find((x) => x.id === activeModule && x.global)) {
          // globales Modul bleibt aktiv
        }
        renderSidebar();
        renderContent();
      });
      list.appendChild(row);
    });
  }

  function renderContent() {
    content.innerHTML = '';
    const modDef = MODULES.find((m) => m.id === activeModule);

    if (!modDef.global && !activeMandantId) {
      const empty = el2('div', { className: 'empty-state' });
      empty.appendChild(el2('p', { text: 'Bitte links einen Mandanten auswählen.' }));
      content.appendChild(empty);
      return;
    }

    const mandant = activeMandantId ? findMandant(activeMandantId) : null;
    if (!modDef.global && !mandant) {
      activeMandantId = null;
      renderSidebar();
      renderContent();
      return;
    }

    switch (activeModule) {
      case 'uebersicht': return renderUebersicht();
      case 'mandanten': return renderMandantenModul();
      case 'fristen': return renderFristenModul(mandant);
      case 'dokumente': return renderDokumenteModul(mandant);
      case 'zeiterfassung': return renderZeiterfassungModul(mandant);
      case 'rechnungen': return renderRechnungenModul(mandant);
      case 'notizen': return renderNotizenModul(mandant);
    }
  }

  // ---------- Modul: Übersicht ----------

  function renderUebersicht() {
    const head = el2('div', { className: 'page-head' });
    head.appendChild(el2('h1', { text: 'Übersicht' }));
    content.appendChild(head);

    let dueSoon = 0;
    let overdueRechnungen = 0;
    let minutesToday = 0;
    const today = new Date().toISOString().slice(0, 10);

    state.mandanten.forEach((m) => {
      (m.fristen || []).forEach((f) => {
        if (f.done) return;
        const d = daysUntil(f.dueDate);
        if (d !== null && d <= 7) dueSoon++;
      });
      (m.rechnungen || []).forEach((r) => {
        if (r.status !== 'bezahlt' && r.faelligkeitsdatum && daysUntil(r.faelligkeitsdatum) < 0) overdueRechnungen++;
      });
      (m.zeiten || []).forEach((z) => {
        if (z.userId === currentUserId && z.date === today) minutesToday += z.minutes;
      });
    });

    const grid = el2('div', { className: 'card-grid' });
    grid.appendChild(statTile('Fällige Fristen', String(dueSoon), 'nächste 7 Tage, über alle Mandanten'));
    grid.appendChild(statTile('Überfällige Rechnungen', String(overdueRechnungen), 'noch offen'));
    grid.appendChild(statTile('Heute erfasst', formatMinutes(minutesToday), currentUser() ? currentUser().name : ''));
    grid.appendChild(statTile('Mandanten gesamt', String(state.mandanten.length), 'kein Limit'));
    content.appendChild(grid);

    const recentBlock = el2('div', { className: 'section-block' });
    recentBlock.appendChild(el2('h2', { text: 'Zuletzt bearbeitet' }));
    const panel = el2('div', { className: 'list-panel' });
    const ul = el2('ul', { className: 'item-list' });
    const recent = [...state.mandanten]
      .filter((m) => m.lastEditedAt)
      .sort((a, b) => new Date(b.lastEditedAt) - new Date(a.lastEditedAt))
      .slice(0, 6);
    if (!recent.length) {
      panel.appendChild(el2('div', { className: 'empty-hint', text: 'Noch keine Aktivität.' }));
    } else {
      recent.forEach((m) => {
        const li = el2('li');
        const span = el2('span', { className: 'item-text', text: m.name });
        const meta = el2('span', { className: 'item-meta', text: formatDateTime(m.lastEditedAt) });
        li.appendChild(span);
        li.appendChild(meta);
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
          activeMandantId = m.id;
          activeModule = 'mandanten';
          renderModuleTabs();
          renderSidebar();
          renderContent();
        });
        ul.appendChild(li);
      });
      panel.appendChild(ul);
    }
    recentBlock.appendChild(panel);
    content.appendChild(recentBlock);
  }

  function statTile(title, big, sub) {
    const tile = el2('div', { className: 'tile' });
    tile.appendChild(el2('h3', { text: title }));
    tile.appendChild(el2('div', { className: 'big', text: big }));
    if (sub) tile.appendChild(el2('div', { className: 'sub', text: sub }));
    return tile;
  }

  // ---------- Modul: Mandanten ----------

  function renderMandantenModul() {
    const head = el2('div', { className: 'page-head' });
    head.appendChild(el2('h1', { text: 'Mandanten' }));
    head.appendChild(el2('p', { text: `${state.mandanten.length} insgesamt` }));
    content.appendChild(head);

    const panel = el2('div', { className: 'list-panel' });
    const table = el2('table', { className: 'data-table' });
    const thead = el2('thead');
    const headRow = el2('tr');
    ['Name', 'Rechtsform', 'Steuernummer', 'Status', ''].forEach((h) => headRow.appendChild(el2('th', { text: h })));
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el2('tbody');
    if (!state.mandanten.length) {
      const tr = el2('tr');
      const td = el2('td', { text: 'Noch keine Mandanten angelegt.' });
      td.colSpan = 5;
      td.className = 'empty-hint';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    [...state.mandanten]
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .forEach((m) => {
        const tr = el2('tr');
        const nameTd = el2('td', { text: m.name });
        nameTd.style.cursor = 'pointer';
        nameTd.style.fontWeight = '700';
        nameTd.addEventListener('click', () => openEditMandantModal(m));
        tr.appendChild(nameTd);
        tr.appendChild(el2('td', { text: m.rechtsform || '–' }));
        tr.appendChild(el2('td', { text: m.steuernummer || '–' }));
        const statusTd = el2('td');
        statusTd.appendChild(pillNode(m.status === 'ehemalig' ? 'neutral' : 'good', m.status === 'ehemalig' ? 'Ehemalig' : 'Aktiv'));
        tr.appendChild(statusTd);
        const actionsTd = el2('td');
        const editBtn = el2('button', { className: 'icon-btn', text: '✎' });
        editBtn.title = 'Bearbeiten';
        editBtn.addEventListener('click', () => openEditMandantModal(m));
        const delBtn = el2('button', { className: 'icon-btn danger', text: '✕' });
        delBtn.title = 'Löschen';
        delBtn.addEventListener('click', () => {
          confirmDialog(`"${m.name}" wirklich löschen? Alle Fristen, Dokumente, Zeiten, Rechnungen und Notizen gehen verloren.`, () => {
            state.mandanten = state.mandanten.filter((x) => x.id !== m.id);
            if (activeMandantId === m.id) activeMandantId = null;
            persist();
            renderSidebar();
            renderContent();
          });
        });
        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(delBtn);
        tr.appendChild(actionsTd);
        tbody.appendChild(tr);
      });

    table.appendChild(tbody);
    panel.appendChild(table);
    content.appendChild(panel);
  }

  function pillNode(cls, text) {
    return el2('span', { className: 'pill ' + cls, text });
  }

  function openAddMandantModal() {
    openModal(
      'Neuer Mandant',
      (body) => {
        const name = labeledInput(body, 'Name', { type: 'text', placeholder: 'z. B. Müller GmbH' });
        const rechtsform = labeledSelect(body, 'Rechtsform', ['Einzelunternehmen', 'GbR', 'GmbH', 'UG', 'AG', 'Freiberufler', 'Sonstige'], 'Einzelunternehmen');
        const steuernummer = labeledInput(body, 'Steuernummer', { type: 'text', placeholder: 'optional' });
        const email = labeledInput(body, 'E-Mail', { type: 'email', placeholder: 'optional' });
        const telefon = labeledInput(body, 'Telefon', { type: 'text', placeholder: 'optional' });
        return () => ({
          name: name.value.trim(),
          rechtsform: rechtsform.value,
          steuernummer: steuernummer.value.trim(),
          email: email.value.trim(),
          telefon: telefon.value.trim()
        });
      },
      (values, close) => {
        if (!values.name) return alert('Bitte einen Namen eingeben.');
        const mandant = {
          id: uid(),
          name: values.name,
          rechtsform: values.rechtsform,
          steuernummer: values.steuernummer,
          email: values.email,
          telefon: values.telefon,
          status: 'aktiv',
          lastEditedAt: new Date().toISOString(),
          fristen: [],
          dokumente: [],
          zeiten: [],
          rechnungen: [],
          chat: []
        };
        state.mandanten.push(mandant);
        activeMandantId = mandant.id;
        persist();
        close();
        renderSidebar();
        renderContent();
      },
      'Anlegen'
    );
  }

  function openEditMandantModal(m) {
    openModal(
      'Mandant bearbeiten',
      (body) => {
        const name = labeledInput(body, 'Name', { type: 'text' });
        name.value = m.name;
        const rechtsform = labeledSelect(body, 'Rechtsform', ['Einzelunternehmen', 'GbR', 'GmbH', 'UG', 'AG', 'Freiberufler', 'Sonstige'], m.rechtsform);
        const steuernummer = labeledInput(body, 'Steuernummer', { type: 'text' });
        steuernummer.value = m.steuernummer || '';
        const email = labeledInput(body, 'E-Mail', { type: 'email' });
        email.value = m.email || '';
        const telefon = labeledInput(body, 'Telefon', { type: 'text' });
        telefon.value = m.telefon || '';
        const status = labeledSelect(body, 'Status', [{ value: 'aktiv', label: 'Aktiv' }, { value: 'ehemalig', label: 'Ehemalig' }], m.status);
        return () => ({
          name: name.value.trim(),
          rechtsform: rechtsform.value,
          steuernummer: steuernummer.value.trim(),
          email: email.value.trim(),
          telefon: telefon.value.trim(),
          status: status.value
        });
      },
      (values, close) => {
        if (!values.name) return alert('Bitte einen Namen eingeben.');
        Object.assign(m, values);
        touchMandant(m);
        persist();
        close();
        renderSidebar();
        renderContent();
      },
      'Speichern'
    );
  }

  // ---------- Modul: Fristen ----------

  function fristPill(f) {
    if (f.done) return ['good', 'Erledigt'];
    const d = daysUntil(f.dueDate);
    if (d === null) return ['neutral', 'Ohne Frist'];
    if (d < 0) return ['crit', 'Überfällig'];
    if (d <= 3) return ['crit', d === 0 ? 'Heute fällig' : `in ${d} Tag(en)`];
    if (d <= 10) return ['warn', `in ${d} Tag(en)`];
    return ['neutral', formatDate(f.dueDate)];
  }

  function renderFristenModul(mandant) {
    const head = el2('div', { className: 'page-head' });
    head.appendChild(el2('h1', { text: 'Fristen – ' + mandant.name }));
    content.appendChild(head);

    const vorlagenBlock = el2('div', { className: 'section-block' });
    vorlagenBlock.appendChild(el2('h2', { text: 'Vorlagen für wiederkehrende Fristen' }));
    const chips = el2('div');
    chips.style.display = 'flex';
    chips.style.flexWrap = 'wrap';
    chips.style.gap = '8px';
    const vorlagen = state.fristenVorlagen.length ? state.fristenVorlagen : DEFAULT_VORLAGEN.map((t) => ({ id: uid(), titel: t }));
    if (!state.fristenVorlagen.length) {
      state.fristenVorlagen = vorlagen;
      persist();
    }
    vorlagen.forEach((v) => {
      const chip = el2('button', { className: 'btn-3d ghost small', text: v.titel });
      chip.addEventListener('click', () => openVorlageDueDateModal(mandant, v.titel));
      chips.appendChild(chip);
    });
    const addVorlageChip = el2('button', { className: 'btn-3d ghost small', text: '+ Vorlage' });
    addVorlageChip.addEventListener('click', openAddVorlageModal);
    chips.appendChild(addVorlageChip);
    vorlagenBlock.appendChild(chips);
    content.appendChild(vorlagenBlock);

    const panel = el2('div', { className: 'list-panel' });
    const addRow = el2('div', { className: 'add-row' });
    const textInput = el2('input', { attrs: { type: 'text', placeholder: 'Neue Frist…' } });
    const dateInput = el2('input', { attrs: { type: 'date' } });
    const addBtn = el2('button', { className: 'btn-3d small', text: '+' });
    addBtn.addEventListener('click', () => {
      addFrist(mandant, textInput.value, dateInput.value);
      textInput.value = '';
      dateInput.value = '';
    });
    textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBtn.click(); });
    addRow.appendChild(textInput);
    addRow.appendChild(dateInput);
    addRow.appendChild(addBtn);
    panel.appendChild(addRow);

    const ul = el2('ul', { className: 'item-list' });
    const sorted = [...(mandant.fristen || [])].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    });
    if (!sorted.length) {
      ul.appendChild(el2('li', { text: '' }));
      ul.lastChild.remove();
      panel.appendChild(el2('div', { className: 'empty-hint', text: 'Keine Fristen erfasst.' }));
    } else {
      sorted.forEach((f) => {
        const li = el2('li');
        if (f.done) li.classList.add('completed');
        const checkbox = el2('input', { attrs: { type: 'checkbox' } });
        checkbox.checked = f.done;
        checkbox.addEventListener('change', () => {
          f.done = checkbox.checked;
          touchMandant(mandant);
          persist();
          renderContent();
        });
        const span = el2('span', { className: 'item-text', text: f.text });
        const [cls, label] = fristPill(f);
        const pill = pillNode(cls, label);
        const delBtn = el2('button', { className: 'icon-btn danger', text: '✕' });
        delBtn.addEventListener('click', () => {
          mandant.fristen = mandant.fristen.filter((x) => x.id !== f.id);
          touchMandant(mandant);
          persist();
          renderContent();
        });
        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(pill);
        li.appendChild(delBtn);
        ul.appendChild(li);
      });
      panel.appendChild(ul);
    }
    content.appendChild(panel);
  }

  function addFrist(mandant, text, dueDate) {
    if (!text.trim()) return;
    mandant.fristen = mandant.fristen || [];
    mandant.fristen.push({ id: uid(), text: text.trim(), dueDate: dueDate || null, done: false });
    touchMandant(mandant);
    persist();
    renderContent();
  }

  function openVorlageDueDateModal(mandant, titel) {
    openModal(
      titel,
      (body) => {
        const date = labeledInput(body, 'Fällig am', { type: 'date' });
        return () => date.value;
      },
      (dueDate, close) => {
        addFrist(mandant, titel, dueDate);
        close();
      },
      'Frist anlegen'
    );
  }

  function openAddVorlageModal() {
    openModal(
      'Neue Vorlage',
      (body) => {
        const titel = labeledInput(body, 'Titel', { type: 'text', placeholder: 'z. B. Gewerbesteuererklärung' });
        return () => titel.value.trim();
      },
      (titel, close) => {
        if (!titel) return;
        state.fristenVorlagen.push({ id: uid(), titel });
        persist();
        close();
        renderContent();
      },
      'Hinzufügen'
    );
  }

  // ---------- Modul: Dokumente ----------

  function renderDokumenteModul(mandant) {
    const head = el2('div', { className: 'page-head' });
    head.appendChild(el2('h1', { text: 'Dokumente – ' + mandant.name }));
    content.appendChild(head);

    const panel = el2('div', { className: 'list-panel' });
    const addRow = el2('div', { className: 'add-row' });
    const nameInput = el2('input', { attrs: { type: 'text', placeholder: 'Bezeichnung…' } });
    const katSelect = el2('select');
    DOKUMENT_KATEGORIEN.forEach((k) => katSelect.appendChild(el2('option', { text: k })));
    const chooseBtn = el2('button', { className: 'btn-3d ghost small', text: 'Datei wählen…' });
    let chosenPath = null;
    const pathLabel = el2('span', { className: 'item-meta', text: 'Keine Datei gewählt' });
    chooseBtn.addEventListener('click', async () => {
      const filePath = await window.documentsAPI.chooseFile();
      if (filePath) {
        chosenPath = filePath;
        pathLabel.textContent = filePath.split(/[\\/]/).pop();
        if (!nameInput.value) nameInput.value = pathLabel.textContent;
      }
    });
    const addBtn = el2('button', { className: 'btn-3d small', text: '+' });
    addBtn.addEventListener('click', () => {
      if (!nameInput.value.trim()) return;
      mandant.dokumente = mandant.dokumente || [];
      mandant.dokumente.push({
        id: uid(),
        name: nameInput.value.trim(),
        kategorie: katSelect.value,
        filePath: chosenPath,
        addedAt: new Date().toISOString()
      });
      touchMandant(mandant);
      persist();
      renderContent();
    });
    addRow.appendChild(nameInput);
    addRow.appendChild(katSelect);
    addRow.appendChild(chooseBtn);
    addRow.appendChild(pathLabel);
    addRow.appendChild(addBtn);
    panel.appendChild(addRow);

    const ul = el2('ul', { className: 'item-list' });
    const docs = [...(mandant.dokumente || [])].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    if (!docs.length) {
      panel.appendChild(el2('div', { className: 'empty-hint', text: 'Noch keine Dokumente hinterlegt.' }));
    } else {
      docs.forEach((d) => {
        const li = el2('li');
        const span = el2('span', { className: 'item-text', text: d.name });
        if (d.filePath) {
          span.style.cursor = 'pointer';
          span.style.textDecoration = 'underline';
          span.addEventListener('click', () => window.documentsAPI.openFile(d.filePath));
        }
        li.appendChild(span);
        li.appendChild(pillNode('neutral', d.kategorie));
        li.appendChild(el2('span', { className: 'item-meta', text: formatDate(d.addedAt) }));
        const delBtn = el2('button', { className: 'icon-btn danger', text: '✕' });
        delBtn.addEventListener('click', () => {
          mandant.dokumente = mandant.dokumente.filter((x) => x.id !== d.id);
          touchMandant(mandant);
          persist();
          renderContent();
        });
        li.appendChild(delBtn);
        ul.appendChild(li);
      });
      panel.appendChild(ul);
    }
    content.appendChild(panel);
  }

  // ---------- Modul: Zeiterfassung ----------

  function renderZeiterfassungModul(mandant) {
    const head = el2('div', { className: 'page-head' });
    head.appendChild(el2('h1', { text: 'Zeiterfassung – ' + mandant.name }));
    content.appendChild(head);

    const timerBlock = el2('div', { className: 'section-block' });
    const isRunningHere = runningTimer && runningTimer.mandantId === mandant.id;
    const timerBtn = el2('button', {
      className: 'btn-3d' + (isRunningHere ? ' danger' : ''),
      text: isRunningHere ? 'Timer stoppen' : 'Timer starten'
    });
    timerBtn.addEventListener('click', () => {
      if (isRunningHere) {
        stopTimer(mandant);
      } else {
        runningTimer = { mandantId: mandant.id, startedAt: Date.now() };
        renderContent();
      }
    });
    timerBlock.appendChild(timerBtn);
    if (runningTimer && runningTimer.mandantId !== mandant.id) {
      timerBlock.appendChild(el2('p', { className: 'item-meta', text: 'Für einen anderen Mandanten läuft bereits ein Timer.' }));
    }
    content.appendChild(timerBlock);

    const panel = el2('div', { className: 'list-panel' });
    const addRow = el2('div', { className: 'add-row' });
    const textInput = el2('input', { attrs: { type: 'text', placeholder: 'Tätigkeit…' } });
    const minutesInput = el2('input', { attrs: { type: 'number', min: '1', placeholder: 'Minuten' } });
    const dateInput = el2('input', { attrs: { type: 'date' } });
    dateInput.value = new Date().toISOString().slice(0, 10);
    const addBtn = el2('button', { className: 'btn-3d small', text: '+' });
    addBtn.addEventListener('click', () => {
      const minutes = Number(minutesInput.value);
      if (!textInput.value.trim() || !minutes || minutes <= 0) return;
      mandant.zeiten = mandant.zeiten || [];
      mandant.zeiten.push({ id: uid(), text: textInput.value.trim(), minutes, date: dateInput.value, userId: currentUserId });
      touchMandant(mandant);
      persist();
      textInput.value = '';
      minutesInput.value = '';
      renderContent();
    });
    addRow.appendChild(textInput);
    addRow.appendChild(minutesInput);
    addRow.appendChild(dateInput);
    addRow.appendChild(addBtn);
    panel.appendChild(addRow);

    const ul = el2('ul', { className: 'item-list' });
    const entries = [...(mandant.zeiten || [])].sort((a, b) => b.date.localeCompare(a.date));
    let totalMinutes = 0;
    entries.forEach((z) => (totalMinutes += z.minutes));

    if (!entries.length) {
      panel.appendChild(el2('div', { className: 'empty-hint', text: 'Noch keine Zeiten erfasst.' }));
    } else {
      entries.forEach((z) => {
        const li = el2('li');
        const user = state.users.find((u) => u.id === z.userId);
        li.appendChild(el2('span', { className: 'item-text', text: z.text + (user ? ' — ' + user.name : '') }));
        li.appendChild(el2('span', { className: 'item-meta', text: formatMinutes(z.minutes) }));
        li.appendChild(el2('span', { className: 'item-meta', text: formatDate(z.date) }));
        const delBtn = el2('button', { className: 'icon-btn danger', text: '✕' });
        delBtn.addEventListener('click', () => {
          mandant.zeiten = mandant.zeiten.filter((x) => x.id !== z.id);
          touchMandant(mandant);
          persist();
          renderContent();
        });
        li.appendChild(delBtn);
        ul.appendChild(li);
      });
      panel.appendChild(ul);
    }
    content.appendChild(panel);

    const sumTile = el2('div', { className: 'card-grid' });
    sumTile.appendChild(statTile('Gesamt erfasst', formatMinutes(totalMinutes), 'dieser Mandant'));
    content.appendChild(sumTile);
  }

  function stopTimer(mandant) {
    const elapsedMs = Date.now() - runningTimer.startedAt;
    const minutes = Math.max(1, Math.round(elapsedMs / 60000));
    runningTimer = null;
    openModal(
      'Timer gestoppt',
      (body) => {
        body.appendChild(el2('p', { text: `Erfasste Zeit: ${formatMinutes(minutes)}` }));
        const text = labeledInput(body, 'Tätigkeit', { type: 'text', placeholder: 'Was wurde bearbeitet?' });
        return () => text.value.trim();
      },
      (text, close) => {
        mandant.zeiten = mandant.zeiten || [];
        mandant.zeiten.push({
          id: uid(),
          text: text || 'Erfasste Zeit',
          minutes,
          date: new Date().toISOString().slice(0, 10),
          userId: currentUserId
        });
        touchMandant(mandant);
        persist();
        close();
        renderContent();
      },
      'Eintrag speichern'
    );
  }

  // ---------- Modul: Rechnungen ----------

  function invoiceDisplayStatus(inv) {
    if (inv.status === 'bezahlt') return 'bezahlt';
    if (inv.faelligkeitsdatum && daysUntil(inv.faelligkeitsdatum) < 0) return 'ueberfaellig';
    return 'offen';
  }

  function invoicePillFor(displayStatus) {
    if (displayStatus === 'bezahlt') return ['good', 'Bezahlt'];
    if (displayStatus === 'ueberfaellig') return ['crit', 'Überfällig'];
    return ['warn', 'Offen'];
  }

  function invoiceTotal(inv) {
    if (inv.positionen && inv.positionen.length) {
      return inv.positionen.reduce((sum, p) => sum + (Number(p.betrag) || 0), 0);
    }
    return Number(inv.betrag) || 0;
  }

  function renderRechnungenModul(mandant) {
    const head = el2('div', { className: 'page-head' });
    head.appendChild(el2('h1', { text: 'Rechnungen – ' + mandant.name }));
    const addBtn = el2('button', { className: 'btn-3d small', text: '+ Neue Rechnung' });
    addBtn.addEventListener('click', () => openAddInvoiceModal(mandant));
    head.appendChild(addBtn);
    content.appendChild(head);

    const panel = el2('div', { className: 'list-panel' });
    const table = el2('table', { className: 'data-table' });
    const thead = el2('thead');
    const headRow = el2('tr');
    ['Nummer', 'Datum', 'Fällig', 'Betrag', 'Status', ''].forEach((h) => headRow.appendChild(el2('th', { text: h })));
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = el2('tbody');

    const invoices = [...(mandant.rechnungen || [])].sort((a, b) => b.datum.localeCompare(a.datum));
    if (!invoices.length) {
      const tr = el2('tr');
      const td = el2('td', { text: 'Noch keine Rechnungen.' });
      td.colSpan = 6;
      td.className = 'empty-hint';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    invoices.forEach((inv) => {
      const tr = el2('tr');
      tr.appendChild(el2('td', { text: inv.nummer }));
      tr.appendChild(el2('td', { text: formatDate(inv.datum) }));
      tr.appendChild(el2('td', { text: formatDate(inv.faelligkeitsdatum) }));
      const betragTd = el2('td', { className: 'num', text: formatCurrency(invoiceTotal(inv)) });
      tr.appendChild(betragTd);
      const statusTd = el2('td');
      const displayStatus = invoiceDisplayStatus(inv);
      const [cls, label] = invoicePillFor(displayStatus);
      statusTd.appendChild(pillNode(cls, label));
      tr.appendChild(statusTd);

      const actionsTd = el2('td');
      if (inv.status !== 'bezahlt') {
        const payBtn = el2('button', { className: 'icon-btn', text: '✓' });
        payBtn.title = 'Als bezahlt markieren';
        payBtn.addEventListener('click', () => {
          inv.status = 'bezahlt';
          touchMandant(mandant);
          persist();
          renderContent();
        });
        actionsTd.appendChild(payBtn);
      }
      const pdfBtn = el2('button', { className: 'icon-btn', text: '⤓' });
      pdfBtn.title = 'Als PDF exportieren';
      pdfBtn.addEventListener('click', () => exportInvoicePdf(mandant, inv));
      actionsTd.appendChild(pdfBtn);
      const delBtn = el2('button', { className: 'icon-btn danger', text: '✕' });
      delBtn.addEventListener('click', () => {
        mandant.rechnungen = mandant.rechnungen.filter((x) => x.id !== inv.id);
        touchMandant(mandant);
        persist();
        renderContent();
      });
      actionsTd.appendChild(delBtn);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    panel.appendChild(table);
    content.appendChild(panel);
  }

  function nextInvoiceNumber(mandant) {
    const year = new Date().getFullYear();
    const countThisYear = (mandant.rechnungen || []).filter((r) => r.nummer && r.nummer.includes(String(year))).length;
    return `${year}-${String(countThisYear + 1).padStart(3, '0')}`;
  }

  function openAddInvoiceModal(mandant) {
    openModal(
      'Neue Rechnung',
      (body) => {
        const nummer = labeledInput(body, 'Nummer', { type: 'text' });
        nummer.value = nextInvoiceNumber(mandant);
        const datum = labeledInput(body, 'Rechnungsdatum', { type: 'date' });
        datum.value = new Date().toISOString().slice(0, 10);
        const faellig = labeledInput(body, 'Fällig am', { type: 'date' });
        const positionText = labeledInput(body, 'Position (Beschreibung)', { type: 'text', placeholder: 'z. B. Buchführung Juli' });
        const positionBetrag = labeledInput(body, 'Betrag (€)', { type: 'number', step: '0.01', min: '0' });
        return () => ({
          nummer: nummer.value.trim(),
          datum: datum.value,
          faelligkeitsdatum: faellig.value,
          positionText: positionText.value.trim(),
          positionBetrag: Number(positionBetrag.value)
        });
      },
      (values, close) => {
        if (!values.nummer || !values.datum || !values.positionBetrag) {
          alert('Bitte Nummer, Datum und einen Betrag angeben.');
          return;
        }
        mandant.rechnungen = mandant.rechnungen || [];
        mandant.rechnungen.push({
          id: uid(),
          nummer: values.nummer,
          datum: values.datum,
          faelligkeitsdatum: values.faelligkeitsdatum || null,
          status: 'offen',
          positionen: [{ text: values.positionText || 'Honorar', betrag: values.positionBetrag }]
        });
        touchMandant(mandant);
        persist();
        close();
        renderContent();
      },
      'Erstellen'
    );
  }

  function invoiceHtml(mandant, inv) {
    const rows = (inv.positionen || [])
      .map((p) => `<tr><td>${escapeHtml(p.text)}</td><td style="text-align:right">${formatCurrency(p.betrag)}</td></tr>`)
      .join('');
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      body { font-family: Helvetica, Arial, sans-serif; color: #0a2540; padding: 40px; }
      h1 { color: #0a2f6b; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      th, td { padding: 8px 6px; border-bottom: 1px solid #d7e8ff; text-align: left; }
      .total { font-weight: bold; font-size: 1.1em; }
      .meta { color: #35507e; font-size: 0.9em; margin-bottom: 20px; }
    </style></head><body>
      <h1>SteuerWelt</h1>
      <div class="meta">Rechnung ${escapeHtml(inv.nummer)} &middot; ${formatDate(inv.datum)}</div>
      <div class="meta">An: ${escapeHtml(mandant.name)}</div>
      <table>
        <thead><tr><th>Position</th><th style="text-align:right">Betrag</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total"><td>Gesamt</td><td style="text-align:right">${formatCurrency(invoiceTotal(inv))}</td></tr></tfoot>
      </table>
    </body></html>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function exportInvoicePdf(mandant, inv) {
    const html = invoiceHtml(mandant, inv);
    await window.invoiceAPI.exportPdf(html, `Rechnung-${inv.nummer}.pdf`);
  }

  // ---------- Modul: Notizen ----------

  function renderNotizenModul(mandant) {
    const head = el2('div', { className: 'page-head' });
    head.appendChild(el2('h1', { text: 'Notizen – ' + mandant.name }));
    content.appendChild(head);

    const panel = el2('div', { className: 'list-panel' });
    const messages = el2('div', { className: 'chat-messages' });
    (mandant.chat || []).forEach((msg) => {
      const bubble = el2('div', { className: 'chat-bubble' });
      const user = state.users.find((u) => u.id === msg.userId);
      if (user) bubble.appendChild(el2('span', { className: 'chat-author', text: user.name }));
      bubble.appendChild(el2('span', { className: 'chat-text', text: msg.text }));
      bubble.appendChild(el2('span', { className: 'chat-time', text: msg.time }));
      const delBtn = el2('button', { className: 'icon-btn danger chat-delete', text: '✕' });
      delBtn.addEventListener('click', () => {
        mandant.chat = mandant.chat.filter((x) => x.id !== msg.id);
        touchMandant(mandant);
        persist();
        renderContent();
      });
      bubble.appendChild(delBtn);
      messages.appendChild(bubble);
    });
    panel.appendChild(messages);

    const inputRow = el2('div', { className: 'add-row' });
    const input = el2('input', { attrs: { type: 'text', placeholder: 'Notiz schreiben…' } });
    const sendBtn = el2('button', { className: 'btn-3d small', text: 'Senden' });
    const send = () => {
      if (!input.value.trim()) return;
      mandant.chat = mandant.chat || [];
      mandant.chat.push({
        id: uid(),
        text: input.value.trim(),
        userId: currentUserId,
        time: new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      });
      touchMandant(mandant);
      persist();
      input.value = '';
      renderContent();
      requestAnimationFrame(() => {
        const m = content.querySelector('.chat-messages');
        if (m) m.scrollTop = m.scrollHeight;
      });
    };
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);
    panel.appendChild(inputRow);

    content.appendChild(panel);
    requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
  }

  // ---------- Initialisierung ----------

  function migrateState(loaded) {
    const s = loaded && Array.isArray(loaded.mandanten) ? loaded : { mandanten: [], fristenVorlagen: [], users: [] };
    if (!Array.isArray(s.fristenVorlagen)) s.fristenVorlagen = [];
    if (!Array.isArray(s.users)) s.users = [];
    s.mandanten.forEach((m) => {
      if (!Array.isArray(m.fristen)) m.fristen = [];
      if (!Array.isArray(m.dokumente)) m.dokumente = [];
      if (!Array.isArray(m.zeiten)) m.zeiten = [];
      if (!Array.isArray(m.rechnungen)) m.rechnungen = [];
      if (!Array.isArray(m.chat)) m.chat = [];
      if (!m.status) m.status = 'aktiv';
    });
    return s;
  }

  async function init() {
    const loaded = await window.dashboardAPI.loadData();
    state = migrateState(loaded);

    el('activateBtn').addEventListener('click', handleActivate);
    el('licenseKeyInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleActivate(); });
    el('newUserBtn').addEventListener('click', openNewUserModal);
    el('userBadge').addEventListener('click', switchUser);
    el('addMandantBtn').addEventListener('click', openAddMandantModal);
    el('mandantSearch').addEventListener('input', (e) => {
      mandantFilter = e.target.value;
      renderSidebar();
    });

    await initLicenseScreen();
  }

  init();
})();
