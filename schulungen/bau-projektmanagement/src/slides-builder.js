const { meta, days, tagesraster } = require('./content');
const { iconDataUri, fontFaceCss } = require('./pdf-common');

const DAY_ICON = {
  1: 'day1-organigramm',
  2: 'day2-ausschreibung',
  3: 'day3-terminplanung',
  4: 'day4-kosten',
  5: 'day5-sicherheit',
  6: 'day6-kommunikation',
};

function toBullets(text) {
  return text
    .split(/(?<=\.)\s+(?=[A-ZÄÖÜ])/)
    .map(s => s.trim())
    .filter(Boolean);
}

const slideStyle = `
  ${fontFaceCss}
  :root {
    --brand-red: #d5121f;
    --brand-black: #1a1a1a;
    --grey-bg: #f4f5f6;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Nunito', 'Arial', sans-serif; color: var(--brand-black); }
  h1, h2, h3 { font-weight: 800; }
  .hero-img { max-width: 460px; width: 70%; margin: 6px 0 26px 0; }
  .divider-icon-wrap {
    width: 132px; height: 132px;
    background: #fff;
    border-radius: 20px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 18px;
    box-shadow: 0 8px 18px rgba(0,0,0,0.4);
  }
  .divider-icon-wrap img { width: 96px; height: 96px; object-fit: contain; }
  .slide {
    width: 100%;
    height: 165mm;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4mm 8mm;
  }
  .slide.title-slide {
    align-items: center;
    text-align: center;
    justify-content: center;
  }
  .slide.title-slide .kicker {
    background: var(--brand-red);
    color: #fff;
    font-weight: bold;
    letter-spacing: 2px;
    padding: 8px 26px;
    border-radius: 4px;
    font-size: 13pt;
    margin-bottom: 26px;
    text-transform: uppercase;
  }
  .slide.title-slide h1 { font-size: 40pt; margin: 0 0 12px 0; }
  .slide.title-slide h2 { font-size: 18pt; font-weight: normal; color: #444; margin: 0 0 30px 0; }
  .slide.title-slide .pillbar { display: flex; gap: 18px; }
  .slide.title-slide .pill {
    border: 1px solid #ccc; border-radius: 30px; padding: 10px 22px;
    font-size: 12pt; background: var(--grey-bg);
  }
  .slide.title-slide .pill b { color: var(--brand-red); }

  .slide.divider {
    align-items: flex-start;
    justify-content: center;
    background: var(--brand-black);
    color: #fff;
    position: relative;
  }
  .slide.divider .big-num {
    font-size: 130pt;
    font-weight: bold;
    color: var(--brand-red);
    line-height: 1;
    position: absolute;
    right: 40px;
    top: 30px;
    opacity: 0.9;
  }
  .slide.divider .tag { color: var(--brand-red); font-weight: bold; letter-spacing: 2px; text-transform: uppercase; font-size: 12pt; }
  .slide.divider h1 { font-size: 32pt; margin: 10px 0 26px 0; max-width: 75%; }
  .slide.divider ul { font-size: 13pt; line-height: 1.8; max-width: 65%; }
  .slide.divider ul li::marker { color: var(--brand-red); }

  .slide.content-slide h1 {
    font-size: 24pt;
    border-bottom: 4px solid var(--brand-red);
    padding-bottom: 10px;
    margin: 0 0 8px 0;
  }
  .slide.content-slide .block-tag {
    display: inline-block;
    font-size: 10pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #fff;
    background: var(--brand-red);
    border-radius: 3px;
    padding: 3px 10px;
    margin-bottom: 14px;
  }
  .slide.content-slide ul {
    font-size: 15pt;
    line-height: 1.75;
    margin-top: 10px;
  }
  .slide.content-slide ul li { margin-bottom: 10px; }
  .slide.content-slide ul li::marker { color: var(--brand-red); font-weight: bold; }

  .slide.table-slide h1 {
    font-size: 24pt;
    border-bottom: 4px solid var(--brand-red);
    padding-bottom: 10px;
    margin: 0 0 16px 0;
  }
  .slide.table-slide table { width: 100%; border-collapse: collapse; font-size: 13pt; }
  .slide.table-slide th, .slide.table-slide td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  .slide.table-slide th { background: var(--brand-black); color: #fff; }
  .slide.table-slide tr.pause td { color: #999; font-style: italic; background: #fafafa; }

  .slide.closing {
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .slide.closing h1 { font-size: 30pt; margin-bottom: 14px; }
  .slide.closing p { font-size: 14pt; color: #444; max-width: 70%; }
`;

