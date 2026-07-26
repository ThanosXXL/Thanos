(function () {
  'use strict';

  const DATA = window.MYWORKOUT_DATA;
  const STORAGE_KEY = 'myworkout-state';

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function defaultState() {
    const tasks = DATA.DEFAULT_TASKS.map((text) => ({ id: uid(), text, done: false }));
    return {
      date: todayKey(),
      taskMode: 'fixed', // 'fixed' | 'mixed' (alle 3 Tage neu gemischt)
      fixedTasks: tasks,
      taskCycle: null,
      tasks,
      musicGenre: 'samba',
      activeSession: null, // { goal, muscles: [], exercises: [{id,name,muscle,done}] }
    };
  }

  // Anzahl ganzer Tage seit der Unix-Epoche, fürs 3-Tage-Mischintervall.
  function daysSinceEpoch(dateKey) {
    return Math.floor(new Date(dateKey + 'T00:00:00Z').getTime() / 86400000);
  }

  function currentCycleIndex() {
    return Math.floor(daysSinceEpoch(todayKey()) / 3);
  }

  // Deterministischer Pseudo-Zufall je Zyklus, damit dieselben 3 Tage
  // immer dieselbe Auswahl aus dem Aufgabenpool ergeben.
  function tasksForCycle(cycleIndex) {
    const pool = DATA.TASK_POOL;
    const order = pool.map((_, i) => i);
    let seed = (cycleIndex + 1) * 2654435761;
    for (let i = order.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order.slice(0, 4).map((i) => pool[i]);
  }

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
    if (saved.taskMode !== 'mixed') saved.taskMode = 'fixed';
    if (!Array.isArray(saved.fixedTasks)) saved.fixedTasks = saved.tasks;

    if (saved.taskMode === 'mixed') {
      const cycle = currentCycleIndex();
      if (saved.taskCycle !== cycle) {
        saved.taskCycle = cycle;
        saved.tasks = tasksForCycle(cycle).map((text) => ({ id: uid(), text, done: false }));
      }
    }
    return saved;
  }

  let state = load();

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

  function setTaskMode(mode) {
    if (mode === state.taskMode) return;
    if (mode === 'mixed') {
      state.fixedTasks = state.tasks;
      const cycle = currentCycleIndex();
      state.taskCycle = cycle;
      state.tasks = tasksForCycle(cycle).map((text) => ({ id: uid(), text, done: false }));
      state.taskMode = 'mixed';
    } else {
      state.tasks = (state.fixedTasks || DATA.DEFAULT_TASKS.map((text) => ({ id: uid(), text, done: false })))
        .map((t) => ({ ...t, done: false }));
      state.taskMode = 'fixed';
    }
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
    updateProgramBadge();

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
    updateProgramBadge();
    render();
  }

  function updateProgramBadge() {
    const badge = document.getElementById('programBadge');
    if (state.activeSession) {
      const scheme = DATA.GOAL_SCHEMES[state.activeSession.goal];
      badge.textContent = `${scheme.durationWeeks} Wochen`;
      badge.hidden = false;
    } else {
      badge.textContent = '';
      badge.hidden = true;
    }
  }

  // ---------- Musik ----------

  function selectGenre(genreId) {
    state.musicGenre = genreId;
    persist();
    window.MyWorkoutAudio.setGenre(genreId, true);
    renderMusicSelector();
  }

  function renderMusicSelector() {
    document.querySelectorAll('.genre-btn').forEach((btn) => {
      const active = btn.dataset.genre === state.musicGenre;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    const playBtn = document.getElementById('musicPlayBtn');
    playBtn.textContent = window.MyWorkoutAudio.isPlaying() ? '❚❚' : '▶';
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

    const modeRow = document.createElement('div');
    modeRow.className = 'chip-grid task-mode-row';

    const fixedChip = document.createElement('button');
    fixedChip.className = 'chip' + (state.taskMode === 'fixed' ? ' selected' : '');
    fixedChip.type = 'button';
    fixedChip.textContent = 'Feste Liste';
    fixedChip.addEventListener('click', () => setTaskMode('fixed'));
    modeRow.appendChild(fixedChip);

    const mixedChip = document.createElement('button');
    mixedChip.className = 'chip' + (state.taskMode === 'mixed' ? ' selected' : '');
    mixedChip.type = 'button';
    mixedChip.textContent = 'Alle 3 Tage mischen';
    mixedChip.addEventListener('click', () => setTaskMode('mixed'));
    modeRow.appendChild(mixedChip);

    wrap.appendChild(modeRow);

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

  // Baut die 2 Pose-Icons (Start/Ende einer Wiederholung) für eine Übung.
  // Das SVG-Markup kommt aus exercise-icons.js (statisch, entwicklerseitig
  // erzeugt - keine Nutzereingabe), daher ist innerHTML hier unbedenklich.
  function buildExerciseIcons(name, size) {
    const wrap = document.createElement('div');
    wrap.className = 'exercise-icons';
    window.MYWORKOUT_ICONS.iconsForExercise(name, size || 34).forEach((svg) => {
      const badge = document.createElement('span');
      badge.className = 'exercise-icon';
      badge.innerHTML = svg;
      wrap.appendChild(badge);
    });
    return wrap;
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

      li.appendChild(buildExerciseIcons(ex.name, 34));

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
        const nameCell = document.createElement('div');
        nameCell.className = 'exercise-name-cell';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameCell.appendChild(nameSpan);
        nameCell.appendChild(buildExerciseIcons(name, 30));
        tdName.appendChild(nameCell);
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
      window.MyWorkoutAudio.toggle();
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
    window.MyWorkoutAudio.setGenre(state.musicGenre, false);
    initEvents();
    renderMusicSelector();
    updateProgramBadge();
    render();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
