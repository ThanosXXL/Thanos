'use strict';
/**
 * Generische, mandantengetrennte Datenzugriffsschicht für alle Ressourcen aus schema.js
 * inkl. Validierung, Referenzprüfung, Nummernkreisen und fachlicher Logik (Belege, Lager, Zahlungen).
 */
const fs = require('node:fs');
const { RESOURCES } = require('./schema');
const { tx } = require('./db');
const { bad, forbidden, notFound } = require('./http');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
};

function getSpec(key) {
  const spec = Object.prototype.hasOwnProperty.call(RESOURCES, key) ? RESOURCES[key] : null;
  if (!spec) throw notFound('Unbekannter Bereich.');
  return spec;
}

// ------------------------------------------------------------ Berechtigungen
function moduleEnabled(ctx, spec) {
  return ctx.settings.module[spec.module] !== false;
}
function canRead(ctx, spec) {
  return moduleEnabled(ctx, spec) && spec.perm.read.includes(ctx.user.rolle);
}
function canWrite(ctx, spec) {
  return moduleEnabled(ctx, spec) && spec.perm.write.includes(ctx.user.rolle);
}
function assertRead(ctx, spec) {
  if (!moduleEnabled(ctx, spec)) throw forbidden('Dieses Modul ist deaktiviert.');
  if (!canRead(ctx, spec)) throw forbidden();
}
function assertWrite(ctx, spec) {
  assertRead(ctx, spec);
  if (!canWrite(ctx, spec)) throw forbidden();
}

// ------------------------------------------------------------ Validierung
const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

function coerce(f, v) {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '' && f.type !== 'json')) {
    if (f.type === 'bool') return 0;
    if (f.required) throw bad(`„${f.label}“ ist ein Pflichtfeld.`, { field: f.name });
    return null;
  }
  const fail = (msg) => { throw bad(`„${f.label}“: ${msg}`, { field: f.name }); };
  switch (f.type) {
    case 'string': case 'tel': case 'text': {
      const s = String(v).trim();
      const max = f.max || (f.type === 'text' ? 20000 : 500);
      if (s.length > max) fail(`höchstens ${max} Zeichen.`);
      if (f.type === 'tel' && !/^[0-9+()\/\-. ]{3,40}$/.test(s)) fail('ungültige Telefonnummer.');
      return s;
    }
    case 'email': {
      const s = String(v).trim();
      if (s.length > 254 || !EMAIL_RE.test(s)) fail('ungültige E-Mail-Adresse.');
      return s;
    }
    case 'url': {
      let s = String(v).trim();
      if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
      try {
        const u = new URL(s);
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
      } catch { fail('ungültige Web-Adresse.'); }
      if (s.length > 500) fail('zu lang.');
      return s;
    }
    case 'enum': {
      const s = String(v);
      if (!f.options.includes(s)) fail(`unzulässiger Wert „${s}“.`);
      return s;
    }
    case 'number': case 'money': {
      const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
      if (!Number.isFinite(n)) fail('keine gültige Zahl.');
      if (f.min !== undefined && n < f.min) fail(`mindestens ${f.min}.`);
      if (f.max !== undefined && n > f.max) fail(`höchstens ${f.max}.`);
      if (Math.abs(n) > 1e12) fail('Wert zu groß.');
      return f.type === 'money' ? round2(n) : Math.round(n * 10000) / 10000;
    }
    case 'int': case 'percent': case 'ref': {
      const n = typeof v === 'number' ? v : Number(String(v).trim());
      if (!Number.isInteger(n)) fail('keine gültige Ganzzahl.');
      if (f.min !== undefined && n < f.min) fail(`mindestens ${f.min}.`);
      if (f.max !== undefined && n > f.max) fail(`höchstens ${f.max}.`);
      if (Math.abs(n) > 2 ** 53) fail('Wert zu groß.');
      return n;
    }
    case 'bool':
      return v === true || v === 1 || v === '1' || v === 'true' || v === 'ja' || v === 'Ja' ? 1 : 0;
    case 'date': {
      const s = String(v).trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) fail('ungültiges Datum.');
      return s;
    }
    case 'datetime': {
      const s = String(v).trim().replace(' ', 'T').slice(0, 16);
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}:00Z`))) fail('ungültiger Zeitpunkt.');
      return s;
    }
    case 'json': {
      if (typeof v !== 'object') fail('ungültige Struktur.');
      const s = JSON.stringify(v);
      if (s.length > 200000) fail('zu umfangreich.');
      return s;
    }
    default:
      return String(v);
  }
}

function decode(spec, row) {
  if (!row) return row;
  const out = { ...row };
  for (const f of spec.fields) {
    if (f.type === 'bool') out[f.name] = !!out[f.name];
    else if (f.type === 'json') {
      try { out[f.name] = out[f.name] ? JSON.parse(out[f.name]) : (Array.isArray(f.default) ? [] : null); } catch { out[f.name] = []; }
    }
  }
  delete out.tenant_id;
  return out;
}

// ------------------------------------------------------------ Referenzen / Titel
function refTarget(refKey) {
  if (refKey === 'benutzer') return { table: 'users', fixed: {}, title: (r) => r.name, cols: 'id, name' };
  const spec = getSpec(refKey);
  return { table: spec.table, fixed: spec.fixed || {}, title: (r) => titleOf(spec, r), cols: '*' };
}

function titleOf(spec, row) {
  if (!row) return '';
  return spec.title.map((k) => row[k]).filter((x) => x !== null && x !== undefined && x !== '').join(' · ') || `#${row.id}`;
}

