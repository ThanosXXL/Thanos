(function () {
  'use strict';

  const DATA = window.FITSPARK_DATA;
  const STORAGE_KEY = 'fitspark-state';

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function defaultState() {
    return {
      date: todayKey(),
      tasks: DATA.DEFAULT_TASKS.map((text) => ({ id: uid(), text, done: false })),
      musicGenre: 'samba',
      activeSession: null, // { goal, muscles: [], exercises: [{id,name,muscle,done}] }
    };
  }

  let state = load();

  function load() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      saved = null;
    }
    if (!saved) return defaultState();

    // Tagesaufgaben werden täglich zurückgesetzt (Erledigt-Status), die Liste bleibt.
    if (saved.date !== todayKey()) {
      saved.date = todayKey();
      saved.tasks = (saved.tasks || []).map((t) => ({ ...t, done: false }));
    }
    if (!Array.isArray(saved.tasks)) saved.tasks = defaultState().tasks;
    if (!saved.musicGenre) saved.musicGenre = 'samba';
    return saved;
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ---------- Aufgaben ----------

  function toggleTask(id) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    task.done = !task.done;
    persist();
    render();
  }

  function removeTask(id) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    persist();
    render();
  }

  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    state.tasks.push({ id: uid(), text: trimmed, done: false });
    persist();
    render();
  }

  // ---------- Trainings-Session ----------

  let pendingGoal = null;
  let pendingMuscles = new Set();

  function openGoalModal() {
    pendingGoal = null;
    pendingMuscles = new Set();
    show('goalModal');
  }

  function chooseGoal(goalId) {
    pendingGoal = goalId;
    hide('goalModal');
    renderMuscleOptions();
    show('muscleModal');
  }

  function renderMuscleOptions() {
    const grid = document.getElementById('muscleOptions');
    grid.innerHTML = '';
    DATA.MUSCLE_GROUPS.forEach((group) => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = group.label;
      chip.dataset.muscle = group.id;
      if (pendingMuscles.has(group.id)) chip.classList.add('selected');
      chip.addEventListener('click', () => {
        if (pendingMuscles.has(group.id)) pendingMuscles.delete(group.id);
        else pendingMuscles.add(group.id);
        chip.classList.toggle('selected');
        document.getElementById('muscleStartBtn').disabled = pendingMuscles.size === 0;
      });
      grid.appendChild(chip);
    });
    document.getElementById('muscleStartBtn').disabled = true;
  }

  function startSession() {
    if (pendingMuscles.size === 0) return;
    const muscles = Array.from(pendingMuscles);
    const exercises = [];
    muscles.forEach((muscleId) => {
      const list = DATA.EXERCISES[muscleId] || [];
      list.slice(0, 3).forEach((name) => {
        exercises.push({ id: uid(), name, muscle: muscleId, done: false });
      });
    });
    state.activeSession = { goal: pendingGoal, muscles, exercises };
    persist();
    hide('muscleModal');

    show('startAnnounceModal');
    window.setTimeout(() => {
      hide('startAnnounceModal');
      setActiveTab('plans');
      render();
    }, 1600);
  }

  function toggleExerciseDone(id) {
    if (!state.activeSession) return;
    const ex = state.activeSession.exercises.find((e) => e.id === id);
    if (!ex) return;
    ex.done = !ex.done;
    persist();
    render();
  }

  function endSession() {
    state.activeSession = null;
    persist();
    render();
  }

  // ---------- Musik ----------

  function selectGenre(genreId) {
    state.musicGenre = genreId;
    persist();
    window.FitSparkAudio.setGenre(genreId, true);
    renderMusicSelector();
  }

  function renderMusicSelector() {
    document.querySelectorAll('.genre-btn').forEach((btn) => {
      const active = btn.dataset.genre === state.musicGenre;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    const playBtn = document.getElementById('musicPlayBtn');
    playBtn.textContent = window.FitSparkAudio.isPlaying() ? '❚❚' : '▶';
  }

  // ---------- Tabs / Modals ----------

  let activeTab = 'tasks';

  function setActiveTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
  }

  function show(id) {
    document.getElementById(id).classList.add('open');
  }
  function hide(id) {
    document.getElementById(id).classList.remove('open');
  }

  // ---------- Rendering ----------

  function render() {
    const content = document.getElementById('content');
    content.innerHTML = '';
    if (activeTab === 'tasks') content.appendChild(renderTasksPanel());
    else content.appendChild(renderPlansPanel());
  }

  function renderTasksPanel() {
    const wrap = document.createElement('section');
    wrap.className = 'panel';

    const heading = document.createElement('h1');
    heading.textContent = 'Tagesaufgaben';
    wrap.appendChild(heading);

    const doneCount = state.tasks.filter((t) => t.done).length;
    const progress = document.createElement('p');
    progress.className = 'progress-line';
    progress.textContent = `${doneCount} von ${state.tasks.length} erledigt`;
    wrap.appendChild(progress);

    const list = document.createElement('ul');
    list.className = 'task-list';
    state.tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.done ? ' done' : '');

      const check = document.createElement('button');
      check.className = 'check-btn';
      check.type = 'button';
      check.setAttribute('aria-label', 'Aufgabe erledigt markieren');
      check.textContent = task.done ? '✓' : '';
      check.addEventListener('click', () => toggleTask(task.id));
      li.appendChild(check);

      const text = document.createElement('span');
      text.className = 'task-text';
      text.textContent = task.text;
      li.appendChild(text);

      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.type = 'button';
      del.setAttribute('aria-label', 'Aufgabe löschen');
      del.textContent = '×';
      del.addEventListener('click', () => removeTask(task.id));
      li.appendChild(del);

      list.appendChild(li);
    });
    wrap.appendChild(list);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-primary add-task-btn';
    addBtn.type = 'button';
    addBtn.textContent = '+ Aufgabe hinzufügen';
    addBtn.addEventListener('click', () => {
      document.getElementById('addTaskInput').value = '';
      show('addTaskModal');
      document.getElementById('addTaskInput').focus();
    });
    wrap.appendChild(addBtn);

    return wrap;
  }

  function renderPlansPanel() {
    const wrap = document.createElement('section');
    wrap.className = 'panel';

    const heading = document.createElement('h1');
    heading.textContent = 'Trainingspläne';
    wrap.appendChild(heading);

    if (state.activeSession) {
      wrap.appendChild(renderActiveSession());
    } else {
      wrap.appendChild(renderStartCallout());
    }

    const splitHeading = document.createElement('h2');
    splitHeading.textContent = 'Wochenplan – wechselnde Muskelpartien';
    wrap.appendChild(splitHeading);

    DATA.WEEKLY_SPLIT.forEach((day) => {
      wrap.appendChild(renderDayTable(day));
    });

    return wrap;
  }

  function renderStartCallout() {
    const box = document.createElement('div');
    box.className = 'start-callout';
    const p = document.createElement('p');
    p.textContent = 'Bereit für dein Training? Wähle dein Ziel und deine Muskelpartien.';
    box.appendChild(p);
    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.type = 'button';
    btn.textContent = 'Training starten';
    btn.addEventListener('click', openGoalModal);
    box.appendChild(btn);
    return box;
  }

  function renderActiveSession() {
    const session = state.activeSession;
    const box = document.createElement('div');
    box.className = 'active-session';

    const title = document.createElement('h2');
    const goalLabel = DATA.GOAL_SCHEMES[session.goal].label;
    const muscleLabels = session.muscles
      .map((id) => DATA.MUSCLE_GROUPS.find((g) => g.id === id).label)
      .join(', ');
    title.textContent = `${goalLabel}: ${muscleLabels}`;
    box.appendChild(title);

    const scheme = DATA.GOAL_SCHEMES[session.goal];
    const schemeLine = document.createElement('p');
    schemeLine.className = 'scheme-line';
    schemeLine.textContent = `Schema: ${scheme.scheme} · ${scheme.pause}`;
    box.appendChild(schemeLine);

    const doneCount = session.exercises.filter((e) => e.done).length;
    const progress = document.createElement('p');
    progress.className = 'progress-line';
    progress.textContent = `${doneCount} von ${session.exercises.length} Übungen erledigt`;
    box.appendChild(progress);

    const list = document.createElement('ul');
    list.className = 'task-list';
    session.exercises.forEach((ex) => {
      const li = document.createElement('li');
      li.className = 'task-item' + (ex.done ? ' done' : '');

      const check = document.createElement('button');
      check.className = 'check-btn';
      check.type = 'button';
      check.textContent = ex.done ? '✓' : '';
      check.addEventListener('click', () => toggleExerciseDone(ex.id));
      li.appendChild(check);

      const text = document.createElement('span');
      text.className = 'task-text';
      text.textContent = ex.name;
      li.appendChild(text);

      list.appendChild(li);
    });
    box.appendChild(list);

    const endBtn = document.createElement('button');
    endBtn.className = 'btn-secondary';
    endBtn.type = 'button';
    endBtn.textContent = 'Training beenden';
    endBtn.addEventListener('click', endSession);
    box.appendChild(endBtn);

    return box;
  }

  function renderDayTable(day) {
    const box = document.createElement('div');
    box.className = 'day-table';

    const title = document.createElement('h3');
    const groupLabels = day.groups.length
      ? day.groups.map((id) => DATA.MUSCLE_GROUPS.find((g) => g.id === id).label).join(' & ')
      : 'Ruhetag';
    title.textContent = `${day.day} — ${groupLabels}`;
    box.appendChild(title);

    if (day.groups.length === 0) {
      const rest = document.createElement('p');
      rest.className = 'rest-note';
      rest.textContent = 'Erholung ist Teil des Trainings.';
      box.appendChild(rest);
      return box;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '';
    const headRow = document.createElement('tr');
    ['Übung', 'Muskelgruppe'].forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    day.groups.forEach((groupId) => {
      const groupLabel = DATA.MUSCLE_GROUPS.find((g) => g.id === groupId).label;
      (DATA.EXERCISES[groupId] || []).forEach((name) => {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        tdName.textContent = name;
        const tdGroup = document.createElement('td');
        tdGroup.textContent = groupLabel;
        tr.appendChild(tdName);
        tr.appendChild(tdGroup);
        tbody.appendChild(tr);
      });
    });
    table.appendChild(tbody);
    box.appendChild(table);

    return box;
  }

  // ---------- Init ----------

  function initEvents() {
    document.getElementById('tabbar').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      setActiveTab(btn.dataset.tab);
      render();
    });

    document.getElementById('musicPlayBtn').addEventListener('click', () => {
      window.FitSparkAudio.toggle();
      renderMusicSelector();
    });

    document.querySelectorAll('.genre-btn').forEach((btn) => {
      btn.addEventListener('click', () => selectGenre(btn.dataset.genre));
    });

    document.getElementById('goalOptions').addEventListener('click', (e) => {
      const btn = e.target.closest('.option-card');
      if (!btn) return;
      chooseGoal(btn.dataset.goal);
    });
    document.getElementById('goalCancelBtn').addEventListener('click', () => hide('goalModal'));

    document.getElementById('muscleBackBtn').addEventListener('click', () => {
      hide('muscleModal');
      show('goalModal');
    });
    document.getElementById('muscleStartBtn').addEventListener('click', startSession);

    document.getElementById('addTaskCancelBtn').addEventListener('click', () => hide('addTaskModal'));
    document.getElementById('addTaskConfirmBtn').addEventListener('click', () => {
      addTask(document.getElementById('addTaskInput').value);
      hide('addTaskModal');
    });
    document.getElementById('addTaskInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addTask(e.target.value);
        hide('addTaskModal');
      }
    });
  }

  function init() {
    window.FitSparkAudio.setGenre(state.musicGenre, false);
    initEvents();
    renderMusicSelector();
    render();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
