'use strict';
// IT - World · Internal Admin & Ops Dashboard – HTTP-Server und REST-API.
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const { Store, uid, DEMO_ACCOUNTS } = require('./lib/store');
const {
  hashPassword, verifyPassword, passwordProblem, SessionStore, RateLimiter, parseCookies, securityHeaders,
} = require('./lib/security');
const metrics = require('./lib/metrics');

// ---------- Konfiguration (alles über Umgebungsvariablen) ----------
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'it-world-data.json');
const DEMO = process.env.DEMO_MODE ? process.env.DEMO_MODE === 'true' : !IS_PROD;
const COOKIE_SECURE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : IS_PROD;
const COOKIE_NAME = COOKIE_SECURE ? '__Host-itw_session' : 'itw_session';
const TRUST_PROXY = process.env.TRUST_PROXY || false;

// ---------- Daten laden ----------
const store = new Store(DATA_FILE);
let generatedAdminPassword = null;
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@it-world.local').toLowerCase();
let adminPassword = process.env.ADMIN_PASSWORD;
if (!DEMO && !adminPassword) {
  adminPassword = crypto.randomBytes(12).toString('base64url') + '7x';
  generatedAdminPassword = adminPassword;
}
const fresh = store.load({ demo: DEMO, adminEmail, adminPassword });
const db = store.data;
if (fresh && generatedAdminPassword) {
  console.log('\n================ IT - World ================');
  console.log(' Erster Start – Administrator angelegt:');
  console.log(`   E-Mail:   ${adminEmail}`);
  console.log(`   Passwort: ${generatedAdminPassword}`);
  console.log(' Bitte nach dem ersten Login ändern.');
  console.log('============================================\n');
}

const sessions = new SessionStore(db.settings.sessionTimeoutMin * 60_000);
const loginLimiterIp = new RateLimiter({ windowMs: 15 * 60_000, max: 30 });
const loginLimiterAccount = new RateLimiter({ windowMs: 15 * 60_000, max: 6 });
const apiLimiter = new RateLimiter({ windowMs: 60_000, max: 600 });
const startedAt = Date.now();

// ---------- Hilfsfunktionen ----------
const ROLES = ['admin', 'ops', 'viewer'];
const ROLE_RANK = { viewer: 1, ops: 2, admin: 3 };
const SERVICE_STATUS = ['operational', 'degraded', 'down', 'maintenance'];
const SEVERITIES = ['SEV1', 'SEV2', 'SEV3', 'SEV4'];
const INCIDENT_STATUS = ['open', 'investigating', 'monitoring', 'resolved'];
const PRIORITIES = ['niedrig', 'mittel', 'hoch', 'kritisch'];
const TICKET_STATUS = ['offen', 'in Arbeit', 'wartend', 'erledigt'];
const ENVIRONMENTS = ['staging', 'production'];

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (msg) => new HttpError(400, msg);

function str(v, { max = 200, min = 0, name = 'Feld' } = {}) {
  if (typeof v !== 'string') throw bad(`${name} fehlt.`);
  const s = v.trim();
  if (s.length < min) throw bad(`${name} ist zu kurz.`);
  if (s.length > max) throw bad(`${name} ist zu lang (max. ${max} Zeichen).`);
  return s;
}
function optStr(v, opts) { return v === undefined || v === null ? undefined : str(v, opts); }
function oneOf(v, list, name) {
  if (!list.includes(v)) throw bad(`${name} ist ungültig.`);
  return v;
}
function email(v) {
  const s = str(v, { max: 160, name: 'E-Mail' }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw bad('E-Mail ist ungültig.');
  return s;
}
function findOr404(list, id, what) {
  const item = list.find(x => x.id === id);
  if (!item) throw new HttpError(404, `${what} nicht gefunden.`);
  return item;
}
function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active,
    createdAt: u.createdAt, lastLogin: u.lastLogin, mustChangePassword: !!u.mustChangePassword };
}
function clientIp(req) { return req.ip || req.socket.remoteAddress || '-'; }

