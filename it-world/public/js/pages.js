// IT - World – Spezialseiten: Dashboard, Kalender, Berichte, Einstellungen, Benutzer, Aktivitäten, Postausgang, Profil.
import {
  h, clear, icon, get, post, put, del, qs, money, moneyShort, num, date, datetime, relTime, badge, toast, errToast,
  confirmDialog, formDialog, modal, state, today, downloadUrl, socialLinks, SOCIAL_LABELS,
} from './core.js';
import { barChart, hBars, ring, sparkline, monthLabel } from './charts.js';
import { spec, perm, pageHead, errorBox, emptyState, go } from './generic.js';

const greet = () => {
  const hr = new Date().getHours();
  return hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Guten Tag' : 'Guten Abend';
};

function kpi({ label, value, iconName, sub, tone, href, spark }) {
  const inner = [
    h('div.kpi-top', h('span.kpi-icon', icon(iconName, 20)), h('span.kpi-label', label)),
    h('div.kpi-value', value),
    sub ? h(`div.kpi-sub${tone ? `.text-${tone}` : ''}`, sub) : null,
    spark ? h('div.kpi-spark', sparkline(spark)) : null,
  ];
  return href ? h('a.kpi.card', { href }, inner) : h('div.kpi.card', inner);
}

// ================================================================== DASHBOARD
export async function dashboardView(root) {
  clear(root).appendChild(h('div.page', h('div.loading')));
  let d;
  try { d = await get('/api/dashboard'); } catch (e) { clear(root).appendChild(h('div.page', errorBox(e))); return; }
  const k = d.kpi;
  const cards = [];
  if (k.umsatzMonat !== undefined) {
    const diff = k.umsatzVormonat ? Math.round(((k.umsatzMonat - k.umsatzVormonat) / k.umsatzVormonat) * 100) : null;
    cards.push(kpi({ label: 'Umsatz diesen Monat', value: money(k.umsatzMonat), iconName: 'trending', sub: diff === null ? `Jahr: ${moneyShort(k.umsatzJahr)}` : `${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff)} % ggü. Vormonat · Jahr ${moneyShort(k.umsatzJahr)}`, tone: diff === null ? null : diff >= 0 ? 'ok' : 'bad', href: '#/berichte', spark: d.verlauf.map((x) => x.umsatz) }));
    cards.push(kpi({ label: 'Offene Forderungen', value: money(k.offenSumme), iconName: 'receipt', sub: k.ueberfaelligAnzahl ? `${k.ueberfaelligAnzahl} überfällig · ${money(k.ueberfaelligSumme)}` : `${k.offenAnzahl} offene Rechnungen`, tone: k.ueberfaelligAnzahl ? 'bad' : null, href: k.ueberfaelligAnzahl ? '#/r/rechnungen?ueberfaellig=true' : '#/r/rechnungen?f_status=Offen' }));
  }
  if (k.pipelineSumme !== undefined) cards.push(kpi({ label: 'Pipeline (gewichtet)', value: money(k.pipelineGewichtet), iconName: 'target', sub: `Gesamt ${moneyShort(k.pipelineSumme)}${k.gewinnquote !== null ? ` · Gewinnquote ${k.gewinnquote} %` : ''}`, href: '#/r/deals?ansicht=board' }));
  if (k.kundenAktiv !== undefined) cards.push(kpi({ label: 'Aktive Kunden', value: num(k.kundenAktiv, 0), iconName: 'building', sub: `${k.neueLeads} neue Leads (30 Tage)`, tone: k.neueLeads ? 'gold' : null, href: '#/r/kunden?f_status=Aktiv' }));
  if (k.ticketsOffen !== undefined) cards.push(kpi({ label: 'Offene Tickets', value: num(k.ticketsOffen, 0), iconName: 'lifebuoy', sub: k.ticketsKritisch ? `${k.ticketsKritisch} mit hoher Priorität` : 'alles im grünen Bereich', tone: k.ticketsKritisch ? 'bad' : 'ok', href: '#/r/tickets?ansicht=board' }));
  if (k.aufgabenOffen !== undefined) cards.push(kpi({ label: 'Meine offenen Aufgaben', value: num(k.aufgabenOffen, 0), iconName: 'check', href: `#/r/aufgaben?ansicht=board&f_zustaendig_id=${state.me.user.id}` }));

  const grid = h('div.dash-grid');
  if (d.verlauf) {
    const series = [{ name: 'Umsatz (netto)', values: d.verlauf.map((x) => x.umsatz), cls: 'gold' }];
    if (d.verlauf[0].ausgaben !== null) series.push({ name: 'Ausgaben (netto)', values: d.verlauf.map((x) => x.ausgaben), cls: 'grey' });
    series.push({ name: 'Zahlungseingang', values: d.verlauf.map((x) => x.eingang), cls: 'line-gold', type: 'line' });
    grid.appendChild(h('div.card.span-2', h('div.card-head', h('h3.card-title', icon('chart', 16), 'Umsatzentwicklung – 12 Monate'), h('a.btn.btn-sm.btn-ghost', { href: '#/berichte' }, 'Berichte')),
      barChart({ labels: d.verlauf.map((x) => monthLabel(x.monat)), series })));
  }
  if (d.pipeline) {
    grid.appendChild(h('div.card', h('div.card-head', h('h3.card-title', icon('target', 16), 'Vertriebs-Pipeline'), h('a.btn.btn-sm.btn-ghost', { href: '#/r/deals?ansicht=board' }, 'Board')),
      hBars(d.pipeline.map((p) => ({ label: p.phase, value: p.summe, sub: `${p.anzahl}×` }))),
      k.gewinnquote !== null ? h('div.ring-row', ring(k.gewinnquote, 'Gewinnquote')) : null));
  }
  if (d.aufgaben) {
    grid.appendChild(h('div.card', h('div.card-head', h('h3.card-title', icon('check', 16), 'Meine Aufgaben'), h('a.btn.btn-sm.btn-ghost', { href: '#/r/aufgaben/neu' }, icon('plus', 14))),
      d.aufgaben.length ? h('ul.list', d.aufgaben.map((a) => h('li', h('a', { href: `#/r/aufgaben/${a.id}` },
        h('div', h('b', a.titel), h('small.muted.block', [a.projekt, a.faellig ? `fällig ${date(a.faellig)}` : null].filter(Boolean).join(' · '))),
        h('div.list-end', badge(a.prioritaet), a.faellig && a.faellig < today() ? badge('Überfällig') : null))))) : h('p.muted.pad', 'Keine offenen Aufgaben – stark!')));
  }
  if (d.ueberfaellig) {
    grid.appendChild(h('div.card', h('div.card-head', h('h3.card-title', icon('alert', 16), 'Überfällige Rechnungen'), h('a.btn.btn-sm.btn-ghost', { href: '#/r/rechnungen?ueberfaellig=true' }, 'Alle')),
      d.ueberfaellig.length ? h('ul.list', d.ueberfaellig.map((r) => h('li', h('a', { href: `#/r/rechnungen/${r.id}` },
        h('div', h('b', r.nummer), h('small.muted.block', r.kunde)), h('div.list-end', h('b.text-bad', money(r.offen)), h('small.muted.block', `seit ${date(r.faellig)}`)))))) : h('p.muted.pad', 'Keine überfälligen Rechnungen.')));
  }
  if (d.termine) {
    grid.appendChild(h('div.card', h('div.card-head', h('h3.card-title', icon('calendar', 16), 'Nächste Termine'), h('a.btn.btn-sm.btn-ghost', { href: '#/kalender' }, 'Kalender')),
      d.termine.length ? h('ul.list', d.termine.map((t) => h('li', h('a', { href: `#/r/termine/${t.id}` },
        h('div.date-chip', h('b', t.start.slice(8, 10)), h('small', ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][Number(t.start.slice(5, 7)) - 1])),
        h('div.grow', h('b', t.titel), h('small.muted.block', `${t.start.slice(11, 16)} Uhr${t.ort ? ` · ${t.ort}` : ''}`)), badge(t.typ, 'muted'))))) : h('p.muted.pad', 'Keine anstehenden Termine.')));
  }
  if (d.projekte) {
    grid.appendChild(h('div.card', h('div.card-head', h('h3.card-title', icon('folder', 16), 'Laufende Projekte'), h('a.btn.btn-sm.btn-ghost', { href: '#/r/projekte' }, 'Alle')),
      d.projekte.length ? h('ul.list', d.projekte.map((p) => h('li', h('a', { href: `#/r/projekte/${p.id}` },
        h('div.grow', h('b', p.name), h('small.muted.block', `${p.nummer}${p.ende ? ` · Deadline ${date(p.ende)}` : ''}`), h('span.pct-bar.wide', h('i', { style: { width: `${p.fortschritt || 0}%` } }))),
        h('b.gold-text', `${p.fortschritt || 0} %`))))) : h('p.muted.pad', 'Keine laufenden Projekte.')));
  }
  if (d.topKunden) {
    grid.appendChild(h('div.card', h('div.card-head', h('h3.card-title', icon('building', 16), `Top-Kunden ${today().slice(0, 4)}`)),
      d.topKunden.length ? hBars(d.topKunden.map((x) => ({ label: x.name, value: x.umsatz }))) : h('p.muted.pad', 'Noch keine Umsätze in diesem Jahr.')));
  }
  if (d.lagerwarnungen && d.lagerwarnungen.length) {
    grid.appendChild(h('div.card', h('div.card-head', h('h3.card-title', icon('box', 16), 'Lagerwarnungen')),
      h('ul.list', d.lagerwarnungen.map((p) => h('li', h('a', { href: `#/r/produkte/${p.id}` },
        h('div', h('b', p.name), h('small.muted.block', p.sku)), h('div.list-end', h('b.text-bad', `${p.bestand ?? 0} Stk`), h('small.muted.block', `min. ${p.mindestbestand}`))))))));
  }
  grid.appendChild(h('div.card', h('div.card-head', h('h3.card-title', icon('activity', 16), 'Letzte Aktivitäten'), ['admin', 'manager'].includes(state.me.user.rolle) ? h('a.btn.btn-sm.btn-ghost', { href: '#/aktivitaeten' }, 'Alle') : null),
    d.aktivitaeten.length ? h('ul.timeline', d.aktivitaeten.map((a) => h('li',
      h('div.tl-head', h('b', a.user_name || 'System'), h('small.muted', relTime(a.created_at))),
      h('p', `${a.aktion}: `, a.resource && spec(a.resource) && a.aktion !== 'gelöscht' ? h('a', { href: `#/r/${a.resource}/${a.record_id}` }, a.titel || '') : (a.titel || '')))))
      : h('p.muted.pad', 'Noch keine Aktivitäten.')));

  const quick = [['kunden', 'Kunde'], ['deals', 'Verkaufschance'], ['angebote', 'Angebot'], ['rechnungen', 'Rechnung'], ['aufgaben', 'Aufgabe'], ['tickets', 'Ticket'], ['zeiten', 'Zeit erfassen']]
    .filter(([r]) => perm(r).write).map(([r, l]) => h('a.quick', { href: `#/r/${r}/neu` }, icon(spec(r).icon, 18), h('span', l)));

  clear(root).appendChild(h('div.page',
    h('div.hero.card',
      h('div.hero-text', h('p.eyebrow', new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
        h('h1', `${greet()}, ${state.me.user.name.split(' ')[0]}`), h('p.sub', `Willkommen im Business-Cockpit von ${state.me.settings.firma.name}.`)),
      quick.length ? h('div.quick-row', quick) : null),
    h('div.kpi-grid', cards), grid));
}