function fixedWhere(fixed, params) {
  return Object.keys(fixed).map((k) => { params.push(fixed[k]); return ` AND "${k}" = ?`; }).join('');
}

function refExists(ctx, refKey, id) {
  const t = refTarget(refKey);
  const params = [id, ctx.tenant.id];
  const row = ctx.db.prepare(`SELECT id FROM "${t.table}" WHERE id = ? AND tenant_id = ?${fixedWhere(t.fixed, params)}`).get(...params);
  return !!row;
}

/** Ergänzt `<feld>__label` für alle Referenzfelder (ein SELECT pro Referenzziel). */
function attachLabels(ctx, spec, items) {
  for (const f of spec.fields.filter((x) => x.type === 'ref')) {
    const ids = [...new Set(items.map((i) => i[f.name]).filter((x) => x != null))];
    if (!ids.length) continue;
    const t = refTarget(f.ref);
    const map = new Map();
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const rows = ctx.db.prepare(`SELECT ${t.cols} FROM "${t.table}" WHERE tenant_id = ? AND id IN (${chunk.map(() => '?').join(',')})`).all(ctx.tenant.id, ...chunk);
      for (const r of rows) map.set(r.id, t.title(r));
    }
    for (const it of items) if (it[f.name] != null) it[`${f.name}__label`] = map.get(it[f.name]) || '(gelöscht)';
  }
  if (spec.beleg) {
    const t = today();
    for (const it of items) {
      it.offen = round2((it.brutto || 0) - (it.bezahlt || 0));
      it.ueberfaellig = it.typ === 'Rechnung' && ['Offen', 'Teilbezahlt'].includes(it.status) && !!it.faellig && it.faellig < t;
    }
  }
  return items;
}

// ------------------------------------------------------------ Nummernkreise
function nextNumber(ctx, spec) {
  const year = new Date().getFullYear();
  const name = spec.beleg ? `${spec.key}-${year}` : spec.key;
  ctx.db.prepare('INSERT INTO counters (tenant_id, name, wert) VALUES (?, ?, 1) ON CONFLICT(tenant_id, name) DO UPDATE SET wert = wert + 1')
    .run(ctx.tenant.id, name);
  const n = ctx.db.prepare('SELECT wert FROM counters WHERE tenant_id = ? AND name = ?').get(ctx.tenant.id, name).wert;
  return spec.beleg ? `${spec.autoPrefix}${year}-${String(n).padStart(4, '0')}` : `${spec.autoPrefix}${String(n).padStart(4, '0')}`;
}

