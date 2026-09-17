// Einfache, lizenzfreie Flat-Design-Illustrationen (selbst gezeichnet, keine Fotos)
// als "Beispielbilder" für die Schulungsunterlagen. Farbpalette passend zum
// M&C-Akademie-Logo (Rot/Schwarz/Grau).

const RED = '#d5121f';
const BLACK = '#1a1a1a';
const DARK_GREY = '#4a4a4a';
const GREY = '#c7cbcf';
const LIGHT = '#eef0f2';
const WHITE = '#ffffff';

function wrap(name, viewBox, inner) {
  return { name, viewBox, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>` };
}

// Tag 1 – Grundlagen / Projektorganisation: Organigramm
const day1 = wrap('day1-organigramm', '0 0 240 240', `
  <rect x="90" y="24" width="60" height="34" rx="8" fill="${BLACK}"/>
  <line x1="120" y1="58" x2="120" y2="86" stroke="${DARK_GREY}" stroke-width="4"/>
  <line x1="46" y1="86" x2="194" y2="86" stroke="${DARK_GREY}" stroke-width="4"/>
  <line x1="46" y1="86" x2="46" y2="108" stroke="${DARK_GREY}" stroke-width="4"/>
  <line x1="120" y1="86" x2="120" y2="108" stroke="${DARK_GREY}" stroke-width="4"/>
  <line x1="194" y1="86" x2="194" y2="108" stroke="${DARK_GREY}" stroke-width="4"/>
  <rect x="14" y="108" width="64" height="32" rx="7" fill="${RED}"/>
  <rect x="88" y="108" width="64" height="32" rx="7" fill="${RED}"/>
  <rect x="162" y="108" width="64" height="32" rx="7" fill="${RED}"/>
  <rect x="60" y="176" width="120" height="30" rx="7" fill="${LIGHT}" stroke="${GREY}" stroke-width="3"/>
  <line x1="120" y1="140" x2="120" y2="176" stroke="${DARK_GREY}" stroke-width="4" stroke-dasharray="6 5"/>
`);

// Tag 2 – Ausschreibung & Vergabe: Dokument mit Prüf-Häkchen
const day2 = wrap('day2-ausschreibung', '0 0 240 240', `
  <rect x="52" y="26" width="104" height="140" rx="10" fill="${WHITE}" stroke="${BLACK}" stroke-width="6"/>
  <line x1="70" y1="56" x2="138" y2="56" stroke="${GREY}" stroke-width="7" stroke-linecap="round"/>
  <line x1="70" y1="78" x2="138" y2="78" stroke="${GREY}" stroke-width="7" stroke-linecap="round"/>
  <line x1="70" y1="100" x2="120" y2="100" stroke="${GREY}" stroke-width="7" stroke-linecap="round"/>
  <line x1="70" y1="122" x2="130" y2="122" stroke="${GREY}" stroke-width="7" stroke-linecap="round"/>
  <line x1="70" y1="144" x2="110" y2="144" stroke="${GREY}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="168" cy="168" r="42" fill="${RED}"/>
  <path d="M148 168 L162 182 L190 152" fill="none" stroke="${WHITE}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
`);

// Tag 3 – Terminplanung: Gantt-Balken + Uhr
const day3 = wrap('day3-terminplanung', '0 0 240 240', `
  <rect x="24" y="38" width="150" height="16" rx="8" fill="${GREY}"/>
  <rect x="24" y="38" width="90" height="16" rx="8" fill="${RED}"/>
  <rect x="24" y="70" width="170" height="16" rx="8" fill="${GREY}"/>
  <rect x="60" y="70" width="90" height="16" rx="8" fill="${BLACK}"/>
  <rect x="24" y="102" width="150" height="16" rx="8" fill="${GREY}"/>
  <rect x="95" y="102" width="79" height="16" rx="8" fill="${RED}"/>
  <rect x="24" y="134" width="130" height="16" rx="8" fill="${GREY}"/>
  <rect x="24" y="134" width="55" height="16" rx="8" fill="${BLACK}"/>
  <circle cx="176" cy="176" r="40" fill="${WHITE}" stroke="${BLACK}" stroke-width="7"/>
  <line x1="176" y1="176" x2="176" y2="152" stroke="${BLACK}" stroke-width="6" stroke-linecap="round"/>
  <line x1="176" y1="176" x2="194" y2="182" stroke="${RED}" stroke-width="6" stroke-linecap="round"/>
`);

// Tag 4 – Kostenmanagement: Münzstapel + Balkendiagramm
const day4 = wrap('day4-kosten', '0 0 240 240', `
  <ellipse cx="64" cy="176" rx="42" ry="16" fill="${RED}"/>
  <ellipse cx="64" cy="160" rx="42" ry="16" fill="${BLACK}"/>
  <ellipse cx="64" cy="144" rx="42" ry="16" fill="${RED}"/>
  <ellipse cx="64" cy="128" rx="42" ry="16" fill="${BLACK}"/>
  <text x="64" y="134" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="${WHITE}" text-anchor="middle">€</text>
  <rect x="132" y="150" width="24" height="46" fill="${GREY}"/>
  <rect x="164" y="120" width="24" height="76" fill="${DARK_GREY}"/>
  <rect x="196" y="90" width="24" height="106" fill="${RED}"/>
  <line x1="120" y1="196" x2="224" y2="196" stroke="${BLACK}" stroke-width="5"/>
`);

// Tag 5 – Qualität, Sicherheit & Recht: Schutzschild mit Häkchen + Bauhelm
const day5 = wrap('day5-sicherheit', '0 0 240 240', `
  <path d="M120 26 L182 50 V108 C182 152 156 182 120 200 C84 182 58 152 58 108 V50 Z" fill="${BLACK}"/>
  <path d="M120 42 L168 60 V108 C168 142 148 166 120 182 C92 166 72 142 72 108 V60 Z" fill="${RED}"/>
  <path d="M100 112 L116 130 L146 92" fill="none" stroke="${WHITE}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M40 214 a40 26 0 0 1 80 0 Z" fill="${DARK_GREY}"/>
  <rect x="34" y="210" width="92" height="12" rx="6" fill="${BLACK}"/>
`);

// Tag 6 – Kommunikation & Prüfung: Sprechblasen + Zertifikat
const day6 = wrap('day6-kommunikation', '0 0 240 240', `
  <rect x="20" y="30" width="120" height="78" rx="16" fill="${BLACK}"/>
  <path d="M46 108 L46 132 L76 108 Z" fill="${BLACK}"/>
  <line x1="40" y1="54" x2="120" y2="54" stroke="${WHITE}" stroke-width="7" stroke-linecap="round"/>
  <line x1="40" y1="72" x2="100" y2="72" stroke="${WHITE}" stroke-width="7" stroke-linecap="round"/>
  <rect x="98" y="96" width="112" height="70" rx="16" fill="${RED}"/>
  <path d="M188 166 L188 188 L162 166 Z" fill="${RED}"/>
  <line x1="118" y1="118" x2="188" y2="118" stroke="${WHITE}" stroke-width="7" stroke-linecap="round"/>
  <line x1="118" y1="136" x2="170" y2="136" stroke="${WHITE}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="176" cy="52" r="26" fill="${WHITE}" stroke="${BLACK}" stroke-width="5"/>
  <path d="M164 52 L173 61 L190 42" fill="none" stroke="${RED}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
`);

// Teilnehmerliste – Gruppe von Personen
const participants = wrap('teilnehmer-gruppe', '0 0 240 160', `
  <circle cx="60" cy="52" r="26" fill="${DARK_GREY}"/>
  <path d="M18 140 C18 104 36 86 60 86 C84 86 102 104 102 140 Z" fill="${DARK_GREY}"/>
  <circle cx="120" cy="40" r="30" fill="${BLACK}"/>
  <path d="M72 142 C72 100 92 78 120 78 C148 78 168 100 168 142 Z" fill="${BLACK}"/>
  <circle cx="180" cy="52" r="26" fill="${RED}"/>
  <path d="M138 140 C138 104 156 86 180 86 C204 86 222 104 222 140 Z" fill="${RED}"/>
`);

// Prüfungsfragen – Klemmbrett mit Häkchen
const exam = wrap('pruefung-klemmbrett', '0 0 200 240', `
  <rect x="34" y="30" width="132" height="182" rx="12" fill="${WHITE}" stroke="${BLACK}" stroke-width="7"/>
  <rect x="72" y="16" width="56" height="28" rx="8" fill="${DARK_GREY}"/>
  <line x1="54" y1="76" x2="146" y2="76" stroke="${GREY}" stroke-width="7" stroke-linecap="round"/>
  <line x1="54" y1="100" x2="146" y2="100" stroke="${GREY}" stroke-width="7" stroke-linecap="round"/>
  <line x1="54" y1="124" x2="120" y2="124" stroke="${GREY}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="150" cy="176" r="38" fill="${RED}"/>
  <path d="M132 176 L146 190 L172 160" fill="none" stroke="${WHITE}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
`);

// Cover-Hero – Baustellen-Skyline mit Kran
const heroSkyline = wrap('hero-skyline', '0 0 1200 260', `
  <rect x="0" y="0" width="1200" height="260" fill="none"/>
  <circle cx="1040" cy="70" r="46" fill="${LIGHT}"/>
  <rect x="60" y="140" width="90" height="120" fill="${GREY}"/>
  <rect x="170" y="90" width="110" height="170" fill="${DARK_GREY}"/>
  <rect x="300" y="120" width="90" height="140" fill="${GREY}"/>
  <rect x="410" y="60" width="120" height="200" fill="${BLACK}"/>
  <rect x="550" y="150" width="80" height="110" fill="${GREY}"/>
  <g opacity="0.9">
    <rect x="425" y="76" width="18" height="130" fill="${LIGHT}"/>
    <rect x="459" y="92" width="18" height="114" fill="${LIGHT}"/>
    <rect x="493" y="108" width="18" height="98" fill="${LIGHT}"/>
  </g>
  <rect x="650" y="70" width="18" height="190" fill="${RED}"/>
  <line x1="659" y1="76" x2="740" y2="76" stroke="${RED}" stroke-width="10"/>
  <line x1="659" y1="76" x2="606" y2="120" stroke="${RED}" stroke-width="8"/>
  <line x1="740" y1="76" x2="740" y2="130" stroke="${DARK_GREY}" stroke-width="8"/>
  <rect x="770" y="170" width="70" height="90" fill="${GREY}"/>
  <rect x="850" y="130" width="100" height="130" fill="${DARK_GREY}"/>
  <rect x="960" y="160" width="90" height="100" fill="${GREY}"/>
  <rect x="1060" y="185" width="110" height="75" fill="${BLACK}"/>
  <rect x="0" y="252" width="1200" height="8" fill="${BLACK}"/>
`);

module.exports = {
  day1, day2, day3, day4, day5, day6,
  participants, exam, heroSkyline,
  days: [day1, day2, day3, day4, day5, day6],
};
