const path = require('path');
const { page, renderPdf } = require('./pdf-common');
const { buildFolien, slideStyle } = require('./slides-builder');

const outDir = path.join(__dirname, '..', 'pdf');
require('fs').mkdirSync(outDir, { recursive: true });

(async () => {
  const html = page({
    title: 'Schulungsfolien – Bau- und Projektmanagement',
    content: buildFolien(),
    style: slideStyle,
  });
  await renderPdf({
    html,
    outPath: path.join(outDir, 'Schulungsfolien_Bau-und-Projektmanagement.pdf'),
    dokumentTyp: 'Schulungsfolien',
    dokumentName: 'Bau- und Projektmanagement — Schulungsfolien',
    landscape: true,
  });
})();
