const { meta, tagesraster, days, didaktischeHinweise } = require('./content');
const { iconDataUri } = require('./pdf-common');

const DAY_ICON = {
  1: 'day1-organigramm',
  2: 'day2-ausschreibung',
  3: 'day3-terminplanung',
  4: 'day4-kosten',
  5: 'day5-sicherheit',
  6: 'day6-kommunikation',
};

function zeitrasterTable() {
  return `
  <table class="zeitraster">
    <thead><tr><th style="width:28%;">Zeit</th><th style="width:18%;">Dauer</th><th>Programmpunkt</th></tr></thead>
    <tbody>
      ${tagesraster.map(z => `
      <tr class="${z.art === 'Pause' || z.art === 'Mittagspause' ? 'pause' : ''}">
        <td>${z.zeit} Uhr</td>
        <td>${z.dauer}</td>
        <td>${z.art}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function coverPage({ doctypeLabel, titelZusatz }) {
  return `
  <div class="cover">
    <div class="doctype">${doctypeLabel}</div>
    <h1>${meta.titel}</h1>
    <h2>${meta.untertitel}${titelZusatz ? ' — ' + titelZusatz : ''}</h2>
    <img class="beispielbild" src="${iconDataUri('hero-skyline')}" style="width:100%; max-width:400px; margin:6px auto 26px auto;">
    <div class="meta-box">
      <div><b>Veranstalter:</b> ${meta.akademie}</div>
      <div><b>Dauer:</b> ${meta.dauerTage} Tage à ${meta.stundenProTag} Stunden (${meta.gesamtstunden} Std. gesamt)</div>
      <div><b>Format:</b> ${meta.ort}</div>
      <div><b>Stand:</b> ${meta.stand}</div>
    </div>
    <div class="footer-note">© ${new Date().getFullYear()} ${meta.akademie} — Alle Rechte vorbehalten. Nachdruck, auch auszugsweise, nur mit schriftlicher Genehmigung.</div>
  </div>`;
}

function tocPage({ fuerDozenten }) {
  const items = [
    'Überblick &amp; Zeitraster',
    ...days.map(d => `Tag ${d.nr} — ${d.titel}`),
    'Hinweise zur Abschlussprüfung',
  ];
  return `
  <div class="toc">
    <h1 class="section-title">Inhaltsverzeichnis</h1>
    <div class="info-grid">
      <div class="info-tile"><span class="num">${meta.dauerTage}</span><span class="lbl">Schulungstage</span></div>
      <div class="info-tile"><span class="num">${meta.gesamtstunden}</span><span class="lbl">Stunden gesamt</span></div>
      <div class="info-tile"><span class="num">5</span><span class="lbl">Prüfungsfragen</span></div>
    </div>
    ${items.map((it, i) => `<div class="toc-item"><span>${it}</span><span>${i === 0 ? '' : ''}</span></div>`).join('')}
    ${fuerDozenten ? '<p style="margin-top:16px; font-size:9.5pt; color:#8a5a00;"><b>Hinweis:</b> Dieses Dozentenhandbuch enthält zusätzliche didaktische Hinweise (gelb hinterlegt) und ist ausschließlich für Dozentinnen und Dozenten der '+meta.akademie+' bestimmt.</p>' : ''}
  </div>`;
}

function ueberblickPage() {
  return `
  <div class="toc">
    <h1 class="section-title">Überblick &amp; Zeitraster</h1>
    <p style="text-align:justify;">Die Schulung „${meta.titel}" vermittelt Fach- und Führungskräften aus dem Baugewerbe an ${meta.dauerTage} Tagen die wesentlichen Methoden und Werkzeuge des Bau & Projektmanagements — von der Projektinitiierung über Ausschreibung, Termin- und Kostenplanung bis hin zu Qualitätssicherung, Baurecht und Abschlussprüfung. Jeder Schulungstag umfasst ${meta.stundenProTag} Zeitstunden und folgt dem nachstehenden Zeitraster.</p>
    <h3 style="margin-top:22px;">Tägliches Zeitraster (${meta.stundenProTag} Stunden)</h3>
    ${zeitrasterTable()}
    <h3>Lernzielübersicht</h3>
    <table class="zeitraster">
      <thead><tr><th style="width:14%;">Tag</th><th>Thema</th></tr></thead>
      <tbody>
        ${days.map(d => `<tr><td><b>Tag ${d.nr}</b></td><td>${d.titel}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function daySection(d, { fuerDozenten }) {
  return `
  <div class="day-section">
    <div class="day-header">
      <div class="day-badge">${d.nr}</div>
      <h1>Tag ${d.nr}: ${d.titel}</h1>
      <img class="thema-icon" style="margin-left:auto;" src="${iconDataUri(DAY_ICON[d.nr])}" alt="">
    </div>
    <div class="lernziele">
      <h4>Lernziele des Tages</h4>
      <ul>${d.lernziele.map(l => `<li>${l}</li>`).join('')}</ul>
    </div>
    ${d.themen.map(t => `
      <div class="thema">
        <div class="thema-head">
          <span class="block-tag">${t.block}</span>
          <h3>${t.titel}</h3>
        </div>
        ${t.titel.startsWith('Übung') ? `<div class="uebung-box"><p style="margin:0;">${t.text}</p></div>` : `<p>${t.text}</p>`}
      </div>
    `).join('')}
    ${fuerDozenten ? `
    <div class="hinweis-box">
      <span class="label">Didaktischer Hinweis für Dozentinnen und Dozenten</span>
      ${didaktischeHinweise[d.nr]}
    </div>` : ''}
  </div>`;
}

function pruefungshinweisPage({ fuerDozenten }) {
  return `
  <div class="day-section">
    <h1 class="section-title">Hinweise zur Abschlussprüfung</h1>
    <p style="text-align:justify;">Am Nachmittag von Tag 6 findet die schriftliche Abschlussprüfung statt. Sie umfasst 5 Prüfungsfragen im Multiple-Choice-Format zu den Inhalten aller sechs Schulungstage. Die Prüfungsfragen sind in einem separaten Dokument zusammengefasst:</p>
    <ul>
      <li><b>„Prüfungsfragen – Teilnehmerversion"</b>: interaktives PDF-Formular zum Anklicken der Antwortoptionen, ohne Lösungen, zum Download und Ausfüllen durch die Teilnehmenden.</li>
      <li><b>„Prüfungsfragen – Dozentenversion mit Lösungen"</b>: identische Fragen inklusive markierter Lösungen und Erläuterungen, ausschließlich für Dozentinnen und Dozenten.</li>
    </ul>
    ${fuerDozenten ? `<p style="text-align:justify;">Bitte teilen Sie ausschließlich die Teilnehmerversion an die Kursteilnehmenden aus. Die Dozentenversion mit Lösungen dient der Auswertung und darf nicht an Teilnehmende weitergegeben werden.</p>` : `<p style="text-align:justify;">Zum Bestehen der Prüfung müssen mindestens 4 von 5 Fragen richtig beantwortet werden. Die Auswertung erfolgt gemeinsam im Plenum im Anschluss an die Prüfung.</p>`}
  </div>`;
}

function buildHandbuch({ fuerDozenten }) {
  const doctypeLabel = fuerDozenten ? 'Dozentenhandbuch' : 'Teilnehmerhandbuch';
  return `
  ${coverPage({ doctypeLabel })}
  ${tocPage({ fuerDozenten })}
  ${ueberblickPage()}
  ${days.map(d => daySection(d, { fuerDozenten })).join('')}
  ${pruefungshinweisPage({ fuerDozenten })}
  `;
}

module.exports = { buildHandbuch };
