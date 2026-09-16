#!/usr/bin/env python3
import sys
import os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "output")
from types import SimpleNamespace
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib.units import cm
from reportlab.lib import colors
import akademie_style as A

PAGE_W, PAGE_H = A.PAGE_SIZE_LANDSCAPE
hf = A.header_footer_landscape("Schulungsfolien – Fachkurs Ausbau")
fake_doc = SimpleNamespace(pagesize=A.PAGE_SIZE_LANDSCAPE)

c = pdfcanvas.Canvas(os.path.join(OUT_DIR, "Schulungsfolien.pdf"),
                      pagesize=A.PAGE_SIZE_LANDSCAPE)
c.setTitle("Schulungsfolien – Fachkurs Ausbau")
c.setAuthor("M&C Akademie")

CONTENT_TOP = PAGE_H - A.get_content_top_offset(landscape_mode=True)
MARGIN_X = 1.7 * cm


def new_slide():
    hf(c, fake_doc)


def slide_title_banner(kicker, title, subtitle=None):
    w = PAGE_W - 2 * MARGIN_X
    h = 2.0 * cm if not subtitle else 2.5 * cm
    x = MARGIN_X
    y = CONTENT_TOP - h
    A.draw_gradient_rect(c, x, y, w, h, A.NAVY_LIGHT, A.NAVY, radius=6)
    A.draw_gloss_highlight(c, x, y, w, h, radius=6)
    c.saveState()
    c.setStrokeColor(A.GOLD)
    c.setLineWidth(1.2)
    c.roundRect(x + 0.06 * cm, y + 0.06 * cm, w - 0.12 * cm, h - 0.12 * cm, 6,
                stroke=1, fill=0)
    c.setFillColor(A.GOLD)
    c.rect(x, y, 0.2 * cm, h, stroke=0, fill=1)
    c.restoreState()
    tx = x + 0.6 * cm
    if kicker:
        c.setFont(A.FONT_BOLD, 10)
        c.setFillColor(A.GOLD_LIGHT)
        c.drawString(tx, y + h - 0.55 * cm, kicker.upper())
    c.setFont(A.FONT_BOLD, 22)
    c.setFillColor(colors.white)
    ty = y + h - 1.25 * cm if kicker else y + h / 2 + 6
    c.drawString(tx, ty, title)
    if subtitle:
        c.setFont(A.FONT_REGULAR, 12)
        c.setFillColor(A.GOLD_LIGHT)
        c.drawString(tx, y + 0.35 * cm, subtitle)
    return y  # bottom of banner


def bullets(items, top_y, font_size=13.5, leading=0.95 * cm, bold_lead=None):
    y = top_y - 0.9 * cm
    x = MARGIN_X + 0.3 * cm
    max_w = PAGE_W - 2 * MARGIN_X - 1.1 * cm
    for it in items:
        c.setFillColor(A.GOLD_DARK)
        c.circle(x + 0.08 * cm, y + 0.14 * cm, 0.09 * cm, stroke=0, fill=1)
        c.setFont(A.FONT_REGULAR, font_size)
        c.setFillColor(A.INK)
        lines = wrap_text(it, A.FONT_REGULAR, font_size, max_w)
        for j, line in enumerate(lines):
            c.drawString(x + 0.45 * cm, y - j * (font_size * 1.15), line)
        y -= leading + (len(lines) - 1) * (font_size * 1.15)
    return y


