'use strict';
// JSON-Datenablage mit atomarem Schreiben (tmp-Datei + rename) und
// gebündeltem Speichern. Die Schnittstelle (load/save/data) ist bewusst klein
// gehalten, damit sie bei Bedarf durch Postgres/Redis ersetzt werden kann.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { hashPassword } = require('./security');

const uid = (prefix = '') => prefix + crypto.randomBytes(8).toString('hex');

class Store {
  constructor(file) {
    this.file = file;
    this.data = null;
    this.saveTimer = null;
  }

  load(seedOptions) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    let fresh = false;
    try {
      this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        // Beschädigte Datei nicht überschreiben, sondern sichern
        const backup = `${this.file}.corrupt-${Date.now()}`;
        try { fs.renameSync(this.file, backup); } catch { /* ignorieren */ }
        console.error(`[store] Datendatei unlesbar, gesichert als ${backup}`);
      }
      this.data = createSeed(seedOptions);
      fresh = true;
    }
    migrate(this.data);
    this.saveNow();
    return fresh;
  }

  // Bündelt viele Änderungen kurz hintereinander zu einem Schreibvorgang
  save() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => { this.saveTimer = null; this.saveNow(); }, 150);
  }

  saveNow() {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }
}

// Ältere Datenstände auf das aktuelle Schema heben (fehlende Felder ergänzen)
function migrate(d) {
  d.meta = d.meta || { version: 1, createdAt: new Date().toISOString() };
  d.settings = Object.assign({
    companyName: 'IT - World',
    maintenanceMode: false,
    sessionTimeoutMin: 60,
    alertEmail: 'ops@it-world.local',
    uptimeTarget: 99.9,
    autoRefreshSec: 15,
  }, d.settings || {});
  for (const key of ['users', 'services', 'incidents', 'tickets', 'deployments', 'audit']) d[key] = d[key] || [];
  d.counters = Object.assign({ ticket: 1000 + d.tickets.length }, d.counters || {});
  for (const t of d.tickets) t.comments = t.comments || [];
  for (const i of d.incidents) i.updates = i.updates || [];
}

const DEMO_ACCOUNTS = [
  { name: 'Alex Admin', email: 'admin@it-world.local', role: 'admin', password: 'ItWorld-Admin-2026' },
  { name: 'Olivia Ops', email: 'ops@it-world.local', role: 'ops', password: 'ItWorld-Ops-2026' },
  { name: 'Victor Viewer', email: 'viewer@it-world.local', role: 'viewer', password: 'ItWorld-View-2026' },
];