// ------------------------------------------------------------ Belege
function normPositionen(list, kleinunternehmer) {
  if (!Array.isArray(list)) throw bad('Positionen müssen eine Liste sein.');
  if (list.length > 300) throw bad('Höchstens 300 Positionen je Beleg.');
  const num = (v, label, min, max) => {
    const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'));
    if (!Number.isFinite(n) || n < min || n > max) throw bad(`Position: ungültiger Wert für ${label}.`);
    return n;
  };
  return list.map((p, i) => {
    if (!p || typeof p !== 'object') throw bad(`Position ${i + 1} ist ungültig.`);
    const bezeichnung = String(p.bezeichnung ?? '').trim();
    if (!bezeichnung) throw bad(`Position ${i + 1}: Bezeichnung fehlt.`);
    if (bezeichnung.length > 500) throw bad(`Position ${i + 1}: Bezeichnung zu lang.`);
    const pos = {
      produkt_id: p.produkt_id ? num(p.produkt_id, 'Produkt', 1, 2 ** 53) : null,
      bezeichnung,
      beschreibung: String(p.beschreibung ?? '').trim().slice(0, 2000),
      menge: Math.round(num(p.menge ?? 1, 'Menge', -1e6, 1e6) * 1000) / 1000,
      einheit: String(p.einheit ?? 'Stk').trim().slice(0, 20),
      preis: round2(num(p.preis ?? 0, 'Preis', -1e9, 1e9)),
      rabatt: num(p.rabatt ?? 0, 'Rabatt', 0, 100),
      mwst: kleinunternehmer ? 0 : num(p.mwst ?? 19, 'MwSt.', 0, 100),
    };
    pos.summe = round2(pos.menge * pos.preis * (1 - pos.rabatt / 100));
    return pos;
  });
}

function belegSummen(pos) {
  const netto = round2(pos.reduce((s, p) => s + p.summe, 0));
  const proSatz = {};
  for (const p of pos) proSatz[p.mwst] = (proSatz[p.mwst] || 0) + p.summe;
  const steuer = round2(Object.entries(proSatz).reduce((s, [satz, basis]) => s + round2(basis * Number(satz) / 100), 0));
  return { netto, steuer, brutto: round2(netto + steuer) };
}

function bookStock(ctx, beleg, sign, grund) {
  for (const p of beleg.positionen || []) {
    if (!p.produkt_id) continue;
    const prod = ctx.db.prepare('SELECT id, typ FROM produkte WHERE id = ? AND tenant_id = ?').get(p.produkt_id, ctx.tenant.id);
    if (!prod || prod.typ !== 'Produkt') continue;
    const menge = Math.round(p.menge) * sign;
    if (!menge) continue;
    ctx.db.prepare("UPDATE produkte SET bestand = COALESCE(bestand, 0) + ?, updated_at = datetime('now') WHERE id = ?").run(menge, prod.id);
    ctx.db.prepare('INSERT INTO lagerbewegungen (tenant_id, produkt_id, menge, grund, beleg_id, user_name) VALUES (?, ?, ?, ?, ?, ?)')
      .run(ctx.tenant.id, prod.id, menge, grund, beleg.id, ctx.user.name);
  }
}

function recomputePayments(ctx, belegId) {
  const b = ctx.db.prepare("SELECT id, brutto, status FROM belege WHERE id = ? AND tenant_id = ? AND typ = 'Rechnung'").get(belegId, ctx.tenant.id);
  if (!b) return;
  const sum = round2(ctx.db.prepare('SELECT COALESCE(SUM(betrag), 0) AS s FROM zahlungen WHERE tenant_id = ? AND beleg_id = ?').get(ctx.tenant.id, belegId).s);
  let status = b.status;
  if (!['Entwurf', 'Storniert'].includes(status)) {
    status = sum >= round2(b.brutto) - 0.005 && b.brutto > 0 ? 'Bezahlt' : sum > 0 ? 'Teilbezahlt' : 'Offen';
  }
  ctx.db.prepare("UPDATE belege SET bezahlt = ?, status = ?, updated_at = datetime('now') WHERE id = ?").run(sum, status, belegId);
}

