'use strict';

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[.,;:!?"'()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = new Array(rows);
  for (let i = 0; i < rows; i++) {
    dist[i] = new Array(cols);
    dist[i][0] = i;
  }
  for (let j = 0; j < cols; j++) dist[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost
      );
    }
  }
  return dist[rows - 1][cols - 1];
}

// Character-level similarity, good for single words / short phrases (typo-tolerant).
function charSimilarityRatio(textA, textB) {
  const a = normalize(textA);
  const b = normalize(textB);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Fraction of expectedText's words that also occur in actualText, regardless of
// extra elaboration or word order in actualText. Good for judging whether a
// (possibly longer) free-text answer covers the substance of an expected answer.
function containmentRatio(expectedText, actualText) {
  const expectedWords = normalize(expectedText).split(' ').filter(Boolean);
  if (expectedWords.length === 0) return 0;
  const actualWords = new Set(normalize(actualText).split(' ').filter(Boolean));
  const hits = expectedWords.filter((w) => actualWords.has(w)).length;
  return hits / expectedWords.length;
}

// Returns a similarity ratio between 0 (completely different) and 1 (identical),
// combining character-level similarity with word-containment so that answers
// which restate the expected content with extra wording still score well.
function similarityRatio(actualText, expectedText) {
  return Math.max(charSimilarityRatio(actualText, expectedText), containmentRatio(expectedText, actualText));
}

module.exports = { normalize, levenshtein, charSimilarityRatio, containmentRatio, similarityRatio };
