#!/usr/bin/env python3
"""Gemeinsames Layout-/Stil-Modul fuer alle Akademie-PDFs.

Enthaelt: Farbschema, Kopf-/Fusszeile mit Logo (3D/Hochglanz),
fortlaufende Seitennummerierung unten mittig, sowie wiederverwendbare
Flowables (Glanz-Banner fuer Kapitelueberschriften, Info-Boxen).
"""
import os
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.colors import Color
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    Flowable, Paragraph, Spacer, Table, TableStyle, ListFlowable, ListItem,
    KeepTogether,
)
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Das offizielle M&C AKADEMIE Logo (Originalfoto, unbearbeitet) - dauerhaft
# unter akademie/assets/ gespeichert und in allen Dokumenten zu verwenden.
LOGO_PATH = os.path.join(BASE_DIR, "..", "assets", "logo_mc_akademie_original.jpg")
LOGO_ASPECT = 989 / 508.0

# Humanistische Grotesk-Schrift (Work Sans, Open-Sans-/Lato-Stil) statt der
# technisch wirkenden Helvetica-Basisschrift.
FONTS_DIR = os.path.join(BASE_DIR, "..", "assets", "fonts")
FONT_REGULAR = "WorkSans"
FONT_BOLD = "WorkSans-Bold"
FONT_ITALIC = "WorkSans-Italic"
FONT_BOLDITALIC = "WorkSans-BoldItalic"

pdfmetrics.registerFont(TTFont(FONT_REGULAR, os.path.join(FONTS_DIR, "WorkSans-Regular.ttf")))
pdfmetrics.registerFont(TTFont(FONT_BOLD, os.path.join(FONTS_DIR, "WorkSans-Bold.ttf")))
pdfmetrics.registerFont(TTFont(FONT_ITALIC, os.path.join(FONTS_DIR, "WorkSans-Italic.ttf")))
pdfmetrics.registerFont(TTFont(FONT_BOLDITALIC, os.path.join(FONTS_DIR, "WorkSans-BoldItalic.ttf")))
pdfmetrics.registerFontFamily(
    FONT_REGULAR, normal=FONT_REGULAR, bold=FONT_BOLD, italic=FONT_ITALIC,
    boldItalic=FONT_BOLDITALIC,
)

NAVY = Color(11 / 255, 22 / 255, 51 / 255)
NAVY_MID = Color(18 / 255, 40 / 255, 92 / 255)
NAVY_LIGHT = Color(36 / 255, 72 / 255, 150 / 255)
GOLD = Color(201 / 255, 162 / 255, 39 / 255)
GOLD_LIGHT = Color(247 / 255, 220 / 255, 140 / 255)
GOLD_DARK = Color(140 / 255, 100 / 255, 20 / 255)
INK = Color(30 / 255, 30 / 255, 35 / 255)
LIGHT_BG = Color(0.96, 0.97, 0.99)
CONFIDENTIAL_RED = Color(0.60, 0.08, 0.10)

PAGE_SIZE_PORTRAIT = A4
PAGE_SIZE_LANDSCAPE = landscape(A4)


def draw_gradient_rect(c, x, y, w, h, color_top, color_bottom, steps=60, radius=0):
    """Zeichnet ein Rechteck (optional abgerundet) mit vertikalem Farbverlauf."""
    c.saveState()
    if radius:
        p = c.beginPath()
        p.roundRect(x, y, w, h, radius)
        c.clipPath(p, stroke=0, fill=0)
    step_h = h / steps
    for i in range(steps):
        t = i / (steps - 1) if steps > 1 else 0
        r = color_top.red + (color_bottom.red - color_top.red) * t
        g = color_top.green + (color_bottom.green - color_top.green) * t
        b = color_top.blue + (color_bottom.blue - color_top.blue) * t
        c.setFillColor(Color(r, g, b))
        yy = y + h - (i + 1) * step_h
        c.rect(x, yy, w, step_h + 0.6, stroke=0, fill=1)
    c.restoreState()