// ------------------------------------------------------------ Hooks
const hooks = {
  beforeSave(ctx, spec, data, old) {
    if (spec.beleg) {
      data.typ = spec.fixed.typ;
      const klein = !!ctx.settings.finanzen.kleinunternehmer;
      const pos = normPositionen(JSON.parse(data.positionen || '[]'), klein);
      if (old && spec.key === 'rechnungen' && old.status !== 'Entwurf') {
        const oldPos = JSON.stringify(normPositionen(JSON.parse(old.positionen || '[]'), klein));
        if (oldPos !== JSON.stringify(pos) || old.kunde_id !== data.kunde_id) {
          throw bad('Festgeschriebene Rechnungen können inhaltlich nicht mehr geändert werden. Bitte stornieren und neu erstellen.');
        }
      }
      data.positionen = JSON.stringify(pos);
      Object.assign(data, belegSummen(pos));
      if (!data.faellig && data.datum) {
        if (spec.key === 'rechnungen') {
          const kunde = ctx.db.prepare('SELECT zahlungsziel FROM kunden WHERE id = ? AND tenant_id = ?').get(data.kunde_id, ctx.tenant.id);
          data.faellig = addDays(data.datum, kunde && kunde.zahlungsziel != null ? kunde.zahlungsziel : ctx.settings.finanzen.zahlungsziel);
        } else if (spec.key === 'angebote') {
          data.faellig = addDays(data.datum, ctx.settings.finanzen.angebotGueltig);
        }
      }
      if (!old) data.bezahlt = 0;
    }
    if (spec.key === 'ausgaben' && data.netto != null) {
      data.brutto = round2(data.netto * (1 + Number(data.mwst || 0) / 100));
    }
    if (spec.key === 'zahlungen') {
      const b = ctx.db.prepare("SELECT status FROM belege WHERE id = ? AND tenant_id = ? AND typ = 'Rechnung'").get(data.beleg_id, ctx.tenant.id);
      if (b && b.status === 'Entwurf') throw bad('Die Rechnung ist noch ein Entwurf. Bitte zuerst festschreiben (Status „Offen“).');
      if (b && b.status === 'Storniert') throw bad('Auf stornierte Rechnungen können keine Zahlungen gebucht werden.');
    }
  },
  afterSave(ctx, spec, row, old) {
    if (spec.key === 'rechnungen') {
      if (old && row.status === 'Bezahlt' && old.status !== 'Bezahlt') {
        // „Als bezahlt markieren“: Restbetrag automatisch als Zahlung buchen
        const rest = round2((row.brutto || 0) - (row.bezahlt || 0));
        if (rest > 0) {
          ctx.db.prepare('INSERT INTO zahlungen (tenant_id, created_by, beleg_id, datum, betrag, methode, referenz) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(ctx.tenant.id, ctx.user ? ctx.user.id : null, row.id, today(), rest, 'Überweisung', `${row.nummer} (manuell als bezahlt markiert)`);
        }
      }
      const aktiv = ['Offen', 'Teilbezahlt', 'Bezahlt'].includes(row.status);
      const beleg = decode(spec, row);
      if (!row.lager_gebucht && aktiv) {
        bookStock(ctx, beleg, -1, `Rechnung ${row.nummer}`);
        ctx.db.prepare('UPDATE belege SET lager_gebucht = 1 WHERE id = ?').run(row.id);
      } else if (row.lager_gebucht && row.status === 'Storniert') {
        bookStock(ctx, beleg, 1, `Storno ${row.nummer}`);
        ctx.db.prepare('UPDATE belege SET lager_gebucht = 0 WHERE id = ?').run(row.id);
      }
      recomputePayments(ctx, row.id);
    }
    if (spec.key === 'zahlungen') {
      recomputePayments(ctx, row.beleg_id);
      if (old && old.beleg_id !== row.beleg_id) recomputePayments(ctx, old.beleg_id);
    }
  },
  beforeDelete(ctx, spec, old) {
    if (spec.key === 'rechnungen' && old.status !== 'Entwurf') {
      throw bad('Nur Rechnungsentwürfe können gelöscht werden. Festgeschriebene Rechnungen bitte stornieren.');
    }
  },
  afterDelete(ctx, spec, old) {
    if (spec.key === 'zahlungen') recomputePayments(ctx, old.beleg_id);
    if (spec.key === 'dokumente' && old.pfad) fs.promises.unlink(old.pfad).catch(() => {});
  },
};

// ------------------------------------------------------------ Aktivitätsprotokoll
function log(ctx, aktion, resource, recordId, titel, details) {
  ctx.db.prepare('INSERT INTO activity (tenant_id, user_id, user_name, aktion, resource, record_id, titel, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(ctx.tenant.id, ctx.user ? ctx.user.id : null, ctx.user ? ctx.user.name : 'System', aktion, resource || null, recordId || null,
      titel ? String(titel).slice(0, 300) : null, details ? String(details).slice(0, 2000) : null);
}

// ------------------------------------------------------------ CRUD
function rawGet(ctx, spec, id) {
  const params = [Number(id), ctx.tenant.id];
  return ctx.db.prepare(`SELECT * FROM "${spec.table}" WHERE id = ? AND tenant_id = ?${fixedWhere(spec.fixed || {}, params)}`).get(...params);
}

function get(ctx, key, id) {
  const spec = getSpec(key);
  assertRead(ctx, spec);
  const row = rawGet(ctx, spec, id);
  if (!row) throw notFound(`${spec.singular} nicht gefunden.`);
  const item = decode(spec, row);
  attachLabels(ctx, spec, [item]);
  item.__title = titleOf(spec, item);
  return item;
}

function list(ctx, key, q = {}) {
  const spec = getSpec(key);
  assertRead(ctx, spec);
  const params = [ctx.tenant.id];
  let where = `tenant_id = ?${fixedWhere(spec.fixed || {}, params)}`;
  const search = String(q.q || '').trim();
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    where += ` AND (${spec.search.map((c) => { params.push(like); return `"${c}" LIKE ? ESCAPE '\\'`; }).join(' OR ')})`;
  }
  const fieldNames = new Set(spec.fields.map((f) => f.name));
  for (const [k, v] of Object.entries(q)) {
    const m = k.match(/^f_(\w+)$/);
    if (!m || !fieldNames.has(m[1]) || v === '' || v == null) continue;
    const f = spec.fields.find((x) => x.name === m[1]);
    if (v === '__leer') { where += ` AND "${f.name}" IS NULL`; continue; }
    params.push(f.type === 'bool' ? (v === 'true' || v === '1' ? 1 : 0) : ['ref', 'int', 'percent'].includes(f.type) ? Number(v) : String(v));
    where += ` AND "${f.name}" = ?`;
  }
  if (q.von && /^\d{4}-\d{2}-\d{2}/.test(q.von) && q.datumsfeld && fieldNames.has(q.datumsfeld)) { params.push(q.von); where += ` AND "${q.datumsfeld}" >= ?`; }
  if (q.bis && /^\d{4}-\d{2}-\d{2}/.test(q.bis) && q.datumsfeld && fieldNames.has(q.datumsfeld)) { params.push(q.bis); where += ` AND "${q.datumsfeld}" <= ?`; }
  if (spec.beleg && q.ueberfaellig === 'true') {
    params.push(today());
    where += " AND status IN ('Offen','Teilbezahlt') AND faellig < ?";
  }
  const sortable = new Set([...fieldNames, 'id', 'created_at', 'updated_at']);
  const sort = sortable.has(q.sort) ? q.sort : spec.sort;
  const dir = q.dir === 'desc' || (!q.dir && spec.sortDir === 'desc' && sort === spec.sort) ? 'DESC' : 'ASC';
  const limit = q.limit === 'alle' ? -1 : Math.min(Math.max(parseInt(q.limit, 10) || 50, 1), 1000);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const total = ctx.db.prepare(`SELECT COUNT(*) AS n FROM "${spec.table}" WHERE ${where}`).get(...params).n;
  const rows = ctx.db.prepare(`SELECT * FROM "${spec.table}" WHERE ${where} ORDER BY "${sort}" IS NULL, "${sort}" ${dir}, id ${dir} LIMIT ? OFFSET ?`)
    .all(...params, limit, limit < 0 ? 0 : (page - 1) * limit);
  const items = attachLabels(ctx, spec, rows.map((r) => decode(spec, r)));
  for (const it of items) it.__title = titleOf(spec, it);
  return { items, total, page, limit };
}

