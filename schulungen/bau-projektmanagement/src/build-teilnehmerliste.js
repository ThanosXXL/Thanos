const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const { meta } = require('./content');
const { registerFonts, embedLogo, embedIcon, wrapText } = require('./pdf-lib-common');

const outDir = path.join(__dirname, '..', 'pdf');
fs.mkdirSync(outDir, { recursive: true });

// Landscape A4 in pt
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN_X = 40;
const MARGIN_TOP = 96;
const MARGIN_BOTTOM = 40;

const RED = rgb(0.835, 0.071, 0.122);
const BLACK = rgb(0.1, 0.1, 0.1);
const GREY = rgb(0.4, 0.4, 0.4);
const LIGHT_LINE = rgb(0.85, 0.86, 0.87);
const HEADER_BG = rgb(0.106, 0.106, 0.106);
const ROW_ALT_BG = rgb(0.965, 0.968, 0.972);

const ROWS_PER_PAGE = 16;
const TOTAL_TEILNEHMER_ROWS = 32; // 2 Seiten à 16 Zeilen – bei Bedarf in content.js/hier erhöhen

const TAGE = [1, 2, 3, 4, 5, 6];

// Spaltenbreiten (Summe <= PAGE_W - 2*MARGIN_X)
const COL = {
  nr: 24,
  name: 140,
  firma: 118,
  email: 138,
  tag: 54, // x6 = 324
};