function audit(req, action, target, details = '') {
  const u = req.user;
  db.audit.unshift({ id: uid('a_'), time: new Date().toISOString(), userId: u ? u.id : null,
    userName: u ? u.name : 'Anonym', action, target, details: String(details).slice(0, 500), ip: clientIp(req) });
  if (db.audit.length > 5000) db.audit.length = 5000; // Ringpuffer
  store.save();
}

function setSessionCookie(res, token, maxAgeSec) {
  const parts = [`${COOKIE_NAME}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAgeSec}`];
  if (COOKIE_SECURE) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

const wrap = fn => (req, res, next) => { try { const r = fn(req, res, next); if (r && r.catch) r.catch(next); } catch (e) { next(e); } };

// ---------- App & Middleware ----------
const app = express();
app.disable('x-powered-by');
if (TRUST_PROXY) app.set('trust proxy', TRUST_PROXY === 'true' ? 1 : TRUST_PROXY);
app.use(securityHeaders(IS_PROD));
app.use(express.json({ limit: '100kb' }));

// Health-Check für Load-Balancer/Kubernetes (ohne Login)
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', uptimeSec: Math.round((Date.now() - startedAt) / 1000), version: require('./package.json').version });
});

// Session auflösen
app.use((req, res, next) => {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  const s = sessions.get(token);
  if (s) {
    const u = db.users.find(x => x.id === s.userId && x.active);
    if (u) { req.user = u; req.sessionToken = token; } else sessions.destroy(token);
  }
  next();
});

// API: Rate-Limit + CSRF-Schutz für schreibende Anfragen
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!apiLimiter.hit(clientIp(req))) return next(new HttpError(429, 'Zu viele Anfragen. Bitte kurz warten.'));
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // Nur eigene Oberfläche: eigener Header (kann cross-origin nicht ohne CORS gesetzt werden) + Origin-Prüfung
    if (req.get('X-Requested-With') !== 'IT-World') return next(new HttpError(403, 'Ungültige Anfrage (CSRF).'));
    const origin = req.get('Origin');
    if (origin) {
      let host;
      try { host = new URL(origin).host; } catch { host = null; }
      if (host !== req.get('Host')) return next(new HttpError(403, 'Ungültige Herkunft (CSRF).'));
    }
  }
  next();
});

function requireAuth(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Bitte anmelden.'));
  next();
}
const requireRole = (min) => (req, res, next) => {
  if (!req.user) return next(new HttpError(401, 'Bitte anmelden.'));
  if (ROLE_RANK[req.user.role] < ROLE_RANK[min]) return next(new HttpError(403, 'Keine Berechtigung für diese Aktion.'));
  next();
};
// Wartungsmodus: nur Admins dürfen schreiben
function maintenanceGuard(req, res, next) {
  if (db.settings.maintenanceMode && req.method !== 'GET' && req.user && req.user.role !== 'admin') {
    return next(new HttpError(503, 'Wartungsmodus aktiv – Änderungen sind vorübergehend gesperrt.'));
  }
  next();
}

// ---------- Öffentliche Konfiguration & Auth ----------
app.get('/api/config', (req, res) => {
  res.json({
    companyName: db.settings.companyName,
    demo: DEMO,
    demoAccounts: DEMO ? DEMO_ACCOUNTS.map(({ email: e, password, role }) => ({ email: e, password, role })) : [],
  });
});

app.post('/api/auth/login', wrap((req, res) => {
  const ip = clientIp(req);
  const mail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!loginLimiterIp.hit(ip) || !loginLimiterAccount.hit(`${ip}|${mail}`)) {
    throw new HttpError(429, 'Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.');
  }
  const user = db.users.find(u => u.email === mail);
  // Immer hashen, damit die Antwortzeit nichts über existierende Konten verrät
  const ok = verifyPassword(password, user ? user.passwordHash : hashPassword('dummy-password-0'));
  if (!user || !ok || !user.active) {
    db.audit.unshift({ id: uid('a_'), time: new Date().toISOString(), userId: null, userName: mail || 'Unbekannt',
      action: 'auth.login_failed', target: 'Anmeldung', details: user && !user.active ? 'Konto deaktiviert' : 'Falsche Zugangsdaten', ip });
    store.save();
    throw new HttpError(401, 'E-Mail oder Passwort ist falsch.');
  }
  loginLimiterAccount.reset(`${ip}|${mail}`);
  user.lastLogin = new Date().toISOString();
  const token = sessions.create(user.id, { ip, userAgent: String(req.get('User-Agent') || '').slice(0, 200) });
  setSessionCookie(res, token, db.settings.sessionTimeoutMin * 60);
  req.user = user;
  audit(req, 'auth.login', 'Anmeldung', 'Erfolgreich angemeldet');
  res.json({ user: publicUser(user) });
}));

