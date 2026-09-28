// IT - World – generische Ansichten: Liste, Board (Kanban), Detail, Formular, Beleg-Editor, Druckansicht.
import {
  h, clear, icon, api, get, post, put, del, options, invalidateOptions, qs, money, num, date, datetime, relTime,
  badge, toast, errToast, confirmDialog, formDialog, modal, state, today, bytes, fileToBase64, downloadUrl, debounce, socialLinks,
} from './core.js';

export const meta = () => state.me.meta;
export const spec = (res) => meta().resources[res];
export const perm = (res) => state.me.perms[res] || { read: false, write: false };
export const go = (hash) => { location.hash = hash; };

const BADGE_FIELDS = new Set(['status', 'phase', 'prioritaet']);

export function pageHead(title, sub, ...actions) {
  return h('div.page-head',
    h('div', h('h1', title), sub ? h('p.sub', sub) : null),
    h('div.page-actions', actions));
}

export function emptyState(text, action) {
  return h('div.empty', h('div.empty-logo'), h('p', text), action || null);
}

/** Formatiert einen Feldwert für Tabellen/Details. */
export function fmt(f, item, { link = true } = {}) {
  const v = item[f.name];
  if (v === null || v === undefined || v === '') {
    return f.type === 'bool' ? h('span.muted', '—') : h('span.muted', '—');
  }
  switch (f.type) {
    case 'ref': {
      const label = item[`${f.name}__label`] || `#${v}`;
      if (link && f.ref !== 'benutzer' && perm(f.ref).read) return h('a.ref', { href: `#/r/${f.ref}/${v}`, onclick: (e) => e.stopPropagation() }, label);
      return label;
    }
    case 'enum': return BADGE_FIELDS.has(f.name) ? badge(v) : String(v) + (f.name === 'mwst' ? ' %' : '');
    case 'money': return money(v);
    case 'number': return num(v);
    case 'percent': return h('span.pct', h('span.pct-bar', h('i', { style: { width: `${Math.min(Math.max(v, 0), 100)}%` } })), `${v} %`);
    case 'int': return f.name === 'groesse' ? bytes(v) : num(v, 0);
    case 'bool': return v ? h('span.yes', icon('check', 15)) : h('span.muted', '—');
    case 'date': return date(v);
    case 'datetime': return datetime(v);
    case 'email': return link ? h('a', { href: `mailto:${v}`, onclick: (e) => e.stopPropagation() }, v) : v;
    case 'tel': return link ? h('a', { href: `tel:${String(v).replace(/[^\d+]/g, '')}`, onclick: (e) => e.stopPropagation() }, v) : v;
    case 'url': return link && /^https?:\/\//.test(v) ? h('a', { href: v, target: '_blank', rel: 'noopener noreferrer', onclick: (e) => e.stopPropagation() }, v.replace(/^https?:\/\//, '')) : v;
    case 'text': return h('span.pre', v);
    default: return String(v);
  }
}

function parseHashQuery(query) {
  const out = {};
  for (const [k, v] of query) out[k] = v;
  return out;
}

// ================================================================== LISTE
export async function listView(root, { res }, query) {
  const sp = spec(res);
  if (!sp) return notFoundView(root);
  const q = parseHashQuery(query);
  const view = q.ansicht === 'board' && sp.board ? 'board' : 'tabelle';
  const canWrite = perm(res).write;
  const filterFields = sp.fields.filter((f) => f.filter);

  const setQuery = (patch) => {
    const next = { ...q, ...patch };
    if (!('page' in patch)) delete next.page;
    for (const k of Object.keys(next)) if (next[k] === '' || next[k] == null) delete next[k];
    go(`#/r/${res}${qs(next)}`);
  };

  const searchInput = h('input.search-input', {
    type: 'search', placeholder: `${sp.label} durchsuchen …`, value: q.q || '', 'aria-label': 'Suche',
    oninput: debounce((e) => setQuery({ q: e.target.value }), 350),
  });

  const filterEls = await Promise.all(filterFields.map(async (f) => {
    let opts = f.options ? f.options.map((o) => [o, o]) : [];
    if (f.type === 'ref') opts = (await options(f.ref)).map((o) => [o.id, o.label]);
    if (f.type === 'bool') opts = [['true', 'Ja'], ['false', 'Nein']];
    return h('select.filter', { 'aria-label': f.label, onchange: (e) => setQuery({ [`f_${f.name}`]: e.target.value }) },
      h('option', { value: '' }, `${f.label}: alle`),
      opts.map(([v, l]) => h('option', { value: v, selected: String(q[`f_${f.name}`] ?? '') === String(v) }, l)));
  }));

  const actions = [];
  if (sp.board) {
    actions.push(h('div.seg',
      h(`button.seg-btn${view === 'tabelle' ? '.on' : ''}`, { type: 'button', title: 'Tabelle', onclick: () => setQuery({ ansicht: '' }) }, icon('list', 16), h('span', 'Tabelle')),
      h(`button.seg-btn${view === 'board' ? '.on' : ''}`, { type: 'button', title: 'Board', onclick: () => setQuery({ ansicht: 'board' }) }, icon('columns', 16), h('span', 'Board'))));
  }
  if (sp.importable && canWrite) actions.push(h('button.btn', { type: 'button', onclick: () => importDialog(res) }, icon('upload', 16), h('span.hide-sm', 'Import')));
  actions.push(h('button.btn', { type: 'button', onclick: () => downloadUrl(`/api/r/${res}/export.csv${qs({ q: q.q, ...Object.fromEntries(Object.entries(q).filter(([k]) => k.startsWith('f_'))) })}`) }, icon('download', 16), h('span.hide-sm', 'Export')));
  if (canWrite) {
    actions.push(sp.upload
      ? h('button.btn.btn-primary', { type: 'button', onclick: () => uploadDialog({}) }, icon('upload', 16), h('span', 'Hochladen'))
      : h('a.btn.btn-primary', { href: `#/r/${res}/neu` }, icon('plus', 16), h('span', 'Neu')));
  }

  const toolbar = h('div.toolbar', h('div.search-box', icon('search', 16), searchInput), filterEls,
    sp.beleg && res === 'rechnungen' ? h(`button.chip${q.ueberfaellig === 'true' ? '.on' : ''}`, { type: 'button', onclick: () => setQuery({ ueberfaellig: q.ueberfaellig === 'true' ? '' : 'true' }) }, icon('alert', 14), 'Überfällig') : null);

  const body = h('div', h('div.loading'));
  clear(root).appendChild(h('div.page', pageHead(sp.label, null, ...actions), toolbar, body));
  if (q.q) { searchInput.focus(); searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length); }

  try {
    if (view === 'board') {
      const data = await get(`/api/r/${res}${qs({ ...q, ansicht: undefined, limit: 1000, page: 1 })}`);
      clear(body).appendChild(boardView(res, data.items, () => listView(root, { res }, query)));
      return;
    }
    const data = await get(`/api/r/${res}${qs({ ...q, ansicht: undefined })}`);
    clear(body);
    if (!data.items.length) {
      body.appendChild(emptyState(q.q || Object.keys(q).some((k) => k.startsWith('f_')) ? 'Keine Treffer für diese Suche.' : `Noch keine ${sp.label} vorhanden.`,
        canWrite && !sp.upload ? h('a.btn.btn-primary', { href: `#/r/${res}/neu` }, icon('plus', 16), `${sp.singular} anlegen`) : null));
      return;
    }
    body.appendChild(dataTable(res, data.items, { sort: q.sort, dir: q.dir, onSort: (s, d) => setQuery({ sort: s, dir: d, page: q.page }) }));
    body.appendChild(pager(data, (p) => setQuery({ page: p })));
    if (sp.beleg) body.appendChild(summenLeiste(data.items));
  } catch (e) {
    clear(body).appendChild(errorBox(e));
  }
}

