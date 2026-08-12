const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './data/licenses.sqlite';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    seats INTEGER NOT NULL DEFAULT 1,
    revoked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER NOT NULL REFERENCES licenses(id),
    hardware_id TEXT NOT NULL,
    activated_at TEXT NOT NULL,
    last_validated_at TEXT NOT NULL,
    deactivated_at TEXT,
    UNIQUE(license_id, hardware_id)
  );
`);

function getLicenseByKey(licenseKey) {
  return db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(licenseKey);
}

function createLicense({ licenseKey, customerName, seats }) {
  db.prepare(
    'INSERT INTO licenses (license_key, customer_name, seats, revoked, created_at) VALUES (?, ?, ?, 0, ?)'
  ).run(licenseKey, customerName, seats, new Date().toISOString());
  return getLicenseByKey(licenseKey);
}

function countActiveActivations(licenseId) {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM activations WHERE license_id = ? AND deactivated_at IS NULL')
    .get(licenseId);
  return row.n;
}

function getActivation(licenseId, hardwareId) {
  return db
    .prepare('SELECT * FROM activations WHERE license_id = ? AND hardware_id = ?')
    .get(licenseId, hardwareId);
}

function createActivation(licenseId, hardwareId) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO activations (license_id, hardware_id, activated_at, last_validated_at, deactivated_at)
     VALUES (?, ?, ?, ?, NULL)`
  ).run(licenseId, hardwareId, now, now);
  return getActivation(licenseId, hardwareId);
}

function touchActivation(licenseId, hardwareId) {
  db.prepare(
    `UPDATE activations SET last_validated_at = ?, deactivated_at = NULL
     WHERE license_id = ? AND hardware_id = ?`
  ).run(new Date().toISOString(), licenseId, hardwareId);
  return getActivation(licenseId, hardwareId);
}

function deactivate(licenseId, hardwareId) {
  db.prepare(
    `UPDATE activations SET deactivated_at = ? WHERE license_id = ? AND hardware_id = ?`
  ).run(new Date().toISOString(), licenseId, hardwareId);
}

function listLicenses() {
  return db.prepare('SELECT * FROM licenses ORDER BY created_at DESC').all();
}

module.exports = {
  getLicenseByKey,
  createLicense,
  countActiveActivations,
  getActivation,
  createActivation,
  touchActivation,
  deactivate,
  listLicenses
};