def draw_gloss_highlight(c, x, y, w, h, radius=0):
    """Halbtransparente Ellipse im oberen Bereich fuer Hochglanz-Effekt."""
    c.saveState()
    if radius:
        p = c.beginPath()
        p.roundRect(x, y, w, h, radius)
        c.clipPath(p, stroke=0, fill=0)
    c.setFillColor(Color(1, 1, 1, alpha=0.16))
    c.ellipse(x - w * 0.05, y + h * 0.45, x + w * 1.05, y + h * 1.35, stroke=0, fill=1)
    c.setFillColor(Color(1, 1, 1, alpha=0.10))
    c.ellipse(x - w * 0.05, y + h * 0.30, x + w * 1.05, y + h * 0.85, stroke=0, fill=1)
    c.restoreState()


class GlossyBanner(Flowable):
    """Glanz-Banner (Navy/Gold-Verlauf mit Hochglanz-Highlight) als Kapitel-Ueberschrift."""

    def __init__(self, text, subtitle=None, width=None, height=1.35 * cm,
                 font_size=15, kicker=None):
        super().__init__()
        self.text = text
        self.subtitle = subtitle
        self.width = width
        self.height = height + (0.55 * cm if subtitle else 0)
        self.font_size = font_size
        self.kicker = kicker

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return self.width, self.height

    def draw(self):
        c = self.canv
        w, h = self.width, self.height
        radius = 5
        draw_gradient_rect(c, 0, 0, w, h, NAVY_LIGHT, NAVY, radius=radius)
        draw_gloss_highlight(c, 0, 0, w, h, radius=radius)
        c.saveState()
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.1)
        c.roundRect(0.6, 0.6, w - 1.2, h - 1.2, radius, stroke=1, fill=0)
        # left gold accent tab
        c.setFillColor(GOLD)
        c.rect(0, 0, 0.18 * cm, h, stroke=0, fill=1)
        c.restoreState()

        text_x = 0.55 * cm
        if self.subtitle:
            top_y = h - 0.55 * cm
        else:
            top_y = h / 2 + self.font_size * 0.32

        if self.kicker:
            c.setFont(FONT_BOLD, 7.5)
            c.setFillColor(GOLD_LIGHT)
            c.drawString(text_x, h - 0.42 * cm, self.kicker.upper())

        # Schriftgroesse automatisch verkleinern, falls der Titel sonst ueber
        # den rechten Rand des Banners hinauslaufen wuerde.
        max_text_w = w - text_x - 0.5 * cm
        fsize = self.font_size
        while fsize > 8 and c.stringWidth(self.text, FONT_BOLD, fsize) > max_text_w:
            fsize -= 0.5

        c.setFont(FONT_BOLD, fsize)
        c.setFillColor(colors.white)
        c.drawString(text_x, top_y if not self.kicker else h - 0.42 * cm - self.font_size * 0.95,
                     self.text)
        if self.subtitle:
            c.setFont(FONT_REGULAR, 9.5)
            c.setFillColor(GOLD_LIGHT)
            c.drawString(text_x, 0.42 * cm, self.subtitle)


class InfoBox(Flowable):
    """Dezente Info-/Hinweisbox mit Gold-Rahmen und leichtem Glanz."""

    def __init__(self, story_flowables, width=None, pad=0.32 * cm, fill=LIGHT_BG,
                 border=GOLD, label=None):
        super().__init__()
        self.flowables = story_flowables
        self.width = width
        self.pad = pad
        self.fill = fill
        self.border = border
        self.label = label
        self._h = None

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        inner_w = self.width - 2 * self.pad
        total_h = self.pad * 2
        if self.label:
            total_h += 0.5 * cm
        for f in self.flowables:
            fw, fh = f.wrap(inner_w, availHeight)
            total_h += fh
        self._h = total_h
        return self.width, self._h

    def draw(self):
        c = self.canv
        w, h = self.width, self._h
        c.saveState()
        c.setFillColor(self.fill)
        c.setStrokeColor(self.border)
        c.setLineWidth(1)
        c.roundRect(0, 0, w, h, 4, stroke=1, fill=1)
        c.setFillColor(self.border)
        c.rect(0, 0, 0.14 * cm, h, stroke=0, fill=1)
        c.restoreState()

        y = h - self.pad
        x = self.pad
        if self.label:
            c.saveState()
            c.setFont(FONT_BOLD, 8.5)
            c.setFillColor(GOLD_DARK)
            c.drawString(x, y - 0.30 * cm, self.label.upper())
            c.restoreState()
            y -= 0.55 * cm
        for f in self.flowables:
            fw, fh = f.wrap(w - 2 * self.pad, y)
            y -= fh
            f.drawOn(c, x, y)


