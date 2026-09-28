'use strict';
/**
 * Minimaler SMTP-Client ohne Fremdabhängigkeiten (STARTTLS auf 587 / implizites TLS auf 465, AUTH LOGIN).
 * Ohne SMTP-Konfiguration werden E-Mails nur im Postausgang protokolliert.
 */
const net = require('node:net');
const tls = require('node:tls');
const crypto = require('node:crypto');
const os = require('node:os');

function config() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const secure = process.env.SMTP_SECURE === 'true';
  return {
    host,
    port: Number(process.env.SMTP_PORT) || (secure ? 465 : 587),
    secure,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || `it-world@${os.hostname()}`,
    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
  };
}

const clean = (s) => String(s).replace(/[\r\n]+/g, ' ').trim();
const encodeHeader = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`);
const addr = (s) => {
  const m = String(s).match(/<([^>]+)>/);
  return clean(m ? m[1] : s);
};

function buildMessage({ from, to, subject, text, fromName }) {
  const body = Buffer.from(text.replace(/\r?\n/g, '\r\n')).toString('base64').replace(/.{76}/g, '$&\r\n');
  const fromHeader = fromName ? `${encodeHeader(clean(fromName))} <${addr(from)}>` : addr(from);
  return [
    `From: ${fromHeader}`,
    `To: ${addr(to)}`,
    `Subject: ${encodeHeader(clean(subject))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${addr(from).split('@')[1] || 'it-world'}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ].join('\r\n');
}

function smtpSession(socket) {
  let buffer = '';
  let waiter = null;
  const onData = (chunk) => {
    buffer += chunk.toString('utf8');
    tryResolve();
  };
  function tryResolve() {
    if (!waiter) return;
    const lines = buffer.split('\r\n');
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^\d{3} /.test(lines[i]) || /^\d{3}$/.test(lines[i])) {
        const resp = lines.slice(0, i + 1);
        buffer = lines.slice(i + 1).join('\r\n');
        const w = waiter;
        waiter = null;
        w.resolve({ code: Number(resp[i].slice(0, 3)), lines: resp });
        return;
      }
    }
  }
  const attach = (s) => {
    s.on('data', onData);
    s.on('error', (e) => waiter && waiter.reject(e));
  };
  attach(socket);
  return {
    socket,
    read() {
      return new Promise((resolve, reject) => {
        waiter = { resolve, reject };
        tryResolve();
      });
    },
    async cmd(line, expect) {
      this.socket.write(`${line}\r\n`);
      const r = await this.read();
      if (!expect.includes(r.code)) {
        const shown = line.startsWith('AUTH') || /^[A-Za-z0-9+/=]+$/.test(line) ? '[Anmeldung]' : line.split(' ')[0];
        throw new Error(`SMTP-Fehler bei ${shown}: ${r.lines.join(' ')}`);
      }
      return r;
    },
    upgrade(newSocket) {
      this.socket.removeListener('data', onData);
      this.socket = newSocket;
      buffer = '';
      attach(newSocket);
    },
  };
}

async function send({ to, subject, text, fromName }, cfg = config()) {
  if (!cfg) throw new Error('Kein SMTP-Server konfiguriert.');
  const socket = await new Promise((resolve, reject) => {
    const opts = { host: cfg.host, port: cfg.port, servername: cfg.host, rejectUnauthorized: cfg.rejectUnauthorized };
    const s = cfg.secure ? tls.connect(opts, () => resolve(s)) : net.connect(opts, () => resolve(s));
    s.setTimeout(20000, () => s.destroy(new Error('SMTP-Zeitüberschreitung')));
    s.once('error', reject);
  });
  const smtp = smtpSession(socket);
  try {
    const greet = await smtp.read();
    if (greet.code !== 220) throw new Error(`SMTP-Begrüßung fehlgeschlagen: ${greet.lines.join(' ')}`);
    let ehlo = await smtp.cmd(`EHLO ${os.hostname() || 'it-world'}`, [250]);
    if (!cfg.secure && ehlo.lines.some((l) => /STARTTLS/i.test(l))) {
      await smtp.cmd('STARTTLS', [220]);
      const secured = await new Promise((resolve, reject) => {
        const s = tls.connect({ socket: smtp.socket, servername: cfg.host, rejectUnauthorized: cfg.rejectUnauthorized }, () => resolve(s));
        s.once('error', reject);
      });
      smtp.upgrade(secured);
      ehlo = await smtp.cmd(`EHLO ${os.hostname() || 'it-world'}`, [250]);
    }
    if (cfg.user) {
      await smtp.cmd('AUTH LOGIN', [334]);
      await smtp.cmd(Buffer.from(cfg.user).toString('base64'), [334]);
      await smtp.cmd(Buffer.from(cfg.pass).toString('base64'), [235]);
    }
    await smtp.cmd(`MAIL FROM:<${addr(cfg.from)}>`, [250]);
    await smtp.cmd(`RCPT TO:<${addr(to)}>`, [250, 251]);
    await smtp.cmd('DATA', [354]);
    await smtp.cmd(`${buildMessage({ from: cfg.from, to, subject, text, fromName })}\r\n.`, [250]);
    await smtp.cmd('QUIT', [221]).catch(() => {});
  } finally {
    smtp.socket.destroy();
  }
}

/**
 * Legt eine E-Mail im Postausgang an und versendet sie (asynchron), falls SMTP konfiguriert ist.
 */
function queue(db, tenantId, { to, subject, text, bezug, fromName }) {
  const cfg = config();
  const info = db.prepare('INSERT INTO emails (tenant_id, an, betreff, text, status, bezug) VALUES (?, ?, ?, ?, ?, ?)')
    .run(tenantId, clean(to), clean(subject), String(text), cfg ? 'Wird gesendet' : 'Protokolliert (kein SMTP)', bezug || null);
  const id = Number(info.lastInsertRowid);
  if (cfg) {
    send({ to, subject, text, fromName }, cfg)
      .then(() => db.prepare("UPDATE emails SET status = 'Gesendet' WHERE id = ?").run(id))
      .catch((e) => db.prepare("UPDATE emails SET status = 'Fehler', fehler = ? WHERE id = ?").run(String(e.message).slice(0, 500), id));
  }
  return id;
}

module.exports = { config, send, queue, buildMessage };
