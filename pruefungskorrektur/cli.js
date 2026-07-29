#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { loadExam } = require('./lib/exam');
const { loadSubmissions } = require('./lib/submissions');
const { gradeExam } = require('./lib/grader');
const { toCsv } = require('./lib/csv');

function parseArgs(argv) {
  const args = { outDir: 'ergebnisse' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--exam') args.exam = argv[++i];
    else if (arg === '--submissions') args.submissions = argv[++i];
    else if (arg === '--out-dir') args.outDir = argv[++i];
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`Pruefungskorrektur - automatisierte Korrektur von Tests/Pruefungen

Verwendung:
  node cli.js --exam <exam.json> --submissions <antworten.json|antworten.csv> [--out-dir <ordner>]

Optionen:
  --exam         Pfad zur Pruefungsdefinition (JSON)
  --submissions  Pfad zur Datei mit Teilnehmerantworten (JSON oder CSV)
  --out-dir      Zielordner fuer die Ergebnisse (Standard: "ergebnisse")
  --help         Diese Hilfe anzeigen

Beispiele liegen im Ordner "examples/".`);
}

function writeReports(exam, results, outDir) {
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'ergebnisse.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ exam: exam.title, results }, null, 2), 'utf8');

  const summaryColumns = ['participant', 'email', 'total', 'maxTotal', 'percentage', 'passed', 'needsReview'];
  const summaryRows = results.map((r) => ({
    participant: r.participant,
    email: r.email,
    total: r.total,
    maxTotal: r.maxTotal,
    percentage: r.percentage,
    passed: r.passed ? 'ja' : 'nein',
    needsReview: r.needsReview ? 'ja' : 'nein',
  }));
  const summaryPath = path.join(outDir, 'ergebnisse.csv');
  fs.writeFileSync(summaryPath, toCsv(summaryColumns, summaryRows), 'utf8');

  const detailColumns = ['participant', 'questionId', 'score', 'maxScore', 'correct', 'needsReview'];
  const detailRows = [];
  for (const r of results) {
    for (const [questionId, q] of Object.entries(r.perQuestion)) {
      detailRows.push({
        participant: r.participant,
        questionId,
        score: q.score,
        maxScore: q.maxScore,
        correct: q.correct ? 'ja' : 'nein',
        needsReview: q.needsReview ? 'ja' : 'nein',
      });
    }
  }
  const detailPath = path.join(outDir, 'ergebnisse_detail.csv');
  fs.writeFileSync(detailPath, toCsv(detailColumns, detailRows), 'utf8');

  return { jsonPath, summaryPath, detailPath };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.exam || !args.submissions) {
    printHelp();
    process.exit(args.help ? 0 : 1);
    return;
  }

  const exam = loadExam(args.exam);
  const submissions = loadSubmissions(args.submissions, exam);
  const results = gradeExam(exam, submissions);

  const { jsonPath, summaryPath, detailPath } = writeReports(exam, results, args.outDir);

  const reviewCount = results.filter((r) => r.needsReview).length;
  const passedCount = results.filter((r) => r.passed).length;

  console.log(`Pruefung: ${exam.title || '(ohne Titel)'}`);
  console.log(`Teilnehmer: ${results.length} | bestanden: ${passedCount} | zur manuellen Pruefung markiert: ${reviewCount}`);
  console.log('Ergebnisse geschrieben nach:');
  console.log(`  ${jsonPath}`);
  console.log(`  ${summaryPath}`);
  console.log(`  ${detailPath}`);

  if (reviewCount > 0) {
    console.log(
      `\nHinweis: ${reviewCount} Teilnehmer haben Freitextantworten, die nicht eindeutig automatisch bewertet werden konnten. Bitte "needsReview"-Faelle manuell gegenpruefen.`
    );
  }
}

main();
