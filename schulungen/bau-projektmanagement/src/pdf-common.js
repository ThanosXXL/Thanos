const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const logoPath = path.join(__dirname, 'assets', 'logo-3d-glossy.png');
const logoDataUri = 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64');

const iconsDir = path.join(__dirname, 'assets', 'icons');
function iconDataUri(name) {
  return 'data:image/png;base64,' + fs.readFileSync(path.join(iconsDir, name + '.png')).toString('base64');
}

const fontsDir = path.join(__dirname, 'assets', 'fonts');
function fontBase64(file) {
  return fs.readFileSync(path.join(fontsDir, file)).toString('base64');
}

// Nunito – eine runde, humanistische Groteskschrift (statt eines nüchternen
// Systemfonts wie Arial), lokal eingebettet als @font-face-Data-URIs.
const fontFaceCss = `
  @font-face {
    font-family: 'Nunito';
    font-style: normal;
    font-weight: 400;
    src: url(data:font/ttf;base64,${fontBase64('Nunito-Regular.ttf')}) format('truetype');
  }
  @font-face {
    font-family: 'Nunito';
    font-style: normal;
    font-weight: 600;
    src: url(data:font/ttf;base64,${fontBase64('Nunito-SemiBold.ttf')}) format('truetype');
  }
  @font-face {
    font-family: 'Nunito';
    font-style: normal;
    font-weight: 700;
    src: url(data:font/ttf;base64,${fontBase64('Nunito-Bold.ttf')}) format('truetype');
  }
  @font-face {
    font-family: 'Nunito';
    font-style: normal;
    font-weight: 800;
    src: url(data:font/ttf;base64,${fontBase64('Nunito-ExtraBold.ttf')}) format('truetype');
  }
  @font-face {
    font-family: 'Nunito';
    font-style: italic;
    font-weight: 400;
    src: url(data:font/ttf;base64,${fontBase64('Nunito-Italic.ttf')}) format('truetype');
  }
`;

