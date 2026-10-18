// Ansichten: Fristenkalender, Vorlagen, Änderungsprotokoll, Bericht & Export, Sicherheit & Datenschutz, Hilfe.
(function () {
  'use strict';
  const App = window.App;
  const { h, C, S, esc } = App;

  // ---------- Fristenkalender ----------

  const p2 = (n) => String(n).padStart(2, '0');
  const icsDate = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`;
  const icsStamp = (d) => `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`;
  const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const hash32 = (s) => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(16); };
  function fold(line) {
    const out = [];
    let rest = line;
    while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74); }
    out.push(rest);
    return out.join('\r\n');
  }

  function buildIcs(deadlines) {
    const now = icsStamp(new Date());
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//IT-WORLD//Compliance-Assistent//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:IT-WORLD Compliance-Fristen'];
    for (const d of deadlines) {
      const key = d.titel + '|' + d.kat + '|' + d.datum.getTime();
      lines.push('BEGIN:VEVENT', `UID:itw-${hash32(key)}@it-world-compliance`, `DTSTAMP:${now}`);
      if (d.allDay) {
        const next = new Date(d.datum); next.setDate(next.getDate() + 1);
        lines.push(`DTSTART;VALUE=DATE:${icsDate(d.datum)}`, `DTEND;VALUE=DATE:${icsDate(next)}`);
      } else {
        lines.push(`DTSTART:${icsStamp(d.datum)}`, `DTEND:${icsStamp(new Date(d.datum.getTime() + 30 * 60000))}`);
      }
      lines.push(`SUMMARY:${icsEsc(d.titel)}`, `DESCRIPTION:${icsEsc(d.kat + ' – IT-WORLD Compliance-Assistent')}`, 'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Erinnerung', 'END:VALARM', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  App.actions.ics = async function () {
    const dl = App.collectDeadlines();
    if (!dl.length) { App.toast('Es gibt noch keine Termine zum Exportieren.', true); return; }
    try {
      const r = await App.api.saveText({ name: 'IT-WORLD-Compliance-Fristen', ext: 'ics', content: buildIcs(dl) });
      if (r && r.saved) App.toast('Kalenderdatei gespeichert');
    } catch (err) { App.toast('Export fehlgeschlagen: ' + App.cleanErr(err), true); }
  };

  function renderKalender(el) {
    const dl = App.collectDeadlines();
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * App.HOUR);
    const in30 = new Date(now.getTime() + 30 * 24 * App.HOUR);
    const buckets = [
      ['Überfällig', dl.filter((d) => d.overdue), 'bad'],
      ['In den nächsten 7 Tagen', dl.filter((d) => !d.overdue && d.datum <= in7), 'warn'],
      ['In den nächsten 30 Tagen', dl.filter((d) => !d.overdue && d.datum > in7 && d.datum <= in30), ''],
      ['Später', dl.filter((d) => !d.overdue && d.datum > in30), '']
    ];
    el.appendChild(h('div', { class: 'card' },
      h('div', { class: 'grid grid-4' }, buckets.map(([l, arr, c]) => h('div', { class: 'stat' + (c === 'bad' && arr.length ? ' bad' : '') }, h('div', { class: 'stat-num' }, String(arr.length)), h('div', { class: 'stat-lbl' }, l)))),
      h('div', { class: 'btn-row', style: 'margin-top:16px' },
        h('button', { class: 'btn', type: 'button', onclick: App.actions.ics }, '📅 Als Kalenderdatei exportieren (.ics)'),
        h('span', { class: 'sub' }, 'Funktioniert mit Outlook, Google Kalender, Apple Kalender – inklusive Erinnerung am Vortag.'))));
    if (!dl.length) { el.appendChild(h('div', { class: 'card' }, h('div', { class: 'empty' }, 'Noch keine Termine. Fristen entstehen aus Fälligkeiten und Wiedervorlagen an Anforderungen, Meldefristen bei Vorfällen, Betroffenenanfragen sowie Prüf- und Schulungsterminen in den Registern.'))); return; }
    for (const [label, arr, c] of buckets) {
      if (!arr.length) continue;
      el.appendChild(h('div', { class: 'group-title' }, label));
      el.appendChild(h('div', { class: 'card' }, arr.map((d) => h('div', {
        class: 'list-row clickable', tabindex: '0', role: 'button',
        onclick: () => (d.item ? App.openItemModal(d.fw, d.item) : App.go(d.view)),
        onkeydown: (e) => { if (e.key === 'Enter') (d.item ? App.openItemModal(d.fw, d.item) : App.go(d.view)); }
      }, h('div', null, h('div', null, d.titel), h('div', { class: 'sub' }, d.kat)),
        h('div', { class: c === 'bad' ? 'overdue' : '' }, d.allDay ? App.fmtDate(App.toIso(d.datum)) : App.fmtDateTime(d.datum))))));
    }
  }

  App.registerView({
    id: 'kalender', group: 'Überblick', label: 'Fristenkalender', icon: '📅', titel: 'Fristenkalender',
    sub: 'Alle Aufgaben, Wiedervorlagen, Meldefristen und Prüftermine an einem Ort',
    badge: () => { const n = App.collectDeadlines().filter((d) => d.overdue).length; return n ? App.badge(n) : null; }, render: renderKalender
  });

  // ---------- Vorlagen ----------

  function fillTemplate(text) {
    return text.replace(/\[FIRMA\]/g, App.state.firma.name || '[Firma]').replace(/\[DATUM\]/g, App.fmtDate(App.todayIso()));
  }

  function renderVorlagen(el) {
    el.appendChild(h('div', { class: 'notice', style: 'margin-bottom:22px' }, 'Praxisnahe Textvorlagen für Meldungen, Richtlinien und Nachweise. Firmenname und Datum werden automatisch eingesetzt. Bitte prüfen und an Ihre Situation anpassen; die Vorlagen ersetzen keine Rechtsberatung.'));
    const groups = [...new Set(window.VORLAGEN.map((v) => v.gruppe))];
    for (const g of groups) {
      el.appendChild(h('div', { class: 'group-title' }, g));
      for (const v of window.VORLAGEN.filter((x) => x.gruppe === g)) {
        const text = fillTemplate(v.text);
        el.appendChild(h('div', { class: 'card' },
          h('h2', { class: 'card-title' }, v.titel),
          h('details', null, h('summary', null, 'Vorschau anzeigen'), h('pre', { class: 'doc' }, text)),
          h('div', { class: 'btn-row', style: 'margin-top:12px' },
            h('button', { class: 'btn btn-small', type: 'button', onclick: async () => { try { await App.api.copyText(text); App.toast('In die Zwischenablage kopiert'); } catch (err) { App.toast(App.cleanErr(err), true); } } }, 'Kopieren'),
            h('button', { class: 'btn btn-ghost btn-small', type: 'button', onclick: async () => { try { const r = await App.api.saveText({ name: v.titel, ext: 'txt', content: text }); if (r && r.saved) App.toast('Datei gespeichert'); } catch (err) { App.toast(App.cleanErr(err), true); } } }, 'Als Datei speichern'))));
      }
    }
  }

  App.registerView({ id: 'vorlagen', group: 'Betrieb', label: 'Vorlagen', icon: '📝', titel: 'Dokumentvorlagen', sub: 'Meldungen, Richtlinien und Nachweise zum Kopieren und Speichern', render: renderVorlagen });

  // ---------- Änderungsprotokoll ----------

  function renderProtokoll(el) {
    const p = App.state.protokoll;
    const status = h('div', { class: 'notice' }, 'Integritätsprüfung noch nicht ausgeführt.');
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Manipulationssicheres Änderungsprotokoll'),
      h('p', { class: 'card-sub' }, 'Jede Änderung wird mit Zeitstempel erfasst und kryptografisch (SHA-256) mit dem vorherigen Eintrag verkettet. Nachträgliche Änderungen oder Löschungen einzelner Einträge werden bei der Prüfung erkannt. Das stärkt Ihre Rechenschaftspflicht (Art. 5 Abs. 2 DSGVO).'),
      h('div', { class: 'btn-row' },
        h('button', {
          class: 'btn', type: 'button',
          onclick: async () => {
            const r = await App.verifyLog();
            status.className = 'notice ' + (r.ok ? 'notice-ok' : 'notice-bad');
            status.textContent = r.ok ? `✔ Integrität bestätigt: ${r.count} Einträge lückenlos und unverändert.` : `✖ Manipulation oder Beschädigung ab Eintrag ${r.index + 1} erkannt.`;
          }
        }, 'Integrität prüfen'),
        h('button', {
          class: 'btn btn-ghost', type: 'button',
          onclick: async () => {
            const txt = p.map((e) => `${App.fmtDateTime(e.ts)} | ${e.benutzer || '–'} | ${e.aktion} | ${e.ziel} | ${e.detail} | ${e.hash.slice(0, 12)}`).join('\n');
            try { const r = await App.api.saveText({ name: 'IT-WORLD-Aenderungsprotokoll', ext: 'txt', content: txt || 'Keine Einträge.' }); if (r && r.saved) App.toast('Datei gespeichert'); } catch (err) { App.toast(App.cleanErr(err), true); }
          }
        }, 'Als Datei speichern')),
      h('div', { style: 'margin-top:14px' }, status)));
    if (!p.length) { el.appendChild(h('div', { class: 'card' }, h('div', { class: 'empty' }, 'Noch keine Einträge.'))); return; }
    el.appendChild(h('div', { class: 'card' }, p.slice(-200).reverse().map((e) => h('div', { class: 'list-row' },
      h('div', null, h('div', null, e.aktion + (e.ziel ? ': ' + e.ziel : '')), e.detail ? h('div', { class: 'sub' }, e.detail) : null),
      h('div', { class: 'sub', style: 'text-align:right' }, App.fmtDateTime(e.ts), e.benutzer ? h('div', null, e.benutzer) : null)))));
    if (p.length > 200) el.appendChild(h('p', { class: 'sub' }, `Angezeigt werden die letzten 200 von ${p.length} Einträgen.`));
  }

  App.registerView({ id: 'protokoll', group: 'Betrieb', label: 'Änderungsprotokoll', icon: '🧾', titel: 'Änderungsprotokoll', sub: 'Lückenlose, manipulationserkennende Historie aller Änderungen', render: renderProtokoll });

  // ---------- Bericht ----------

  const BERICHT_FELDER = {
    vvt: ['name', 'zweck', 'rechtsgrundlage', 'empfaenger', 'drittland', 'loeschfrist'],
    dienstleister: ['name', 'leistung', 'avv', 'avvDatum', 'standort', 'risiko', 'pruefung'],
    anfragen: ['eingang', 'art', 'referenz', 'status', 'erledigtAm'],
    schulungen: ['thema', 'art', 'datum', 'teilnehmerzahl', 'nachweis', 'naechste']
  };

  async function buildReportHtml(logo) {
    const f = App.state.firma;
    const pct = App.overallPct();
    const eq = App.evidenceQuote();
    const bet = App.betroffenheit(App.state.nis2Check);
    const log = await App.verifyLog();
    let body = '';

    for (const fw of C.FRAMEWORKS) {
      const s = App.fwStats(fw);
      body += `<section><h2>${esc(fw.titel)} <span class="score">${s.pct}%</span></h2><p class="meta">${s.done} erledigt · ${s.wip} in Arbeit · ${s.open} offen · ${s.na} nicht zutreffend · ${s.evid} von ${s.done} erledigten mit Nachweis</p>`;
      for (const g of fw.gruppen) {
        body += `<h3>${esc(g.name)}</h3><table><thead><tr><th>Anforderung</th><th>Status</th><th>Verantwortlich</th><th>Fällig</th><th>Nachweis</th></tr></thead><tbody>`;
        for (const it of g.items) {
          const st = App.itemState(it.id);
          const ev = [st.evidence, st.file ? 'Datei: ' + st.file : '', st.note ? 'Notiz: ' + st.note : ''].filter(Boolean).join(' | ');
          body += `<tr class="s-${esc(st.status)}"><td><strong>${esc(it.text)}</strong><br><span class="ref">${esc(it.ref)}</span></td><td>${esc(App.statusLabel(st.status))}</td><td>${esc(st.owner || '–')}</td><td>${esc(App.fmtDate(st.due))}</td><td>${esc(ev || '–')}</td></tr>`;
        }
        body += '</tbody></table>';
      }
      body += '</section>';
    }

    for (const key of ['vvt', 'dienstleister', 'anfragen', 'schulungen']) {
      const reg = S.REGISTER[key];
      const rows = App.state[key];
      if (!rows.length) continue;
      const cols = BERICHT_FELDER[key].map((k) => reg.fields.find((x) => x.k === k));
      body += `<section><h2>${esc(reg.titel)}</h2><table><thead><tr>${cols.map((c) => `<th>${esc(c.l.replace(/ \(.*$/, ''))}</th>`).join('')}</tr></thead><tbody>`;
      for (const r of rows) {
        body += '<tr>' + cols.map((c) => {
          const v = r[c.k];
          const txt = c.t === 'date' ? App.fmtDate(v) : c.t === 'bool' ? (v ? 'Ja' : 'Nein') : v || '–';
          return `<td>${esc(txt)}</td>`;
        }).join('') + '</tr>';
      }
      body += '</tbody></table></section>';
    }

    if (App.state.vorfaelle.length) {
      body += '<section><h2>Vorfälle und Datenpannen</h2><table><thead><tr><th>Vorfall</th><th>Art</th><th>Kenntnis</th><th>Status</th><th>Maßnahmen</th></tr></thead><tbody>';
      for (const v of App.state.vorfaelle) {
        body += `<tr><td><strong>${esc(v.titel)}</strong><br>${esc(v.beschreibung)}</td><td>${esc(App.ART_LABEL[v.art] || v.art)}</td><td>${esc(App.fmtDateTime(new Date(v.kenntnis)))}</td><td>${esc(App.VSTATUS_LABEL[v.status] || v.status)}</td><td>${esc(v.massnahmen || '–')}</td></tr>`;
      }
      body += '</tbody></table></section>';
    }

    const recent = App.state.protokoll.slice(-40).reverse();
    if (recent.length) {
      body += `<section><h2>Änderungsprotokoll (letzte ${recent.length} Einträge)</h2><p class="meta">Integrität der Hash-Kette: ${log.ok ? 'bestätigt (' + log.count + ' Einträge)' : 'NICHT bestätigt – Manipulation ab Eintrag ' + (log.index + 1)}</p><table><thead><tr><th>Zeitpunkt</th><th>Benutzer</th><th>Aktion</th><th>Details</th></tr></thead><tbody>`;
      for (const e of recent) body += `<tr><td>${esc(App.fmtDateTime(e.ts))}</td><td>${esc(e.benutzer || '–')}</td><td>${esc(e.aktion + (e.ziel ? ': ' + e.ziel : ''))}</td><td>${esc(e.detail)}</td></tr>`;
      body += '</tbody></table></section>';
    }

    return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">
<title>Compliance-Bericht ${esc(f.name || '')}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Open Sans','Segoe UI',Arial,sans-serif;color:#2b2112;margin:0;background:#fff;font-size:12.5px;line-height:1.5}
  .cover{background:#050403;color:#f3e6c8;text-align:center;padding:36px 30px 30px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cover img{width:230px;height:auto}
  .cover h1{margin:6px 0 4px;font-size:28px;color:#f0cc66;letter-spacing:.5px}
  .cover p{margin:2px 0;color:#d8c79c}
  .wrap{padding:22px 30px}
  .overall{display:flex;gap:26px;align-items:center;margin:4px 0 18px}
  .big{font-size:44px;font-weight:700;color:#a67820}
  .score{float:right;color:#a67820}
  h2{font-size:18px;margin:22px 0 4px;border-bottom:2px solid #d9a93e;padding-bottom:4px;color:#3d2a0a;page-break-after:avoid}
  h3{font-size:12px;text-transform:uppercase;letter-spacing:1.4px;color:#8c6218;margin:14px 0 6px;page-break-after:avoid}
  table{width:100%;border-collapse:collapse;margin-bottom:6px}
  th{background:#f4e6bd;text-align:left;font-size:11px;padding:5px 7px;border:1px solid #d9c48a}
  td{vertical-align:top;padding:5px 7px;border:1px solid #e3d6ae}
  tr{page-break-inside:avoid}
  .ref{color:#8b7b55;font-size:10.5px}
  .meta{color:#6e5f3d;margin:0 0 6px}
  tr.s-erledigt td:nth-child(2){color:#2f7a2b;font-weight:700}
  tr.s-offen td:nth-child(2){color:#b03520;font-weight:700}
  tr.s-laeuft td:nth-child(2){color:#a06a00;font-weight:700}
  .box{border:1px solid #d9c48a;background:#fbf4de;padding:10px 14px;border-radius:6px}
  .foot{margin-top:26px;padding-top:8px;border-top:1px solid #d9c48a;color:#6e5f3d;font-size:11px}
</style></head><body>
<div class="cover">
  ${logo ? `<img src="${esc(logo)}" alt="IT-WORLD">` : ''}
  <h1>Compliance-Bericht</h1>
  <p>NIS2 · DSGVO · IT-Sicherheitsnachweise</p>
  <p><strong>${esc(f.name || 'Unternehmen')}</strong>${f.branche ? ' · ' + esc(f.branche) : ''}</p>
  <p>Stand: ${esc(App.fmtDateTime(new Date()))}</p>
</div>
<div class="wrap">
  <div class="overall"><div class="big">${pct}%</div><div><strong>Gesamter Erfüllungsgrad</strong><br>„In Arbeit“ zählt zur Hälfte, „nicht zutreffend“ bleibt unberücksichtigt.</div><div class="big">${eq.pct}%</div><div><strong>Nachweisquote</strong><br>${eq.evid} von ${eq.done} erledigten Anforderungen mit hinterlegtem Nachweis.</div></div>
  <div class="box"><strong>Stammdaten</strong><br>
    Geschäftsleitung: ${esc(f.geschaeftsfuehrung || '–')} · IT-/Informationssicherheit: ${esc(f.itleitung || '–')} · Datenschutz: ${esc(f.dsb || '–')}<br>
    Anschrift: ${esc(f.adresse || '–')} · E-Mail: ${esc(f.email || '–')} · Notfall-Rufnummer: ${esc(f.telefon || '–')}
    ${bet ? `<br><strong>NIS2-Einstufung:</strong> ${esc(App.BETROFFENHEIT_LABEL[bet.typ])} (Größenklasse: ${esc(bet.groesse)})` : ''}</div>
  ${body}
  <div class="foot">Erstellt mit dem IT-WORLD Compliance-Assistenten. Dieser Bericht dient der Dokumentation und Orientierung und ersetzt keine Rechtsberatung oder Zertifizierung.</div>
</div></body></html>`;
  }

  App.actions['report-pdf'] = async function () {
    try {
      const r = await App.api.exportReportPdf(await buildReportHtml(await App.api.getLogo()));
      if (r && r.exported) { App.log('Bericht exportiert', 'PDF', ''); await App.persist(); App.toast('PDF gespeichert'); }
    } catch (err) { App.toast('Export fehlgeschlagen: ' + App.cleanErr(err), true); }
  };
  App.actions['report-html'] = async function () {
    try {
      const r = await App.api.exportReportHtml(await buildReportHtml(await App.api.getLogo()));
      if (r && r.exported) { App.log('Bericht exportiert', 'HTML', ''); await App.persist(); App.toast('HTML-Bericht gespeichert'); }
    } catch (err) { App.toast('Export fehlgeschlagen: ' + App.cleanErr(err), true); }
  };

  function renderBericht(el) {
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Compliance-Bericht erstellen'),
      h('p', { class: 'card-sub' }, 'Alle Anforderungen mit Status, Verantwortlichen, Fristen und Nachweisen, ergänzt um Register, Vorfälle und das Änderungsprotokoll. Als PDF zum Weitergeben an Geschäftsleitung, Kunden, Versicherer oder Auditoren.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: App.actions['report-pdf'] }, '📄 Als PDF speichern'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: App.actions['report-html'] }, 'Als HTML speichern'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: App.actions.ics }, '📅 Fristen (.ics)'))));
    el.appendChild(h('div', { class: 'grid grid-3' }, C.FRAMEWORKS.map((fw) => {
      const s = App.fwStats(fw);
      return h('div', { class: 'card' }, h('h2', { class: 'card-title' }, fw.icon + ' ' + fw.name), h('p', { class: 'card-sub' }, `${s.done} / ${s.total} erledigt`), App.tube(s.pct));
    })));
    el.appendChild(h('div', { class: 'card', style: 'margin-top:22px' },
      h('h2', { class: 'card-title' }, 'Datensicherung'),
      h('p', { class: 'card-sub' }, App.vault.encrypted ? 'Da die Verschlüsselung aktiv ist, wird auch Ihre Sicherung verschlüsselt (gleiches Passwort).' : 'Achtung: Ohne aktivierte Verschlüsselung ist die Sicherungsdatei im Klartext lesbar. Aktivieren Sie unter „Sicherheit & Datenschutz“ die Verschlüsselung.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => App.actions.backup() }, 'Daten sichern'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => App.actions.restore() }, 'Sicherung laden'))));
  }

  App.registerView({ id: 'bericht', group: 'Berichte', label: 'Bericht & Export', icon: '📄', titel: 'Bericht & Export', sub: 'Nachweismappe für Geschäftsleitung, Kunden, Versicherer und Auditoren', render: renderBericht });

  // ---------- Sicherheit & Datenschutz ----------

  function strength(pw) {
    let score = 0;
    if (pw.length >= 10) score += 25;
    if (pw.length >= 14) score += 25;
    if (/[a-zäöüß]/.test(pw) && /[A-ZÄÖÜ]/.test(pw)) score += 15;
    if (/\d/.test(pw)) score += 15;
    if (/[^A-Za-z0-9äöüÄÖÜß]/.test(pw)) score += 10;
    if (pw.length >= 20) score += 10;
    return Math.min(100, score);
  }

  function pwFields(withMeter) {
    const pw = h('input', { type: 'password', autocomplete: 'new-password', maxlength: '256' });
    const pw2 = h('input', { type: 'password', autocomplete: 'new-password', maxlength: '256' });
    const meter = h('div', { class: 'tube small' }, h('div', { class: 'tube-fill' }));
    const hint = h('div', { class: 'sub' }, 'Mindestens 10 Zeichen. Empfohlen: Passphrase aus mehreren Wörtern.');
    if (withMeter) {
      pw.addEventListener('input', () => {
        const s = strength(pw.value);
        meter.firstChild.style.width = s + '%';
        hint.textContent = pw.value.length < 10 ? 'Mindestens 10 Zeichen erforderlich.' : s < 50 ? 'Ausreichend – länger ist besser.' : s < 75 ? 'Gut.' : 'Sehr stark.';
      });
    }
    return { pw, pw2, meter, hint };
  }

  function renderSicherheit(el) {
    const enc = App.vault.encrypted;
    const s = App.state.einstellungen;

    // --- Verschlüsselung ---
    const card = h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Datenverschlüsselung (Art. 32 DSGVO)'),
      h('p', { class: 'card-sub' }, enc ? 'Ihre Daten liegen verschlüsselt auf der Festplatte: AES-256-GCM, Schlüssel per scrypt aus Ihrem Passwort.' : 'Ihre Daten liegen aktuell unverschlüsselt (nur für Ihren Benutzer lesbar). Mit einem Passwort verschlüsseln Sie die Datenablage, Sicherungen und die Sperre der Anwendung.'));
    if (!enc) {
      const f = pwFields(true);
      card.appendChild(h('div', { class: 'form-grid' }, App.field('Passwort', f.pw), App.field('Passwort wiederholen', f.pw2), h('div', { class: 'wide' }, f.meter, f.hint)));
      card.appendChild(h('div', { class: 'notice', style: 'margin-top:14px' }, '⚠ Es gibt keine Passwort-Wiederherstellung. Wer das Passwort vergisst, kann die Daten nicht mehr öffnen – notieren Sie es sicher und legen Sie Datensicherungen an.'));
      card.appendChild(h('div', { class: 'btn-row', style: 'margin-top:16px' }, h('button', {
        class: 'btn', type: 'button',
        onclick: async () => {
          if (f.pw.value !== f.pw2.value) { App.toast('Die Passwörter stimmen nicht überein.', true); return; }
          try {
            await App.api.setPassword(f.pw.value);
            App.vault.encrypted = true;
            App.log('Verschlüsselung aktiviert', '', '');
            await App.persist();
            App.render();
            App.toast('Verschlüsselung aktiviert');
          } catch (err) { App.toast(App.cleanErr(err), true); }
        }
      }, '🔒 Verschlüsselung aktivieren')));
    } else {
      const oldPw = h('input', { type: 'password', autocomplete: 'current-password', maxlength: '256' });
      const f = pwFields(true);
      card.appendChild(h('div', { class: 'pill pill-erledigt', style: 'margin-bottom:14px' }, '🔒 Verschlüsselung aktiv'));
      card.appendChild(h('div', { class: 'form-grid' }, App.field('Aktuelles Passwort', oldPw, true), App.field('Neues Passwort', f.pw), App.field('Neues Passwort wiederholen', f.pw2), h('div', { class: 'wide' }, f.meter, f.hint)));
      card.appendChild(h('div', { class: 'btn-row', style: 'margin-top:16px' },
        h('button', {
          class: 'btn', type: 'button',
          onclick: async () => {
            if (f.pw.value !== f.pw2.value) { App.toast('Die neuen Passwörter stimmen nicht überein.', true); return; }
            try {
              await App.api.changePassword(oldPw.value, f.pw.value);
              App.log('Passwort geändert', '', '');
              await App.persist();
              App.render();
              App.toast('Passwort geändert');
            } catch (err) { App.toast(App.cleanErr(err), true); }
          }
        }, 'Passwort ändern'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => App.actions.lock() }, 'Jetzt sperren'),
        h('button', {
          class: 'btn btn-danger btn-small', type: 'button',
          onclick: () => {
            if (!oldPw.value) { App.toast('Bitte oben das aktuelle Passwort eingeben.', true); return; }
            App.confirmModal('Verschlüsselung entfernen?', 'Die Daten werden danach unverschlüsselt gespeichert. Das senkt das Schutzniveau (Art. 32 DSGVO).', 'Entfernen', async () => {
              try {
                await App.api.removePassword(oldPw.value);
                App.vault.encrypted = false;
                App.log('Verschlüsselung entfernt', '', '');
                await App.persist();
                App.render();
                App.toast('Verschlüsselung entfernt');
              } catch (err) { App.toast(App.cleanErr(err), true); }
            });
          }
        }, 'Verschlüsselung entfernen')));
    }
    el.appendChild(card);

    // --- Einstellungen ---
    const benutzer = h('input', { type: 'text', value: s.benutzer || '', maxlength: '80', autocomplete: 'off', placeholder: 'Name oder Kürzel für das Änderungsprotokoll' });
    const lockSel = h('select', null, S.AUTOLOCK_MINUTEN.map((m) => h('option', { value: String(m), selected: m === s.autoLockMin }, m === 0 ? 'Aus' : `Nach ${m} Min. Inaktivität`)));
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Sperre und Protokoll'),
      h('p', { class: 'card-sub' }, 'Die Auto-Sperre wirkt, sobald die Verschlüsselung aktiv ist. Zusätzlich sperrt die Anwendung automatisch, wenn Ihr Betriebssystem den Bildschirm sperrt oder in den Ruhezustand geht.'),
      h('div', { class: 'form-grid' }, App.field('Benutzername im Protokoll', benutzer), App.field('Auto-Sperre', lockSel)),
      h('div', { class: 'btn-row', style: 'margin-top:16px' }, h('button', {
        class: 'btn', type: 'button',
        onclick: async () => {
          App.state.einstellungen = { benutzer: benutzer.value.trim(), autoLockMin: Number(lockSel.value) };
          App.log('Einstellungen geändert', 'Sicherheit', '');
          await App.persist();
          App.actions.restartIdle && App.actions.restartIdle();
          App.toast('Gespeichert');
        }
      }, 'Speichern'))));

    // --- Schutzmaßnahmen ---
    const measures = [
      ['Vollständig offline', 'Jede Netzwerkanfrage wird im Programm blockiert, auch die Namensauflösung (DNS) ist abgeschaltet. Keine Telemetrie, kein Auto-Update, keine Konten.'],
      ['Abgeschottete Oberfläche', 'Die Oberfläche läuft in der Chromium-Sandbox ohne Zugriff auf das Betriebssystem. Popups, Webviews, Navigation und Geräte-Berechtigungen sind gesperrt.'],
      ['Strenge Inhaltsrichtlinie', 'Eigenes app://-Protokoll statt file://, Content-Security-Policy mit Trusted Types: kein fremder oder nachgeladener Code kann ausgeführt werden.'],
      ['Geprüfte Schnittstellen', 'Der Hauptprozess nimmt Aufrufe nur von der eigenen Oberfläche an und prüft jede Eingabe per Whitelist (Typen, Längen, Steuer- und Richtungszeichen). Manipulierte Sicherungen werden bereinigt oder abgelehnt.'],
      ['Verschlüsselung und Sperre', 'AES-256-GCM, scrypt-Schlüsselableitung, wachsende Wartezeit bei Fehlversuchen, Auto-Sperre, Sperre bei Bildschirmsperre des Systems.'],
      ['Sichere Dateien', 'Atomares Schreiben, Zugriffsrechte nur für Ihren Benutzer, automatische Sicherungskopie; beschädigte Dateien werden zur Seite gelegt statt überschrieben.'],
      ['Manipulationserkennung', 'Änderungsprotokoll als SHA-256-Hash-Kette, Programmdateien durch Electron-Integritätsprüfung geschützt.'],
      ['Nachweisdateien', 'Nur als Pfad verknüpft, nie kopiert und nie ausgeführt; Netzwerkpfade (UNC) werden nicht aufgelöst.'],
      ['Berichte', 'Alle Inhalte werden maskiert, PDFs ohne JavaScript erzeugt, temporäre Dateien überschrieben und gelöscht.'],
      ['Einzelne Instanz', 'Die Anwendung kann nur einmal gleichzeitig laufen und teilt sich so keine Daten mit Doppelstarts.']
    ];
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Schutzmaßnahmen dieser Anwendung'),
      h('p', { class: 'card-sub' }, 'Für Ihr eigenes Verarbeitungsverzeichnis und Ihre TOM-Dokumentation (Art. 30 und 32 DSGVO).'),
      measures.map(([t, d]) => h('div', { class: 'list-row top' }, h('div', { class: 'check-mark' }, '✔'), h('div', { style: 'flex:1' }, h('div', { class: 'item-text' }, t), h('div', { class: 'sub' }, d))))));

    // --- Datenschutzhinweis ---
    const dsText = `DATENSCHUTZ- UND SICHERHEITSBESCHREIBUNG – Software „IT-WORLD Compliance-Assistent“

Verantwortlicher: ${App.state.firma.name || '[Firma]'} (Betreiber der Installation). Der Softwareanbieter IT-WORLD erhält keinerlei personenbezogene Daten und ist weder Auftragsverarbeiter noch gemeinsamer Verantwortlicher, da die Anwendung vollständig lokal und ohne Netzwerkverbindung arbeitet.

Zweck: Dokumentation und Steuerung der Compliance (NIS2, DSGVO, IT-Sicherheit).
Datenkategorien: Unternehmensstammdaten, Kontaktdaten von Verantwortlichen, Bearbeitungsstände, Nachweisbeschreibungen, Vorfalls- und Anfragedokumentation (datensparsam, ohne Klarnamen Betroffener).
Speicherort: lokale Datei im Benutzerprofil des Betriebssystems, Rechte nur für den angemeldeten Benutzer, optional AES-256-GCM-verschlüsselt.
Löschung: Funktion „Alle Daten sicher löschen“ (Überschreiben und Löschen der Datei und der Sicherungskopien).
Technische und organisatorische Maßnahmen: Offline-Betrieb (Netzwerk blockiert), Sandbox, strenge CSP, Eingabevalidierung, Passwortschutz mit Auto-Sperre, manipulationserkennendes Änderungsprotokoll, Zugriffsschutz der Dateien.
Empfänger: keine. Drittlandübermittlung: keine.`;
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Datenschutzbeschreibung zur Übernahme'),
      h('p', { class: 'card-sub' }, 'Textbaustein für Ihr Verarbeitungsverzeichnis und Ihre TOM-Dokumentation.'),
      h('details', null, h('summary', null, 'Anzeigen'), h('pre', { class: 'doc' }, dsText)),
      h('div', { class: 'btn-row', style: 'margin-top:12px' },
        h('button', { class: 'btn btn-small', type: 'button', onclick: async () => { try { await App.api.copyText(dsText); App.toast('Kopiert'); } catch (err) { App.toast(App.cleanErr(err), true); } } }, 'Kopieren'),
        h('button', { class: 'btn btn-ghost btn-small', type: 'button', onclick: async () => { try { const r = await App.api.saveText({ name: 'Datenschutzbeschreibung-IT-WORLD-Compliance-Assistent', ext: 'txt', content: dsText }); if (r && r.saved) App.toast('Gespeichert'); } catch (err) { App.toast(App.cleanErr(err), true); } } }, 'Als Datei speichern'))));

    // --- Datenspeicherort & Löschen ---
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Speicherort und Löschung (Art. 17 DSGVO)'),
      h('p', { class: 'card-sub' }, App.info ? `Ihre Daten liegen in: ${App.info.dataDir}` : 'Ihre Daten liegen im Benutzerprofil Ihres Betriebssystems.'),
      h('p', { class: 'card-sub' }, 'Sicheres Löschen überschreibt die Datendatei und alle Sicherungskopien vor dem Entfernen (Best Effort; auf SSDs zusätzlich die Festplattenverschlüsselung Ihres Betriebssystems nutzen). Von Ihnen erstellte Sicherungsdateien an anderen Orten bleiben bestehen.'),
      h('button', {
        class: 'btn btn-danger btn-small', type: 'button',
        onclick: () => App.confirmModal('Alle Daten sicher löschen?', 'Unternehmensprofil, Bearbeitungsstände, Nachweise, Register, Vorfälle und Protokoll werden unwiderruflich entfernt. Auch die Verschlüsselung wird zurückgesetzt.', 'Alles löschen', async () => {
          try {
            await App.api.wipeData();
            App.state = App.emptyState();
            App.vault.encrypted = false;
            App.go('dashboard');
            App.toast('Alle Daten wurden sicher gelöscht');
          } catch (err) { App.toast(App.cleanErr(err), true); }
        }, { typed: 'LÖSCHEN' })
      }, 'Alle Daten sicher löschen')));
  }

  App.registerView({
    id: 'sicherheit', group: 'Einstellungen', label: 'Sicherheit & Datenschutz', icon: '🛡', titel: 'Sicherheit & Datenschutz',
    sub: 'Verschlüsselung, Sperre, Schutzmaßnahmen und Löschung', badge: () => (App.vault.encrypted ? null : App.badge('!')), render: renderSicherheit
  });

  // ---------- Hilfe & Info ----------

  function renderHilfe(el) {
    const keys = [['Strg/⌘ + K', 'Suchen und springen'], ['Strg/⌘ + 1 … 9', 'Ansichten wechseln'], ['Strg/⌘ + S', 'Datensicherung erstellen'], ['Strg/⌘ + O', 'Datensicherung laden'], ['Strg/⌘ + P', 'Bericht als PDF'], ['Strg/⌘ + L', 'Anwendung sperren'], ['Esc', 'Dialog schließen']];
    el.appendChild(h('div', { class: 'grid grid-2' },
      h('div', { class: 'card' }, h('h2', { class: 'card-title' }, 'Tastenkürzel'), keys.map(([k, d]) => h('div', { class: 'list-row' }, h('kbd', null, k), h('span', null, d)))),
      h('div', { class: 'card' }, h('h2', { class: 'card-title' }, 'So arbeiten Sie am besten'),
        h('ol', { class: 'steps' },
          h('li', null, 'Unternehmensprofil ausfüllen und NIS2-Betroffenheit prüfen.'),
          h('li', null, 'Regelwerke durchgehen: Status, Verantwortliche, Fälligkeit und Nachweis je Anforderung.'),
          h('li', null, 'Register pflegen: Verarbeitungsverzeichnis, Dienstleister, Anfragen, Schulungen.'),
          h('li', null, 'Vorfälle sofort erfassen – die Fristen laufen automatisch mit.'),
          h('li', null, 'Fristen als .ics in den Kalender übernehmen, Verschlüsselung aktivieren, Bericht erstellen.')))));
    el.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Über diese Anwendung'),
      h('p', { class: 'card-sub', style: 'margin:0 0 8px' }, `IT-WORLD Compliance-Assistent · Version ${App.info ? App.info.version : '–'}${App.info ? ' · Electron ' + App.info.electron : ''}`),
      h('p', { class: 'card-sub', style: 'margin:0 0 8px' }, 'Orientierungshilfe nach bestem Stand (NIS2-Umsetzungsgesetz/BSIG, DSGVO/BDSG, BSI-Grundschutz, CIS Controls). Sie ersetzt keine Rechtsberatung oder Zertifizierung; Paragrafen und Fristen bitte vor verbindlicher Nutzung rechtlich prüfen lassen.'),
      h('p', { class: 'card-sub', style: 'margin:0' }, 'Eingebettete Komponenten: Electron (MIT), Open Sans (SIL Open Font License 1.1).')));
  }

  App.registerView({ id: 'hilfe', group: 'Einstellungen', label: 'Hilfe & Info', icon: '❓', titel: 'Hilfe & Info', sub: 'Tastenkürzel, Arbeitsweise und Hinweise', render: renderHilfe });
})();
