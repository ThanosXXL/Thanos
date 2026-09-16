#!/usr/bin/env python3
import sys, os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "output")
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak
)
from reportlab.lib.units import cm
import akademie_style as A

styles = A.get_styles()
S = styles
story = []

def title_page():
    story.append(Spacer(1, 1.0 * cm))
    story.append(Paragraph("Teilnehmerhandbuch", S["DocTitle"]))
    story.append(Paragraph(
        "Fachkurs Ausbau – Grundlagen und praxisorientierte Techniken im Innenausbau",
        S["DocSubtitle"]))
    story.append(Paragraph("Erstellt von Matthias Gornik &amp; Athanasios Matziouridis",
                            S["Authors"]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Für Teilnehmerinnen und Teilnehmer des Fachkurses",
                            S["Small"]))
    story.append(Spacer(1, 0.8 * cm))
    story.append(A.InfoBox([
        Paragraph("<b>Auf einen Blick</b>", S["BodyLeft"]),
        Spacer(1, 0.15 * cm),
    ] + [
        Paragraph(t, S["BodyLeft"]) for t in [
            "Dauer: 8 Wochen (320 Unterrichtseinheiten)",
            "Unterrichtszeiten: Montag – Freitag, 08:00 – 15:00 Uhr",
            "Abschluss: Teilnahmebescheinigung oder Zertifikat",
            "Schwerpunkt: Trockenbau, Boden- und Wandgestaltung, Montage",
        ]
    ], label="Kursdaten"))
    story.append(PageBreak())

def chapter(num, title, intro, points=None, box=None, kicker="KAPITEL"):
    story.extend(A.chapter_heading(f"{num}. {title}", kicker=f"{kicker} {num}"))
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
        story.append(box)
    story.append(Spacer(1, 0.45 * cm))

title_page()

# 1
chapter(1, "Willkommen im Fachkurs Ausbau",
    "Herzlich willkommen im Fachkurs Ausbau der M&amp;C Akademie! Dieses Handbuch "
    "begleitet Sie durch alle acht Wochen der Schulung und fasst die wichtigsten "
    "Inhalte, Techniken und Sicherheitsregeln zusammen, die Sie für eine "
    "erfolgreiche Teilnahme benötigen. Nutzen Sie es als Nachschlagewerk während "
    "der Präsenzeinheiten und zur Vorbereitung auf die Abschlussprüfung.")

# 2
chapter(2, "Kursübersicht",
    "Der Kurs vermittelt grundlegende und erweiterte Kenntnisse im Bereich "
    "Ausbauarbeiten. Sie lernen die wichtigsten Techniken des Innenausbaus kennen "
    "und wenden diese praxisnah an. Theorie und Praxis sind eng miteinander "
    "verknüpft, damit Sie sicher und anwendungsorientiert arbeiten können.",
    points=[
        "Ziel: Selbstständige, fachgerechte Ausführung einfacher Ausbauarbeiten",
        "Zielgruppe: Einsteiger, Quereinsteiger, Auszubildende und Hilfskräfte im "
        "Bauwesen",
        "Unterrichtsmaterial: Skript, Arbeitsblätter, Übungsmaterial, PSA, "
        "digitale Medien",
    ])

# 3
chapter(3, "Arbeitssicherheit und persönliche Schutzausrüstung (PSA)",
    "Sicherheit hat im Ausbaugewerbe oberste Priorität. Vor jeder praktischen "
    "Übung erfolgt eine Sicherheitsunterweisung durch die Dozentin bzw. den "
    "Dozenten. Tragen Sie die vorgeschriebene Schutzausrüstung durchgängig und "
    "melden Sie Gefahrenstellen oder beschädigtes Werkzeug sofort.",
    points=[
        "Schutzbrille bei Schneid-, Schleif- und Bohrarbeiten",
        "Staubmaske (mind. FFP2) bei Spachtel-, Schleif- und Zuschnittarbeiten",
        "Gehörschutz bei Arbeiten mit lauten Maschinen",
        "Sicherheitsschuhe (S1/S3) und Arbeitshandschuhe",
        "Freihalten von Flucht- und Rettungswegen auf der Übungsbaustelle",
    ],
    box=A.InfoBox([
        Paragraph("Bei Unfällen oder Verletzungen sofort die Dozentin bzw. den "
                  "Dozenten informieren und den Ersthelfer im Raum hinzuziehen.",
                  S["BodyLeft"]),
    ], label="Wichtiger Hinweis"))