// ================================================================== KALENDER
export async function calendarView(root, _params, query) {
  const monthParam = query.get('monat');
  const base = /^\d{4}-\d{2}$/.test(monthParam || '') ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  base.setDate(1);
  const y = base.getFullYear();
  const m = base.getMonth();
  const start = new Date(y, m, 1 - ((new Date(y, m, 1).getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const ym = (d) => iso(d).slice(0, 7);
  clear(root).appendChild(h('div.page', h('div.loading')));
  let data;
  try { data = await get(`/api/kalender${qs({ von: iso(days[0]), bis: iso(days[41]) })}`); } catch (e) { clear(root).appendChild(h('div.page', errorBox(e))); return; }
  const byDay = new Map();
  for (const ev of data.termine) { if (!byDay.has(ev.datum)) byDay.set(ev.datum, []); byDay.get(ev.datum).push(ev); }
  const prev = new Date(y, m - 1, 1);
  const next = new Date(y, m + 1, 1);
  const title = base.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const legend = [['termin', 'Termin'], ['aufgabe', 'Aufgabe'], ['rechnung', 'Rechnung fällig'], ['projekt', 'Projekt-Deadline'], ['deal', 'Abschluss']];
  const cal = h('div.calendar',
    ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => h('div.cal-dow', d)),
    days.map((d) => {
      const key = iso(d);
      const evs = (byDay.get(key) || []).sort((a, b) => (a.zeit || '99').localeCompare(b.zeit || '99'));
      return h('div.cal-day', { class: [d.getMonth() !== m ? 'other' : '', key === today() ? 'today' : ''].join(' '), ondblclick: () => perm('termine').write && go(`#/r/termine/neu?start=${key}T09:00`) },
        h('div.cal-num', String(d.getDate())),
        evs.slice(0, 4).map((ev) => h(`a.cal-ev.ev-${ev.art}`, { href: `#/r/${ev.res}/${ev.id}`, title: `${ev.titel}${ev.info ? ` · ${ev.info}` : ''}` }, ev.zeit ? h('b', `${ev.zeit} `) : null, ev.titel)),
        evs.length > 4 ? h('small.muted', `+${evs.length - 4} weitere`) : null);
    }));
  const agenda = data.termine.filter((e) => e.datum >= today()).sort((a, b) => (a.datum + (a.zeit || '')).localeCompare(b.datum + (b.zeit || ''))).slice(0, 15);
  clear(root).appendChild(h('div.page',
    pageHead('Kalender', 'Termine, Fälligkeiten und Deadlines auf einen Blick',
      h('a.btn', { href: `#/kalender?monat=${ym(prev)}` }, icon('arrowLeft', 16)),
      h('a.btn', { href: '#/kalender' }, 'Heute'),
      h('a.btn', { href: `#/kalender?monat=${ym(next)}` }, icon('arrowRight', 16)),
      perm('termine').write ? h('a.btn.btn-primary', { href: '#/r/termine/neu' }, icon('plus', 16), h('span', 'Termin')) : null),
    h('div.cal-head', h('h2', title), h('div.legend', legend.map(([k, l]) => h('span', h(`i.sw.ev-${k}`), l)))),
    h('div.card.cal-card', cal),
    h('div.card', h('h3.card-title', 'Agenda'), agenda.length ? h('ul.list', agenda.map((ev) => h('li', h('a', { href: `#/r/${ev.res}/${ev.id}` },
      h('div.date-chip', h('b', ev.datum.slice(8, 10)), h('small', ev.datum.slice(5, 7))), h('div.grow', h('b', ev.titel), h('small.muted.block', [ev.zeit ? `${ev.zeit} Uhr` : null, ev.info].filter(Boolean).join(' · '))), h(`i.sw.ev-${ev.art}`))))) : h('p.muted.pad', 'Keine anstehenden Einträge in diesem Zeitraum.'))));
}

// ================================================================== BERICHTE
export async function reportsView(root, _p, query) {
  clear(root).appendChild(h('div.page', h('div.loading')));
  let d;
  try { d = await get(`/api/berichte${qs({ jahr: query.get('jahr') })}`); } catch (e) { clear(root).appendChild(h('div.page', errorBox(e))); return; }
  const sum = (k) => d.monate.reduce((s, x) => s + x[k], 0);
  const csv = (name, headers, rows) => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const text = `﻿${[headers, ...rows].map((r) => r.map((v) => (typeof v === 'number' ? String(v).replace('.', ',') : esc(v))).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = h('a', { href: url, download: `${name}-${d.jahr}.csv` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const hasAus = d.kategorien !== null;
  const monthsTable = h('div.table-wrap', h('table.table.compact',
    h('thead', h('tr', h('th', 'Monat'), h('th.num', 'Umsatz netto'), h('th.num', 'Zahlungseingang'), hasAus ? h('th.num', 'Ausgaben netto') : null, hasAus ? h('th.num', 'Ergebnis') : null, h('th.num', 'USt.'), hasAus ? h('th.num', 'Vorsteuer') : null, hasAus ? h('th.num', 'Zahllast') : null)),
    h('tbody', d.monate.map((x) => h('tr', h('td', { 'data-label': 'Monat' }, monthLabel(x.monat)), h('td.num', { 'data-label': 'Umsatz' }, money(x.umsatz)), h('td.num', { 'data-label': 'Eingang' }, money(x.eingang)),
      hasAus ? h('td.num', { 'data-label': 'Ausgaben' }, money(x.ausgaben)) : null, hasAus ? h('td.num', { 'data-label': 'Ergebnis', class: x.ergebnis < 0 ? 'text-bad' : 'text-ok' }, money(x.ergebnis)) : null,
      h('td.num', { 'data-label': 'USt.' }, money(x.ust)), hasAus ? h('td.num', { 'data-label': 'Vorsteuer' }, money(x.vorsteuer)) : null, hasAus ? h('td.num', { 'data-label': 'Zahllast' }, money(x.zahllast)) : null))),
    h('tfoot', h('tr', h('th', 'Summe'), h('th.num', money(sum('umsatz'))), h('th.num', money(sum('eingang'))), hasAus ? h('th.num', money(sum('ausgaben'))) : null, hasAus ? h('th.num', money(sum('ergebnis'))) : null, h('th.num', money(sum('ust'))), hasAus ? h('th.num', money(sum('vorsteuer'))) : null, hasAus ? h('th.num', money(sum('zahllast'))) : null))));
  const series = [{ name: 'Umsatz', values: d.monate.map((x) => x.umsatz), cls: 'gold' }];
  const bisMonat = d.jahr === today().slice(0, 4) ? today().slice(0, 7) : '9999';
  const monateBisher = d.monate.filter((x) => x.monat <= bisMonat);
  if (hasAus) series.push({ name: 'Ausgaben', values: d.monate.map((x) => x.ausgaben), cls: 'grey' }, { name: 'Ergebnis', values: monateBisher.map((x) => x.ergebnis), cls: 'line-gold', type: 'line' });

  clear(root).appendChild(h('div.page',
    pageHead('Berichte & Auswertungen', `Geschäftsjahr ${d.jahr}`,
      h('select.filter', { 'aria-label': 'Jahr', onchange: (e) => go(`#/berichte?jahr=${e.target.value}`) }, d.jahre.map((j) => h('option', { selected: j === d.jahr }, j))),
      h('button.btn', { type: 'button', onclick: () => csv('monatsbericht', ['Monat', 'Umsatz netto', 'Zahlungseingang', 'Ausgaben netto', 'Ergebnis', 'USt', 'Vorsteuer', 'Zahllast'], d.monate.map((x) => [x.monat, x.umsatz, x.eingang, x.ausgaben, x.ergebnis, x.ust, x.vorsteuer, x.zahllast])) }, icon('download', 16), h('span', 'CSV'))),
    h('div.kpi-grid',
      kpi({ label: 'Umsatz netto', value: money(sum('umsatz')), iconName: 'trending' }),
      kpi({ label: 'Zahlungseingang', value: money(sum('eingang')), iconName: 'euro' }),
      hasAus ? kpi({ label: 'Ausgaben netto', value: money(sum('ausgaben')), iconName: 'wallet' }) : null,
      hasAus ? kpi({ label: 'Ergebnis (vereinfacht)', value: money(sum('ergebnis')), iconName: 'chart', tone: sum('ergebnis') >= 0 ? 'ok' : 'bad', sub: sum('umsatz') ? `Marge ${Math.round((sum('ergebnis') / sum('umsatz')) * 100)} %` : null }) : null),
    h('div.card', h('h3.card-title', icon('chart', 16), 'Monatsverlauf'), barChart({ labels: d.monate.map((x) => monthLabel(x.monat).split(' ')[0]), series })),
    h('div.card', h('h3.card-title', 'Monatsübersicht & Umsatzsteuer'), monthsTable, h('p.muted.small', 'Hinweis: Vereinfachte Auswertung nach Rechnungsdatum (Soll-Versteuerung). Ersetzt keine Steuerberatung.')),
    h('div.dash-grid',
      h('div.card', h('h3.card-title', icon('building', 16), 'Umsatz nach Kunden'), d.kunden.length ? hBars(d.kunden.slice(0, 10).map((x) => ({ label: x.name, value: x.umsatz, sub: x.offen > 0 ? `offen ${money(x.offen)}` : '' }))) : h('p.muted.pad', 'Keine Daten.')),
      h('div.card', h('h3.card-title', icon('box', 16), 'Umsatz nach Produkten / Leistungen'), d.produkte.length ? hBars(d.produkte.slice(0, 10).map((x) => ({ label: x.bezeichnung, value: x.umsatz, sub: `${num(x.menge)}×` }))) : h('p.muted.pad', 'Keine Daten.')),
      hasAus ? h('div.card', h('h3.card-title', icon('wallet', 16), 'Ausgaben nach Kategorie'), d.kategorien.length ? hBars(d.kategorien.map((x) => ({ label: x.kategorie, value: x.netto, sub: `${x.anzahl}×` })), { cls: 'grey' }) : h('p.muted.pad', 'Keine Daten.')) : null,
      d.zeiten ? h('div.card', h('h3.card-title', icon('clock', 16), 'Stunden nach Projekt'), d.zeiten.length ? hBars(d.zeiten.map((x) => ({ label: x.name ? `${x.nummer} ${x.name}` : 'Ohne Projekt', value: x.stunden, sub: x.offen ? `${num(x.offen)} h offen` : '' })), { format: (v) => `${num(v)} h` }) : h('p.muted.pad', 'Keine Daten.')) : null)));
}

