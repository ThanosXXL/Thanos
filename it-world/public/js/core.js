// IT - World – Basisfunktionen: DOM-Helfer, API-Client, Formatierung, Icons, Dialoge, Toasts.

export const state = { me: null, optionsCache: new Map() };

// ------------------------------------------------------------------ DOM
/** h('div.klasse#id', {attrs}, ...kinder) – Texte werden immer als Textknoten eingefügt (kein innerHTML). */
export function h(sel, attrs, ...children) {
  if (attrs == null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) {
    if (attrs !== undefined && attrs !== null) children.unshift(attrs);
    attrs = {};
  }
  const m = sel.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement((m && m[1]) || 'div');
  if (m && m[2]) {
    for (const part of m[2].match(/[.#][\w-]+/g)) {
      if (part[0] === '.') el.classList.add(part.slice(1));
      else el.id = part.slice(1);
    }
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = [el.className, v].filter(Boolean).join(' ');
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'selected' || k === 'disabled' || k === 'required' || k === 'multiple' || k === 'readOnly') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

// ------------------------------------------------------------------ Icons (SVG, Linienstil)
const ICONS = {
  dashboard: 'M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z',
  building: 'M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2M10 21v-3h4v3',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8m8 4H8m2-8H8',
  clipboard: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9zM9 12l2 2 4-4',
  receipt: 'M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2zm4 6h8m-8 4h8m-8 4h5',
  card: 'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm0 3h20M6 15h4',
  box: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7 12 12l8.7-5M12 22V12',
  truck: 'M1 3h15v13H1zm15 5h4l3 3v5h-7zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm13 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  folder: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  check: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  lifebuoy: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.93 4.93l4.24 4.24m5.66 5.66 4.24 4.24m0-14.14-4.24 4.24m-5.66 5.66-4.24 4.24',
  id: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm6 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-3 6c.5-2 1.8-3 3-3s2.5 1 3 3m3-8h3m-3 4h3',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-16v6l4 2',
  wallet: 'M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z',
  calendar: 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm11-2v4M8 2v4m-5 4h18',
  paperclip: 'm21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
  chart: 'M3 3v18h18M7 16V11m5 5V7m5 9v-3',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2.1-1.6-2-3.5-2.5 1a7.3 7.3 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.3 7.3 0 0 0-2 1.2l-2.5-1-2 3.5 2.1 1.6a7.4 7.4 0 0 0 0 2.4l-2.1 1.6 2 3.5 2.5-1a7.3 7.3 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.3 7.3 0 0 0 2-1.2l2.5 1 2-3.5-2.1-1.6c.1-.4.1-.8.1-1.2z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm18 2-10 7L2 6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.35-4.35',
  plus: 'M12 5v14M5 12h14',
  menu: 'M3 12h18M3 6h18M3 18h18',
  x: 'M18 6 6 18M6 6l12 12',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7m-1.5-9.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
  trash: 'M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6m4-6v6',
  printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7-5-5-5 5m5-5v12',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-16v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  arrowRight: 'M5 12h14m-7-7 7 7-7 7',
  arrowLeft: 'M19 12H5m7 7-7-7 7-7',
  columns: 'M12 3v18M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  send: 'm22 2-7 20-4-9-9-4zm0 0L11 13',
  repeat: 'm17 1 4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4m14-2v2a4 4 0 0 1-4 4H3',
  euro: 'M4 10h12M4 14h9m6-8a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2',
  trending: 'm23 6-9.5 9.5-5-5L1 18M17 6h6v6',
  alert: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 0 1-3.46 0',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  code: 'm16 18 6-6-6-6M8 6l-6 6 6 6',
  database: 'M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3zm9 4c0 1.66-4 3-9 3s-9-1.34-9-3m18-7v14c0 1.66-4 3-9 3s-9-1.34-9-3V5',
  puzzle: 'M19.4 13.4a2 2 0 1 0 0-2.8H18V7a1 1 0 0 0-1-1h-3.6v-1.4a2 2 0 1 0-2.8 0V6H7a1 1 0 0 0-1 1v3.6H4.6a2 2 0 1 0 0 2.8H6V17a1 1 0 0 0 1 1h3.6v-1.4a2 2 0 1 1 2.8 0V18H17a1 1 0 0 0 1-1v-3.6z',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98',
};

const SOCIAL = {
  linkedin: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zm2-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  xing: 'M6.5 6.5 9 11l-3.5 6M14.5 3 9.8 11.5l3.2 5.8M17.5 3 13 11.5 16 17.5',
  facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
  instagram: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm9 9.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01',
  x: 'M4 4l16 16M20 4 4 20',
  youtube: 'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02 15.5 12 9.75 8.98z',
  github: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22',
};
export const SOCIAL_LABELS = { linkedin: 'LinkedIn', xing: 'XING', facebook: 'Facebook', instagram: 'Instagram', x: 'X (Twitter)', youtube: 'YouTube', github: 'GitHub' };

export function icon(name, size = 18, set = ICONS) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icon');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', set[name] || ICONS.file);
  svg.appendChild(p);
  return svg;
}

export function socialLinks(social, size = 18) {
  const links = Object.entries(social || {}).filter(([k, v]) => v && SOCIAL[k] && /^https:\/\//.test(v));
  if (!links.length) return null;
  return h('div.social', links.map(([k, v]) => h('a.social-link', { href: v, target: '_blank', rel: 'noopener noreferrer', title: SOCIAL_LABELS[k], 'aria-label': SOCIAL_LABELS[k] }, icon(k, size, SOCIAL))));
}

// ------------------------------------------------------------------ API
export class ApiError extends Error {
  constructor(status, data) {
    super((data && data.fehler) || `Fehler ${status}`);
    this.status = status;
    this.data = data || {};
  }
}

export async function api(method, url, body) {
  const opts = { method, headers: { 'X-IT-World': '1' }, credentials: 'same-origin' };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    throw new ApiError(0, { fehler: 'Keine Verbindung zum Server.' });
  }
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const err = new ApiError(res.status, data);
    if (res.status === 401 && !url.startsWith('/api/auth/')) window.dispatchEvent(new CustomEvent('itw:logout'));
    if (res.status === 403 && data && data.passwortAendern) window.dispatchEvent(new CustomEvent('itw:passwort'));
    throw err;
  }
  return data;
}
export const get = (u) => api('GET', u);
export const post = (u, b) => api('POST', u, b ?? {});
export const put = (u, b) => api('PUT', u, b ?? {});
export const del = (u) => api('DELETE', u);

