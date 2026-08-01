// Vereinfachte, automatische Steuerschätzung.
//
// WICHTIG: Dies ist eine grobe Näherung des deutschen Einkommensteuertarifs
// (§ 32a EStG), keine verbindliche Steuerfestsetzung. Etliche Sonderfälle
// (Kinderfreibetrag-Günstigerprüfung, Steuerklassenkombinationen bei
// Ehepaaren, Verlustvorträge, exakte Vorsorgepauschale, Gleitzone beim
// Solidaritätszuschlag u.v.m.) werden bewusst vereinfacht oder ausgelassen.
// Die Genauigkeit hängt außerdem stark davon ab, ob alle absetzbaren
// Posten (v. a. Werbungskosten) überhaupt vollständig eingetragen wurden.

const TAX_NUMERIC = {
  2023: {
    grundfreibetragSingle: 10908,
    arbeitnehmerpauschbetrag: 1230,
    sparerpauschbetragSingle: 1000,
    sonderausgabenPauschbetragSingle: 36,
    homeofficeTag: 6,
    homeofficeMax: 1260,
    zones: {
      z2Start: 10908, z2End: 15999, z3End: 62809, z4End: 277825,
      z2: { a: 979.18, b: 1400 },
      z3: { a: 192.59, b: 2397, c: 966.53 },
      z4: { rate: 0.42, sub: 9972.98 },
      z5: { rate: 0.45, sub: 18307.73 },
    },
  },
  2024: {
    grundfreibetragSingle: 11604,
    arbeitnehmerpauschbetrag: 1230,
    sparerpauschbetragSingle: 1000,
    sonderausgabenPauschbetragSingle: 36,
    homeofficeTag: 6,
    homeofficeMax: 1260,
    zones: {
      z2Start: 11604, z2End: 17005, z3End: 66760, z4End: 277825,
      z2: { a: 922.98, b: 1400 },
      z3: { a: 181.19, b: 2397, c: 1025.38 },
      z4: { rate: 0.42, sub: 10602.13 },
      z5: { rate: 0.45, sub: 18936.88 },
    },
  },
  2025: {
    grundfreibetragSingle: 12096,
    arbeitnehmerpauschbetrag: 1230,
    sparerpauschbetragSingle: 1000,
    sonderausgabenPauschbetragSingle: 36,
    homeofficeTag: 6,
    homeofficeMax: 1260,
    zones: {
      z2Start: 12096, z2End: 17443, z3End: 68480, z4End: 277825,
      z2: { a: 932.30, b: 1400 },
      z3: { a: 176.64, b: 2397, c: 1015.13 },
      z4: { rate: 0.42, sub: 10911.92 },
      z5: { rate: 0.45, sub: 19246.67 },
    },
  },
};

// Einkommensteuer-Grundtabelle nach § 32a EStG (gerundet auf volle Euro).
function taxDE(zvE, year) {
  const f = TAX_NUMERIC[year].zones;
  const x = Math.floor(Math.max(0, zvE));
  if (x <= f.z2Start) return 0;
  if (x <= f.z2End) { const y = (x - f.z2Start) / 10000; return Math.floor((f.z2.a * y + f.z2.b) * y); }
  if (x <= f.z3End) { const z = (x - f.z2End) / 10000; return Math.floor((f.z3.a * z + f.z3.b) * z + f.z3.c); }
  if (x <= f.z4End) return Math.floor(f.z4.rate * x - f.z4.sub);
  return Math.floor(f.z5.rate * x - f.z5.sub);
}

function num(amounts, id) {
  const v = parseFloat(amounts ? amounts[id] : undefined);
  return isFinite(v) ? v : 0;
}