def _header_footer(landscape_mode=False, doc_short_title=""):
    def _draw(c: pdfcanvas.Canvas, doc):
        page_w, page_h = doc.pagesize
        c.saveState()
        # subtle full-width top strip
        draw_gradient_rect(c, 0, page_h - 0.28 * cm, page_w, 0.28 * cm, GOLD, GOLD_DARK)

        logo_w = 6.6 * cm if not landscape_mode else 5.8 * cm
        logo_h = logo_w / LOGO_ASPECT
        logo_x = (page_w - logo_w) / 2
        logo_y = page_h - 0.28 * cm - logo_h - 0.35 * cm

        # Glanz-/Glasplatte hinter dem Logo (3D-Hochglanz-Praesentation)
        plate_pad_x, plate_pad_y = 0.55 * cm, 0.30 * cm
        plate_x = logo_x - plate_pad_x
        plate_y = logo_y - plate_pad_y
        plate_w = logo_w + 2 * plate_pad_x
        plate_h = logo_h + 2 * plate_pad_y
        c.saveState()
        c.setFillColor(Color(0, 0, 0, alpha=0.07))
        c.roundRect(plate_x + 0.06 * cm, plate_y - 0.05 * cm, plate_w, plate_h, 8,
                    stroke=0, fill=1)
        c.restoreState()
        draw_gradient_rect(c, plate_x, plate_y, plate_w, plate_h,
                            Color(0.98, 0.98, 1.0), Color(0.88, 0.89, 0.93), radius=8)
        c.saveState()
        c.setStrokeColor(GOLD)
        c.setLineWidth(0.8)
        c.roundRect(plate_x, plate_y, plate_w, plate_h, 8, stroke=1, fill=0)
        c.restoreState()
        draw_gloss_highlight(c, plate_x, plate_y, plate_w, plate_h, radius=8)

        c.drawImage(LOGO_PATH, logo_x, logo_y, width=logo_w, height=logo_h,
                    mask="auto", preserveAspectRatio=True)

        rule_y = plate_y - 0.22 * cm
        draw_gradient_rect(c, 1.7 * cm, rule_y, page_w - 3.4 * cm, 0.055 * cm,
                            GOLD_DARK, GOLD_LIGHT)

        # footer
        c.setStrokeColor(GOLD)
        c.setLineWidth(0.6)
        c.line(1.7 * cm, 1.35 * cm, page_w - 1.7 * cm, 1.35 * cm)
        c.setFont(FONT_REGULAR, 8.5)
        c.setFillColor(NAVY)
        c.drawCentredString(page_w / 2, 0.95 * cm, f"Seite {c.getPageNumber()}")
        if doc_short_title:
            c.setFont(FONT_REGULAR, 7.5)
            c.setFillColor(Color(0.4, 0.4, 0.45))
            c.drawString(1.7 * cm, 0.95 * cm, doc_short_title)
            c.drawRightString(page_w - 1.7 * cm, 0.95 * cm, "AKADEMIE")
        c.restoreState()
    return _draw


def header_footer_portrait(doc_short_title=""):
    return _header_footer(False, doc_short_title)


def header_footer_landscape(doc_short_title=""):
    return _header_footer(True, doc_short_title)


def get_content_top_offset(landscape_mode=False):
    logo_w = 6.6 * cm if not landscape_mode else 5.8 * cm
    logo_h = logo_w / LOGO_ASPECT
    plate_pad_y = 0.30 * cm
    return 0.28 * cm + plate_pad_y + logo_h + plate_pad_y + 0.22 * cm + 0.35 * cm