// ================================================================== EINSTELLUNGEN
export async function settingsView(root, _p, query) {
  clear(root).appendChild(h('div.page', h('div.loading')));
  let data;
  try { data = await get('/api/einstellungen'); } catch (e) { clear(root).appendChild(h('div.page', errorBox(e))); return; }
  const s = data.settings;
  const isAdmin = state.me.user.rolle === 'admin';
  const tab = query.get('tab') || 'firma';
  const tabs = [['firma', 'Unternehmen', 'building'], ['finanzen', 'Finanzen & Belege', 'euro'], ['module', 'Module', 'puzzle'], ['social', 'Social Media', 'share'], ['formular', 'Formular & Autoresponder', 'mail'], ['system', 'System & Daten', 'database']];
  const save = async (patch) => {
    try {
      const r = await put('/api/einstellungen', patch);
      state.me.settings = r.settings;
      toast('Einstellungen gespeichert');
      window.dispatchEvent(new CustomEvent('itw:settings'));
    } catch (e) { errToast(e); }
  };
  const section = (fields, group, extra) => {
    const form = h('form.form-grid', {
      onsubmit: (e) => {
        e.preventDefault();
        const patch = {};
        for (const f of fields) {
          const el = form.elements[f.name];
          patch[f.name] = f.type === 'checkbox' ? el.checked : f.type === 'number' ? Number(el.value) : el.value;
        }
        save({ [group]: patch });
      },
    },
    fields.map((f) => {
      const v = s[group][f.name];
      if (f.type === 'checkbox') return h('label.field.check.full', h('input', { type: 'checkbox', name: f.name, checked: !!v, disabled: !isAdmin }), h('span', f.label), f.hint ? h('small.hint.block', f.hint) : null);
      const input = f.type === 'textarea' ? h('textarea', { name: f.name, rows: f.rows || 4, value: v ?? '', disabled: !isAdmin }) : h('input', { name: f.name, type: f.type || 'text', value: v ?? '', step: f.step, disabled: !isAdmin, placeholder: f.placeholder });
      return h(`label.field${f.full || f.type === 'textarea' ? '.full' : ''}`, h('span.label', f.label), input, f.hint ? h('small.hint', f.hint) : null);
    }),
    extra || null,
    isAdmin ? h('div.full.form-actions', h('button.btn.btn-primary', { type: 'submit' }, icon('check', 16), 'Speichern')) : h('p.full.muted', 'Nur Administratoren können Einstellungen ändern.'));
    return form;
  };

  let content;
  if (tab === 'firma') {
    content = section([
      { name: 'name', label: 'Firmenname' }, { name: 'zusatz', label: 'Slogan / Zusatz' },
      { name: 'strasse', label: 'Straße & Nr.' }, { name: 'plz', label: 'PLZ' }, { name: 'ort', label: 'Ort' }, { name: 'land', label: 'Land' },
      { name: 'telefon', label: 'Telefon', type: 'tel' }, { name: 'email', label: 'E-Mail (auch für Benachrichtigungen)', type: 'email' },
      { name: 'website', label: 'Website', type: 'url' }, { name: 'geschaeftsfuehrer', label: 'Geschäftsführung' },
      { name: 'ustid', label: 'USt-IdNr.' }, { name: 'steuernummer', label: 'Steuernummer' }, { name: 'handelsregister', label: 'Handelsregister', full: true },
      { name: 'bank', label: 'Bank' }, { name: 'iban', label: 'IBAN' }, { name: 'bic', label: 'BIC' },
    ], 'firma');
  } else if (tab === 'finanzen') {
    content = h('div',
      section([
        { name: 'waehrung', label: 'Währung (ISO-Code)', placeholder: 'EUR' },
        { name: 'mwst', label: 'Standard-MwSt.-Satz %', type: 'number', step: '0.1' },
        { name: 'zahlungsziel', label: 'Standard-Zahlungsziel (Tage)', type: 'number' },
        { name: 'angebotGueltig', label: 'Angebote gültig (Tage)', type: 'number' },
        { name: 'kleinunternehmer', label: 'Kleinunternehmerregelung nach § 19 UStG (keine Umsatzsteuer ausweisen)', type: 'checkbox' },
      ], 'finanzen'),
      h('hr'),
      section([
        { name: 'angebotEinleitung', label: 'Einleitungstext Angebote', type: 'textarea', rows: 3 },
        { name: 'rechnungEinleitung', label: 'Einleitungstext Rechnungen', type: 'textarea', rows: 3 },
        { name: 'fusszeile', label: 'Schlusssatz auf Belegen', type: 'textarea', rows: 2 },
      ], 'texte'));
  } else if (tab === 'module') {
    const form = h('form.module-grid', {
      onsubmit: (e) => {
        e.preventDefault();
        const patch = {};
        for (const m of state.me.meta.modules) patch[m.key] = form.elements[m.key].checked;
        save({ module: patch });
      },
    },
    h('p.muted', 'Aktivieren Sie nur die Erweiterungen, die Ihr Unternehmen benötigt. Deaktivierte Module werden in Navigation und API ausgeblendet – die Daten bleiben erhalten.'),
    state.me.meta.modules.map((m) => h('label.module-card', h('input', { type: 'checkbox', name: m.key, checked: s.module[m.key] !== false, disabled: !isAdmin }), h('span.switch'), h('span', m.label))),
    isAdmin ? h('div.form-actions', h('button.btn.btn-primary', { type: 'submit' }, icon('check', 16), 'Speichern')) : null);
    content = form;
  } else if (tab === 'social') {
    content = section(Object.keys(s.social).map((k) => ({ name: k, label: SOCIAL_LABELS[k] || k, type: 'url', placeholder: 'https://…' })), 'social',
      h('div.full', h('p.muted', 'Die Symbole erscheinen in der Seitenleiste, auf dem Anmeldebildschirm, im öffentlichen Formular und auf Ihren Belegen.'), socialLinks(s.social, 22)));
  } else if (tab === 'formular') {
    const url = `${location.origin}/form/${data.slug}`;
    const embed = `<iframe src="${url}" width="100%" height="760" style="border:0" title="Kontaktformular"></iframe>`;
    const copy = (text) => navigator.clipboard.writeText(text).then(() => toast('Kopiert'), () => toast('Kopieren nicht möglich', 'bad'));
    content = h('div',
      h('div.info-box', icon('globe', 20), h('div',
        h('b', 'Öffentliches Anfrage- und Anmeldeformular'),
        h('p', 'Neue Anfragen landen automatisch als Lead (Kunde + Kontakt + Verkaufschance) im CRM. Der Autoresponder bestätigt den Eingang per E-Mail.'),
        h('div.copy-row', h('input', { value: url, readOnly: true, 'aria-label': 'Formular-Link' }), h('button.btn.btn-sm', { type: 'button', onclick: () => copy(url) }, 'Link kopieren'), h('a.btn.btn-sm', { href: url, target: '_blank', rel: 'noopener' }, icon('eye', 14), 'Öffnen')),
        h('div.copy-row', h('input', { value: embed, readOnly: true, 'aria-label': 'Einbettungscode' }), h('button.btn.btn-sm', { type: 'button', onclick: () => copy(embed) }, 'Einbettungscode kopieren')),
        h('small.muted', 'Hinweis: Zum Einbetten auf einer fremden Domain muss der Server das Framing erlauben (siehe README, Umgebungsvariable FRAME_ANCESTORS).'))),
      section([
        { name: 'aktiv', label: 'Autoresponder aktiv (automatische Eingangsbestätigung an den Absender)', type: 'checkbox' },
        { name: 'benachrichtigung', label: 'Bei neuen Anfragen Benachrichtigung an die Firmen-E-Mail senden', type: 'checkbox' },
        { name: 'betreff', label: 'Betreff', full: true, hint: 'Platzhalter: {{name}}, {{firma}}' },
        { name: 'text', label: 'Nachricht', type: 'textarea', rows: 8 },
      ], 'autoresponder'));
  } else {
    content = h('div.system-grid',
      h('div.info-box', icon('mail', 20), h('div', h('b', 'E-Mail-Versand (SMTP)'),
        h('p', data.smtp ? 'SMTP ist konfiguriert – E-Mails werden tatsächlich versendet.' : 'Kein SMTP-Server konfiguriert. E-Mails werden im Postausgang protokolliert, aber nicht versendet.'),
        h('small.muted', 'Konfiguration über Umgebungsvariablen: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE.'),
        h('div', h('a.btn.btn-sm', { href: '#/postausgang' }, 'Postausgang öffnen')))),
      h('div.info-box', icon('database', 20), h('div', h('b', 'Datensicherung'),
        h('p', 'Exportiert alle Daten Ihres Mandanten (ohne Passwörter und Dateien) als JSON-Datei.'),
        isAdmin ? h('button.btn.btn-sm.btn-primary', { type: 'button', onclick: () => downloadUrl('/api/backup') }, icon('download', 14), 'Backup herunterladen') : null)),
      h('div.info-box', icon('shield', 20), h('div', h('b', 'Sicherheit'),
        h('p', 'Passwörter werden mit scrypt gehasht, Sitzungen sind HttpOnly-Cookies (SameSite=Strict), alle Daten sind strikt nach Mandant getrennt, Anmeldeversuche werden gedrosselt.'),
        h('a.btn.btn-sm', { href: '#/benutzer' }, 'Benutzer & Rollen verwalten'))),
      h('div.info-box', icon('globe', 20), h('div', h('b', 'Mandant'), h('p', `Kennung: ${data.slug}`), h('small.muted', 'IT - World ist mandantenfähig: Jede registrierte Firma arbeitet in ihrem eigenen, vollständig getrennten Datenbereich.'))));
  }

  clear(root).appendChild(h('div.page',
    pageHead('Einstellungen', state.me.settings.firma.name),
    h('div.settings-layout',
      h('nav.settings-nav', tabs.map(([k, l, i]) => h(`a${tab === k ? '.on' : ''}`, { href: `#/einstellungen?tab=${k}` }, icon(i, 16), l))),
      h('div.card', h('h3.card-title', tabs.find((t) => t[0] === tab)[1]), content))));
}

