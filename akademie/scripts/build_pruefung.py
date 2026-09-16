#!/usr/bin/env python3
import sys, os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "output")
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Flowable, KeepTogether
)
from reportlab.lib.units import cm
from reportlab.lib import colors
import akademie_style as A

styles = A.get_styles()
S = styles


class AnswerLines(Flowable):
    """Zeichnet n leere Antwortlinien (fuer die Teilnehmerversion)."""

    def __init__(self, n=3, width=None, gap=0.75 * cm):
        super().__init__()
        self.n = n
        self.width = width
        self.gap = gap

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return self.width, self.gap * self.n

    def draw(self):
        c = self.canv
        c.setStrokeColor(colors.Color(0.6, 0.6, 0.65))
        c.setLineWidth(0.6)
        y = self.gap * self.n - self.gap * 0.5
        for _ in range(self.n):
            c.line(0, y, self.width, y)
            y -= self.gap


QUESTIONS = [
    dict(
        kind="mc",
        topic="Materialkunde",
        text="Welches Material wird typischerweise zur Beplankung von "
             "nichttragenden Trockenbau-Ständerwänden verwendet?",
        options=[
            "Gipskartonplatten",
            "Fliesen",
            "Betonfertigteile",
            "Glasscheiben",
        ],
        correct=0,
        explanation="Gipskartonplatten (GK) sind der Standardwerkstoff zur "
                     "Beplankung von Trockenbau-Ständerwänden. Je nach "
                     "Anforderung kommen Sonderausführungen (z. B. "
                     "feuchtraum-, feuer- oder schallschutzhemmend) zum "
                     "Einsatz.",
    ),
    dict(
        kind="open",
        topic="Mess- und Anreißtechniken",
        text="Nennen Sie zwei Werkzeuge für Mess- und Anreißarbeiten im "
             "Trockenbau und beschreiben Sie kurz deren jeweiligen "
             "Einsatzzweck.",
        lines=4,
        explanation="Beispielsweise: Wasserwaage/Laser-Kreuzlinie zum "
                     "Übertragen horizontaler und vertikaler Bezugslinien; "
                     "Schlagschnur zum schnellen Übertragen langer, gerader "
                     "Linien; Zollstock/Bandmaß zur Ermittlung der "
                     "Grundmaße; Winkel/Streichmaß für rechtwinklige "
                     "Anrisse und Zuschnitte. Zwei korrekt benannte "
                     "Werkzeuge mit passendem Einsatzzweck gelten als "
                     "vollständig richtig beantwortet.",
    ),
    dict(
        kind="mc",
        topic="Arbeitssicherheit",
        text="Welche persönliche Schutzausrüstung (PSA) ist bei Spachtel- "
             "und Schleifarbeiten im Innenausbau mindestens erforderlich?",
        options=[
            "Schutzbrille und Staubmaske (mindestens FFP2)",
            "Ausschließlich Arbeitshandschuhe",
            "Sicherheitsschuhe allein genügen",
            "Bei kurzen Arbeiten ist keine PSA notwendig",
        ],
        correct=0,
        explanation="Bei Spachtel- und insbesondere Schleifarbeiten "
                     "entsteht feiner Gipsstaub. Erforderlich sind daher "
                     "mindestens Schutzbrille und eine Staubmaske der "
                     "Klasse FFP2, ergänzt um die übrige Basis-PSA "
                     "(Sicherheitsschuhe, ggf. Handschuhe).",
    ),
    dict(
        kind="open",
        topic="Trockenbaukonstruktionen",
        text="Beschreiben Sie den grundsätzlichen Aufbau einer "
             "nichttragenden Trockenbau-Ständerwand – von der "
             "Unterkonstruktion bis zur fertigen Oberfläche.",
        lines=5,
        explanation="Erwarteter Ablauf: (1) UW-Profile lotrecht/fluchtgerecht "
                     "an Boden und Decke anlegen und befestigen, (2) "
                     "CW-Ständerprofile im vorgeschriebenen Raster setzen "
                     "und ausrichten, (3) Dämmung und Installationsebene "
                     "einbringen, (4) Beplankung mit Gipskartonplatten mit "
                     "versetzten Stoßfugen, (5) Verspachteln der Fugen "
                     "(Bandage, mehrlagiger Spachtelaufbau) und "
                     "Zwischen-/Endschliff, (6) ggf. Oberflächenbehandlung.",
    ),
    dict(
        kind="mc",
        topic="Bodenverlegung",
        text="Was ist beim Verlegen eines schwimmenden Laminat- oder "
             "Vinylbodens unbedingt zu beachten?",
        options=[
            "Ausreichende Dehnungsfugen an Wänden und Übergängen einplanen",
            "Der Boden wird vollflächig fest mit dem Untergrund verklebt",
            "Eine Trittschalldämmung ist grundsätzlich nicht erforderlich",
            "Der Untergrund muss nicht auf Ebenheit geprüft werden",
        ],
        correct=0,
        explanation="Schwimmend verlegte Böden benötigen Bewegungsspielraum: "
                     "An Wänden und Übergängen sind Dehnungsfugen "
                     "einzuplanen, damit der Belag bei Temperatur- und "
                     "Feuchteschwankungen arbeiten kann. Untergrundebenheit "
                     "und Trittschalldämmung sind zusätzlich zwingend zu "
                     "prüfen bzw. einzubauen.",
    ),
]


