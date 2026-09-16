#!/usr/bin/env python3
import sys, os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "output")
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.units import cm
import akademie_style as A

styles = A.get_styles()
S = styles
story = []

story.append(Spacer(1, 1.0 * cm))
story.append(Paragraph("Dozentenhandbuch", S["DocTitle"]))
story.append(Paragraph("Fachbauleiter – Weiterbildung zur Fachbauleitung im Bauwesen",
                        S["DocSubtitle"]))
story.append(Paragraph("Nur für Dozentinnen und Dozenten der M&amp;C Akademie",
                        S["Small"]))
story.append(Spacer(1, 0.8 * cm))
story.append(A.InfoBox([
    Paragraph("Dieses Handbuch ergänzt das Teilnehmerhandbuch um didaktische "
              "Hinweise, den Stoffverteilungsplan, Material- und "
              "Sicherheitsvorgaben sowie Hinweise zur Prüfungsorganisation. "
              "Die Lösungen zu den Prüfungsfragen finden Sie ausschließlich im "
              "Dokument „Prüfungsfragen – Lösungen für Dozenten“.",
              S["BodyLeft"]),
], label="Hinweis für Dozierende"))
story.append(PageBreak())

def chapter(num, title, intro, points=None, box=None, box_label=None):
    story.extend(A.chapter_heading(f"{num}. {title}", kicker=f"KAPITEL {num}"))
    story.append(Spacer(1, 0.25 * cm))
    if isinstance(intro, list):
        for p in intro:
            story.append(Paragraph(p, S["Body"]))
    else:
        story.append(Paragraph(intro, S["Body"]))
    if points:
        story.append(Spacer(1, 0.1 * cm))
        story.append(A.bullet_list(points, S["Bullet"]))
    if box:
        story.append(Spacer(1, 0.25 * cm))
        story.append(A.InfoBox([Paragraph(b, S["BodyLeft"]) for b in box],
                                label=box_label))
    story.append(Spacer(1, 0.45 * cm))

chapter(1, "Einleitung für Dozierende",
    "Dieses Handbuch richtet sich an die unterrichtenden Dozentinnen und "
    "Dozenten der Weiterbildung Fachbauleiter. Es unterstützt Sie bei der "
    "Vorbereitung, Durchführung und Nachbereitung der sechs Kurstage und "
    "sorgt für einen einheitlichen, qualitätsgesicherten Ablauf über alle "
    "Kursdurchführungen hinweg.")

chapter(2, "Kursrahmendaten",
    "Die folgenden Rahmendaten gelten verbindlich für die Kursplanung und "
    "sollten den Teilnehmenden zu Kursbeginn transparent kommuniziert werden.",
    points=[
        "Dauer: 6 Tage, insgesamt 48 Unterrichtseinheiten (UE)",
        "Unterrichtszeiten: 08:00 – 16:00 Uhr (8 UE/Tag)",
        "Zielgruppe: Poliere, Meister, Techniker, Bauingenieure, "
        "erfahrene Facharbeiter",
        "Abschluss: Teilnahmebescheinigung oder Zertifikat „Geprüfter "
        "Fachbauleiter“ je nach Bildungsträger und Prüfungsleistung",
        "Der Zeitraum kann je nach Bildungsträger angepasst werden – "
        "Tagesplan entsprechend skalieren.",
    ])

chapter(3, "Didaktische Leitlinien",
    "Der Lehrgang ist als kompakte Vollzeit-Weiterbildung angelegt. Jeder "
    "Kurstag behandelt in der Regel zwei zusammenhängende Themenblöcke "
    "und verknüpft die Theorie durchgehend mit Praxisbeispielen und "
    "Fallstudien aus dem Baualltag.",
    points=[
        "Fallstudien und Praxisbeispiele zu jedem Themenblock einsetzen",
        "Gesetzestexte und VOB-Auszüge gemeinsam im Original lesen und "
        "besprechen",
        "Kurze Transferübungen (z. B. Musternachtrag prüfen) nach jedem "
        "Themenblock",
        "Wiederholung zentraler Begriffe zu Beginn des Folgetages",
    ])

# Tagesplan Tabelle
story.extend(A.chapter_heading("4. Stoffverteilungsplan (Tagesübersicht)",
                                kicker="KAPITEL 4"))
story.append(Spacer(1, 0.25 * cm))
story.append(Paragraph(
    "Bei 8 UE pro Tag ergibt sich folgende Verteilung der Kursinhalte auf "
    "die sechs Kurstage. Die Reihenfolge kann je nach Gruppenfortschritt "
    "angepasst werden, rechtliche Grundlagen (Baurecht, VOB) werden "
    "jedoch stets vor den darauf aufbauenden Themen behandelt.", S["Body"]))
story.append(Spacer(1, 0.25 * cm))

tagesplan = [
    ["Tag", "Schwerpunktthemen", "UE"],
    ["1", "Kursstart, Grundlagen der Bauleitung und Fachbauleitung, "
     "Baurecht und Genehmigungsverfahren", "8"],
    ["2", "Vertragsrecht und VOB (VOB/A, VOB/B, VOB/C), Ausschreibung, "
     "Vergabe und Abrechnung (AVA)", "8"],
    ["3", "Bauablaufplanung und Terminmanagement, Kalkulation und "
     "Kostenkontrolle", "8"],
    ["4", "Qualitätsmanagement und Bauüberwachung, Arbeitssicherheit und "
     "Gesundheitsschutz auf der Baustelle", "8"],
    ["5", "Nachtragsmanagement, Mängelmanagement, Abnahme und "
     "Gewährleistung", "8"],
    ["6", "Personalführung, Kommunikation und Dokumentation, "
     "Prüfungsvorbereitung, Abschlussprüfung, Auswertung", "8"],
]
tagesplan_p = [[Paragraph(c, S["TableHead"] if r == 0 else S["TableCell"])
                for c in row] for r, row in enumerate(tagesplan)]