function summenLeiste(items) {
  const brutto = items.reduce((s, i) => s + (i.brutto || 0), 0);
  const offen = items.filter((i) => i.typ === 'Rechnung' && ['Offen', 'Teilbezahlt'].includes(i.status)).reduce((s, i) => s + (i.offen || 0), 0);
  return h('div.sum-bar', h('span', 'Summe dieser Seite (brutto): ', h('b', money(brutto))), offen ? h('span', 'davon offen: ', h('b.text-warn', money(offen))) : null);
}

export function dataTable(res, items, { sort, dir, onSort, compact, hide } = {}) {
  const sp = spec(res);
  const cols = sp.fields.filter((f) => f.list && !f.hidden && f.name !== hide);
  const table = h(`table.table${compact ? '.compact' : ''}`,
    h('thead', h('tr', cols.map((f) => {
      const active = sort === f.name;
      return h('th', {
        class: [['money', 'number', 'int', 'percent'].includes(f.type) ? 'num' : '', onSort ? 'sortable' : '', active ? 'active' : ''].join(' '),
        onclick: onSort ? () => onSort(f.name, active && dir !== 'desc' ? 'desc' : 'asc') : null,
      }, f.label, active ? h('span.sort-ind', dir === 'desc' ? ' ▼' : ' ▲') : null);
    }), sp.beleg ? h('th.num', 'Offen') : null)),
    h('tbody', items.map((it) => h('tr', { tabindex: 0, onclick: () => go(`#/r/${res}/${it.id}`), onkeydown: (e) => { if (e.key === 'Enter') go(`#/r/${res}/${it.id}`); } },
      cols.map((f, i) => h('td', { 'data-label': f.label, class: ['money', 'number', 'int', 'percent'].includes(f.type) ? 'num' : '' },
        i === 0 ? h('a.row-link', { href: `#/r/${res}/${it.id}`, onclick: (e) => e.stopPropagation() }, fmt(f, it, { link: false })) : fmt(f, it),
        f.name === 'status' && it.ueberfaellig ? h('span', ' ', badge('Überfällig')) : null,
        f.name === 'bestand' && it.typ === 'Produkt' && it.bestand <= it.mindestbestand ? h('span', ' ', badge('Nachbestellen', 'bad')) : null)),
      sp.beleg ? h('td.num', { 'data-label': 'Offen' }, it.typ === 'Rechnung' && it.offen > 0 && it.status !== 'Entwurf' && it.status !== 'Storniert' ? h('b.text-warn', money(it.offen)) : h('span.muted', '—')) : null))));
  return h('div.table-wrap', table);
}

function pager({ total, page, limit }, onPage) {
  const pages = Math.max(Math.ceil(total / limit), 1);
  return h('div.pager',
    h('span.muted', `${total} Einträge · Seite ${page} von ${pages}`),
    h('div',
      h('button.btn.btn-sm', { type: 'button', disabled: page <= 1, onclick: () => onPage(page - 1) }, icon('arrowLeft', 14), 'Zurück'),
      h('button.btn.btn-sm', { type: 'button', disabled: page >= pages, onclick: () => onPage(page + 1) }, 'Weiter', icon('arrowRight', 14))));
}

export function errorBox(e) {
  return h('div.error-box', icon('alert', 20), h('span', e.message || String(e)));
}

export function notFoundView(root) {
  clear(root).appendChild(h('div.page', emptyState('Diese Seite existiert nicht.', h('a.btn.btn-primary', { href: '#/dashboard' }, 'Zum Dashboard'))));
}

// ================================================================== BOARD
function boardView(res, items, reload) {
  const sp = spec(res);
  const f = sp.fields.find((x) => x.name === sp.board);
  const canWrite = perm(res).write;
  const sumField = sp.boardSum ? sp.fields.find((x) => x.name === sp.boardSum) : null;
  const move = async (id, value) => {
    try {
      await put(`/api/r/${res}/${id}`, { [f.name]: value });
      toast(`Verschoben nach „${value}“`);
      reload();
    } catch (e) { errToast(e); }
  };
  const subFields = sp.fields.filter((x) => x.list && x.name !== f.name && !sp.title.includes(x.name)).slice(0, 3);
  return h('div.board', f.options.map((opt, oi) => {
    const col = items.filter((i) => i[f.name] === opt);
    const colEl = h('div.board-col', {
      ondragover: (e) => { if (canWrite) { e.preventDefault(); colEl.classList.add('drop'); } },
      ondragleave: () => colEl.classList.remove('drop'),
      ondrop: (e) => { e.preventDefault(); colEl.classList.remove('drop'); const id = e.dataTransfer.getData('text/plain'); if (id) move(id, opt); },
    },
    h('div.board-col-head', badge(opt), h('span.count', col.length), sumField ? h('small.muted', money(col.reduce((s, i) => s + (i[sumField.name] || 0), 0))) : null),
    h('div.board-cards', col.map((it) => h('div.board-card', {
      draggable: canWrite ? 'true' : null,
      ondragstart: (e) => { e.dataTransfer.setData('text/plain', String(it.id)); e.dataTransfer.effectAllowed = 'move'; },
      onclick: () => go(`#/r/${res}/${it.id}`),
    },
    h('div.bc-title', it.__title),
    h('div.bc-meta', subFields.map((sf) => (it[sf.name] != null && it[sf.name] !== '' ? h('span', fmt(sf, it, { link: false })) : null))),
    canWrite ? h('div.bc-move',
      oi > 0 ? h('button.icon-btn.sm', { type: 'button', title: `← ${f.options[oi - 1]}`, onclick: (e) => { e.stopPropagation(); move(it.id, f.options[oi - 1]); } }, icon('arrowLeft', 14)) : h('span'),
      oi < f.options.length - 1 ? h('button.icon-btn.sm', { type: 'button', title: `${f.options[oi + 1]} →`, onclick: (e) => { e.stopPropagation(); move(it.id, f.options[oi + 1]); } }, icon('arrowRight', 14)) : null) : null))));
    return colEl;
  }));
}

