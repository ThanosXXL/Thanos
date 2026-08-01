(function () {
  "use strict";

  const SENSORS = [
    { key: "temp", label: "Temperatur", unit: "°C", icon: "🌡", base: 22.4, jitter: 0.3, color: "#4fa3ff" },
    { key: "humidity", label: "Luftfeuchtigkeit", unit: "%", icon: "💧", base: 46, jitter: 1.2, color: "#26d29c" },
    { key: "pressure", label: "Luftdruck", unit: "hPa", icon: "◔", base: 1013, jitter: 0.8, color: "#ffb020" },
    { key: "light", label: "Beleuchtungsstärke", unit: "lx", icon: "☀", base: 340, jitter: 15, color: "#c084fc" },
    { key: "shock", label: "Erschütterung", unit: "g", icon: "⚡", base: 0.08, jitter: 0.03, color: "#ff5470" },
    { key: "battery", label: "Batteriespannung", unit: "V", icon: "🔋", base: 3.61, jitter: 0.01, color: "#4fa3ff" },
    { key: "signal", label: "Signalstärke", unit: "dBm", icon: "📶", base: -62, jitter: 2, color: "#26d29c" },
    { key: "storage", label: "Speicherbelegung", unit: "%", icon: "🗄", base: 34, jitter: 0.4, color: "#ffb020" },
  ];

  const HISTORY_LENGTH = 40;
  const state = {};
  SENSORS.forEach((s) => {
    state[s.key] = Array.from({ length: HISTORY_LENGTH }, () => s.base);
  });

  const EVENTS = [
    { sev: "ok", title: "Aufzeichnung gestartet", time: "vor 2 Std.", detail: "Automatischer Start nach Zeitplan" },
    { sev: "warn", title: "Temperatur nahe Schwellwert", time: "vor 48 Min.", detail: "24.8 °C bei Grenzwert 25.0 °C" },
    { sev: "danger", title: "Erschütterung erkannt", time: "vor 22 Min.", detail: "Spitzenwert 1.4 g registriert" },
    { sev: "ok", title: "Synchronisierung erfolgreich", time: "vor 2 Min.", detail: "128 neue Messpunkte übertragen" },
  ];

  function randomWalk(value, base, jitter) {
    const next = value + (Math.random() - 0.5) * jitter;
    return next + (base - next) * 0.05;
  }

  function formatValue(key, value) {
    if (key === "signal" || key === "shock") return value.toFixed(2);
    if (key === "pressure" || key === "light") return Math.round(value).toString();
    return value.toFixed(1);
  }

  function buildKpiGrid() {
    const grid = document.getElementById("kpi-grid");
    grid.innerHTML = "";
    SENSORS.forEach((s) => {
      const card = document.createElement("div");
      card.className = "kpi-card";
      card.dataset.key = s.key;

      const top = document.createElement("div");
      top.className = "kpi-top";

      const icon = document.createElement("div");
      icon.className = "kpi-icon";
      icon.textContent = s.icon;

      const trend = document.createElement("div");
      trend.className = "kpi-trend flat";
      trend.textContent = "±0.0";

      top.appendChild(icon);
      top.appendChild(trend);

      const label = document.createElement("p");
      label.className = "kpi-label";
      label.textContent = s.label;

      const value = document.createElement("p");
      value.className = "kpi-value";
      const unit = document.createElement("small");
      unit.textContent = s.unit;
      value.textContent = formatValue(s.key, s.base) + " ";
      value.appendChild(unit);

      const sparkWrap = document.createElement("div");
      sparkWrap.className = "kpi-spark";
      const sparkCanvas = document.createElement("canvas");
      sparkCanvas.width = 240;
      sparkCanvas.height = 68;
      sparkCanvas.style.width = "100%";
      sparkCanvas.style.height = "100%";
      sparkWrap.appendChild(sparkCanvas);

      card.appendChild(top);
      card.appendChild(label);
      card.appendChild(value);
      card.appendChild(sparkWrap);
      grid.appendChild(card);

      s._els = { trend, value, unit, sparkCanvas };
    });
  }

  function drawSparkline(canvas, data, color) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 8) - 4;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + "33");
    grad.addColorStop(1, color + "00");
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function updateKpis() {
    SENSORS.forEach((s) => {
      const hist = state[s.key];
      const prev = hist[hist.length - 1];
      const next = randomWalk(prev, s.base, s.jitter);
      hist.push(next);
      hist.shift();

      const { trend, value, unit, sparkCanvas } = s._els;
      value.textContent = formatValue(s.key, next) + " ";
      value.appendChild(unit);

      const delta = next - prev;
      const deltaAbs = Math.abs(delta).toFixed(2);
      if (Math.abs(delta) < 0.01) {
        trend.className = "kpi-trend flat";
        trend.textContent = "±0.0";
      } else if (delta > 0) {
        trend.className = "kpi-trend up";
        trend.textContent = "▲ " + deltaAbs;
      } else {
        trend.className = "kpi-trend down";
        trend.textContent = "▼ " + deltaAbs;
      }

      drawSparkline(sparkCanvas, hist, s.color);
    });
  }

  const CHART_KEYS = ["temp", "humidity", "pressure"];

  function buildChartLegend() {
    const legend = document.getElementById("chart-legend");
    legend.innerHTML = "";
    CHART_KEYS.forEach((key) => {
      const s = SENSORS.find((x) => x.key === key);
      const span = document.createElement("span");
      const dot = document.createElement("i");
      dot.style.background = s.color;
      span.appendChild(dot);
      span.appendChild(document.createTextNode(s.label));
      legend.appendChild(span);
    });
  }

  function drawMainChart() {
    const canvas = document.getElementById("chart");
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 220 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = 220;
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

    CHART_KEYS.forEach((key) => {
      const s = SENSORS.find((x) => x.key === key);
      const data = state[key];
      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;

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
    });
  }

  function buildEventList(targetId, items) {
    const list = document.getElementById(targetId);
    list.innerHTML = "";
    items.forEach((ev) => {
      const li = document.createElement("li");
      li.className = "event-item";

      const sev = document.createElement("span");
      sev.className = "event-sev " + ev.sev;

      const body = document.createElement("div");
      body.className = "event-body";
      const title = document.createElement("strong");
      title.textContent = ev.title;
      const meta = document.createElement("span");
      meta.textContent = ev.detail + " · " + ev.time;

      body.appendChild(title);
      body.appendChild(meta);
      li.appendChild(sev);
      li.appendChild(body);
      list.appendChild(li);
    });
  }

  function setupNav() {
    const items = document.querySelectorAll(".nav-item");
    items.forEach((btn) => {
      btn.addEventListener("click", () => {
        items.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const view = btn.dataset.view;
        document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
        document.getElementById("view-" + view).classList.remove("hidden");
      });
    });
  }

  function tickClock() {
    const el = document.getElementById("clock");
    const now = new Date();
    el.textContent = now.toLocaleTimeString("de-DE");
  }

  function init() {
    buildKpiGrid();
    buildChartLegend();
    buildEventList("event-list", EVENTS);
    buildEventList("event-list-full", EVENTS);
    setupNav();
    tickClock();
    drawMainChart();
    SENSORS.forEach((s) => drawSparkline(s._els.sparkCanvas, state[s.key], s.color));

    setInterval(tickClock, 1000);
    setInterval(() => {
      updateKpis();
      drawMainChart();
    }, 1800);

    window.addEventListener("resize", drawMainChart);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
