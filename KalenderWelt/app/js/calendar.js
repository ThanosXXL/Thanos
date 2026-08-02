// Kalender / Live: Jahres- und Monatsübersicht, Termine, tägliche Reminder ab 7 Uhr.
(function (global) {
  "use strict";

  const MONTH_NAMES = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];
  const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const REMINDER_START_HOUR = 7;

  const view = {
    year: new Date().getFullYear(),
    month: null, // 0-11 oder null für Jahresübersicht
  };

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function apptsForMonth(year, month) {
    const { state } = global.AppState;
    const prefix = `${year}-${pad(month + 1)}`;
    return state.appointments.filter((a) => a.date.startsWith(prefix));
  }

  function apptsForDay(dateStr) {
    const { state } = global.AppState;
    return state.appointments
      .filter((a) => a.date === dateStr)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }

  function render(container) {
    container.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "panel";

    const availableYears = [new Date().getFullYear() - 1, new Date().getFullYear()];

    const yearTabs = document.createElement("div");
    yearTabs.className = "year-tabs";
    availableYears.forEach((y) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "year-tab" + (y === view.year ? " active" : "");
      btn.textContent = String(y);
      btn.addEventListener("click", () => {
        view.year = y;
        view.month = null;
        render(container);
      });
      yearTabs.appendChild(btn);
    });
    panel.appendChild(yearTabs);

    if (view.month === null) {
      panel.appendChild(renderMonthGrid());
    } else {
      panel.appendChild(renderMonthHeader());
      panel.appendChild(renderDayGrid());
    }

    container.appendChild(panel);
  }

  function renderMonthGrid() {
    const grid = document.createElement("div");
    grid.className = "month-grid";
    const now = new Date();
    MONTH_NAMES.forEach((name, idx) => {
      const card = document.createElement("div");
      card.className = "month-card";
      if (view.year === now.getFullYear() && idx === now.getMonth()) {
        card.classList.add("current");
      }
      const label = document.createElement("div");
      label.textContent = name;
      card.appendChild(label);

      const open = apptsForMonth(view.year, idx).filter((a) => !a.done).length;
      if (open > 0) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = String(open);
        card.appendChild(badge);
      }

      card.addEventListener("click", () => {
        view.month = idx;
        render(document.getElementById("content"));
      });
      grid.appendChild(card);
    });
    return grid;
  }

  function renderMonthHeader() {
    const row = document.createElement("div");
    row.className = "btn-row";
    row.style.marginBottom = "12px";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "btn secondary";
    back.textContent = "← Jahresübersicht";
    back.addEventListener("click", () => {
      view.month = null;
      render(document.getElementById("content"));
    });
    row.appendChild(back);

    const title = document.createElement("h2");
    title.style.margin = "0";
    title.style.alignSelf = "center";
    title.textContent = `${MONTH_NAMES[view.month]} ${view.year}`;
    row.appendChild(title);
    return row;
  }

  function renderDayGrid() {
    const wrap = document.createElement("div");

    const header = document.createElement("div");
    header.className = "day-grid";
    header.style.marginBottom = "6px";
    WEEKDAYS.forEach((w) => {
      const h = document.createElement("div");
      h.className = "weekday-header";
      h.textContent = w;
      header.appendChild(h);
    });
    wrap.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "day-grid";

    const firstOfMonth = new Date(view.year, view.month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Montag = 0
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const today = todayStr();

    for (let i = 0; i < startOffset; i++) {
      const empty = document.createElement("div");
      empty.className = "day-cell empty";
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${view.year}-${pad(view.month + 1)}-${pad(day)}`;
      const cell = document.createElement("div");
      cell.className = "day-cell" + (dateStr === today ? " today" : "");

      const num = document.createElement("div");
      num.className = "day-num";
      num.textContent = String(day);
      cell.appendChild(num);

      apptsForDay(dateStr).slice(0, 3).forEach((a) => {
        const chip = document.createElement("div");
        chip.className = "appt-chip" + (a.done ? " done" : "");
        chip.textContent = (a.time ? a.time + " " : "") + a.title;
        cell.appendChild(chip);
      });

      cell.addEventListener("click", () => openDayModal(dateStr));
      grid.appendChild(cell);
    }

    wrap.appendChild(grid);
    return wrap;
  }

  function openDayModal(dateStr) {
    const items = apptsForDay(dateStr);
    const body = document.createElement("div");

    const heading = document.createElement("h3");
    heading.textContent = "Termine am " + formatDate(dateStr);
    body.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "list";
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "hint";
      empty.textContent = "Noch keine Termine an diesem Tag.";
      list.appendChild(empty);
    }
    items.forEach((a) => {
      const li = document.createElement("li");
      li.className = "list-item" + (a.done ? " done" : "");

      const left = document.createElement("div");
      const t = document.createElement("div");
      t.textContent = (a.time ? a.time + " – " : "") + a.title;
      t.style.fontWeight = "700";
      left.appendChild(t);
      if (a.notes) {
        const n = document.createElement("div");
        n.className = "hint";
        n.textContent = a.notes;
        left.appendChild(n);
      }
      li.appendChild(left);

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn secondary";
      editBtn.textContent = "✎";
      editBtn.title = "Bearbeiten";
      editBtn.addEventListener("click", () => openApptForm(dateStr, a));
      actions.appendChild(editBtn);

      const doneBtn = document.createElement("button");
      doneBtn.type = "button";
      doneBtn.className = "btn secondary";
      doneBtn.textContent = a.done ? "↺ Offen" : "✓ Erledigt";
      doneBtn.addEventListener("click", async () => {
        a.done = !a.done;
        await global.AppState.persist();
        openDayModal(dateStr);
        global.KalenderWeltApp.rerender();
      });
      actions.appendChild(doneBtn);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn danger";
      delBtn.textContent = "🗑";
      delBtn.addEventListener("click", async () => {
        const { state } = global.AppState;
        state.appointments = state.appointments.filter((x) => x.id !== a.id);
        await global.AppState.persist();
        openDayModal(dateStr);
        global.KalenderWeltApp.rerender();
      });
      actions.appendChild(delBtn);

      li.appendChild(actions);
      list.appendChild(li);
    });
    body.appendChild(list);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn";
    addBtn.style.marginTop = "14px";
    addBtn.textContent = "+ Neuer Termin";
    addBtn.addEventListener("click", () => openApptForm(dateStr));
    body.appendChild(addBtn);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn secondary";
    closeBtn.style.marginTop = "14px";
    closeBtn.style.marginLeft = "8px";
    closeBtn.textContent = "Schließen";
    closeBtn.addEventListener("click", global.Modal.close);
    body.appendChild(closeBtn);

    global.Modal.show(body);
  }

  function openApptForm(dateStr, existing) {
    const isEdit = !!existing;
    const body = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = (isEdit ? "Termin bearbeiten – " : "Neuer Termin – ") + formatDate(dateStr);
    body.appendChild(heading);

    const titleLabel = document.createElement("label");
    titleLabel.textContent = "Titel";
    body.appendChild(titleLabel);
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.placeholder = "z. B. Vorlesung, Meeting …";
    titleInput.value = isEdit ? existing.title : "";
    body.appendChild(titleInput);

    const timeLabel = document.createElement("label");
    timeLabel.textContent = "Uhrzeit";
    body.appendChild(timeLabel);
    const timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.value = isEdit ? existing.time || "09:00" : "09:00";
    body.appendChild(timeInput);

    const notesLabel = document.createElement("label");
    notesLabel.textContent = "Notizen";
    body.appendChild(notesLabel);
    const notesInput = document.createElement("textarea");
    notesInput.value = isEdit ? existing.notes || "" : "";
    body.appendChild(notesInput);

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = `Täglicher Reminder ab ${REMINDER_START_HOUR} Uhr, solange der Termin nicht als erledigt markiert ist.`;
    body.appendChild(hint);

    const row = document.createElement("div");
    row.className = "btn-row";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn";
    saveBtn.textContent = "Speichern";
    saveBtn.addEventListener("click", async () => {
      if (!titleInput.value.trim()) {
        titleInput.focus();
        return;
      }
      const { state, uid } = global.AppState;
      if (isEdit) {
        existing.time = timeInput.value;
        existing.title = titleInput.value.trim();
        existing.notes = notesInput.value.trim();
      } else {
        state.appointments.push({
          id: uid(),
          date: dateStr,
          time: timeInput.value,
          title: titleInput.value.trim(),
          notes: notesInput.value.trim(),
          done: false,
        });
      }
      await global.AppState.persist();
      openDayModal(dateStr);
      global.KalenderWeltApp.rerender();
    });
    row.appendChild(saveBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn secondary";
    cancelBtn.textContent = "Abbrechen";
    cancelBtn.addEventListener("click", () => openDayModal(dateStr));
    row.appendChild(cancelBtn);

    body.appendChild(row);
    global.Modal.show(body);
  }

  function formatDate(dateStr) {
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  }

  // ---------- Tägliche Reminder ab 7 Uhr bis erledigt ----------
  async function checkReminders() {
    const { state } = global.AppState;
    const now = new Date();
    if (now.getHours() < REMINDER_START_HOUR) return;
    const today = todayStr();
    const hourKeyPart = `${today}|${now.getHours()}`;
    let changed = false;

    state.appointments
      .filter((a) => a.date === today && !a.done)
      .forEach((a) => {
        const key = `${a.id}|${hourKeyPart}`;
        if (!state.notifiedLog[key]) {
          global.Platform.notifyNow(
            "KalenderWelt Erinnerung",
            (a.time ? a.time + " – " : "") + a.title
          );
          state.notifiedLog[key] = true;
          changed = true;
        }
      });

    // altes Log aufräumen (nur heutige Einträge behalten). Key-Format:
    // "<apptId>|<YYYY-MM-DD>|<Stunde>" – Datum steht immer im mittleren Teil.
    Object.keys(state.notifiedLog).forEach((key) => {
      const parts = key.split("|");
      const keyDate = parts[parts.length - 2];
      if (keyDate !== today) {
        delete state.notifiedLog[key];
        changed = true;
      }
    });

    if (changed) await global.AppState.persist();
  }

  function startReminderLoop() {
    global.Platform.requestNotificationPermission();
    checkReminders();
    setInterval(checkReminders, 60 * 1000);
  }

  global.Calendar = { render, startReminderLoop };
})(window);
