'use strict';

function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderRow(result) {
  const rowClass = result.needsReview ? 'row-review' : result.passed ? 'row-passed' : 'row-failed';
  return `
      <tr class="${rowClass}">
        <td>${escapeHtml(result.participant)}</td>
        <td>${escapeHtml(result.email)}</td>
        <td>${result.total} / ${result.maxTotal}</td>
        <td>${result.percentage}%</td>
        <td><span class="badge ${result.passed ? 'badge-pass' : 'badge-fail'}">${result.passed ? 'bestanden' : 'nicht bestanden'}</span></td>
        <td>${result.needsReview ? '<span class="badge badge-review">manuell prüfen</span>' : '—'}</td>
      </tr>`;
}

function renderHtmlReport(exam, results) {
  const passedCount = results.filter((r) => r.passed).length;
  const reviewCount = results.filter((r) => r.needsReview).length;
  const rows = results.map(renderRow).join('\n');

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${escapeHtml(exam.title || 'Prüfungsergebnisse')}</title>
<style>
  :root {
    --green-50: #f0fdf4;
    --green-100: #dcfce7;
    --green-200: #bbf7d0;
    --green-500: #22c55e;
    --green-600: #16a34a;
    --green-700: #15803d;
    --green-900: #14532d;
    --ink: #1a2e22;
    --paper: #ffffff;
    --border: var(--green-200);
    --amber-100: #fef3c7;
    --amber-700: #92400e;
    --red-100: #fee2e2;
    --red-700: #b91c1c;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --ink: #eafbf0;
      --paper: #0f2417;
      --border: #1f4a30;
      --green-50: #123420;
      --green-100: #163d24;
      --amber-100: #3a2f10;
      --amber-700: #fcd34d;
      --red-100: #3a1414;
      --red-700: #fca5a5;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--green-50);
    color: var(--ink);
    padding: 2rem 1rem;
  }
  .container { max-width: 960px; margin: 0 auto; }
  header {
    background: linear-gradient(135deg, var(--green-600), var(--green-500));
    color: #ffffff;
    border-radius: 16px;
    padding: 1.75rem 2rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 8px 24px rgba(21, 128, 61, 0.25);
  }
  header h1 { margin: 0 0 .25rem; font-size: 1.5rem; }
  header p { margin: 0; opacity: .9; }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .stat-card {
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1rem 1.25rem;
  }
  .stat-card .value { font-size: 1.75rem; font-weight: 700; color: var(--green-700); }
  .stat-card .label { font-size: .85rem; opacity: .75; }
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--paper);
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  th, td {
    text-align: left;
    padding: .65rem .9rem;
    border-bottom: 1px solid var(--border);
    font-size: .9rem;
  }
  th {
    background: var(--green-100);
    color: var(--green-900);
    font-weight: 600;
  }
  tr:last-child td { border-bottom: none; }
  .badge {
    display: inline-block;
    padding: .15rem .6rem;
    border-radius: 999px;
    font-size: .75rem;
    font-weight: 600;
  }
  .badge-pass { background: var(--green-100); color: var(--green-700); }
  .badge-fail { background: var(--red-100); color: var(--red-700); }
  .badge-review { background: var(--amber-100); color: var(--amber-700); }
  .row-review td:first-child { border-left: 3px solid #f59e0b; }
  footer { margin-top: 1.5rem; font-size: .8rem; opacity: .65; }
  .table-wrap { overflow-x: auto; }
</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeHtml(exam.title || 'Prüfungsergebnisse')}</h1>
      <p>Automatisierte Korrektur — Bestehensgrenze: ${exam.passThreshold}%</p>
    </header>

    <div class="stats">
      <div class="stat-card"><div class="value">${results.length}</div><div class="label">Teilnehmer</div></div>
      <div class="stat-card"><div class="value">${passedCount}</div><div class="label">bestanden</div></div>
      <div class="stat-card"><div class="value">${reviewCount}</div><div class="label">zur manuellen Prüfung</div></div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Teilnehmer</th>
            <th>E-Mail</th>
            <th>Punkte</th>
            <th>Prozent</th>
            <th>Status</th>
            <th>Hinweis</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>

    <footer>Erstellt mit dem Pruefungskorrektur-Tool. Als "manuell prüfen" markierte Freitextantworten bitte vor der Kommunikation an Teilnehmer gegenprüfen.</footer>
  </div>
</body>
</html>
`;
}

module.exports = { renderHtmlReport };