// ================================================================== BENUTZER
export async function usersView(root) {
  clear(root).appendChild(h('div.page', h('div.loading')));
  let users;
  try { users = await get('/api/benutzer'); } catch (e) { clear(root).appendChild(h('div.page', errorBox(e))); return; }
  const { roles, roleLabels } = state.me.meta;
  const reload = () => usersView(root);
  const edit = async (u) => {
    const v = await formDialog(u ? `Benutzer bearbeiten: ${u.name}` : 'Neuen Benutzer anlegen', [
      { name: 'name', label: 'Name', value: u?.name, required: true },
      { name: 'email', label: 'E-Mail', type: 'email', value: u?.email, required: true },
      { name: 'rolle', label: 'Rolle', type: 'select', options: roles.map((r) => [r, roleLabels[r]]), value: u?.rolle || 'mitarbeiter' },
      { name: 'passwort', label: u ? 'Neues Passwort (optional)' : 'Start-Passwort', type: 'password', required: !u, autocomplete: 'new-password', hint: 'Mind. 8 Zeichen mit Buchstaben und Ziffern. Muss bei der ersten Anmeldung geändert werden.' },
      { name: 'aktiv', label: 'Konto aktiv', type: 'checkbox', value: u ? u.aktiv : true },
    ], { ok: u ? 'Speichern' : 'Anlegen' });
    if (!v) return;
    if (u && !v.passwort) delete v.passwort;
    try { u ? await put(`/api/benutzer/${u.id}`, v) : await post('/api/benutzer', v); toast('Gespeichert'); reload(); } catch (e) { errToast(e); }
  };
  clear(root).appendChild(h('div.page',
    pageHead('Benutzer & Rollen', `${users.length} Benutzer`, h('button.btn.btn-primary', { type: 'button', onclick: () => edit(null) }, icon('plus', 16), 'Benutzer')),
    h('div.role-info', roles.map((r) => h('div.card.role-card', badge(roleLabels[r], r === 'admin' ? 'gold' : r === 'manager' ? 'info' : 'muted'),
      h('small.muted', { admin: 'Vollzugriff inkl. Benutzer, Einstellungen & Backup', manager: 'Alle Geschäftsdaten inkl. Finanzen & Personal', mitarbeiter: 'CRM, Projekte, Tickets, Zeiten – ohne Finanzen/Personal bearbeiten', lesezugriff: 'Nur Ansicht, keine Änderungen' }[r])))),
    h('div.card', h('div.table-wrap', h('table.table',
      h('thead', h('tr', h('th', 'Name'), h('th', 'E-Mail'), h('th', 'Rolle'), h('th', 'Status'), h('th', 'Letzte Anmeldung'), h('th'))),
      h('tbody', users.map((u) => h('tr',
        h('td', { 'data-label': 'Name' }, h('span.avatar-sm', u.name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()), u.name, u.id === state.me.user.id ? h('small.muted', ' (Sie)') : null),
        h('td', { 'data-label': 'E-Mail' }, u.email),
        h('td', { 'data-label': 'Rolle' }, badge(roleLabels[u.rolle], u.rolle === 'admin' ? 'gold' : u.rolle === 'manager' ? 'info' : 'muted')),
        h('td', { 'data-label': 'Status' }, u.aktiv ? badge('Aktiv') : badge('Inaktiv'), u.muss_passwort_aendern ? h('small.muted.block', 'Passwortwechsel ausstehend') : null),
        h('td', { 'data-label': 'Letzte Anmeldung' }, u.letzter_login ? relTime(u.letzter_login) : h('span.muted', 'nie')),
        h('td.actions', h('button.icon-btn', { type: 'button', title: 'Bearbeiten', onclick: () => edit(u) }, icon('edit', 16)),
          u.id !== state.me.user.id ? h('button.icon-btn.danger', { type: 'button', title: 'Löschen', onclick: async () => {
            if (!(await confirmDialog(`Benutzer ${u.name} endgültig löschen?`, { ok: 'Löschen', danger: true }))) return;
            try { await del(`/api/benutzer/${u.id}`); toast('Benutzer gelöscht'); reload(); } catch (e) { errToast(e); }
          } }, icon('trash', 16)) : null)))))))));
}