def wrap_text(text, font, size, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if c.stringWidth(trial, font, size) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def footer_note(text):
    c.setFont(A.FONT_ITALIC, 9.5)
    c.setFillColor(A.GOLD_DARK)
    c.drawString(MARGIN_X + 0.3 * cm, 2.35 * cm, text)


# ---------- Slide 1: Titel ----------
new_slide()
c.setFont(A.FONT_BOLD, 30)
c.setFillColor(A.NAVY)
c.drawCentredString(PAGE_W / 2, CONTENT_TOP - 2.6 * cm, "Fachkurs Ausbau")
c.setFont(A.FONT_ITALIC, 15)
c.setFillColor(A.GOLD_DARK)
c.drawCentredString(PAGE_W / 2, CONTENT_TOP - 3.5 * cm,
                     "Grundlagen und praxisorientierte Techniken im Innenausbau")
c.setFont(A.FONT_BOLD, 12)
c.setFillColor(A.NAVY_MID)
c.drawCentredString(PAGE_W / 2, CONTENT_TOP - 4.6 * cm,
                     "Erstellt von Matthias Gornik & Athanasios Matziouridis")
c.setFont(A.FONT_REGULAR, 11)
c.setFillColor(colors.Color(0.35, 0.35, 0.4))
c.drawCentredString(PAGE_W / 2, CONTENT_TOP - 5.6 * cm,
                     "8 Wochen  •  320 Unterrichtseinheiten  •  "
                     "Mo–Fr 08:00–15:00 Uhr")
c.showPage()

# ---------- Slide 2: Kursüberblick ----------
new_slide()
b = slide_title_banner("Kursüberblick", "Ziele, Zielgruppe & Rahmendaten")
bullets([
    "Ziel: selbstständige, fachgerechte Ausführung einfacher Ausbauarbeiten",
    "Zielgruppe: Einsteiger, Quereinsteiger, Auszubildende, Hilfskräfte im "
    "Bauwesen",
    "Schwerpunkte: Trockenbau, Boden- und Wandgestaltung, Montage/Installation",
    "Abschluss: Teilnahmebescheinigung oder Zertifikat",
    "Material: Skript, Arbeitsblätter, Übungsmaterial, PSA, digitale Medien",
], b)
c.showPage()

topics = [
    ("Grundlagen des Innenausbaus", [
        "Überblick über Berufsbild und Tätigkeitsfelder im Ausbaugewerbe",
        "Werkzeug- und Materialübersicht als Basis für alle Folgemodule",
        "Verknüpfung von Theorie und praktischer Anwendung",
    ]),
    ("Materialkunde", [
        "Gipskarton (GK) in verschiedenen Sonderausführungen",
        "Holz und Holzwerkstoffe für Unterkonstruktion und Verkleidung",
        "Dämmstoffe für Wärme- und Schallschutz",
        "CW-/UW-Profile für Ständerwände",
    ]),
    ("Mess- und Anreißtechniken", [
        "Zollstock, Bandmaß, Laser-Entfernungsmesser",
        "Wasserwaage und Laser-Kreuzlinie",
        "Schlagschnur, Winkel, Streichmaß",
        "Grundsatz: erst kontrollieren, dann anreißen",
    ]),
    ("Trockenbaukonstruktionen", [
        "Wände: UW-/CW-Profile setzen, ausrichten, beplanken",
        "Decken: abgehängte Konstruktionen und Verkleidungen",
        "Dämmung und Installationsebene vor der Beplankung einbringen",
    ]),
    ("Spachtel- und Schleiftechniken", [
        "Fugenbewehrung mit Bandage/Fugendeckstreifen",
        "Mehrlagiger Spachtelaufbau (Füll-, Zwischen-, Feinspachtel)",
        "Trocknungszeiten einhalten, staubarmer Zwischen-/Endschliff",
    ]),
    ("Bodenaufbau und Bodenverlegung", [
        "Schichtaufbau: Rohdecke, Trittschalldämmung, Randdämmstreifen, Belag",
        "Kontrolle von Ebenheit und Feuchtigkeit vor Verlegung",
        "Schwimmende Verlegung mit Klick-System, Dehnungsfugen beachten",
    ]),
    ("Montage von Bauelementen", [
        "Zargen lotrecht und fluchtgerecht ausrichten",
        "Türblätter einhängen und Funktion prüfen",
        "Sockel- und Zierleisten passgenau zuschneiden und montieren",
    ]),
    ("Arbeitssicherheit und Unfallverhütung", [
        "Persönliche Schutzausrüstung (PSA) konsequent nutzen",
        "Sicherheitsunterweisung vor jedem neuen Werkzeugeinsatz",
        "Flucht- und Rettungswege auf der Übungsbaustelle freihalten",
    ]),
    ("Werkzeugkunde und richtige Handhabung", [
        "Hand- und Elektrowerkzeuge sicher einsetzen",
        "Regelmäßige Kontrolle auf Beschädigungen",
        "Sachgerechte Lagerung und Pflege des Werkzeugs",
    ]),
    ("Praktische Übungen und Projektarbeit", [
        "Wöchentliche Praxisblöcke im Anschluss an die Theorie",
        "Individuelles Feedback zu jeder Übung",
        "Abschlussprojekt: Trockenbauwand mit Tür, Spachtelung, Bodenanschluss",
    ]),
]

for i, (title, items) in enumerate(topics, start=1):
    new_slide()
    b = slide_title_banner(f"Inhalt {i}/10", title)
    bullets(items, b)
    c.showPage()

# ---------- Vorletzte Folie: Prüfung ----------
new_slide()
b = slide_title_banner("Abschluss", "Prüfung und Zertifizierung")
bullets([
    "Schriftliche Lernerfolgskontrolle mit 5 Prüfungsfragen",
    "Empfohlene Bearbeitungszeit: 45 Minuten",
    "Themen orientieren sich an allen behandelten Kursinhalten",
    "Bei Bestehen: Teilnahmebescheinigung oder Zertifikat",
], b)
c.showPage()

# ---------- Letzte Folie: Dank ----------
new_slide()
c.setFont(A.FONT_BOLD, 26)
c.setFillColor(A.NAVY)
c.drawCentredString(PAGE_W / 2, CONTENT_TOP - 2.8 * cm, "Vielen Dank für Ihre Teilnahme!")
c.setFont(A.FONT_REGULAR, 13)
c.setFillColor(A.NAVY_MID)
c.drawCentredString(PAGE_W / 2, CONTENT_TOP - 3.9 * cm,
                     "Matthias Gornik & Athanasios Matziouridis")
c.setFont(A.FONT_ITALIC, 11)
c.setFillColor(colors.Color(0.35, 0.35, 0.4))
c.drawCentredString(PAGE_W / 2, CONTENT_TOP - 4.6 * cm, "M&C Akademie – Fachkurs Ausbau")
c.showPage()

c.save()
print("done")
