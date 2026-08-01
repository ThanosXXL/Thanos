const test = require('node:test');
const assert = require('node:assert/strict');
const state = require('../renderer/js/state.js');

test('uid() erzeugt nicht-leere, unterschiedliche IDs', () => {
  const a = state.uid();
  const b = state.uid();
  assert.notEqual(a, '');
  assert.notEqual(a, b);
});

test('nowStr() liefert einen nicht-leeren deutschen Zeitstempel', () => {
  const s = state.nowStr();
  assert.ok(s.length > 0);
  assert.match(s, /\d{2}\.\d{2}\.\d{4}/);
});

test('normalizeState() ergänzt fehlende Felder', () => {
  const result = state.normalizeState({ dozenten: [{ id: 'x', name: 'Test' }] });
  assert.deepEqual(result.dozenten[0].chat, []);
  assert.deepEqual(result.dozenten[0].homework, []);
  assert.deepEqual(result.dozenten[0].exams, []);
  assert.equal(result.dozenten[0].presentation, null);
});

test('normalizeState() lässt vorhandene Felder unverändert', () => {
  const input = {
    dozenten: [
      {
        id: 'x',
        chat: [{ id: '1', text: 'hi' }],
        homework: [{ id: 'h1' }],
        exams: [{ id: 'e1' }],
        presentation: { name: 'a.pptx' }
      }
    ]
  };
  const result = state.normalizeState(input);
  assert.equal(result.dozenten[0].chat.length, 1);
  assert.equal(result.dozenten[0].presentation.name, 'a.pptx');
});

test('normalizeState(null/undefined) liefert leere Dozentenliste', () => {
  assert.deepEqual(state.normalizeState(null), { dozenten: [] });
  assert.deepEqual(state.normalizeState(undefined), { dozenten: [] });
  assert.deepEqual(state.normalizeState({}), { dozenten: [] });
});

test('findDozent() findet per ID, sonst undefined', () => {
  state.setState({ dozenten: [{ id: 'abc', name: 'Frau Müller' }] });
  assert.equal(state.findDozent('abc').name, 'Frau Müller');
  assert.equal(state.findDozent('nicht-vorhanden'), undefined);
});
