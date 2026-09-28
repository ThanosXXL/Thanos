'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const mailer = require('../src/mailer');

test('SMTP-Versand mit AUTH LOGIN gegen lokalen Testserver', async () => {
  const log = [];
  let data = '';
  const server = net.createServer((sock) => {
    let inData = false;
    let buf = '';
    sock.write('220 test ESMTP\r\n');
    sock.on('data', (c) => {
      buf += c.toString();
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (inData) {
          if (line === '.') { inData = false; sock.write('250 OK queued\r\n'); } else data += `${line}\n`;
          continue;
        }
        log.push(line);
        if (line.startsWith('EHLO')) sock.write('250-test\r\n250 AUTH LOGIN\r\n');
        else if (line === 'AUTH LOGIN') sock.write('334 VXNlcm5hbWU6\r\n');
        else if (log.length === 3) sock.write('334 UGFzc3dvcmQ6\r\n');
        else if (log.length === 4) sock.write('235 Authenticated\r\n');
        else if (line.startsWith('MAIL FROM') || line.startsWith('RCPT TO')) sock.write('250 OK\r\n');
        else if (line === 'DATA') { inData = true; sock.write('354 Go\r\n'); }
        else if (line === 'QUIT') { sock.write('221 Bye\r\n'); sock.end(); }
      }
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  await mailer.send({ to: 'kunde@example.com', subject: 'Rechnung RE-1 – Grüße', text: 'Hallo\n.\nEnde', fromName: 'IT - World' },
    { host: '127.0.0.1', port: server.address().port, secure: false, user: 'u@x.de', pass: 'geheim', from: 'noreply@it-world.de', rejectUnauthorized: true });
  server.close();
  assert.equal(Buffer.from(log[2], 'base64').toString(), 'u@x.de');
  assert.equal(Buffer.from(log[3], 'base64').toString(), 'geheim');
  assert.ok(log.includes('RCPT TO:<kunde@example.com>'));
  assert.match(data, /Subject: =\?UTF-8\?B\?/);
  const body = data.split('\n\n').slice(1).join('').replace(/\n/g, '');
  assert.equal(Buffer.from(body, 'base64').toString(), 'Hallo\r\n.\r\nEnde');
});
