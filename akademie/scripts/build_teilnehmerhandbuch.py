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
    story.append(Paragraph("Fachbauleiter – Weiterbildung zur Fachbauleitung im Bauwesen",
                            S["DocSubtitle"]))
    story.append(Paragraph("Für Teilnehmerinnen und Teilnehmer der Weiterbildung",
                            S["Small"]))
    story.append(Spacer(1, 0.8 * cm))
    story.append(A.InfoBox([
        Paragraph("<b>Auf einen Blick</b>", S["BodyLeft"]),
        Spacer(1, 0.15 * cm),
    ] + [
        Paragraph(t, S["BodyLeft"]) for t in [
            "Dauer: 6 Tage (48 Unterrichtseinheiten)",
            "Unterrichtszeiten: 08:00 – 16:00 Uhr",
            "Abschluss: Teilnahmebescheinigung oder Zertifikat „Geprüfter "
            "Fachbauleiter“",
            "Schwerpunkt: Baurecht, VOB, Bauablauf, Kosten, Qualität, "
            "Sicherheit, Nachträge",
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
chapter(1, "Willkommen im Fachbauleiter-Lehrgang",
    "Herzlich willkommen zur Weiterbildung Fachbauleiter der M&amp;C "
    "Akademie! Dieses Handbuch begleitet Sie durch alle sechs Kurstage "
    "und fasst die wichtigsten Inhalte zu Baurecht, Vertragswesen, "
    "Bauablauf, Kosten, Qualität, Sicherheit und Nachtragsmanagement "
    "zusammen. Nutzen Sie es als Nachschlagewerk während der "
    "Präsenzeinheiten und zur Vorbereitung auf die Abschlussprüfung.")

# 2
chapter(2, "Kursübersicht",
    "Die Weiterbildung vermittelt das fachliche, rechtliche und "
    "organisatorische Rüstzeug für die eigenverantwortliche Leitung und "
    "Überwachung von Bauvorhaben. Theorie wird durchgehend mit "
    "praxisnahen Beispielen und Fallstudien aus dem Baualltag verknüpft.",
    points=[
        "Ziel: eigenständige fachliche, rechtliche, terminliche und "
        "wirtschaftliche Leitung von Bauvorhaben",
        "Zielgruppe: Poliere, Meister, Techniker, Bauingenieure und "
        "erfahrene Facharbeiter",
        "Unterrichtsmaterial: Skript, VOB-Auszüge, Fallstudien, "
        "Vorlagen, digitale Medien",
    ])

# 3
chapter(3, "Grundlagen der Bauleitung und Fachbauleitung",
    "Die Fachbauleitung verantwortet die fachgerechte, termingerechte "
    "und wirtschaftliche Ausführung eines Bauvorhabens oder eines "
    "einzelnen Gewerks vor Ort. Sie ist Schnittstelle zwischen "
    "Bauherrn, Planern, Auftragnehmern und Behörden und trägt "
    "wesentliche Verantwortung für Qualität, Termine und Kosten auf der "
    "Baustelle.",
    points=[
        "Abgrenzung: Objektüberwachung, örtliche Bauleitung und "
        "Fachbauleitung einzelner Gewerke",
        "Aufgaben: Koordination der Gewerke, Überwachung der "
        "Bauausführung, Termin- und Kostenkontrolle",
        "Verantwortung: Einhaltung der anerkannten Regeln der Technik "
        "und der geltenden Vorschriften",
        "Kommunikation als zentrale Aufgabe zwischen allen Baubeteiligten",
    ])

# 4
chapter(4, "Baurecht und Genehmigungsverfahren",
    "Öffentlich-rechtliche Vorschriften bilden den rechtlichen Rahmen "
    "jedes Bauvorhabens. Die Fachbauleitung muss die wesentlichen "
    "Grundlagen des Bauordnungsrechts kennen, um Genehmigungsauflagen "
    "einzuhalten und Bauvorhaben rechtssicher umzusetzen.",
    points=[
        "Bauordnungsrecht der Länder und Bauantragsverfahren im Überblick",
        "Genehmigungspflichtige und genehmigungsfreie Vorhaben",
        "Nachbarrecht und Abstandsflächen",
        "Bauüberwachung durch die Bauaufsichtsbehörde",
        "Folgen von Verstößen gegen öffentlich-rechtliche Vorschriften",
    ])

# 5
chapter(5, "Vertragsrecht und VOB",
    "Bauverträge werden entweder nach dem Bauvertragsrecht des BGB "
    "oder – bei entsprechender Vereinbarung – nach der Vergabe- und "
    "Vertragsordnung für Bauleistungen (VOB) abgewickelt. Die VOB "
    "gliedert sich in drei Teile mit unterschiedlichen Regelungsbereichen.",
    points=[
        "VOB/A: Vergabe von Bauleistungen (Ausschreibung und Vergabe)",
        "VOB/B: Allgemeine Vertragsbedingungen für die Ausführung von "
        "Bauleistungen (Rechte und Pflichten von AG und AN)",
        "VOB/C: Allgemeine Technische Vertragsbedingungen (ATV) je Gewerk",
        "Wichtige Regelungsbereiche der VOB/B: Ausführungsfristen, "
        "Behinderung, Abnahme, Gewährleistung, Kündigung",
        "Unterschiede zum BGB-Bauvertragsrecht kennen und einordnen "
        "können",
    ])

# 6
chapter(6, "Ausschreibung, Vergabe und Abrechnung (AVA)",
    "AVA bezeichnet den durchgängigen Prozess von der Erstellung des "
    "Leistungsverzeichnisses über die Angebotsauswertung und Vergabe "
    "bis zur Schlussabrechnung einer Bauleistung.",
    points=[
        "Leistungsverzeichnis (LV) und Leistungsbeschreibung erstellen",
        "Angebote einholen, prüfen und rechnerisch/technisch auswerten",
        "Vergabearten: öffentliche, beschränkte und freihändige Vergabe",
        "Aufmaß und Abrechnung nach VOB/C bzw. vertraglicher Vereinbarung",
        "Rechnungsprüfung und Zahlungsfreigabe",
    ])

# 7
chapter(7, "Bauablaufplanung und Terminmanagement",
    "Eine realistische Terminplanung ist Voraussetzung für einen "
    "reibungslosen Bauablauf. Die Fachbauleitung erstellt, überwacht "
    "und passt den Bauzeitenplan während der gesamten Bauzeit an.",
    points=[
        "Balkenplan (Gantt-Diagramm) für die übersichtliche "
        "Terminplanung der Gewerke",
        "Netzplantechnik zur Ermittlung des kritischen Pfads bei "
        "komplexen Bauvorhaben",
        "Pufferzeiten und Abhängigkeiten zwischen Gewerken einplanen",
        "Dokumentation von Behinderungen und Bauzeitverlängerungen",
        "Regelmäßiger Soll-Ist-Abgleich und Terminnachsteuerung",
    ])

# 8
chapter(8, "Kalkulation und Kostenkontrolle",
    "Die Fachbauleitung überwacht neben Terminen und Qualität auch die "
    "Kosten eines Bauvorhabens. Grundkenntnisse der Baukalkulation "
    "helfen, Angebote zu bewerten und Kostenabweichungen frühzeitig zu "
    "erkennen.",
    points=[
        "Aufbau einer Baukalkulation: Einzelkosten der Teilleistungen, "
        "Gemeinkosten, Zuschläge",
        "Soll-Ist-Vergleich während der Bauausführung",
        "Kostenkontrolle bei Nachträgen und Mehrmengen",
        "Frühzeitiges Erkennen von Kostenrisiken",
    ])

# 9
chapter(9, "Qualitätsmanagement und Bauüberwachung",
    "Die laufende Überwachung der Bauausführung stellt sicher, dass die "
    "vereinbarte und die tatsächlich anerkannte Qualität eingehalten "
    "werden. Dazu gehören regelmäßige Baustellenbegehungen und eine "
    "lückenlose Dokumentation.",
    points=[
        "Kontrolle der Ausführung anhand von Plänen, Leistungsverzeichnis "
        "und anerkannten Regeln der Technik",
        "Regelmäßige Baustellenbegehungen und Qualitätskontrollen",
        "Prüfprotokolle und Bautagebuch als Nachweisdokumente",
        "Umgang mit Abweichungen: Nachbesserung vor Fortsetzung der "
        "Folgegewerke",
    ])

# 10
chapter(10, "Arbeitssicherheit und Gesundheitsschutz auf der Baustelle",
    "Die Fachbauleitung trägt Mitverantwortung für die Sicherheit auf "
    "der Baustelle. Bei Baustellen mit mehreren Arbeitgebern greifen "
    "zusätzlich die Vorgaben der Baustellenverordnung.",
    points=[
        "Baustellenverordnung: Vorankündigung, SiGe-Plan, "
        "Sicherheits- und Gesundheitsschutzkoordinator (SiGeKo)",
        "Persönliche Schutzausrüstung (PSA) und deren Kontrolle",
        "Verkehrssicherung und Ordnung auf der Baustelle",
        "Unterweisungspflichten und deren Dokumentation",
        "Meldung und Dokumentation von Unfällen und Beinaheunfällen",
    ],
    box=A.InfoBox([
        Paragraph("Bei Unfällen oder Gefahrensituationen ist unverzüglich "
                  "die verantwortliche Fach- bzw. Bauleitung sowie der "
                  "SiGeKo zu informieren.", S["BodyLeft"]),
    ], label="Wichtiger Hinweis"))

# 11
chapter(11, "Nachtragsmanagement",
    "Nachträge entstehen durch Leistungsänderungen oder zusätzliche "
    "Leistungen, die vom ursprünglichen Vertrag abweichen. Ein "
    "sauberes Nachtragsmanagement schützt beide Vertragsparteien vor "
    "unnötigen Streitigkeiten.",
    points=[
        "Voraussetzungen eines berechtigten Nachtrags nach VOB/B "
        "(Leistungsänderung, rechtzeitige Anzeige)",
        "Nachtragsangebot prüfen: Mehr-/Minderkosten, Fristauswirkungen",
        "Schriftliche Dokumentation und Anzeige vor Ausführung",
        "Verhandlung und einvernehmliche Regelung mit dem Auftragnehmer",
    ])

# 12
chapter(12, "Mängelmanagement, Abnahme und Gewährleistung",
    "Die Abnahme markiert den rechtlichen Übergang der Bauleistung an "
    "den Auftraggeber und den Beginn der Gewährleistungsfrist. Bis "
    "dahin festgestellte wie auch spätere Mängel sind systematisch zu "
    "erfassen und zu verfolgen.",
    points=[
        "Ablauf der förmlichen Abnahme und Abnahmeprotokoll",
        "Mängelfeststellung, Dokumentation und schriftliche Mängelanzeige "
        "mit Fristsetzung",
        "Nachbesserung durch den Auftragnehmer, ggf. Ersatzvornahme",
        "Gewährleistungsfristen nach BGB und VOB/B im Vergleich",
    ])

# 13
chapter(13, "Personalführung, Kommunikation und Dokumentation",
    "Neben fachlichem Wissen ist die Fachbauleitung auf klare "
    "Kommunikation und strukturierte Dokumentation angewiesen, um alle "
    "Baubeteiligten zu koordinieren und Entscheidungen nachvollziehbar "
    "zu machen.",
    points=[
        "Baubesprechungen vorbereiten, leiten und protokollieren",
        "Klare, situationsgerechte Kommunikation mit Gewerken, Bauherrn "
        "und Behörden",
        "Bautagebuch: Inhalt, Führung und Beweiswert",
        "Aufmaß, Bautenstandsberichte und Fotodokumentation",
    ])

# 14
chapter(14, "Lernkontrolle und Prüfungsvorbereitung",
    "Der Lehrgang schließt mit einer schriftlichen Lernerfolgskontrolle "
    "ab. Die fünf Prüfungsfragen orientieren sich unmittelbar an den in "
    "diesem Handbuch behandelten Themen und werden in einem separaten "
    "Dokument „Prüfungsfragen“ zur Verfügung gestellt.",
    points=[
        "Wiederholen Sie vor der Prüfung die Kapitel VOB, "
        "Bauablaufplanung und Arbeitssicherheit",
        "Nutzen Sie die Fallstudien aus dem Unterricht zur Selbstkontrolle",
        "Bei Fragen wenden Sie sich jederzeit an Ihre Dozentin bzw. "
        "Ihren Dozenten",
    ])

# 15 Glossar
story.extend(A.chapter_heading("15. Glossar", kicker="KAPITEL 15"))
story.append(Spacer(1, 0.25 * cm))
glossary = [
    ("VOB", "Vergabe- und Vertragsordnung für Bauleistungen, gegliedert "
     "in die Teile A (Vergabe), B (Vertragsbedingungen) und C "
     "(Technische Vertragsbedingungen)."),
    ("SiGeKo", "Sicherheits- und Gesundheitsschutzkoordinator; "
     "koordiniert den Arbeitsschutz bei Baustellen mit mehreren "
     "Arbeitgebern gemäß Baustellenverordnung."),
    ("Nachtrag", "Vertragliche Anpassung bei Leistungsänderungen oder "
     "zusätzlichen Leistungen gegenüber dem ursprünglichen "
     "Bauvertrag."),
    ("Bautagebuch", "Fortlaufende Dokumentation des Baugeschehens "
     "(Wetter, Personal, Geräte, besondere Vorkommnisse) durch die "
     "Bauleitung."),
    ("Abnahme", "Förmliche Billigung der vertragsgemäßen Leistung durch "
     "den Auftraggeber; markiert u. a. den Beginn der "
     "Gewährleistungsfrist."),
]
for term, definition in glossary:
    story.append(Paragraph(f"<b>{term}:</b> {definition}", S["BodyLeft"]))
    story.append(Spacer(1, 0.12 * cm))

story.append(Spacer(1, 0.4 * cm))
story.append(A.InfoBox([
    Paragraph("Bei organisatorischen Fragen wenden Sie sich an die "
              "Kursleitung Ihres Bildungsträgers. Fachliche Fragen zum "
              "Kursinhalt beantwortet Ihnen die Dozentin bzw. der "
              "Dozent gerne im Unterricht.", S["BodyLeft"]),
], label="Kontakt"))

A.build_flowing_document(
    story, os.path.join(OUT_DIR, "Teilnehmerhandbuch.pdf"), A.PAGE_SIZE_PORTRAIT,
    "Teilnehmerhandbuch – Fachbauleiter",
)
print("done")
