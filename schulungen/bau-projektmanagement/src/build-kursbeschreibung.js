const path = require('path');
const { page, renderPdf } = require('./pdf-common');
const { buildKursbeschreibung } = require('./kursbeschreibung-builder');

const outDir = path.join(__dirname, '..', 'pdf');
require('fs').mkdirSync(outDir, { recursive: true });

(async () => {
  const html = page({
    title: 'Kursbeschreibung – Bau & Projektmanagement',
    content: buildKursbeschreibung(),
  });
  await renderPdf({
    html,
    outPath: path.join(outDir, 'Kursbeschreibung.pdf'),
    dokumentTyp: 'Kursbeschreibung',
    dokumentName: 'Bau & Projektmanagement — Kursbeschreibung',
  });
})();
