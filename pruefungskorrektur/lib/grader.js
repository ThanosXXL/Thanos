'use strict';

const { normalize, similarityRatio } = require('./textSimilarity');

function round2(n) {
  return Math.round(n * 100) / 100;
}

function gradeSingleChoice(question, answer) {
  const submitted = normalize(answer);
  const correct = normalize(question.correct);
  const isCorrect = submitted.length > 0 && submitted === correct;
  return {
    score: isCorrect ? question.points : 0,
    maxScore: question.points,
    correct: isCorrect,
    needsReview: false,
  };
}

function gradeMultipleChoice(question, answer) {
  const submitted = new Set((Array.isArray(answer) ? answer : []).map(normalize).filter(Boolean));
  const correctSet = new Set(question.correct.map(normalize));

  let hits = 0;
  let wrong = 0;
  for (const value of submitted) {
    if (correctSet.has(value)) hits++;
    else wrong++;
  }

  const rawScore = (question.points * (hits - wrong)) / correctSet.size;
  const score = round2(Math.max(0, Math.min(question.points, rawScore)));
  const isFullyCorrect = hits === correctSet.size && wrong === 0;

  return {
    score,
    maxScore: question.points,
    correct: isFullyCorrect,
    needsReview: false,
  };
}

function gradeText(question, answer) {
  const submitted = normalize(answer);

  if (submitted.length === 0) {
    return { score: 0, maxScore: question.points, correct: false, needsReview: false };
  }

  const acceptedAnswers = Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [];
  const bestSimilarity = acceptedAnswers.reduce(
    (best, candidate) => Math.max(best, similarityRatio(submitted, candidate)),
    0
  );

  if (bestSimilarity >= question.similarityThreshold) {
    return { score: question.points, maxScore: question.points, correct: true, needsReview: false };
  }

  const keywords = Array.isArray(question.keywords) ? question.keywords : [];
  if (keywords.length > 0) {
    const found = keywords.filter((kw) => submitted.includes(normalize(kw))).length;
    const ratio = found / keywords.length;

    if (ratio >= question.minMatchRatio) {
      return { score: question.points, maxScore: question.points, correct: true, needsReview: false };
    }
    if (ratio > 0) {
      return {
        score: round2(question.points * ratio),
        maxScore: question.points,
        correct: false,
        needsReview: true,
      };
    }
  }

  // No similarity match and no (or zero) keyword hits: flag for manual review
  // rather than silently marking a possibly-valid but differently-phrased answer as wrong.
  return { score: 0, maxScore: question.points, correct: false, needsReview: true };
}

function gradeAnswer(question, answer) {
  if (question.type === 'single-choice') return gradeSingleChoice(question, answer);
  if (question.type === 'multiple-choice') return gradeMultipleChoice(question, answer);
  if (question.type === 'text') return gradeText(question, answer);
  throw new Error(`Unbekannter Fragetyp: ${question.type}`);
}

function gradeSubmission(exam, submission) {
  const perQuestion = {};
  let total = 0;
  let maxTotal = 0;
  let needsReview = false;

  for (const question of exam.questions) {
    const result = gradeAnswer(question, submission.answers[question.id]);
    perQuestion[question.id] = result;
    total += result.score;
    maxTotal += result.maxScore;
    if (result.needsReview) needsReview = true;
  }

  const percentage = maxTotal > 0 ? round2((total / maxTotal) * 100) : 0;

  return {
    participant: submission.participant,
    email: submission.email,
    perQuestion,
    total: round2(total),
    maxTotal,
    percentage,
    passed: percentage >= exam.passThreshold,
    needsReview,
  };
}

function gradeExam(exam, submissions) {
  return submissions.map((submission) => gradeSubmission(exam, submission));
}

module.exports = { gradeAnswer, gradeSubmission, gradeExam };
