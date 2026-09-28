// IT - World – Einstieg: Anmeldung, App-Shell (Navigation, Suche), Hash-Router.
import { h, clear, icon, get, post, state, toast, errToast, debounce, socialLinks, invalidateOptions, badge } from './core.js';
import { listView, detailView, formView, printView, notFoundView, spec, perm, go } from './generic.js';
import {
  dashboardView, calendarView, reportsView, settingsView, usersView, activityView, outboxView, profileView, passwordForm,
} from './pages.js';

const app = document.getElementById('app');

// ------------------------------------------------------------------ 3D-Hochglanz-Logo
export function logo3d(src, cls = '') {
  const inner = h('div.logo3d-inner', h('img', { src, alt: 'IT - World · IT Solutions', draggable: 'false' }), h('span.logo3d-shine'), h('span.logo3d-glare'));
  const el = h(`div.logo3d${cls ? `.${cls}` : ''}`, inner);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', `${x * 18}deg`);
      el.style.setProperty('--rx', `${-y * 18}deg`);
      el.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
      el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
      el.classList.add('tilt');
    });
    el.addEventListener('pointerleave', () => { el.classList.remove('tilt'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  }
  return el;
}

function brandMark() {
  return h('a.brand', { href: '#/dashboard', 'aria-label': 'IT - World – zum Dashboard' },
    h('span.brand-globe', h('img', { src: '/img/globe-192.png', alt: '', width: 44, height: 44 }), h('span.brand-shine')),
    h('span.brand-text', h('span.brand-name', 'IT - WORLD'), h('span.brand-sub', 'IT SOLUTIONS')));
}

// ------------------------------------------------------------------ Anmeldung / Registrierung
async function authScreen(mode = 'login') {
  document.body.className = 'auth-mode';
  let info = { registrierung: true };
  try { info = await get('/api/public/info'); } catch { /* Standard */ }
  const box = h('div.auth-card.card');
  const render = (m) => {
    clear(box);
    if (m === 'register' && info.registrierung) {
      const form = h('form.form-grid', {
        onsubmit: async (e) => {
          e.preventDefault();
          const el = form.elements;
          try {
            state.me = await post('/api/auth/register', { firma: el.firma.value, name: el.name.value, email: el.email.value, passwort: el.passwort.value, agb: el.agb.checked });
            toast('Willkommen bei IT - World!');
            startApp();
          } catch (err) { errToast(err); }
        },
      },
      h('label.field.full', h('span.label', 'Firmenname'), h('input', { name: 'firma', required: true, autocomplete: 'organization' })),
      h('label.field.full', h('span.label', 'Ihr Name'), h('input', { name: 'name', required: true, autocomplete: 'name' })),
      h('label.field.full', h('span.label', 'E-Mail'), h('input', { name: 'email', type: 'email', required: true, autocomplete: 'email' })),
      h('label.field.full', h('span.label', 'Passwort'), h('input', { name: 'passwort', type: 'password', required: true, minlength: 8, autocomplete: 'new-password' }), h('small.hint', 'Mind. 8 Zeichen mit Buchstaben und Ziffern')),
      h('label.check.full', h('input', { type: 'checkbox', name: 'agb', required: true }), h('span', 'Ich akzeptiere die Nutzungsbedingungen und die Datenschutzerklärung.')),
      h('button.btn.btn-primary.btn-block.full', { type: 'submit' }, 'Kostenlos registrieren'));
      box.append(h('h2', 'Unternehmen registrieren'), h('p.muted', 'Eigener, abgeschotteter Mandant – sofort startklar.'), form,
        h('p.switch-line', 'Bereits registriert? ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); render('login'); } }, 'Anmelden')));
    } else {
      const form = h('form.form-grid', {
        onsubmit: async (e) => {
          e.preventDefault();
          const btn = form.querySelector('button[type=submit]');
          btn.disabled = true;
          try {
            state.me = await post('/api/auth/login', { email: form.elements.email.value, passwort: form.elements.passwort.value });
            startApp();
          } catch (err) { errToast(err); btn.disabled = false; }
        },
      },
      h('label.field.full', h('span.label', 'E-Mail'), h('input', { name: 'email', type: 'email', required: true, autocomplete: 'username', autofocus: true })),
      h('label.field.full', h('span.label', 'Passwort'), h('input', { name: 'passwort', type: 'password', required: true, autocomplete: 'current-password' })),
      h('button.btn.btn-primary.btn-block.full', { type: 'submit' }, 'Anmelden'));
      box.append(h('h2', 'Anmelden'), h('p.muted', 'Willkommen zurück in Ihrem Business-Cockpit.'), form,
        info.registrierung ? h('p.switch-line', 'Neu hier? ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); render('register'); } }, 'Unternehmen registrieren')) : null);
    }
    const first = box.querySelector('input');
    if (first) first.focus();
  };
  render(mode);
  clear(app).appendChild(h('div.auth',
    h('div.auth-brand',
      logo3d('/img/logo-640.jpg', 'big'),
      h('ul.auth-features',
        [['building', 'CRM & Vertriebs-Pipeline'], ['receipt', 'Angebote, Rechnungen & Zahlungen'], ['box', 'Produkte & Lager'], ['folder', 'Projekte, Aufgaben & Zeiten'], ['lifebuoy', 'Support-Tickets'], ['chart', 'Dashboard & Berichte']]
          .map(([i, t]) => h('li', icon(i, 16), t)))),
    h('div.auth-side', box, h('p.auth-foot', `© ${new Date().getFullYear()} IT - World · IT Solutions`))));
}

function passwordChangeScreen() {
  document.body.className = 'auth-mode';
  clear(app).appendChild(h('div.auth',
    h('div.auth-brand', logo3d('/img/logo-640.jpg', 'big')),
    h('div.auth-side', h('div.auth-card.card',
      h('h2', 'Neues Passwort festlegen'),
      h('p.muted', 'Aus Sicherheitsgründen müssen Sie Ihr Start-Passwort ändern, bevor Sie fortfahren.'),
      passwordForm(async () => { toast('Passwort geändert'); state.me = await get('/api/auth/me'); startApp(); }),
      h('p.switch-line', h('a', { href: '#', onclick: (e) => { e.preventDefault(); logout(); } }, 'Abmelden'))))));
}

async function logout() {
  try { await post('/api/auth/logout'); } catch { /* egal */ }
  state.me = null;
  invalidateOptions();
  location.hash = '';
  authScreen();
}

// ------------------------------------------------------------------ Shell
function navGroups() {
  const r = (res) => ({ res, href: `#/r/${res}`, label: spec(res).label, icon: spec(res).icon, show: perm(res).read });
  const rolle = state.me.user.rolle;
  const mgmt = ['admin', 'manager'].includes(rolle);
  return [
    { title: 'Übersicht', items: [{ href: '#/dashboard', label: 'Dashboard', icon: 'dashboard', show: true }, { href: '#/kalender', label: 'Kalender', icon: 'calendar', show: perm('termine').read }, r('termine')] },
    { title: 'CRM', items: [r('kunden'), r('kontakte'), { ...r('deals'), href: '#/r/deals?ansicht=board' }] },
    { title: 'Vertrieb', items: [r('angebote'), r('auftraege'), r('rechnungen'), r('zahlungen')] },
    { title: 'Produkte & Lager', items: [r('produkte'), r('lieferanten')] },
    { title: 'Projekte', items: [r('projekte'), { ...r('aufgaben'), href: '#/r/aufgaben?ansicht=board' }, { ...r('tickets'), href: '#/r/tickets?ansicht=board' }] },
    { title: 'Personal & Finanzen', items: [r('mitarbeiter'), r('zeiten'), r('ausgaben'), { href: '#/berichte', label: 'Berichte', icon: 'chart', show: perm('rechnungen').read && state.me.settings.module.finanzen !== false }] },
    { title: 'Content', items: [r('dokumente')] },
    { title: 'Verwaltung', items: [
      { href: '#/benutzer', label: 'Benutzer & Rollen', icon: 'users', show: rolle === 'admin' },
      { href: '#/einstellungen', label: 'Einstellungen', icon: 'settings', show: mgmt },
      { href: '#/aktivitaeten', label: 'Aktivitäten', icon: 'activity', show: mgmt },
      { href: '#/postausgang', label: 'Postausgang', icon: 'mail', show: mgmt },
    ] },
  ].map((g) => ({ ...g, items: g.items.filter((i) => i.show) })).filter((g) => g.items.length);
}

let content;
let sidebar;

function buildShell() {
  document.body.className = 'app-mode';
  const theme = localStorageGet('itw-theme') || 'dark';
  document.documentElement.dataset.theme = theme;
  sidebar = h('aside.sidebar', { id: 'sidebar' });
  content = h('main.content', { id: 'main', tabindex: '-1' });
  const scrim = h('div.scrim', { onclick: () => document.body.classList.remove('nav-open') });

  // Globale Suche
  const results = h('div.search-results', { hidden: true });
  const searchInput = h('input', { type: 'search', placeholder: 'Suchen: Kunden, Rechnungen, Projekte … (Strg+K)', 'aria-label': 'Globale Suche', autocomplete: 'off' });
  const runSearch = debounce(async () => {
    const q = searchInput.value.trim();
    if (q.length < 2) { results.hidden = true; return; }
    try {
      const { treffer } = await get(`/api/suche?q=${encodeURIComponent(q)}`);
      clear(results).append(...(treffer.length ? treffer.map((t) => h('a.sr-item', { href: `#/r/${t.res}/${t.id}`, onclick: () => { results.hidden = true; searchInput.value = ''; } }, icon(t.icon, 16), h('span', t.titel), h('small', t.bereich))) : [h('div.sr-empty', 'Keine Treffer')]));
      results.hidden = false;
    } catch { /* ignorieren */ }
  }, 220);
  searchInput.addEventListener('input', runSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { results.hidden = true; searchInput.blur(); }
    if (e.key === 'ArrowDown') { const f = results.querySelector('a'); if (f) { e.preventDefault(); f.focus(); } }
  });
  document.addEventListener('click', (e) => { if (!results.contains(e.target) && e.target !== searchInput) results.hidden = true; });

  const quickItems = ['kunden', 'kontakte', 'deals', 'angebote', 'rechnungen', 'projekte', 'aufgaben', 'tickets', 'termine', 'zeiten', 'produkte', 'ausgaben'].filter((r) => perm(r).write);
  const quickMenu = h('div.menu', { hidden: true }, quickItems.map((r) => h('a.menu-item', { href: `#/r/${r}/neu`, onclick: () => { quickMenu.hidden = true; } }, icon(spec(r).icon, 16), spec(r).singular)));
  const userMenu = h('div.menu.right', { hidden: true },
    h('div.menu-head', h('b', state.me.user.name), h('small', state.me.user.email), badge(state.me.meta.roleLabels[state.me.user.rolle], 'gold')),
    h('a.menu-item', { href: '#/profil', onclick: () => { userMenu.hidden = true; } }, icon('user', 16), 'Mein Profil'),
    ['admin', 'manager'].includes(state.me.user.rolle) ? h('a.menu-item', { href: '#/einstellungen', onclick: () => { userMenu.hidden = true; } }, icon('settings', 16), 'Einstellungen') : null,
    h('button.menu-item', { type: 'button', onclick: logout }, icon('logout', 16), 'Abmelden'));
  const toggleMenu = (m) => (e) => { e.stopPropagation(); const open = m.hidden; document.querySelectorAll('.menu').forEach((x) => { x.hidden = true; }); m.hidden = !open; };
  document.addEventListener('click', () => document.querySelectorAll('.menu').forEach((x) => { x.hidden = true; }));

  const themeBtn = h('button.icon-btn', { type: 'button', title: 'Hell/Dunkel umschalten', 'aria-label': 'Farbschema umschalten', onclick: () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorageSet('itw-theme', next);
    clear(themeBtn).appendChild(icon(next === 'dark' ? 'sun' : 'moon'));
  } }, icon(theme === 'dark' ? 'sun' : 'moon'));

  const initials = state.me.user.name.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  const topbar = h('header.topbar',
    h('button.icon-btn.menu-toggle', { type: 'button', 'aria-label': 'Navigation öffnen', onclick: () => document.body.classList.toggle('nav-open') }, icon('menu')),
    h('div.global-search', icon('search', 16), searchInput, results),
    h('div.top-actions',
      quickItems.length ? h('div.menu-wrap', h('button.btn.btn-primary.btn-sm', { type: 'button', onclick: toggleMenu(quickMenu), 'aria-haspopup': 'true' }, icon('plus', 16), h('span.hide-sm', 'Neu')), quickMenu) : null,
      themeBtn,
      h('div.menu-wrap', h('button.avatar', { type: 'button', onclick: toggleMenu(userMenu), 'aria-label': 'Benutzermenü', title: state.me.user.name }, initials), userMenu)));

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchInput.focus(); searchInput.select(); }
  });

  clear(app).append(h('a.skip', { href: '#main', onclick: (e) => { e.preventDefault(); content.focus(); } }, 'Zum Inhalt springen'), sidebar, scrim, h('div.main-col', topbar, content));
  renderSidebar();
}