function buildData(ctx, spec, input, old) {
  const data = {};
  for (const f of spec.fields) {
    if (f.readonly || f.hidden) continue;
    let v = input[f.name];
    if (v === undefined && old) continue; // Teil-Update: unveränderte Felder behalten
    if (v === undefined && !old && f.default !== undefined) {
      v = f.default === 'today' ? today() : f.default === 'me' ? ctx.user.id : f.default;
      if (f.type === 'json') v = JSON.parse(JSON.stringify(v));
    }
    data[f.name] = coerce(f, v);
    if (f.type === 'ref' && data[f.name] != null && !refExists(ctx, f.ref, data[f.name])) {
      throw bad(`„${f.label}“: Der ausgewählte Eintrag existiert nicht.`, { field: f.name });
    }
  }
  if (old) {
    // Pflichtfelder auch bei Teil-Updates sicherstellen
    for (const f of spec.fields) if (f.required && !f.readonly && data[f.name] === undefined && old[f.name] == null) coerce(f, null);
  }
  return data;
}

function create(ctx, key, input, opts = {}) {
  const spec = getSpec(key);
  if (!opts.system) assertWrite(ctx, spec);
  if (spec.upload && !opts.system) throw bad('Dokumente bitte über den Datei-Upload anlegen.');
  return tx(ctx.db, () => {
    const data = buildData(ctx, spec, input || {}, null);
    if (opts.extra) Object.assign(data, opts.extra);
    for (const f of spec.fields) if (f.auto) data[f.name] = nextNumber(ctx, spec);
    hooks.beforeSave(ctx, spec, data, null);
    const cols = Object.keys(data);
    const info = ctx.db.prepare(`INSERT INTO "${spec.table}" (tenant_id, created_by${cols.map((c) => `, "${c}"`).join('')}) VALUES (?, ?${cols.map(() => ', ?').join('')})`)
      .run(ctx.tenant.id, ctx.user ? ctx.user.id : null, ...cols.map((c) => data[c]));
    const id = Number(info.lastInsertRowid);
    const row = rawGet(ctx, spec, id);
    hooks.afterSave(ctx, spec, row, null);
    log(ctx, 'erstellt', key, id, titleOf(spec, row));
    return get(ctx, key, id);
  });
}