def build(confidential: bool, out_path: str, doc_title: str):
    story = []
    story.append(Paragraph("Abschlussprüfung – Fachkurs Ausbau", S["DocTitle"]))
    story.append(Paragraph(
        "Grundlagen und praxisorientierte Techniken im Innenausbau",
        S["DocSubtitle"]))
    story.append(Paragraph("Erstellt von Matthias Gornik &amp; Athanasios Matziouridis",
                            S["Authors"]))

    if confidential:
        story.append(Spacer(1, 0.3 * cm))
        story.append(A.InfoBox([
            Paragraph("<b>VERTRAULICH – NUR FÜR DOZENTINNEN UND DOZENTEN</b>",
                      S["Confidential"]),
        ], fill=A.CONFIDENTIAL_RED, border=A.GOLD, pad=0.28 * cm))
        story.append(Spacer(1, 0.15 * cm))
        story.append(Paragraph(
            "Dieses Dokument enthält die Musterlösungen zu den 5 "
            "Prüfungsfragen des Fachkurses Ausbau. Es dient ausschließlich "
            "der internen Verwendung durch die Dozentinnen und Dozenten und "
            "darf nicht an Teilnehmende weitergegeben werden.", S["Small"]))
    else:
        story.append(Spacer(1, 0.15 * cm))
        story.append(Paragraph("Prüfungsfragen für Teilnehmerinnen und "
                                "Teilnehmer", S["Small"]))

    story.append(Spacer(1, 0.4 * cm))
    story.append(A.InfoBox([
        Paragraph(t, S["BodyLeft"]) for t in [
            "Bearbeitungszeit: 45 Minuten",
            "Anzahl der Fragen: 5 (Multiple-Choice- und offene Fragen)",
            "Bei Multiple-Choice-Fragen ist jeweils eine Antwort korrekt.",
            "Bitte alle Antworten gut leserlich eintragen.",
        ]
    ], label="Hinweise zur Prüfung"))
    story.append(Spacer(1, 0.5 * cm))

    for i, q in enumerate(QUESTIONS, start=1):
        block = []
        block.append(Paragraph(f"Frage {i} &ndash; {q['topic']}", S["QuestionNum"]))
        block.append(Spacer(1, 0.12 * cm))
        block.append(Paragraph(q["text"], S["BodyLeft"]))
        block.append(Spacer(1, 0.2 * cm))
        if q["kind"] == "mc":
            letters = "ABCD"
            for j, opt in enumerate(q["options"]):
                line = f"<b>{letters[j]})</b> {opt}"
                if confidential and j == q["correct"]:
                    line += '  <font color="#8c6414"><b>&#9679; richtige Antwort</b></font>'
                block.append(Paragraph(line, S["BodyLeft"]))
                block.append(Spacer(1, 0.06 * cm))
        else:
            if confidential:
                pass
            else:
                block.append(AnswerLines(n=q["lines"]))
        if confidential:
            block.append(Spacer(1, 0.18 * cm))
            block.append(A.InfoBox([
                Paragraph(q["explanation"], S["BodyLeft"]),
            ], label="Lösung / Musterantwort", fill=colors.Color(0.94, 0.98, 0.94),
               border=colors.Color(0.25, 0.55, 0.25)))
        block.append(Spacer(1, 0.55 * cm))
        story.append(KeepTogether(block))

    doc = SimpleDocTemplate(
        out_path, pagesize=A.PAGE_SIZE_PORTRAIT,
        topMargin=A.get_content_top_offset(), bottomMargin=2 * cm,
        leftMargin=1.9 * cm, rightMargin=1.9 * cm,
        title=doc_title, author="M&C Akademie",
    )
    hf = A.header_footer_portrait(doc_title)
    doc.build(story, onFirstPage=hf, onLaterPages=hf)


build(False, os.path.join(OUT_DIR, "Pruefungsfragen.pdf"),
      "Prüfungsfragen – Fachkurs Ausbau")
build(True, os.path.join(OUT_DIR, "Pruefungsfragen_Loesungen_Dozenten.pdf"),
      "Prüfungsfragen mit Lösungen – nur für Dozenten")
print("done")
