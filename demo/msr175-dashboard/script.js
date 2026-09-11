(function () {
  "use strict";

  /* ============ Stammdaten (Demo) ============ */

  const PLANTS = [
    { id: "lueftung1", name: "Lüftungsanlage 1", status: "running", temp: 21.4, tempUnit: "°C", pressure: 120, pressureUnit: "Pa", valve: 62 },
    { id: "heizkreisA", name: "Heizkreis A", status: "running", temp: 58.2, tempUnit: "°C", pressure: 2.1, pressureUnit: "bar", valve: 45 },
    { id: "heizkreisB", name: "Heizkreis B", status: "fault", temp: 71.5, tempUnit: "°C", pressure: 2.8, pressureUnit: "bar", valve: 88 },
    { id: "kaelte1", name: "Kältemaschine 1", status: "running", temp: 6.8, tempUnit: "°C", pressure: 4.2, pressureUnit: "bar", valve: 30 },
  ];

  const ALARMS = [
    { sev: "danger", plant: "Heizkreis B", message: "Vorlauftemperatur über Grenzwert (71.5 °C)", time: "vor 6 Min." },
    { sev: "warn", plant: "Lüftungsanlage 1", message: "Filterwechsel fällig", time: "vor 34 Min." },
    { sev: "warn", plant: "Kältemaschine 1", message: "Druck nahe oberem Schwellwert", time: "vor 1 Std." },
  ];

  const MEASUREMENTS = [
    { point: "T1 · Vorlauftemperatur", value: "58.2 °C", range: "55–60 °C", status: "ok" },
    { point: "T2 · Rücklauftemperatur", value: "44.6 °C", range: "40–46 °C", status: "ok" },
    { point: "P1 · Systemdruck", value: "2.1 bar", range: "1.8–2.4 bar", status: "ok" },
    { point: "V1 · Ventilstellung", value: "45 %", range: "30–70 %", status: "ok" },
    { point: "F1 · Durchfluss", value: "3.4 m³/h", range: "3.0–4.0 m³/h", status: "warn" },
  ];

  const SWITCH_HISTORY = [
    { time: "09:42", plant: "Heizkreis A", action: "Pumpe P1 → Automatik", by: "System" },
    { time: "08:15", plant: "Lüftungsanlage 1", action: "Ventilator V1 EIN", by: "M. Keller" },
    { time: "07:03", plant: "Kältemaschine 1", action: "Sollwert auf 7 °C geändert", by: "T. Ambauen" },
    { time: "06:00", plant: "Heizkreis B", action: "Automatikstart", by: "System" },
  ];

  const STRATEGIC_GAUGES = [
    { label: "OEE (Gesamteffizienz)", value: 87, unit: "%", color: "#26d29c" },
    { label: "Verfügbarkeit", value: 98.6, unit: "%", color: "#4fa3ff" },
    { label: "CO₂-Ausstoß (Monat)", value: 4.2, unit: "t", pct: 42, color: "#ffb020" },
    { label: "Energiekosten (Monat)", value: 12480, unit: "€", pct: 68, color: "#c084fc" },
  ];

  const RANGES = {
    day: { points: 24, label: "Uhrzeit" },
    week: { points: 7, label: "Wochentag" },
    month: { points: 30, label: "Tag" },
  };

  function genSeries(n, base, amp) {
    return Array.from({ length: n }, (_, i) => base + Math.sin(i / (n / 6)) * amp + (Math.random() - 0.5) * amp * 0.3);
  }

  /* ============ Helpers ============ */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function statusLabel(status) {
    if (status === "running") return "Läuft";
    if (status === "fault") return "Gestört";
    return "Aus";
  }

  function drawLineChart(canvas, series, opts) {
    opts = opts || {};
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssHeight = opts.height || rect.height || 200;
    canvas.width = rect.width * dpr;
    canvas.height = cssHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = cssHeight;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const all = series.flatMap((s) => s.data);
    const min = Math.min(...all);
    const max = Math.max(...all);
    const range = max - min || 1;

    series.forEach((s) => {
      const data = s.data;
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 20) - 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.stroke();

      if (opts.fill) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, s.color + "33");
        grad.addColorStop(1, s.color + "00");
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }
    });
  }

  function buildLegend(container, items) {
    container.innerHTML = "";
    items.forEach((it) => {
      const span = el("span");
      const dot = el("i");
      dot.style.background = it.color;
      span.appendChild(dot);
      span.appendChild(document.createTextNode(it.label));
      container.appendChild(span);
    });
  }

  function gaugeSvg(pct, color) {
    const r = 50, cx = 60, cy = 60;
    const len = Math.PI * r;
    const offset = len * (1 - Math.min(Math.max(pct, 0), 100) / 100);
    return (
      '<svg viewBox="0 0 120 66" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="rgba(10,31,68,0.12)" stroke-width="10" stroke-linecap="round" />' +
      '<path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="' + color + '" stroke-width="10" stroke-linecap="round" ' +
      'stroke-dasharray="' + len.toFixed(2) + '" stroke-dashoffset="' + offset.toFixed(2) + '" />' +
      "</svg>"
    );
  }

  /* ============ Übersicht (Home) ============ */

  function renderHome() {
    const grid = document.getElementById("home-kpi-grid");
    grid.innerHTML = "";
    const activeCount = PLANTS.filter((p) => p.status === "running").length;
    const kpis = [
      { icon: "⬡", label: "Anlagen aktiv", value: activeCount + " / " + PLANTS.length },
      { icon: "⚠", label: "Aktive Alarme", value: String(ALARMS.length) },
      { icon: "⚡", label: "Energieverbrauch heute", value: "842", unit: "kWh" },
      { icon: "◉", label: "OEE (Gesamteffizienz)", value: "87", unit: "%" },
    ];
    kpis.forEach((k) => {
      const card = el("div", "kpi-card");
      const top = el("div", "kpi-top");
      const icon = el("div", "kpi-icon", k.icon);
      top.appendChild(icon);
      const label = el("p", "kpi-label", k.label);
      const value = el("p", "kpi-value", k.value + " ");
      if (k.unit) value.appendChild(el("small", null, k.unit));
      card.appendChild(top);
      card.appendChild(label);
      card.appendChild(value);
      grid.appendChild(card);
    });

    document.getElementById("home-alarm-count").textContent = String(ALARMS.length);
    const alarmList = document.getElementById("home-alarm-list");
    alarmList.innerHTML = "";
    ALARMS.forEach((a) => {
      const li = el("li", "event-item");
      li.appendChild(el("span", "event-sev " + a.sev));
      const body = el("div", "event-body");
      body.appendChild(el("strong", null, a.plant));
      body.appendChild(el("span", null, a.message + " · " + a.time));
      li.appendChild(body);
      alarmList.appendChild(li);
    });

    const statusList = document.getElementById("home-plant-status");
    statusList.innerHTML = "";
    PLANTS.forEach((p) => {
      const li = el("li");
      li.appendChild(el("span", null, p.name));
      li.appendChild(el("span", "status-tag " + p.status, statusLabel(p.status)));
      statusList.appendChild(li);
    });
  }

  /* ============ Operativ ============ */

  function renderPlantStatusGrid(targetId) {
    const grid = document.getElementById(targetId);
    grid.innerHTML = "";
    PLANTS.forEach((p) => {
      const card = el("div", "status-card");
      const head = el("div", "status-card-head");
      head.appendChild(el("strong", null, p.name));
      head.appendChild(el("span", "status-dot " + p.status));
      card.appendChild(head);

      const metrics = el("div", "status-card-metrics");
      const rowTemp = el("div");
      rowTemp.appendChild(el("span", null, "Temperatur"));
      rowTemp.appendChild(el("strong", null, p.temp + " " + p.tempUnit));
      const rowPress = el("div");
      rowPress.appendChild(el("span", null, "Druck"));
      rowPress.appendChild(el("strong", null, p.pressure + " " + p.pressureUnit));
      const rowValve = el("div");
      rowValve.appendChild(el("span", null, "Ventilstellung"));
      rowValve.appendChild(el("strong", null, p.valve + " %"));
      metrics.appendChild(rowTemp);
      metrics.appendChild(rowPress);
      metrics.appendChild(rowValve);
      card.appendChild(metrics);

      grid.appendChild(card);
    });
  }

  function renderAlarmTable() {
    document.getElementById("operative-alarm-count").textContent = String(ALARMS.length);
    const body = document.getElementById("alarm-table-body");
    body.innerHTML = "";
    ALARMS.forEach((a) => {
      const tr = document.createElement("tr");

      const tdSev = document.createElement("td");
      const chip = el("span", "sev-chip " + a.sev, a.sev === "danger" ? "Kritisch" : a.sev === "warn" ? "Warnung" : "OK");
      tdSev.appendChild(chip);

      const tdPlant = document.createElement("td");
      tdPlant.textContent = a.plant;
      const tdMsg = document.createElement("td");
      tdMsg.textContent = a.message;
      const tdTime = document.createElement("td");
      tdTime.textContent = a.time;
      const tdAction = document.createElement("td");
      const btn = el("button", "ack-btn", "Quittieren");
      tdAction.appendChild(btn);

      tr.appendChild(tdSev);
      tr.appendChild(tdPlant);
      tr.appendChild(tdMsg);
      tr.appendChild(tdTime);
      tr.appendChild(tdAction);
      body.appendChild(tr);
    });
  }

  /* ============ Analytisch ============ */

  const analyticsSeries = {
    day: [{ label: "Heizkreis A", color: "#4fa3ff", data: genSeries(24, 55, 8) }, { label: "Heizkreis B", color: "#ff5470", data: genSeries(24, 60, 10) }],
    week: [{ label: "Heizkreis A", color: "#4fa3ff", data: genSeries(7, 54, 6) }, { label: "Heizkreis B", color: "#ff5470", data: genSeries(7, 58, 9) }],
    month: [{ label: "Heizkreis A", color: "#4fa3ff", data: genSeries(30, 53, 7) }, { label: "Heizkreis B", color: "#ff5470", data: genSeries(30, 59, 11) }],
  };

  function renderAnalytics(range) {
    range = range || "day";
    const series = analyticsSeries[range];
    buildLegend(document.getElementById("analytics-legend"), series);
    const chart = document.getElementById("load-chart");
    drawLineChart(chart, series, { height: 240 });

    const energy = document.getElementById("energy-chart");
    drawLineChart(
      energy,
      [{ color: "#26d29c", data: genSeries(RANGES[range].points, 700, 120) }],
      { height: 180, fill: true }
    );
  }

  function setupRangeSelect() {
    const buttons = document.querySelectorAll("#range-select button");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderAnalytics(btn.dataset.range);
      });
    });
  }

  /* ============ System & Anlagen ============ */

  function renderSchema() {
    const wrap = document.getElementById("schema-wrap");
    wrap.innerHTML =
      '<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg">' +
      '<line x1="60" y1="110" x2="580" y2="110" stroke="#4fa3ff" stroke-width="4" />' +
      '<rect x="30" y="80" width="70" height="60" rx="8" fill="#0d2b5e" stroke="#4fa3ff" stroke-width="1.5" />' +
      '<text x="65" y="75" text-anchor="middle" class="schema-label">Kessel</text>' +
      '<circle cx="200" cy="110" r="22" fill="#123a78" stroke="#4fa3ff" stroke-width="1.5" />' +
      '<text x="200" y="80" text-anchor="middle" class="schema-label">Pumpe P1</text>' +
      '<rect x="300" y="90" width="40" height="40" rx="6" fill="#123a78" stroke="#ffb020" stroke-width="1.5" />' +
      '<text x="320" y="75" text-anchor="middle" class="schema-label">Ventil V1</text>' +
      '<text x="320" y="150" text-anchor="middle" class="schema-value">45%</text>' +
      '<circle cx="420" cy="110" r="16" fill="#0d2b5e" stroke="#26d29c" stroke-width="1.5" />' +
      '<text x="420" y="80" text-anchor="middle" class="schema-label">T1</text>' +
      '<text x="420" y="150" text-anchor="middle" class="schema-value">58.2°C</text>' +
      '<rect x="520" y="75" width="70" height="70" rx="8" fill="#0d2b5e" stroke="#4fa3ff" stroke-width="1.5" />' +
      '<text x="555" y="70" text-anchor="middle" class="schema-label">Verteiler</text>' +
      "</svg>";
  }

  function renderMeasureTable() {
    const body = document.getElementById("measure-table-body");
    body.innerHTML = "";
    MEASUREMENTS.forEach((m) => {
      const tr = document.createElement("tr");
      const tdPoint = document.createElement("td");
      tdPoint.textContent = m.point;
      const tdValue = document.createElement("td");
      tdValue.textContent = m.value;
      const tdRange = document.createElement("td");
      tdRange.textContent = m.range;
      const tdStatus = document.createElement("td");
      tdStatus.appendChild(el("span", "sev-chip " + m.status, m.status === "ok" ? "OK" : "Prüfen"));
      tr.appendChild(tdPoint);
      tr.appendChild(tdValue);
      tr.appendChild(tdRange);
      tr.appendChild(tdStatus);
      body.appendChild(tr);
    });
  }

  function renderSwitchTable() {
    const body = document.getElementById("switch-table-body");
    body.innerHTML = "";
    SWITCH_HISTORY.forEach((s) => {
      const tr = document.createElement("tr");
      [s.time, s.plant, s.action, s.by].forEach((val) => {
        const td = document.createElement("td");
        td.textContent = val;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  /* ============ Strategisch ============ */

  function renderStrategic() {
    const grid = document.getElementById("strategic-gauges");
    grid.innerHTML = "";
    STRATEGIC_GAUGES.forEach((g) => {
      const card = el("div", "gauge-card");
      const pct = g.pct !== undefined ? g.pct : g.value;
      const displayValue = g.unit === "€" ? g.value.toLocaleString("de-DE") : g.value;
      card.innerHTML = gaugeSvg(pct, g.color);
      card.appendChild(el("div", "gauge-value", displayValue + " " + g.unit));
      card.appendChild(el("div", "gauge-label", g.label));
      grid.appendChild(card);
    });

    buildLegend(document.getElementById("strategic-legend"), [
      { label: "Energiekosten (T€)", color: "#c084fc" },
      { label: "CO₂ (t)", color: "#ffb020" },
    ]);
    drawLineChart(
      document.getElementById("strategic-chart"),
      [
        { color: "#c084fc", data: genSeries(12, 11, 2.5) },
        { color: "#ffb020", data: genSeries(12, 4.2, 1) },
      ],
      { height: 220 }
    );
  }

  /* ============ Sidebar: Alarme, Rollen, Anlagenliste ============ */

  // Welche Ansichten pro Rolle sichtbar/nutzbar sind — spiegelt die
  // Zielgruppen der vier Dashboard-Ebenen (Operativ: Bediener/Haustechniker,
  // Analytisch: Ingenieure/Energiebeauftragte, Strategisch: Facility
  // Manager/Management). "Übersicht" bleibt für alle Rollen verfügbar.
  const ROLE_VIEWS = {
    all: ["home", "operative", "analytics", "plant", "strategic"],
    operator: ["home", "operative", "plant"],
    energy: ["home", "analytics", "plant"],
    facility: ["home", "strategic"],
  };

  let currentRole = "all";

  function renderSidebarAlarms() {
    const pill = document.getElementById("sidebar-alarm-pill");
    const countEl = document.getElementById("sidebar-alarm-count");
    const subEl = document.getElementById("sidebar-alarm-sub");
    const iconEl = document.getElementById("sidebar-alarm-icon");

    const hasDanger = ALARMS.some((a) => a.sev === "danger");
    const hasWarn = ALARMS.some((a) => a.sev === "warn");

    pill.classList.toggle("has-danger", hasDanger);
    pill.classList.toggle("has-warn", !hasDanger && hasWarn);

    if (ALARMS.length === 0) {
      countEl.textContent = "0";
      subEl.textContent = "Keine aktiven Alarme";
      iconEl.textContent = "✓";
    } else {
      countEl.textContent = String(ALARMS.length);
      subEl.textContent = ALARMS.length === 1 ? "Aktiver Alarm" : "Aktive Alarme";
      iconEl.textContent = "⚠";
    }
  }

  function renderSidebarPlants() {
    const list = document.getElementById("sidebar-plant-list");
    const countEl = document.getElementById("sidebar-plants-count");
    list.innerHTML = "";

    const runningCount = PLANTS.filter((p) => p.status === "running").length;
    countEl.textContent = runningCount + " / " + PLANTS.length;

    PLANTS.forEach((p) => {
      const row = el("button", "sidebar-plant-row");
      row.type = "button";
      row.appendChild(el("span", "status-dot " + p.status));
      row.appendChild(el("span", null, p.name));
      row.addEventListener("click", () => navigateTo("operative", "home"));
      list.appendChild(row);
    });
  }

  function applyRoleVisibility(role) {
    currentRole = role;
    const allowed = ROLE_VIEWS[role];
    document.querySelectorAll(".nav-item").forEach((btn) => {
      const view = btn.dataset.view;
      btn.classList.toggle("disabled", allowed.indexOf(view) === -1);
    });

    const activeBtn = document.querySelector(".nav-item.active");
    if (activeBtn && allowed.indexOf(activeBtn.dataset.view) === -1) {
      navigateTo("home");
    }
  }

  function setupSidebarExtras() {
    document.getElementById("sidebar-alarm-pill").addEventListener("click", () => {
      navigateTo("operative", "home");
    });

    document.getElementById("role-select").addEventListener("change", (e) => {
      applyRoleVisibility(e.target.value);
    });
  }

  /* ============ Navigation & Uhrzeit ============ */

  const VIEW_META = {
    home: { title: "Übersicht", subtitle: "Persönliches Dashboard · Gebäude West, alle Anlagen" },
    operative: { title: "Operativ", subtitle: "Echtzeit-Überwachung & Alarm-/Störungsmanagement" },
    analytics: { title: "Analytisch", subtitle: "Historische Auswertung, Fehlersuche & Optimierung" },
    plant: { title: "System & Anlagen", subtitle: "Anlagengrafik, Messwerte und Schalthistorie" },
    strategic: { title: "Strategisch", subtitle: "Enterprise-KPIs für Management-Ebene" },
  };

  // Wechselt zur gewünschten Ansicht; ist sie für die aktuelle Rolle nicht
  // freigegeben, wird stattdessen (falls angegeben) die Fallback-Ansicht
  // geöffnet.
  function navigateTo(view, fallback) {
    if (ROLE_VIEWS[currentRole].indexOf(view) === -1) {
      if (fallback && ROLE_VIEWS[currentRole].indexOf(fallback) !== -1) {
        view = fallback;
      } else {
        return;
      }
    }

    document.querySelectorAll(".nav-item").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === view);
    });
    document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
    document.getElementById("view-" + view).classList.remove("hidden");
    document.getElementById("view-title").textContent = VIEW_META[view].title;
    document.getElementById("view-subtitle").textContent = VIEW_META[view].subtitle;

    if (view === "analytics") renderAnalytics("day");
    if (view === "plant") renderSchema();
    if (view === "strategic") renderStrategic();
  }

  function setupNav() {
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("disabled")) return;
        navigateTo(btn.dataset.view);
      });
    });
  }

  function tickClock() {
    const el = document.getElementById("clock");
    el.textContent = new Date().toLocaleTimeString("de-DE");
  }

  function init() {
    renderHome();
    renderPlantStatusGrid("plant-status-grid");
    renderAlarmTable();
    renderAnalytics("day");
    setupRangeSelect();
    renderSchema();
    renderMeasureTable();
    renderSwitchTable();
    renderStrategic();
    renderSidebarAlarms();
    renderSidebarPlants();
    setupSidebarExtras();
    setupNav();
    tickClock();

    setInterval(tickClock, 1000);
    window.addEventListener("resize", () => {
      const activeView = document.querySelector(".nav-item.active").dataset.view;
      if (activeView === "analytics") {
        const activeRange = document.querySelector("#range-select button.active").dataset.range;
        renderAnalytics(activeRange);
      }
      if (activeView === "strategic") renderStrategic();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
