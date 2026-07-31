  // ===== Ordner 2: Kalender – Tests & Prüfungen =====

  function startClock() {
    const update = () => {
      const clock = document.getElementById('liveClock');
      if (clock) {
        clock.textContent = new Date().toLocaleString('de-DE', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    };
    update();
    setInterval(update, 1000);
  }

  function addExam(dozentId, title, date, time) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    if (!title.trim() || !date) {
      showToast('Bitte Titel und Datum angeben.', true);
      return;
    }
    dozent.exams.push({
      id: uid(),
      title: title.trim(),
      date,
      time: time || '00:00'
    });
    persist();
    render();
  }

  function deleteExam(dozentId, examId) {
    const dozent = findDozent(dozentId);
    if (!dozent) return;
    dozent.exams = dozent.exams.filter((e) => e.id !== examId);
    persist();
    render();
  }

  function examCountdown(dt) {
    const diff = dt.getTime() - Date.now();
    if (diff < 0) return 'vorbei';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `in ${days} Tag(en), ${hours} Std.`;
    const mins = Math.floor((diff % 3600000) / 60000);
    return `in ${hours} Std. ${mins} Min.`;
  }

  function buildCalendarFolder(dozent) {
    const folder = document.createElement('div');
    folder.className = 'folder calendar-folder';

    const title = document.createElement('h3');
    title.className = 'folder-title';
    title.textContent = '📁 Ordner: Kalender – Tests & Prüfungen';
    folder.appendChild(title);

    const clock = document.createElement('div');
    clock.className = 'live-clock';
    clock.id = 'liveClock';
    folder.appendChild(clock);

    // Eingabe-Bereich
    const addRow = document.createElement('div');
    addRow.className = 'exam-add';
    const examTitle = document.createElement('input');
    examTitle.type = 'text';
    examTitle.placeholder = 'Titel (z. B. Java-Prüfung)';
    const examDate = document.createElement('input');
    examDate.type = 'date';
    const examTime = document.createElement('input');
    examTime.type = 'time';
    const submit = document.createElement('button');
    submit.className = 'btn-primary btn-sm';
    submit.textContent = 'Eintragen';
    submit.addEventListener('click', () =>
      addExam(dozent.id, examTitle.value, examDate.value, examTime.value)
    );
    addRow.appendChild(examTitle);
    addRow.appendChild(examDate);
    addRow.appendChild(examTime);
    addRow.appendChild(submit);
    folder.appendChild(addRow);

    // Liste kommender Tests/Prüfungen
    const list = document.createElement('ul');
    list.className = 'exam-list';
    const sorted = dozent.exams
      .slice()
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    if (!sorted.length) {
      const empty = document.createElement('li');
      empty.className = 'folder-empty';
      empty.textContent = 'Keine Tests oder Prüfungen eingetragen.';
      list.appendChild(empty);
    }

    sorted.forEach((ex) => {
      const dt = new Date(`${ex.date}T${ex.time || '00:00'}`);
      const li = document.createElement('li');
      const past = dt.getTime() < Date.now();
      if (past) li.classList.add('past');

      const info = document.createElement('div');
      info.className = 'exam-info';
      const t = document.createElement('span');
      t.className = 'exam-title';
      t.textContent = ex.title;
      const d = document.createElement('span');
      d.className = 'exam-date';
      d.textContent = isNaN(dt.getTime())
        ? `${ex.date} ${ex.time}`
        : dt.toLocaleString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
      info.appendChild(t);
      info.appendChild(d);

      const cd = document.createElement('span');
      cd.className = 'exam-countdown';
      cd.textContent = isNaN(dt.getTime()) ? '' : examCountdown(dt);

      const del = document.createElement('button');
      del.className = 'icon-btn danger';
      del.textContent = '✕';
      del.title = 'Löschen';
      del.addEventListener('click', () => deleteExam(dozent.id, ex.id));

      li.appendChild(info);
      li.appendChild(cd);
      li.appendChild(del);
      list.appendChild(li);
    });
    folder.appendChild(list);

    return folder;
  }

