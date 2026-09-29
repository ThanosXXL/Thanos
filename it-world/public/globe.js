// IT - World · rotierender 3D-Globus (Canvas, ohne Bibliotheken).
// Landpunkte stammen aus assets/globe-dots.json (erzeugt von tools/gen-globe.mjs).
(function () {
  'use strict';

  // Relativ zum Skript auflösen – funktioniert im Server und in den Marketing-Vorlagen (file://)
  const DOTS_URL = new URL('assets/globe-dots.json', document.currentScript ? document.currentScript.src : location.href).href;
  let dotsPromise = null;
  function loadDots() {
    if (!dotsPromise) dotsPromise = fetch(DOTS_URL).then(r => r.json()).catch(() => []);
    return dotsPromise;
  }

  const RAD = Math.PI / 180;

  function mount(canvas, opts = {}) {
    const o = Object.assign({ speed: 6, lat0: 20, lon0: -20, ring: true, glow: true, animate: true, scale: 0.33 }, opts);
    const ctx = canvas.getContext('2d');
    let dots = [];
    let lon0 = o.lon0;
    let last = performance.now();
    let raf = 0;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (o.animate && !reduceMotion) lon0 -= o.speed * dt;
      const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * o.scale;
      ctx.clearRect(0, 0, w, h);

      const p0 = o.lat0 * RAD, sinP0 = Math.sin(p0), cosP0 = Math.cos(p0);
      const ringTilt = -18 * RAD;
      const oRx = R * 1.42, oRy = R * 0.36;
      const satAngle = (now / 1000) * 0.6;

      // Außenglühen
      if (o.glow) {
        const g = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.45);
        g.addColorStop(0, 'rgba(212,165,58,0.32)'); g.addColorStop(1, 'rgba(212,165,58,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2); ctx.fill();
      }

      const ring = (from, to, width, alpha) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ringTilt);
        const lg = ctx.createLinearGradient(-oRx, 0, oRx, 0);
        lg.addColorStop(0, '#7a5410'); lg.addColorStop(0.35, '#ffe8a3'); lg.addColorStop(0.6, '#e2b247'); lg.addColorStop(1, '#7a5410');
        ctx.strokeStyle = lg; ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.ellipse(0, 0, oRx, oRy, 0, from, to); ctx.stroke();
        ctx.restore();
      };
      const satellite = (front) => {
        const a = satAngle % (Math.PI * 2);
        const isFront = a < Math.PI;
        if (isFront !== front) return;
        const x = oRx * Math.cos(a), y = oRy * Math.sin(a);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ringTilt);
        const sg = ctx.createRadialGradient(x, y, 0, x, y, R * 0.14);
        sg.addColorStop(0, 'rgba(255,244,200,0.9)'); sg.addColorStop(1, 'rgba(255,244,200,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, R * 0.14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff4c8'; ctx.beginPath(); ctx.arc(x, y, R * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      };

      if (o.ring) { ring(Math.PI, Math.PI * 2, R * 0.045, 0.7); satellite(false); }

      // Kugel (dunkles "Meer" mit goldenem Schimmer)
      const ocean = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.45, R * 0.05, cx, cy, R * 1.05);
      ocean.addColorStop(0, '#3a2a0c'); ocean.addColorStop(0.45, '#16110a'); ocean.addColorStop(1, '#030303');
      ctx.fillStyle = ocean; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

      // Gradnetz
      ctx.strokeStyle = 'rgba(212,165,58,0.2)'; ctx.lineWidth = Math.max(0.6, R / 220);
      const proj = (lon, lat) => {
        const l = (lon - lon0) * RAD, p = lat * RAD;
        const cp = Math.cos(p), sp = Math.sin(p), cl = Math.cos(l);
        return [cp * Math.sin(l), -(cosP0 * sp - sinP0 * cp * cl), sinP0 * sp + cosP0 * cp * cl];
      };
      const pathLine = (pts) => {
        let pen = false;
        ctx.beginPath();
        for (const [lon, lat] of pts) {
          const [x, y, z] = proj(lon, lat);
          if (z > 0) { pen ? ctx.lineTo(cx + x * R, cy + y * R) : ctx.moveTo(cx + x * R, cy + y * R); pen = true; } else pen = false;
        }
        ctx.stroke();
      };
      for (let lat = -60; lat <= 60; lat += 30) { const pts = []; for (let lon = -180; lon <= 180; lon += 5) pts.push([lon, lat]); pathLine(pts); }
      for (let lon = -180; lon < 180; lon += 30) { const pts = []; for (let lat = -90; lat <= 90; lat += 5) pts.push([lon, lat]); pathLine(pts); }

      // Landpunkte
      const dotBase = R / 150;
      for (let i = 0; i < dots.length; i++) {
        const [x, y, z] = proj(dots[i][0], dots[i][1]);
        if (z <= 0.02) continue;
        const light = Math.max(0, Math.min(1, 0.55 + 0.45 * (-x * 0.6 - y * 0.6 + z * 0.5)));
        const a = (0.35 + 0.65 * z) * (0.6 + 0.4 * light);
        const r = (0.55 + 0.9 * z) * dotBase;
        const c = Math.round(180 + 75 * light);
        ctx.fillStyle = `rgba(${Math.min(255, c + 20)},${Math.round(c * 0.78)},${Math.round(c * 0.3)},${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(cx + x * R, cy + y * R, r, 0, Math.PI * 2); ctx.fill();
      }

      // Glanzlicht
      const gloss = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.52, 0, cx - R * 0.32, cy - R * 0.52, R * 0.95);
      gloss.addColorStop(0, 'rgba(255,255,255,0.45)'); gloss.addColorStop(0.55, 'rgba(255,255,255,0.05)'); gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gloss; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.restore();

      // Randlicht
      const rim = ctx.createRadialGradient(cx, cy, R * 0.86, cx, cy, R);
      rim.addColorStop(0, 'rgba(212,165,58,0)'); rim.addColorStop(0.75, 'rgba(243,207,107,0.45)'); rim.addColorStop(1, 'rgba(255,240,176,0.9)');
      ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      if (o.ring) { ring(0, Math.PI, R * 0.05, 1); satellite(true); }

      if (o.animate && !reduceMotion) raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', () => { resize(); if (!o.animate || reduceMotion) draw(performance.now()); });
    loadDots().then(d => { dots = d; cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(draw); });
    // renderFrame(ms): zeichnet exakt den Zustand zum Zeitpunkt ms – für bildgenaues Video-Rendering
    function renderFrame(ms) {
      const anim = o.animate;
      o.animate = false;
      lon0 = o.lon0 - o.speed * ms / 1000; last = ms;
      draw(ms);
      o.animate = anim;
    }
    return { stop: () => cancelAnimationFrame(raf), setRotation: (v) => { lon0 = v; }, renderFrame, ready: loadDots() };
  }

  window.ITWGlobe = { mount };
})();
