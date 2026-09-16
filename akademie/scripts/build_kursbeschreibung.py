#!/usr/bin/env python3
import sys, os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "output")
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether
from reportlab.lib.units import cm
import akademie_style as A

styles = A.get_styles()
S = styles

def sec(num, title, kicker_prefix="ABSCHNITT"):
    return A.chapter_heading(f"{num}. {title}", kicker=f"{kicker_prefix} {num}")

story = []
story.append(Paragraph("Fachbauleiter", S["DocTitle"]))
story.append(Paragraph("Weiterbildung zur Fachbauleitung im Bauwesen",
                        S["DocSubtitle"]))
story.append(Spacer(1, 0.5 * cm))

story.extend(sec(1, "Überschrift"))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph(
    "Fachbauleiter – Weiterbildung zur Fachbauleitung im Bauwesen",
    S["Body"]))
story.append(Spacer(1, 0.3 * cm))

story.extend(sec(2, "Kursbeschreibung"))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph(
    "Die Weiterbildung vermittelt das fachliche, rechtliche und "
    "organisatorische Rüstzeug für die eigenverantwortliche Leitung und "
    "Überwachung von Bauvorhaben. Teilnehmer lernen die wesentlichen "
    "Grundlagen der Bauleitung kennen – von Baurecht und VOB über "
    "Ausschreibung, Vergabe und Abrechnung bis hin zu Terminplanung, "
    "Kostenkontrolle, Qualitätssicherung, Arbeitssicherheit und "
    "Nachtragsmanagement. Theorie wird durchgehend mit praxisnahen "
    "Beispielen und Fallstudien aus dem Baualltag verknüpft, damit das "
    "Gelernte unmittelbar auf der Baustelle angewendet werden kann.",
    S["Body"]))
story.append(Spacer(1, 0.3 * cm))

story.extend(sec(3, "Schulungszeitraum"))
story.append(Spacer(1, 0.2 * cm))
story.append(A.bullet_list([
    "Dauer: 6 Tage (48 Unterrichtseinheiten)",
    "Unterrichtszeiten: 08:00 Uhr – 16:00 Uhr",
    "Der Zeitraum kann je nach Bildungsträger angepasst werden.",
], S["Bullet"]))
story.append(Spacer(1, 0.3 * cm))

story.extend(sec(4, "Seminarziel"))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph(
    "Ziel der Weiterbildung ist es, die Teilnehmer zu befähigen, "
    "Bauvorhaben eigenständig fachlich, rechtlich, terminlich und "
    "wirtschaftlich zu leiten und zu überwachen. Nach Abschluss können "
    "sie Bauverträge und VOB-Regelungen sicher anwenden, Bauabläufe "
    "planen und steuern, Kosten kontrollieren, die Qualität der "
    "Ausführung überwachen und Nachträge sowie Mängel sachgerecht "
    "managen.", S["Body"]))
story.append(Spacer(1, 0.3 * cm))

story.extend(sec(5, "Abschluss"))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph(
    "Teilnahmebescheinigung oder Zertifikat „Geprüfter Fachbauleiter“ "
    "(je nach Kursanbieter und Prüfungsleistung)", S["Body"]))
story.append(Spacer(1, 0.3 * cm))

story.extend(sec(6, "Zielgruppe"))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph("Die Weiterbildung richtet sich an:", S["Body"]))
story.append(A.bullet_list([
    "Poliere und Vorarbeiter mit Berufserfahrung auf der Baustelle",
    "Meister und Techniker im Bauwesen",
    "Bauingenieure und Architekten zu Beginn der Bauleitungstätigkeit",
    "Facharbeiter mit einschlägiger Erfahrung, die Bauleitungsaufgaben "
    "übernehmen möchten",
    "Personen mit Interesse an einer Fach- oder Bauleitungsfunktion",
], S["Bullet"]))
story.append(Spacer(1, 0.3 * cm))

story.extend(sec(7, "Unterrichtsmaterial"))
story.append(Spacer(1, 0.2 * cm))
story.append(A.bullet_list([
    "Skript / Schulungsunterlagen",
    "Gesetzestexte und VOB-Auszüge (VOB/A, VOB/B, VOB/C)",
    "Praxisbeispiele und Fallstudien aus dem Baualltag",
    "Vorlagen (z. B. Bautagebuch, Nachtragsformular, Mängelliste)",
    "Ggf. digitale Präsentationen und Videos",
], S["Bullet"]))
story.append(Spacer(1, 0.3 * cm))

story.extend(sec(8, "Inhalte"))
story.append(Spacer(1, 0.2 * cm))
story.append(A.bullet_list([
    "Grundlagen der Bauleitung und Fachbauleitung",
    "Baurecht und Genehmigungsverfahren",
    "Vertragsrecht und VOB (VOB/A, VOB/B, VOB/C)",
    "Ausschreibung, Vergabe und Abrechnung (AVA)",
    "Bauablaufplanung und Terminmanagement",
    "Kalkulation und Kostenkontrolle",
    "Qualitätsmanagement und Bauüberwachung",
    "Arbeitssicherheit und Gesundheitsschutz auf der Baustelle",
    "Nachtragsmanagement",
    "Mängelmanagement, Abnahme und Gewährleistung",
    "Personalführung, Kommunikation und Dokumentation",
], S["Bullet"]))

A.build_flowing_document(
    story, os.path.join(OUT_DIR, "Kursbeschreibung.pdf"), A.PAGE_SIZE_PORTRAIT,
    "Kursbeschreibung – Fachbauleiter",
)
print("done")