function update(ctx, key, id, input) {
  const spec = getSpec(key);
  assertWrite(ctx, spec);
  return tx(ctx.db, () => {
    const old = rawGet(ctx, spec, id);
    if (!old) throw notFound(`${spec.singular} nicht gefunden.`);
    const data = buildData(ctx, spec, input || {}, old);
    const merged = { ...old, ...data };
    if (spec.beleg) {
      if (data.positionen === undefined) data.positionen = old.positionen;
      if (data.kunde_id === undefined) data.kunde_id = old.kunde_id;
      if (data.datum === undefined) data.datum = old.datum;
      if (data.faellig === undefined) data.faellig = old.faellig;
      if (data.status === undefined) data.status = old.status;
    }
    if (spec.key === 'ausgaben') { data.netto = merged.netto; data.mwst = merged.mwst; }
    if (spec.key === 'zahlungen' && data.beleg_id === undefined) data.beleg_id = old.beleg_id;
    hooks.beforeSave(ctx, spec, data, old);
    const cols = Object.keys(data);
    if (cols.length) {
      ctx.db.prepare(`UPDATE "${spec.table}" SET ${cols.map((c) => `"${c}" = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`)
        .run(...cols.map((c) => data[c]), old.id, ctx.tenant.id);
    }
    const row = rawGet(ctx, spec, id);
    hooks.afterSave(ctx, spec, row, old);
    const changed = spec.fields.filter((f) => !f.hidden && f.type !== 'json' && String(old[f.name] ?? '') !== String(row[f.name] ?? '')).map((f) => {
      if (f.type === 'enum' || f.type === 'date' || f.type === 'percent') return `${f.label}: ${old[f.name] ?? '—'} → ${row[f.name] ?? '—'}`;
      return f.label;
    });
    if (spec.beleg && old.positionen !== row.positionen) changed.push('Positionen');
    log(ctx, 'geändert', key, row.id, titleOf(spec, row), changed.join('; '));
    return get(ctx, key, id);
  });
}

function remove(ctx, key, id) {
  const spec = getSpec(key);
  assertWrite(ctx, spec);
  return tx(ctx.db, () => {
    const old = rawGet(ctx, spec, id);
    if (!old) throw notFound(`${spec.singular} nicht gefunden.`);
    hooks.beforeDelete(ctx, spec, old);
    ctx.db.prepare(`DELETE FROM "${spec.table}" WHERE id = ? AND tenant_id = ?`).run(old.id, ctx.tenant.id);
    ctx.db.prepare('DELETE FROM kommentare WHERE tenant_id = ? AND resource = ? AND record_id = ?').run(ctx.tenant.id, key, old.id);
    hooks.afterDelete(ctx, spec, old);
    log(ctx, 'gelöscht', key, old.id, titleOf(spec, old));
    return { ok: true };
  });
}

/** Referenz-Auswahlliste (id + Titel) für Formulare. */
function options(ctx, refKey, q) {
  if (refKey === 'benutzer') {
    return ctx.db.prepare('SELECT id, name AS label FROM users WHERE tenant_id = ? AND aktiv = 1 ORDER BY name').all(ctx.tenant.id);
  }
  const spec = getSpec(refKey);
  if (!canRead(ctx, spec)) return [];
  const r = list(ctx, refKey, { q, limit: 1000, sort: spec.sort });
  return r.items.map((it) => {
    const o = { id: it.id, label: it.__title };
    if (refKey === 'produkte') Object.assign(o, { preis: it.preis, mwst: Number(it.mwst), einheit: it.einheit, name: it.name, beschreibung: it.beschreibung, typ: it.typ, aktiv: it.aktiv });
    if (refKey === 'rechnungen') Object.assign(o, { offen: it.offen, status: it.status });
    if (refKey === 'kontakte') o.kunde_id = it.kunde_id;
    return o;
  });
}

/** Wandelt Angebot → Auftrag/Rechnung bzw. Auftrag → Rechnung um. */
function convert(ctx, fromKey, id, toKey) {
  const from = getSpec(fromKey);
  if (!from.convert || !from.convert.includes(toKey)) throw bad('Diese Umwandlung ist nicht möglich.');
  assertRead(ctx, from);
  assertWrite(ctx, getSpec(toKey));
  return tx(ctx.db, () => {
    const src = get(ctx, fromKey, id);
    const created = create(ctx, toKey, {
      kunde_id: src.kunde_id, betreff: src.betreff, positionen: src.positionen, projekt_id: src.projekt_id,
      einleitung: toKey === 'rechnungen' ? ctx.settings.texte.rechnungEinleitung : src.einleitung, notizen: src.notizen,
    }, { extra: { quelle_id: src.id } });
    const neuerStatus = fromKey === 'angebote' ? 'Angenommen' : toKey === 'rechnungen' ? 'Abgerechnet' : null;
    if (neuerStatus && canWrite(ctx, from)) {
      ctx.db.prepare("UPDATE belege SET status = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?").run(neuerStatus, src.id, ctx.tenant.id);
    }
    log(ctx, 'umgewandelt', fromKey, src.id, src.__title, `→ ${created.nummer}`);
    return created;
  });
}

module.exports = {
  getSpec, canRead, canWrite, assertRead, assertWrite, coerce, decode, list, get, create, update, remove, options,
  convert, log, titleOf, attachLabels, round2, today, addDays, normPositionen, belegSummen, recomputePayments, rawGet,
};
