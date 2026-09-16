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
hf_first = A.header_footer_landscape("Schulungsfolien – Fachbauleiter", show_logo=True)
hf_later = A.header_footer_landscape("Schulungsfolien – Fachbauleiter", show_logo=False)
fake_doc = SimpleNamespace(pagesize=A.PAGE_SIZE_LANDSCAPE)

c = pdfcanvas.Canvas(os.path.join(OUT_DIR, "Schulungsfolien.pdf"),
                      pagesize=A.PAGE_SIZE_LANDSCAPE)
c.setTitle("Schulungsfolien – Fachbauleiter")
c.setAuthor("M&C Akademie")

CONTENT_TOP_FIRST = PAGE_H - A.get_content_top_offset(landscape_mode=True, show_logo=True)
CONTENT_TOP_LATER = PAGE_H - A.get_content_top_offset(landscape_mode=True, show_logo=False)
CONTENT_TOP = CONTENT_TOP_FIRST
MARGIN_X = 1.7 * cm

_slide_count = [0]


def new_slide():
    # Logo erscheint nur auf der allerersten Folie; Folgefolien nutzen einen
    # kompakteren Kopfbereich mit mehr Platz fuer Inhalt.
    global CONTENT_TOP
    _slide_count[0] += 1
    if _slide_count[0] == 1:
        hf_first(c, fake_doc)
        CONTENT_TOP = CONTENT_TOP_FIRST
    else:
        hf_later(c, fake_doc)
        CONTENT_TOP = CONTENT_TOP_LATER


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
    c.setFont(A.FONT_BOLD, 21)
    c.setFillColor(colors.white)
    ty = y + h - 1.22 * cm if kicker else y + h / 2 + 6
    c.drawString(tx, ty, title)
    if subtitle:
        c.setFont(A.FONT_REGULAR, 12)
        c.setFillColor(A.GOLD_LIGHT)
        c.drawString(tx, y + 0.35 * cm, subtitle)

    attrib_h = 0.55 * cm
    attrib_y = y - 0.16 * cm - attrib_h
    A.draw_attribution_bar(c, x, attrib_y, w, attrib_h)
    return attrib_y  # bottom of banner + Logo-Chip


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


def intro_paragraph(text, top_y, font_size=11.5, leading=15.5):
    x = MARGIN_X + 0.3 * cm
    max_w = PAGE_W - 2 * MARGIN_X - 0.6 * cm
    c.setFont(A.FONT_ITALIC, font_size)
    c.setFillColor(A.NAVY_MID)
    lines = wrap_text(text, A.FONT_ITALIC, font_size, max_w)
    y = top_y - 0.55 * cm
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y - 0.15 * cm


def bullets(items, top_y, font_size=12.3, leading=15.2, gap=6.0):
    y = top_y
    x = MARGIN_X + 0.3 * cm
    max_w = PAGE_W - 2 * MARGIN_X - 1.1 * cm
    for it in items:
        c.setFillColor(A.GOLD_DARK)
        c.circle(x + 0.08 * cm, y - 3.5, 0.085 * cm, stroke=0, fill=1)
        c.setFont(A.FONT_REGULAR, font_size)
        c.setFillColor(A.INK)
        lines = wrap_text(it, A.FONT_REGULAR, font_size, max_w)
        for j, line in enumerate(lines):
            c.drawString(x + 0.45 * cm, y - j * leading, line)
        y -= leading * len(lines) + gap
    return y


def topic_slide(idx_label, title, intro, items, subtitle=None):
    new_slide()
    b = slide_title_banner(idx_label, title, subtitle=subtitle)
    y = intro_paragraph(intro, b)
    bullets(items, y)


def footer_note(text):
    c.setFont(A.FONT_ITALIC, 9.5)
    c.setFillColor(A.GOLD_DARK)
    c.drawString(MARGIN_X + 0.3 * cm, 2.35 * cm, text)


