'use strict';
// Strikte Whitelist-Validierung des gesamten Anwendungszustands im Hauptprozess.
// Alles, was von außen kommt (Renderer-IPC, importierte Sicherungen, Datei auf der
// Platte), wird hier in ein NEUES Objekt mit bekannten Schlüsseln, Typen und Längen
// überführt. Unbekannte Schlüssel, Prototype-Pollution-Versuche (__proto__ …),
// Steuerzeichen und überlange Texte kommen dadurch gar nicht erst in die Ablage.

const crypto = require('crypto');
const CATALOG = require('../renderer/catalog.js');
const SCHEMA = require('../renderer/schema.js');

const ITEM_IDS = new Set(CATALOG.FRAMEWORKS.flatMap((fw) => fw.gruppen.flatMap((g) => g.items.map((i) => i.id))));
const STATUS_IDS = CATALOG.STATUS.map((s) => s.id);
const SEKTOR_IDS = CATALOG.SEKTOREN.map((s) => s.id);
const SONDER_IDS = CATALOG.SONDERFAELLE.map((s) => s.id);
const INTERVALL_IDS = CATALOG.INTERVALLE.map((i) => i.id);

const KNOWN_KEYS = ['firma', 'nis2Check', 'items', 'vorfaelle', 'vvt', 'dienstleister', 'anfragen', 'schulungen', 'protokoll', 'einstellungen'];
const FIRMA_KEYS = ['name', 'branche', 'adresse', 'geschaeftsfuehrung', 'itleitung', 'dsb', 'email', 'telefon'];
const VORFALL_ARTEN = ['sicherheit', 'datenpanne', 'beides'];
const VORFALL_STATUS = ['offen', 'gemeldet', 'abgeschlossen'];
const MELDUNG_KEYS = ['nis24', 'nis72', 'nis30', 'dsgvo72'];
const LIMITS = { vorfaelle: 2000, protokoll: 3000, items: 400 };

// Steuerzeichen und bidirektionale Überschreibungen („Trojan Source“) entfernen.
const BAD_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;

function str(v, max) {
  if (typeof v !== 'string') return '';
  return v.slice(0, max + 64).replace(BAD_CHARS, '').slice(0, max);
}
function date(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? v : '';
}
function dt(v) {
  return typeof v === 'string' && v.length <= 30 && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z?$/.test(v) ? v : '';
}
function hex(v) {
  return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v) ? v : '';
}
function id(v) {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : crypto.randomBytes(6).toString('hex');
}
function oneOf(v, list, def) {
  return typeof v === 'string' && list.includes(v) ? v : def;
}
function num(v, max) {
  const s = typeof v === 'number' ? String(v) : typeof v === 'string' ? v.trim() : '';
  return s.length <= max && /^\d{1,9}([.,]\d{1,3})?$/.test(s) ? s : '';
}
function obj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}
function arr(v, cap) {
  return Array.isArray(v) ? v.slice(0, cap) : [];
}

function sanitizeRecord(reg, rec) {
  const r = obj(rec);
  const out = { id: id(r.id), erstellt: dt(r.erstellt), geaendert: dt(r.geaendert) };
  for (const f of reg.fields) {
    const v = r[f.k];
    if (f.t === 'bool') out[f.k] = v === true;
    else if (f.t === 'date') out[f.k] = date(v);
    else if (f.t === 'number') out[f.k] = num(v, f.max || 9);
    else if (f.t === 'select') out[f.k] = oneOf(v, f.o, f.o[0]);
    else out[f.k] = str(v, f.max || 200);
  }
  return out;
}

function sanitizeItem(raw) {
  const r = obj(raw);
  return {
    status: oneOf(r.status, STATUS_IDS, 'offen'),
    owner: str(r.owner, 120),
    due: date(r.due),
    evidence: str(r.evidence, 2000),
    note: str(r.note, 4000),
    file: str(r.file, 1024),
    updated: dt(r.updated),
    intervall: oneOf(r.intervall, INTERVALL_IDS, ''),
    geprueft: date(r.geprueft)
  };
}

function sanitizeVorfall(raw) {
  const r = obj(raw);
  const m = obj(r.meldungen);
  const meldungen = {};
  for (const k of MELDUNG_KEYS) meldungen[k] = m[k] === true;
  meldungen.nis72Zeit = dt(m.nis72Zeit);
  return {
    id: id(r.id),
    titel: str(r.titel, 160),
    art: oneOf(r.art, VORFALL_ARTEN, 'sicherheit'),
    kenntnis: dt(r.kenntnis),
    status: oneOf(r.status, VORFALL_STATUS, 'offen'),
    beschreibung: str(r.beschreibung, 4000),
    massnahmen: str(r.massnahmen, 4000),
    meldungen
  };
}

function sanitizeLog(raw) {
  const r = obj(raw);
  return {
    id: id(r.id),
    ts: dt(r.ts),
    aktion: str(r.aktion, 60),
    ziel: str(r.ziel, 200),
    detail: str(r.detail, 500),
    benutzer: str(r.benutzer, 80),
    prev: hex(r.prev),
    hash: hex(r.hash)
  };
}

function emptyState() {
  return {
    firma: {}, nis2Check: {}, items: {}, vorfaelle: [],
    vvt: [], dienstleister: [], anfragen: [], schulungen: [], protokoll: [],
    einstellungen: { benutzer: '', autoLockMin: 10 }
  };
}

function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Ungültige Datenstruktur.');
  }
  // Eine Datei ganz ohne bekannte Schlüssel ist keine Compliance-Datensicherung.
  if (!KNOWN_KEYS.some((k) => Object.prototype.hasOwnProperty.call(raw, k))) {
    throw new Error('Die Datei enthält keine gültige Compliance-Datensicherung.');
  }
  const out = emptyState();

  const f = obj(raw.firma);
  for (const k of FIRMA_KEYS) out.firma[k] = str(f[k], 200);

  const c = obj(raw.nis2Check);
  out.nis2Check = {
    sektor: oneOf(c.sektor, SEKTOR_IDS, ''),
    sonderfall: oneOf(c.sonderfall, SONDER_IDS, 'keiner'),
    mitarbeiter: num(c.mitarbeiter, 12),
    umsatz: num(c.umsatz, 14),
    bilanz: num(c.bilanz, 14),
    geprueft: dt(c.geprueft)
  };

  const items = obj(raw.items);
  let n = 0;
  for (const key of Object.keys(items)) {
    if (!ITEM_IDS.has(key)) continue; // nur Katalog-IDs zulassen
    if (++n > LIMITS.items) break;
    out.items[key] = sanitizeItem(items[key]);
  }

  out.vorfaelle = arr(raw.vorfaelle, LIMITS.vorfaelle).map(sanitizeVorfall);
  for (const key of ['vvt', 'dienstleister', 'anfragen', 'schulungen']) {
    const reg = SCHEMA.REGISTER[key];
    out[key] = arr(raw[key], reg.max).map((rec) => sanitizeRecord(reg, rec));
  }
  const log = arr(raw.protokoll, LIMITS.protokoll + 10).map(sanitizeLog);
  out.protokoll = log.slice(Math.max(0, log.length - LIMITS.protokoll));

  const e = obj(raw.einstellungen);
  const lock = Number(e.autoLockMin);
  out.einstellungen = {
    benutzer: str(e.benutzer, 80),
    autoLockMin: SCHEMA.AUTOLOCK_MINUTEN.includes(lock) ? lock : 10
  };
  return out;
}

module.exports = { sanitizeState, emptyState };
