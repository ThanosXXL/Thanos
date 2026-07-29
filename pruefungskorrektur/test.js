'use strict';

const assert = require('assert');
const { gradeAnswer, gradeSubmission } = require('./lib/grader');
const { parseCsvToObjects, toCsv } = require('./lib/csv');
const { similarityRatio } = require('./lib/textSimilarity');

function run(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`FAIL - ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

run('single-choice: korrekte Antwort ergibt volle Punktzahl', () => {
  const q = { type: 'single-choice', points: 1, correct: 'b' };
  assert.deepStrictEqual(gradeAnswer(q, 'b'), { score: 1, maxScore: 1, correct: true, needsReview: false });
});

run('single-choice: Gross-/Kleinschreibung und Leerzeichen werden ignoriert', () => {
  const q = { type: 'single-choice', points: 1, correct: 'B' };
  assert.strictEqual(gradeAnswer(q, '  b ').correct, true);
});

run('single-choice: falsche Antwort ergibt 0 Punkte', () => {
  const q = { type: 'single-choice', points: 1, correct: 'b' };
  assert.strictEqual(gradeAnswer(q, 'a').score, 0);
});

run('multiple-choice: exakte Auswahl ergibt volle Punktzahl', () => {
  const q = { type: 'multiple-choice', points: 2, correct: ['a', 'c'] };
  const result = gradeAnswer(q, ['a', 'c']);
  assert.strictEqual(result.score, 2);
  assert.strictEqual(result.correct, true);
});

run('multiple-choice: falsche Zusatzauswahl reduziert die Punktzahl', () => {
  const q = { type: 'multiple-choice', points: 2, correct: ['a', 'c'] };
  const result = gradeAnswer(q, ['a', 'c', 'b']);
  assert.strictEqual(result.score, 1);
  assert.strictEqual(result.correct, false);
});

run('multiple-choice: Punktzahl wird nie negativ', () => {
  const q = { type: 'multiple-choice', points: 2, correct: ['a'] };
  const result = gradeAnswer(q, ['b', 'c', 'd']);
  assert.strictEqual(result.score, 0);
});

run('text: sehr aehnliche Formulierung wird als korrekt erkannt', () => {
  const q = {
    type: 'text',
    points: 3,
    acceptedAnswers: ['Der Arbeitsspeicher speichert Daten fluechtig'],
    keywords: [],
    minMatchRatio: 0.6,
    similarityThreshold: 0.7,
  };
  const result = gradeAnswer(q, 'Der Arbeitsspeicher speichert Daten fluechtig waehrend das Programm laeuft');
  assert.strictEqual(result.correct, true);
  assert.strictEqual(result.needsReview, false);
});

run('text: ausreichend Schluesselwoerter ergeben volle Punktzahl', () => {
  const q = {
    type: 'text',
    points: 3,
    acceptedAnswers: [],
    keywords: ['speicher', 'fluechtig'],
    minMatchRatio: 0.5,
    similarityThreshold: 0.9,
  };
  const result = gradeAnswer(q, 'Der Speicher haelt Daten fluechtig vor.');
  assert.strictEqual(result.correct, true);
});

run('text: unpassende Antwort ohne Treffer wird zur manuellen Pruefung markiert', () => {
  const q = {
    type: 'text',
    points: 3,
    acceptedAnswers: ['Der Arbeitsspeicher speichert Daten fluechtig'],
    keywords: ['speicher'],
    minMatchRatio: 0.5,
    similarityThreshold: 0.9,
  };
  const result = gradeAnswer(q, 'Ich weiss es nicht genau.');
  assert.strictEqual(result.score, 0);
  assert.strictEqual(result.needsReview, true);
});

run('text: leere Antwort ergibt 0 Punkte ohne Review-Flag', () => {
  const q = {
    type: 'text',
    points: 3,
    acceptedAnswers: ['irgendwas'],
    keywords: [],
    minMatchRatio: 0.5,
    similarityThreshold: 0.9,
  };
  const result = gradeAnswer(q, '');
  assert.strictEqual(result.score, 0);
  assert.strictEqual(result.needsReview, false);
});

run('gradeSubmission: Gesamtpunktzahl und Bestanden-Status werden korrekt berechnet', () => {
  const exam = {
    passThreshold: 50,
    questions: [
      { id: 'q1', type: 'single-choice', points: 1, correct: 'b' },
      { id: 'q2', type: 'multiple-choice', points: 2, correct: ['a', 'c'] },
    ],
  };
  const submission = { participant: 'Max', email: '', answers: { q1: 'b', q2: ['a', 'c'] } };
  const result = gradeSubmission(exam, submission);
  assert.strictEqual(result.total, 3);
  assert.strictEqual(result.maxTotal, 3);
  assert.strictEqual(result.percentage, 100);
  assert.strictEqual(result.passed, true);
});

run('CSV: parsen und schreiben ist konsistent (Roundtrip mit Kommas/Anfuehrungszeichen)', () => {
  const csv = toCsv(['a', 'b'], [{ a: 'x,y', b: 'hat "Zitat"' }]);
  const parsed = parseCsvToObjects(csv);
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].a, 'x,y');
  assert.strictEqual(parsed[0].b, 'hat "Zitat"');
});

run('Textaehnlichkeit: identische Texte ergeben Ratio 1', () => {
  assert.strictEqual(similarityRatio('abc', 'abc'), 1);
});

if (process.exitCode) {
  console.error('\nEinige Tests sind fehlgeschlagen.');
} else {
  console.log('\nAlle Tests erfolgreich.');
}