# ---------- Folie 1: Titel ----------
new_slide()
c.setFont(A.FONT_BOLD, 30)
c.setFillColor(A.NAVY)
c.drawCentredString(PAGE_W / 2, CONTENT_TOP - 2.6 * cm, "Fachbauleiter")
c.setFont(A.FONT_ITALIC, 15)
c.setFillColor(A.GOLD_DARK)
c.drawCentredString(PAGE_W / 2, CONTENT_TOP - 3.5 * cm,
                     "Weiterbildung zur Fachbauleitung im Bauwesen")
c.setFont(A.FONT_REGULAR, 11)
c.setFillColor(colors.Color(0.35, 0.35, 0.4))
c.drawCentredString(PAGE_W / 2, CONTENT_TOP - 4.6 * cm,
                     "6 Tage  •  48 Unterrichtseinheiten  •  "
                     "08:00–16:00 Uhr")
c.showPage()

# ---------- Folie 2: Kursüberblick ----------
new_slide()
b = slide_title_banner("Kursüberblick", "Ziele, Zielgruppe & Rahmendaten")
y = intro_paragraph(
    "Die Weiterbildung Fachbauleiter vermittelt das fachliche, rechtliche "
    "und organisatorische Rüstzeug für die eigenverantwortliche Leitung "
    "und Überwachung von Bauvorhaben. Theorie wird durchgehend mit "
    "praxisnahen Beispielen und Fallstudien aus dem Baualltag verknüpft.",
    b)
bullets([
    "Ziel: eigenständige fachliche, rechtliche, terminliche und "
    "wirtschaftliche Leitung von Bauvorhaben",
    "Zielgruppe: Poliere, Meister, Techniker, Bauingenieure und "
    "erfahrene Facharbeiter",
    "Dauer: 6 Tage (48 UE), 08:00–16:00 Uhr",
    "Abschluss: Teilnahmebescheinigung oder Zertifikat „Geprüfter "
    "Fachbauleiter“",
    "Unterrichtsmaterial: Skript, VOB-Auszüge, Fallstudien, Vorlagen, "
    "digitale Medien",
], y)
c.showPage()

