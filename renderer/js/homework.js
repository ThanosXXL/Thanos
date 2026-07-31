// ===== Ordner 1: Hausaufgaben =====

  function addHomework(dozentId, author, text, attachments) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    if (!author.trim() || !text.trim()) {
      showToast('Bitte Name und Aufgabe ausfüllen.', true);
      return;
    }
    dozent.homework.push({
      id: uid(),
      author: author.trim(),
      text: text.trim(),
      attachments: attachments || [],
      submittedAt: nowStr(),
      feedback: '',
      corrected: false,
      returnedAt: null
    });
    persist();
    render();
  }

  function correctHomework(dozentId, hwId, feedback) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    const hw = dozent.homework.find((h) => h.id === hwId);
    if (!hw) return;
    hw.feedback = (feedback || '').trim();
    hw.corrected = true;
    hw.returnedAt = nowStr();
    persist();
    render();
    showToast(`Hausaufgabe von ${hw.author} korrigiert und zurückgegeben.`);
  }

  function deleteHomework(dozentId, hwId) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    dozent.homework = dozent.homework.filter((h) => h.id !== hwId);
    persist();
    render();
  }

  function buildHomeworkFolder(dozent) {
    const folder = document.createElement('div');
    folder.className = 'folder homework-folder';

    const title = document.createElement('h3');
    title.className = 'folder-title';
    title.textContent = '📁 Ordner: Hausaufgaben';
    folder.appendChild(title);

    const hint = document.createElement('p');
    hint.className = 'folder-hint';
    hint.textContent =
      'Teilnehmer reichen Hausaufgaben ein; der Dozent korrigiert sie hier und gibt sie zurück.';
    folder.appendChild(hint);

    // Eingabe-Bereich
    const addRow = document.createElement('div');
    addRow.className = 'hw-add';
    const author = document.createElement('input');
    author.type = 'text';
    author.placeholder = 'Name des Teilnehmers';
    author.className = 'hw-author';
    const text = document.createElement('input');
    text.type = 'text';
    text.placeholder = 'Aufgabe / Beschreibung';
    text.className = 'hw-text';

    let pendingAttachments = [];
    const attachBtn = document.createElement('button');
    attachBtn.className = 'btn-secondary btn-sm';
    attachBtn.textContent = '📎 Datei';
    const attachLabel = document.createElement('span');
    attachLabel.className = 'hw-attach';
    attachBtn.addEventListener('click', async () => {
      const res = await window.dashboardAPI.openFileDialog();
      if (res.canceled) return;
      pendingAttachments = res.files.map((f) => f.name);
      attachLabel.textContent = pendingAttachments.join(', ');
    });

    const submit = document.createElement('button');
    submit.className = 'btn-primary btn-sm';
    submit.textContent = 'Einreichen';
    submit.addEventListener('click', () =>
      addHomework(dozent.id, author.value, text.value, pendingAttachments)
    );

    addRow.appendChild(author);
    addRow.appendChild(text);
    addRow.appendChild(attachBtn);
    addRow.appendChild(submit);
    folder.appendChild(addRow);
    if (attachLabel.textContent) folder.appendChild(attachLabel);

    // Liste der Hausaufgaben
    const list = document.createElement('div');
    list.className = 'hw-list';
    if (!dozent.homework.length) {
      const empty = document.createElement('p');
      empty.className = 'folder-empty';
      empty.textContent = 'Noch keine Hausaufgaben eingereicht.';
      list.appendChild(empty);
    }
    dozent.homework.forEach((hw) => {
      list.appendChild(buildHomeworkItem(dozent, hw));
    });
    folder.appendChild(list);

    return folder;
  }

  function buildHomeworkItem(dozent, hw) {
    const item = document.createElement('div');
    item.className = 'hw-item' + (hw.corrected ? ' corrected' : '');

    const head = document.createElement('div');
    head.className = 'hw-item-head';
    const who = document.createElement('span');
    who.className = 'hw-who';
    who.textContent = hw.author;
    const when = document.createElement('span');
    when.className = 'hw-when';
    when.textContent = 'eingereicht am ' + hw.submittedAt;
    const status = document.createElement('span');
    status.className = 'hw-status' + (hw.corrected ? ' done' : '');
    status.textContent = hw.corrected ? 'Korrigiert & zurückgegeben' : 'Eingereicht';
    const del = document.createElement('button');
    del.className = 'icon-btn danger';
    del.textContent = '✕';
    del.title = 'Löschen';
    del.addEventListener('click', () => deleteHomework(dozent.id, hw.id));
    head.appendChild(who);
    head.appendChild(when);
    head.appendChild(status);
    head.appendChild(del);
    item.appendChild(head);

    const body = document.createElement('div');
    body.className = 'hw-body';
    body.textContent = hw.text;
    item.appendChild(body);

    if (hw.attachments && hw.attachments.length) {
      const att = document.createElement('div');
      att.className = 'hw-files';
      att.textContent = '📎 ' + hw.attachments.join(', ');
      item.appendChild(att);
    }

    if (hw.corrected) {
      const fb = document.createElement('div');
      fb.className = 'hw-feedback';
      fb.innerHTML = '<strong>Rückgabe des Dozenten:</strong> ';
      fb.appendChild(document.createTextNode(hw.feedback || '(ohne Kommentar)'));
      const ret = document.createElement('div');
      ret.className = 'hw-when';
      ret.textContent = 'zurückgegeben am ' + hw.returnedAt;
      item.appendChild(fb);
      item.appendChild(ret);
    } else {
      const correctRow = document.createElement('div');
      correctRow.className = 'hw-correct';
      const fbInput = document.createElement('input');
      fbInput.type = 'text';
      fbInput.placeholder = 'Korrektur / Feedback des Dozenten…';
      const correctBtn = document.createElement('button');
      correctBtn.className = 'btn-primary btn-sm';
      correctBtn.textContent = 'Korrigieren & zurückgeben';
      correctBtn.addEventListener('click', () =>
        correctHomework(dozent.id, hw.id, fbInput.value)
      );
      correctRow.appendChild(fbInput);
      correctRow.appendChild(correctBtn);
      item.appendChild(correctRow);
    }

    return item;
  }