// ================================================================== AKTIVITÄTEN
export async function activityView(root, _p, query) {
  const page = Number(query.get('page')) || 1;
  const q = query.get('q') || '';
  clear(root).appendChild(h('div.page', h('div.loading')));
  let d;
  try { d = await get(`/api/aktivitaeten${qs({ page, q })}`); } catch (e) { clear(root).appendChild(h('div.page', errorBox(e))); return; }
  const pages = Math.max(Math.ceil(d.total / d.limit), 1);
  const input = h('input.search-input', { type: 'search', value: q, placeholder: 'Protokoll durchsuchen …', onkeydown: (e) => { if (e.key === 'Enter') go(`#/aktivitaeten${qs({ q: e.target.value })}`); } });
  clear(root).appendChild(h('div.page',
    pageHead('Aktivitätsprotokoll', `${d.total} Einträge – revisionssichere Nachverfolgung aller Änderungen`),
    h('div.toolbar', h('div.search-box', icon('search', 16), input)),
    h('div.card', h('div.table-wrap', h('table.table.compact',
      h('thead', h('tr', h('th', 'Zeitpunkt'), h('th', 'Benutzer'), h('th', 'Aktion'), h('th', 'Bereich'), h('th', 'Datensatz'), h('th', 'Details'))),
      h('tbody', d.items.map((a) => h('tr',
        h('td', { 'data-label': 'Zeitpunkt' }, datetime(`${a.created_at.replace(' ', 'T')}`)),
        h('td', { 'data-label': 'Benutzer' }, a.user_name || 'System'),
        h('td', { 'data-label': 'Aktion' }, a.aktion),
        h('td', { 'data-label': 'Bereich' }, a.resource ? (spec(a.resource)?.label || a.resource) : '—'),
        h('td', { 'data-label': 'Datensatz' }, a.resource && spec(a.resource) && a.record_id && a.aktion !== 'gelöscht' ? h('a', { href: `#/r/${a.resource}/${a.record_id}` }, a.titel || `#${a.record_id}`) : (a.titel || '—')),
        h('td.small', { 'data-label': 'Details' }, a.details || ''))))))),
    h('div.pager', h('span.muted', `Seite ${page} von ${pages} · Zeiten in UTC`), h('div',
      h('a.btn.btn-sm', { href: `#/aktivitaeten${qs({ q, page: page - 1 })}`, class: page <= 1 ? 'disabled' : '' }, 'Zurück'),
      h('a.btn.btn-sm', { href: `#/aktivitaeten${qs({ q, page: page + 1 })}`, class: page >= pages ? 'disabled' : '' }, 'Weiter')))));
}

