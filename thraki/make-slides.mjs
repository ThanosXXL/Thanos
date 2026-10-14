// Zeichnet sechs Slider-Bilder (SVG): Tänzerreihe vor Abendhimmel mit Lichterkette. Aufruf: node make-slides.mjs
import { writeFileSync } from 'node:fs';
const pal = [
  ['#241226', '#7a3b5a', '#f2b45a'], ['#2a1a0e', '#8a5a2b', '#ffd27a'], ['#0e1c24', '#2b5a6a', '#9fe0e8'],
  ['#240e0e', '#8a2b2b', '#ffb27a'], ['#1a200e', '#5a6a2b', '#e8e08a'], ['#201208', '#8a6a3b', '#ffcf8a'],
];
const vests = ['#8c1c1c', '#1a1a1a', '#6a2a3a', '#2a2a5a'];
const rnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
pal.forEach(([c1, c2, glow], k) => {
  const r = rnd(k * 97 + 13), n = 5 + (k % 3) * 2, W = 1600, H = 900, base = 780;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
<filter id="g"><feGaussianBlur stdDeviation="9"/></filter></defs>
<rect width="${W}" height="${H}" fill="url(#b)"/>`;
  for (let i = 0; i < 40; i++) o += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 380).toFixed(0)}" r="${(r() * 1.6 + .4).toFixed(1)}" fill="#fff" opacity="${(r() * .6 + .2).toFixed(2)}"/>`;
  // Lichterkette
  o += `<path d="M0 150 Q400 260 800 170 T1600 190" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="3"/>`;
  for (let i = 0; i <= 16; i++) { const x = i * 100, y = 150 + 70 * Math.sin(i * .8) + (i % 2) * 8;
    o += `<circle cx="${x}" cy="${y.toFixed(0)}" r="26" fill="${glow}" opacity=".55" filter="url(#g)"/><circle cx="${x}" cy="${y.toFixed(0)}" r="7" fill="${glow}"/>`; }
  o += `<rect y="${base}" width="${W}" height="${H - base}" fill="#000" opacity=".55"/>`;
  // Tänzerreihe
  const sp = 150 + (k % 2) * 20, x0 = W / 2 - ((n - 1) * sp) / 2;
  const fig = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + i * sp, s = .92 + r() * .16, lean = (i % 2 ? 1 : -1) * 6, vest = vests[(i + k) % vests.length], kick = i % 3 === 1;
    const sh = base - 270 * s, hd = sh - 46 * s;
    fig.push({ x, sh });
    o += `<g transform="translate(${x.toFixed(0)} 0)">
<path d="M${-34 * s} ${base} L${-12 * s + lean} ${sh + 120 * s} L${14 * s + lean} ${sh + 120 * s} L${(kick ? 70 : 38) * s} ${kick ? base - 70 * s : base} L${(kick ? 40 : 20) * s} ${kick ? base - 30 * s : base} L${2 * s} ${sh + 150 * s} L${-14 * s} ${base} Z" fill="#1f2347"/>
<rect x="${-30 * s}" y="${sh}" width="${60 * s}" height="${130 * s}" rx="${14 * s}" fill="#f6ecde"/>
<rect x="${-30 * s}" y="${sh}" width="${22 * s}" height="${130 * s}" rx="${8 * s}" fill="${vest}"/><rect x="${8 * s}" y="${sh}" width="${22 * s}" height="${130 * s}" rx="${8 * s}" fill="${vest}"/>
<rect x="${-34 * s}" y="${sh + 96 * s}" width="${68 * s}" height="${26 * s}" fill="#7a1f1f"/>
<circle cx="0" cy="${hd.toFixed(0)}" r="${24 * s}" fill="#c99a76"/><path d="M${-26 * s} ${hd - 6 * s} Q0 ${hd - 38 * s} ${26 * s} ${hd - 6 * s} Z" fill="#161616"/></g>`;
  }
  fig.forEach((f, i) => { if (i) o += `<path d="M${(fig[i - 1].x + 30).toFixed(0)} ${(fig[i - 1].sh + 34).toFixed(0)} Q${((f.x + fig[i - 1].x) / 2).toFixed(0)} ${(f.sh + 74).toFixed(0)} ${(f.x - 30).toFixed(0)} ${(f.sh + 34).toFixed(0)}" stroke="#f6ecde" stroke-width="18" stroke-linecap="round" fill="none"/>`; });
  o += `<rect width="${W}" height="${H}" fill="#000" opacity=".12"/></svg>`;
  writeFileSync(`img/slide-${k + 1}.svg`, o);
});
