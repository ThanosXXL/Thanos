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
    return A.GlossyBanner(f"{num}. {title}", kicker=f"{kicker_prefix} {num}")

story = []
story.append(Paragraph("Fachkurs Ausbau", S["DocTitle"]))
story.append(Paragraph("Grundlagen und praxisorientierte Techniken im Innenausbau",
                        S["DocSubtitle"]))
story.append(Paragraph("Erstellt von Matthias Gornik &amp; Athanasios Matziouridis",
                        S["Authors"]))
story.append(Spacer(1, 0.5 * cm))

story.append(sec(1, "Überschrift"))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph(
    "Fachkurs Ausbau – Grundlagen und praxisorientierte Techniken im Innenausbau",
    S["Body"]))
story.append(Spacer(1, 0.3 * cm))

story.append(sec(2, "Kursbeschreibung"))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph(
    "Der Kurs vermittelt grundlegende und erweiterte Kenntnisse im Bereich "
    "Ausbauarbeiten. Teilnehmer lernen die wichtigsten Techniken des Innenausbaus "
    "kennen und wenden diese praxisnah an. Der Schwerpunkt liegt auf der "
    "fachgerechten Ausführung von Arbeiten im Trockenbau, Boden- und "
    "Wandgestaltung sowie einfachen Montage- und Installationsarbeiten im "
    "Innenbereich. Theorie und Praxis sind eng miteinander verknüpft, um ein "
    "sicheres und anwendungsorientiertes Arbeiten zu gewährleisten.", S["Body"]))
story.append(Spacer(1, 0.3 * cm))

story.append(sec(3, "Schulungszeitraum"))
story.append(Spacer(1, 0.2 * cm))
story.append(A.bullet_list([
    "Dauer: 8 Wochen (320 Unterrichtseinheiten)",
    "Unterrichtszeiten: Montag bis Freitag, 08:00 Uhr – 15:00 Uhr",
    "Der Zeitraum kann je nach Bildungsträger angepasst werden.",
], S["Bullet"]))
story.append(Spacer(1, 0.3 * cm))

story.append(sec(4, "Seminarziel"))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph(
    "Ziel des Seminars ist es, den Teilnehmern grundlegende handwerkliche "
    "Kompetenzen im Ausbau zu vermitteln. Nach Abschluss sind sie in der Lage, "
    "einfache Ausbauarbeiten selbstständig und fachgerecht auszuführen sowie "
    "typische Materialien und Werkzeuge sicher einzusetzen.", S["Body"]))
story.append(Spacer(1, 0.3 * cm))

story.append(sec(5, "Abschluss"))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph(
    "Teilnahmebescheinigung oder Zertifikat (je nach Kursanbieter und "
    "Prüfungsleistung)", S["Body"]))
story.append(Spacer(1, 0.3 * cm))

story.append(sec(6, "Zielgruppe"))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph("Der Kurs richtet sich an:", S["Body"]))
story.append(A.bullet_list([
    "Einsteiger im Bau- und Ausbaugewerbe",
    "Quereinsteiger ohne oder mit geringen Vorkenntnissen",
    "Auszubildende zur Vorbereitung oder Vertiefung",
    "Hilfskräfte im Bauwesen",
    "Personen mit Interesse an handwerklichen Tätigkeiten im Innenausbau",
], S["Bullet"]))
story.append(Spacer(1, 0.3 * cm))

story.append(sec(7, "Unterrichtsmaterial"))
story.append(Spacer(1, 0.2 * cm))
story.append(A.bullet_list([
    "Skript / Schulungsunterlagen",
    "Praxisbezogene Arbeitsblätter",
    "Werkzeuge und Materialien für Übungen (z. B. Trockenbauplatten, Profile, "
    "Dämmstoffe)",
    "Sicherheitsausrüstung (PSA)",
    "Ggf. digitale Präsentationen und Videos",
], S["Bullet"]))
story.append(Spacer(1, 0.3 * cm))

story.append(sec(8, "Inhalte"))
story.append(Spacer(1, 0.2 * cm))
story.append(A.bullet_list([
    "Grundlagen des Innenausbaus",
    "Materialkunde (Gipskarton, Holz, Dämmstoffe, Profile)",
    "Mess- und Anreißtechniken",
    "Trockenbaukonstruktionen (Wände, Decken, Verkleidungen)",
    "Spachtel- und Schleiftechniken",
    "Bodenaufbau und einfache Bodenverlegung",
    "Montage von Bauelementen (z. B. Türen, Leisten)",
    "Arbeitssicherheit und Unfallverhütung",
    "Werkzeugkunde und richtige Handhabung",
    "Praktische Übungen und Projektarbeit",
], S["Bullet"]))

doc = SimpleDocTemplate(
    os.path.join(OUT_DIR, "Kursbeschreibung.pdf"), pagesize=A.PAGE_SIZE_PORTRAIT,
    topMargin=A.get_content_top_offset(), bottomMargin=2 * cm,
    leftMargin=1.9 * cm, rightMargin=1.9 * cm,
    title="Kursbeschreibung – Fachkurs Ausbau", author="M&C Akademie",
)
hf = A.header_footer_portrait("Kursbeschreibung – Fachkurs Ausbau")
doc.build(story, onFirstPage=hf, onLaterPages=hf)
print("done")
