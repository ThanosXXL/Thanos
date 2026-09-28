'use strict';
/**
 * HTTP-Anwendung von IT - World: Routing, Authentifizierung, REST-API und statische Auslieferung.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ROLES, ROLE_LABELS, MODULES, RESOURCES, DEFAULT_SETTINGS } = require('./schema');
const { tx } = require('./db');
const auth = require('./auth');
const crud = require('./crud');
const mailer = require('./mailer');
const { toCsv, parseCsv } = require('./csv');
const {
  HttpError, bad, forbidden, notFound, parseCookies, readJson, send, sendJson, staticServer, clientIp, SECURITY_HEADERS,
} = require('./http');

const { round2, today } = crud;

// ------------------------------------------------------------------ Einstellungen
function deepMerge(base, over) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  if (!over || typeof over !== 'object') return out;
  for (const k of Object.keys(base)) {
    if (!(k in over)) continue;
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) out[k] = deepMerge(base[k], over[k]);
    else out[k] = over[k];
  }
  return out;
}

function loadSettings(db, tenantId) {
  const row = db.prepare('SELECT settings FROM tenants WHERE id = ?').get(tenantId);
  let stored = {};
  try { stored = JSON.parse(row ? row.settings : '{}'); } catch { /* Standardwerte */ }
  return deepMerge(DEFAULT_SETTINGS, stored);
}

/** Übernimmt nur bekannte Schlüssel mit dem Typ des Standardwerts. */
function sanitizeSettings(def, input, pfad = '') {
  const out = {};
  for (const [k, dv] of Object.entries(def)) {
    const v = input ? input[k] : undefined;
    if (dv && typeof dv === 'object') { out[k] = sanitizeSettings(dv, v, `${pfad}${k}.`); continue; }
    if (v === undefined) { out[k] = dv; continue; }
    if (typeof dv === 'boolean') out[k] = !!v;
    else if (typeof dv === 'number') {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 10000) throw bad(`Ungültiger Wert für ${pfad}${k}.`);
      out[k] = n;
    } else {
      const s = String(v ?? '').trim();
      if (s.length > 5000) throw bad(`Wert für ${pfad}${k} ist zu lang.`);
      if (pfad === 'social.' && s && !/^https:\/\//i.test(s)) throw bad('Social-Media-Links müssen mit https:// beginnen.');
      out[k] = s;
    }
  }
  return out;
}

function slugify(s) {
  const base = String(s).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return base || 'firma';
}

function uniqueSlug(db, name) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; db.prepare('SELECT 1 FROM tenants WHERE slug = ?').get(slug); i++) slug = `${base}-${i}`;
  return slug;
}

function createTenant(db, { firma, name, email, passwort, mussAendern = false }) {
  return tx(db, () => {
    const slug = uniqueSlug(db, firma);
    const settings = { firma: { name: firma, email } };
    const t = db.prepare('INSERT INTO tenants (slug, name, settings) VALUES (?, ?, ?)').run(slug, firma, JSON.stringify(settings));
    const tenantId = Number(t.lastInsertRowid);
    const u = db.prepare('INSERT INTO users (tenant_id, name, email, rolle, passwort, muss_passwort_aendern) VALUES (?, ?, ?, ?, ?, ?)')
      .run(tenantId, name, email, 'admin', auth.hashPassword(passwort), mussAendern ? 1 : 0);
    return { tenantId, userId: Number(u.lastInsertRowid), slug };
  });
}