// ================================================================== DETAIL
export async function detailView(root, { res, id }) {
  const sp = spec(res);
  if (!sp) return notFoundView(root);
  clear(root).appendChild(h('div.page', h('div.loading')));
  let item;
  try {
    item = await get(`/api/r/${res}/${id}`);
  } catch (e) {
    clear(root).appendChild(h('div.page', errorBox(e)));
    return;
  }
  const canWrite = perm(res).write;
  const reload = () => detailView(root, { res, id });
  const statusField = sp.fields.find((f) => BADGE_FIELDS.has(f.name));

  const actions = [];
  if (sp.beleg) {
    actions.push(h('a.btn', { href: `#/druck/${res}/${id}` }, icon('printer', 16), h('span', 'Drucken / PDF')));
    if (canWrite) actions.push(h('button.btn', { type: 'button', onclick: () => sendBelegDialog(res, item).then((ok) => ok && reload()) }, icon('send', 16), h('span', 'Per E-Mail')));
    for (const ziel of sp.convert || []) {
      if (perm(ziel).write) actions.push(h('button.btn', { type: 'button', onclick: () => convertBeleg(res, item, ziel) }, icon('repeat', 16), h('span', `→ ${spec(ziel).singular}`)));
    }
    if (res === 'rechnungen' && canWrite) {
      if (item.status === 'Entwurf') actions.push(h('button.btn.btn-primary', { type: 'button', onclick: () => setStatus(res, item, 'Offen', 'Rechnung festschreiben? Danach sind Positionen nicht mehr änderbar und der Lagerbestand wird gebucht.').then((ok) => ok && reload()) }, icon('check', 16), 'Festschreiben'));
      if (['Offen', 'Teilbezahlt'].includes(item.status)) {
        actions.push(h('button.btn.btn-primary', { type: 'button', onclick: () => paymentDialog(item).then((ok) => ok && reload()) }, icon('euro', 16), 'Zahlung erfassen'));
      }
      if (!['Entwurf', 'Storniert'].includes(item.status)) actions.push(h('button.btn.btn-danger-ghost', { type: 'button', onclick: () => setStatus(res, item, 'Storniert', 'Rechnung stornieren? Gebuchte Lagerbestände werden zurückgebucht.').then((ok) => ok && reload()) }, 'Stornieren'));
    }
  }
  if (res === 'projekte' && perm('rechnungen').write) {
    actions.push(h('button.btn', { type: 'button', onclick: async () => {
      if (!(await confirmDialog('Alle offenen, abrechenbaren Zeiten dieses Projekts in eine neue Rechnung übernehmen?', { ok: 'Rechnung erstellen' }))) return;
      try { const r = await post(`/api/projekte/${id}/abrechnen`); toast(`Rechnung ${r.nummer} erstellt`); go(`#/r/rechnungen/${r.id}`); } catch (e) { errToast(e); }
    } }, icon('receipt', 16), h('span', 'Zeiten abrechnen')));
  }
  if (res === 'produkte' && canWrite && item.typ === 'Produkt') {
    actions.push(h('button.btn', { type: 'button', onclick: () => stockDialog(item).then((ok) => ok && reload()) }, icon('box', 16), h('span', 'Lagerbuchung')));
  }
  if (res === 'dokumente') {
    if (/^(image\/(png|jpeg|gif|webp)|application\/pdf)$/.test(item.mime || '')) actions.push(h('a.btn', { href: `/api/dokumente/${id}/download?ansicht=1`, target: '_blank', rel: 'noopener' }, icon('eye', 16), h('span', 'Ansehen')));
    actions.push(h('a.btn.btn-primary', { href: `/api/dokumente/${id}/download` }, icon('download', 16), h('span', 'Herunterladen')));
  }
  const locked = res === 'rechnungen' && item.status !== 'Entwurf';
  if (canWrite && !sp.upload && !locked) actions.push(h('a.btn', { href: `#/r/${res}/${id}/bearbeiten` }, icon('edit', 16), h('span', 'Bearbeiten')));
  if (canWrite && sp.upload) actions.push(h('button.btn', { type: 'button', onclick: () => editDocDialog(item).then((ok) => ok && reload()) }, icon('edit', 16), h('span', 'Bearbeiten')));
  if (canWrite && (res !== 'rechnungen' || item.status === 'Entwurf')) {
    actions.push(h('button.icon-btn.danger', { type: 'button', title: 'Löschen', 'aria-label': 'Löschen', onclick: async () => {
      if (!(await confirmDialog(`${sp.singular} „${item.__title}“ wirklich löschen?`, { ok: 'Löschen', danger: true }))) return;
      try { await del(`/api/r/${res}/${id}`); invalidateOptions(res); toast(`${sp.singular} gelöscht`); go(`#/r/${res}`); } catch (e) { errToast(e); }
    } }, icon('trash', 16)));
  }

  const fields = sp.fields.filter((f) => !f.hidden && f.type !== 'json' && !sp.title.includes(f.name) && !BADGE_FIELDS.has(f.name));
  const details = h('div.card',
    h('h3.card-title', 'Details'),
    h('dl.dl-grid', fields.filter((f) => f.type !== 'text').map((f) => h('div', h('dt', f.label), h('dd', fmt(f, item))))),
    fields.filter((f) => f.type === 'text' && item[f.name]).map((f) => h('div.text-block', h('h4', f.label), h('p.pre', item[f.name]))),
    h('p.meta-line.muted', `Erstellt ${datetime(item.created_at)} · Geändert ${relTime(item.updated_at)}`));

  const main = h('div.detail-main');
  if (sp.beleg) main.appendChild(belegCard(item));
  main.appendChild(details);
  if (res === 'produkte' && item.typ === 'Produkt') main.appendChild(await stockCard(id));
  if (res === 'projekte') main.appendChild(await projektStats(item));
  if (res === 'kunden') main.appendChild(await kundenStats(item));
  for (const rel of sp.related || []) {
    if (!perm(rel.res).read) continue;
    main.appendChild(await relatedCard(rel, item, res));
  }

  const head = h('div.detail-head',
    h('a.back', { href: `#/r/${res}` }, icon('arrowLeft', 16), sp.label),
    h('div.detail-title',
      h('div', h('h1', item.__title), h('p.sub', sp.singular, statusField ? h('span', ' ', fmt(statusField, item)) : null, item.ueberfaellig ? h('span', ' ', badge('Überfällig')) : null)),
      h('div.page-actions', actions)));

  clear(root).appendChild(h('div.page', head, h('div.detail-grid', main, h('aside.detail-side', await sidePanel(res, id)))));
}

async function kundenStats(item) {
  const box = h('div.stat-row');
  if (perm('rechnungen').read) {
    const r = await get(`/api/r/rechnungen?f_kunde_id=${item.id}&limit=1000`).catch(() => ({ items: [] }));
    const aktiv = r.items.filter((x) => ['Offen', 'Teilbezahlt', 'Bezahlt'].includes(x.status));
    box.appendChild(h('div.mini-stat', h('small', 'Umsatz gesamt (netto)'), h('b', money(aktiv.reduce((s, x) => s + x.netto, 0)))));
    box.appendChild(h('div.mini-stat', h('small', 'Offene Posten'), h('b.text-warn', money(aktiv.reduce((s, x) => s + (x.status !== 'Bezahlt' ? x.offen : 0), 0)))));
    box.appendChild(h('div.mini-stat', h('small', 'Rechnungen'), h('b', String(r.items.length))));
  }
  if (perm('deals').read) {
    const d = await get(`/api/r/deals?f_kunde_id=${item.id}&limit=1000`).catch(() => ({ items: [] }));
    box.appendChild(h('div.mini-stat', h('small', 'Offene Pipeline'), h('b', money(d.items.filter((x) => !['Gewonnen', 'Verloren'].includes(x.phase)).reduce((s, x) => s + x.wert, 0)))));
  }
  return box;
}