function createSeed({ demo, adminEmail, adminPassword }) {
  const now = Date.now();
  const ago = (h) => new Date(now - h * 3600_000).toISOString();

  const users = [];
  if (demo) {
    for (const a of DEMO_ACCOUNTS) {
      users.push({ id: uid('u_'), name: a.name, email: a.email, role: a.role, passwordHash: hashPassword(a.password),
        active: true, createdAt: ago(24 * 40), lastLogin: null, mustChangePassword: false });
    }
    const extra = [['Sara König', 'sara.koenig@it-world.local', 'ops'], ['Jonas Weber', 'jonas.weber@it-world.local', 'ops'],
      ['Mia Fischer', 'mia.fischer@it-world.local', 'viewer'], ['Lukas Braun', 'lukas.braun@it-world.local', 'viewer']];
    for (const [name, email, role] of extra) {
      users.push({ id: uid('u_'), name, email, role, passwordHash: hashPassword(crypto.randomBytes(12).toString('base64url') + '1a'),
        active: true, createdAt: ago(24 * 20), lastLogin: ago(30), mustChangePassword: true });
    }
  } else {
    users.push({ id: uid('u_'), name: 'Administrator', email: adminEmail, role: 'admin', passwordHash: hashPassword(adminPassword),
      active: true, createdAt: ago(0), lastLogin: null, mustChangePassword: true });
  }

  const svc = (name, type, region, version, status, baseLatency, baseCpu) =>
    ({ id: uid('s_'), name, type, region, version, status, baseLatency, baseCpu, lastRestart: null, createdAt: ago(24 * 90) });
  const services = [
    svc('API Gateway', 'Gateway', 'eu-central-1', 'v4.12.0', 'operational', 42, 38),
    svc('Auth Service', 'Microservice', 'eu-central-1', 'v2.8.3', 'operational', 28, 22),
    svc('Payment Service', 'Microservice', 'eu-west-1', 'v3.1.7', 'degraded', 180, 71),
    svc('PostgreSQL Primary', 'Datenbank', 'eu-central-1', '16.4', 'operational', 6, 55),
    svc('Redis Cache', 'Cache', 'eu-central-1', '7.2.5', 'operational', 1, 18),
    svc('Worker Queue', 'Queue', 'eu-west-1', 'v1.9.0', 'operational', 64, 47),
    svc('Mail Relay', 'Infrastruktur', 'eu-north-1', 'v2.0.1', 'maintenance', 95, 9),
    svc('Search Cluster', 'Datenbank', 'us-east-1', '8.15.0', 'operational', 58, 63),
  ];
  const S = Object.fromEntries(services.map(s => [s.name, s.id]));
  const U = (i) => users[Math.min(i, users.length - 1)].id;

  const incidents = [
    { id: uid('i_'), title: 'Erhöhte Latenz bei Zahlungen', severity: 'SEV2', status: 'investigating', serviceId: S['Payment Service'],
      assignee: U(1), createdAt: ago(3), resolvedAt: null,
      updates: [{ time: ago(3), text: 'Alarm: p95-Latenz > 800 ms in eu-west-1.', by: 'Monitoring' },
                { time: ago(2), text: 'Ursache vermutlich Verbindungspool der Datenbank, Analyse läuft.', by: 'Olivia Ops' }] },
    { id: uid('i_'), title: 'Geplante Wartung Mail Relay', severity: 'SEV4', status: 'monitoring', serviceId: S['Mail Relay'],
      assignee: U(3), createdAt: ago(6), resolvedAt: null,
      updates: [{ time: ago(6), text: 'TLS-Zertifikate und MTA-Update werden eingespielt.', by: 'Sara König' }] },
    { id: uid('i_'), title: 'Auth-Tokens liefen vorzeitig ab', severity: 'SEV3', status: 'resolved', serviceId: S['Auth Service'],
      assignee: U(4), createdAt: ago(50), resolvedAt: ago(47),
      updates: [{ time: ago(50), text: 'Uhrzeit-Drift auf einem Node festgestellt.', by: 'Jonas Weber' },
                { time: ago(47), text: 'NTP korrigiert, Tokens wieder stabil.', by: 'Jonas Weber' }] },
    { id: uid('i_'), title: 'API Gateway 502-Spitzen', severity: 'SEV1', status: 'resolved', serviceId: S['API Gateway'],
      assignee: U(1), createdAt: ago(120), resolvedAt: ago(118),
      updates: [{ time: ago(120), text: 'Fehlerrate 12 %, Failover eingeleitet.', by: 'Olivia Ops' },
                { time: ago(118), text: 'Fehlerhafte Konfiguration zurückgerollt.', by: 'Olivia Ops' }] },
  ];

  const tk = (n, title, description, priority, status, assignee, requester, h) =>
    ({ id: uid('t_'), number: n, title, description, priority, status, assignee, requester, createdAt: ago(h), updatedAt: ago(Math.max(0, h - 2)), comments: [] });
  const tickets = [
    tk(1001, 'VPN-Zugang für neue Mitarbeiterin', 'Bitte VPN-Profil und MFA für M. Fischer einrichten.', 'mittel', 'offen', U(3), 'HR', 5),
    tk(1002, 'Backup-Restore testen (Q3)', 'Quartalsweiser Restore-Test der PostgreSQL-Backups.', 'hoch', 'in Arbeit', U(1), 'Compliance', 30),
    tk(1003, 'SSL-Zertifikat shop.it-world.de erneuern', 'Läuft in 14 Tagen ab.', 'kritisch', 'offen', U(4), 'Monitoring', 2),
    tk(1004, 'Laptop-Rollout Vertrieb', '12 Geräte vorbereiten und ausgeben.', 'niedrig', 'wartend', U(3), 'Vertrieb', 80),
    tk(1005, 'Logrotation auf Worker-Nodes', 'Disk-Auslastung > 85 % auf worker-3.', 'hoch', 'erledigt', U(4), 'Monitoring', 60),
    tk(1006, 'Zugriffsrechte Finanzordner prüfen', 'Jährliche Rechte-Rezertifizierung.', 'mittel', 'in Arbeit', U(0), 'Revision', 20),
    tk(1007, 'Druckerfehler 2. OG', 'Papierstau-Meldung trotz leerem Fach.', 'niedrig', 'erledigt', U(3), 'Empfang', 100),
    tk(1008, 'Kubernetes-Upgrade auf 1.31 planen', 'Change-Plan und Wartungsfenster abstimmen.', 'mittel', 'offen', U(1), 'Plattform', 12),
  ];

  const dep = (serviceId, version, environment, status, by, h, duration, notes) =>
    ({ id: uid('d_'), serviceId, version, environment, status, by, createdAt: ago(h), duration, notes });
  const deployments = [
    dep(S['API Gateway'], 'v4.12.0', 'production', 'erfolgreich', 'Olivia Ops', 4, 212, 'Rate-Limits pro Mandant'),
    dep(S['Payment Service'], 'v3.1.7', 'production', 'erfolgreich', 'Jonas Weber', 9, 340, 'Neuer PSP-Adapter'),
    dep(S['Payment Service'], 'v3.1.8', 'staging', 'fehlgeschlagen', 'Jonas Weber', 7, 95, 'Migration schlug fehl'),
    dep(S['Auth Service'], 'v2.8.3', 'production', 'erfolgreich', 'Sara König', 26, 158, 'Passkey-Support'),
    dep(S['Worker Queue'], 'v1.9.0', 'production', 'zurückgerollt', 'Olivia Ops', 49, 401, 'Speicherleck, Rollback auf v1.8.4'),
    dep(S['Search Cluster'], '8.15.0', 'production', 'erfolgreich', 'Sara König', 75, 620, 'Minor-Upgrade'),
  ];

  const audit = [
    { id: uid('a_'), time: ago(0.1), userId: null, userName: 'System', action: 'system.seed', target: 'Datenbank', details: 'Initialdaten angelegt', ip: '-' },
  ];

  return { meta: { version: 1, createdAt: new Date().toISOString() }, users, services, incidents, tickets, deployments, audit,
    counters: { ticket: 1008 } };
}

module.exports = { Store, uid, DEMO_ACCOUNTS };