const baseStyle = `
  ${fontFaceCss}
  :root {
    --brand-red: #d5121f;
    --brand-black: #1a1a1a;
    --grey-bg: #f4f5f6;
    --grey-line: #d9dbde;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Nunito', 'Arial', sans-serif;
    color: var(--brand-black);
    font-size: 11pt;
    line-height: 1.5;
    margin: 0;
  }
  h1, h2, h3, h4 { font-family: 'Nunito', 'Arial', sans-serif; font-weight: 800; color: var(--brand-black); }
  .beispielbild {
    display: block;
    margin: 0 auto 14px auto;
  }
  .thema-icon {
    width: 54px;
    height: 54px;
    object-fit: contain;
    flex: none;
  }
  .day-hero {
    width: 100%;
    max-width: 460px;
    display: block;
    margin: 0 auto 22px auto;
  }
  .cover {
    height: 235mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    page-break-after: always;
  }
  .cover .doctype {
    display: inline-block;
    background: var(--brand-red);
    color: #fff;
    font-weight: bold;
    letter-spacing: 1px;
    padding: 6px 22px;
    border-radius: 3px;
    margin-bottom: 22px;
    font-size: 12pt;
  }
  .cover h1 {
    font-size: 30pt;
    margin: 0 0 6px 0;
  }
  .cover h2 {
    font-size: 15pt;
    font-weight: normal;
    color: #444;
    margin: 0 0 34px 0;
  }
  .cover .meta-box {
    border: 1px solid var(--grey-line);
    border-radius: 8px;
    padding: 18px 32px;
    background: var(--grey-bg);
    font-size: 10.5pt;
    text-align: left;
    min-width: 320px;
  }
  .cover .meta-box div { margin: 4px 0; }
  .cover .meta-box b { display: inline-block; width: 150px; }
  .cover .footer-note {
    margin-top: 40px;
    font-size: 9pt;
    color: #777;
  }
  .toc { page-break-after: always; }
  .toc h1 { border-bottom: 3px solid var(--brand-red); padding-bottom: 8px; }
  .toc-item {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px dotted var(--grey-line);
    font-size: 11pt;
  }
  .day-section { page-break-before: always; }
  .day-header {
    display: flex;
    align-items: center;
    gap: 14px;
    border-bottom: 3px solid var(--brand-red);
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .day-badge {
    background: var(--brand-black);
    color: #fff;
    font-weight: bold;
    font-size: 13pt;
    border-radius: 50%;
    width: 46px;
    height: 46px;
    min-width: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .day-header h1 { margin: 0; font-size: 18pt; }
  .lernziele {
    background: var(--grey-bg);
    border-left: 4px solid var(--brand-red);
    padding: 12px 16px;
    margin-bottom: 18px;
    font-size: 10pt;
  }
  .lernziele h4 { margin: 0 0 6px 0; font-size: 10.5pt; }
  .lernziele ul { margin: 0; padding-left: 18px; }
  .zeitraster {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 9pt;
  }
  .zeitraster th, .zeitraster td {
    border: 1px solid var(--grey-line);
    padding: 5px 8px;
    text-align: left;
  }
  .zeitraster th { background: var(--brand-black); color: #fff; }
  .zeitraster tr.pause td { background: #fafafa; color: #888; font-style: italic; }
  .thema {
    margin-bottom: 16px;
    break-inside: avoid;
  }
  .thema-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 3px;
  }
  .thema-head .block-tag {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #fff;
    background: var(--brand-red);
    border-radius: 3px;
    padding: 2px 7px;
    white-space: nowrap;
  }
  .thema-head h3 { margin: 0; font-size: 12pt; }
  .thema p { margin: 4px 0 0 0; text-align: justify; }
  .hinweis-box {
    background: #fff7e6;
    border: 1px solid #f0c675;
    border-left: 5px solid #e0a83a;
    border-radius: 4px;
    padding: 10px 14px;
    margin: 16px 0;
    font-size: 9.5pt;
  }
  .hinweis-box .label {
    font-weight: bold;
    color: #8a5a00;
    display: block;
    margin-bottom: 4px;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .uebung-box {
    background: #eef6ee;
    border-left: 5px solid #4c8c4a;
    border-radius: 4px;
    padding: 10px 14px;
    margin: 10px 0;
    font-size: 9.5pt;
  }
  .exam-question {
    break-inside: avoid;
    margin-bottom: 22px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--grey-line);
  }
  .exam-question h3 { font-size: 12pt; margin: 0 0 10px 0; }
  .exam-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    margin: 6px 0;
    border: 1px solid var(--grey-line);
    border-radius: 5px;
    font-size: 10.5pt;
  }
  .exam-option .letter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px; height: 22px;
    min-width: 22px;
    border-radius: 50%;
    border: 1.5px solid var(--brand-black);
    font-weight: bold;
    font-size: 9.5pt;
  }
  .exam-option.correct {
    background: #eaf7ea;
    border-color: #4c8c4a;
  }
  .exam-option.correct .letter {
    background: #4c8c4a;
    border-color: #4c8c4a;
    color: #fff;
  }
  .exam-explain {
    margin-top: 8px;
    font-size: 9.5pt;
    color: #2c5a2b;
    background: #f2f9f2;
    padding: 8px 12px;
    border-radius: 4px;
  }
  .exam-explain b { color: #1c3d1b; }
  .section-title {
    border-bottom: 3px solid var(--brand-red);
    padding-bottom: 8px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin: 16px 0 22px 0;
  }
  .info-tile {
    background: var(--grey-bg);
    border: 1px solid var(--grey-line);
    border-radius: 6px;
    padding: 10px 12px;
    text-align: center;
  }
  .info-tile .num { font-size: 18pt; font-weight: bold; color: var(--brand-red); display: block; }
  .info-tile .lbl { font-size: 8.5pt; color: #555; }
`;

function page({ title, bodyClass = '', content, style = baseStyle }) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${style}</style>
</head>
<body class="${bodyClass}">
${content}
</body>
</html>`;
}

function headerTemplate({ dokumentTyp }) {
  return `
  <div style="width:100%; font-size:8px; padding:0 12mm; display:flex; flex-direction:column; align-items:center; -webkit-print-color-adjust:exact;">
    <img src="${logoDataUri}" style="height:15mm; object-fit:contain;">
    <div style="margin-top:2px; font-family:Arial, sans-serif; color:#666; letter-spacing:1px; text-transform:uppercase;">${dokumentTyp}</div>
  </div>`;
}

function footerTemplate({ dokumentName }) {
  return `
  <div style="width:100%; font-size:8px; font-family:Arial, sans-serif; color:#666; display:flex; justify-content:center; align-items:center; padding:0 12mm; border-top:0.5px solid #ccc; padding-top:2px;">
    <span style="text-align:center;">${dokumentName} &nbsp;·&nbsp; Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span>
  </div>`;
}

async function renderPdf({ html, outPath, dokumentTyp, dokumentName, landscape = false }) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pw = await browser.newPage();
  await pw.setContent(html, { waitUntil: 'networkidle' });
  await pw.pdf({
    path: outPath,
    format: 'A4',
    landscape,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: headerTemplate({ dokumentTyp }),
    footerTemplate: footerTemplate({ dokumentName }),
    margin: {
      top: landscape ? '28mm' : '30mm',
      bottom: '14mm',
      left: '16mm',
      right: '16mm',
    },
  });
  await browser.close();
  console.log('PDF erstellt:', outPath);
}

module.exports = { page, renderPdf, logoDataUri, iconDataUri, fontFaceCss, fontBase64 };