app.post('/api/auth/logout', (req, res) => {
  if (req.sessionToken) { audit(req, 'auth.logout', 'Anmeldung'); sessions.destroy(req.sessionToken); }
  setSessionCookie(res, '', 0);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user), settings: db.settings }));

app.post('/api/auth/password', requireAuth, wrap((req, res) => {
  const { current, next: nextPw } = req.body || {};
  if (!verifyPassword(current || '', req.user.passwordHash)) throw bad('Aktuelles Passwort ist falsch.');
  const problem = passwordProblem(nextPw);
  if (problem) throw bad(problem);
  req.user.passwordHash = hashPassword(nextPw);
  req.user.mustChangePassword = false;
  // Alle anderen Sessions dieses Benutzers beenden
  sessions.destroyForUser(req.user.id);
  const token = sessions.create(req.user.id, { ip: clientIp(req) });
  setSessionCookie(res, token, db.settings.sessionTimeoutMin * 60);
  audit(req, 'auth.password_changed', req.user.email);
  res.json({ ok: true });
}));

// Ab hier: alles nur mit Login
app.use('/api', requireAuth, maintenanceGuard);

// ---------- Übersicht ----------
app.get('/api/overview', (req, res) => {
  const now = Date.now();
  const live = db.services.map(s => ({ ...s, metrics: metrics.sample(s, now) }));
  const traffic = metrics.trafficLast24h(db.services, now);
  const openIncidents = db.incidents.filter(i => i.status !== 'resolved');
  const ticketsByStatus = Object.fromEntries(TICKET_STATUS.map(st => [st, db.tickets.filter(t => t.status === st).length]));
  const last30d = now - 30 * 86400_000;
  const deps30 = db.deployments.filter(d => Date.parse(d.createdAt) >= last30d && d.status !== 'läuft');
  const successRate = deps30.length ? deps30.filter(d => d.status === 'erfolgreich').length / deps30.length * 100 : 100;
  const operational = live.filter(s => s.status === 'operational').length;
  const avgLatency = live.filter(s => s.status !== 'down').reduce((a, s) => a + s.metrics.latency, 0) / Math.max(1, live.filter(s => s.status !== 'down').length);
  res.json({
    kpis: {
      servicesTotal: live.length,
      servicesOperational: operational,
      openIncidents: openIncidents.length,
      criticalIncidents: openIncidents.filter(i => i.severity === 'SEV1' || i.severity === 'SEV2').length,
      openTickets: db.tickets.filter(t => t.status !== 'erledigt').length,
      deploySuccessRate: +successRate.toFixed(1),
      requests24h: traffic.reduce((a, p) => a + p.requests, 0),
      avgLatency: Math.round(avgLatency),
      activeSessions: sessions.countActive(),
      users: db.users.filter(u => u.active).length,
    },
    traffic,
    ticketsByStatus,
    services: live.map(s => ({ id: s.id, name: s.name, status: s.status, region: s.region, metrics: s.metrics })),
    incidents: openIncidents.slice(0, 5),
    deployments: [...db.deployments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    serviceNames: Object.fromEntries(db.services.map(s => [s.id, s.name])),
  });
});

// ---------- Services / Monitoring ----------
app.get('/api/services', (req, res) => {
  const now = Date.now();
  res.json(db.services.map(s => ({ ...s, metrics: metrics.sample(s, now) })));
});

app.get('/api/services/:id/metrics', wrap((req, res) => {
  const s = findOr404(db.services, req.params.id, 'Service');
  const range = req.query.range === '24h' ? '24h' : '1h';
  res.json(range === '24h' ? metrics.history(s, 48, 30 * 60_000) : metrics.history(s, 60, 60_000));
}));

app.post('/api/services', requireRole('admin'), wrap((req, res) => {
  const b = req.body || {};
  const s = {
    id: uid('s_'), name: str(b.name, { max: 60, min: 2, name: 'Name' }), type: str(b.type || 'Microservice', { max: 40, name: 'Typ' }),
    region: str(b.region || 'eu-central-1', { max: 40, name: 'Region' }), version: str(b.version || 'v1.0.0', { max: 30, name: 'Version' }),
    status: 'operational', baseLatency: 20 + Math.round(Math.random() * 80), baseCpu: 15 + Math.round(Math.random() * 45),
    lastRestart: null, createdAt: new Date().toISOString(),
  };
  db.services.push(s);
  audit(req, 'service.created', s.name);
  res.status(201).json(s);
}));

app.patch('/api/services/:id', requireRole('ops'), wrap((req, res) => {
  const s = findOr404(db.services, req.params.id, 'Service');
  const b = req.body || {};
  const changes = [];
  if (b.status !== undefined) { s.status = oneOf(b.status, SERVICE_STATUS, 'Status'); changes.push(`Status → ${s.status}`); }
  if (b.version !== undefined) { s.version = str(b.version, { max: 30, name: 'Version' }); changes.push(`Version → ${s.version}`); }
  if (b.name !== undefined) { s.name = str(b.name, { max: 60, min: 2, name: 'Name' }); changes.push(`Name → ${s.name}`); }
  audit(req, 'service.updated', s.name, changes.join(', '));
  res.json(s);
}));

app.post('/api/services/:id/restart', requireRole('ops'), wrap((req, res) => {
  const s = findOr404(db.services, req.params.id, 'Service');
  s.lastRestart = new Date().toISOString();
  if (s.status === 'down' || s.status === 'degraded') s.status = 'operational';
  audit(req, 'service.restarted', s.name, 'Rolling Restart ausgelöst');
  res.json(s);
}));

app.delete('/api/services/:id', requireRole('admin'), wrap((req, res) => {
  const s = findOr404(db.services, req.params.id, 'Service');
  db.services = db.services.filter(x => x.id !== s.id);
  audit(req, 'service.deleted', s.name);
  res.json({ ok: true });
}));

// ---------- Incidents ----------
app.get('/api/incidents', (req, res) => {
  const { status } = req.query;
  let list = [...db.incidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (status === 'active') list = list.filter(i => i.status !== 'resolved');
  else if (INCIDENT_STATUS.includes(status)) list = list.filter(i => i.status === status);
  res.json(list);
});

app.post('/api/incidents', requireRole('ops'), wrap((req, res) => {
  const b = req.body || {};
  const serviceId = b.serviceId ? findOr404(db.services, b.serviceId, 'Service').id : null;
  const inc = {
    id: uid('i_'), title: str(b.title, { max: 120, min: 3, name: 'Titel' }), severity: oneOf(b.severity, SEVERITIES, 'Schweregrad'),
    status: 'open', serviceId, assignee: b.assignee ? findOr404(db.users, b.assignee, 'Benutzer').id : req.user.id,
    createdAt: new Date().toISOString(), resolvedAt: null,
    updates: [{ time: new Date().toISOString(), text: optStr(b.description, { max: 1000, name: 'Beschreibung' }) || 'Incident eröffnet.', by: req.user.name }],
  };
  db.incidents.push(inc);
  audit(req, 'incident.created', inc.title, inc.severity);
  res.status(201).json(inc);
}));

app.patch('/api/incidents/:id', requireRole('ops'), wrap((req, res) => {
  const inc = findOr404(db.incidents, req.params.id, 'Incident');
  const b = req.body || {};
  const changes = [];
  if (b.status !== undefined) {
    inc.status = oneOf(b.status, INCIDENT_STATUS, 'Status');
    inc.resolvedAt = inc.status === 'resolved' ? new Date().toISOString() : null;
    inc.updates.push({ time: new Date().toISOString(), text: `Status geändert: ${inc.status}`, by: req.user.name });
    changes.push(`Status → ${inc.status}`);
  }
  if (b.severity !== undefined) { inc.severity = oneOf(b.severity, SEVERITIES, 'Schweregrad'); changes.push(`Schweregrad → ${inc.severity}`); }
  if (b.assignee !== undefined) { inc.assignee = findOr404(db.users, b.assignee, 'Benutzer').id; changes.push('Zuständigkeit geändert'); }
  audit(req, 'incident.updated', inc.title, changes.join(', '));
  res.json(inc);
}));

app.post('/api/incidents/:id/updates', requireRole('ops'), wrap((req, res) => {
  const inc = findOr404(db.incidents, req.params.id, 'Incident');
  const text = str(req.body?.text, { max: 1000, min: 1, name: 'Update' });
  inc.updates.push({ time: new Date().toISOString(), text, by: req.user.name });
  audit(req, 'incident.update_posted', inc.title);
  res.status(201).json(inc);
}));

// ---------- Tickets ----------
app.get('/api/tickets', (req, res) => {
  const q = String(req.query.q || '').toLowerCase().slice(0, 100);
  let list = [...db.tickets].sort((a, b) => b.number - a.number);
  if (TICKET_STATUS.includes(req.query.status)) list = list.filter(t => t.status === req.query.status);
  if (PRIORITIES.includes(req.query.priority)) list = list.filter(t => t.priority === req.query.priority);
  if (req.query.mine === '1') list = list.filter(t => t.assignee === req.user.id);
  if (q) list = list.filter(t => `${t.number} ${t.title} ${t.description} ${t.requester}`.toLowerCase().includes(q));
  res.json(list);
});

app.post('/api/tickets', requireRole('ops'), wrap((req, res) => {
  const b = req.body || {};
  db.counters.ticket += 1;
  const now = new Date().toISOString();
  const t = {
    id: uid('t_'), number: db.counters.ticket, title: str(b.title, { max: 140, min: 3, name: 'Titel' }),
    description: optStr(b.description, { max: 4000, name: 'Beschreibung' }) || '',
    priority: oneOf(b.priority || 'mittel', PRIORITIES, 'Priorität'), status: 'offen',
    assignee: b.assignee ? findOr404(db.users, b.assignee, 'Benutzer').id : null,
    requester: optStr(b.requester, { max: 80, name: 'Anfragende Stelle' }) || req.user.name,
    createdAt: now, updatedAt: now, comments: [],
  };
  db.tickets.push(t);
  audit(req, 'ticket.created', `#${t.number} ${t.title}`, t.priority);
  res.status(201).json(t);
}));

app.patch('/api/tickets/:id', requireRole('ops'), wrap((req, res) => {
  const t = findOr404(db.tickets, req.params.id, 'Ticket');
  const b = req.body || {};
  const changes = [];
  if (b.title !== undefined) { t.title = str(b.title, { max: 140, min: 3, name: 'Titel' }); changes.push('Titel'); }
  if (b.description !== undefined) { t.description = str(b.description, { max: 4000, name: 'Beschreibung' }); changes.push('Beschreibung'); }
  if (b.priority !== undefined) { t.priority = oneOf(b.priority, PRIORITIES, 'Priorität'); changes.push(`Priorität → ${t.priority}`); }
  if (b.status !== undefined) { t.status = oneOf(b.status, TICKET_STATUS, 'Status'); changes.push(`Status → ${t.status}`); }
  if (b.assignee !== undefined) { t.assignee = b.assignee ? findOr404(db.users, b.assignee, 'Benutzer').id : null; changes.push('Zuständigkeit'); }
  t.updatedAt = new Date().toISOString();
  audit(req, 'ticket.updated', `#${t.number} ${t.title}`, changes.join(', '));
  res.json(t);
}));

app.post('/api/tickets/:id/comments', requireRole('ops'), wrap((req, res) => {
  const t = findOr404(db.tickets, req.params.id, 'Ticket');
  t.comments.push({ id: uid('c_'), time: new Date().toISOString(), by: req.user.name, text: str(req.body?.text, { max: 2000, min: 1, name: 'Kommentar' }) });
  t.updatedAt = new Date().toISOString();
  audit(req, 'ticket.commented', `#${t.number} ${t.title}`);
  res.status(201).json(t);
}));

app.delete('/api/tickets/:id', requireRole('admin'), wrap((req, res) => {
  const t = findOr404(db.tickets, req.params.id, 'Ticket');
  db.tickets = db.tickets.filter(x => x.id !== t.id);
  audit(req, 'ticket.deleted', `#${t.number} ${t.title}`);
  res.json({ ok: true });
}));

// ---------- Deployments ----------
app.get('/api/deployments', (req, res) => {
  let list = [...db.deployments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (ENVIRONMENTS.includes(req.query.environment)) list = list.filter(d => d.environment === req.query.environment);
  res.json(list);
});

app.post('/api/deployments', requireRole('ops'), wrap((req, res) => {
  const b = req.body || {};
  const s = findOr404(db.services, b.serviceId, 'Service');
  const d = {
    id: uid('d_'), serviceId: s.id, version: str(b.version, { max: 30, min: 1, name: 'Version' }),
    environment: oneOf(b.environment, ENVIRONMENTS, 'Umgebung'), status: 'läuft', by: req.user.name,
    createdAt: new Date().toISOString(), duration: null, notes: optStr(b.notes, { max: 300, name: 'Notiz' }) || '',
    previousVersion: s.version,
  };
  db.deployments.push(d);
  audit(req, 'deployment.started', `${s.name} ${d.version}`, d.environment);
  // Pipeline-Simulation: nach einigen Sekunden erfolgreich (ca. 90 %) oder fehlgeschlagen
  const started = Date.now();
  setTimeout(() => {
    if (d.status !== 'läuft') return;
    d.duration = Math.round((Date.now() - started) / 1000) + 60 + Math.round(Math.random() * 180);
    d.status = Math.random() < 0.9 ? 'erfolgreich' : 'fehlgeschlagen';
    const svc = db.services.find(x => x.id === d.serviceId);
    if (d.status === 'erfolgreich' && d.environment === 'production' && svc) svc.version = d.version;
    db.audit.unshift({ id: uid('a_'), time: new Date().toISOString(), userId: null, userName: 'CI/CD', action: `deployment.${d.status === 'erfolgreich' ? 'succeeded' : 'failed'}`,
      target: `${svc ? svc.name : 'Service'} ${d.version}`, details: d.environment, ip: '-' });
    store.save();
  }, 4000 + Math.random() * 4000).unref();
  res.status(201).json(d);
}));

app.post('/api/deployments/:id/rollback', requireRole('ops'), wrap((req, res) => {
  const d = findOr404(db.deployments, req.params.id, 'Deployment');
  if (d.status !== 'erfolgreich') throw bad('Nur erfolgreiche Deployments können zurückgerollt werden.');
  const s = db.services.find(x => x.id === d.serviceId);
  d.status = 'zurückgerollt';
  if (s && d.environment === 'production' && d.previousVersion) s.version = d.previousVersion;
  audit(req, 'deployment.rolled_back', `${s ? s.name : 'Service'} ${d.version}`, d.previousVersion ? `zurück auf ${d.previousVersion}` : '');
  res.json(d);
}));

// ---------- Benutzer (nur Admin) ----------
app.get('/api/users', (req, res) => {
  // Alle Rollen brauchen die Namensliste für Zuweisungen; Details nur für Admins
  if (req.user.role !== 'admin') return res.json(db.users.filter(u => u.active).map(u => ({ id: u.id, name: u.name, role: u.role })));
  res.json(db.users.map(publicUser));
});

app.post('/api/users', requireRole('admin'), wrap((req, res) => {
  const b = req.body || {};
  const mail = email(b.email);
  if (db.users.some(u => u.email === mail)) throw bad('Diese E-Mail ist bereits vergeben.');
  const problem = passwordProblem(b.password);
  if (problem) throw bad(problem);
  const u = { id: uid('u_'), name: str(b.name, { max: 80, min: 2, name: 'Name' }), email: mail, role: oneOf(b.role, ROLES, 'Rolle'),
    passwordHash: hashPassword(b.password), active: true, createdAt: new Date().toISOString(), lastLogin: null, mustChangePassword: true };
  db.users.push(u);
  audit(req, 'user.created', u.email, `Rolle: ${u.role}`);
  res.status(201).json(publicUser(u));
}));

function assertNotLastAdmin(target, nextRole, nextActive) {
  const remaining = db.users.filter(u => u.role === 'admin' && u.active && u.id !== target.id).length;
  const stillAdmin = (nextRole ?? target.role) === 'admin' && (nextActive ?? target.active);
  if (target.role === 'admin' && remaining === 0 && !stillAdmin) throw bad('Der letzte aktive Administrator kann nicht entfernt werden.');
}

app.patch('/api/users/:id', requireRole('admin'), wrap((req, res) => {
  const u = findOr404(db.users, req.params.id, 'Benutzer');
  const b = req.body || {};
  const role = b.role !== undefined ? oneOf(b.role, ROLES, 'Rolle') : undefined;
  const active = b.active !== undefined ? !!b.active : undefined;
  assertNotLastAdmin(u, role, active);
  const changes = [];
  if (b.name !== undefined) { u.name = str(b.name, { max: 80, min: 2, name: 'Name' }); changes.push('Name'); }
  if (role !== undefined && role !== u.role) { changes.push(`Rolle ${u.role} → ${role}`); u.role = role; }
  if (active !== undefined && active !== u.active) {
    u.active = active; changes.push(active ? 'aktiviert' : 'deaktiviert');
    if (!active) sessions.destroyForUser(u.id);
  }
  audit(req, 'user.updated', u.email, changes.join(', '));
  res.json(publicUser(u));
}));

app.post('/api/users/:id/reset-password', requireRole('admin'), wrap((req, res) => {
  const u = findOr404(db.users, req.params.id, 'Benutzer');
  const temp = crypto.randomBytes(9).toString('base64url') + '4k';
  u.passwordHash = hashPassword(temp);
  u.mustChangePassword = true;
  sessions.destroyForUser(u.id);
  audit(req, 'user.password_reset', u.email);
  res.json({ temporaryPassword: temp });
}));

app.delete('/api/users/:id', requireRole('admin'), wrap((req, res) => {
  const u = findOr404(db.users, req.params.id, 'Benutzer');
  if (u.id === req.user.id) throw bad('Du kannst dein eigenes Konto nicht löschen.');
  assertNotLastAdmin(u, 'viewer', false);
  db.users = db.users.filter(x => x.id !== u.id);
  sessions.destroyForUser(u.id);
  audit(req, 'user.deleted', u.email);
  res.json({ ok: true });
}));

// ---------- Audit-Log (nur Admin) ----------
app.get('/api/audit', requireRole('admin'), (req, res) => {
  const q = String(req.query.q || '').toLowerCase().slice(0, 100);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const size = Math.min(100, Math.max(10, parseInt(req.query.size, 10) || 25));
  let list = db.audit;
  if (req.query.action) list = list.filter(a => a.action.startsWith(String(req.query.action)));
  if (q) list = list.filter(a => `${a.userName} ${a.action} ${a.target} ${a.details} ${a.ip}`.toLowerCase().includes(q));
  res.json({ total: list.length, page, size, items: list.slice((page - 1) * size, page * size) });
});

// ---------- Einstellungen ----------
app.get('/api/settings', (req, res) => res.json(db.settings));

app.put('/api/settings', requireRole('admin'), wrap((req, res) => {
  const b = req.body || {};
  const s = db.settings;
  if (b.companyName !== undefined) s.companyName = str(b.companyName, { max: 60, min: 2, name: 'Firmenname' });
  if (b.alertEmail !== undefined) s.alertEmail = email(b.alertEmail);
  if (b.maintenanceMode !== undefined) s.maintenanceMode = !!b.maintenanceMode;
  if (b.sessionTimeoutMin !== undefined) {
    const n = Number(b.sessionTimeoutMin);
    if (!Number.isInteger(n) || n < 5 || n > 720) throw bad('Session-Timeout muss zwischen 5 und 720 Minuten liegen.');
    s.sessionTimeoutMin = n; sessions.ttlMs = n * 60_000;
  }
  if (b.uptimeTarget !== undefined) {
    const n = Number(b.uptimeTarget);
    if (!(n >= 90 && n <= 100)) throw bad('SLA-Ziel muss zwischen 90 und 100 % liegen.');
    s.uptimeTarget = n;
  }
  if (b.autoRefreshSec !== undefined) {
    const n = Number(b.autoRefreshSec);
    if (!Number.isInteger(n) || n < 5 || n > 300) throw bad('Aktualisierungsintervall muss zwischen 5 und 300 Sekunden liegen.');
    s.autoRefreshSec = n;
  }
  audit(req, 'settings.updated', 'Einstellungen', Object.keys(b).join(', '));
  res.json(s);
}));

// ---------- CSV-Export ----------
function toCsv(rows, columns) {
  const esc = (v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // CSV-Injection in Excel verhindern
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [columns.map(c => c[0]).join(';'), ...rows.map(r => columns.map(c => esc(c[1](r))).join(';'))].join('\r\n');
}
app.get('/api/export/:kind', requireRole('ops'), wrap((req, res) => {
  const userName = (id) => db.users.find(u => u.id === id)?.name || '';
  const svcName = (id) => db.services.find(s => s.id === id)?.name || '';
  const kinds = {
    tickets: () => toCsv(db.tickets, [['Nr', t => t.number], ['Titel', t => t.title], ['Priorität', t => t.priority], ['Status', t => t.status],
      ['Zuständig', t => userName(t.assignee)], ['Anfragende Stelle', t => t.requester], ['Erstellt', t => t.createdAt], ['Aktualisiert', t => t.updatedAt]]),
    incidents: () => toCsv(db.incidents, [['Titel', i => i.title], ['Schweregrad', i => i.severity], ['Status', i => i.status],
      ['Service', i => svcName(i.serviceId)], ['Zuständig', i => userName(i.assignee)], ['Erstellt', i => i.createdAt], ['Gelöst', i => i.resolvedAt]]),
    deployments: () => toCsv(db.deployments, [['Service', d => svcName(d.serviceId)], ['Version', d => d.version], ['Umgebung', d => d.environment],
      ['Status', d => d.status], ['Von', d => d.by], ['Zeitpunkt', d => d.createdAt], ['Dauer (s)', d => d.duration], ['Notiz', d => d.notes]]),
    audit: () => toCsv(db.audit, [['Zeit', a => a.time], ['Benutzer', a => a.userName], ['Aktion', a => a.action], ['Ziel', a => a.target],
      ['Details', a => a.details], ['IP', a => a.ip]]),
    users: () => toCsv(db.users, [['Name', u => u.name], ['E-Mail', u => u.email], ['Rolle', u => u.role], ['Aktiv', u => u.active ? 'ja' : 'nein'],
      ['Erstellt', u => u.createdAt], ['Letzter Login', u => u.lastLogin]]),
  };
  const kind = req.params.kind;
  if (!kinds[kind]) throw new HttpError(404, 'Unbekannter Export.');
  if ((kind === 'audit' || kind === 'users') && req.user.role !== 'admin') throw new HttpError(403, 'Keine Berechtigung für diesen Export.');
  audit(req, 'export.csv', kind);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="it-world-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(kinds[kind]());
}));

app.use('/api', (req, res, next) => next(new HttpError(404, 'Endpunkt nicht gefunden.')));

// ---------- Statische Oberfläche ----------
const PUBLIC = path.join(__dirname, 'public');
app.use(express.static(PUBLIC, { index: false, maxAge: IS_PROD ? '1h' : 0 }));
app.get('/login', (req, res) => res.sendFile(path.join(PUBLIC, 'login.html')));
app.get('/{*splat}', (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

// ---------- Fehlerbehandlung ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && IS_PROD ? 'Interner Serverfehler.' : err.message || 'Fehler' });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`IT - World Admin & Ops Dashboard läuft auf http://localhost:${PORT}${DEMO ? '  (Demo-Modus)' : ''}`);
});

// Sauberes Herunterfahren: ausstehende Änderungen sichern
function shutdown(sig) {
  console.log(`${sig} empfangen – speichere Daten und beende …`);
  try { store.saveNow(); } catch (e) { console.error(e); }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