// ------------------------------------------------------------------ Router
function createApp(db, options = {}) {
  const publicDir = options.publicDir || path.join(__dirname, '..', 'public');
  const uploadDir = options.uploadDir || path.join(path.dirname(options.dbFile || path.join(__dirname, '..', 'data', 'x')), 'uploads');
  const allowRegistration = options.allowRegistration ?? process.env.ALLOW_REGISTRATION !== 'false';
  const serveStatic = staticServer(publicDir);
  const loginLimiter = auth.rateLimiter(10, 15 * 60 * 1000);
  const formLimiter = auth.rateLimiter(5, 10 * 60 * 1000);
  const registerLimiter = auth.rateLimiter(5, 60 * 60 * 1000);
  const routes = [];
  const route = (method, pattern, handler, opts = {}) => {
    const keys = [];
    const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
    routes.push({ method, re, keys, handler, auth: opts.auth !== false, roles: opts.roles, bodyLimit: opts.bodyLimit });
  };

  function context(user) {
    const tenant = db.prepare('SELECT id, slug, name FROM tenants WHERE id = ?').get(user.tenant_id);
    return { db, user, tenant, settings: loadSettings(db, user.tenant_id) };
  }
  function systemContext(tenantRow, name) {
    return { db, user: { id: null, name, rolle: 'admin' }, tenant: tenantRow, settings: loadSettings(db, tenantRow.id) };
  }

  function sessionCookie(req, token, maxAge) {
    const secure = process.env.COOKIE_SECURE === 'true'
      || (process.env.TRUST_PROXY === 'true' && req.headers['x-forwarded-proto'] === 'https');
    return `${auth.SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
  }

  function mePayload(ctx) {
    const perms = {};
    for (const [k, spec] of Object.entries(RESOURCES)) perms[k] = { read: crud.canRead(ctx, spec), write: crud.canWrite(ctx, spec) };
    return {
      user: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email, rolle: ctx.user.rolle, mussPasswortAendern: !!ctx.user.muss_passwort_aendern },
      tenant: ctx.tenant,
      settings: ctx.settings,
      perms,
      meta: { resources: RESOURCES, modules: MODULES, roles: ROLES, roleLabels: ROLE_LABELS },
      smtp: !!mailer.config(),
    };
  }

  // ================================================================= Öffentlich
  route('GET', '/api/health', () => ({ ok: true, zeit: new Date().toISOString() }), { auth: false });
  route('GET', '/api/public/info', () => ({ registrierung: allowRegistration }), { auth: false });

  route('POST', '/api/auth/login', async ({ req, res, body }) => {
    const ip = clientIp(req);
    if (!loginLimiter.hit(ip)) throw new HttpError(429, 'Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.');
    const email = String(body.email || '').trim();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    // Auch bei unbekannter E-Mail hashen, damit die Antwortzeit nichts verrät
    const ok = user ? auth.verifyPassword(body.passwort || '', user.passwort) : (auth.verifyPassword('x', auth.hashPassword('y')), false);
    if (!ok) throw new HttpError(401, 'E-Mail oder Passwort ist falsch.');
    if (!user.aktiv) throw new HttpError(403, 'Dieses Benutzerkonto ist deaktiviert.');
    loginLimiter.reset(ip);
    const token = auth.createSession(db, user.id);
    db.prepare("UPDATE users SET letzter_login = datetime('now') WHERE id = ?").run(user.id);
    const ctx = context(user);
    crud.log(ctx, 'angemeldet', null, null, user.email);
    res.setHeader('Set-Cookie', sessionCookie(req, token, auth.SESSION_TTL_MS / 1000));
    return mePayload(ctx);
  }, { auth: false });

  route('POST', '/api/auth/register', async ({ req, res, body }) => {
    if (!allowRegistration) throw forbidden('Die Registrierung ist auf diesem Server deaktiviert.');
    if (!registerLimiter.hit(clientIp(req))) throw new HttpError(429, 'Zu viele Registrierungen. Bitte später erneut versuchen.');
    const firma = String(body.firma || '').trim();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    if (!firma || firma.length > 120) throw bad('Bitte einen Firmennamen angeben.');
    if (!name || name.length > 120) throw bad('Bitte Ihren Namen angeben.');
    crud.coerce({ name: 'email', label: 'E-Mail', type: 'email', required: true }, email);
    const pwErr = auth.passwordProblem(body.passwort);
    if (pwErr) throw bad(pwErr);
    if (!body.agb) throw bad('Bitte den Nutzungsbedingungen und der Datenschutzerklärung zustimmen.');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw bad('Diese E-Mail-Adresse ist bereits registriert.');
    const { userId } = createTenant(db, { firma, name, email, passwort: body.passwort });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const ctx = context(user);
    crud.log(ctx, 'registriert', null, null, firma);
    res.setHeader('Set-Cookie', sessionCookie(req, auth.createSession(db, userId), auth.SESSION_TTL_MS / 1000));
    return mePayload(ctx);
  }, { auth: false });

  route('POST', '/api/auth/logout', ({ req, res }) => {
    auth.destroySession(db, parseCookies(req)[auth.SESSION_COOKIE]);
    res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
    return { ok: true };
  }, { auth: false });

  // Öffentliches Anfrage-/Anmeldeformular mit Autoresponder
  route('GET', '/api/public/form/:slug', ({ params }) => {
    const t = db.prepare('SELECT id, slug, name FROM tenants WHERE slug = ?').get(params.slug);
    if (!t) throw notFound('Formular nicht gefunden.');
    const s = loadSettings(db, t.id);
    return { firma: s.firma.name, zusatz: s.firma.zusatz, website: s.firma.website, social: s.social };
  }, { auth: false });

  route('POST', '/api/public/form/:slug', ({ req, params, body }) => {
    const t = db.prepare('SELECT id, slug, name FROM tenants WHERE slug = ?').get(params.slug);
    if (!t) throw notFound('Formular nicht gefunden.');
    if (body.website2) return { ok: true }; // Honeypot: Bots stillschweigend ignorieren
    if (!formLimiter.hit(`${clientIp(req)}:${t.id}`)) throw new HttpError(429, 'Zu viele Anfragen. Bitte später erneut versuchen.');
    const ctx = systemContext(t, 'Webformular');
    const name = String(body.name || '').trim().slice(0, 120);
    const firma = String(body.firma || '').trim().slice(0, 200);
    const nachricht = String(body.nachricht || '').trim().slice(0, 5000);
    if (!name) throw bad('Bitte Ihren Namen angeben.');
    const email = crud.coerce({ name: 'email', label: 'E-Mail', type: 'email', required: true }, body.email);
    const telefon = body.telefon ? crud.coerce({ name: 'telefon', label: 'Telefon', type: 'tel' }, body.telefon) : null;
    if (!body.einwilligung) throw bad('Bitte der Verarbeitung Ihrer Daten zustimmen.');
    const interesse = ['Beratung', 'Webentwicklung', 'IT-Support', 'Cloud & Hosting', 'Software-Lizenzen', 'Sonstiges'].includes(body.interesse) ? body.interesse : 'Sonstiges';
    tx(db, () => {
      const kunde = crud.create(ctx, 'kunden', {
        name: firma || name, typ: firma ? 'Firma' : 'Privatperson', status: 'Lead', quelle: 'Formular', email, telefon,
        notizen: `Anfrage über Webformular (${interesse}):\n${nachricht}`,
      }, { system: true });
      const [vorname, ...rest] = name.split(/\s+/);
      crud.create(ctx, 'kontakte', { vorname, nachname: rest.join(' ') || '-', kunde_id: kunde.id, email, telefon }, { system: true });
      crud.create(ctx, 'deals', { titel: `Webanfrage: ${interesse}`, kunde_id: kunde.id, phase: 'Neu', wahrscheinlichkeit: 10, notizen: nachricht }, { system: true });
    });
    const fill = (tpl) => String(tpl).replace(/\{\{firma\}\}/g, ctx.settings.firma.name).replace(/\{\{name\}\}/g, name);
    const ar = ctx.settings.autoresponder;
    if (ar.aktiv) {
      mailer.queue(db, t.id, { to: email, subject: fill(ar.betreff), text: fill(ar.text), bezug: 'Autoresponder', fromName: ctx.settings.firma.name });
    }
    if (ar.benachrichtigung && ctx.settings.firma.email) {
      mailer.queue(db, t.id, {
        to: ctx.settings.firma.email, subject: `Neue Webanfrage: ${name}`, bezug: 'Benachrichtigung',
        text: `Neue Anfrage über das Webformular\n\nName: ${name}\nFirma: ${firma || '-'}\nE-Mail: ${email}\nTelefon: ${telefon || '-'}\nInteresse: ${interesse}\n\n${nachricht}`,
      });
    }
    return { ok: true };
  }, { auth: false });

  // ================================================================= Konto
  route('GET', '/api/auth/me', ({ ctx }) => mePayload(ctx));

  route('POST', '/api/auth/passwort', ({ ctx, body }) => {
    const u = db.prepare('SELECT passwort FROM users WHERE id = ?').get(ctx.user.id);
    if (!auth.verifyPassword(body.alt || '', u.passwort)) throw bad('Das aktuelle Passwort ist falsch.');
    const err = auth.passwordProblem(body.neu);
    if (err) throw bad(err);
    if (body.neu === body.alt) throw bad('Das neue Passwort muss sich vom alten unterscheiden.');
    db.prepare('UPDATE users SET passwort = ?, muss_passwort_aendern = 0 WHERE id = ?').run(auth.hashPassword(body.neu), ctx.user.id);
    crud.log(ctx, 'Passwort geändert', null, null, ctx.user.email);
    return { ok: true };
  });

  route('PUT', '/api/profil', ({ ctx, body }) => {
    const name = String(body.name || '').trim();
    if (!name || name.length > 120) throw bad('Bitte einen Namen angeben.');
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, ctx.user.id);
    return { ok: true };
  });

  // ================================================================= Benutzer (Admin)
  const userCols = 'id, name, email, rolle, aktiv, muss_passwort_aendern, letzter_login, created_at';
  route('GET', '/api/benutzer', ({ ctx }) => db.prepare(`SELECT ${userCols} FROM users WHERE tenant_id = ? ORDER BY name`).all(ctx.tenant.id)
    .map((u) => ({ ...u, aktiv: !!u.aktiv })), { roles: ['admin'] });

  function validateUser(body, isNew) {
    const out = {};
    if (isNew || body.name !== undefined) {
      out.name = String(body.name || '').trim();
      if (!out.name || out.name.length > 120) throw bad('Bitte einen Namen angeben.');
    }
    if (isNew || body.email !== undefined) out.email = crud.coerce({ name: 'email', label: 'E-Mail', type: 'email', required: true }, body.email);
    if (isNew || body.rolle !== undefined) {
      if (!ROLES.includes(body.rolle)) throw bad('Ungültige Rolle.');
      out.rolle = body.rolle;
    }
    if (body.aktiv !== undefined) out.aktiv = body.aktiv ? 1 : 0;
    if (isNew || body.passwort) {
      const err = auth.passwordProblem(body.passwort);
      if (err) throw bad(err);
      out.passwort = auth.hashPassword(body.passwort);
      out.muss_passwort_aendern = 1;
    }
    return out;
  }

  route('POST', '/api/benutzer', ({ ctx, body }) => {
    const data = validateUser(body, true);
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email)) throw bad('Diese E-Mail-Adresse ist bereits vergeben.');
    const info = db.prepare('INSERT INTO users (tenant_id, name, email, rolle, passwort, aktiv, muss_passwort_aendern) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(ctx.tenant.id, data.name, data.email, data.rolle, data.passwort, data.aktiv ?? 1);
    crud.log(ctx, 'Benutzer angelegt', 'benutzer', Number(info.lastInsertRowid), data.email, ROLE_LABELS[data.rolle]);
    return db.prepare(`SELECT ${userCols} FROM users WHERE id = ?`).get(Number(info.lastInsertRowid));
  }, { roles: ['admin'] });

  function lastAdminGuard(ctx, id, data) {
    const target = db.prepare('SELECT rolle, aktiv FROM users WHERE id = ? AND tenant_id = ?').get(id, ctx.tenant.id);
    if (!target) throw notFound('Benutzer nicht gefunden.');
    const losesAdmin = target.rolle === 'admin' && target.aktiv && (data === null || (data.rolle && data.rolle !== 'admin') || data.aktiv === 0);
    if (losesAdmin) {
      const admins = db.prepare("SELECT COUNT(*) AS n FROM users WHERE tenant_id = ? AND rolle = 'admin' AND aktiv = 1").get(ctx.tenant.id).n;
      if (admins <= 1) throw bad('Es muss mindestens ein aktiver Administrator bestehen bleiben.');
    }
  }

  route('PUT', '/api/benutzer/:id', ({ ctx, params, body }) => {
    const id = Number(params.id);
    const data = validateUser(body, false);
    lastAdminGuard(ctx, id, data);
    if (data.email && db.prepare('SELECT 1 FROM users WHERE email = ? AND id <> ?').get(data.email, id)) throw bad('Diese E-Mail-Adresse ist bereits vergeben.');
    const cols = Object.keys(data);
    if (cols.length) db.prepare(`UPDATE users SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ? AND tenant_id = ?`).run(...cols.map((c) => data[c]), id, ctx.tenant.id);
    if (data.aktiv === 0 || data.passwort) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    crud.log(ctx, 'Benutzer geändert', 'benutzer', id, data.email || '', cols.filter((c) => c !== 'passwort').join(', ') + (data.passwort ? ', Passwort zurückgesetzt' : ''));
    return db.prepare(`SELECT ${userCols} FROM users WHERE id = ?`).get(id);
  }, { roles: ['admin'] });

  route('DELETE', '/api/benutzer/:id', ({ ctx, params }) => {
    const id = Number(params.id);
    if (id === ctx.user.id) throw bad('Sie können Ihr eigenes Konto nicht löschen.');
    lastAdminGuard(ctx, id, null);
    const u = db.prepare('SELECT email FROM users WHERE id = ? AND tenant_id = ?').get(id, ctx.tenant.id);
    db.prepare('DELETE FROM users WHERE id = ? AND tenant_id = ?').run(id, ctx.tenant.id);
    crud.log(ctx, 'Benutzer gelöscht', 'benutzer', id, u && u.email);
    return { ok: true };
  }, { roles: ['admin'] });

  // ================================================================= Einstellungen
  route('GET', '/api/einstellungen', ({ ctx }) => ({ settings: ctx.settings, slug: ctx.tenant.slug, smtp: !!mailer.config() }));
  route('PUT', '/api/einstellungen', ({ ctx, body }) => {
    const clean = sanitizeSettings(DEFAULT_SETTINGS, deepMerge(ctx.settings, body));
    db.prepare('UPDATE tenants SET settings = ?, name = ? WHERE id = ?').run(JSON.stringify(clean), clean.firma.name || ctx.tenant.name, ctx.tenant.id);
    crud.log(ctx, 'Einstellungen geändert', null, null, Object.keys(body || {}).join(', '));
    return { settings: clean };
  }, { roles: ['admin'] });

  route('GET', '/api/backup', ({ ctx, res }) => {
    const out = { exportiert: new Date().toISOString(), mandant: ctx.tenant, einstellungen: ctx.settings, daten: {} };
    const tables = [...new Set(Object.values(RESOURCES).map((s) => s.table)), 'activity', 'kommentare', 'emails', 'lagerbewegungen'];
    for (const t of tables) out.daten[t] = db.prepare(`SELECT * FROM "${t}" WHERE tenant_id = ?`).all(ctx.tenant.id);
    out.daten.users = db.prepare(`SELECT ${userCols} FROM users WHERE tenant_id = ?`).all(ctx.tenant.id);
    crud.log(ctx, 'Datensicherung exportiert', null, null, null);
    res.setHeader('Content-Disposition', `attachment; filename="it-world-backup-${today()}.json"`);
    return out;
  }, { roles: ['admin'] });

  // ================================================================= Generische Ressourcen
  route('GET', '/api/r/:res', ({ ctx, params, query }) => crud.list(ctx, params.res, query));
  route('GET', '/api/r/:res/export.csv', ({ ctx, params, query, res }) => {
    const spec = crud.getSpec(params.res);
    const { items } = crud.list(ctx, params.res, { ...query, limit: 'alle', page: 1 });
    const fields = spec.fields.filter((f) => !f.hidden && f.type !== 'json');
    const rows = items.map((it) => fields.map((f) => {
      const v = it[f.name];
      if (f.type === 'ref') return it[`${f.name}__label`] || '';
      if (f.type === 'bool') return v ? 'Ja' : 'Nein';
      return v;
    }));
    crud.log(ctx, 'exportiert', params.res, null, `${items.length} Datensätze (CSV)`);
    send(res, 200, toCsv(fields.map((f) => f.label), rows), {
      'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${params.res}-${today()}.csv"`,
    });
    return undefined;
  });

  route('POST', '/api/r/:res/import', ({ ctx, params, body }) => {
    const spec = crud.getSpec(params.res);
    if (!spec.importable) throw bad('Für diesen Bereich ist kein Import vorgesehen.');
    crud.assertWrite(ctx, spec);
    const rows = parseCsv(String(body.csv || ''));
    if (rows.length < 2) throw bad('Die CSV-Datei enthält keine Datenzeilen.');
    if (rows.length > 5001) throw bad('Höchstens 5000 Zeilen pro Import.');
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const map = header.map((h) => spec.fields.find((f) => !f.readonly && !f.hidden && (f.name.toLowerCase() === h || f.label.toLowerCase() === h)));
    if (!map.some(Boolean)) throw bad('Keine Spalte konnte einem Feld zugeordnet werden. Tipp: Spaltennamen wie im CSV-Export verwenden.');
    const refCache = {};
    const resolveRef = (f, v) => {
      if (/^\d+$/.test(v)) return Number(v);
      refCache[f.ref] = refCache[f.ref] || new Map(crud.options(ctx, f.ref, '').map((o) => [o.label.toLowerCase(), o.id]));
      const hit = [...refCache[f.ref]].find(([label]) => label === v.toLowerCase() || label.endsWith(` · ${v.toLowerCase()}`));
      return hit ? hit[1] : null;
    };
    let ok = 0;
    const fehler = [];
    for (let i = 1; i < rows.length; i++) {
      const input = {};
      map.forEach((f, j) => {
        if (!f) return;
        let v = (rows[i][j] ?? '').trim();
        if (v.startsWith("'") && /^'[=+\-@]/.test(v)) v = v.slice(1);
        if (f.type === 'ref') input[f.name] = v ? resolveRef(f, v) : null;
        else if (f.type === 'date' && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(v)) {
          const [d, m, y] = v.split('.');
          input[f.name] = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else input[f.name] = v;
      });
      try {
        crud.create(ctx, params.res, input);
        ok++;
      } catch (e) {
        fehler.push(`Zeile ${i + 1}: ${e.message}`);
        if (fehler.length > 50) break;
      }
    }
    return { importiert: ok, fehler };
  });

  route('GET', '/api/r/:res/:id', ({ ctx, params }) => crud.get(ctx, params.res, params.id));
  route('POST', '/api/r/:res', ({ ctx, params, body }) => crud.create(ctx, params.res, body));
  route('PUT', '/api/r/:res/:id', ({ ctx, params, body }) => crud.update(ctx, params.res, params.id, body));
  route('DELETE', '/api/r/:res/:id', ({ ctx, params }) => crud.remove(ctx, params.res, params.id));
  route('GET', '/api/options/:res', ({ ctx, params, query }) => crud.options(ctx, params.res, query.q || ''));

  route('POST', '/api/r/:res/:id/umwandeln', ({ ctx, params, body }) => crud.convert(ctx, params.res, params.id, body.ziel));

  route('POST', '/api/r/:res/:id/email', ({ ctx, params, body }) => {
    const spec = crud.getSpec(params.res);
    if (!spec.beleg) throw bad('Nur Belege können per E-Mail versendet werden.');
    crud.assertWrite(ctx, spec);
    const beleg = crud.get(ctx, params.res, params.id);
    const to = crud.coerce({ name: 'an', label: 'Empfänger', type: 'email', required: true }, body.an);
    const subject = String(body.betreff || '').trim().slice(0, 300) || `${spec.singular} ${beleg.nummer}`;
    const text = String(body.text || '').slice(0, 20000);
    const id = mailer.queue(db, ctx.tenant.id, { to, subject, text, bezug: `${spec.singular} ${beleg.nummer}`, fromName: ctx.settings.firma.name });
    if (params.res === 'angebote' && beleg.status === 'Entwurf') crud.update(ctx, params.res, beleg.id, { status: 'Versendet' });
    if (params.res === 'rechnungen' && beleg.status === 'Entwurf') crud.update(ctx, params.res, beleg.id, { status: 'Offen' });
    crud.log(ctx, 'per E-Mail versendet', params.res, beleg.id, beleg.__title, to);
    return { ok: true, emailId: id };
  });

  // Projektzeiten abrechnen → Rechnung
  route('POST', '/api/projekte/:id/abrechnen', ({ ctx, params }) => {
    crud.assertWrite(ctx, crud.getSpec('rechnungen'));
    const projekt = crud.get(ctx, 'projekte', params.id);
    if (!projekt.kunde_id) throw bad('Dem Projekt ist kein Kunde zugeordnet.');
    const zeiten = db.prepare('SELECT * FROM zeiten WHERE tenant_id = ? AND projekt_id = ? AND abrechenbar = 1 AND COALESCE(abgerechnet, 0) = 0 ORDER BY datum')
      .all(ctx.tenant.id, projekt.id);
    if (!zeiten.length) throw bad('Es gibt keine offenen abrechenbaren Zeiten für dieses Projekt.');
    return tx(db, () => {
      const rechnung = crud.create(ctx, 'rechnungen', {
        kunde_id: projekt.kunde_id, projekt_id: projekt.id, betreff: `Leistungen Projekt ${projekt.nummer} ${projekt.name}`,
        einleitung: ctx.settings.texte.rechnungEinleitung,
        positionen: zeiten.map((z) => ({
          bezeichnung: `${z.datum.split('-').reverse().join('.')}: ${z.beschreibung}`, menge: z.stunden, einheit: 'Std',
          preis: projekt.stundensatz || 0, mwst: ctx.settings.finanzen.mwst, rabatt: 0,
        })),
      });
      db.prepare(`UPDATE zeiten SET abgerechnet = 1, updated_at = datetime('now') WHERE tenant_id = ? AND id IN (${zeiten.map(() => '?').join(',')})`)
        .run(ctx.tenant.id, ...zeiten.map((z) => z.id));
      crud.log(ctx, 'Zeiten abgerechnet', 'projekte', projekt.id, projekt.__title, `${zeiten.length} Einträge → ${rechnung.nummer}`);
      return rechnung;
    });
  });

  // Lagerbewegungen
  route('GET', '/api/produkte/:id/lager', ({ ctx, params }) => {
    crud.get(ctx, 'produkte', params.id);
    return db.prepare('SELECT * FROM lagerbewegungen WHERE tenant_id = ? AND produkt_id = ? ORDER BY id DESC LIMIT 200').all(ctx.tenant.id, Number(params.id));
  });
  route('POST', '/api/produkte/:id/lager', ({ ctx, params, body }) => {
    crud.assertWrite(ctx, crud.getSpec('produkte'));
    const p = crud.get(ctx, 'produkte', params.id);
    const menge = Number(body.menge);
    if (!Number.isInteger(menge) || menge === 0 || Math.abs(menge) > 1e6) throw bad('Bitte eine ganzzahlige Menge ungleich 0 angeben.');
    const grund = ['Wareneingang', 'Inventur-Korrektur', 'Schwund / Defekt', 'Rücksendung', 'Eigenbedarf'].includes(body.grund) ? body.grund : 'Korrektur';
    tx(db, () => {
      db.prepare("UPDATE produkte SET bestand = COALESCE(bestand, 0) + ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?").run(menge, p.id, ctx.tenant.id);
      db.prepare('INSERT INTO lagerbewegungen (tenant_id, produkt_id, menge, grund, user_name) VALUES (?, ?, ?, ?, ?)').run(ctx.tenant.id, p.id, menge, grund, ctx.user.name);
      crud.log(ctx, 'Lager gebucht', 'produkte', p.id, p.__title, `${menge > 0 ? '+' : ''}${menge} (${grund})`);
    });
    return crud.get(ctx, 'produkte', p.id);
  });

  // Dokumente (Upload / Download)
  route('POST', '/api/dokumente/upload', ({ ctx, body }) => {
    const spec = crud.getSpec('dokumente');
    crud.assertWrite(ctx, spec);
    const dateiName = String(body.datei_name || '').replace(/[\\/\0<>:"|?*\x00-\x1f]/g, '_').trim().slice(0, 200);
    if (!dateiName) throw bad('Dateiname fehlt.');
    const buf = Buffer.from(String(body.data || ''), 'base64');
    if (!buf.length) throw bad('Die Datei ist leer.');
    if (buf.length > 15 * 1024 * 1024) throw bad('Dateien dürfen höchstens 15 MB groß sein.');
    const dir = path.join(uploadDir, String(ctx.tenant.id));
    fs.mkdirSync(dir, { recursive: true });
    const pfad = path.join(dir, `${crypto.randomUUID()}${path.extname(dateiName).replace(/[^.\w]/g, '').slice(0, 10)}`);
    fs.writeFileSync(pfad, buf);
    try {
      return crud.create(ctx, 'dokumente', { name: body.name || dateiName, kategorie: body.kategorie, kunde_id: body.kunde_id, projekt_id: body.projekt_id, notizen: body.notizen }, {
        system: true,
        extra: { datei_name: dateiName, mime: String(body.mime || 'application/octet-stream').slice(0, 100), groesse: buf.length, pfad },
      });
    } catch (e) {
      fs.promises.unlink(pfad).catch(() => {});
      throw e;
    }
  }, { bodyLimit: 22 * 1024 * 1024 });

  route('GET', '/api/dokumente/:id/download', ({ ctx, params, res, query }) => {
    const spec = crud.getSpec('dokumente');
    crud.assertRead(ctx, spec);
    const doc = crud.rawGet(ctx, spec, params.id);
    if (!doc || !doc.pfad || !fs.existsSync(doc.pfad)) throw notFound('Datei nicht gefunden.');
    const inlineOk = query.ansicht === '1' && /^(image\/(png|jpeg|gif|webp)|application\/pdf)$/.test(doc.mime);
    send(res, 200, fs.readFileSync(doc.pfad), {
      'Content-Type': inlineOk ? doc.mime : 'application/octet-stream',
      'Content-Disposition': `${inlineOk ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(doc.datei_name)}`,
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    });
    return undefined;
  });

  // ================================================================= Kommentare & Aktivitäten
  function assertRecordAccess(ctx, resource, id) {
    crud.get(ctx, resource, id); // wirft 403/404, wenn nicht lesbar
  }
  route('GET', '/api/kommentare', ({ ctx, query }) => {
    assertRecordAccess(ctx, query.resource, query.id);
    return db.prepare('SELECT * FROM kommentare WHERE tenant_id = ? AND resource = ? AND record_id = ? ORDER BY id DESC').all(ctx.tenant.id, query.resource, Number(query.id));
  });
  route('POST', '/api/kommentare', ({ ctx, body }) => {
    if (ctx.user.rolle === 'lesezugriff') throw forbidden();
    assertRecordAccess(ctx, body.resource, body.id);
    const text = String(body.text || '').trim();
    if (!text || text.length > 5000) throw bad('Bitte einen Kommentar (max. 5000 Zeichen) eingeben.');
    const info = db.prepare('INSERT INTO kommentare (tenant_id, resource, record_id, user_id, user_name, text) VALUES (?, ?, ?, ?, ?, ?)')
      .run(ctx.tenant.id, body.resource, Number(body.id), ctx.user.id, ctx.user.name, text);
    return db.prepare('SELECT * FROM kommentare WHERE id = ?').get(Number(info.lastInsertRowid));
  });
  route('DELETE', '/api/kommentare/:id', ({ ctx, params }) => {
    const k = db.prepare('SELECT * FROM kommentare WHERE id = ? AND tenant_id = ?').get(Number(params.id), ctx.tenant.id);
    if (!k) throw notFound();
    if (k.user_id !== ctx.user.id && ctx.user.rolle !== 'admin') throw forbidden('Nur eigene Kommentare können gelöscht werden.');
    db.prepare('DELETE FROM kommentare WHERE id = ?').run(k.id);
    return { ok: true };
  });

  route('GET', '/api/aktivitaeten', ({ ctx, query }) => {
    if (query.resource) {
      assertRecordAccess(ctx, query.resource, query.id);
      return { items: db.prepare('SELECT * FROM activity WHERE tenant_id = ? AND resource = ? AND record_id = ? ORDER BY id DESC LIMIT 100').all(ctx.tenant.id, query.resource, Number(query.id)) };
    }
    if (!['admin', 'manager'].includes(ctx.user.rolle)) throw forbidden();
    const limit = 50;
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const params = [ctx.tenant.id];
    let where = 'tenant_id = ?';
    if (query.q) { where += ' AND (titel LIKE ? OR user_name LIKE ? OR aktion LIKE ? OR details LIKE ?)'; const l = `%${query.q}%`; params.push(l, l, l, l); }
    const total = db.prepare(`SELECT COUNT(*) AS n FROM activity WHERE ${where}`).get(...params).n;
    const items = db.prepare(`SELECT * FROM activity WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit);
    return { items, total, page, limit };
  });

  // ================================================================= Postausgang
  route('GET', '/api/emails', ({ ctx, query }) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const total = db.prepare('SELECT COUNT(*) AS n FROM emails WHERE tenant_id = ?').get(ctx.tenant.id).n;
    const items = db.prepare('SELECT * FROM emails WHERE tenant_id = ? ORDER BY id DESC LIMIT 50 OFFSET ?').all(ctx.tenant.id, (page - 1) * 50);
    return { items, total, page, limit: 50, smtp: !!mailer.config() };
  }, { roles: ['admin', 'manager'] });
  route('POST', '/api/emails', ({ ctx, body }) => {
    const to = crud.coerce({ name: 'an', label: 'Empfänger', type: 'email', required: true }, body.an);
    const subject = String(body.betreff || '').trim().slice(0, 300);
    if (!subject) throw bad('Bitte einen Betreff angeben.');
    const id = mailer.queue(db, ctx.tenant.id, { to, subject, text: String(body.text || '').slice(0, 20000), bezug: body.bezug ? String(body.bezug).slice(0, 200) : 'Manuell', fromName: ctx.settings.firma.name });
    crud.log(ctx, 'E-Mail versendet', null, null, subject, to);
    return { ok: true, id };
  }, { roles: ['admin', 'manager', 'mitarbeiter'] });
  route('POST', '/api/emails/:id/erneut', ({ ctx, params }) => {
    const m = db.prepare('SELECT * FROM emails WHERE id = ? AND tenant_id = ?').get(Number(params.id), ctx.tenant.id);
    if (!m) throw notFound();
    const id = mailer.queue(db, ctx.tenant.id, { to: m.an, subject: m.betreff, text: m.text, bezug: m.bezug, fromName: ctx.settings.firma.name });
    return { ok: true, id };
  }, { roles: ['admin', 'manager'] });

  // ================================================================= Suche
  route('GET', '/api/suche', ({ ctx, query }) => {
    const q = String(query.q || '').trim();
    if (q.length < 2) return { treffer: [] };
    const treffer = [];
    for (const key of ['kunden', 'kontakte', 'deals', 'angebote', 'auftraege', 'rechnungen', 'projekte', 'aufgaben', 'tickets', 'produkte', 'lieferanten', 'mitarbeiter', 'dokumente', 'termine']) {
      const spec = RESOURCES[key];
      if (!crud.canRead(ctx, spec)) continue;
      const r = crud.list(ctx, key, { q, limit: 5 });
      for (const it of r.items) treffer.push({ res: key, bereich: spec.singular, id: it.id, titel: it.__title, icon: spec.icon });
    }
    return { treffer };
  });

  // ================================================================= Dashboard
  const monthKeys = (n) => {
    const out = [];
    const d = new Date();
    d.setDate(1);
    for (let i = n - 1; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
    }
    return out;
  };
  const AKTIV = "status IN ('Offen','Teilbezahlt','Bezahlt')";

  route('GET', '/api/dashboard', ({ ctx }) => {
    const T = ctx.tenant.id;
    const can = (k) => crud.canRead(ctx, RESOURCES[k]);
    const out = { kpi: {} };
    const monat = today().slice(0, 7);
    const jahr = today().slice(0, 4);
    const vormonat = monthKeys(2)[0];
    if (can('rechnungen')) {
      const sumMonth = (m) => round2(db.prepare(`SELECT COALESCE(SUM(netto),0) s FROM belege WHERE tenant_id=? AND typ='Rechnung' AND ${AKTIV} AND substr(datum,1,7)=?`).get(T, m).s);
      out.kpi.umsatzMonat = sumMonth(monat);
      out.kpi.umsatzVormonat = sumMonth(vormonat);
      out.kpi.umsatzJahr = round2(db.prepare(`SELECT COALESCE(SUM(netto),0) s FROM belege WHERE tenant_id=? AND typ='Rechnung' AND ${AKTIV} AND substr(datum,1,4)=?`).get(T, jahr).s);
      const offen = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(brutto - COALESCE(bezahlt,0)),0) s FROM belege WHERE tenant_id=? AND typ='Rechnung' AND status IN ('Offen','Teilbezahlt')").get(T);
      const ueber = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(brutto - COALESCE(bezahlt,0)),0) s FROM belege WHERE tenant_id=? AND typ='Rechnung' AND status IN ('Offen','Teilbezahlt') AND faellig < ?").get(T, today());
      out.kpi.offenAnzahl = offen.n; out.kpi.offenSumme = round2(offen.s);
      out.kpi.ueberfaelligAnzahl = ueber.n; out.kpi.ueberfaelligSumme = round2(ueber.s);
      const keys = monthKeys(12);
      const umsatz = new Map(db.prepare(`SELECT substr(datum,1,7) m, SUM(netto) s FROM belege WHERE tenant_id=? AND typ='Rechnung' AND ${AKTIV} AND datum >= ? GROUP BY m`).all(T, `${keys[0]}-01`).map((r) => [r.m, r.s]));
      const eingang = new Map(db.prepare('SELECT substr(datum,1,7) m, SUM(betrag) s FROM zahlungen WHERE tenant_id=? AND datum >= ? GROUP BY m').all(T, `${keys[0]}-01`).map((r) => [r.m, r.s]));
      const ausgaben = can('ausgaben') ? new Map(db.prepare('SELECT substr(datum,1,7) m, SUM(netto) s FROM ausgaben WHERE tenant_id=? AND datum >= ? GROUP BY m').all(T, `${keys[0]}-01`).map((r) => [r.m, r.s])) : null;
      out.verlauf = keys.map((m) => ({ monat: m, umsatz: round2(umsatz.get(m) || 0), eingang: round2(eingang.get(m) || 0), ausgaben: ausgaben ? round2(ausgaben.get(m) || 0) : null }));
      out.ueberfaellig = crud.list(ctx, 'rechnungen', { ueberfaellig: 'true', sort: 'faellig', dir: 'asc', limit: 6 }).items
        .map((r) => ({ id: r.id, nummer: r.nummer, kunde: r.kunde_id__label, offen: r.offen, faellig: r.faellig }));
      out.topKunden = db.prepare(`SELECT k.id, k.name, SUM(b.netto) umsatz FROM belege b JOIN kunden k ON k.id=b.kunde_id WHERE b.tenant_id=? AND b.typ='Rechnung' AND b.${AKTIV} AND substr(b.datum,1,4)=? GROUP BY k.id ORDER BY umsatz DESC LIMIT 5`).all(T, jahr)
        .map((r) => ({ ...r, umsatz: round2(r.umsatz) }));
    }
    if (can('deals')) {
      const phasen = RESOURCES.deals.fields.find((f) => f.name === 'phase').options;
      const rows = new Map(db.prepare('SELECT phase, COUNT(*) n, COALESCE(SUM(wert),0) s, COALESCE(SUM(wert*wahrscheinlichkeit/100.0),0) g FROM deals WHERE tenant_id=? GROUP BY phase').all(T).map((r) => [r.phase, r]));
      out.pipeline = phasen.map((p) => ({ phase: p, anzahl: rows.get(p)?.n || 0, summe: round2(rows.get(p)?.s || 0) }));
      const offen = phasen.filter((p) => !['Gewonnen', 'Verloren'].includes(p));
      out.kpi.pipelineSumme = round2(offen.reduce((s, p) => s + (rows.get(p)?.s || 0), 0));
      out.kpi.pipelineGewichtet = round2(offen.reduce((s, p) => s + (rows.get(p)?.g || 0), 0));
      const g = rows.get('Gewonnen')?.n || 0;
      const v = rows.get('Verloren')?.n || 0;
      out.kpi.gewinnquote = g + v ? Math.round((g / (g + v)) * 100) : null;
    }
    if (can('kunden')) {
      out.kpi.kundenAktiv = db.prepare("SELECT COUNT(*) n FROM kunden WHERE tenant_id=? AND status='Aktiv'").get(T).n;
      out.kpi.neueLeads = db.prepare("SELECT COUNT(*) n FROM kunden WHERE tenant_id=? AND status IN ('Lead','Interessent') AND created_at >= datetime('now','-30 days')").get(T).n;
    }
    if (can('tickets')) {
      out.kpi.ticketsOffen = db.prepare("SELECT COUNT(*) n FROM tickets WHERE tenant_id=? AND status NOT IN ('Gelöst','Geschlossen')").get(T).n;
      out.kpi.ticketsKritisch = db.prepare("SELECT COUNT(*) n FROM tickets WHERE tenant_id=? AND status NOT IN ('Gelöst','Geschlossen') AND prioritaet IN ('Hoch','Kritisch')").get(T).n;
    }
    if (can('aufgaben')) {
      out.aufgaben = crud.list(ctx, 'aufgaben', { f_zustaendig_id: ctx.user.id, sort: 'faellig', dir: 'asc', limit: 50 }).items
        .filter((a) => a.status !== 'Erledigt').slice(0, 7)
        .map((a) => ({ id: a.id, titel: a.titel, faellig: a.faellig, prioritaet: a.prioritaet, status: a.status, projekt: a.projekt_id__label }));
      out.kpi.aufgabenOffen = db.prepare("SELECT COUNT(*) n FROM aufgaben WHERE tenant_id=? AND zustaendig_id=? AND status<>'Erledigt'").get(T, ctx.user.id).n;
    }
    if (can('produkte')) {
      out.lagerwarnungen = db.prepare("SELECT id, sku, name, bestand, mindestbestand FROM produkte WHERE tenant_id=? AND typ='Produkt' AND aktiv=1 AND COALESCE(bestand,0) <= COALESCE(mindestbestand,0) ORDER BY bestand LIMIT 6").all(T);
    }
    if (can('projekte')) {
      out.projekte = db.prepare("SELECT id, nummer, name, fortschritt, ende, status FROM projekte WHERE tenant_id=? AND status IN ('Aktiv','Planung') ORDER BY ende IS NULL, ende LIMIT 5").all(T);
    }
    if (can('termine')) {
      out.termine = crud.list(ctx, 'termine', { von: `${today()}T00:00`, bis: '9999-12-31', datumsfeld: 'start', sort: 'start', dir: 'asc', limit: 5 }).items
        .map((t) => ({ id: t.id, titel: t.titel, start: t.start, ort: t.ort, typ: t.typ }));
    }
    out.aktivitaeten = db.prepare('SELECT * FROM activity WHERE tenant_id=? AND resource IS NOT NULL ORDER BY id DESC LIMIT 8').all(T)
      .filter((a) => !RESOURCES[a.resource] || crud.canRead(ctx, RESOURCES[a.resource]));
    return out;
  });

  // ================================================================= Kalender
  route('GET', '/api/kalender', ({ ctx, query }) => {
    const von = /^\d{4}-\d{2}-\d{2}$/.test(query.von) ? query.von : today();
    const bis = /^\d{4}-\d{2}-\d{2}$/.test(query.bis) ? query.bis : crud.addDays(von, 42);
    const T = ctx.tenant.id;
    const ev = [];
    const can = (k) => crud.canRead(ctx, RESOURCES[k]);
    if (can('termine')) {
      for (const t of db.prepare('SELECT id, titel, start, ende, typ, ort FROM termine WHERE tenant_id=? AND substr(start,1,10) BETWEEN ? AND ? ORDER BY start').all(T, von, bis)) {
        ev.push({ art: 'termin', res: 'termine', id: t.id, datum: t.start.slice(0, 10), zeit: t.start.slice(11, 16), titel: t.titel, info: t.ort || t.typ });
      }
    }
    if (can('aufgaben')) {
      for (const a of db.prepare("SELECT id, titel, faellig, prioritaet FROM aufgaben WHERE tenant_id=? AND status<>'Erledigt' AND faellig BETWEEN ? AND ?").all(T, von, bis)) {
        ev.push({ art: 'aufgabe', res: 'aufgaben', id: a.id, datum: a.faellig, titel: a.titel, info: a.prioritaet });
      }
    }
    if (can('rechnungen')) {
      for (const r of db.prepare("SELECT id, nummer, faellig FROM belege WHERE tenant_id=? AND typ='Rechnung' AND status IN ('Offen','Teilbezahlt') AND faellig BETWEEN ? AND ?").all(T, von, bis)) {
        ev.push({ art: 'rechnung', res: 'rechnungen', id: r.id, datum: r.faellig, titel: `Fällig: ${r.nummer}` });
      }
    }
    if (can('projekte')) {
      for (const p of db.prepare("SELECT id, nummer, name, ende FROM projekte WHERE tenant_id=? AND status NOT IN ('Abgeschlossen','Abgebrochen') AND ende BETWEEN ? AND ?").all(T, von, bis)) {
        ev.push({ art: 'projekt', res: 'projekte', id: p.id, datum: p.ende, titel: `Deadline: ${p.name}` });
      }
    }
    if (can('deals')) {
      for (const d of db.prepare("SELECT id, titel, abschluss FROM deals WHERE tenant_id=? AND phase NOT IN ('Gewonnen','Verloren') AND abschluss BETWEEN ? AND ?").all(T, von, bis)) {
        ev.push({ art: 'deal', res: 'deals', id: d.id, datum: d.abschluss, titel: `Abschluss: ${d.titel}` });
      }
    }
    return { von, bis, termine: ev };
  });

  // ================================================================= Berichte
  route('GET', '/api/berichte', ({ ctx, query }) => {
    const jahr = /^\d{4}$/.test(query.jahr) ? query.jahr : today().slice(0, 4);
    const T = ctx.tenant.id;
    const can = (k) => crud.canRead(ctx, RESOURCES[k]);
    if (!can('rechnungen')) throw forbidden();
    const monate = Array.from({ length: 12 }, (_, i) => `${jahr}-${String(i + 1).padStart(2, '0')}`);
    const byMonth = (sql, ...p) => new Map(db.prepare(sql).all(...p).map((r) => [r.m, r]));
    const um = byMonth(`SELECT substr(datum,1,7) m, SUM(netto) netto, SUM(steuer) steuer FROM belege WHERE tenant_id=? AND typ='Rechnung' AND ${AKTIV} AND substr(datum,1,4)=? GROUP BY m`, T, jahr);
    const ein = byMonth('SELECT substr(datum,1,7) m, SUM(betrag) s FROM zahlungen WHERE tenant_id=? AND substr(datum,1,4)=? GROUP BY m', T, jahr);
    const aus = can('ausgaben') ? byMonth('SELECT substr(datum,1,7) m, SUM(netto) netto, SUM(brutto-netto) vorsteuer FROM ausgaben WHERE tenant_id=? AND substr(datum,1,4)=? GROUP BY m', T, jahr) : new Map();
    const zeilen = monate.map((m) => {
      const u = um.get(m) || {};
      const a = aus.get(m) || {};
      return {
        monat: m, umsatz: round2(u.netto || 0), ust: round2(u.steuer || 0), eingang: round2(ein.get(m)?.s || 0),
        ausgaben: round2(a.netto || 0), vorsteuer: round2(a.vorsteuer || 0),
        ergebnis: round2((u.netto || 0) - (a.netto || 0)), zahllast: round2((u.steuer || 0) - (a.vorsteuer || 0)),
      };
    });
    const kunden = db.prepare(`SELECT k.id, k.name, COUNT(b.id) anzahl, SUM(b.netto) umsatz, SUM(b.brutto - COALESCE(b.bezahlt,0)) offen FROM belege b JOIN kunden k ON k.id=b.kunde_id WHERE b.tenant_id=? AND b.typ='Rechnung' AND b.${AKTIV} AND substr(b.datum,1,4)=? GROUP BY k.id ORDER BY umsatz DESC LIMIT 25`).all(T, jahr)
      .map((r) => ({ ...r, umsatz: round2(r.umsatz), offen: round2(r.offen) }));
    const prod = new Map();
    for (const b of db.prepare(`SELECT positionen FROM belege WHERE tenant_id=? AND typ='Rechnung' AND ${AKTIV} AND substr(datum,1,4)=?`).all(T, jahr)) {
      let pos = [];
      try { pos = JSON.parse(b.positionen || '[]'); } catch { /* ignorieren */ }
      for (const p of pos) {
        const key = p.produkt_id ? `p${p.produkt_id}` : `t${p.bezeichnung}`;
        const e = prod.get(key) || { bezeichnung: p.bezeichnung, menge: 0, umsatz: 0 };
        e.menge += Number(p.menge) || 0;
        e.umsatz += Number(p.summe) || 0;
        prod.set(key, e);
      }
    }
    const produkte = [...prod.values()].sort((a, b) => b.umsatz - a.umsatz).slice(0, 25).map((p) => ({ ...p, umsatz: round2(p.umsatz), menge: Math.round(p.menge * 100) / 100 }));
    const kategorien = can('ausgaben')
      ? db.prepare('SELECT kategorie, COUNT(*) anzahl, SUM(netto) netto FROM ausgaben WHERE tenant_id=? AND substr(datum,1,4)=? GROUP BY kategorie ORDER BY netto DESC').all(T, jahr).map((r) => ({ ...r, netto: round2(r.netto) }))
      : null;
    const zeiten = can('zeiten')
      ? db.prepare(`SELECT p.id, p.nummer, p.name, SUM(z.stunden) stunden, SUM(CASE WHEN z.abrechenbar=1 THEN z.stunden ELSE 0 END) abrechenbar,
          SUM(CASE WHEN z.abrechenbar=1 AND COALESCE(z.abgerechnet,0)=0 THEN z.stunden ELSE 0 END) offen
          FROM zeiten z LEFT JOIN projekte p ON p.id=z.projekt_id WHERE z.tenant_id=? AND substr(z.datum,1,4)=? GROUP BY p.id ORDER BY stunden DESC`).all(T, jahr)
      : null;
    const jahre = db.prepare("SELECT DISTINCT substr(datum,1,4) j FROM belege WHERE tenant_id=? AND datum IS NOT NULL ORDER BY j DESC").all(T).map((r) => r.j);
    if (!jahre.includes(today().slice(0, 4))) jahre.unshift(today().slice(0, 4));
    return { jahr, jahre, monate: zeilen, kunden, produkte, kategorien, zeiten };
  });

  // ================================================================= Request-Handler
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    try {
      if (!p.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Methode nicht erlaubt.');
        if (/^\/form\/[\w-]+\/?$/.test(p)) {
          // Optional: Einbettung des Formulars auf eigenen Websites erlauben (z. B. FRAME_ANCESTORS="https://www.meine-firma.de")
          const fa = String(process.env.FRAME_ANCESTORS || '').replace(/[^\w\s:/.*-]/g, '').trim();
          const extra = fa ? { 'X-Frame-Options': null, 'Content-Security-Policy': SECURITY_HEADERS['Content-Security-Policy'].replace("frame-ancestors 'none'", `frame-ancestors ${fa}`) } : {};
          if (serveStatic(req, res, '/form.html', extra)) return;
        }
        if (serveStatic(req, res, p)) return;
        if (!path.extname(p) && serveStatic(req, res, '/index.html')) return;
        throw notFound();
      }
      const r = routes.find((x) => x.method === req.method && x.re.test(p));
      if (!r) {
        if (routes.some((x) => x.re.test(p))) throw new HttpError(405, 'Methode nicht erlaubt.');
        throw notFound('Unbekannter API-Endpunkt.');
      }
      // CSRF-Schutz: schreibende Anfragen müssen den eigenen Header tragen (Cross-Site nicht ohne CORS möglich)
      if (req.method !== 'GET' && req.headers['x-it-world'] !== '1') throw forbidden('Ungültige Anfrage (CSRF-Schutz).');
      const m = p.match(r.re);
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      const query = Object.fromEntries(url.searchParams);
      let ctx = null;
      if (r.auth) {
        const user = auth.userFromToken(db, parseCookies(req)[auth.SESSION_COOKIE]);
        if (!user) throw new HttpError(401, 'Bitte melden Sie sich an.');
        ctx = context(user);
        if (user.muss_passwort_aendern && !['/api/auth/me', '/api/auth/passwort'].includes(p)) {
          throw new HttpError(403, 'Bitte ändern Sie zuerst Ihr Passwort.', { passwortAendern: true });
        }
        if (r.roles && !r.roles.includes(user.rolle)) throw forbidden();
        if (user.rolle === 'lesezugriff' && req.method !== 'GET' && !['/api/auth/passwort', '/api/profil'].includes(p)) throw forbidden('Ihr Konto hat nur Lesezugriff.');
      }
      const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readJson(req, r.bodyLimit || (p.endsWith('/import') ? 12 * 1024 * 1024 : 2 * 1024 * 1024)) : {};
      const result = await r.handler({ req, res, params, query, body: body && typeof body === 'object' ? body : {}, ctx });
      if (result !== undefined && !res.headersSent) sendJson(req, res, 200, result);
    } catch (e) {
      if (res.headersSent) { res.end(); return; }
      if (e instanceof HttpError) {
        sendJson(req, res, e.status, { fehler: e.message, ...(e.extra || {}) });
      } else {
        console.error('[IT-World] Fehler:', e);
        sendJson(req, res, 500, { fehler: 'Interner Serverfehler.' });
      }
    }
  };
}

module.exports = { createApp, createTenant, loadSettings, slugify };