async function build() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Teilnehmerliste – ${meta.titel}`);
  pdfDoc.setAuthor(meta.akademie);
  pdfDoc.setLanguage('de');

  const fonts = await registerFonts(pdfDoc);
  const logoImg = await embedLogo(pdfDoc);
  const groupIcon = await embedIcon(pdfDoc, 'teilnehmer-gruppe');
  const logoDims = logoImg.scale(1);
  const logoDrawWidth = 130;
  const logoDrawHeight = (logoDims.height / logoDims.width) * logoDrawWidth;

  const form = pdfDoc.getForm();
  const pages = [];
  const kicker = 'TEILNEHMERLISTE';

  function addHeader(page) {
    page.drawImage(logoImg, {
      x: (PAGE_W - logoDrawWidth) / 2,
      y: PAGE_H - 24 - logoDrawHeight,
      width: logoDrawWidth,
      height: logoDrawHeight,
    });
    const kw = fonts.bold.widthOfTextAtSize(kicker, 8);
    page.drawText(kicker, {
      x: (PAGE_W - kw) / 2,
      y: PAGE_H - 24 - logoDrawHeight - 11,
      size: 8,
      font: fonts.bold,
      color: GREY,
    });
  }

  function newPage() {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    addHeader(page);
    pages.push(page);
    return page;
  }

  // --- Deckblatt ---
  let page = newPage();
  let y = PAGE_H - MARGIN_TOP - 6;

  const iconDims = groupIcon.scale(1);
  const iconDrawWidth = 130;
  const iconDrawHeight = (iconDims.height / iconDims.width) * iconDrawWidth;
  page.drawImage(groupIcon, { x: (PAGE_W - iconDrawWidth) / 2, y: y - iconDrawHeight, width: iconDrawWidth, height: iconDrawHeight });
  y -= iconDrawHeight + 20;

  const title = 'Teilnehmerliste';
  const titleW = fonts.extrabold.widthOfTextAtSize(title, 24);
  page.drawText(title, { x: (PAGE_W - titleW) / 2, y, size: 24, font: fonts.extrabold, color: BLACK });
  y -= 26;

  const sub = meta.titel;
  const subW = fonts.regular.widthOfTextAtSize(sub, 13);
  page.drawText(sub, { x: (PAGE_W - subW) / 2, y, size: 13, font: fonts.regular, color: rgb(0.3, 0.3, 0.3) });
  y -= 34;

  const introText = 'Formular zum Eintragen aller Teilnehmenden dieser Schulung. Bitte Name, Firma/Unternehmen und E-Mail-Adresse je Person eintragen (direkt am Bildschirm ausfüllbar). Die Spalten „Tag 1" bis „Tag 6" dienen als Unterschriftenfeld für den täglichen Anwesenheitsnachweis und werden handschriftlich ausgefüllt.';
  const introLines = wrapText(introText, fonts.regular, 10.5, 480);
  let iy = y;
  for (const l of introLines) {
    const w = fonts.regular.widthOfTextAtSize(l, 10.5);
    page.drawText(l, { x: (PAGE_W - w) / 2, y: iy, size: 10.5, font: fonts.regular, color: rgb(0.25, 0.25, 0.25) });
    iy -= 14;
  }
  y = iy - 26;

  // Kopfdaten-Formular (ausfüllbar)
  const formFieldsY = y;
  const labelSize = 9.5;
  const fieldW = 220;
  const gapX = 30;
  const startX = (PAGE_W - (fieldW * 3 + gapX * 2)) / 2;
  const kopf = [
    { label: 'Kurstermin (von – bis)', field: 'kurstermin' },
    { label: 'Schulungsort', field: 'ort' },
    { label: 'Dozent/in', field: 'dozent' },
  ];
  kopf.forEach((k, i) => {
    const x = startX + i * (fieldW + gapX);
    page.drawText(k.label, { x, y: formFieldsY, size: labelSize, font: fonts.semibold, color: BLACK });
    const tf = form.createTextField(`kopf_${k.field}`);
    tf.addToPage(page, { x, y: formFieldsY - 26, width: fieldW, height: 20, borderColor: LIGHT_LINE, borderWidth: 1 });
    tf.setFontSize(10);
  });

  page.drawText(`Veranstalter: ${meta.akademie}  ·  Format: ${meta.ort}  ·  Dauer: ${meta.dauerTage} Tage à ${meta.stundenProTag} Std.`, {
    x: startX,
    y: formFieldsY - 56,
    size: 9,
    font: fonts.regular,
    color: GREY,
  });

  // --- Tabellenkopf zeichnen ---
  function drawTableHeader(page, topY) {
    const headerH = 22;
    let x = MARGIN_X;
    page.drawRectangle({ x: MARGIN_X, y: topY - headerH, width: PAGE_W - 2 * MARGIN_X, height: headerH, color: HEADER_BG });
    const cols = [
      { key: 'nr', label: 'Nr.' },
      { key: 'name', label: 'Name, Vorname' },
      { key: 'firma', label: 'Firma / Unternehmen' },
      { key: 'email', label: 'E-Mail-Adresse' },
      ...TAGE.map(t => ({ key: 'tag', label: `Tag ${t}` })),
    ];
    for (const c of cols) {
      const w = COL[c.key];
      const tw = fonts.bold.widthOfTextAtSize(c.label, 8);
      page.drawText(c.label, { x: x + Math.max(4, (w - tw) / 2), y: topY - headerH + 7, size: 8, font: fonts.bold, color: rgb(1, 1, 1) });
      x += w;
    }
    return topY - headerH;
  }

  function drawTableRows(page, topY, startNr, count) {
    let rowTop = topY;
    const rowH = (PAGE_H - MARGIN_BOTTOM - rowTop) / count > 26 ? 26 : (PAGE_H - MARGIN_BOTTOM - rowTop) / count;
    for (let i = 0; i < count; i++) {
      const nr = startNr + i;
      const rowY = rowTop - i * rowH;
      if (i % 2 === 1) {
        page.drawRectangle({ x: MARGIN_X, y: rowY - rowH, width: PAGE_W - 2 * MARGIN_X, height: rowH, color: ROW_ALT_BG });
      }
      let x = MARGIN_X;
      // Nr.
      const nrStr = String(nr);
      const nrW = fonts.regular.widthOfTextAtSize(nrStr, 9);
      page.drawText(nrStr, { x: x + (COL.nr - nrW) / 2, y: rowY - rowH / 2 - 3.5, size: 9, font: fonts.regular, color: GREY });
      x += COL.nr;

      // Fillable: Name, Firma, E-Mail
      const fieldDefs = [
        { key: 'name', width: COL.name },
        { key: 'firma', width: COL.firma },
        { key: 'email', width: COL.email },
      ];
      for (const fd of fieldDefs) {
        const tf = form.createTextField(`${fd.key}_${nr}`);
        tf.addToPage(page, {
          x: x + 3,
          y: rowY - rowH + 3,
          width: fd.width - 6,
          height: rowH - 6,
          borderWidth: 0,
        });
        tf.setFontSize(9.5);
        x += fd.width;
      }

      // Unterschrift Tag 1..6 (nur Linie, handschriftlich auszufüllen)
      for (const _ of TAGE) {
        page.drawLine({
          start: { x: x + 6, y: rowY - rowH + 6 },
          end: { x: x + COL.tag - 6, y: rowY - rowH + 6 },
          thickness: 0.75,
          color: LIGHT_LINE,
        });
        x += COL.tag;
      }

      // Zeilentrennlinie
      page.drawLine({
        start: { x: MARGIN_X, y: rowY - rowH },
        end: { x: PAGE_W - MARGIN_X, y: rowY - rowH },
        thickness: 0.6,
        color: LIGHT_LINE,
      });
      // vertikale Spaltenlinien (dezent)
    }
    // äußerer Rahmen
    page.drawRectangle({
      x: MARGIN_X,
      y: rowTop - count * rowH,
      width: PAGE_W - 2 * MARGIN_X,
      height: count * rowH,
      borderColor: LIGHT_LINE,
      borderWidth: 1,
    });
  }

  let remaining = TOTAL_TEILNEHMER_ROWS;
  let nextNr = 1;
  while (remaining > 0) {
    page = newPage();
    const count = Math.min(ROWS_PER_PAGE, remaining);
    const tableTop = PAGE_H - MARGIN_TOP;
    const afterHeader = drawTableHeader(page, tableTop);
    drawTableRows(page, afterHeader, nextNr, count);
    nextNr += count;
    remaining -= count;
  }

  // --- Fußzeile mit fortlaufender Seitenzahl (unten mittig) ---
  const total = pages.length;
  const dokName = `${meta.titel} — Teilnehmerliste`;
  pages.forEach((p, idx) => {
    const footerText = `${dokName} · Seite ${idx + 1} von ${total}`;
    const w = fonts.regular.widthOfTextAtSize(footerText, 8);
    p.drawText(footerText, {
      x: (PAGE_W - w) / 2,
      y: 18,
      size: 8,
      font: fonts.regular,
      color: GREY,
    });
  });

  const bytes = await pdfDoc.save();
  const outName = 'Teilnehmerliste.pdf';
  fs.writeFileSync(path.join(outDir, outName), bytes);
  console.log('PDF erstellt:', outName);
}

build();
