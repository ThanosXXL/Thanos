// Zentrale Inhaltsquelle für alle Dokumente der Schulung
// "Bau- und Projektmanagement" der M&C Akademie

const meta = {
  akademie: 'M&C Akademie',
  titel: 'Bau- und Projektmanagement',
  untertitel: 'Kompaktschulung für Fach- und Führungskräfte im Baugewerbe',
  dauerTage: 6,
  stundenProTag: 9,
  gesamtstunden: 54,
  ort: 'Präsenzschulung / Inhouse',
  stand: 'September 2026',
};

// Tagesstruktur: 09:00–18:00 Uhr = 9 Zeitstunden inkl. Pausen
const tagesraster = [
  { zeit: '09:00 – 10:30', dauer: '90 Min.', art: 'Block 1' },
  { zeit: '10:30 – 10:45', dauer: '15 Min.', art: 'Pause' },
  { zeit: '10:45 – 12:15', dauer: '90 Min.', art: 'Block 2' },
  { zeit: '12:15 – 13:15', dauer: '60 Min.', art: 'Mittagspause' },
  { zeit: '13:15 – 14:45', dauer: '90 Min.', art: 'Block 3' },
  { zeit: '14:45 – 15:00', dauer: '15 Min.', art: 'Pause' },
  { zeit: '15:00 – 16:30', dauer: '90 Min.', art: 'Block 4' },
  { zeit: '16:30 – 16:45', dauer: '15 Min.', art: 'Pause' },
  { zeit: '16:45 – 18:00', dauer: '75 Min.', art: 'Block 5 / Übung' },
];