def get_styles():
    ss = getSampleStyleSheet()
    styles = {}
    styles["DocTitle"] = ParagraphStyle(
        "DocTitle", parent=ss["Title"], fontName=FONT_BOLD, fontSize=22,
        leading=26, textColor=NAVY, alignment=TA_CENTER, spaceAfter=4,
    )
    styles["DocSubtitle"] = ParagraphStyle(
        "DocSubtitle", parent=ss["Normal"], fontName=FONT_ITALIC, fontSize=11,
        leading=14, textColor=GOLD_DARK, alignment=TA_CENTER, spaceAfter=14,
    )
    styles["Authors"] = ParagraphStyle(
        "Authors", parent=ss["Normal"], fontName=FONT_BOLD, fontSize=10.5,
        leading=13, textColor=NAVY_MID, alignment=TA_CENTER, spaceAfter=6,
    )
    styles["H1"] = ParagraphStyle(
        "H1", parent=ss["Heading1"], fontName=FONT_BOLD, fontSize=14,
        leading=17, textColor=NAVY, spaceBefore=14, spaceAfter=8,
    )
    styles["H2"] = ParagraphStyle(
        "H2", parent=ss["Heading2"], fontName=FONT_BOLD, fontSize=11.5,
        leading=14.5, textColor=NAVY_MID, spaceBefore=10, spaceAfter=6,
    )
    styles["Body"] = ParagraphStyle(
        "Body", parent=ss["Normal"], fontName=FONT_REGULAR, fontSize=10, leading=14.5,
        textColor=INK, alignment=TA_JUSTIFY, spaceAfter=6,
    )
    styles["BodyLeft"] = ParagraphStyle(
        "BodyLeft", parent=styles["Body"], alignment=TA_LEFT,
    )
    styles["Bullet"] = ParagraphStyle(
        "Bullet", parent=styles["Body"], alignment=TA_LEFT, leftIndent=0, spaceAfter=3,
    )
    styles["Small"] = ParagraphStyle(
        "Small", parent=ss["Normal"], fontName=FONT_REGULAR, fontSize=8.5, leading=11,
        textColor=Color(0.35, 0.35, 0.4),
    )
    styles["TableHead"] = ParagraphStyle(
        "TableHead", parent=ss["Normal"], fontName=FONT_BOLD, fontSize=9.5,
        leading=12, textColor=colors.white, alignment=TA_LEFT,
    )
    styles["TableCell"] = ParagraphStyle(
        "TableCell", parent=ss["Normal"], fontName=FONT_REGULAR, fontSize=9,
        leading=12, textColor=INK, alignment=TA_LEFT,
    )
    styles["Confidential"] = ParagraphStyle(
        "Confidential", parent=ss["Normal"], fontName=FONT_BOLD, fontSize=9,
        leading=12, textColor=colors.white, alignment=TA_CENTER,
    )
    styles["QuestionNum"] = ParagraphStyle(
        "QuestionNum", parent=ss["Normal"], fontName=FONT_BOLD, fontSize=12,
        leading=15, textColor=NAVY,
    )
    return styles


def bullet_list(items, style, bullet_char="•", indent=0.55 * cm):
    flows = []
    for it in items:
        flows.append(ListItem(Paragraph(it, style), leftIndent=indent, value=bullet_char))
    return ListFlowable(flows, bulletType="bullet", start=bullet_char,
                         leftIndent=indent, bulletFontName=FONT_BOLD,
                         bulletColor=GOLD_DARK)


def styled_table(data, col_widths, header=True, header_bg=NAVY, alt_row=LIGHT_BG):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    style_cmds = [
        ("BOX", (0, 0), (-1, -1), 0.7, GOLD),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, Color(0.8, 0.8, 0.82)),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        style_cmds.append(("BACKGROUND", (0, 0), (-1, 0), header_bg))
    for r in range(1 if header else 0, len(data)):
        if (r - (1 if header else 0)) % 2 == 1:
            style_cmds.append(("BACKGROUND", (0, r), (-1, r), alt_row))
    t.setStyle(TableStyle(style_cmds))
    return t