topics = [
    ("Thema 1/13", "Grundlagen der Bauleitung und Fachbauleitung", None,
     "Die Fachbauleitung verantwortet die fachgerechte, termingerechte "
     "und wirtschaftliche Ausführung eines Bauvorhabens oder einzelner "
     "Gewerke vor Ort. Sie ist die zentrale Schnittstelle zwischen "
     "Bauherrn, Planern, ausführenden Firmen und Behörden.", [
        "Abgrenzung zwischen Objektüberwachung, örtlicher Bauleitung und "
        "Fachbauleitung einzelner Gewerke",
        "Kernaufgaben: Koordination der Gewerke, Überwachung der "
        "Ausführung, Termin- und Kostenkontrolle",
        "Verantwortung für die Einhaltung der anerkannten Regeln der "
        "Technik und geltender Vorschriften",
        "Kommunikation als zentrale Alltagsaufgabe zwischen allen "
        "Baubeteiligten",
        "Dokumentationspflichten von Beginn an mitdenken (Bautagebuch, "
        "Aufmaß, Fotoprotokoll)",
        "Persönliche Voraussetzungen: Fachwissen, Durchsetzungsvermögen, "
        "Organisationsfähigkeit",
    ]),
    ("Thema 2/13", "Baurecht und Genehmigungsverfahren", None,
     "Öffentlich-rechtliche Vorschriften bilden den rechtlichen Rahmen "
     "jedes Bauvorhabens. Ohne fundierte Kenntnis des Baurechts drohen "
     "Verzögerungen, Bußgelder oder sogar ein Baustopp.", [
        "Bauordnungsrecht der Länder als Grundlage für "
        "Genehmigungsverfahren",
        "Ablauf des Bauantragsverfahrens von der Einreichung bis zur "
        "Baugenehmigung",
        "Genehmigungspflichtige und verfahrensfreie Vorhaben "
        "unterscheiden",
        "Nachbarrecht und einzuhaltende Abstandsflächen",
        "Bauüberwachung und Kontrollrechte der Bauaufsichtsbehörde "
        "während der Ausführung",
        "Rechtliche und finanzielle Folgen von Verstößen gegen "
        "öffentlich-rechtliche Vorschriften",
    ]),
    ("Thema 3/13", "Vertragsrecht und VOB – Grundlagen", None,
     "Bauverträge werden entweder nach dem Bauvertragsrecht des BGB oder "
     "– bei entsprechender Vereinbarung – nach der Vergabe- und "
     "Vertragsordnung für Bauleistungen (VOB) abgewickelt.", [
        "BGB-Bauvertragsrecht seit der Bauvertragsrechtsreform 2018 als "
        "gesetzlicher Regelfall",
        "VOB als Vertragsgrundlage nur bei ausdrücklicher Einbeziehung "
        "in den Vertrag wirksam",
        "Aufbau der VOB in drei Teile: VOB/A (Vergabe), VOB/B "
        "(Vertragsbedingungen), VOB/C (Technische Bedingungen)",
        "Wesentliche Unterschiede zwischen BGB und VOB/B u. a. bei "
        "Fristen, Kündigung und Abnahme",
        "Bedeutung einer sorgfältigen Vertragsprüfung vor "
        "Auftragserteilung",
    ]),
    ("Thema 4/13", "Vertragsrecht und VOB – VOB/B im Detail", None,
     "Die VOB/B regelt die Rechtsbeziehungen zwischen Auftraggeber und "
     "Auftragnehmer während der Bauausführung und ist für die tägliche "
     "Praxis der Fachbauleitung von zentraler Bedeutung.", [
        "Ausführungsfristen und Folgen von Fristüberschreitungen",
        "Behinderung und Unterbrechung der Bauausführung korrekt "
        "anzeigen",
        "Abnahme: förmliche, stillschweigende und fiktive Abnahme im "
        "Vergleich",
        "Gewährleistung und Verjährungsfristen nach VOB/B",
        "Kündigungsrechte von Auftraggeber und Auftragnehmer",
        "Zahlungsregelungen: Abschlagszahlungen, Schlusszahlung, "
        "Sicherheitseinbehalt",
    ]),
    ("Thema 5/13", "Ausschreibung, Vergabe und Abrechnung (AVA)", None,
     "AVA bezeichnet den durchgängigen Prozess von der Erstellung des "
     "Leistungsverzeichnisses über die Vergabe bis zur Schlussabrechnung "
     "einer Bauleistung – eine Kernaufgabe jeder Fachbauleitung.", [
        "Leistungsverzeichnis (LV) und eindeutige, erschöpfende "
        "Leistungsbeschreibung erstellen",
        "Angebote einholen sowie rechnerisch und technisch prüfen",
        "Vergabearten im Überblick: öffentliche, beschränkte und "
        "freihändige Vergabe",
        "Zuschlagskriterien: Preis, Qualität, technischer Wert, "
        "Ausführungsfristen",
        "Aufmaß und Abrechnung nach VOB/C bzw. vertraglicher "
        "Vereinbarung",
        "Rechnungsprüfung, Zahlungsfreigabe und Dokumentation der "
        "Abrechnung",
    ]),
    ("Thema 6/13", "Bauablaufplanung und Terminmanagement", None,
     "Eine realistische Terminplanung ist Voraussetzung für einen "
     "reibungslosen Bauablauf. Die Fachbauleitung erstellt, überwacht "
     "und passt den Bauzeitenplan fortlaufend an.", [
        "Balkenplan (Gantt-Diagramm) zur übersichtlichen Terminplanung "
        "der Gewerke",
        "Netzplantechnik zur Ermittlung des kritischen Pfads bei "
        "komplexen Vorhaben",
        "Pufferzeiten und Abhängigkeiten zwischen den Gewerken einplanen",
        "Regelmäßiger Soll-Ist-Abgleich anhand des Bautenstands",
        "Behinderungen und Bauzeitverlängerungen rechtssicher "
        "dokumentieren",
        "Terminnachsteuerung in enger Abstimmung mit allen beteiligten "
        "Firmen",
    ]),
    ("Thema 7/13", "Kalkulation und Kostenkontrolle", None,
     "Neben Terminen und Qualität überwacht die Fachbauleitung auch die "
     "Kosten eines Bauvorhabens. Grundkenntnisse der Baukalkulation "
     "helfen, Kostenrisiken früh zu erkennen.", [
        "Aufbau einer Baukalkulation: Einzelkosten der Teilleistungen, "
        "Gemeinkosten, Zuschläge",
        "Kostenarten unterscheiden: Lohn, Material, Geräte, "
        "Nachunternehmerleistungen",
        "Soll-Ist-Vergleich als laufendes Controlling-Instrument",
        "Kostenauswirkungen von Nachträgen und Mehrmengen frühzeitig "
        "bewerten",
        "Budgetüberschreitungen frühzeitig erkennen und gegensteuern",
        "Regelmäßige Kostenberichte an den Bauherrn",
    ]),
    ("Thema 8/13", "Qualitätsmanagement und Bauüberwachung", None,
     "Die laufende Überwachung der Bauausführung stellt sicher, dass die "
     "vertraglich vereinbarte Qualität und die anerkannten Regeln der "
     "Technik eingehalten werden.", [
        "Kontrolle der Ausführung anhand von Plänen, Leistungsverzeichnis "
        "und Normen",
        "Regelmäßige, dokumentierte Baustellenbegehungen durchführen",
        "Prüfprotokolle als Qualitätsnachweis führen",
        "Umgang mit Abweichungen: Nachbesserung vor Fortsetzung der "
        "Folgegewerke",
        "Schnittstellenkoordination zwischen den Gewerken zur "
        "Vermeidung von Mängeln",
        "Bedeutung der Erstmusterprüfung bei kritischen Bauteilen",
    ]),
    ("Thema 9/13", "Arbeitssicherheit und Gesundheitsschutz", None,
     "Die Fachbauleitung trägt Mitverantwortung für die Sicherheit auf "
     "der Baustelle. Bei mehreren Arbeitgebern greifen zusätzlich die "
     "Vorgaben der Baustellenverordnung.", [
        "Baustellenverordnung: Vorankündigung, SiGe-Plan, Koordinator "
        "(SiGeKo)",
        "Persönliche Schutzausrüstung (PSA) vorschreiben und deren "
        "Nutzung kontrollieren",
        "Verkehrssicherung, Ordnung und Absturzsicherung auf der "
        "Baustelle",
        "Unterweisungspflichten gegenüber allen auf der Baustelle "
        "Tätigen",
        "Dokumentation von Unterweisungen, Unfällen und Beinaheunfällen",
        "Zusammenarbeit mit dem SiGeKo während der gesamten Bauzeit",
    ]),
    ("Thema 10/13", "Nachtragsmanagement", None,
     "Nachträge entstehen durch Leistungsänderungen oder zusätzliche "
     "Leistungen, die vom ursprünglichen Vertrag abweichen. Sauberes "
     "Nachtragsmanagement schützt beide Vertragsparteien.", [
        "Voraussetzungen eines berechtigten Nachtrags nach VOB/B",
        "Rechtzeitige, schriftliche Anzeige vor Ausführung der "
        "geänderten Leistung",
        "Nachtragsangebote prüfen: Mehr-/Minderkosten und "
        "Fristauswirkungen bewerten",
        "Verhandlung und einvernehmliche Regelung mit dem "
        "Auftragnehmer anstreben",
        "Nachträge lückenlos dokumentieren, um spätere Streitigkeiten "
        "zu vermeiden",
        "Auswirkungen von Nachträgen auf den Bauzeitenplan einplanen",
    ]),
    ("Thema 11/13", "Mängelmanagement, Abnahme und Gewährleistung", None,
     "Die Abnahme markiert den rechtlichen Übergang der Bauleistung an "
     "den Auftraggeber und den Beginn der Gewährleistungsfrist.", [
        "Ablauf der förmlichen Abnahme und Erstellung des "
        "Abnahmeprotokolls",
        "Mängelfeststellung, Dokumentation und schriftliche "
        "Mängelanzeige mit Fristsetzung",
        "Nachbesserung durch den Auftragnehmer, ggf. Ersatzvornahme auf "
        "dessen Kosten",
        "Gewährleistungsfristen nach BGB und VOB/B im Vergleich",
        "Umgang mit versteckten Mängeln nach der Abnahme",
        "Sicherheitseinbehalt zur Absicherung von "
        "Gewährleistungsansprüchen",
    ]),
    ("Thema 12/13", "Personalführung und Kommunikation", None,
     "Neben fachlichem Wissen ist die Fachbauleitung auf klare "
     "Kommunikation und Führungskompetenz angewiesen, um alle "
     "Baubeteiligten zu koordinieren.", [
        "Baubesprechungen vorbereiten, leiten und strukturiert "
        "protokollieren",
        "Klare, situationsgerechte Kommunikation mit Gewerken, Bauherrn "
        "und Behörden",
        "Konfliktmanagement bei unterschiedlichen Interessen der "
        "Baubeteiligten",
        "Motivation und Anleitung von Vorarbeitern und Kolonnen",
        "Eskalationswege bei Störungen im Bauablauf kennen und nutzen",
    ]),
    ("Thema 13/13", "Dokumentation auf der Baustelle", None,
     "Eine strukturierte Dokumentation macht Entscheidungen "
     "nachvollziehbar und dient im Streitfall als wichtiger Nachweis.", [
        "Bautagebuch: Inhalt, tägliche Führung und Beweiswert",
        "Aufmaß und Bautenstandsberichte regelmäßig erstellen",
        "Fotodokumentation zur Beweissicherung, besonders vor "
        "Verdeckung von Bauteilen",
        "Schriftverkehr und Anzeigen (Behinderung, Bedenken, "
        "Nachträge) sauber archivieren",
        "Digitale Dokumentationswerkzeuge sinnvoll einsetzen",
    ]),
]

