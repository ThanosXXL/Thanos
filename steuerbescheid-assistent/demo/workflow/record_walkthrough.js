// Nimmt einen Klick-Durchlauf durch die App als Video auf (für build-demo-video.sh).
// Wiederverwendbar für künftige Demovideos: Klickpfad unten an die jeweilige Seite
// anpassen, der Rest (Aufnahme-Setup, Ausgabe) bleibt gleich.
//
// Nutzung:  APP_URL=http://127.0.0.1:8642/index.html node record_walkthrough.js
// Playwright wird zuerst regulär aufgelöst; auf dieser Sandbox liegt es unter
// /opt/node22/lib/node_modules, falls es nicht lokal installiert ist.
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}

const OUT_DIR = __dirname;
const APP_URL = process.env.APP_URL || 'http://127.0.0.1:8642/index.html';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const pause = (ms) => page.waitForTimeout(ms);

  // Hakt ALLE Pflicht-Unterlagen des aktuell sichtbaren Schritts ab (nicht nur die erste!)
  async function checkAllRequiredDocsOnStep() {
    const boxes = await page.$$('.doc-item.required input[type=checkbox]');
    for (const cb of boxes) {
      const isChecked = await cb.isChecked();
      if (!isChecked) { await cb.click(); await pause(350); }
    }
  }

  await page.goto(APP_URL);
  await pause(2200);

  await page.click('text=Demo-Video ansehen');
  await pause(1700);
  await page.click('#video-modal-close');
  await pause(900);

  await page.click('text=Los geht');
  await pause(1900);

  await page.click('.tile-grid .tile >> nth=0'); // Steuerjahr
  await pause(1900);

  await page.click('.tile-grid .tile >> nth=0'); // Familienstand: ledig
  await pause(1900);

  for (const idx of [0, 1, 4]) { // job, kinder, kapital
    const tiles = await page.$$('.tile-grid .tile');
    await tiles[idx].click();
    await pause(600);
  }
  await pause(800);

  await page.click('text=Checkliste erstellen');
  await pause(2000);

  // Schritt 1: persoenlich -> Kirchensteuer + ALLE Pflicht-Unterlagen
  await page.selectOption('select', '9');
  await pause(900);
  await checkAllRequiredDocsOnStep();
  await pause(400);
  await page.click('text=Weiter');
  await pause(1800);

  // Schritt 2: Anlage N -> Beträge + Pflicht-Unterlage
  const amountInputs = await page.$$('.amounts-grid input[type=number]');
  await amountInputs[0].click(); await amountInputs[0].type('45000', { delay: 40 });
  await pause(350);
  await amountInputs[1].click(); await amountInputs[1].type('500', { delay: 40 });
  await pause(350);
  await amountInputs[2].click(); await amountInputs[2].type('7000', { delay: 40 });
  await pause(500);
  await checkAllRequiredDocsOnStep();
  await pause(400);
  await page.click('text=Weiter');
  await pause(1700);

  // Schritt 3: Kinder -> Anzahl + Pflicht-Unterlage (Kindergeldbescheid!)
  const kinderInputs = await page.$$('.amounts-grid input[type=number]');
  if (kinderInputs[0]) { await kinderInputs[0].click(); await kinderInputs[0].type('1', { delay: 60 }); await pause(500); }
  await checkAllRequiredDocsOnStep();
  await pause(500);
  await page.click('text=Weiter');
  await pause(1600);

  // Schritt 4: Kapitalerträge -> Betrag + Pflicht-Unterlage (Steuerbescheinigung Bank!)
  const kapInputs = await page.$$('.amounts-grid input[type=number]');
  if (kapInputs[0]) { await kapInputs[0].click(); await kapInputs[0].type('1500', { delay: 60 }); await pause(500); }
  await checkAllRequiredDocsOnStep();
  await pause(600);

  // Alle weiteren Schritte zügig durchklicken (Pflicht-Docs jeweils generisch abhaken)
  for (let i = 0; i < 10; i++) {
    await checkAllRequiredDocsOnStep();
    const zusBtn = await page.$('button:has-text("Zur Zusammenfassung")');
    if (zusBtn) { await zusBtn.click(); break; }
    const weiter = await page.$('button:has-text("Weiter")');
    if (weiter) { await weiter.click(); await pause(700); }
  }
  await pause(1800);

  // Zusammenfassung: zur Schätzung + freigeschaltetem Download scrollen
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  await pause(2400);

  const dlBtn = await page.$('button:has-text("Zusammenfassung & Schätzung herunterladen")');
  console.log('Download-Button gefunden (Gate entsperrt):', !!dlBtn);
  if (dlBtn) {
    await dlBtn.scrollIntoViewIfNeeded();
    await pause(600);
    await dlBtn.hover();
    await pause(1200);
    await dlBtn.click().catch(() => {});
    await pause(2000);
  } else {
    console.log('WARNUNG: Download-Button nicht sichtbar, Gate vermutlich noch gesperrt!');
  }

  await context.close();
  await browser.close();
  console.log('VIDEO_PATH_DONE');
})();
