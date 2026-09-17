const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const { meta, examQuestions } = require('./content');
const { registerFonts, embedLogo, embedIcon, wrapText } = require('./pdf-lib-common');

const outDir = path.join(__dirname, '..', 'pdf');
fs.mkdirSync(outDir, { recursive: true });

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN_X = 56;
const MARGIN_TOP = 130; // space for header/logo
const MARGIN_BOTTOM = 60; // space for footer
const RED = rgb(0.835, 0.071, 0.122);
const BLACK = rgb(0.1, 0.1, 0.1);
const GREY = rgb(0.4, 0.4, 0.4);
const GREEN_BG = rgb(0.92, 0.97, 0.92);
const GREEN_LINE = rgb(0.298, 0.549, 0.29);
const GREEN_TXT = rgb(0.11, 0.23, 0.105);
const LIGHT_LINE = rgb(0.85, 0.86, 0.87);

async function buildExam({ fuerDozenten }) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Prüfungsfragen – ${meta.titel}${fuerDozenten ? ' (Dozentenversion mit Lösungen)' : ''}`);
  pdfDoc.setAuthor(meta.akademie);
  pdfDoc.setLanguage('de');

  const fonts = await registerFonts(pdfDoc);
  const fontRegular = fonts.regular;
  const fontBold = fonts.bold;
  const fontOblique = fonts.italic;

  const logoImg = await embedLogo(pdfDoc);
  const examIcon = await embedIcon(pdfDoc, 'pruefung-klemmbrett');
  const logoDims = logoImg.scale(1);
  const logoDrawWidth = 170;
  const logoDrawHeight = (logoDims.height / logoDims.width) * logoDrawWidth;

  const form = pdfDoc.getForm();
  const pages = [];

  function addHeader(page, kicker) {
    page.drawImage(logoImg, {
      x: (PAGE_W - logoDrawWidth) / 2,
      y: PAGE_H - 34 - logoDrawHeight,
      width: logoDrawWidth,
      height: logoDrawHeight,
    });
    const kickerWidth = fontBold.widthOfTextAtSize(kicker, 8.5);
    page.drawText(kicker, {
      x: (PAGE_W - kickerWidth) / 2,
      y: PAGE_H - 34 - logoDrawHeight - 12,
      size: 8.5,
      font: fontBold,
      color: GREY,
    });
  }

  function newPage(kicker) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    addHeader(page, kicker);
    pages.push(page);
    return page;
  }

  const kickerLabel = (fuerDozenten ? 'PRÜFUNGSFRAGEN — DOZENTENVERSION MIT LÖSUNGEN' : 'PRÜFUNGSFRAGEN');

  // --- Deckblatt ---
  let page = newPage(kickerLabel);
  let y = PAGE_H - MARGIN_TOP - 40;

  const doctypeText = fuerDozenten ? 'DOZENTENVERSION MIT LÖSUNGEN' : 'TEILNEHMERVERSION — ZUM AUSFÜLLEN';
  const doctypeWidth = fontBold.widthOfTextAtSize(doctypeText, 11);
  page.drawRectangle({
    x: (PAGE_W - (doctypeWidth + 28)) / 2,
    y: y - 6,
    width: doctypeWidth + 28,
    height: 24,
    color: RED,
  });
  page.drawText(doctypeText, {
    x: (PAGE_W - doctypeWidth) / 2,
    y: y,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  y -= 30;

  const iconDims = examIcon.scale(1);
  const iconDrawWidth = 64;
  const iconDrawHeight = (iconDims.height / iconDims.width) * iconDrawWidth;
  page.drawImage(examIcon, {
    x: (PAGE_W - iconDrawWidth) / 2,
    y: y - iconDrawHeight,
    width: iconDrawWidth,
    height: iconDrawHeight,
  });
  y -= iconDrawHeight + 22;

  const title = 'Prüfungsfragen';
  const titleWidth = fonts.extrabold.widthOfTextAtSize(title, 26);
  page.drawText(title, { x: (PAGE_W - titleWidth) / 2, y, size: 26, font: fonts.extrabold, color: BLACK });
  y -= 32;

  const subtitle = meta.titel;
  const subtitleWidth = fontRegular.widthOfTextAtSize(subtitle, 15);
  page.drawText(subtitle, { x: (PAGE_W - subtitleWidth) / 2, y, size: 15, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  y -= 50;

  const infoLines = [
    `Veranstalter: ${meta.akademie}`,
    `Anzahl Fragen: ${examQuestions.length}`,
    `Format: Multiple Choice (genau eine richtige Antwort je Frage)`,
    `Bestehensgrenze: mindestens 4 von 5 Fragen richtig`,
  ];
  for (const line of infoLines) {
    const w = fontRegular.widthOfTextAtSize(line, 10.5);
    page.drawText(line, { x: (PAGE_W - w) / 2, y, size: 10.5, font: fontRegular, color: rgb(0.25, 0.25, 0.25) });
    y -= 16;
  }

  y -= 20;
  const introText = fuerDozenten
    ? 'Diese Version enthält die richtigen Lösungen sowie Erläuterungen zu jeder Frage. Sie ist ausschließlich für Dozentinnen und Dozenten der ' + meta.akademie + ' zur Auswertung der Abschlussprüfung bestimmt und darf nicht an Teilnehmende weitergegeben werden.'
    : 'Dieses interaktive PDF-Dokument kann heruntergeladen und direkt am Bildschirm ausgefüllt werden: Klicken Sie bei jeder Frage auf die von Ihnen gewählte Antwortoption (A, B, C oder D). Es ist jeweils genau eine Antwort richtig. Speichern Sie das ausgefüllte Dokument abschließend als Nachweis Ihrer Prüfungsteilnahme.';
  const introLines = wrapText(introText, fontRegular, 10.5, PAGE_W - 2 * MARGIN_X - 40);
  let iy = y;
  for (const l of introLines) {
    const w = fontRegular.widthOfTextAtSize(l, 10.5);
    page.drawText(l, { x: (PAGE_W - w) / 2, y: iy, size: 10.5, font: fontRegular, color: rgb(0.25, 0.25, 0.25) });
    iy -= 15;
  }

  // --- Fragenseiten ---
  page = newPage(kickerLabel);
  y = PAGE_H - MARGIN_TOP;

  const letters = ['A', 'B', 'C', 'D'];
  const contentWidth = PAGE_W - 2 * MARGIN_X;

  for (let qi = 0; qi < examQuestions.length; qi++) {
    const q = examQuestions[qi];

    // Platzbedarf grob abschätzen; bei Bedarf neue Seite
    const questionLines = wrapText(`Frage ${qi + 1}: ${q.frage}`, fontBold, 13, contentWidth);
    let neededHeight = questionLines.length * 17 + 14;
    for (const opt of q.optionen) {
      const optLines = wrapText(opt, fontRegular, 10.5, contentWidth - 60);
      neededHeight += Math.max(optLines.length, 1) * 13 + 14;
    }
    if (fuerDozenten) {
      const explLines = wrapText('Erläuterung: ' + q.erlaeuterung, fontOblique, 9.5, contentWidth - 20);
      neededHeight += explLines.length * 12 + 24;
    }
    if (y - neededHeight < MARGIN_BOTTOM + 20) {
      page = newPage(kickerLabel);
      y = PAGE_H - MARGIN_TOP;
    }

    // Frage
    for (const l of questionLines) {
      page.drawText(l, { x: MARGIN_X, y, size: 13, font: fontBold, color: BLACK });
      y -= 17;
    }
    y -= 6;

    // Optionen
    for (let oi = 0; oi < q.optionen.length; oi++) {
      const letter = letters[oi];
      const isCorrect = fuerDozenten && oi === q.loesungIndex;
      const optLines = wrapText(q.optionen[oi], fontRegular, 10.5, contentWidth - 60);
      const boxHeight = Math.max(optLines.length, 1) * 13 + 10;

      // Rahmen der Option
      page.drawRectangle({
        x: MARGIN_X,
        y: y - boxHeight + 3,
        width: contentWidth,
        height: boxHeight,
        borderColor: isCorrect ? GREEN_LINE : LIGHT_LINE,
        borderWidth: isCorrect ? 1.4 : 1,
        color: isCorrect ? GREEN_BG : rgb(1, 1, 1),
      });

      if (fuerDozenten) {
        // Statischer Buchstaben-Kreis (keine Formularfelder in der Dozentenversion)
        page.drawEllipse({
          x: MARGIN_X + 18,
          y: y - boxHeight / 2 + 3,
          xScale: 9,
          yScale: 9,
          borderColor: isCorrect ? GREEN_LINE : BLACK,
          borderWidth: 1.2,
          color: isCorrect ? GREEN_LINE : rgb(1, 1, 1),
        });
        const letterWidth = fontBold.widthOfTextAtSize(letter, 9);
        page.drawText(letter, {
          x: MARGIN_X + 18 - letterWidth / 2,
          y: y - boxHeight / 2 + 3 - 3.2,
          size: 9,
          font: fontBold,
          color: isCorrect ? rgb(1, 1, 1) : BLACK,
        });
      } else {
        // Anklickbares Formularfeld (Radio-Button) je Antwortoption
        const radioGroupName = `frage_${qi + 1}`;
        let radioGroup = form.getFields().find(f => f.getName() === radioGroupName);
        if (!radioGroup) {
          radioGroup = form.createRadioGroup(radioGroupName);
        }
        radioGroup.addOptionToPage(letter, page, {
          x: MARGIN_X + 10,
          y: y - boxHeight / 2 + 3 - 6,
          width: 14,
          height: 14,
        });
        const letterWidth = fontBold.widthOfTextAtSize(letter, 9);
        page.drawText(letter, {
          x: MARGIN_X + 10 + 7 - letterWidth / 2,
          y: y - boxHeight / 2 + 3 - 3.2,
          size: 8,
          font: fontBold,
          color: BLACK,
        });
      }

      let ly = y - 3;
      for (const l of optLines) {
        page.drawText(l, { x: MARGIN_X + 42, y: ly, size: 10.5, font: fontRegular, color: BLACK });
        ly -= 13;
      }

      y -= boxHeight + 8;
    }

    if (fuerDozenten) {
      const explLines = wrapText('Erläuterung: ' + q.erlaeuterung, fontOblique, 9.5, contentWidth - 20);
      const boxH = explLines.length * 12 + 14;
      page.drawRectangle({
        x: MARGIN_X,
        y: y - boxH + 6,
        width: contentWidth,
        height: boxH,
        color: rgb(0.949, 0.976, 0.949),
      });
      let ey = y - 4;
      for (const l of explLines) {
        page.drawText(l, { x: MARGIN_X + 10, y: ey, size: 9.5, font: fontOblique, color: GREEN_TXT });
        ey -= 12;
      }
      y -= boxH + 18;
    } else {
      y -= 12;
    }
  }

  // --- Fußzeile mit fortlaufender Seitenzahl (unten mittig) ---
  const total = pages.length;
  const dokName = fuerDozenten
    ? 'Bau & Projektmanagement — Prüfungsfragen (Dozentenversion mit Lösungen)'
    : 'Bau & Projektmanagement — Prüfungsfragen (Teilnehmerversion)';
  pages.forEach((p, idx) => {
    const footerText = `${dokName} · Seite ${idx + 1} von ${total}`;
    const w = fontRegular.widthOfTextAtSize(footerText, 8);
    p.drawLine({
      start: { x: MARGIN_X, y: 38 },
      end: { x: PAGE_W - MARGIN_X, y: 38 },
      thickness: 0.5,
      color: LIGHT_LINE,
    });
    p.drawText(footerText, {
      x: (PAGE_W - w) / 2,
      y: 24,
      size: 8,
      font: fontRegular,
      color: GREY,
    });
  });

  const bytes = await pdfDoc.save();
  const outName = fuerDozenten
    ? 'Pruefungsfragen_Loesungen_Dozenten.pdf'
    : 'Pruefungsfragen.pdf';
  fs.writeFileSync(path.join(outDir, outName), bytes);
  console.log('PDF erstellt:', outName);
}

(async () => {
  await buildExam({ fuerDozenten: false });
  await buildExam({ fuerDozenten: true });
})();
