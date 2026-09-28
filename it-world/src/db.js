'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { RESOURCES } = require('./schema');

const SQL_TYPE = {
  string: 'TEXT', text: 'TEXT', email: 'TEXT', url: 'TEXT', tel: 'TEXT', enum: 'TEXT',
  date: 'TEXT', datetime: 'TEXT', json: 'TEXT',
  number: 'REAL', money: 'REAL',
  int: 'INTEGER', percent: 'INTEGER', bool: 'INTEGER', ref: 'INTEGER',
};

const CORE_SQL = `
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  rolle TEXT NOT NULL DEFAULT 'mitarbeiter',
  passwort TEXT NOT NULL,
  aktiv INTEGER NOT NULL DEFAULT 1,
  muss_passwort_aendern INTEGER NOT NULL DEFAULT 0,
  letzter_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS counters (
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  wert INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, name)
);
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER,
  user_name TEXT,
  aktion TEXT NOT NULL,
  resource TEXT,
  record_id INTEGER,
  titel TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_tenant ON activity(tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_activity_record ON activity(tenant_id, resource, record_id);
CREATE TABLE IF NOT EXISTS kommentare (
  id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  resource TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  user_id INTEGER,
  user_name TEXT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_kommentare_record ON kommentare(tenant_id, resource, record_id);
CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  an TEXT NOT NULL,
  betreff TEXT NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL,
  fehler TEXT,
  bezug TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_emails_tenant ON emails(tenant_id, id);
CREATE TABLE IF NOT EXISTS lagerbewegungen (
  id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  produkt_id INTEGER NOT NULL,
  menge INTEGER NOT NULL,
  grund TEXT,
  beleg_id INTEGER,
  user_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lager_produkt ON lagerbewegungen(tenant_id, produkt_id);
`;

function resourceTables() {
  // Mehrere Ressourcen können eine Tabelle teilen (Angebote/Aufträge/Rechnungen → belege).
  const tables = new Map();
  for (const spec of Object.values(RESOURCES)) {
    const cols = tables.get(spec.table) || new Map();
    for (const f of spec.fields) if (!cols.has(f.name)) cols.set(f.name, SQL_TYPE[f.type] || 'TEXT');
    tables.set(spec.table, cols);
  }
  return tables;
}

function migrate(db) {
  db.exec(CORE_SQL);
  for (const [table, cols] of resourceTables()) {
    db.exec(`CREATE TABLE IF NOT EXISTS "${table}" (
      id INTEGER PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by INTEGER
    )`);
    db.exec(`CREATE INDEX IF NOT EXISTS "idx_${table}_tenant" ON "${table}"(tenant_id)`);
    // Automatische Migration: fehlende Spalten nachrüsten, damit ältere Datenbanken weiter laufen.
    const existing = new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map((c) => c.name));
    for (const [col, type] of cols) {
      if (!existing.has(col)) db.exec(`ALTER TABLE "${table}" ADD COLUMN "${col}" ${type}`);
    }
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_belege_typ ON belege(tenant_id, typ)');
}

function open(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;');
  migrate(db);
  return db;
}

/** Führt fn in einer Transaktion aus (verschachtelungssicher über SAVEPOINTs). */
let depth = 0;
function tx(db, fn) {
  const name = `sp${depth++}`;
  db.exec(`SAVEPOINT ${name}`);
  try {
    const r = fn();
    db.exec(`RELEASE ${name}`);
    return r;
  } catch (e) {
    db.exec(`ROLLBACK TO ${name}`);
    db.exec(`RELEASE ${name}`);
    throw e;
  } finally {
    depth--;
  }
}

module.exports = { open, tx, SQL_TYPE };
