(function () {
  'use strict';

  const MAX_MESSAGE_LIST = 50;

  let state = { emailAccounts: [], wordDocuments: [], presentations: [] };
  const ui = {
    section: 'email',
    email: {
      activeAccountId: null,
      activeFolder: 'INBOX',
      sentFolderPath: null,
      messages: [],
      loading: false,
      error: null,
      selectedUid: null,
      messageBody: null
    },
    word: { activeDocId: null },
    pptx: { activePresId: null, activeSlideId: null }
  };

  let pendingDelete = null;

  const content = document.getElementById('content');

  function uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async function persist() {
    await window.officeAPI.saveData(state);
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((key) => {
        if (key === 'class') node.className = attrs[key];
        else if (key === 'text') node.textContent = attrs[key];
        else if (key.startsWith('on') && typeof attrs[key] === 'function') node.addEventListener(key.slice(2), attrs[key]);
        else node.setAttribute(key, attrs[key]);
      });
    }
    (children || []).forEach((child) => { if (child) node.appendChild(child); });
    return node;
  }

  // ---------------- Word editor: DOM <-> structured paragraphs ----------------

  function appendRuns(parent, runs) {
    if (!runs || !runs.length) {
      parent.appendChild(document.createTextNode(''));
      return;
    }
    runs.forEach((run) => {
      let wrap = document.createTextNode(run.text);
      if (run.underline) { const u = document.createElement('u'); u.appendChild(wrap); wrap = u; }
      if (run.italic) { const i = document.createElement('i'); i.appendChild(wrap); wrap = i; }
      if (run.bold) { const b = document.createElement('b'); b.appendChild(wrap); wrap = b; }
      parent.appendChild(wrap);
    });
  }

  function renderEditorContent(root, paragraphs) {
    root.textContent = '';
    let currentUl = null;
    (paragraphs.length ? paragraphs : [{ runs: [{ text: '' }] }]).forEach((p) => {
      if (p.bullet) {
        if (!currentUl) {
          currentUl = document.createElement('ul');
          root.appendChild(currentUl);
        }
        const li = document.createElement('li');
        appendRuns(li, p.runs);
        currentUl.appendChild(li);
      } else {
        currentUl = null;
        const tag = p.heading === 1 ? 'h1' : p.heading === 2 ? 'h2' : 'p';
        const node = document.createElement(tag);
        appendRuns(node, p.runs);
        root.appendChild(node);
      }
    });
  }

  function extractRuns(node) {
    const runs = [];
    function walk(n, fmt) {
      if (n.nodeType === Node.TEXT_NODE) {
        if (n.textContent) runs.push({ text: n.textContent, ...fmt });
        return;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return;
      const tag = n.tagName.toLowerCase();
      if (tag === 'br') {
        runs.push({ text: '\n', ...fmt });
        return;
      }
      const nextFmt = { ...fmt };
      if (tag === 'b' || tag === 'strong') nextFmt.bold = true;
      if (tag === 'i' || tag === 'em') nextFmt.italic = true;
      if (tag === 'u') nextFmt.underline = true;
      n.childNodes.forEach((c) => walk(c, nextFmt));
    }
    node.childNodes.forEach((c) => walk(c, {}));
    return runs;
  }

  function parseEditorContent(root) {
    const paragraphs = [];
    Array.from(root.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.trim()) paragraphs.push({ runs: [{ text: node.textContent }] });
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toLowerCase();
      if (tag === 'ul' || tag === 'ol') {
        Array.from(node.children).forEach((li) => {
          paragraphs.push({ runs: extractRuns(li), bullet: true });
        });
        return;
      }
      let heading = 0;
      if (tag === 'h1') heading = 1;
      if (tag === 'h2') heading = 2;
      paragraphs.push({ runs: extractRuns(node), heading });
    });
    return paragraphs.length ? paragraphs : [{ runs: [{ text: '' }] }];
  }

  // ---------------- Root render ----------------

  function render() {
    renderSectionTabs();
    content.textContent = '';
    if (ui.section === 'email') content.appendChild(renderEmailSection());
    else if (ui.section === 'word') content.appendChild(renderWordSection());
    else content.appendChild(renderPptxSection());
  }

  function renderSectionTabs() {
    document.querySelectorAll('.section-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.section === ui.section);
    });
  }

  // ---------------- E-Mail ----------------

  function renderEmailSection() {
    const wrap = el('div', { class: 'split-layout' });

    const sidebar = el('div', { class: 'sidebar' });
    sidebar.appendChild(el('div', { class: 'sidebar-header' }, [el('span', { text: 'Konten' })]));
    const list = el('ul', { class: 'sidebar-list' });
    state.emailAccounts.forEach((acc) => {
      const li = el('li', { class: acc.id === ui.email.activeAccountId ? 'active' : '' });
      li.appendChild(el('span', { class: 'item-title', text: acc.name || acc.email }));
      const delBtn = el('button', { class: 'icon-btn danger', text: '✕', title: 'Konto entfernen' });
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        askDelete('emailAccount', acc.id, `Konto "${acc.name || acc.email}" wirklich entfernen?`);
      });
      li.appendChild(delBtn);
      li.addEventListener('click', () => {
        ui.email.activeAccountId = acc.id;
        ui.email.activeFolder = 'INBOX';
        ui.email.sentFolderPath = null;
        ui.email.messages = [];
        ui.email.selectedUid = null;
        ui.email.messageBody = null;
        ui.email.error = null;
        render();
        loadMessages();
      });
      list.appendChild(li);
    });
    sidebar.appendChild(list);
    const footer = el('div', { class: 'sidebar-footer' });
    const addBtn = el('button', { class: 'btn-primary btn-small', text: '+ Konto hinzufügen' });
    addBtn.addEventListener('click', () => openAccountModal());
    footer.appendChild(addBtn);
    sidebar.appendChild(footer);
    wrap.appendChild(sidebar);

    const mainPanel = el('div', { class: 'main-panel' });
    const account = state.emailAccounts.find((a) => a.id === ui.email.activeAccountId);
    if (!account) {
      mainPanel.appendChild(el('div', {
        class: 'empty-state',
        text: state.emailAccounts.length ? 'Bitte ein Konto auswählen.' : 'Noch kein E-Mail-Konto eingerichtet.'
      }));
    } else {
      mainPanel.appendChild(buildEmailToolbar(account));
      const body = el('div', { class: 'email-body-layout' });
      body.appendChild(buildMessageList());
      body.appendChild(buildReadingPane());
      mainPanel.appendChild(body);
    }
    wrap.appendChild(mainPanel);
    return wrap;
  }

  function buildEmailToolbar(account) {
    const bar = el('div', { class: 'email-toolbar' });

    const inboxTab = el('button', { class: `folder-tab ${ui.email.activeFolder === 'INBOX' ? 'active' : ''}`, text: 'Posteingang' });
    inboxTab.addEventListener('click', () => {
      ui.email.activeFolder = 'INBOX';
      ui.email.messages = [];
      ui.email.selectedUid = null;
      ui.email.messageBody = null;
      render();
      loadMessages();
    });
    bar.appendChild(inboxTab);

    const isSentActive = ui.email.sentFolderPath && ui.email.activeFolder === ui.email.sentFolderPath;
    const sentTab = el('button', { class: `folder-tab ${isSentActive ? 'active' : ''}`, text: 'Gesendet' });
    sentTab.addEventListener('click', async () => {
      if (!ui.email.sentFolderPath) {
        const folders = await window.officeAPI.emailListFolders(account).catch(() => []);
        const sent = (folders || []).find((f) => f.specialUse === '\\Sent')
          || (folders || []).find((f) => /sent|gesendet/i.test(f.name || ''));
        ui.email.sentFolderPath = sent ? sent.path : 'Sent';
      }
      ui.email.activeFolder = ui.email.sentFolderPath;
      ui.email.messages = [];
      ui.email.selectedUid = null;
      ui.email.messageBody = null;
      render();
      loadMessages();
    });
    bar.appendChild(sentTab);

    bar.appendChild(el('div', { class: 'spacer' }));

    const refreshBtn = el('button', { class: 'btn-secondary btn-small', text: ui.email.loading ? 'Lädt...' : 'Aktualisieren' });
    if (ui.email.loading) refreshBtn.setAttribute('disabled', 'true');
    refreshBtn.addEventListener('click', () => loadMessages());
    bar.appendChild(refreshBtn);

    const composeBtn = el('button', { class: 'btn-primary btn-small', text: 'Neue E-Mail' });
    composeBtn.addEventListener('click', () => openComposeModal(account));
    bar.appendChild(composeBtn);

    return bar;
  }

  function buildMessageList() {
    const listEl = el('ul', { class: 'message-list' });
    if (ui.email.error) {
      listEl.appendChild(el('li', { text: `Fehler: ${ui.email.error}` }));
      return listEl;
    }
    if (!ui.email.messages.length) {
      listEl.appendChild(el('li', { text: ui.email.loading ? 'Lade Nachrichten...' : 'Keine Nachrichten.' }));
      return listEl;
    }
    ui.email.messages.forEach((msg) => {
      const li = el('li', { class: msg.uid === ui.email.selectedUid ? 'active' : '' });
      li.appendChild(el('span', { class: 'msg-subject', text: msg.subject }));
      li.appendChild(el('span', { class: 'msg-from', text: ui.email.activeFolder === 'INBOX' ? msg.from : msg.to }));
      li.appendChild(el('span', { class: 'msg-date', text: msg.date ? new Date(msg.date).toLocaleString('de-DE') : '' }));
      li.addEventListener('click', () => selectMessage(msg.uid));
      listEl.appendChild(li);
    });
    return listEl;
  }

  function buildReadingPane() {
    const pane = el('div', { class: 'reading-pane' });
    const body = ui.email.messageBody;
    if (!body) {
      pane.appendChild(el('p', { text: 'Nachricht auswählen, um sie zu lesen.' }));
      return pane;
    }
    pane.appendChild(el('h3', { text: body.subject || '(kein Betreff)' }));
    pane.appendChild(el('div', {
      class: 'meta-line',
      text: `Von: ${body.from || ''}   An: ${body.to || ''}   ${body.date ? new Date(body.date).toLocaleString('de-DE') : ''}`
    }));
    if (body.html) {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', '');
      iframe.srcdoc = body.html;
      pane.appendChild(iframe);
    } else {
      pane.appendChild(el('pre', { text: body.text || '' }));
    }
    return pane;
  }

  async function selectMessage(uidVal) {
    const account = state.emailAccounts.find((a) => a.id === ui.email.activeAccountId);
    if (!account) return;
    ui.email.selectedUid = uidVal;
    ui.email.messageBody = null;
    render();
    const res = await window.officeAPI.emailFetchMessageBody(account, ui.email.activeFolder, uidVal);
    if (res && res.ok) {
      ui.email.messageBody = res;
    } else {
      ui.email.messageBody = { subject: 'Fehler', text: (res && res.error) || 'Nachricht konnte nicht geladen werden.' };
    }
    render();
  }

  async function loadMessages() {
    const account = state.emailAccounts.find((a) => a.id === ui.email.activeAccountId);
    if (!account) return;
    ui.email.loading = true;
    ui.email.error = null;
    render();
    const res = await window.officeAPI.emailFetchMessages(account, ui.email.activeFolder, MAX_MESSAGE_LIST);
    ui.email.loading = false;
    if (res && res.ok) {
      ui.email.messages = res.messages;
    } else {
      ui.email.messages = [];
      ui.email.error = (res && res.error) || 'Unbekannter Fehler';
    }
    render();
  }

  function openAccountModal() {
    document.getElementById('accountModalTitle').textContent = 'E-Mail-Konto hinzufügen';
    ['accName', 'accEmail', 'accUsername', 'accPassword', 'accImapHost', 'accSmtpHost'].forEach((id) => {
      document.getElementById(id).value = '';
    });
    document.getElementById('accImapPort').value = '993';
    document.getElementById('accSmtpPort').value = '587';
    document.getElementById('accImapSecure').checked = true;
    document.getElementById('accSmtpSecure').checked = false;
    const resultEl = document.getElementById('accountTestResult');
    resultEl.textContent = '';
    resultEl.className = 'hint-text';
    document.getElementById('accountModal').classList.add('visible');
  }

  function collectAccountForm() {
    const email = document.getElementById('accEmail').value.trim();
    return {
      name: document.getElementById('accName').value.trim(),
      email,
      username: document.getElementById('accUsername').value.trim() || email,
      password: document.getElementById('accPassword').value,
      imapHost: document.getElementById('accImapHost').value.trim(),
      imapPort: document.getElementById('accImapPort').value.trim(),
      imapSecure: document.getElementById('accImapSecure').checked,
      smtpHost: document.getElementById('accSmtpHost').value.trim(),
      smtpPort: document.getElementById('accSmtpPort').value.trim(),
      smtpSecure: document.getElementById('accSmtpSecure').checked
    };
  }

  function openComposeModal(account) {
    document.getElementById('composeTo').value = '';
    document.getElementById('composeCc').value = '';
    document.getElementById('composeSubject').value = '';
    document.getElementById('composeBody').value = '';
    const resultEl = document.getElementById('composeResult');
    resultEl.textContent = '';
    resultEl.className = 'hint-text';
    const modal = document.getElementById('composeModal');
    modal.dataset.accountId = account.id;
    modal.classList.add('visible');
  }

  // ---------------- Word ----------------

  function renderWordSection() {
    const wrap = el('div', { class: 'split-layout' });

    const sidebar = el('div', { class: 'sidebar' });
    sidebar.appendChild(el('div', { class: 'sidebar-header' }, [el('span', { text: 'Dokumente' })]));
    const list = el('ul', { class: 'sidebar-list' });
    state.wordDocuments.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).forEach((doc) => {
      const li = el('li', { class: doc.id === ui.word.activeDocId ? 'active' : '' });
      li.appendChild(el('span', { class: 'item-title', text: doc.title || 'Ohne Titel' }));
      const delBtn = el('button', { class: 'icon-btn danger', text: '✕' });
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        askDelete('wordDoc', doc.id, `Dokument "${doc.title || 'Ohne Titel'}" wirklich entfernen?`);
      });
      li.appendChild(delBtn);
      li.addEventListener('click', () => { ui.word.activeDocId = doc.id; render(); });
      list.appendChild(li);
    });
    sidebar.appendChild(list);
    const footer = el('div', { class: 'sidebar-footer' });
    const addBtn = el('button', { class: 'btn-primary btn-small', text: '+ Neues Dokument' });
    addBtn.addEventListener('click', async () => {
      const doc = { id: uid(), title: 'Neues Dokument', paragraphs: [{ runs: [{ text: '' }] }], updatedAt: new Date().toISOString() };
      state.wordDocuments.push(doc);
      ui.word.activeDocId = doc.id;
      await persist();
      render();
    });
    footer.appendChild(addBtn);
    sidebar.appendChild(footer);
    wrap.appendChild(sidebar);

    const mainPanel = el('div', { class: 'main-panel' });
    const doc = state.wordDocuments.find((d) => d.id === ui.word.activeDocId);
    if (!doc) {
      mainPanel.appendChild(el('div', { class: 'empty-state', text: 'Kein Dokument ausgewählt.' }));
    } else {
      mainPanel.appendChild(buildWordEditor(doc));
    }
    wrap.appendChild(mainPanel);
    return wrap;
  }

  function buildWordEditor(doc) {
    document.execCommand('defaultParagraphSeparator', false, 'p');

    const container = el('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;' });

    const toolbar = el('div', { class: 'doc-toolbar' });
    let editorSurface;
    const cmd = (command, value) => (e) => {
      e.preventDefault();
      document.execCommand(command, false, value || null);
      editorSurface.focus();
    };
    [['Fett', 'bold'], ['Kursiv', 'italic'], ['Unterstrichen', 'underline']].forEach(([label, command]) => {
      const b = el('button', { text: label });
      b.addEventListener('mousedown', cmd(command));
      toolbar.appendChild(b);
    });
    const h1Btn = el('button', { text: 'Überschrift 1' });
    h1Btn.addEventListener('mousedown', cmd('formatBlock', 'h1'));
    toolbar.appendChild(h1Btn);
    const h2Btn = el('button', { text: 'Überschrift 2' });
    h2Btn.addEventListener('mousedown', cmd('formatBlock', 'h2'));
    toolbar.appendChild(h2Btn);
    const pBtn = el('button', { text: 'Absatz' });
    pBtn.addEventListener('mousedown', cmd('formatBlock', 'p'));
    toolbar.appendChild(pBtn);
    const listBtn = el('button', { text: 'Liste' });
    listBtn.addEventListener('mousedown', cmd('insertUnorderedList'));
    toolbar.appendChild(listBtn);
    container.appendChild(toolbar);

    const titleRow = el('div', { class: 'doc-title-row' });
    const titleInput = el('input', { type: 'text' });
    titleInput.value = doc.title || '';
    titleRow.appendChild(titleInput);
    container.appendChild(titleRow);

    editorSurface = el('div', { class: 'editor-surface', contenteditable: 'true' });
    renderEditorContent(editorSurface, doc.paragraphs && doc.paragraphs.length ? doc.paragraphs : [{ runs: [{ text: '' }] }]);
    container.appendChild(editorSurface);

    const actions = el('div', { class: 'editor-actions' });
    const statusText = el('span', { class: 'hint-text', style: 'margin-right:auto;align-self:center;' });
    actions.appendChild(statusText);

    const saveBtn = el('button', { class: 'btn-secondary', text: 'Speichern' });
    saveBtn.addEventListener('click', async () => {
      doc.title = titleInput.value.trim() || 'Ohne Titel';
      doc.paragraphs = parseEditorContent(editorSurface);
      doc.updatedAt = new Date().toISOString();
      await persist();
      statusText.textContent = 'Gespeichert.';
      setTimeout(() => { statusText.textContent = ''; }, 1500);
    });
    actions.appendChild(saveBtn);

    const exportBtn = el('button', { class: 'btn-primary', text: 'Als .docx exportieren' });
    exportBtn.addEventListener('click', async () => {
      doc.title = titleInput.value.trim() || 'Ohne Titel';
      doc.paragraphs = parseEditorContent(editorSurface);
      doc.updatedAt = new Date().toISOString();
      await persist();
      const res = await window.officeAPI.wordExportDocx(doc.title, doc.paragraphs);
      if (res && res.ok) statusText.textContent = `Exportiert: ${res.filePath}`;
      else if (res && !res.canceled) statusText.textContent = `Fehler: ${res.error}`;
      setTimeout(() => { statusText.textContent = ''; }, 4000);
    });
    actions.appendChild(exportBtn);
    container.appendChild(actions);

    return container;
  }

  // ---------------- Präsentation ----------------

  function renderPptxSection() {
    const wrap = el('div', { class: 'split-layout' });

    const sidebar = el('div', { class: 'sidebar' });
    sidebar.appendChild(el('div', { class: 'sidebar-header' }, [el('span', { text: 'Präsentationen' })]));
    const list = el('ul', { class: 'sidebar-list' });
    state.presentations.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).forEach((pres) => {
      const li = el('li', { class: pres.id === ui.pptx.activePresId ? 'active' : '' });
      const stack = el('div', { class: 'item-title-stack' });
      stack.appendChild(el('span', { class: 'item-title', text: pres.title || 'Ohne Titel' }));
      stack.appendChild(el('span', { class: 'item-sub', text: `${(pres.slides || []).length} Folie(n)` }));
      li.appendChild(stack);
      const delBtn = el('button', { class: 'icon-btn danger', text: '✕' });
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        askDelete('presentation', pres.id, `Präsentation "${pres.title || 'Ohne Titel'}" wirklich entfernen?`);
      });
      li.appendChild(delBtn);
      li.addEventListener('click', () => {
        ui.pptx.activePresId = pres.id;
        ui.pptx.activeSlideId = (pres.slides && pres.slides[0]) ? pres.slides[0].id : null;
        render();
      });
      list.appendChild(li);
    });
    sidebar.appendChild(list);
    const footer = el('div', { class: 'sidebar-footer' });
    const addBtn = el('button', { class: 'btn-primary btn-small', text: '+ Neue Präsentation' });
    addBtn.addEventListener('click', async () => {
      const slide = { id: uid(), title: 'Folie 1', bullets: [''], notes: '' };
      const pres = { id: uid(), title: 'Neue Präsentation', slides: [slide], updatedAt: new Date().toISOString() };
      state.presentations.push(pres);
      ui.pptx.activePresId = pres.id;
      ui.pptx.activeSlideId = slide.id;
      await persist();
      render();
    });
    footer.appendChild(addBtn);
    sidebar.appendChild(footer);
    wrap.appendChild(sidebar);

    const pres = state.presentations.find((p) => p.id === ui.pptx.activePresId);
    if (!pres) {
      const mainPanel = el('div', { class: 'main-panel' });
      mainPanel.appendChild(el('div', { class: 'empty-state', text: 'Keine Präsentation ausgewählt.' }));
      wrap.appendChild(mainPanel);
      return wrap;
    }

    const slideSidebar = el('div', { class: 'sidebar', style: 'width:220px;' });
    slideSidebar.appendChild(el('div', { class: 'sidebar-header' }, [el('span', { text: 'Folien' })]));
    const slideList = el('ul', { class: 'slide-thumb-list' });
    (pres.slides || []).forEach((slide, idx) => {
      const li = el('li', { class: slide.id === ui.pptx.activeSlideId ? 'active' : '' });
      li.appendChild(el('span', { class: 'slide-num', text: `${idx + 1}.` }));
      li.appendChild(document.createTextNode(slide.title || '(ohne Titel)'));
      li.addEventListener('click', () => { ui.pptx.activeSlideId = slide.id; render(); });
      slideList.appendChild(li);
    });
    slideSidebar.appendChild(slideList);
    const slideFooter = el('div', { class: 'sidebar-footer' });
    const addSlideBtn = el('button', { class: 'btn-secondary btn-small', text: '+ Folie' });
    addSlideBtn.addEventListener('click', async () => {
      pres.slides = pres.slides || [];
      const slide = { id: uid(), title: `Folie ${pres.slides.length + 1}`, bullets: [''], notes: '' };
      pres.slides.push(slide);
      pres.updatedAt = new Date().toISOString();
      ui.pptx.activeSlideId = slide.id;
      await persist();
      render();
    });
    slideFooter.appendChild(addSlideBtn);
    slideSidebar.appendChild(slideFooter);
    wrap.appendChild(slideSidebar);

    const mainPanel = el('div', { class: 'main-panel' });
    const titleRow = el('div', { class: 'doc-title-row' });
    const presTitleInput = el('input', { type: 'text' });
    presTitleInput.value = pres.title || '';
    presTitleInput.addEventListener('change', async () => {
      pres.title = presTitleInput.value.trim() || 'Ohne Titel';
      pres.updatedAt = new Date().toISOString();
      await persist();
      render();
    });
    titleRow.appendChild(presTitleInput);
    mainPanel.appendChild(titleRow);

    const slide = (pres.slides || []).find((s) => s.id === ui.pptx.activeSlideId) || (pres.slides || [])[0];
    if (!slide) {
      mainPanel.appendChild(el('div', { class: 'empty-state', text: 'Keine Folie vorhanden.' }));
    } else {
      mainPanel.appendChild(buildSlideEditor(pres, slide));
    }
    wrap.appendChild(mainPanel);
    return wrap;
  }

  function buildSlideEditor(pres, slide) {
    const form = el('div', { class: 'slide-editor' });

    const titleLabel = el('label', { text: 'Folientitel' });
    const titleInput = el('input', { type: 'text' });
    titleInput.value = slide.title || '';
    titleLabel.appendChild(titleInput);
    form.appendChild(titleLabel);

    const bulletsLabel = el('label', { text: 'Stichpunkte (eine Zeile je Punkt)' });
    const bulletsArea = el('textarea', { rows: '8' });
    bulletsArea.value = (slide.bullets || []).join('\n');
    bulletsLabel.appendChild(bulletsArea);
    form.appendChild(bulletsLabel);

    const notesLabel = el('label', { text: 'Notizen (Referentenansicht)' });
    const notesArea = el('textarea', { rows: '4' });
    notesArea.value = slide.notes || '';
    notesLabel.appendChild(notesArea);
    form.appendChild(notesLabel);

    const orderRow = el('div', { class: 'slide-order-btns' });
    const upBtn = el('button', { class: 'btn-secondary btn-small', text: '↑ Nach oben' });
    upBtn.addEventListener('click', async () => {
      const idx = pres.slides.findIndex((s) => s.id === slide.id);
      if (idx > 0) {
        [pres.slides[idx - 1], pres.slides[idx]] = [pres.slides[idx], pres.slides[idx - 1]];
        await persist();
        render();
      }
    });
    const downBtn = el('button', { class: 'btn-secondary btn-small', text: '↓ Nach unten' });
    downBtn.addEventListener('click', async () => {
      const idx = pres.slides.findIndex((s) => s.id === slide.id);
      if (idx < pres.slides.length - 1) {
        [pres.slides[idx + 1], pres.slides[idx]] = [pres.slides[idx], pres.slides[idx + 1]];
        await persist();
        render();
      }
    });
    const removeSlideBtn = el('button', { class: 'btn-danger btn-small', text: 'Folie löschen' });
    removeSlideBtn.addEventListener('click', async () => {
      pres.slides = pres.slides.filter((s) => s.id !== slide.id);
      ui.pptx.activeSlideId = pres.slides.length ? pres.slides[0].id : null;
      await persist();
      render();
    });
    orderRow.appendChild(upBtn);
    orderRow.appendChild(downBtn);
    orderRow.appendChild(removeSlideBtn);
    form.appendChild(orderRow);

    const actions = el('div', { class: 'editor-actions' });
    const statusText = el('span', { class: 'hint-text', style: 'margin-right:auto;align-self:center;' });
    actions.appendChild(statusText);

    const saveBtn = el('button', { class: 'btn-secondary', text: 'Speichern' });
    saveBtn.addEventListener('click', async () => {
      slide.title = titleInput.value.trim();
      slide.bullets = bulletsArea.value.split('\n');
      slide.notes = notesArea.value;
      pres.updatedAt = new Date().toISOString();
      await persist();
      statusText.textContent = 'Gespeichert.';
      setTimeout(() => { statusText.textContent = ''; }, 1500);
    });
    actions.appendChild(saveBtn);

    const exportBtn = el('button', { class: 'btn-primary', text: 'Als .pptx exportieren' });
    exportBtn.addEventListener('click', async () => {
      slide.title = titleInput.value.trim();
      slide.bullets = bulletsArea.value.split('\n');
      slide.notes = notesArea.value;
      pres.updatedAt = new Date().toISOString();
      await persist();
      const res = await window.officeAPI.pptxExport(pres.title, pres.slides);
      if (res && res.ok) statusText.textContent = `Exportiert: ${res.filePath}`;
      else if (res && !res.canceled) statusText.textContent = `Fehler: ${res.error}`;
      setTimeout(() => { statusText.textContent = ''; }, 4000);
    });
    actions.appendChild(exportBtn);
    form.appendChild(actions);

    return form;
  }

  // ---------------- Löschen / Modals ----------------

  function askDelete(type, id, text) {
    pendingDelete = { type, id };
    document.getElementById('deleteModalText').textContent = text;
    document.getElementById('deleteModal').classList.add('visible');
  }

  function setupModals() {
    document.getElementById('cancelAccountBtn').addEventListener('click', () => {
      document.getElementById('accountModal').classList.remove('visible');
    });
    document.getElementById('testAccountBtn').addEventListener('click', async () => {
      const form = collectAccountForm();
      const resultEl = document.getElementById('accountTestResult');
      resultEl.textContent = 'Teste Verbindung...';
      resultEl.className = 'hint-text';
      const res = await window.officeAPI.emailTestConnection(form);
      if (res.ok) {
        resultEl.textContent = 'Verbindung erfolgreich.';
        resultEl.className = 'hint-text ok';
      } else {
        resultEl.textContent = `Fehlgeschlagen: ${res.error}`;
        resultEl.className = 'hint-text error';
      }
    });
    document.getElementById('saveAccountBtn').addEventListener('click', async () => {
      const form = collectAccountForm();
      const resultEl = document.getElementById('accountTestResult');
      if (!form.name || !form.email || !form.imapHost || !form.smtpHost || !form.password) {
        resultEl.textContent = 'Bitte alle Pflichtfelder ausfüllen.';
        resultEl.className = 'hint-text error';
        return;
      }
      const newAccount = { id: uid(), ...form };
      state.emailAccounts.push(newAccount);
      ui.email.activeAccountId = newAccount.id;
      ui.email.activeFolder = 'INBOX';
      ui.email.sentFolderPath = null;
      await persist();
      document.getElementById('accountModal').classList.remove('visible');
      render();
      loadMessages();
    });

    document.getElementById('cancelComposeBtn').addEventListener('click', () => {
      document.getElementById('composeModal').classList.remove('visible');
    });
    document.getElementById('sendComposeBtn').addEventListener('click', async () => {
      const modal = document.getElementById('composeModal');
      const account = state.emailAccounts.find((a) => a.id === modal.dataset.accountId);
      const resultEl = document.getElementById('composeResult');
      const mail = {
        to: document.getElementById('composeTo').value.trim(),
        cc: document.getElementById('composeCc').value.trim(),
        subject: document.getElementById('composeSubject').value.trim(),
        text: document.getElementById('composeBody').value
      };
      if (!account || !mail.to || !mail.subject) {
        resultEl.textContent = 'Empfänger und Betreff sind erforderlich.';
        resultEl.className = 'hint-text error';
        return;
      }
      resultEl.textContent = 'Wird gesendet...';
      resultEl.className = 'hint-text';
      const res = await window.officeAPI.emailSend(account, mail);
      if (res.ok) {
        resultEl.textContent = 'Gesendet.';
        resultEl.className = 'hint-text ok';
        setTimeout(() => modal.classList.remove('visible'), 700);
      } else {
        resultEl.textContent = `Fehler: ${res.error}`;
        resultEl.className = 'hint-text error';
      }
    });

    document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
      pendingDelete = null;
      document.getElementById('deleteModal').classList.remove('visible');
    });
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
      if (!pendingDelete) return;
      const { type, id } = pendingDelete;
      if (type === 'emailAccount') {
        state.emailAccounts = state.emailAccounts.filter((a) => a.id !== id);
        if (ui.email.activeAccountId === id) {
          ui.email.activeAccountId = null;
          ui.email.messages = [];
          ui.email.messageBody = null;
        }
      } else if (type === 'wordDoc') {
        state.wordDocuments = state.wordDocuments.filter((d) => d.id !== id);
        if (ui.word.activeDocId === id) ui.word.activeDocId = null;
      } else if (type === 'presentation') {
        state.presentations = state.presentations.filter((p) => p.id !== id);
        if (ui.pptx.activePresId === id) {
          ui.pptx.activePresId = null;
          ui.pptx.activeSlideId = null;
        }
      }
      await persist();
      pendingDelete = null;
      document.getElementById('deleteModal').classList.remove('visible');
      render();
    });
  }

  // ---------------- Init ----------------

  async function init() {
    const loaded = await window.officeAPI.loadData();
    state = Object.assign({ emailAccounts: [], wordDocuments: [], presentations: [] }, loaded);
    document.getElementById('sectionTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.section-tab');
      if (!btn) return;
      ui.section = btn.dataset.section;
      render();
    });
    setupModals();
    render();
  }

  init();
})();
