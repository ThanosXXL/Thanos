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
story.append(Paragraph(
    "Fachkurs Ausbau – Grundlagen und praxisorientierte Techniken im Innenausbau",
    S["DocSubtitle"]))
story.append(Paragraph("Erstellt von Matthias Gornik &amp; Athanasios Matziouridis",
                        S["Authors"]))
story.append(Spacer(1, 0.3 * cm))
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
    "Dozenten des Fachkurses Ausbau. Es unterstützt Sie bei der Vorbereitung, "
    "Durchführung und Nachbereitung der acht Kurswochen und sorgt für einen "
    "einheitlichen, qualitätsgesicherten Ablauf über alle Kursdurchführungen "
    "hinweg.")

chapter(2, "Kursrahmendaten",
    "Die folgenden Rahmendaten gelten verbindlich für die Kursplanung und "
    "sollten den Teilnehmenden zu Kursbeginn transparent kommuniziert werden.",
    points=[
        "Dauer: 8 Wochen, insgesamt 320 Unterrichtseinheiten (UE)",
        "Unterrichtszeiten: Montag – Freitag, 08:00 – 15:00 Uhr (8 UE/Tag, "
        "40 UE/Woche)",
        "Zielgruppe: Einsteiger, Quereinsteiger, Auszubildende, Hilfskräfte im "
        "Bauwesen",
        "Abschluss: Teilnahmebescheinigung oder Zertifikat je nach "
        "Bildungsträger und Prüfungsleistung",
        "Der Zeitraum kann je nach Bildungsträger angepasst werden – "
        "Wochenplan entsprechend skalieren.",
    ])

chapter(3, "Didaktische Leitlinien",
    "Der Kurs folgt dem Prinzip „Theorie unmittelbar gefolgt von Praxis“. "
    "Jede Themeneinheit beginnt mit einer kurzen fachlichen Einführung "
    "(max. 45–60 Minuten) und mündet danach in eine angeleitete praktische "
    "Übung am Übungsobjekt.",
    points=[
        "Kleine Lerngruppen an den Übungsständen (max. 3–4 Teilnehmende je "
        "Station)",
        "Demonstration durch die Dozentin/den Dozenten vor jeder neuen "
        "Technik",
        "Individuelles Feedback während der praktischen Übungen statt "
        "ausschließlich am Ende",
        "Sicherheitsunterweisung vor jedem neuen Werkzeug- oder "
        "Maschineneinsatz verpflichtend",
        "Wiederholung sicherheitsrelevanter Inhalte zu Wochenbeginn",
    ])

# Wochenplan Tabelle
story.extend(A.chapter_heading("4. Stoffverteilungsplan (Wochenübersicht)",
                                kicker="KAPITEL 4"))
story.append(Spacer(1, 0.25 * cm))
story.append(Paragraph(
    "Bei 40 UE pro Woche ergibt sich folgende Verteilung der Kursinhalte auf "
    "die acht Kurswochen. Die Reihenfolge kann je nach Gruppenfortschritt "
    "angepasst werden, sicherheitsrelevante Inhalte werden jedoch stets vor "
    "dem jeweiligen Praxisblock behandelt.", S["Body"]))
story.append(Spacer(1, 0.25 * cm))

wochenplan = [
    ["Woche", "Schwerpunktthemen", "UE"],
    ["1", "Kursstart, Grundlagen des Innenausbaus, Arbeitssicherheit & PSA, "
     "Werkzeugkunde", "40"],
    ["2", "Materialkunde: Gipskarton, Holz, Dämmstoffe, Profile", "40"],
    ["3", "Mess- und Anreißtechniken", "40"],
    ["4", "Trockenbaukonstruktionen – Ständerwände", "40"],
    ["5", "Trockenbaukonstruktionen – Decken und Verkleidungen", "40"],
    ["6", "Spachtel- und Schleiftechniken", "40"],
    ["7", "Bodenaufbau/-verlegung, Montage von Bauelementen (Türen, "
     "Leisten)", "40"],
    ["8", "Praktische Projektarbeit, Prüfungsvorbereitung, "
     "Abschlussprüfung, Auswertung", "40"],
]
wochenplan_p = [[Paragraph(c, S["TableHead"] if r == 0 else S["TableCell"])
                 for c in row] for r, row in enumerate(wochenplan)]
story.append(A.styled_table(wochenplan_p, col_widths=[1.8 * cm, 11.9 * cm, 1.7 * cm]))
story.append(Spacer(1, 0.45 * cm))