async function projektStats(item) {
  const box = h('div.stat-row');
  if (perm('zeiten').read) {
    const z = await get(`/api/r/zeiten?f_projekt_id=${item.id}&limit=1000`).catch(() => ({ items: [] }));
    const std = z.items.reduce((s, x) => s + x.stunden, 0);
    const offen = z.items.filter((x) => x.abrechenbar && !x.abgerechnet).reduce((s, x) => s + x.stunden, 0);
    const kosten = std * (item.stundensatz || 0);
    box.appendChild(h('div.mini-stat', h('small', 'Erfasste Stunden'), h('b', `${num(std)} h`)));
    box.appendChild(h('div.mini-stat', h('small', 'Noch nicht abgerechnet'), h('b.text-warn', `${num(offen)} h · ${money(offen * (item.stundensatz || 0))}`)));
    if (item.budget) {
      const p = Math.round((kosten / item.budget) * 100);
      box.appendChild(h('div.mini-stat', h('small', 'Budgetverbrauch'), h('b', { class: p > 100 ? 'text-bad' : '' }, `${p} %`), h('span.pct-bar.wide', h('i', { style: { width: `${Math.min(p, 100)}%` } }))));
    }
  }
  return box;
}

async function relatedCard(rel, item, parentRes) {
  const rs = spec(rel.res);
  const data = await get(`/api/r/${rel.res}?f_${rel.field}=${item.id}&limit=10`).catch(() => ({ items: [], total: 0 }));
  const prefill = { [rel.field]: item.id };
  if (parentRes === 'projekte' && rel.res === 'zeiten') prefill.projekt_id = item.id;
  const addBtn = perm(rel.res).write && !rs.upload && !(rel.res === 'zahlungen' && !['Offen', 'Teilbezahlt'].includes(item.status))
    ? h('a.btn.btn-sm', { href: `#/r/${rel.res}/neu${qs(prefill)}` }, icon('plus', 14), 'Neu')
    : rs.upload && perm(rel.res).write ? h('button.btn.btn-sm', { type: 'button', onclick: () => uploadDialog(prefill) }, icon('upload', 14), 'Hochladen') : null;
  return h('div.card',
    h('div.card-head', h('h3.card-title', icon(rs.icon, 16), rs.label, h('span.count', data.total)),
      h('div', data.total > 10 ? h('a.btn.btn-sm.btn-ghost', { href: `#/r/${rel.res}${qs({ [`f_${rel.field}`]: item.id })}` }, 'Alle anzeigen') : null, addBtn)),
    data.items.length ? dataTable(rel.res, data.items, { compact: true, hide: rel.field }) : h('p.muted.pad', `Keine ${rs.label} vorhanden.`));
}

async function sidePanel(res, id) {
  const wrap = h('div.card.side-card');
  const tabs = h('div.tabs');
  const body = h('div.tab-body');
  const show = async (which) => {
    [...tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.t === which));
    clear(body).appendChild(h('div.loading.sm'));
    try {
      if (which === 'kommentare') {
        const list = await get(`/api/kommentare?resource=${res}&id=${id}`);
        const ta = h('textarea', { rows: 3, placeholder: 'Notiz oder Kommentar hinzufügen …', 'aria-label': 'Kommentar' });
        const form = state.me.user.rolle !== 'lesezugriff' ? h('form.comment-form', {
          onsubmit: async (e) => {
            e.preventDefault();
            if (!ta.value.trim()) return;
            try { await post('/api/kommentare', { resource: res, id, text: ta.value }); show('kommentare'); } catch (err) { errToast(err); }
          },
        }, ta, h('button.btn.btn-primary.btn-sm', { type: 'submit' }, icon('send', 14), 'Speichern')) : null;
        clear(body).append(...[form, list.length ? h('ul.timeline', list.map((k) => h('li',
          h('div.tl-head', h('b', k.user_name || 'System'), h('small.muted', relTime(k.created_at)),
            (k.user_id === state.me.user.id || state.me.user.rolle === 'admin') ? h('button.icon-btn.sm', { type: 'button', title: 'Löschen', onclick: async () => { try { await del(`/api/kommentare/${k.id}`); show('kommentare'); } catch (err) { errToast(err); } } }, icon('x', 12)) : null),
          h('p.pre', k.text)))) : h('p.muted', 'Noch keine Kommentare.')].filter(Boolean));
      } else {
        const { items } = await get(`/api/aktivitaeten?resource=${res}&id=${id}`);
        clear(body).appendChild(items.length ? h('ul.timeline', items.map((a) => h('li',
          h('div.tl-head', h('b', a.user_name || 'System'), h('small.muted', relTime(a.created_at))),
          h('p', a.aktion, a.details ? h('small.muted.block', a.details) : null)))) : h('p.muted', 'Kein Verlauf.'));
      }
    } catch (e) { clear(body).appendChild(errorBox(e)); }
  };
  tabs.append(
    h('button.tab', { type: 'button', dataset: { t: 'kommentare' }, onclick: () => show('kommentare') }, icon('message', 15), 'Notizen'),
    h('button.tab', { type: 'button', dataset: { t: 'verlauf' }, onclick: () => show('verlauf') }, icon('activity', 15), 'Verlauf'));
  wrap.append(tabs, body);
  show('kommentare');
  return wrap;
}

// ------------------------------------------------------------------ Beleg-Anzeige
function steuerAufschluesselung(pos) {
  const map = {};
  for (const p of pos) map[p.mwst] = (map[p.mwst] || 0) + (p.summe ?? p.menge * p.preis * (1 - (p.rabatt || 0) / 100));
  return Object.entries(map).filter(([satz]) => Number(satz) > 0).map(([satz, basis]) => ({ satz, basis, steuer: Math.round(basis * satz) / 100 }));
}

function belegCard(item) {
  const pos = item.positionen || [];
  return h('div.card.beleg-card',
    h('h3.card-title', 'Positionen'),
    item.einleitung ? h('p.pre.muted', item.einleitung) : null,
    h('div.table-wrap', h('table.table.compact.pos-table',
      h('thead', h('tr', h('th', 'Pos.'), h('th', 'Bezeichnung'), h('th.num', 'Menge'), h('th.num', 'Einzelpreis'), h('th.num', 'Rabatt'), h('th.num', 'MwSt.'), h('th.num', 'Summe'))),
      h('tbody', pos.map((p, i) => h('tr',
        h('td', { 'data-label': 'Pos.' }, String(i + 1)),
        h('td', { 'data-label': 'Bezeichnung' }, h('b', p.bezeichnung), p.beschreibung ? h('small.block.muted.pre', p.beschreibung) : null),
        h('td.num', { 'data-label': 'Menge' }, `${num(p.menge, 3)} ${p.einheit}`),
        h('td.num', { 'data-label': 'Einzelpreis' }, money(p.preis)),
        h('td.num', { 'data-label': 'Rabatt' }, p.rabatt ? `${num(p.rabatt)} %` : '—'),
        h('td.num', { 'data-label': 'MwSt.' }, `${num(p.mwst)} %`),
        h('td.num', { 'data-label': 'Summe' }, money(p.summe))))))),
    h('div.totals',
      h('div', h('span', 'Netto'), h('b', money(item.netto))),
      steuerAufschluesselung(pos).map((s) => h('div', h('span', `zzgl. ${num(s.satz)} % MwSt.`), h('b', money(s.steuer)))),
      h('div.grand', h('span', 'Gesamt'), h('b', money(item.brutto))),
      item.typ === 'Rechnung' && item.bezahlt ? h('div', h('span', 'Bezahlt'), h('b.text-ok', money(item.bezahlt))) : null,
      item.typ === 'Rechnung' && item.offen > 0 && item.status !== 'Entwurf' && item.status !== 'Storniert' ? h('div', h('span', 'Offen'), h('b.text-warn', money(item.offen))) : null));
}

