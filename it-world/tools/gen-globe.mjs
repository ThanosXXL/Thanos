// Erzeugt die Land-Punktwolke für den 3D-Globus (public/assets/globe-dots.json)
// und das statische Globus-Logo (public/assets/logo.svg + favicon.svg).
// Nur zur Build-Zeit nötig – die App selbst lädt keine Geo-Bibliotheken.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/land-110m.json'), 'utf8'));
const land = feature(topo, topo.objects.land);

// Fibonacci-Kugel: gleichmäßig verteilte Punkte, nur die auf Land bleiben übrig.
const N = 16000;
const golden = Math.PI * (3 - Math.sqrt(5));
const dots = [];
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = golden * i;
  const lat = Math.asin(y) * 180 / Math.PI;
  const lon = ((Math.atan2(Math.sin(theta) * r, Math.cos(theta) * r) * 180 / Math.PI) + 540) % 360 - 180;
  if (lat < -60) continue; // Antarktis weglassen, wirkt auf dem Logo unruhig
  if (geoContains(land, [lon, lat])) dots.push([+lon.toFixed(2), +lat.toFixed(2)]);
}
writeFileSync(new URL('../public/assets/globe-dots.json', import.meta.url), JSON.stringify(dots));
console.log(`globe-dots.json: ${dots.length} Punkte`);

// ---------- Statisches Logo (orthografische Projektion, Europa/Afrika vorne) ----------
const rad = d => d * Math.PI / 180;
function project(lon, lat, lon0, lat0) {
  const l = rad(lon - lon0), p = rad(lat), p0 = rad(lat0);
  const x = Math.cos(p) * Math.sin(l);
  const y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l);
  const z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  return [x, -y, z];
}

function globeSvg({ size, cx, cy, R, lon0 = 12, lat0 = 22, idPrefix = 'g', dotScale = 1, step = 1 }) {
  const circles = [];
  for (let i = 0; i < dots.length; i += step) {
    const [lon, lat] = dots[i];
    const [x, y, z] = project(lon, lat, lon0, lat0);
    if (z <= 0.02) continue;
    const px = cx + x * R, py = cy + y * R;
    const rr = (0.55 + 0.9 * z) * (R / 150) * dotScale;
    // Licht kommt von oben links → Punkte dort heller
    const light = Math.max(0, Math.min(1, 0.55 + 0.45 * (-x * 0.6 - y * 0.6 + z * 0.5)));
    const op = (0.35 + 0.65 * z) * (0.6 + 0.4 * light);
    circles.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${rr.toFixed(2)}" fill="url(#${idPrefix}land)" opacity="${op.toFixed(2)}"/>`);
  }
  // Längen-/Breitengrade als Ellipsen
  const grid = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 4) {
      const [x, y, z] = project(lon, lat, lon0, lat0);
      pts.push(z > 0 ? `${(cx + x * R).toFixed(1)},${(cy + y * R).toFixed(1)}` : null);
    }
    grid.push(polyline(pts));
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 4) {
      const [x, y, z] = project(lon, lat, lon0, lat0);
      pts.push(z > 0 ? `${(cx + x * R).toFixed(1)},${(cy + y * R).toFixed(1)}` : null);
    }
    grid.push(polyline(pts));
  }
  function polyline(pts) {
    const segs = []; let cur = [];
    for (const p of pts) { if (p) cur.push(p); else { if (cur.length > 1) segs.push(cur); cur = []; } }
    if (cur.length > 1) segs.push(cur);
    return segs.map(s => `<polyline points="${s.join(' ')}"/>`).join('');
  }
  const p = idPrefix;
  // Orbit-Ring: hintere Hälfte hinter der Kugel, vordere Hälfte davor → echter 3D-Eindruck
  const oRx = R * 1.42, oRy = R * 0.36, rot = -18;
  const ring = (half) => {
    const a0 = half === 'back' ? Math.PI : 0, a1 = half === 'back' ? 2 * Math.PI : Math.PI;
    const x0 = cx + oRx * Math.cos(a0), y0 = cy + oRy * Math.sin(a0);
    const x1 = cx + oRx * Math.cos(a1), y1 = cy + oRy * Math.sin(a1);
    return `M${x0.toFixed(1)},${y0.toFixed(1)} A${oRx},${oRy} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<defs>
  <radialGradient id="${p}ocean" cx="36%" cy="30%" r="75%">
    <stop offset="0" stop-color="#3a2a0c"/><stop offset=".45" stop-color="#16110a"/><stop offset="1" stop-color="#030303"/>
  </radialGradient>
  <linearGradient id="${p}land" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff1b8"/><stop offset=".5" stop-color="#e6b84c"/><stop offset="1" stop-color="#b07d1e"/>
  </linearGradient>
  <radialGradient id="${p}gloss" cx="34%" cy="24%" r="42%">
    <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="${p}rim" cx="50%" cy="50%" r="50%">
    <stop offset=".86" stop-color="#d4a53a" stop-opacity="0"/><stop offset=".97" stop-color="#f3cf6b" stop-opacity=".55"/><stop offset="1" stop-color="#fff0b0" stop-opacity=".9"/>
  </radialGradient>
  <radialGradient id="${p}glow" cx="50%" cy="50%" r="50%">
    <stop offset=".55" stop-color="#d4a53a" stop-opacity=".35"/><stop offset="1" stop-color="#d4a53a" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="${p}ring" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#7a5410"/><stop offset=".35" stop-color="#ffe8a3"/><stop offset=".6" stop-color="#e2b247"/><stop offset="1" stop-color="#7a5410"/>
  </linearGradient>
  <clipPath id="${p}clip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
</defs>
<circle cx="${cx}" cy="${cy}" r="${R * 1.32}" fill="url(#${p}glow)"/>
<g transform="rotate(${rot} ${cx} ${cy})"><path d="${ring('back')}" fill="none" stroke="url(#${p}ring)" stroke-width="${(R * 0.045).toFixed(1)}" stroke-linecap="round" opacity=".75"/></g>
<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${p}ocean)"/>
<g clip-path="url(#${p}clip)">
  <g fill="none" stroke="#d4a53a" stroke-opacity=".22" stroke-width="${(R / 220).toFixed(2)}">${grid.join('')}</g>
  ${circles.join('')}
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${p}gloss)"/>
</g>
<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${p}rim)"/>
<g transform="rotate(${rot} ${cx} ${cy})"><path d="${ring('front')}" fill="none" stroke="url(#${p}ring)" stroke-width="${(R * 0.05).toFixed(1)}" stroke-linecap="round"/>
<circle cx="${(cx + oRx * Math.cos(0.35 * Math.PI)).toFixed(1)}" cy="${(cy + oRy * Math.sin(0.35 * Math.PI)).toFixed(1)}" r="${(R * 0.06).toFixed(1)}" fill="#fff4c8"/></g>
</svg>`;
}

writeFileSync(new URL('../public/assets/logo.svg', import.meta.url),
  globeSvg({ size: 512, cx: 256, cy: 256, R: 168 }));
writeFileSync(new URL('../public/assets/favicon.svg', import.meta.url),
  globeSvg({ size: 64, cx: 32, cy: 32, R: 21, idPrefix: 'f', dotScale: 2.6, step: 6 }));
console.log('logo.svg + favicon.svg geschrieben');