# 4
chapter(4, "Materialkunde",
    "Für den Innenausbau ist die richtige Materialauswahl entscheidend für "
    "Qualität, Langlebigkeit und Verarbeitbarkeit. In diesem Kapitel lernen Sie "
    "die gängigsten Werkstoffe und ihre Einsatzbereiche kennen.",
    points=[
        "Gipskarton (GK): Standardplatte für Trockenbauwände und Decken, in "
        "unterschiedlichen Stärken und Sonderausführungen (feuchtraum-, "
        "feuer- oder schallschutzhemmend)",
        "Holz und Holzwerkstoffe: Unterkonstruktionen, Leisten, Möbelbau- und "
        "Verkleidungselemente",
        "Dämmstoffe: Mineralwolle, Holzfaser- oder Polystyrol-Dämmung für "
        "Wärme- und Schallschutz",
        "Profile: CW- und UW-Profile aus verzinktem Stahlblech für "
        "Ständerwände und Unterkonstruktionen",
    ])

# 5
chapter(5, "Mess- und Anreißtechniken",
    "Präzises Messen und Anreißen ist die Grundlage jeder sauberen "
    "Ausbauarbeit. Kleine Ungenauigkeiten summieren sich schnell zu sichtbaren "
    "Fehlern in der fertigen Konstruktion.",
    points=[
        "Zollstock, Bandmaß und Laser-Entfernungsmesser für Grundmaße",
        "Wasserwaage und Laser-Kreuzlinie für horizontale und vertikale "
        "Bezugslinien",
        "Schlagschnur zum schnellen Übertragen langer, gerader Linien",
        "Winkel und Streichmaß für rechtwinklige Anrisse und Zuschnitte",
        "Grundsatz: erst kontrollieren, dann anreißen, erst anreißen, dann "
        "schneiden",
    ])

# 6
chapter(6, "Trockenbaukonstruktionen (Wände, Decken, Verkleidungen)",
    "Der Trockenbau bildet das Kernstück des Innenausbaus. Sie erlernen den "
    "Aufbau nichttragender Ständerwände, abgehängter Decken und "
    "Vorsatzschalen von der Unterkonstruktion bis zur Beplankung.",
    points=[
        "Anlegen der UW-Profile am Boden und an der Decke, Lotrechtes Ausrichten",
        "Setzen und Ausrichten der CW-Ständerprofile im vorgeschriebenen Raster",
        "Einbringen von Dämmung und Installationsebenen vor dem Beplanken",
        "Beplanken mit Gipskartonplatten inkl. versetzter Stoßfugen",
        "Sonderkonstruktionen: abgehängte Decken, Vorwandinstallationen, "
        "Nischen und Schächte",
    ])

# 7
chapter(7, "Spachtel- und Schleiftechniken",
    "Nach der Beplankung werden Fugen, Schrauböffnungen und Kanten "
    "verspachtelt, damit eine ebene, unsichtbare Übergangsfläche entsteht. "
    "Die Qualität dieses Arbeitsschritts entscheidet maßgeblich über das "
    "spätere Erscheinungsbild der Wand.",
    points=[
        "Fugenbewehrung mit Bandage oder Fugendeckstreifen einbringen",
        "Mehrlagiger Spachtelaufbau: Füllspachtel, Zwischenspachtel, "
        "Feinspachtel",
        "Trocknungszeiten zwischen den Spachtelgängen einhalten",
        "Zwischen- und Endschliff mit geeigneter Körnung, staubarme Verfahren "
        "bevorzugen",
    ])

# 8
chapter(8, "Bodenaufbau und einfache Bodenverlegung",
    "Ein fachgerechter Unterboden ist Voraussetzung für einen langlebigen "
    "Bodenbelag. Sie lernen den klassischen Schichtaufbau sowie die Verlegung "
    "gängiger schwimmender Bodenbeläge.",
    points=[
        "Schichtaufbau: Rohdecke, Trittschalldämmung, Randdämmstreifen, "
        "Bodenbelag",
        "Kontrolle der Ebenheit und Feuchtigkeit des Untergrunds vor Verlegung",
        "Schwimmende Verlegung von Laminat- und Vinylböden mit Klick-System",
        "Einhaltung von Dehnungsfugen an Wänden und Übergängen",
    ])

