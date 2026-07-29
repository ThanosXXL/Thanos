'use strict';

const fs = require('fs');

const VALID_TYPES = new Set(['single-choice', 'multiple-choice', 'text']);

function loadExam(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const exam = JSON.parse(raw);
  validateExam(exam);
  exam.passThreshold = exam.passThreshold === undefined ? 50 : exam.passThreshold;
  exam.questions = exam.questions.map((q) => ({
    points: 1,
    minMatchRatio: 0.6,
    similarityThreshold: 0.8,
    ...q,
  }));
  return exam;
}

function validateExam(exam) {
  if (!exam || typeof exam !== 'object') {
    throw new Error('Prüfungsdefinition ist kein gültiges JSON-Objekt.');
  }
  if (!Array.isArray(exam.questions) || exam.questions.length === 0) {
    throw new Error('Prüfungsdefinition muss ein nicht-leeres "questions"-Array enthalten.');
  }

  const seenIds = new Set();
  for (const q of exam.questions) {
    if (!q.id) throw new Error('Jede Frage benötigt eine eindeutige "id".');
    if (seenIds.has(q.id)) throw new Error(`Doppelte Frage-id gefunden: ${q.id}`);
    seenIds.add(q.id);

    if (!VALID_TYPES.has(q.type)) {
      throw new Error(`Frage "${q.id}" hat unbekannten Typ "${q.type}". Erlaubt: ${[...VALID_TYPES].join(', ')}`);
    }
    if (q.type === 'single-choice' && (q.correct === undefined || q.correct === null)) {
      throw new Error(`Frage "${q.id}" (single-choice) benötigt "correct".`);
    }
    if (q.type === 'multiple-choice' && !Array.isArray(q.correct)) {
      throw new Error(`Frage "${q.id}" (multiple-choice) benötigt "correct" als Array.`);
    }
    if (q.type === 'text' && !Array.isArray(q.acceptedAnswers) && !Array.isArray(q.keywords)) {
      throw new Error(
        `Frage "${q.id}" (text) benötigt mindestens "acceptedAnswers" oder "keywords", sonst ist keine automatische Bewertung möglich.`
      );
    }
  }
}

module.exports = { loadExam, validateExam, VALID_TYPES };