const days = [
  {
    nr: 1,
    titel: 'Grundlagen des Bau- und Projektmanagements',
    lernziele: [
      'Grundbegriffe und Phasenmodelle des Projektmanagements sicher anwenden',
      'Rollen und Verantwortlichkeiten im Bauprojekt unterscheiden',
      'Die HOAI-Leistungsphasen den Projektphasen zuordnen',
      'Einen Projektstrukturplan (PSP) für ein Bauprojekt entwickeln',
    ],
    themen: [
      {
        titel: 'Begrüßung, Vorstellung, Seminarziele',
        block: 'Block 1',
        text: 'Vorstellung der Teilnehmenden und des Dozenten, Klärung der Erwartungen, Überblick über Ablauf, Methodik und Prüfungsmodalitäten der sechstägigen Schulung. Aushändigung von Teilnehmerhandbuch und Foliensatz.',
      },
      {
        titel: 'Grundbegriffe des Projektmanagements',
        block: 'Block 1',
        text: 'Definition „Projekt" nach DIN 69901 (zeitlich begrenzt, einmalig, zielgerichtet, ressourcenbeschränkt), Abgrenzung zum Prozess und zur Linienorganisation. Projektarten im Bauwesen: Neubau, Sanierung, Umbau, Infrastrukturprojekte. Die klassischen Projektphasen: Initiierung – Planung – Durchführung – Überwachung/Steuerung – Abschluss und ihre Übertragung auf Bauvorhaben.',
      },
      {
        titel: 'Rollen im Bauprojekt',
        block: 'Block 2',
        text: 'Aufgaben und Schnittstellen von Bauherr, Projektsteuerer, Architekt, Fachplanern (Statik, TGA, Elektro), Generalunternehmer, Generalübernehmer und Nachunternehmern. Verantwortungsabgrenzung, typische Kommunikationswege und Eskalationsstufen bei Konflikten zwischen den Beteiligten.',
      },
      {
        titel: 'Leistungsphasen der HOAI im Überblick',
        block: 'Block 2',
        text: 'Die neun Leistungsphasen der HOAI (Grundlagenermittlung bis Objektbetreuung) und ihr Zusammenspiel mit den Projektmanagement-Phasen. Schwerpunkt auf LP 1–5 (Planung) und LP 6–8 (Vergabe, Ausführung, Objektüberwachung) als Schnittstelle zum Projektmanagement.',
      },
      {
        titel: 'Projektorganisation und Projektstrukturplan (PSP)',
        block: 'Block 3',
        text: 'Aufbau- und Ablauforganisation von Bauprojekten, Projektorganigramm, Steuerungsgremien (Lenkungsausschuss, Baubesprechung, Jour fixe). Erstellung eines objekt-, phasen- und funktionsorientierten Projektstrukturplans als Basis für Termin-, Kosten- und Ressourcenplanung.',
      },
      {
        titel: 'Übung: Projektstrukturplan erstellen',
        block: 'Block 4',
        text: 'In Kleingruppen erstellen die Teilnehmenden einen PSP für ein vorgegebenes Beispielprojekt (Neubau eines dreigeschossigen Bürogebäudes) bis zur dritten Gliederungsebene. Anschließend Präsentation und moderierte Diskussion im Plenum.',
      },
      {
        titel: 'Tagesabschluss & Fragerunde',
        block: 'Block 5 / Übung',
        text: 'Zusammenfassung der Kernaussagen des Tages, offene Fragen, kurzer Ausblick auf Tag 2 (Bauplanung, Ausschreibung und Vergabe).',
      },
    ],
  },
  {
    nr: 2,
    titel: 'Bauplanung, Ausschreibung und Vergabe',
    lernziele: [
      'Den Weg von der Bedarfsplanung bis zur Baugenehmigung nachvollziehen',
      'Ein Leistungsverzeichnis strukturieren und bewerten',
      'Vergabearten nach VOB/A unterscheiden und situationsgerecht anwenden',
      'Angebote fachlich und wirtschaftlich vergleichen',
    ],
    themen: [
      {
        titel: 'Bedarfsplanung und Machbarkeitsstudie',
        block: 'Block 1',
        text: 'Ermittlung des Raum- und Funktionsprogramms, Standortanalyse, Wirtschaftlichkeitsbetrachtung und Machbarkeitsstudie als Entscheidungsgrundlage vor Planungsbeginn.',
      },
      {
        titel: 'Genehmigungsplanung und öffentlich-rechtliche Vorgaben',
        block: 'Block 1',
        text: 'Ablauf des Bauantragsverfahrens, Bauordnungsrecht der Länder im Überblick, Beteiligung von Behörden und Trägern öffentlicher Belange, typische Genehmigungsauflagen und deren Auswirkung auf den Terminplan.',
      },
      {
        titel: 'Leistungsverzeichnis (LV) erstellen',
        block: 'Block 2',
        text: 'Aufbau eines Leistungsverzeichnisses nach STLB-Bau, Abgrenzung Leistungsbeschreibung mit Leistungsverzeichnis vs. mit Leistungsprogramm (funktionale Ausschreibung), Positionsarten (Grund-, Bedarfs-, Wahlposition), Vermeidung typischer Ausschreibungsfehler.',
      },
      {
        titel: 'Vergabearten nach VOB/A',
        block: 'Block 2',
        text: 'Öffentliche Ausschreibung, beschränkte Ausschreibung mit und ohne Teilnahmewettbewerb, freihändige Vergabe/Verhandlungsvergabe. Anwendungsvoraussetzungen, Schwellenwerte und Fristen.',
      },
      {
        titel: 'Angebotsprüfung und Vergabeentscheidung',
        block: 'Block 3',
        text: 'Formale, rechnerische und fachliche Prüfung von Angeboten, Prüfung auf Auskömmlichkeit, Zuschlagskriterien (Preis, Qualität, technischer Wert), Dokumentation der Vergabeentscheidung im Vergabevermerk.',
      },
      {
        titel: 'Vertragsarten im Bauwesen',
        block: 'Block 3',
        text: 'Einheitspreisvertrag, Pauschalvertrag (Global-/Detailpauschale), GMP-Vertrag (Garantierter Maximalpreis) sowie Stundenlohnvereinbarungen – Chancen, Risiken und typische Anwendungsfälle je Vertragsart.',
      },
      {
        titel: 'Übung: Angebote vergleichen und bewerten',
        block: 'Block 4',
        text: 'Anhand von drei fiktiven Angeboten zu einem Rohbaugewerk erarbeiten die Teilnehmenden eine Bewertungsmatrix (Preis, Referenzen, Ausführungsfristen, Nachunternehmerquote) und begründen eine Vergabeempfehlung.',
      },
      {
        titel: 'Tagesabschluss & Fragerunde',
        block: 'Block 5 / Übung',
        text: 'Wiederholung der zentralen Begriffe, Klärung offener Fragen, Ausblick auf Tag 3 (Terminplanung und Ablaufsteuerung).',
      },
    ],
  },
  {
    nr: 3,
    titel: 'Terminplanung und Ablaufsteuerung',
    lernziele: [
      'Balkenplan- und Netzplantechnik zur Terminplanung einsetzen',
      'Den kritischen Pfad und Pufferzeiten bestimmen',
      'Ressourcen- und Baustelleneinrichtungsplanung durchführen',
      'Digitale Werkzeuge der Terminplanung einordnen',
    ],
    themen: [
      {
        titel: 'Terminplanungsmethoden im Überblick',
        block: 'Block 1',
        text: 'Balkenplan (Gantt-Diagramm) als anschauliches Steuerungsinstrument, Netzplantechnik (Vorgangsknoten-/Vorgangspfeilnetzpläne) für komplexe Abhängigkeiten, Taktplanung und Taktfertigung für sich wiederholende Bauabschnitte (z. B. Wohnungsbau, Geschossbau).',
      },
      {
        titel: 'Kritischer Pfad und Pufferzeiten',
        block: 'Block 2',
        text: 'Vorwärts- und Rückwärtsrechnung im Netzplan, Ermittlung von frühesten/spätesten Anfangs- und Endzeitpunkten, Bestimmung des kritischen Pfads, Gesamtpuffer und freier Puffer und deren Bedeutung für die Steuerung von Verzögerungen.',
      },
      {
        titel: 'Ressourcenplanung',
        block: 'Block 2',
        text: 'Planung von Personal, Geräten und Material im Zeitverlauf, Kapazitätsausgleich bei Ressourcenüberlastung, Schnittstelle zur Logistikplanung auf der Baustelle.',
      },
      {
        titel: 'Bauablaufplanung und Baustelleneinrichtungsplan',
        block: 'Block 3',
        text: 'Erstellung eines Baustelleneinrichtungsplans (Baustraßen, Kranstandorte, Lagerflächen, Baucontainer), Abstimmung mit Nachbarschaft und Behörden, Bauablaufplanung unter Berücksichtigung von Witterung, Vorlaufzeiten und Gewerkeschnittstellen.',
      },
      {
        titel: 'Digitale Tools der Terminplanung',
        block: 'Block 3',
        text: 'Überblick über gängige Terminplanungssoftware (z. B. MS Project) und BIM-gestützte 4D-Terminplanung (Verknüpfung von 3D-Modell und Terminplan) zur frühzeitigen Kollisions- und Terminprüfung.',
      },
      {
        titel: 'Übung: Netzplan für die Rohbauphase',
        block: 'Block 4',
        text: 'Erstellung eines Netzplans für eine typische Rohbauphase (Baugrube, Fundament, Kellergeschoss, Decken, Rohbau OG) inklusive Vorgangsdauern und Abhängigkeiten. Ermittlung des kritischen Pfads und Identifikation der Vorgänge mit dem höchsten Terminrisiko.',
      },
      {
        titel: 'Tagesabschluss & Fragerunde',
        block: 'Block 5 / Übung',
        text: 'Besprechung der Übungsergebnisse im Plenum, Zusammenfassung, Ausblick auf Tag 4 (Kostenmanagement und Controlling).',
      },
    ],
  },
  {
    nr: 4,
    titel: 'Kostenmanagement und Controlling',
    lernziele: [
      'Kosten nach DIN 276 strukturieren und über alle Planungsstufen fortschreiben',
      'Soll-Ist-Vergleiche zur Kostensteuerung nutzen',
      'Nachträge fachlich prüfen und verhandeln',
      'Eine Liquiditäts- und Zahlungsplanung aufstellen',
    ],
    themen: [
      {
        titel: 'Kostenplanung nach DIN 276',
        block: 'Block 1',
        text: 'Gliederung der Kostengruppen nach DIN 276 (u. a. Bauwerk – Baukonstruktion, Bauwerk – Technische Anlagen, Außenanlagen, Baunebenkosten), Genauigkeitsstufen von der Kostenschätzung über die Kostenberechnung bis zum Kostenanschlag und zur Kostenfeststellung.',
      },
      {
        titel: 'Kostenverfolgung während der Bauausführung',
        block: 'Block 1',
        text: 'Aufbau eines Kostencontrollings mit fortlaufendem Soll-Ist-Vergleich, Hochrechnung der voraussichtlichen Gesamtkosten (Kostenprognose), Frühwarnindikatoren bei drohenden Kostenüberschreitungen.',
      },
      {
        titel: 'Nachtragsmanagement',
        block: 'Block 2',
        text: 'Typische Ursachen von Nachträgen (Planänderungen, gestörter Bauablauf, Mengenmehrungen), Anspruchsgrundlagen nach VOB/B (§ 2 Abs. 5 und 6), formale und inhaltliche Prüfung von Nachtragsangeboten, Verhandlungsstrategien.',
      },
      {
        titel: 'Liquiditätsplanung und Zahlungsplan',
        block: 'Block 2',
        text: 'Erstellung eines Zahlungsplans auf Basis von Leistungsständen, Abschlagsrechnungen nach § 632a BGB / § 16 VOB/B, Sicherheitseinbehalte und Gewährleistungsbürgschaften.',
      },
      {
        titel: 'Kostenrisikomanagement',
        block: 'Block 3',
        text: 'Identifikation und Bewertung von Kostenrisiken, Risikovorsorge und Kostenpuffer, Zusammenspiel von Termin- und Kostenrisiken im Bauprojekt.',
      },
      {
        titel: 'Übung: Kostenkontrolle anhand eines Fallbeispiels',
        block: 'Block 4',
        text: 'Anhand eines Fallbeispiels mit Kostenplan und tatsächlichen Ist-Kosten führen die Teilnehmenden eine Abweichungsanalyse durch, identifizieren Kostentreiber und erarbeiten Gegensteuerungsmaßnahmen.',
      },
      {
        titel: 'Tagesabschluss & Fragerunde',
        block: 'Block 5 / Übung',
        text: 'Zusammenfassung der Kostenmanagement-Werkzeuge, offene Fragen, Ausblick auf Tag 5 (Qualitätsmanagement, Arbeitssicherheit und Baurecht).',
      },
    ],
  },
  {
    nr: 5,
    titel: 'Qualitätsmanagement, Arbeitssicherheit und Baurecht',
    lernziele: [
      'Qualitätssichernde Maßnahmen auf der Baustelle anwenden',
      'Grundpflichten der Arbeitssicherheit und Sicherheitskoordination benennen',
      'Zentrale Regelungen von VOB/B und BGB-Bauvertragsrecht einordnen',
      'Eine Bauabnahme rechtssicher vorbereiten und durchführen',
    ],
    themen: [
      {
        titel: 'Qualitätsmanagement auf der Baustelle',
        block: 'Block 1',
        text: 'Prüfpläne und Qualitätskontrollen je Bauphase, Dokumentation im Bautagebuch, systematisches Mängelmanagement von der Feststellung bis zur Nachverfolgung der Mängelbeseitigung.',
      },
      {
        titel: 'Arbeitsschutz und Sicherheitskoordination',
        block: 'Block 1',
        text: 'Grundpflichten nach Arbeitsschutzgesetz und Baustellenverordnung, Rolle des Sicherheits- und Gesundheitsschutzkoordinators (SiGeKo), Sicherheits- und Gesundheitsschutzplan (SiGe-Plan), Gefährdungsbeurteilung auf der Baustelle.',
      },
      {
        titel: 'Umweltschutz und Nachhaltigkeit am Bau',
        block: 'Block 2',
        text: 'Überblick zu Nachhaltigkeitszertifizierungen (z. B. DGNB), Bauabfallmanagement, Lärm- und Emissionsschutz während der Bauausführung.',
      },
      {
        titel: 'Grundzüge des Baurechts',
        block: 'Block 2',
        text: 'Systematik von VOB/B und BGB-Bauvertragsrecht, wesentliche Vorschriften zu Ausführungsfristen, Behinderung und Unterbrechung der Bauausführung, Gewährleistung und Verjährungsfristen.',
      },
      {
        titel: 'Bauabnahme',
        block: 'Block 3',
        text: 'Arten der Abnahme (förmliche, fiktive, konkludente Abnahme), Rechtsfolgen der Abnahme (Gefahrübergang, Beweislastumkehr, Beginn der Gewährleistungsfrist), Ablauf und Dokumentation der förmlichen Abnahme.',
      },
      {
        titel: 'Übung: Mängel- und Abnahmeprotokoll erstellen',
        block: 'Block 4',
        text: 'Anhand einer simulierten Bauabnahme erstellen die Teilnehmenden ein vollständiges Abnahmeprotokoll inklusive Mängelliste, Fristsetzung zur Mängelbeseitigung und Regelung zu wesentlichen/unwesentlichen Mängeln.',
      },
      {
        titel: 'Tagesabschluss & Fragerunde',
        block: 'Block 5 / Übung',
        text: 'Zusammenfassung der rechtlichen und qualitätsbezogenen Kernpunkte, Ausblick auf Tag 6 (Nachtragsmanagement, Kommunikation, Praxissimulation und Abschlussprüfung).',
      },
    ],
  },
  {
    nr: 6,
    titel: 'Kommunikation, Praxissimulation und Abschlussprüfung',
    lernziele: [
      'Claims strukturiert bearbeiten und Konflikte konstruktiv lösen',
      'Baubesprechungen wirksam vorbereiten und moderieren',
      'Digitale Trends im Bauprojektmanagement einordnen',
      'Erlernte Inhalte in einer Praxissimulation anwenden und in der Abschlussprüfung nachweisen',
    ],
    themen: [
      {
        titel: 'Claim-Management und Streitbeilegung',
        block: 'Block 1',
        text: 'Systematische Bearbeitung von Claims (Anspruchsgrundlage, Fristen, Nachweisführung), außergerichtliche Streitbeilegung durch Mediation, Schlichtung oder Schiedsgutachten als Alternative zum Rechtsstreit.',
      },
      {
        titel: 'Kommunikation und Führung im Bauprojekt',
        block: 'Block 1',
        text: 'Vorbereitung und Moderation von Baubesprechungen, professionelles Berichtswesen (Statusberichte, Bautagebuch), Stakeholder-Management gegenüber Bauherr, Behörden und Anwohnern, Grundlagen situativer Führung im Baustellenteam.',
      },
      {
        titel: 'Digitalisierung im Bauprojektmanagement',
        block: 'Block 2',
        text: 'Building Information Modeling (BIM) als integrierte Planungs- und Managementmethode, digitale Bautagebuch-Apps, cloudbasierte Projektplattformen für Dokumenten- und Planmanagement.',
      },
      {
        titel: 'Praxissimulation: Baubesprechung',
        block: 'Block 3',
        text: 'Rollenspiel einer Baubesprechung mit verteilten Rollen (Bauleitung, Nachunternehmer, Bauherrenvertretung, Projektsteuerung) zu einem eskalierten Terminproblem. Ziel: Anwendung von Termin-, Kosten- und Kommunikationswissen aus den Vortagen in einer realitätsnahen Situation.',
      },
      {
        titel: 'Zusammenfassung und Wiederholung',
        block: 'Block 4',
        text: 'Strukturierte Wiederholung aller sechs Schulungstage anhand der Lernzielübersicht, Klärung letzter inhaltlicher Fragen vor der Prüfung.',
      },
      {
        titel: 'Abschlussprüfung',
        block: 'Block 5 / Übung',
        text: 'Schriftliche Abschlussprüfung mit 5 Prüfungsfragen zu den Inhalten der gesamten Schulung (siehe separates Dokument „Prüfungsfragen"). Im Anschluss gemeinsame Auswertung, Besprechung der Lösungen und Zertifikatsübergabe.',
      },
    ],
  },
];

