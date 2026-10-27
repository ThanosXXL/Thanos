'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeOsrm, isAllowedExternalUrl, isTrustedSender, isCoord, readLimitedText } = require('../lib/security');

test('erlaubte Karten- und Release-Links', () => {
  for (const u of [
    'https://www.google.com/maps/dir/?api=1&destination=52.5,13.4',
    'https://maps.apple.com/?daddr=Berlin',
    'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=1,2;3,4',
    'https://github.com/ThanosXXL/Thanos/releases/tag/my-route-updates'
  ]) assert.equal(isAllowedExternalUrl(u), true, u);
});

test('abgelehnte Links: falsches Schema, Host, Pfad, Zugangsdaten, Port, Tarnung', () => {
  for (const u of [
    'http://www.google.com/maps/', 'file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,hi', 'ftp://www.google.com/maps/',
    'https://evil.example/maps/', 'https://www.google.com.evil.example/maps/', 'https://www.google.com/search?q=x',
    'https://user:pw@www.google.com/maps/', 'https://www.google.com:8443/maps/', 'https://github.com/other/repo/releases',
    'https://github.com/thanosxxl/thanos-evil/releases', '', null, undefined, 42, 'not a url'
  ]) assert.equal(isAllowedExternalUrl(u), false, String(u));
});

test('IPC nur vom eigenen Fenster, Hauptframe und file:-Seite', () => {
  const wc = { isDestroyed: () => false };
  const ok = { sender: wc, senderFrame: { parent: null, url: 'file:///app/renderer/index.html' } };
  assert.equal(isTrustedSender(ok, wc), true);
  assert.equal(isTrustedSender({ ...ok, sender: {} }, wc), false);
  assert.equal(isTrustedSender({ sender: wc, senderFrame: { parent: {}, url: 'file:///x' } }, wc), false);
  assert.equal(isTrustedSender({ sender: wc, senderFrame: { parent: null, url: 'https://evil.example/' } }, wc), false);
  assert.equal(isTrustedSender({ sender: wc, senderFrame: null }, wc), false);
  assert.equal(isTrustedSender(ok, { isDestroyed: () => true }), false);
  assert.equal(isTrustedSender(undefined, wc), false);
});

test('Koordinatenprüfung', () => {
  assert.equal(isCoord({ lat: 52.5, lon: 13.4 }), true);
  for (const p of [null, {}, { lat: 91, lon: 0 }, { lat: 0, lon: 181 }, { lat: '1', lon: 2 }, { lat: NaN, lon: 1 }]) assert.equal(isCoord(p), false);
});

test('Antwortgröße wird begrenzt', async () => {
  const mkRes = (body, len) => ({ headers: { get: () => len }, arrayBuffer: async () => Buffer.from(body) });
  assert.equal(await readLimitedText(mkRes('{"a":1}', '7'), 100), '{"a":1}');
  await assert.rejects(readLimitedText(mkRes('x', '999999'), 100), /zu groß/);
  await assert.rejects(readLimitedText(mkRes('x'.repeat(200), null), 100), /zu groß/);
});

test('Routing-Antwort wird auf Zahlen und Grenzen reduziert', () => {
  const dirty = { code: 'Ok', evil: '<script>', routes: [
    { duration: 10, distance: 20, extra: 'x', geometry: { coordinates: [[13.4, 52.5], ['a', 1], [999, 0], [13.5, 52.6, 7]] } },
    { duration: 'abc', distance: 1, geometry: { coordinates: [] } }
  ] };
  const clean = sanitizeOsrm(dirty);
  assert.equal(clean.routes.length, 1);
  assert.deepEqual(clean.routes[0].geometry.coordinates, [[13.4, 52.5], [13.5, 52.6]]);
  assert.equal(clean.evil, undefined);
  assert.deepEqual(sanitizeOsrm({ code: 'NoRoute' }), { code: 'Error', routes: [] });
  assert.deepEqual(sanitizeOsrm(null), { code: 'Error', routes: [] });
});
