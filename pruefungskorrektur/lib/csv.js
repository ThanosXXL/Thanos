'use strict';

// Minimal RFC4180-ish CSV parser/writer (no external dependency).
// Supports quoted fields, escaped quotes (""), commas and newlines inside quotes.

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const input = String(text).replace(/\r\n/g, '\n');

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function parseCsvToObjects(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = r[idx] !== undefined ? r[idx] : '';
    });
    return obj;
  });
}

function escapeCsvField(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(columns, rows) {
  const lines = [columns.map(escapeCsvField).join(',')];
  for (const row of rows) {
    lines.push(columns.map((col) => escapeCsvField(row[col])).join(','));
  }
  return lines.join('\n') + '\n';
}

module.exports = { parseCsv, parseCsvToObjects, toCsv };