story.append(A.styled_table(tagesplan_p, col_widths=[1.5 * cm, 12.2 * cm, 1.7 * cm]))
story.append(Spacer(1, 0.45 * cm))

chapter(5, "Materialliste und Ausstattung",
    "Für einen reibungslosen Ablauf sollten folgende Unterlagen und "
    "Materialien für jeden Kurstag vorbereitet werden:",
    points=[
        "Aktuelle Gesetzestexte und VOB-Auszüge (VOB/A, VOB/B, VOB/C) in "
        "ausreichender Anzahl",
        "Praxisbeispiele/Fallstudien inkl. Musterunterlagen (Bauvertrag, "
        "Nachtragsformular, Bautagebuch)",
        "Vorlagen für Balken- und Netzpläne zur gemeinsamen Bearbeitung",
        "Beamer/Präsentationstechnik für digitale Unterlagen",
        "Kalkulationsbeispiele bzw. einfache Tabellenvorlagen",
    ])

chapter(6, "Vorgaben zur Arbeitssicherheit im Unterricht",
    "Auch im Theorieunterricht sollten die Inhalte zur Arbeitssicherheit "
    "praxisnah und mit aktuellem Bezug vermittelt werden:",
    points=[
        "Reale (anonymisierte) Beispiele aus der Praxis zur "
        "Baustellenverordnung nutzen",
        "Rollen und Pflichten von Bauherr, SiGeKo und Fachbauleitung klar "
        "voneinander abgrenzen",
        "Dokumentationspflichten (Unterweisung, Unfallmeldung) anhand "
        "von Musterformularen üben",
    ])

chapter(7, "Bewertungskriterien und Prüfungsorganisation",
    "Der Lehrgang schließt mit einer schriftlichen Lernerfolgskontrolle "
    "bestehend aus fünf Prüfungsfragen ab, die inhaltlich alle Kapitel des "
    "Teilnehmerhandbuchs abdecken. Die Prüfungsfragen ohne Lösungen werden "
    "an die Teilnehmenden ausgegeben (Dokument „Prüfungsfragen“). Die "
    "zugehörigen Musterlösungen befinden sich ausschließlich im "
    "vertraulichen Dokument „Prüfungsfragen – Lösungen für Dozenten“ und "
    "dürfen nicht an Teilnehmende weitergegeben werden.",
    points=[
        "Bearbeitungszeit: empfohlen 45 Minuten",
        "Bestehensgrenze: mind. 3 von 5 Fragen korrekt bzw. nach Vorgabe "
        "des Bildungsträgers",
        "Nachbesprechung der Prüfung am letzten Kurstag ohne Weitergabe "
        "der Musterlösungen im Wortlaut",
    ],
    box=[
        "Das Dokument mit den Musterlösungen ist ausschließlich für den "
        "internen Gebrauch der Dozentinnen und Dozenten bestimmt und "
        "entsprechend vertraulich zu behandeln.",
    ],
    box_label="Vertraulichkeit")

chapter(8, "Hinweise zur Unterrichtsgestaltung je Themenblock",
    "Kurze didaktische Impulse für die einzelnen Themenblöcke:",
    points=[
        "Baurecht/VOB: Originaltexte gemeinsam lesen, zentrale Paragrafen "
        "mit eigenen Worten zusammenfassen lassen",
        "AVA: Ein einfaches Leistungsverzeichnis gemeinsam auswerten "
        "lassen",
        "Bauablaufplanung: Einen Beispiel-Balkenplan in Kleingruppen "
        "erstellen lassen",
        "Nachtragsmanagement: Anhand eines Musterfalls prüfen lassen, ob "
        "ein Nachtrag berechtigt ist",
        "Mängelmanagement: Rollenspiel Mängelanzeige zwischen "
        "Bauleitung und Auftragnehmer",
    ])

story.extend(A.chapter_heading("9. Checkliste Kursstart / Kursabschluss",
                                kicker="KAPITEL 9"))
story.append(Spacer(1, 0.25 * cm))
story.append(Paragraph("<b>Vor Kursstart</b>", S["H2"]))
story.append(A.bullet_list([
    "Gesetzestexte, VOB-Auszüge und Fallstudien vollständig prüfen",
    "Vorlagen (Bautagebuch, Nachtragsformular) bereitstellen",
    "Anwesenheitslisten vorbereiten",
], S["Bullet"]))
story.append(Spacer(1, 0.15 * cm))
story.append(Paragraph("<b>Zum Kursabschluss</b>", S["H2"]))
story.append(A.bullet_list([
    "Abschlussprüfung durchführen und auswerten",
    "Teilnahmebescheinigungen/Zertifikate ausstellen",
    "Unterlagen und Materialien kontrollieren, Mängel dokumentieren",
    "Kursfeedback der Teilnehmenden einholen",
], S["Bullet"]))

A.build_flowing_document(
    story, os.path.join(OUT_DIR, "Dozentenhandbuch.pdf"), A.PAGE_SIZE_PORTRAIT,
    "Dozentenhandbuch – Fachbauleiter (nur für Dozenten)",
    title="Dozentenhandbuch – Fachbauleiter",
)
print("done")