const didaktischeHinweise = {
  1: 'Zeitpuffer für Vorstellungsrunde einplanen (Gruppengröße beachten). Bei der PSP-Übung auf Vollständigkeit bis Ebene 3 achten, nicht auf Vorgangsdauern eingehen – das folgt an Tag 3.',
  2: 'Die Übung „Angebote vergleichen" funktioniert am besten mit Gruppen von 3–4 Personen. Bewertungsmatrix vorab als Flipchart-Vorlage vorbereiten. Auf Praxisbeispiele aus der Region der Teilnehmenden eingehen, falls bekannt.',
  3: 'Netzplan-Übung ist erfahrungsgemäß der zeitintensivste Programmpunkt der Schulung – Pufferzeit von 15 Minuten im Blockplan einplanen. Musterlösung erst nach Gruppenpräsentationen zeigen.',
  4: 'Fallbeispiel zur Kostenkontrolle vorab an Erfahrungsstand der Gruppe anpassen (Zahlen ggf. vereinfachen). Nachtragsmanagement eignet sich gut für eine kurze Diskussionsrunde zu eigenen Praxisfällen der Teilnehmenden.',
  5: 'Bei der Abnahme-Übung auf klare Rollenverteilung (Bauleitung/Bauherr) achten. Rechtliche Inhalte bewusst auf Grundzüge beschränken – kein Ersatz für Rechtsberatung, das im Plenum transparent kommunizieren.',
  6: 'Für das Rollenspiel genügend Vorbereitungszeit (ca. 15 Minuten) und Rollenkarten austeilen. Prüfung erst nach vollständiger Wiederholungsrunde starten, damit alle Teilnehmenden gut vorbereitet sind.',
};