for idx_label, title, subtitle, intro, items in topics:
    topic_slide(idx_label, title, intro, items, subtitle=subtitle)
    c.showPage()

# ---------- Vorletzte Folie: Prüfung ----------
new_slide()
b = slide_title_banner("Abschluss", "Prüfung und Zertifizierung")
y = intro_paragraph(
    "Der Lehrgang schließt mit einer schriftlichen Lernerfolgskontrolle "
    "ab, die alle Themenblöcke der Weiterbildung abdeckt.", b)
bullets([
    "Schriftliche Lernerfolgskontrolle mit 5 Prüfungsfragen",
    "Empfohlene Bearbeitungszeit: 45 Minuten",
    "Themen orientieren sich an allen behandelten Kursinhalten",
    "Bei Bestehen: Teilnahmebescheinigung oder Zertifikat „Geprüfter "
    "Fachbauleiter“",
], y)
c.showPage()

# ---------- Letzte Folie: Dank ----------
new_slide()
c.setFont(A.FONT_BOLD, 26)
c.setFillColor(A.NAVY)
c.drawCentredString(PAGE_W / 2, CONTENT_TOP - 2.8 * cm, "Vielen Dank für Ihre Teilnahme!")
c.setFont(A.FONT_ITALIC, 12)
c.setFillColor(colors.Color(0.35, 0.35, 0.4))
c.drawCentredString(PAGE_W / 2, CONTENT_TOP - 3.9 * cm, "M&C Akademie – Fachbauleiter")
c.showPage()

c.save()
print("done")
