const fs = require('fs');
const path = require('path');
const fontkit = require('@pdf-lib/fontkit');

const fontsDir = path.join(__dirname, 'assets', 'fonts');
const iconsDir = path.join(__dirname, 'assets', 'icons');

async function registerFonts(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);
  const load = (file) => fs.readFileSync(path.join(fontsDir, file));
  return {
    regular: await pdfDoc.embedFont(load('Nunito-Regular.ttf'), { subset: true }),
    semibold: await pdfDoc.embedFont(load('Nunito-SemiBold.ttf'), { subset: true }),
    bold: await pdfDoc.embedFont(load('Nunito-Bold.ttf'), { subset: true }),
    extrabold: await pdfDoc.embedFont(load('Nunito-ExtraBold.ttf'), { subset: true }),
    italic: await pdfDoc.embedFont(load('Nunito-Italic.ttf'), { subset: true }),
  };
}

async function embedLogo(pdfDoc) {
  const bytes = fs.readFileSync(path.join(__dirname, 'assets', 'logo-3d-glossy.png'));
  const img = await pdfDoc.embedPng(bytes);
  return img;
}

async function embedIcon(pdfDoc, name) {
  const bytes = fs.readFileSync(path.join(iconsDir, name + '.png'));
  return pdfDoc.embedPng(bytes);
}

function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

module.exports = { registerFonts, embedLogo, embedIcon, wrapText };