async function stockCard(id) {
  const rows = await get(`/api/produkte/${id}/lager`).catch(() => []);
  return h('div.card', h('h3.card-title', icon('box', 16), 'Lagerbewegungen'),
    rows.length ? h('div.table-wrap', h('table.table.compact', h('thead', h('tr', h('th', 'Datum'), h('th', 'Grund'), h('th.num', 'Menge'), h('th', 'Benutzer'))),
      h('tbody', rows.map((r) => h('tr', h('td', { 'data-label': 'Datum' }, datetime(r.created_at)), h('td', { 'data-label': 'Grund' }, r.grund), h('td.num', { 'data-label': 'Menge', class: r.menge < 0 ? 'text-bad' : 'text-ok' }, `${r.menge > 0 ? '+' : ''}${r.menge}`), h('td', { 'data-label': 'Benutzer' }, r.user_name || '')))))) : h('p.muted.pad', 'Noch keine Bewegungen.'));
}

// ------------------------------------------------------------------ Aktionen / Dialoge
async function setStatus(res, item, status, text) {
  if (!(await confirmDialog(text, { ok: status === 'Storniert' ? 'Stornieren' : 'Bestätigen', danger: status === 'Storniert' }))) return false;
  try { await put(`/api/r/${res}/${item.id}`, { status }); toast(`Status: ${status}`); return true; } catch (e) { errToast(e); return false; }
}

async function convertBeleg(res, item, ziel) {
  if (!(await confirmDialog(`${spec(res).singular} ${item.nummer} in ${spec(ziel).singular === 'Auftrag' ? 'einen Auftrag' : 'eine Rechnung'} umwandeln?`, { ok: 'Umwandeln' }))) return;
  try {
    const r = await post(`/api/r/${res}/${item.id}/umwandeln`, { ziel });
    toast(`${spec(ziel).singular} ${r.nummer} erstellt`);
    go(`#/r/${ziel}/${r.id}`);
  } catch (e) { errToast(e); }
}

async function paymentDialog(item) {
  const f = spec('zahlungen').fields.find((x) => x.name === 'methode');
  const v = await formDialog(`Zahlung zu ${item.nummer}`, [
    { name: 'betrag', label: 'Betrag', type: 'number', step: '0.01', value: item.offen, required: true },
    { name: 'datum', label: 'Datum', type: 'date', value: today(), required: true },
    { name: 'methode', label: 'Zahlungsart', type: 'select', options: f.options, value: 'Überweisung' },
    { name: 'referenz', label: 'Referenz', value: item.nummer },
  ], { ok: 'Zahlung buchen', intro: `Offener Betrag: ${money(item.offen)}` });
  if (!v) return false;
  try { await post('/api/r/zahlungen', { ...v, beleg_id: item.id }); toast('Zahlung gebucht'); return true; } catch (e) { errToast(e); return false; }
}

async function stockDialog(item) {
  const v = await formDialog(`Lagerbuchung: ${item.name}`, [
    { name: 'menge', label: 'Menge (+ Zugang / − Abgang)', type: 'number', step: '1', required: true },
    { name: 'grund', label: 'Grund', type: 'select', options: ['Wareneingang', 'Inventur-Korrektur', 'Schwund / Defekt', 'Rücksendung', 'Eigenbedarf'] },
  ], { ok: 'Buchen', intro: `Aktueller Bestand: ${item.bestand ?? 0} ${item.einheit || ''}` });
  if (!v) return false;
  try { await post(`/api/produkte/${item.id}/lager`, { menge: Number(v.menge), grund: v.grund }); toast('Lager gebucht'); return true; } catch (e) { errToast(e); return false; }
}

async function sendBelegDialog(res, item) {
  const sp = spec(res);
  let kundeEmail = '';
  try { kundeEmail = (await get(`/api/r/kunden/${item.kunde_id}`)).email || ''; } catch { /* optional */ }
  const firma = state.me.settings.firma;
  const text = `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie ${sp.singular === 'Rechnung' ? 'unsere Rechnung' : sp.singular === 'Angebot' ? 'unser Angebot' : 'unsere Auftragsbestätigung'} ${item.nummer}${item.betreff ? ` („${item.betreff}“)` : ''} über ${money(item.brutto)}.${res === 'rechnungen' ? `\n\nBitte überweisen Sie den Betrag bis zum ${date(item.faellig)} auf folgendes Konto:\n${firma.bank}\nIBAN: ${firma.iban}\nBIC: ${firma.bic}\nVerwendungszweck: ${item.nummer}` : ''}\n\nMit freundlichen Grüßen\n${state.me.user.name}\n${firma.name}`;
  const v = await formDialog(`${sp.singular} ${item.nummer} per E-Mail senden`, [
    { name: 'an', label: 'Empfänger', type: 'email', value: kundeEmail, required: true, full: true },
    { name: 'betreff', label: 'Betreff', value: `${sp.singular} ${item.nummer} – ${firma.name}`, full: true },
    { name: 'text', label: 'Nachricht', type: 'textarea', value: text, rows: 12 },
  ], { ok: 'Senden', intro: state.me.smtp ? null : 'Hinweis: Es ist kein SMTP-Server konfiguriert – die E-Mail wird nur im Postausgang protokolliert. Tipp: Beleg über „Drucken / PDF“ als PDF speichern und anhängen.' });
  if (!v) return false;
  try { await post(`/api/r/${res}/${item.id}/email`, v); toast('E-Mail in den Postausgang gestellt'); return true; } catch (e) { errToast(e); return false; }
}

export async function uploadDialog(prefill = {}) {
  const kunden = perm('kunden').read ? await options('kunden') : [];
  const projekte = perm('projekte').read ? await options('projekte') : [];
  const kat = spec('dokumente').fields.find((f) => f.name === 'kategorie').options;
  return modal({
    title: 'Dokument hochladen',
    content: (close) => {
      const file = h('input', { type: 'file', name: 'datei', required: true });
      const drop = h('label.dropzone', icon('upload', 28), h('span', 'Datei hierher ziehen oder auswählen (max. 15 MB)'), file);
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drop'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('drop'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('drop'); if (e.dataTransfer.files.length) { file.files = e.dataTransfer.files; file.dispatchEvent(new Event('change')); } });
      const name = h('input', { name: 'name', placeholder: 'Titel (optional)' });
      file.addEventListener('change', () => { if (file.files[0] && !name.value) name.value = file.files[0].name.replace(/\.[^.]+$/, ''); drop.querySelector('span').textContent = file.files[0] ? file.files[0].name : ''; });
      const sel = (n, list, v) => h('select', { name: n }, h('option', { value: '' }, '—'), list.map((o) => h('option', { value: o.id, selected: String(v) === String(o.id) }, o.label)));
      const form = h('form.form-grid', {
        onsubmit: async (e) => {
          e.preventDefault();
          const f = file.files[0];
          if (!f) return;
          if (f.size > 15 * 1024 * 1024) { toast('Datei ist größer als 15 MB.', 'bad'); return; }
          const btn = form.querySelector('button[type=submit]');
          btn.disabled = true;
          btn.textContent = 'Wird hochgeladen …';
          try {
            const doc = await post('/api/dokumente/upload', {
              name: name.value || f.name, datei_name: f.name, mime: f.type, data: await fileToBase64(f),
              kategorie: form.elements.kategorie.value, kunde_id: form.elements.kunde_id.value || null, projekt_id: form.elements.projekt_id.value || null,
            });
            toast('Dokument hochgeladen');
            close(doc);
            go(`#/r/dokumente/${doc.id}`);
          } catch (err) { errToast(err); btn.disabled = false; btn.textContent = 'Hochladen'; }
        },
      },
      h('div.full', drop),
      h('label.field.full', h('span.label', 'Titel'), name),
      h('label.field', h('span.label', 'Kategorie'), h('select', { name: 'kategorie' }, kat.map((k) => h('option', { selected: k === 'Sonstiges' }, k)))),
      h('label.field', h('span.label', 'Kunde'), sel('kunde_id', kunden, prefill.kunde_id)),
      h('label.field', h('span.label', 'Projekt'), sel('projekt_id', projekte, prefill.projekt_id)),
      h('div.full.form-actions', h('button.btn', { type: 'button', onclick: () => close(null) }, 'Abbrechen'), h('button.btn.btn-primary', { type: 'submit' }, 'Hochladen')));
      return form;
    },
  });
}

