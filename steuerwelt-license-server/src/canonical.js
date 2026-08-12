// Deterministische JSON-Serialisierung (Schlüssel alphabetisch sortiert),
// damit Server und Client beim Signieren/Prüfen exakt denselben Bytestring
// erzeugen. Muss inhaltsgleich auch in der SteuerWelt-App vorliegen
// (steuerwelt/license/canonical.js).
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