chapter(5, "Materialliste und Ausstattung",
    "Für einen reibungslosen Praxisbetrieb sollte folgende Grundausstattung "
    "je Übungsgruppe (3–4 Teilnehmende) vorgehalten werden:",
    points=[
        "Trockenbauprofile (CW/UW) in gängigen Dimensionen, Gipskartonplatten",
        "Dämmstoffe (Mineralwolle), Fugenspachtel, Bandage/Fugendeckstreifen",
        "Handwerkzeug: Zollstock, Wasserwaage, Schlagschnur, Winkel, "
        "Streichmaß, Handsäge, Cuttermesser",
        "Elektrowerkzeug: Akkuschrauber, ggf. Tauchsäge (nur unter Aufsicht)",
        "Bodenbelagsmuster (Laminat/Vinyl) und Verlegewerkzeug",
        "Vollständige PSA-Ausstattung in ausreichender Stückzahl (Brillen, "
        "Masken, Gehörschutz, Handschuhe)",
    ])

chapter(6, "Sicherheitsunterweisung – Pflichten der Dozierenden",
    "Die Dozentin bzw. der Dozent trägt die Aufsichtspflicht während aller "
    "praktischen Einheiten. Folgende Punkte sind verbindlich einzuhalten und "
    "zu dokumentieren:",
    points=[
        "Durchführung und schriftliche Dokumentation der "
        "Erstunterweisung am ersten Kurstag",
        "Kontrolle des korrekten Tragens der PSA vor jeder Praxiseinheit",
        "Freigabe von Elektrowerkzeugen nur nach individueller Einweisung",
        "Führen einer Anwesenheits- und Unterweisungsliste",
        "Unverzügliche Meldung von Unfällen oder Beinaheunfällen an die "
        "Kursleitung des Bildungsträgers",
    ])

chapter(7, "Bewertungskriterien und Prüfungsorganisation",
    "Der Kurs schließt mit einer schriftlichen Lernerfolgskontrolle "
    "bestehend aus fünf Prüfungsfragen ab, die inhaltlich alle Kapitel des "
    "Teilnehmerhandbuchs abdecken. Die Prüfungsfragen ohne Lösungen werden "
    "an die Teilnehmenden ausgegeben (Dokument „Prüfungsfragen“). Die "
    "zugehörigen Musterlösungen befinden sich ausschließlich im vertraulichen "
    "Dokument „Prüfungsfragen – Lösungen für Dozenten“ und dürfen nicht an "
    "Teilnehmende weitergegeben werden.",
    points=[
        "Bearbeitungszeit: empfohlen 45 Minuten",
        "Bestehensgrenze: mind. 3 von 5 Fragen korrekt bzw. nach Vorgabe des "
        "Bildungsträgers",
        "Nachbesprechung der Prüfung am letzten Kurstag ohne Weitergabe der "
        "Musterlösungen im Wortlaut",
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
        "Materialkunde: Anschauungsmaterial reihum geben lassen, Muster "
        "aktiv ertasten und vergleichen lassen",
        "Mess-/Anreißtechnik: Fehlerbeispiele bewusst zeigen, um Toleranzen "
        "greifbar zu machen",
        "Trockenbau: Unterkonstruktion zunächst gemeinsam an einer "
        "Musterwand aufbauen, danach in Kleingruppen wiederholen",
        "Spachteltechnik: Trocknungszeiten aktiv für Theorie- oder "
        "Sicherheitsinhalte der nächsten Einheit nutzen",
        "Projektarbeit: Rollen in der Kleingruppe (Messen, Zuschnitt, "
        "Montage) bewusst rotieren lassen",
    ])

story.extend(A.chapter_heading("9. Checkliste Kursstart / Kursabschluss",
                                kicker="KAPITEL 9"))
story.append(Spacer(1, 0.25 * cm))
story.append(Paragraph("<b>Vor Kursstart</b>", S["H2"]))
story.append(A.bullet_list([
    "Übungsstationen und Materialliste vollständig prüfen",
    "PSA-Bestand kontrollieren und ggf. nachbestellen",
    "Anwesenheits- und Unterweisungslisten vorbereiten",
], S["Bullet"]))
story.append(Spacer(1, 0.15 * cm))
story.append(Paragraph("<b>Zum Kursabschluss</b>", S["H2"]))
story.append(A.bullet_list([
    "Abschlussprüfung durchführen und auswerten",
    "Teilnahmebescheinigungen/Zertifikate ausstellen",
    "Übungsmaterial und Werkzeug kontrollieren, Mängel dokumentieren",
    "Kursfeedback der Teilnehmenden einholen",
], S["Bullet"]))

A.build_flowing_document(
    story, os.path.join(OUT_DIR, "Dozentenhandbuch.pdf"), A.PAGE_SIZE_PORTRAIT,
    "Dozentenhandbuch – Fachkurs Ausbau (nur für Dozenten)",
    title="Dozentenhandbuch – Fachkurs Ausbau",
)
print("done")