function computeTaxEstimate(state) {
  const year = state.year;
  const nf = TAX_NUMERIC[year];
  if (!nf) return { hasData: false };

  const amounts = state.amounts || {};
  const situations = state.situations || [];
  const isVerheiratetZusammen = state.familyStatus === 'verheiratet_zusammen';
  const hasJob = situations.includes('job');

  // --- Nichtselbständige Arbeit (Anlage N) ---
  const bruttolohn = num(amounts, 'bruttolohn');
  let werbungskosten = num(amounts, 'werbungskosten');
  const homeofficeTage = num(amounts, 'homeoffice_tage');
  const homeofficePauschale = Math.min(Math.max(homeofficeTage, 0) * nf.homeofficeTag, nf.homeofficeMax);
  werbungskosten += homeofficePauschale;

  const kostenZweitausbildung = num(amounts, 'kosten_zweitausbildung');
  let zweitausbildungAlsVerlust = 0;
  if (kostenZweitausbildung > 0) {
    if (hasJob) werbungskosten += kostenZweitausbildung;
    else zweitausbildungAlsVerlust = kostenZweitausbildung;
  }

  const werbungskostenAngesetzt = Math.max(werbungskosten, nf.arbeitnehmerpauschbetrag);
  const jobEinkuenfte = bruttolohn > 0 ? Math.max(0, bruttolohn - werbungskostenAngesetzt) : 0;

  // --- Vermietung (Anlage V) ---
  const mieteinnahmen = num(amounts, 'mieteinnahmen');
  const werbungskostenVermietung = num(amounts, 'werbungskosten_vermietung');
  const vermietungNetto = mieteinnahmen - werbungskostenVermietung;

  // --- Selbstständigkeit (Anlage S/G) ---
  const gewinnSelbststaendig = num(amounts, 'gewinn_selbststaendig');

  const gesamtbetragEinkuenfte = jobEinkuenfte + vermietungNetto + gewinnSelbststaendig - zweitausbildungAlsVerlust;

  // --- Sonderausgaben ---
  const spenden = num(amounts, 'spenden_betrag');
  const ausbildungErst = Math.min(num(amounts, 'kosten_erstausbildung'), 6000);
  const unterhalt = Math.min(num(amounts, 'unterhalt_betrag'), 13805);
  const vorsorgeKrankenPflege = num(amounts, 'vorsorge_kranken_pflege');
  const vorsorgeRente = num(amounts, 'vorsorge_rente');

  const sonderausgabenPauschale = nf.sonderausgabenPauschbetragSingle * (isVerheiratetZusammen ? 2 : 1);
  const sonderausgabenSonstige = Math.max(sonderausgabenPauschale, spenden + ausbildungErst + unterhalt);
  const sonderausgabenGesamt = sonderausgabenSonstige + Math.max(0, vorsorgeKrankenPflege) + Math.max(0, vorsorgeRente);

  // --- Außergewöhnliche Belastungen (mit vereinfachter zumutbarer Belastung) ---
  const aussergBetrag = num(amounts, 'ausserg_betrag');
  const anzahlKinder = num(amounts, 'anzahl_kinder');
  let zumutbarePct = 0.05;
  if (anzahlKinder >= 3) zumutbarePct = 0.03;
  else if (anzahlKinder >= 1) zumutbarePct = 0.04;
  const zumutbareBelastung = Math.max(0, gesamtbetragEinkuenfte) * zumutbarePct;
  const aussergAbzug = Math.max(0, aussergBetrag - zumutbareBelastung);

  const zvE = Math.max(0, Math.round(gesamtbetragEinkuenfte - sonderausgabenGesamt - aussergAbzug));

  // --- Tarif ---
  const estIncomeTax = isVerheiratetZusammen ? 2 * taxDE(zvE / 2, year) : taxDE(zvE, year);

  // --- Kirchensteuer & Soli ---
  const kirchensteuerSatz = parseFloat(amounts.kirchensteuer) || 0;
  const kirchensteuer = Math.round(estIncomeTax * (kirchensteuerSatz / 100));
  const soliFreigrenze = isVerheiratetZusammen ? 36260 : 18130;
  const soli = estIncomeTax > soliFreigrenze ? Math.round(estIncomeTax * 0.055) : 0;

  // --- Abgeltungsteuer auf Kapitalerträge (separat, pauschal 25 % + Soli) ---
  const kapitalertraege = num(amounts, 'kapitalertraege');
  const sparerpauschbetrag = nf.sparerpauschbetragSingle * (isVerheiratetZusammen ? 2 : 1);
  const kapitalBemessung = Math.max(0, kapitalertraege - sparerpauschbetrag);
  const abgeltungsteuer = Math.round(kapitalBemessung * 0.25);
  const abgeltungsteuerSoli = Math.round(abgeltungsteuer * 0.055);

  const gesamtSteuerlast = estIncomeTax + kirchensteuer + soli + abgeltungsteuer + abgeltungsteuerSoli;

  const gezahlteLohnsteuer = num(amounts, 'gezahlte_lohnsteuer');
  const differenz = gezahlteLohnsteuer > 0 ? gezahlteLohnsteuer - (estIncomeTax + kirchensteuer + soli) : null;

  const hasData = Object.entries(amounts).some(([k, v]) => {
    if (k === 'kirchensteuer') return false;
    const n = parseFloat(v);
    return isFinite(n) && n !== 0;
  });

  return {
    hasData,
    gesamtbetragEinkuenfte: Math.round(gesamtbetragEinkuenfte),
    sonderausgabenGesamt: Math.round(sonderausgabenGesamt),
    aussergAbzug: Math.round(aussergAbzug),
    zvE,
    estIncomeTax,
    kirchensteuer,
    soli,
    abgeltungsteuerGesamt: abgeltungsteuer + abgeltungsteuerSoli,
    gesamtSteuerlast,
    gezahlteLohnsteuer,
    differenz,
  };
}

function formatEuro(n) {
  return Math.round(n || 0).toLocaleString('de-DE') + ' €';
}