function renderSidebar() {
  const current = location.hash.split('?')[0] || '#/dashboard';
  clear(sidebar).append(
    h('div.sidebar-head', brandMark()),
    h('nav.nav', { 'aria-label': 'Hauptnavigation' }, navGroups().map((g) => h('div.nav-group',
      h('div.nav-title', g.title),
      g.items.map((i) => {
        const base = i.href.split('?')[0];
        const active = current === base || current.startsWith(`${base}/`);
        return h(`a.nav-item${active ? '.active' : ''}`, { href: i.href, onclick: () => document.body.classList.remove('nav-open'), 'aria-current': active ? 'page' : null }, icon(i.icon, 18), h('span', i.label));
      })))),
    h('div.sidebar-foot',
      h('div.tenant', h('small', 'Mandant'), h('b', state.me.settings.firma.name)),
      socialLinks(state.me.settings.social, 16)));
}

function localStorageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function localStorageSet(k, v) { try { localStorage.setItem(k, v); } catch { /* privat */ } }

// ------------------------------------------------------------------ Router
const ROUTES = [
  [/^#\/dashboard$/, dashboardView],
  [/^#\/kalender$/, calendarView],
  [/^#\/berichte$/, reportsView],
  [/^#\/einstellungen$/, settingsView],
  [/^#\/benutzer$/, usersView],
  [/^#\/aktivitaeten$/, activityView],
  [/^#\/postausgang$/, outboxView],
  [/^#\/profil$/, profileView],
  [/^#\/r\/(?<res>\w+)$/, listView],
  [/^#\/r\/(?<res>\w+)\/neu$/, formView],
  [/^#\/r\/(?<res>\w+)\/(?<id>\d+)$/, detailView],
  [/^#\/r\/(?<res>\w+)\/(?<id>\d+)\/bearbeiten$/, formView],
];

let routeToken = 0;
async function router() {
  if (!state.me) return;
  const hash = location.hash || '#/dashboard';
  const [path, qstr] = hash.split('?');
  const query = new URLSearchParams(qstr || '');
  const printMatch = path.match(/^#\/druck\/(\w+)\/(\d+)$/);
  if (printMatch) {
    document.body.classList.add('print-mode');
    await printView(content, { res: printMatch[1], id: printMatch[2] });
    return;
  }
  document.body.classList.remove('print-mode');
  document.title = 'IT - World · Business-Plattform';
  renderSidebar();
  const token = ++routeToken;
  for (const [re, view] of ROUTES) {
    const m = path.match(re);
    if (m) {
      try {
        await view(content, m.groups || {}, query);
      } catch (e) {
        if (token === routeToken) errToast(e);
      }
      if (token === routeToken) {
        const title = content.querySelector('h1');
        if (title) document.title = `${title.textContent} · IT - World`;
      }
      return;
    }
  }
  if (path === '#' || path === '#/') { go('#/dashboard'); return; }
  notFoundView(content);
}

function startApp() {
  if (state.me.user.mussPasswortAendern) { passwordChangeScreen(); return; }
  buildShell();
  if (!location.hash || location.hash === '#' || location.hash === '#/') location.hash = '#/dashboard';
  else router();
}

window.addEventListener('hashchange', () => { window.scrollTo(0, 0); router(); });
window.addEventListener('itw:logout', () => { if (state.me) { state.me = null; toast('Sitzung abgelaufen – bitte erneut anmelden.', 'bad'); authScreen(); } });
window.addEventListener('itw:passwort', () => { if (state.me) passwordChangeScreen(); });
window.addEventListener('itw:settings', async () => { try { state.me = await get('/api/auth/me'); renderSidebar(); } catch { /* egal */ } });

(async function init() {
  try {
    state.me = await get('/api/auth/me');
    startApp();
  } catch {
    authScreen();
  }
}());