export async function options(res, force) {
  if (!force && state.optionsCache.has(res)) return state.optionsCache.get(res);
  const p = get(`/api/options/${res}`).catch(() => []);
  state.optionsCache.set(res, p);
  return p;
}
export const invalidateOptions = (res) => (res ? state.optionsCache.delete(res) : state.optionsCache.clear());

export function qs(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj || {})) if (v !== undefined && v !== null && v !== '') p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ------------------------------------------------------------------ Formatierung
const cache = {};
export function money(v, currency) {
  const cur = currency || (state.me && state.me.settings.finanzen.waehrung) || 'EUR';
  cache[cur] = cache[cur] || new Intl.NumberFormat('de-DE', { style: 'currency', currency: cur });
  return cache[cur].format(Number(v) || 0);
}
export const moneyShort = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e3).toLocaleString('de-DE', { maximumFractionDigits: 1 })} T€`;
  return money(n);
};
export const num = (v, d = 2) => (Number(v) || 0).toLocaleString('de-DE', { maximumFractionDigits: d });
export function date(v) {
  if (!v) return '';
  const [y, m, d] = String(v).slice(0, 10).split('-');
  return d ? `${d}.${m}.${y}` : String(v);
}
export function datetime(v) {
  if (!v) return '';
  const s = String(v).replace(' ', 'T');
  return `${date(s)}${s.length > 10 ? `, ${s.slice(11, 16)} Uhr` : ''}`;
}
export function relTime(v) {
  if (!v) return '';
  const t = new Date(String(v).replace(' ', 'T') + (String(v).includes('T') || String(v).endsWith('Z') ? '' : 'Z')).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  if (diff < 86400 * 7) return `vor ${Math.floor(diff / 86400)} Tag${diff >= 172800 ? 'en' : ''}`;
  return date(new Date(t).toISOString());
}
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const bytes = (n) => (n > 1048576 ? `${num(n / 1048576, 1)} MB` : n > 1024 ? `${num(n / 1024, 0)} KB` : `${n || 0} B`);

const STATUS_TONE = {
  Aktiv: 'ok', Gewonnen: 'ok', Bezahlt: 'ok', Erledigt: 'ok', Angenommen: 'ok', Gelöst: 'ok', Geliefert: 'ok', Abgeschlossen: 'ok', Gesendet: 'ok', Abgerechnet: 'ok',
  Offen: 'info', 'In Arbeit': 'info', 'In Bearbeitung': 'info', Versendet: 'info', Qualifiziert: 'info', Interessent: 'info', Neu: 'gold', Lead: 'gold', Planung: 'gold',
  Teilbezahlt: 'warn', Verhandlung: 'warn', Angebot: 'warn', Wartend: 'warn', Review: 'warn', Pausiert: 'warn', Hoch: 'warn', Urlaub: 'warn', Entwurf: 'muted',
  Verloren: 'bad', Abgelehnt: 'bad', Storniert: 'bad', Kritisch: 'bad', Überfällig: 'bad', Fehler: 'bad', Abgebrochen: 'bad', Krank: 'bad',
  Inaktiv: 'muted', Geschlossen: 'muted', Niedrig: 'muted', Ausgeschieden: 'muted', Normal: 'muted',
};
export const badge = (text, tone) => (text ? h(`span.badge.tone-${tone || STATUS_TONE[text] || 'muted'}`, text) : null);

// ------------------------------------------------------------------ Toasts & Dialoge
export function toast(msg, tone = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) { box = h('div#toasts', { role: 'status', 'aria-live': 'polite' }); document.body.appendChild(box); }
  const t = h(`div.toast.tone-${tone}`, icon(tone === 'bad' ? 'alert' : 'check', 16), h('span', msg));
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 3800);
  setTimeout(() => t.remove(), 4300);
}
export const errToast = (e) => toast(e.message || String(e), 'bad');

/** Modal-Dialog; content kann Node oder Funktion(close) → Node sein. Gibt Promise mit Ergebnis zurück. */
export function modal({ title, content, wide, actions }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const close = (val) => {
      overlay.classList.add('out');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => overlay.remove(), 180);
      if (prev && prev.focus) prev.focus();
      resolve(val);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    const body = typeof content === 'function' ? content(close) : content;
    const dialog = h(`div.modal${wide ? '.wide' : ''}`, { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div.modal-head', h('h3', title), h('button.icon-btn', { type: 'button', 'aria-label': 'Schließen', onclick: () => close(null) }, icon('x'))),
      h('div.modal-body', body),
      actions ? h('div.modal-foot', actions(close)) : null);
    const overlay = h('div.overlay', { onmousedown: (e) => { if (e.target === overlay) close(null); } }, dialog);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey);
    setTimeout(() => {
      const f = dialog.querySelector('input:not([type=hidden]), select, textarea, button.btn-primary');
      if (f) f.focus();
    }, 30);
  });
}

export function confirmDialog(text, { title = 'Bitte bestätigen', ok = 'Bestätigen', danger } = {}) {
  return modal({
    title,
    content: h('p', text),
    actions: (close) => [
      h('button.btn', { type: 'button', onclick: () => close(false) }, 'Abbrechen'),
      h(`button.btn.${danger ? 'btn-danger' : 'btn-primary'}`, { type: 'button', onclick: () => close(true) }, ok),
    ],
  }).then(Boolean);
}

/** Formular-Dialog aus einfacher Felddefinition: [{name,label,type,options,value,required}] */
export function formDialog(title, fields, { ok = 'Speichern', intro } = {}) {
  return modal({
    title,
    content: (close) => {
      const form = h('form.form-grid', {
        onsubmit: (e) => {
          e.preventDefault();
          const out = {};
          for (const f of fields) {
            const el = form.elements[f.name];
            out[f.name] = f.type === 'checkbox' ? el.checked : el.value;
          }
          close(out);
        },
      }, intro ? h('p.full.muted', intro) : null, fields.map((f) => simpleField(f)),
      h('div.full.form-actions', h('button.btn', { type: 'button', onclick: () => close(null) }, 'Abbrechen'), h('button.btn.btn-primary', { type: 'submit' }, ok)));
      return form;
    },
  });
}

export function simpleField(f) {
  let input;
  if (f.type === 'select') {
    input = h('select', { name: f.name, required: f.required }, f.options.map((o) => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      return h('option', { value: v, selected: String(v) === String(f.value ?? '') }, l);
    }));
  } else if (f.type === 'textarea') {
    input = h('textarea', { name: f.name, rows: f.rows || 6, required: f.required, value: f.value ?? '' });
  } else if (f.type === 'checkbox') {
    return h('label.full.check', h('input', { type: 'checkbox', name: f.name, checked: !!f.value }), h('span', f.label));
  } else {
    input = h('input', { name: f.name, type: f.type || 'text', required: f.required, value: f.value ?? '', step: f.step, min: f.min, max: f.max, placeholder: f.placeholder, autocomplete: f.autocomplete });
  }
  return h(`label.field${f.full || f.type === 'textarea' ? '.full' : ''}`, h('span.label', f.label, f.required ? h('b.req', ' *') : null), input, f.hint ? h('small.hint', f.hint) : null);
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    r.readAsDataURL(file);
  });
}

export function downloadUrl(url) {
  const a = h('a', { href: url, download: '' });
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export const debounce = (fn, ms = 250) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};