function titleSlide() {
  return `
  <div class="slide title-slide">
    <div class="kicker">Schulungsfolien</div>
    <h1>${meta.titel}</h1>
    <h2>${meta.untertitel}</h2>
    <img class="hero-img" src="${iconDataUri('hero-skyline')}" alt="">
    <div class="pillbar">
      <div class="pill"><b>${meta.dauerTage}</b> Tage</div>
      <div class="pill"><b>${meta.stundenProTag}</b> Std. / Tag</div>
      <div class="pill"><b>${meta.gesamtstunden}</b> Std. gesamt</div>
      <div class="pill"><b>${meta.akademie}</b></div>
    </div>
  </div>`;
}

function agendaSlide() {
  return `
  <div class="slide table-slide">
    <h1>Agenda der Schulung</h1>
    <table>
      <thead><tr><th style="width:10%;">Tag</th><th>Thema</th></tr></thead>
      <tbody>
        ${days.map(d => `<tr><td><b>${d.nr}</b></td><td>${d.titel}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function zeitrasterSlide() {
  return `
  <div class="slide table-slide">
    <h1>Tägliches Zeitraster (${meta.stundenProTag} Stunden)</h1>
    <table>
      <thead><tr><th style="width:26%;">Zeit</th><th style="width:20%;">Dauer</th><th>Programmpunkt</th></tr></thead>
      <tbody>
        ${tagesraster.map(z => `<tr class="${z.art.includes('Pause') ? 'pause' : ''}"><td>${z.zeit} Uhr</td><td>${z.dauer}</td><td>${z.art}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function dividerSlide(d) {
  return `
  <div class="slide divider">
    <div class="big-num">${d.nr}</div>
    <div class="divider-icon-wrap"><img src="${iconDataUri(DAY_ICON[d.nr])}" alt=""></div>
    <div class="tag">Tag ${d.nr}</div>
    <h1>${d.titel}</h1>
    <ul>${d.lernziele.map(l => `<li>${l}</li>`).join('')}</ul>
  </div>`;
}

function themaSlide(t) {
  const bullets = toBullets(t.text);
  return `
  <div class="slide content-slide">
    <span class="block-tag">${t.block}</span>
    <h1>${t.titel}</h1>
    <ul>${bullets.map(b => `<li>${b}</li>`).join('')}</ul>
  </div>`;
}

function closingSlide() {
  return `
  <div class="slide closing">
    <h1>Abschlussprüfung &amp; Zertifikat</h1>
    <p>Am Ende von Tag 6 beantworten Sie 5 Prüfungsfragen zu den Inhalten dieser Schulung (separates Dokument „Prüfungsfragen"). Im Anschluss erhalten Sie Ihr ${meta.akademie}-Zertifikat.</p>
    <p style="margin-top:30px; font-weight:bold;">Vielen Dank für Ihre Teilnahme!</p>
  </div>`;
}

function buildFolien() {
  return `
  ${titleSlide()}
  ${agendaSlide()}
  ${zeitrasterSlide()}
  ${days.map(d => `
    ${dividerSlide(d)}
    ${d.themen.map(themaSlide).join('')}
  `).join('')}
  ${closingSlide()}
  `;
}

module.exports = { buildFolien, slideStyle };