// ================================================================== POSTAUSGANG
export async function outboxView(root, _p, query) {
  const page = Number(query.get('page')) || 1;
  clear(root).appendChild(h('div.page', h('div.loading')));
  let d;
  try { d = await get(`/api/emails${qs({ page })}`); } catch (e) { clear(root).appendChild(h('div.page', errorBox(e))); return; }
  const compose = async () => {
    const v = await formDialog('Neue E-Mail', [
      { name: 'an', label: 'Empfänger', type: 'email', required: true, full: true },
      { name: 'betreff', label: 'Betreff', required: true, full: true },
      { name: 'text', label: 'Nachricht', type: 'textarea', rows: 10, value: `\n\nMit freundlichen Grüßen\n${state.me.user.name}\n${state.me.settings.firma.name}` },
    ], { ok: 'Senden' });
    if (!v) return;
    try { await post('/api/emails', v); toast('E-Mail in den Postausgang gestellt'); outboxView(root, _p, query); } catch (e) { errToast(e); }
  };
  const view = (m) => modal({ title: m.betreff, wide: true, content: h('div', h('p.muted', `An: ${m.an} · ${datetime(m.created_at.replace(' ', 'T'))} · ${m.bezug || ''}`), badge(m.status, m.status === 'Gesendet' ? 'ok' : m.status === 'Fehler' ? 'bad' : 'muted'), m.fehler ? h('p.text-bad', m.fehler) : null, h('pre.mail-body', m.text)) });
  clear(root).appendChild(h('div.page',
    pageHead('Postausgang', d.smtp ? 'Versand über SMTP aktiv' : 'Kein SMTP konfiguriert – E-Mails werden nur protokolliert', h('button.btn.btn-primary', { type: 'button', onclick: compose }, icon('mail', 16), 'Neue E-Mail')),
    d.items.length ? h('div.card', h('div.table-wrap', h('table.table.compact',
      h('thead', h('tr', h('th', 'Datum'), h('th', 'Empfänger'), h('th', 'Betreff'), h('th', 'Bezug'), h('th', 'Status'), h('th'))),
      h('tbody', d.items.map((m) => h('tr', { onclick: () => view(m) },
        h('td', { 'data-label': 'Datum' }, relTime(m.created_at)), h('td', { 'data-label': 'Empfänger' }, m.an), h('td', { 'data-label': 'Betreff' }, h('b', m.betreff)), h('td', { 'data-label': 'Bezug' }, m.bezug || ''),
        h('td', { 'data-label': 'Status' }, badge(m.status, m.status === 'Gesendet' ? 'ok' : m.status === 'Fehler' ? 'bad' : m.status === 'Wird gesendet' ? 'info' : 'muted')),
        h('td.actions', d.smtp ? h('button.icon-btn', { type: 'button', title: 'Erneut senden', onclick: async (e) => { e.stopPropagation(); try { await post(`/api/emails/${m.id}/erneut`); toast('Erneut gesendet'); outboxView(root, _p, query); } catch (err) { errToast(err); } } }, icon('repeat', 15)) : null)))))))
      : emptyState('Der Postausgang ist leer.')));
}

