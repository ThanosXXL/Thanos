// Goldene Partikel-Wellen als Hintergrund der Marketing-Grafiken
(function () {
  const c = document.querySelector('canvas.waves');
  if (!c) return;
  const w = c.width = c.clientWidth * 2, h = c.height = c.clientHeight * 2;
  const ctx = c.getContext('2d');
  const bg = ctx.createRadialGradient(w * 0.7, h * 0.45, 0, w * 0.7, h * 0.45, w * 0.7);
  bg.addColorStop(0, 'rgba(90,62,16,0.55)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  for (let band = 0; band < 3; band++) {
    for (let line = 0; line < 38; line++) {
      for (let x = 0; x < w; x += 7) {
        const t = x / w;
        const y = h * (0.52 + band * 0.08) + Math.sin(t * Math.PI * (2.2 + band * 0.5) + line * 0.09 + band) * h * (0.16 - band * 0.03)
          + Math.sin(t * 9 + line * 0.3) * 10 + line * 3.2 - 60;
        const a = (0.05 + 0.35 * Math.pow(Math.sin(t * Math.PI), 2)) * (1 - line / 45) * (band === 0 ? 1 : 0.6);
        ctx.fillStyle = `rgba(243,207,107,${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
})();
