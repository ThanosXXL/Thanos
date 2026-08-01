// Inhaltliche Daten des Steuerbescheid-Assistenten.
// Alle Zahlenwerte (Pauschbeträge, Freibeträge) sind Richtwerte zur Orientierung
// und ersetzen keine verbindliche Auskunft von ELSTER oder einem Steuerberater.

const TAX_YEARS = [2025, 2024, 2023];

// Jahresspezifische Eckwerte (ca.-Angaben zur Orientierung)
const YEAR_FACTS = {
  2025: {
    grundfreibetragSingle: '12.096 €',
    grundfreibetragVerheiratet: '24.192 €',
    arbeitnehmerpauschbetrag: '1.230 €',
    sparerpauschbetragSingle: '1.000 €',
    sparerpauschbetragVerheiratet: '2.000 €',
    homeofficePauschaleTag: '6 €',
    homeofficePauschaleMax: '1.260 € (max. 210 Tage)',
    pendlerpauschaleAb21km: '0,38 €/km',
  },
  2024: {
    grundfreibetragSingle: '11.604 €',
    grundfreibetragVerheiratet: '23.208 €',
    arbeitnehmerpauschbetrag: '1.230 €',
    sparerpauschbetragSingle: '1.000 €',
    sparerpauschbetragVerheiratet: '2.000 €',
    homeofficePauschaleTag: '6 €',
    homeofficePauschaleMax: '1.260 € (max. 210 Tage)',
    pendlerpauschaleAb21km: '0,38 €/km',
  },
  2023: {
    grundfreibetragSingle: '10.908 €',
    grundfreibetragVerheiratet: '21.816 €',
    arbeitnehmerpauschbetrag: '1.230 €',
    sparerpauschbetragSingle: '1.000 €',
    sparerpauschbetragVerheiratet: '2.000 €',
    homeofficePauschaleTag: '6 €',
    homeofficePauschaleMax: '1.260 € (max. 210 Tage)',
    pendlerpauschaleAb21km: '0,38 €/km',
  },
};

const FAMILY_STATUS = [
  { id: 'ledig', label: 'Ledig', hint: 'Keine Ehe/Lebenspartnerschaft im Steuerjahr.' },
  { id: 'verheiratet_zusammen', label: 'Verheiratet/verpartnert – Zusammenveranlagung', hint: 'Gemeinsame Steuererklärung mit Ehe-/Lebenspartner:in.' },
  { id: 'verheiratet_einzeln', label: 'Verheiratet/verpartnert – Einzelveranlagung', hint: 'Jede Person reicht eine eigene Erklärung ein.' },
  { id: 'getrennt', label: 'Dauernd getrennt lebend / geschieden', hint: 'Trennung erfolgte vor oder während des Steuerjahres.' },
  { id: 'verwitwet', label: 'Verwitwet', hint: 'Ehe-/Lebenspartner:in im oder vor dem Steuerjahr verstorben.' },
];

// Zusatz-Situationen als Checkboxen
const SITUATIONS = [
  { id: 'job', label: 'Ich war angestellt (Lohn/Gehalt)' },
  { id: 'kinder', label: 'Ich habe Kinder' },
  { id: 'ausbildung_erst', label: 'Ich war in der Erstausbildung/im Erststudium' },
  { id: 'ausbildung_zweit', label: 'Ich war in einer Zweitausbildung / einem dualen Studium / Zweitstudium' },
  { id: 'kapital', label: 'Ich hatte Kapitalerträge (Zinsen, Dividenden, Fonds)' },
  { id: 'vermietung', label: 'Ich hatte Einkünfte aus Vermietung/Verpachtung' },
  { id: 'selbststaendig', label: 'Ich war selbstständig/freiberuflich oder hatte ein Gewerbe' },
  { id: 'vorsorge', label: 'Ich hatte Vorsorgeaufwendungen (Renten-/Kranken-/Pflegeversicherung)' },
  { id: 'spenden', label: 'Ich hatte Spenden oder Mitgliedsbeiträge' },
  { id: 'aussergewoehnlich', label: 'Ich hatte Krankheitskosten oder andere außergewöhnliche Belastungen' },
  { id: 'unterhalt', label: 'Ich habe Unterhalt gezahlt oder erhalten' },
  { id: 'homeoffice', label: 'Ich hatte Homeoffice-Tage, Fahrtkosten oder Arbeitsmittel' },
];

