// IT - World – schlanke SVG-Diagramme (ohne externe Bibliotheken).
import { h, moneyShort, money } from './core.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) el.setAttribute(k, v);
  for (const c of kids) if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
};

function niceMax(v) {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
export const monthLabel = (ym) => { const [y, m] = ym.split('-'); return `${MONATE[Number(m) - 1]} ${y.slice(2)}`; };

/**
 * Gruppiertes Säulendiagramm mit optionaler Linie.
 * series: [{ name, values, cls, type: 'bar'|'line' }]
 */
export function barChart({ labels, series, height = 260, format = money }) {
  const W = 720;
  const H = height;
  const pad = { l: 56, r: 12, t: 16, b: 30 };
  const all = series.flatMap((x) => x.values).filter((v) => v != null);
  const max = niceMax(Math.max(...all, 0));
  const minRaw = Math.min(...all, 0);
  const lo = minRaw < 0 ? -niceMax(-minRaw) : 0;
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const y = (v) => pad.t + ih - ((v - lo) / (max - lo)) * ih;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img' });
  const defs = s('defs');
  defs.appendChild(s('linearGradient', { id: 'gGold', x1: 0, y1: 0, x2: 0, y2: 1 },
    s('stop', { offset: '0%', 'stop-color': '#fbe7a1' }), s('stop', { offset: '45%', 'stop-color': '#d9ab45' }), s('stop', { offset: '100%', 'stop-color': '#7d5a1a' })));
  defs.appendChild(s('linearGradient', { id: 'gGrey', x1: 0, y1: 0, x2: 0, y2: 1 },
    s('stop', { offset: '0%', 'stop-color': '#8d8a84' }), s('stop', { offset: '100%', 'stop-color': '#3d3b38' })));
  svg.appendChild(defs);
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((max - lo) / 4) * i;
    svg.appendChild(s('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), class: 'grid' }));
    svg.appendChild(s('text', { x: pad.l - 8, y: y(v) + 4, class: 'axis', 'text-anchor': 'end' }, moneyShort(v).replace(/,00\s?€/, ' €')));
  }
  const bars = series.filter((x) => x.type !== 'line');
  const group = iw / labels.length;
  const bw = Math.min(22, (group * 0.72) / Math.max(bars.length, 1));
  labels.forEach((lab, i) => {
    const gx = pad.l + group * i + group / 2;
    svg.appendChild(s('text', { x: gx, y: H - 10, class: 'axis', 'text-anchor': 'middle' }, lab));
    bars.forEach((ser, j) => {
      const v = ser.values[i] || 0;
      const x = gx - (bars.length * bw) / 2 + j * bw + 1;
      const r = s('rect', { x, y: Math.min(y(v), y(0)), width: bw - 2, height: Math.abs(y(v) - y(0)), rx: 3, class: `bar ${ser.cls || ''}` },
        s('title', {}, `${ser.name} ${lab}: ${format(v)}`));
      svg.appendChild(r);
    });
  });
  for (const ser of series.filter((x) => x.type === 'line')) {
    const pts = ser.values.map((v, i) => `${pad.l + group * i + group / 2},${y(v || 0)}`);
    svg.appendChild(s('polyline', { points: pts.join(' '), class: `line ${ser.cls || ''}` }));
    ser.values.forEach((v, i) => svg.appendChild(s('circle', { cx: pad.l + group * i + group / 2, cy: y(v || 0), r: 3.5, class: `dot ${ser.cls || ''}` }, s('title', {}, `${ser.name} ${labels[i]}: ${format(v)}`))));
  }
  const legend = h('div.legend', series.map((x) => h('span', h(`i.sw.${x.cls || ''}${x.type === 'line' ? '.ln' : ''}`), x.name)));
  return h('div.chart-wrap', svg, legend);
}

/** Horizontale Balken (z. B. Pipeline je Phase). rows: [{label, value, sub}] */
export function hBars(rows, { format = money, cls = '' } = {}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return h('div.hbars', rows.map((r) => h('div.hbar',
    h('div.hbar-top', h('span', r.label), h('b', format(r.value)), r.sub ? h('small', r.sub) : null),
    h('div.hbar-track', h(`div.hbar-fill${cls ? `.${cls}` : ''}`, { style: { width: `${Math.max((r.value / max) * 100, r.value > 0 ? 2 : 0)}%` } })))));
}

/** Ring-/Donutdiagramm für einen Prozentwert. */
export function ring(percent, label) {
  const R = 42;
  const C = 2 * Math.PI * R;
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const svg = s('svg', { viewBox: '0 0 100 100', class: 'ring', role: 'img', 'aria-label': `${label}: ${p} %` },
    s('circle', { cx: 50, cy: 50, r: R, class: 'ring-bg' }),
    s('circle', { cx: 50, cy: 50, r: R, class: 'ring-fg', 'stroke-dasharray': `${(C * p) / 100} ${C}`, transform: 'rotate(-90 50 50)' }),
    s('text', { x: 50, y: 55, 'text-anchor': 'middle', class: 'ring-text' }, `${p}%`));
  return h('div.ring-wrap', svg, h('small', label));
}

/** Kleine Verlaufslinie für KPI-Karten. */
export function sparkline(values) {
  const W = 120;
  const H = 34;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * W},${H - 3 - ((v - min) / (max - min || 1)) * (H - 6)}`);
  return s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'spark', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
    s('polygon', { points: `0,${H} ${pts.join(' ')} ${W},${H}`, class: 'spark-area' }),
    s('polyline', { points: pts.join(' '), class: 'spark-line' }));
}