// 5 Prüfungsfragen mit je 4 Antwortoptionen (genau eine korrekt)
const examQuestions = [
  {
    frage: 'Welche der folgenden Aussagen zum Projektstrukturplan (PSP) trifft zu?',
    optionen: [
      'Der PSP ersetzt den Netzplan vollständig und enthält bereits alle Vorgangsdauern.',
      'Der PSP gliedert ein Projekt hierarchisch in Teilprojekte und Arbeitspakete und bildet die Basis für Termin-, Kosten- und Ressourcenplanung.',
      'Der PSP wird ausschließlich vom Bauherrn erstellt und darf während des Projekts nicht mehr geändert werden.',
      'Der PSP ist ein gesetzlich vorgeschriebenes Formular nach VOB/A.',
    ],
    loesungIndex: 1,
    erlaeuterung: 'Der Projektstrukturplan ist ein hierarchisches Gliederungsinstrument (Teilprojekte, Arbeitspakete) und dient als Grundlage für die weitere Termin-, Kosten- und Ressourcenplanung – er ist kein gesetzliches Formular und ersetzt keinen Netzplan.',
  },
  {
    frage: 'Was versteht man unter dem „kritischen Pfad" in der Netzplantechnik?',
    optionen: [
      'Die Abfolge von Vorgängen mit dem größten Gesamtpuffer.',
      'Die kostenintensivste Vorgangskette eines Bauprojekts.',
      'Die Abfolge von Vorgängen ohne Puffer, deren Verzögerung unmittelbar den Fertigstellungstermin des Gesamtprojekts verschiebt.',
      'Der Teil des Bauablaufs, der von den Nachunternehmern ausgeführt wird.',
    ],
    loesungIndex: 2,
    erlaeuterung: 'Der kritische Pfad besteht aus den Vorgängen mit dem Gesamtpuffer null; jede Verzögerung dieser Vorgänge verschiebt direkt den Projektendtermin.',
  },
  {
    frage: 'Nach welcher Rechtsgrundlage kann ein Auftragnehmer bei Planänderungen des Auftraggebers in der Regel einen Nachtrag geltend machen?',
    optionen: [
      '§ 2 Abs. 5 und 6 VOB/B',
      '§ 1 Abs. 1 HOAI',
      'Art. 14 Grundgesetz',
      'DIN 276',
    ],
    loesungIndex: 0,
    erlaeuterung: '§ 2 Abs. 5 VOB/B regelt Vergütungsanpassungen bei Anordnungen des Auftraggebers, § 2 Abs. 6 VOB/B bei zusätzlichen, nicht vereinbarten Leistungen – beides klassische Nachtragsgrundlagen.',
  },
  {
    frage: 'Welche Rechtsfolge ist mit der Abnahme einer Bauleistung typischerweise verbunden?',
    optionen: [
      'Der Auftragnehmer haftet danach unbegrenzt für alle zukünftigen Mängel.',
      'Die Gewährleistungsfrist beginnt zu laufen und die Beweislast für Mängel geht auf den Auftraggeber über.',
      'Der Bauvertrag wird automatisch beendet und alle Zahlungsansprüche erlöschen.',
      'Der Sicherheitseinbehalt entfällt vollständig und sofort.',
    ],
    loesungIndex: 1,
    erlaeuterung: 'Mit der Abnahme beginnt die Gewährleistungsfrist und die Beweislast für nach der Abnahme auftretende Mängel kehrt sich zulasten des Auftraggebers um (dieser muss den Mangel und dessen Ursache nachweisen).',
  },
  {
    frage: 'Welches Instrument dient primär der frühzeitigen, dreidimensionalen Kollisionsprüfung in Kombination mit dem Terminplan?',
    optionen: [
      'Die Kostenfeststellung nach DIN 276',
      'Die 4D-Terminplanung auf Basis eines BIM-Modells',
      'Der Sicherheits- und Gesundheitsschutzplan (SiGe-Plan)',
      'Das Leistungsverzeichnis nach STLB-Bau',
    ],
    loesungIndex: 1,
    erlaeuterung: 'Die 4D-Terminplanung verknüpft das 3D-BIM-Modell mit dem Terminplan und ermöglicht so eine frühzeitige Prüfung von räumlichen Kollisionen und zeitlichen Abhängigkeiten.',
  },
];

module.exports = { meta, tagesraster, days, didaktischeHinweise, examQuestions };