async function editDocDialog(item) {
  const kat = spec('dokumente').fields.find((f) => f.name === 'kategorie').options;
  const v = await formDialog('Dokument bearbeiten', [
    { name: 'name', label: 'Titel', value: item.name, required: true, full: true },
    { name: 'kategorie', label: 'Kategorie', type: 'select', options: kat, value: item.kategorie },
    { name: 'notizen', label: 'Notizen', type: 'textarea', value: item.notizen || '' },
  ]);
  if (!v) return false;
  try { await put(`/api/r/dokumente/${item.id}`, v); toast('Gespeichert'); return true; } catch (e) { errToast(e); return false; }
}

async function importDialog(res) {
  const sp = spec(res);
  const cols = sp.fields.filter((f) => !f.readonly && !f.hidden).map((f) => f.label).join('; ');
  await modal({
    title: `${sp.label} importieren (CSV)`,
    wide: true,
    content: (close) => {
      const file = h('input', { type: 'file', accept: '.csv,text/csv', required: true });
      const out = h('div');
      const form = h('form', {
        onsubmit: async (e) => {
          e.preventDefault();
          const f = file.files[0];
          if (!f) return;
          try {
            const r = await post(`/api/r/${res}/import`, { csv: await f.text() });
            invalidateOptions(res);
            clear(out).append(h('p.text-ok', `${r.importiert} Datensätze importiert.`), r.fehler.length ? h('ul.errors', r.fehler.map((x) => h('li', x))) : null);
            if (!r.fehler.length) setTimeout(() => { close(true); window.dispatchEvent(new HashChangeEvent('hashchange')); }, 900);
          } catch (err) { errToast(err); }
        },
      },
      h('p', 'Erste Zeile = Spaltenüberschriften (Feldname oder Bezeichnung wie im Export). Trennzeichen ; oder , – Datumsformat TT.MM.JJJJ oder JJJJ-MM-TT.'),
      h('p.muted.small', `Mögliche Spalten: ${cols}`),
      h('label.dropzone', icon('upload', 24), h('span', 'CSV-Datei auswählen'), file),
      out,
      h('div.form-actions', h('button.btn', { type: 'button', onclick: () => close(null) }, 'Schließen'), h('button.btn.btn-primary', { type: 'submit' }, 'Importieren')));
      file.addEventListener('change', () => { form.querySelector('.dropzone span').textContent = file.files[0] ? file.files[0].name : ''; });
      return form;
    },
  });
}

