const test = require('node:test');
const assert = require('node:assert/strict');
const { examCountdown } = require('../renderer/js/calendar.js');

test('examCountdown() für vergangene Termine liefert "vorbei"', () => {
  assert.equal(examCountdown(new Date(Date.now() - 1000)), 'vorbei');
});

test('examCountdown() für Termine in wenigen Stunden zeigt Std./Min.', () => {
  const dt = new Date(Date.now() + 90 * 60 * 1000); // +1,5 Std.
  const result = examCountdown(dt);
  assert.match(result, /^in \d+ Std\. \d+ Min\.$/);
});

test('examCountdown() für Termine in mehreren Tagen zeigt Tage + Std.', () => {
  const dt = new Date(Date.now() + 2 * 86400000 + 3 * 3600000); // +2 Tage 3 Std.
  const result = examCountdown(dt);
  assert.match(result, /^in \d+ Tag\(en\), \d+ Std\.$/);
});