// ================================================================== PROFIL
export async function profileView(root) {
  const u = state.me.user;
  const nameForm = h('form.form-grid', {
    onsubmit: async (e) => {
      e.preventDefault();
      try { await put('/api/profil', { name: nameForm.elements.name.value }); state.me.user.name = nameForm.elements.name.value; toast('Profil gespeichert'); window.dispatchEvent(new CustomEvent('itw:settings')); } catch (err) { errToast(err); }
    },
  }, h('label.field', h('span.label', 'Name'), h('input', { name: 'name', value: u.name, required: true })),
  h('label.field', h('span.label', 'E-Mail'), h('input', { value: u.email, disabled: true })),
  h('div.full.form-actions', h('button.btn.btn-primary', { type: 'submit' }, 'Speichern')));
  const pwForm = passwordForm(() => toast('Passwort geändert'));
  clear(root).appendChild(h('div.page', pageHead('Mein Profil', `${state.me.meta.roleLabels[u.rolle]} · ${state.me.settings.firma.name}`),
    h('div.dash-grid', h('div.card', h('h3.card-title', icon('user', 16), 'Persönliche Daten'), nameForm), h('div.card', h('h3.card-title', icon('shield', 16), 'Passwort ändern'), pwForm))));
}

export function passwordForm(onDone) {
  const form = h('form.form-grid', {
    onsubmit: async (e) => {
      e.preventDefault();
      const alt = form.elements.alt.value;
      const neu = form.elements.neu.value;
      if (neu !== form.elements.neu2.value) { toast('Die neuen Passwörter stimmen nicht überein.', 'bad'); return; }
      try { await post('/api/auth/passwort', { alt, neu }); form.reset(); onDone(); } catch (err) { errToast(err); }
    },
  },
  h('label.field.full', h('span.label', 'Aktuelles Passwort'), h('input', { name: 'alt', type: 'password', required: true, autocomplete: 'current-password' })),
  h('label.field', h('span.label', 'Neues Passwort'), h('input', { name: 'neu', type: 'password', required: true, minlength: 8, autocomplete: 'new-password' })),
  h('label.field', h('span.label', 'Wiederholen'), h('input', { name: 'neu2', type: 'password', required: true, minlength: 8, autocomplete: 'new-password' })),
  h('small.full.hint', 'Mindestens 8 Zeichen, Buchstaben und Ziffern.'),
  h('div.full.form-actions', h('button.btn.btn-primary', { type: 'submit' }, 'Passwort ändern')));
  return form;
}
