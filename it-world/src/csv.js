'use strict';

/** CSV im deutschen Excel-Format (Semikolon, UTF-8 mit BOM) mit Schutz vor Formel-Injection. */
function toCsv(headers, rows) {
  const cell = (v) => {
    if (v === null || v === undefined) return '""';
    let s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
    if (/^[=+\-@\t\r]/.test(s) && typeof v !== 'number') s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.map(cell).join(';'), ...rows.map((r) => r.map(cell).join(';'))];
  return `﻿${lines.join('\r\n')}\r\n`;
}

/** Robuster CSV-Parser (Anführungszeichen, Zeilenumbrüche in Feldern, ; oder , als Trenner). */
function parseCsv(text) {
  const src = String(text).replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

module.exports = { toCsv, parseCsv };
