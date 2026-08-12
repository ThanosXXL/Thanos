// Deterministische JSON-Serialisierung (Schlüssel alphabetisch sortiert) —
// muss inhaltsgleich zur Version im Lizenzserver sein
// (steuerwelt-license-server/src/canonical.js), sonst stimmen Signaturen
// nicht mehr überein.
function canonicalize(value) {
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

module.exports = { canonicalize };
