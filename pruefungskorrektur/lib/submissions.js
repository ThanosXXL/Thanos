'use strict';

const fs = require('fs');
const path = require('path');
const { parseCsvToObjects } = require('./csv');

const RESERVED_COLUMNS = new Set(['participant', 'email']);

function splitMultiValue(raw) {
  if (raw === undefined || raw === null || raw === '') return [];
  return String(raw)
    .split('|')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function loadSubmissionsFromCsv(text, exam) {
  const rows = parseCsvToObjects(text);
  const questionsById = new Map(exam.questions.map((q) => [q.id, q]));

  return rows.map((row) => {
    const answers = {};
    for (const [key, value] of Object.entries(row)) {
      if (RESERVED_COLUMNS.has(key)) continue;
      const question = questionsById.get(key);
      if (!question) continue;
      answers[key] = question.type === 'multiple-choice' ? splitMultiValue(value) : value.trim();
    }
    return {
      participant: row.participant || '',
      email: row.email || '',
      answers,
    };
  });
}

function loadSubmissionsFromJson(text) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data.submissions;
  if (!Array.isArray(list)) {
    throw new Error('Submissions-JSON muss ein Array oder { "submissions": [...] } sein.');
  }
  return list.map((entry) => ({
    participant: entry.participant || '',
    email: entry.email || '',
    answers: entry.answers || {},
  }));
}

function loadSubmissions(filePath, exam) {
  const text = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') return loadSubmissionsFromCsv(text, exam);
  if (ext === '.json') return loadSubmissionsFromJson(text);
  throw new Error(`Nicht unterstütztes Dateiformat für Teilnehmerantworten: ${ext}`);
}

module.exports = { loadSubmissions, loadSubmissionsFromCsv, loadSubmissionsFromJson };