// Baustein-Definition je Modul. "form" ist der Name der amtlichen Anlage,
// KEIN Abbild des echten Formulars. Die "example" SVG ist eine schematische
// Beispielansicht, um zu zeigen, wo ungefähr etwas einzutragen ist.
function buildSteps(year, familyStatusId, situationIds) {
  const facts = YEAR_FACTS[year];
  const steps = [];

  // 1. Immer: Persönliche Daten
  steps.push({
    id: 'persoenlich',
    title: 'Persönliche Daten',
    form: 'Hauptvordruck ESt 1 A (Mantelbogen)',
    description: 'Grunddaten zu deiner Person, die im Hauptformular jeder Steuererklärung stehen.',
    fields: [
      'Steuer-Identifikationsnummer (11-stellig, steht auf jedem Steuerbescheid/der ID-Mitteilung)',
      'Anschrift zum 31.12. des Steuerjahres',
      'Bankverbindung (IBAN) für eine mögliche Erstattung',
      'Religionszugehörigkeit (wichtig für Kirchensteuer)',
      'Zuständiges Finanzamt und Steuernummer, falls bereits vorhanden',
    ],
    documents: [
      { label: 'Personalausweis oder Reisepass (Kopie/Foto)', required: false },
      { label: 'Schreiben mit Steuer-ID', required: true },
      { label: 'Kontoauszug/IBAN-Nachweis', required: true },
    ],
  });

  // Familienstand-spezifisch
  if (familyStatusId === 'verheiratet_zusammen' || familyStatusId === 'verheiratet_einzeln') {
    steps.push({
      id: 'partner',
      title: 'Angaben zur Ehe/Lebenspartnerschaft',
      form: 'Hauptvordruck ESt 1 A, Abschnitt "Allgemeine Angaben"',
      description: familyStatusId === 'verheiratet_zusammen'
        ? 'Bei der Zusammenveranlagung werden beide Einkommen gemeinsam in einer Erklärung erfasst.'
        : 'Bei der Einzelveranlagung gibst du nur deine eigenen Einkünfte an, der Partner/die Partnerin reicht eine eigene Erklärung ein.'
      ,
      fields: [
        'Steuer-ID und Geburtsdatum des Ehe-/Lebenspartners',
        'Datum der Eheschließung/Verpartnerung',
        familyStatusId === 'verheiratet_zusammen' ? 'Unterschrift beider Partner erforderlich' : 'Vermerk "Einzelveranlagung" auf dem Hauptvordruck',
      ],
      documents: [
        { label: 'Steuer-ID des Partners/der Partnerin', required: true },
        { label: 'Heirats-/Verpartnerungsurkunde (nur bei Erstveranlagung nötig)', required: false },
      ],
    });
  }

  if (familyStatusId === 'getrennt') {
    steps.push({
      id: 'getrennt',
      title: 'Angaben zur Trennung',
      form: 'Hauptvordruck ESt 1 A',
      description: 'Im Trennungsjahr ist meist noch eine Zusammenveranlagung möglich, danach nur noch Einzelveranlagung.',
      fields: [
        'Datum der Trennung',
        'Ggf. Angaben zu Unterhaltszahlungen (siehe Modul "Unterhalt")',
      ],
      documents: [
        { label: 'Trennungs- bzw. Scheidungsunterlagen', required: false },
      ],
    });
  }

  if (familyStatusId === 'verwitwet') {
    steps.push({
      id: 'verwitwet',
      title: 'Angaben als verwitwete Person',
      form: 'Hauptvordruck ESt 1 A',
      description: 'Im Todesjahr des Partners/der Partnerin ist häufig noch eine Zusammenveranlagung möglich (sog. Witwensplitting im Folgejahr).',
      fields: ['Sterbedatum des Ehe-/Lebenspartners'],
      documents: [{ label: 'Sterbeurkunde', required: false }],
    });
  }

  if (situationIds.includes('job')) {
    steps.push({
      id: 'anlage_n',
      title: 'Einkünfte aus nichtselbständiger Arbeit',
      form: 'Anlage N',
      description: `Alle Angaben zu Lohn, Gehalt und Werbungskosten. Ohne Nachweis zieht das Finanzamt automatisch die Arbeitnehmerpauschale von ${facts.arbeitnehmerpauschbetrag} ab – höhere Werbungskosten musst du einzeln nachweisen.`,
      fields: [
        'Bruttoarbeitslohn laut Lohnsteuerbescheinigung',
        'Einbehaltene Lohn-, Kirchen- und Solidaritätszuschlagsteuer',
        'Fahrten zwischen Wohnung und erster Tätigkeitsstätte (Pendlerpauschale, ab 21 km ' + facts.pendlerpauschaleAb21km + ')',
        'Arbeitsmittel (Fachliteratur, Werkzeug, Arbeitskleidung)',
        'Fortbildungskosten',
      ],
      documents: [
        { label: 'Lohnsteuerbescheinigung(en) des Arbeitgebers', required: true },
        { label: 'Nachweise Fahrtkosten (z. B. Entfernungsangabe, ÖPNV-Tickets)', required: false },
        { label: 'Belege für Arbeitsmittel/Fortbildungen', required: false },
      ],
    });
  }

  if (situationIds.includes('homeoffice')) {
    steps.push({
      id: 'homeoffice',
      title: 'Homeoffice, Arbeitsmittel & Fahrtkosten',
      form: 'Anlage N, Zeilen zu Werbungskosten',
      description: `Homeoffice-Pauschale: ${facts.homeofficePauschaleTag} pro Tag, maximal ${facts.homeofficePauschaleMax}.`,
      fields: [
        'Anzahl der Homeoffice-Tage im Steuerjahr',
        'Ausgaben für ein häusliches Arbeitszimmer (falls abtrennbarer Raum vorhanden)',
        'Internet-/Telefonkosten anteilig beruflich genutzt',
      ],
      documents: [
        { label: 'Kalender/Aufstellung der Homeoffice-Tage', required: false },
        { label: 'Rechnungen für Arbeitszimmer/Internet/Telefon', required: false },
      ],
    });
  }

  if (situationIds.includes('kinder')) {
    steps.push({
      id: 'anlage_kind',
      title: 'Kinder',
      form: 'Anlage Kind (für jedes Kind einzeln)',
      description: 'Wird für jedes Kind separat ausgefüllt. Das Finanzamt prüft automatisch, ob Kindergeld oder Kinderfreibetrag günstiger ist.',
      fields: [
        'Name, Geburtsdatum und Steuer-ID des Kindes',
        'Kindergeld-Bezugsmonate im Steuerjahr',
        'Betreuungskosten (Kita, Hort, Tagesmutter)',
        'Ausbildungsfreibetrag bei auswärtiger Unterbringung eines volljährigen Kindes in Ausbildung',
      ],
      documents: [
        { label: 'Kindergeldbescheid', required: true },
        { label: 'Rechnungen/Nachweise Kinderbetreuung', required: false },
        { label: 'Nachweis auswärtige Unterbringung (z. B. Mietvertrag Kind)', required: false },
      ],
    });
  }

  if (situationIds.includes('ausbildung_erst')) {
    steps.push({
      id: 'ausbildung_erst',
      title: 'Erstausbildung / Erststudium',
      form: 'Hauptvordruck ESt 1 A, Bereich Sonderausgaben',
      description: 'Kosten der Erstausbildung zählen als Sonderausgaben (bis zu 6.000 €/Jahr) und wirken sich nur im gleichen Jahr steuermindernd aus.',
      fields: [
        'Studien-/Ausbildungsgebühren',
        'Lernmittel und Fachliteratur',
        'Fahrtkosten zur Ausbildungsstätte',
      ],
      documents: [
        { label: 'Immatrikulationsbescheinigung / Ausbildungsvertrag', required: true },
        { label: 'Rechnungen für Studiengebühren/Lernmittel', required: false },
      ],
    });
  }

  if (situationIds.includes('ausbildung_zweit')) {
    steps.push({
      id: 'ausbildung_zweit',
      title: 'Zweitausbildung / duales Studium / Zweitstudium',
      form: 'Anlage N, Werbungskosten',
      description: 'Kosten einer Zweitausbildung (z. B. nach abgeschlossener Berufsausbildung) zählen als Werbungskosten und können auch als Verlust ins nächste Jahr vorgetragen werden.',
      fields: [
        'Studien-/Ausbildungsgebühren',
        'Fahrtkosten zur Hochschule/Berufsschule',
        'Kosten für Arbeitsmittel, Literatur, Arbeitszimmer',
        'Verpflegungsmehraufwand bei auswärtiger Unterbringung',
      ],
      documents: [
        { label: 'Nachweis der abgeschlossenen Erstausbildung', required: false },
        { label: 'Immatrikulationsbescheinigung / Ausbildungsvertrag', required: true },
        { label: 'Rechnungen für Gebühren/Lernmittel/Fahrten', required: false },
      ],
    });
  }

  if (situationIds.includes('kapital')) {
    steps.push({
      id: 'anlage_kap',
      title: 'Kapitalerträge',
      form: 'Anlage KAP',
      description: `Nur nötig, wenn kein oder ein zu niedriger Freistellungsauftrag gestellt wurde, oder um zu viel gezahlte Abgeltungsteuer zurückzuholen. Sparer-Pauschbetrag: ${facts.sparerpauschbetragSingle} (Single) bzw. ${facts.sparerpauschbetragVerheiratet} (zusammen veranlagt).`,
      fields: [
        'Zinsen, Dividenden, Fondsausschüttungen',
        'Bereits einbehaltene Kapitalertragsteuer',
        'Verlustverrechnungstöpfe der Bank',
      ],
      documents: [
        { label: 'Steuerbescheinigung(en) der Bank/des Brokers', required: true },
      ],
    });
  }

  if (situationIds.includes('vermietung')) {
    steps.push({
      id: 'anlage_v',
      title: 'Vermietung und Verpachtung',
      form: 'Anlage V (für jedes Objekt einzeln)',
      description: 'Mieteinnahmen abzüglich Werbungskosten (Zinsen, Abschreibung, Instandhaltung) je Immobilie.',
      fields: [
        'Mieteinnahmen (kalt) im Steuerjahr',
        'Umlagen/Nebenkosten',
        'Zinsen für Immobilienkredite',
        'Abschreibung (AfA), Reparaturen, Verwaltungskosten',
      ],
      documents: [
        { label: 'Mieteinnahmen-Aufstellung', required: true },
        { label: 'Nebenkostenabrechnung', required: false },
        { label: 'Zinsbescheinigung der Bank', required: false },
        { label: 'Handwerkerrechnungen', required: false },
      ],
    });
  }

  if (situationIds.includes('selbststaendig')) {
    steps.push({
      id: 'anlage_sg',
      title: 'Selbstständige/gewerbliche Tätigkeit',
      form: 'Anlage S (freiberuflich) bzw. Anlage G (Gewerbe) + Einnahmenüberschussrechnung (Anlage EÜR)',
      description: 'Komplexeres Thema mit eigener Gewinnermittlung. Bei größeren Umsätzen oder Unsicherheit empfiehlt sich zusätzlich eine steuerliche Beratung.',
      fields: [
        'Betriebseinnahmen und -ausgaben',
        'Angaben zur Umsatzsteuer (falls nicht Kleinunternehmer:in)',
        'Abschreibungen für Anlagevermögen',
      ],
      documents: [
        { label: 'Einnahmenüberschussrechnung (EÜR) oder Bilanz', required: true },
        { label: 'Belege aller Betriebsausgaben', required: false },
      ],
      note: 'Dieser Bereich ist komplex – der Assistent zeigt nur die groben Formularbausteine, keine vollständige Gewinnermittlung.',
    });
  }

  if (situationIds.includes('vorsorge')) {
    steps.push({
      id: 'anlage_vorsorge',
      title: 'Vorsorgeaufwendungen',
      form: 'Anlage Vorsorgeaufwand',
      description: 'Beiträge zur Renten-, Kranken- und Pflegeversicherung mindern als Sonderausgaben deine Steuerlast.',
      fields: [
        'Beiträge zur gesetzlichen/privaten Rentenversicherung',
        'Beiträge zur Kranken- und Pflegeversicherung',
        'Beiträge zu Riester-/Rürup-Verträgen',
      ],
      documents: [
        { label: 'Beitragsbescheinigung der Rentenversicherung', required: true },
        { label: 'Beitragsbescheinigung der Kranken-/Pflegeversicherung', required: true },
      ],
    });
  }

  if (situationIds.includes('spenden')) {
    steps.push({
      id: 'sonderausgaben_spenden',
      title: 'Spenden und Mitgliedsbeiträge',
      form: 'Hauptvordruck ESt 1 A, Bereich Sonderausgaben',
      description: 'Spenden an gemeinnützige Organisationen und Mitgliedsbeiträge (z. B. Vereine) sind als Sonderausgaben absetzbar.',
      fields: ['Summe der Spenden im Steuerjahr', 'Mitgliedsbeiträge an Vereine/Parteien'],
      documents: [
        { label: 'Spendenbescheinigungen/Zuwendungsbestätigungen', required: true },
      ],
    });
  }

  if (situationIds.includes('aussergewoehnlich')) {
    steps.push({
      id: 'aussergewoehnliche_belastungen',
      title: 'Außergewöhnliche Belastungen',
      form: 'Hauptvordruck ESt 1 A, Bereich außergewöhnliche Belastungen',
      description: 'Krankheitskosten, Pflegekosten oder Kosten durch Katastrophenschäden, die die zumutbare Belastung übersteigen.',
      fields: [
        'Zuzahlungen zu Medikamenten/Behandlungen',
        'Zahnersatz, Brillen, Hörgeräte (Eigenanteil)',
        'Pflegekosten',
        'Fahrtkosten zu Behandlungen',
      ],
      documents: [
        { label: 'Rechnungen und Zahlungsnachweise', required: true },
        { label: 'Ärztliches Attest/Verordnung, falls vorhanden', required: false },
      ],
    });
  }

  if (situationIds.includes('unterhalt')) {
    steps.push({
      id: 'anlage_u',
      title: 'Unterhaltszahlungen',
      form: 'Anlage U (bei Ex-Partner:in) bzw. Anlage Unterhalt (bei sonstigen Personen)',
      description: 'Unterhalt an den/die Ex-Partner:in oder bedürftige Angehörige kann als Sonderausgabe bzw. außergewöhnliche Belastung geltend gemacht werden.',
      fields: [
        'Empfänger:in des Unterhalts',
        'Gezahlter Betrag im Steuerjahr',
        'Bei Ex-Partner:in: Zustimmung der empfangenden Person (Anlage U muss von ihr mitunterschrieben werden)',
      ],
      documents: [
        { label: 'Zahlungsnachweise (Überweisungen)', required: true },
        { label: 'Unterschriebene Anlage U der empfangenden Person', required: false },
      ],
    });
  }

  // Letzter Schritt: Zusammenfassung/Einreichung
  steps.push({
    id: 'abschluss',
    title: 'Zusammenfassung & Einreichung',
    form: 'Übertragung nach ELSTER oder Übergabe an Steuerberater:in',
    description: 'Der Assistent übermittelt nichts automatisch an das Finanzamt. Trage die gesammelten Werte selbst in ELSTER (elster.de) ein oder übergib die Checkliste inkl. Belege an eine steuerberatende Person.',
    fields: [
      'Alle Module oben durchgegangen und Unterlagen vollständig?',
      'Kontrolliere Steuer-ID, IBAN und Unterschrift (bei Papierabgabe) noch einmal',
      'Fristen beachten: Regelabgabefrist 31.7. des Folgejahres (mit Steuerberatung meist bis Ende Februar des übernächsten Jahres)',
    ],
    documents: [],
  });

  return steps;
}
