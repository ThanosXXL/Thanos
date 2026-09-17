const { meta, days, kursbeschreibung: kb } = require('./content');
const { iconDataUri } = require('./pdf-common');

const DAY_ICON = {
  1: 'day1-organigramm',
  2: 'day2-ausschreibung',
  3: 'day3-terminplanung',
  4: 'day4-kosten',
  5: 'day5-sicherheit',
  6: 'day6-kommunikation',
};

function coverPage() {
  return `
  <div class="cover">
    <div class="doctype">Kursbeschreibung</div>
    <h1>${meta.titel}</h1>
    <h2>${meta.untertitel}</h2>
    <img class="beispielbild" src="${iconDataUri('hero-skyline')}" style="width:100%; max-width:400px; margin:6px auto 22px auto;">
    <p style="max-width:480px; text-align:center; font-size:11pt; color:#333; margin:0 0 22px 0;">${kb.kurzbeschreibung}</p>
    <div class="info-grid" style="max-width:480px;">
      <div class="info-tile"><span class="num">${meta.dauerTage}</span><span class="lbl">Schulungstage</span></div>
      <div class="info-tile"><span class="num">${meta.gesamtstunden}</span><span class="lbl">Stunden gesamt</span></div>
      <div class="info-tile"><span class="num">5</span><span class="lbl">Prüfungsfragen</span></div>
    </div>
    <div class="footer-note">${meta.akademie} — ${meta.ort} · Stand: ${meta.stand}</div>
  </div>`;
}

function zielgruppeSection() {
  return `
  <div class="day-section">
    <div class="day-header">
      <h1 style="margin:0;">Zielgruppe &amp; Voraussetzungen</h1>
      <img class="thema-icon" style="margin-left:auto;" src="${iconDataUri('teilnehmer-gruppe')}" alt="">
    </div>
    <div class="lernziele">
      <h4>Die Schulung richtet sich an</h4>
      <ul>${kb.zielgruppe.map(z => `<li>${z}</li>`).join('')}</ul>
    </div>
    <p style="text-align:justify;"><b>Voraussetzungen:</b> ${kb.voraussetzungen}</p>
  </div>`;
}

function inhalteSection() {
  return `
  <div class="day-section">
    <h1 class="section-title">Kursinhalte im Überblick</h1>
    ${days.map(d => `
      <div class="thema">
        <div class="thema-head">
          <img src="${iconDataUri(DAY_ICON[d.nr])}" style="width:34px;height:34px;object-fit:contain;">
          <span class="block-tag">Tag ${d.nr}</span>
          <h3>${d.titel}</h3>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function nutzenMethodikSection() {
  return `
  <div class="day-section">
    <h1 class="section-title">Ihr Nutzen</h1>
    <div class="lernziele">
      <ul>${kb.nutzen.map(n => `<li>${n}</li>`).join('')}</ul>
    </div>
    <h1 class="section-title" style="margin-top:24px;">Methodik</h1>
    <div class="lernziele">
      <ul>${kb.methodik.map(m => `<li>${m}</li>`).join('')}</ul>
    </div>
  </div>`;
}

function pruefungUnterlagenSection() {
  return `
  <div class="day-section">
    <div class="day-header">
      <h1 style="margin:0;">Prüfung &amp; Zertifikat</h1>
      <img class="thema-icon" style="margin-left:auto;" src="${iconDataUri('pruefung-klemmbrett')}" alt="">
    </div>
    <p style="text-align:justify;">${kb.pruefung}</p>
    <h1 class="section-title" style="margin-top:24px;">Enthaltene Unterlagen</h1>
    <div class="lernziele">
      <ul>${kb.unterlagen.map(u => `<li>${u}</li>`).join('')}</ul>
    </div>
    <div class="uebung-box" style="margin-top:24px;">
      <b>Anmeldung:</b> ${kb.anmeldung}
    </div>
  </div>`;
}

function buildKursbeschreibung() {
  return `
  ${coverPage()}
  ${zielgruppeSection()}
  ${inhalteSection()}
  ${nutzenMethodikSection()}
  ${pruefungUnterlagenSection()}
  `;
}

module.exports = { buildKursbeschreibung };