# 9
chapter(9, "Montage von Bauelementen (z. B. Türen, Leisten)",
    "Der fachgerechte Einbau von Türen, Sockel- und Zierleisten rundet das "
    "Erscheinungsbild einer Ausbauarbeit ab und erfordert sauberes, "
    "millimetergenaues Arbeiten.",
    points=[
        "Zargen lotrecht und fluchtgerecht ausrichten und fixieren",
        "Türblätter einhängen, Funktionsprüfung (Spaltmaße, Schließverhalten)",
        "Sockelleisten passgenau zuschneiden, Gehrungsschnitte an Ecken",
        "Befestigung mit geeigneten Klebe- oder Montagesystemen je nach "
        "Untergrund",
    ])

# 10
chapter(10, "Praktische Übungen und Projektarbeit",
    "In den praktischen Übungseinheiten wenden Sie das theoretisch erlernte "
    "Wissen unmittelbar an einem Übungsobjekt an. Gegen Ende des Kurses "
    "erstellen Sie in Kleingruppen ein kleines Ausbauprojekt, das mehrere "
    "Gewerke kombiniert.",
    points=[
        "Wöchentliche Praxisblöcke im Anschluss an die Theorieeinheiten",
        "Individuelles Feedback der Dozentinnen und Dozenten zu jeder Übung",
        "Abschlussprojekt: Bau einer Trockenbauwand mit Tür, Spachtelung und "
        "Bodenanschluss",
    ])

# 11
chapter(11, "Lernkontrolle und Prüfungsvorbereitung",
    "Der Kurs schließt mit einer schriftlichen Lernerfolgskontrolle ab. Die "
    "fünf Prüfungsfragen orientieren sich unmittelbar an den in diesem "
    "Handbuch behandelten Themen und werden in einem separaten Dokument "
    "„Prüfungsfragen“ zur Verfügung gestellt.",
    points=[
        "Wiederholen Sie vor der Prüfung die Kapitel Materialkunde, "
        "Trockenbau und Arbeitssicherheit",
        "Nutzen Sie die Arbeitsblätter aus dem Unterricht zur Selbstkontrolle",
        "Bei Fragen wenden Sie sich jederzeit an Ihre Dozentin bzw. Ihren "
        "Dozenten",
    ])

# 12 Glossar
story.extend(A.chapter_heading("12. Glossar", kicker="KAPITEL 12"))
story.append(Spacer(1, 0.25 * cm))
glossary = [
    ("CW-/UW-Profil", "Metallprofile für die Unterkonstruktion von "
     "Trockenbau-Ständerwänden (CW = Ständer, UW = Anschluss oben/unten)."),
    ("PSA", "Persönliche Schutzausrüstung, z. B. Schutzbrille, Staubmaske, "
     "Gehörschutz, Sicherheitsschuhe."),
    ("Spachtelgang", "Ein Arbeitsschritt beim Verspachteln von Fugen; in der "
     "Regel werden mehrere Spachtelgänge übereinander aufgetragen."),
    ("Trittschalldämmung", "Dämmschicht unter dem Bodenbelag zur Reduzierung "
     "der Schallübertragung zwischen Geschossen."),
    ("Bandage", "Fugenbewehrungsband aus Papier oder Glasfaser zur "
     "Verstärkung von Plattenstößen."),
]
for term, definition in glossary:
    story.append(Paragraph(f"<b>{term}:</b> {definition}", S["BodyLeft"]))
    story.append(Spacer(1, 0.12 * cm))

story.append(Spacer(1, 0.4 * cm))
story.append(A.InfoBox([
    Paragraph("Bei organisatorischen Fragen wenden Sie sich an die "
              "Kursleitung Ihres Bildungsträgers. Fachliche Fragen zum "
              "Kursinhalt beantworten Ihnen Matthias Gornik und Athanasios "
              "Matziouridis gerne im Unterricht.", S["BodyLeft"]),
], label="Kontakt"))

A.build_flowing_document(
    story, os.path.join(OUT_DIR, "Teilnehmerhandbuch.pdf"), A.PAGE_SIZE_PORTRAIT,
    "Teilnehmerhandbuch – Fachkurs Ausbau",
)
print("done")
