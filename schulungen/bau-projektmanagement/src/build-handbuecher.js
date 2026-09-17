const path = require('path');
const { page, renderPdf } = require('./pdf-common');
const { buildHandbuch } = require('./handbuch-builder');

const outDir = path.join(__dirname, '..', 'pdf');
require('fs').mkdirSync(outDir, { recursive: true });

(async () => {
  const teilnehmerHtml = page({
    title: 'Teilnehmerhandbuch – Bau- und Projektmanagement',
    content: buildHandbuch({ fuerDozenten: false }),
  });
  await renderPdf({
    html: teilnehmerHtml,
    outPath: path.join(outDir, 'Teilnehmerhandbuch_Bau-und-Projektmanagement.pdf'),
    dokumentTyp: 'Teilnehmerhandbuch',
    dokumentName: 'Bau- und Projektmanagement — Teilnehmerhandbuch',
  });

  const dozentenHtml = page({
    title: 'Dozentenhandbuch – Bau- und Projektmanagement',
    content: buildHandbuch({ fuerDozenten: true }),
  });
  await renderPdf({
    html: dozentenHtml,
    outPath: path.join(outDir, 'Dozentenhandbuch_Bau-und-Projektmanagement.pdf'),
    dokumentTyp: 'Dozentenhandbuch — Nur für Dozenten',
    dokumentName: 'Bau- und Projektmanagement — Dozentenhandbuch',
  });
})();
