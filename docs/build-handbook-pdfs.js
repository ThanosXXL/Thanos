// Rendert die drei Handbücher (voller Gold/Braun-3D-Hochglanz-Stil, inkl. Screenshots)
// als echte PDF-Dateien, per Electron/Chromium-Druckfunktion.
//
// Manuell ausführen, nachdem sich einer der Handbuch-HTML-Dateien geändert hat:
//   npm run build:handbook-pdfs
'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');

const HANDBOOKS = [
  { html: 'handbuch.html', pdf: 'handbuch.pdf' },
  { html: 'handbuch-inventar.html', pdf: 'handbuch-inventar.pdf' },
  { html: 'admin-handbuch.html', pdf: 'admin-handbuch.pdf' }
];

async function renderOne(win, { html, pdf }) {
  await win.loadFile(path.join(ROOT, 'docs', html));
  // Kurze Pause, damit Bilder aus docs/images/ sicher geladen sind, bevor gedruckt wird.
  await new Promise((resolve) => setTimeout(resolve, 400));

  const buffer = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: { marginType: 'default' },
    preferCSSPageSize: false
  });

  const outPath = path.join(ROOT, 'docs', pdf);
  fs.writeFileSync(outPath, buffer);
  console.log('docs/' + pdf + ' geschrieben (' + (buffer.length / 1024).toFixed(0) + ' KB).');
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 900, height: 1200, show: false });

  for (const entry of HANDBOOKS) {
    await renderOne(win, entry);
  }

  app.quit();
});