// ================================================================== FORMULAR
export async function formView(root, { res, id }, query) {
  const sp = spec(res);
  if (!sp || sp.upload) return notFoundView(root);
  if (!perm(res).write) { clear(root).appendChild(h('div.page', errorBox(new Error('Keine Berechtigung.')))); return; }
  clear(root).appendChild(h('div.page', h('div.loading')));
  let item = {};
  try {
    if (id) item = await get(`/api/r/${res}/${id}`);
  } catch (e) { clear(root).appendChild(h('div.page', errorBox(e))); return; }
  const prefill = parseHashQuery(query);
  const isNew = !id;
  const fields = sp.fields.filter((f) => !f.readonly && !f.hidden && f.type !== 'json');
  const inputs = {};

  const controls = await Promise.all(fields.map(async (f) => {
    let v = isNew ? (prefill[f.name] ?? (f.default === 'today' ? today() : f.default === 'me' ? state.me.user.id : f.default)) : item[f.name];
    if (sp.beleg && isNew && f.name === 'einleitung' && v == null) v = res === 'angebote' ? state.me.settings.texte.angebotEinleitung : res === 'rechnungen' ? state.me.settings.texte.rechnungEinleitung : '';
    let input;
    const common = { name: f.name, id: `f-${f.name}`, required: f.required };
    switch (f.type) {
      case 'text': input = h('textarea', { ...common, rows: 4, value: v ?? '' }); break;
      case 'enum': input = h('select', common, f.required ? null : h('option', { value: '' }, '—'), f.options.map((o) => h('option', { value: o, selected: String(v ?? '') === o }, o))); break;
      case 'ref': {
        const opts = await options(f.ref);
        input = h('select', common, h('option', { value: '' }, f.required ? '— bitte wählen —' : '—'), opts.map((o) => h('option', { value: o.id, selected: String(v ?? '') === String(o.id) }, o.label)));
        break;
      }
      case 'bool': input = h('input', { ...common, type: 'checkbox', checked: v === true || v === 1 || v === 'true', required: false }); break;
      case 'money': input = h('input', { ...common, type: 'number', step: '0.01', value: v ?? '', inputmode: 'decimal' }); break;
      case 'number': input = h('input', { ...common, type: 'number', step: 'any', value: v ?? '', min: f.min, max: f.max, inputmode: 'decimal' }); break;
      case 'int': case 'percent': input = h('input', { ...common, type: 'number', step: '1', value: v ?? '', min: f.min, max: f.max }); break;
      case 'date': input = h('input', { ...common, type: 'date', value: v ?? '' }); break;
      case 'datetime': input = h('input', { ...common, type: 'datetime-local', value: v ? String(v).slice(0, 16) : '' }); break;
      case 'email': input = h('input', { ...common, type: 'email', value: v ?? '', autocomplete: 'off' }); break;
      case 'url': input = h('input', { ...common, type: 'url', value: v ?? '', placeholder: 'https://' }); break;
      case 'tel': input = h('input', { ...common, type: 'tel', value: v ?? '' }); break;
      default: input = h('input', { ...common, type: 'text', value: v ?? '', maxlength: f.max || 500 });
    }
    inputs[f.name] = input;
    if (f.type === 'bool') return h('label.field.check', input, h('span', f.label));
    return h(`label.field${f.type === 'text' ? '.full' : ''}`, { for: common.id }, h('span.label', f.label, f.required ? h('b.req', ' *') : null), input);
  }));

  let posEditor = null;
  if (sp.beleg) posEditor = await positionsEditor(item.positionen || [], inputs.kunde_id);

  // Termine: Ende automatisch 1 h nach Beginn
  if (res === 'termine' && inputs.start && inputs.ende) {
    inputs.start.addEventListener('change', () => {
      if (!inputs.ende.value && inputs.start.value) {
        const d = new Date(inputs.start.value);
        d.setHours(d.getHours() + 1);
        inputs.ende.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    });
  }
  // Ausgaben: Brutto-Vorschau
  if (res === 'ausgaben') {
    const prev = h('small.hint');
    const upd = () => { prev.textContent = inputs.netto.value ? `Brutto: ${money(Number(inputs.netto.value) * (1 + Number(inputs.mwst.value || 0) / 100))}` : ''; };
    inputs.netto.addEventListener('input', upd);
    inputs.mwst.addEventListener('change', upd);
    inputs.netto.parentElement.appendChild(prev);
    upd();
  }

  const errBox = h('div');
  const submitBtn = h('button.btn.btn-primary', { type: 'submit' }, icon('check', 16), isNew ? `${sp.singular} anlegen` : 'Änderungen speichern');
  const form = h('form.card.form-card', {
    novalidate: false,
    onsubmit: async (e) => {
      e.preventDefault();
      const data = {};
      for (const f of fields) {
        const el = inputs[f.name];
        data[f.name] = f.type === 'bool' ? el.checked : el.value === '' ? null : el.value;
      }
      if (posEditor) data.positionen = posEditor.value();
      submitBtn.disabled = true;
      clear(errBox);
      try {
        const saved = isNew ? await post(`/api/r/${res}`, data) : await put(`/api/r/${res}/${id}`, data);
        invalidateOptions(res);
        toast(isNew ? `${sp.singular} angelegt` : 'Gespeichert');
        go(`#/r/${res}/${saved.id}`);
      } catch (err) {
        submitBtn.disabled = false;
        errBox.appendChild(errorBox(err));
        if (err.data && err.data.field && inputs[err.data.field]) { inputs[err.data.field].focus(); inputs[err.data.field].classList.add('invalid'); }
        errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  },
  h('div.form-grid', controls),
  posEditor ? h('div.pos-section', h('h3.card-title', 'Positionen'), posEditor.el) : null,
  errBox,
  h('div.form-actions', h('a.btn', { href: isNew ? `#/r/${res}` : `#/r/${res}/${id}` }, 'Abbrechen'), submitBtn));

  clear(root).appendChild(h('div.page',
    h('a.back', { href: isNew ? `#/r/${res}` : `#/r/${res}/${id}` }, icon('arrowLeft', 16), isNew ? sp.label : item.__title),
    pageHead(isNew ? `${sp.singular} anlegen` : `${sp.singular} bearbeiten`, isNew ? null : item.__title),
    form));
  const first = form.querySelector('input:not([type=checkbox]), select, textarea');
  if (first && isNew) first.focus();
}

async function positionsEditor(initial, kundeSelect) {
  const produkte = perm('produkte').read ? (await options('produkte')).filter((p) => p.aktiv !== false) : [];
  const klein = state.me.settings.finanzen.kleinunternehmer;
  const defMwst = klein ? 0 : state.me.settings.finanzen.mwst;
  const tbody = h('tbody');
  const totals = h('div.totals');
  const rows = [];

  const recalc = () => {
    const pos = value();
    const netto = pos.reduce((s, p) => s + p.menge * p.preis * (1 - p.rabatt / 100), 0);
    const st = steuerAufschluesselung(pos.map((p) => ({ ...p, summe: p.menge * p.preis * (1 - p.rabatt / 100) })));
    const steuer = st.reduce((s, x) => s + x.steuer, 0);
    rows.forEach((r) => { r.sum.textContent = money(Number(r.menge.value || 0) * Number(r.preis.value || 0) * (1 - Number(r.rabatt.value || 0) / 100)); });
    clear(totals).append(
      h('div', h('span', 'Netto'), h('b', money(netto))),
      ...st.map((s) => h('div', h('span', `zzgl. ${num(s.satz)} % MwSt.`), h('b', money(s.steuer)))),
      h('div.grand', h('span', 'Gesamt'), h('b', money(netto + steuer))),
      klein ? h('small.muted', 'Kleinunternehmerregelung (§ 19 UStG): keine Umsatzsteuer.') : null);
  };

  const addRow = (p = {}) => {
    const r = {};
    r.produkt = h('select', { 'aria-label': 'Produkt', onchange: () => {
      const prod = produkte.find((x) => String(x.id) === r.produkt.value);
      if (prod) {
        r.bez.value = prod.name; r.preis.value = prod.preis; r.einheit.value = prod.einheit || 'Stk';
        r.mwst.value = klein ? 0 : prod.mwst; r.beschr.value = prod.beschreibung || '';
        recalc();
      }
    } }, h('option', { value: '' }, 'Freitext'), produkte.map((o) => h('option', { value: o.id, selected: String(p.produkt_id) === String(o.id) }, o.label)));
    r.bez = h('input', { value: p.bezeichnung || '', placeholder: 'Bezeichnung', required: true, 'aria-label': 'Bezeichnung' });
    r.beschr = h('textarea', { rows: 1, value: p.beschreibung || '', placeholder: 'Beschreibung (optional)', 'aria-label': 'Beschreibung' });
    r.menge = h('input', { type: 'number', step: 'any', value: p.menge ?? 1, 'aria-label': 'Menge', oninput: recalc });
    r.einheit = h('input', { value: p.einheit || 'Stk', 'aria-label': 'Einheit', maxlength: 20 });
    r.preis = h('input', { type: 'number', step: '0.01', value: p.preis ?? 0, 'aria-label': 'Einzelpreis', oninput: recalc });
    r.rabatt = h('input', { type: 'number', step: 'any', min: 0, max: 100, value: p.rabatt ?? 0, 'aria-label': 'Rabatt %', oninput: recalc });
    r.mwst = h('select', { 'aria-label': 'MwSt.', onchange: recalc, disabled: klein }, [19, 7, 0].map((s) => h('option', { value: s, selected: Number(p.mwst ?? defMwst) === s }, `${s} %`)));
    r.sum = h('b');
    r.tr = h('tr',
      h('td', { 'data-label': 'Produkt / Leistung' }, r.produkt, r.bez, r.beschr),
      h('td', { 'data-label': 'Menge' }, r.menge),
      h('td', { 'data-label': 'Einheit' }, r.einheit),
      h('td', { 'data-label': 'Einzelpreis' }, r.preis),
      h('td', { 'data-label': 'Rabatt %' }, r.rabatt),
      h('td', { 'data-label': 'MwSt.' }, r.mwst),
      h('td.num', { 'data-label': 'Summe' }, r.sum),
      h('td', h('button.icon-btn.danger', { type: 'button', title: 'Position entfernen', onclick: () => { rows.splice(rows.indexOf(r), 1); r.tr.remove(); recalc(); } }, icon('trash', 15))));
    rows.push(r);
    tbody.appendChild(r.tr);
    recalc();
  };

  function value() {
    return rows.map((r) => ({
      produkt_id: r.produkt.value ? Number(r.produkt.value) : null, bezeichnung: r.bez.value.trim(), beschreibung: r.beschr.value.trim(),
      menge: Number(r.menge.value || 0), einheit: r.einheit.value, preis: Number(r.preis.value || 0), rabatt: Number(r.rabatt.value || 0), mwst: Number(r.mwst.value),
    })).filter((p) => p.bezeichnung);
  }

  (initial.length ? initial : [{}]).forEach(addRow);
  void kundeSelect;
  const el = h('div.pos-editor',
    h('div.table-wrap', h('table.table.pos-edit', h('thead', h('tr', h('th', 'Produkt / Leistung'), h('th', 'Menge'), h('th', 'Einheit'), h('th', 'Einzelpreis'), h('th', 'Rabatt %'), h('th', 'MwSt.'), h('th.num', 'Summe'), h('th'))), tbody)),
    h('div.pos-foot', h('button.btn.btn-sm', { type: 'button', onclick: () => addRow({}) }, icon('plus', 14), 'Position hinzufügen'), totals));
  return { el, value };
}

// ================================================================== DRUCKANSICHT
export async function printView(root, { res, id }) {
  const sp = spec(res);
  if (!sp || !sp.beleg) return notFoundView(root);
  document.body.classList.add('print-mode');
  clear(root).appendChild(h('div.loading'));
  let item;
  let kunde = null;
  try {
    item = await get(`/api/r/${res}/${id}`);
    kunde = await get(`/api/r/kunden/${item.kunde_id}`).catch(() => null);
  } catch (e) { clear(root).appendChild(errorBox(e)); return; }
  const s = state.me.settings;
  const f = s.firma;
  const pos = item.positionen || [];
  const kontakt = [f.telefon, f.email, f.website ? f.website.replace(/^https?:\/\//, '') : ''].filter(Boolean);
  const titel = { Angebot: 'Angebot', Auftrag: 'Auftragsbestätigung', Rechnung: 'Rechnung' }[item.typ] || sp.singular;
  const doc = h('article.sheet',
    h('header.sheet-head',
      h('div.sheet-brand', h('img', { src: '/img/globe-192.png', alt: '', width: 64, height: 64 }), h('div', h('div.sheet-name', f.name), f.zusatz ? h('div.sheet-zusatz', f.zusatz) : null)),
      h('div.sheet-firm', [f.strasse, [f.plz, f.ort].filter(Boolean).join(' '), ...kontakt].filter(Boolean).map((l) => h('div', l)))),
    h('div.sheet-addr',
      h('div',
        h('small.sender', [f.name, f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(' · ')),
        kunde ? [kunde.name, kunde.strasse, [kunde.plz, kunde.ort].filter(Boolean).join(' '), kunde.land && kunde.land !== 'Deutschland' ? kunde.land : null].filter(Boolean).map((l) => h('div', l)) : null),
      h('table.sheet-meta', h('tbody',
        h('tr', h('th', `${titel}s-Nr.`.replace('Auftragsbestätigungs-Nr.', 'AB-Nr.').replace('Rechnungs-Nr.', 'Rechnungs-Nr.')), h('td', item.nummer)),
        h('tr', h('th', 'Datum'), h('td', date(item.datum))),
        kunde && kunde.nummer ? h('tr', h('th', 'Kunden-Nr.'), h('td', kunde.nummer)) : null,
        item.faellig ? h('tr', h('th', item.typ === 'Angebot' ? 'Gültig bis' : item.typ === 'Rechnung' ? 'Fällig am' : 'Liefertermin'), h('td', date(item.faellig))) : null,
        kunde && kunde.ustid ? h('tr', h('th', 'USt-IdNr. Kunde'), h('td', kunde.ustid)) : null))),
    h('h1.sheet-title', `${titel} ${item.nummer}`, item.status === 'Storniert' ? h('span.storno', ' – STORNIERT') : null),
    item.betreff ? h('p.sheet-betreff', item.betreff) : null,
    h('p', 'Sehr geehrte Damen und Herren,'),
    item.einleitung ? h('p.pre', item.einleitung) : null,
    h('table.sheet-pos',
      h('thead', h('tr', h('th', 'Pos.'), h('th', 'Bezeichnung'), h('th.num', 'Menge'), h('th.num', 'Einzelpreis'), h('th.num', 'Gesamt'))),
      h('tbody', pos.map((p, i) => h('tr',
        h('td', String(i + 1)),
        h('td', h('b', p.bezeichnung), p.beschreibung ? h('div.pre.small', p.beschreibung) : null, p.rabatt ? h('div.small', `abzgl. ${num(p.rabatt)} % Rabatt`) : null),
        h('td.num', `${num(p.menge, 3)} ${p.einheit}`),
        h('td.num', money(p.preis)),
        h('td.num', money(p.summe)))))),
    h('div.sheet-totals',
      h('div', h('span', 'Nettobetrag'), h('span', money(item.netto))),
      steuerAufschluesselung(pos).map((x) => h('div', h('span', `zzgl. ${num(x.satz)} % USt. auf ${money(x.basis)}`), h('span', money(x.steuer)))),
      h('div.grand', h('span', 'Gesamtbetrag'), h('span', money(item.brutto))),
      item.typ === 'Rechnung' && item.bezahlt > 0 ? h('div', h('span', 'Bereits bezahlt'), h('span', money(item.bezahlt))) : null,
      item.typ === 'Rechnung' && item.bezahlt > 0 && item.offen > 0 ? h('div.grand', h('span', 'Noch zu zahlen'), h('span', money(item.offen))) : null),
    s.finanzen.kleinunternehmer ? h('p.small', 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.') : null,
    item.typ === 'Rechnung' && item.status !== 'Bezahlt' && item.status !== 'Storniert'
      ? h('p', `Bitte überweisen Sie den Betrag bis zum ${date(item.faellig)} unter Angabe der Rechnungsnummer ${item.nummer} auf das unten genannte Konto.`) : null,
    item.typ === 'Rechnung' && item.status === 'Bezahlt' ? h('p.paid-stamp', 'BEZAHLT – vielen Dank!') : null,
    item.notizen ? h('p.pre', item.notizen) : null,
    s.texte.fusszeile ? h('p', s.texte.fusszeile) : null,
    h('footer.sheet-foot',
      h('div', h('b', f.name), f.strasse ? h('div', f.strasse) : null, h('div', [f.plz, f.ort].filter(Boolean).join(' ')), f.geschaeftsfuehrer ? h('div', `GF: ${f.geschaeftsfuehrer}`) : null),
      h('div', f.telefon ? h('div', `Tel. ${f.telefon}`) : null, f.email ? h('div', f.email) : null, f.website ? h('div', f.website.replace(/^https?:\/\//, '')) : null),
      h('div', f.bank ? h('div', f.bank) : null, f.iban ? h('div', `IBAN ${f.iban}`) : null, f.bic ? h('div', `BIC ${f.bic}`) : null),
      h('div', f.ustid ? h('div', `USt-IdNr. ${f.ustid}`) : null, f.steuernummer ? h('div', `St.-Nr. ${f.steuernummer}`) : null, f.handelsregister ? h('div', f.handelsregister) : null),
      h('div.sheet-social', socialLinks(s.social, 14))));
  const bar = h('div.print-bar',
    h('a.btn', { href: `#/r/${res}/${id}`, onclick: () => document.body.classList.remove('print-mode') }, icon('arrowLeft', 16), 'Zurück'),
    h('span.muted.hide-sm', 'Tipp: Im Druckdialog „Als PDF speichern“ wählen.'),
    h('button.btn.btn-primary', { type: 'button', onclick: () => window.print() }, icon('printer', 16), 'Drucken / PDF'));
  document.title = `${titel} ${item.nummer} – ${f.name}`;
  clear(root).append(bar, doc);
}
