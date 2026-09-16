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
        topic="VOB",
        text="Welcher Teil der VOB regelt die Allgemeinen "
             "Vertragsbedingungen für die Ausführung von Bauleistungen "
             "(Rechte und Pflichten zwischen Auftraggeber und "
             "Auftragnehmer)?",
        options=[
            "VOB/B",
            "VOB/A",
            "VOB/C",
            "VOB/D",
        ],
        correct=0,
        explanation="Die VOB/B enthält die Allgemeinen Vertragsbedingungen "
                     "für die Ausführung von Bauleistungen, u. a. zu "
                     "Ausführungsfristen, Behinderung, Abnahme, "
                     "Gewährleistung und Kündigung. Die VOB/A regelt die "
                     "Vergabe, die VOB/C die technischen "
                     "Vertragsbedingungen je Gewerk.",
    ),
    dict(
        kind="open",
        topic="Bauablaufplanung",
        text="Nennen Sie zwei Methoden der Bauablaufplanung und "
             "beschreiben Sie kurz deren jeweiligen Nutzen.",
        lines=4,
        explanation="Beispielsweise: Balkenplan (Gantt-Diagramm) zur "
                     "übersichtlichen Darstellung der Gewerketermine; "
                     "Netzplantechnik zur Ermittlung des kritischen Pfads "
                     "und der Pufferzeiten bei komplexen Bauvorhaben. Zwei "
                     "korrekt benannte Methoden mit passendem Nutzen "
                     "gelten als vollständig richtig beantwortet.",
    ),
    dict(
        kind="mc",
        topic="Arbeitssicherheit",
        text="Wer erstellt gemäß Baustellenverordnung den Sicherheits- "
             "und Gesundheitsschutzplan (SiGe-Plan) bei Baustellen mit "
             "mehreren Arbeitgebern?",
        options=[
            "Der Sicherheits- und Gesundheitsschutzkoordinator (SiGeKo)",
            "Jeder Subunternehmer für sich allein",
            "Ausschließlich der Bauherr persönlich",
            "Die zuständige Bauaufsichtsbehörde",
        ],
        correct=0,
        explanation="Bei Baustellen, auf denen Beschäftigte mehrerer "
                     "Arbeitgeber tätig sind, ist ein Sicherheits- und "
                     "Gesundheitsschutzkoordinator (SiGeKo) zu bestellen, "
                     "der u. a. den SiGe-Plan erstellt bzw. erstellen "
                     "lässt und die Zusammenarbeit der Gewerke "
                     "koordiniert.",
    ),
    dict(
        kind="open",
        topic="Mängelmanagement",
        text="Beschreiben Sie den grundsätzlichen Ablauf von der "
             "Mängelfeststellung bis zur Mängelbeseitigung im Rahmen der "
             "Gewährleistung.",
        lines=5,
        explanation="Erwarteter Ablauf: (1) Mängelfeststellung und "
                     "Dokumentation (z. B. Fotos, Bautagebuch), (2) "
                     "schriftliche Mängelanzeige an den Auftragnehmer mit "
                     "angemessener Fristsetzung zur Nachbesserung, (3) "
                     "Nachbesserung durch den Auftragnehmer innerhalb der "
                     "Frist, (4) bei erfolgloser Fristsetzung ggf. "
                     "Ersatzvornahme durch Dritte auf Kosten des "
                     "Auftragnehmers, (5) Abnahme/Prüfung der "
                     "Nachbesserung.",
    ),
    dict(
        kind="mc",
        topic="Nachtragsmanagement",
        text="Was ist die Grundvoraussetzung für einen berechtigten "
             "Nachtrag nach VOB/B?",
        options=[
            "Eine Leistungsänderung oder zusätzliche Leistung, die vom "
            "ursprünglichen Vertrag abweicht und rechtzeitig angezeigt "
            "wird",
            "Der Auftragnehmer entscheidet allein, ohne vorherige Anzeige",
            "Nachträge sind nach VOB/B grundsätzlich nicht zulässig",
            "Eine mündliche Absprache auf der Baustelle genügt in jedem "
            "Fall",
        ],
        correct=0,
        explanation="Ein Nachtrag setzt voraus, dass die auszuführende "
                     "Leistung vom ursprünglichen Vertrag abweicht "
                     "(Leistungsänderung oder zusätzliche Leistung) und "
                     "dass diese Änderung dem Auftraggeber rechtzeitig, "
                     "in der Regel vor Ausführung, angezeigt wird.",
    ),
]


def build(confidential: bool, out_path: str, doc_title: str):
    story = []
    story.append(Paragraph("Abschlussprüfung – Fachbauleiter", S["DocTitle"]))
    story.append(Paragraph(
        "Weiterbildung zur Fachbauleitung im Bauwesen",
        S["DocSubtitle"]))

    if confidential:
        story.append(Spacer(1, 0.3 * cm))
        story.append(A.InfoBox([
            Paragraph("<b>VERTRAULICH – NUR FÜR DOZENTINNEN UND DOZENTEN</b>",
                      S["Confidential"]),
        ], fill=A.CONFIDENTIAL_RED, border=A.GOLD, pad=0.28 * cm))
        story.append(Spacer(1, 0.15 * cm))
        story.append(Paragraph(
            "Dieses Dokument enthält die Musterlösungen zu den 5 "
            "Prüfungsfragen der Weiterbildung Fachbauleiter. Es dient "
            "ausschließlich der internen Verwendung durch die "
            "Dozentinnen und Dozenten und darf nicht an Teilnehmende "
            "weitergegeben werden.", S["Small"]))
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

    A.build_flowing_document(story, out_path, A.PAGE_SIZE_PORTRAIT, doc_title)


build(False, os.path.join(OUT_DIR, "Pruefungsfragen.pdf"),
      "Prüfungsfragen – Fachbauleiter")
build(True, os.path.join(OUT_DIR, "Pruefungsfragen_Loesungen_Dozenten.pdf"),
      "Prüfungsfragen mit Lösungen – nur für Dozenten")
print("done")
