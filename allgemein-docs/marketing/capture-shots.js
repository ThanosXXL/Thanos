// Erzeugt App-Screenshots (Beispieldaten) für die Marketing-Bilder.
// Aufruf: NODE_PATH=$(npm root -g) node capture-shots.js
const { chromium } = require('playwright');
const path = require('path');
const { mockDocsApi, setupDemo } = require('./setup-helper');
const APP = 'file://' + path.resolve(__dirname, '../renderer/index.html');
const OUT = path.join(__dirname, 'shots');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1040 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(new Date().setHours(10, 15, 0, 0)));
  await page.addInitScript(mockDocsApi);
  await setupDemo(page, APP, [1, 4, 0, 3]);
  await page.waitForTimeout(800);
  const shot = async (name) => { await page.waitForTimeout(1500); await page.screenshot({ path: path.join(OUT, name + '.png') }); };

  await shot('start');
  await page.click('.nav-item >> text=Patienten');
  await page.click('.item.clickable >> nth=0');
  await page.click('.tab >> text=Karteikarte');
  await shot('patient');
  await page.click('.nav-item >> text=Wartezimmer');
  await shot('wartezimmer');
  await page.click('.nav-item >> text=Vorsorge');
  await shot('vorsorge');
  await page.click('.nav-item >> text=Auswertung');
  await shot('auswertung');
  await page.click('.nav-item >> text=Dokumente');
  await page.click('text=Erstellen >> nth=0');
  await shot('dokument');
  await page.keyboard.press('Escape');
  // neue Menüs
  await page.click('.nav-item >> text=Karte & E-Rezept');
  await page.click('.view .btn.primary >> text=Karte einlesen');
  await page.waitForTimeout(3000);
  await shot('karte');
  await page.click('.er-panel .item .btn.small >> nth=0');
  await shot('erezept');
  await page.keyboard.press('Escape');
  await page.click('.nav-item >> text=Laborergebnisse');
  await page.click('.item.clickable >> nth=0');
  await shot('labor');
  await page.keyboard.press('Escape');
  await page.click('.nav-item >> text=Krankmeldung');
  await page.click('.item.clickable >> nth=0');
  await shot('au');
  await page.keyboard.press('Escape');
  await page.click('.nav-item >> text=Rezepte');
  await page.click('.item.clickable >> nth=0');
  await shot('rezept');
  await page.keyboard.press('Escape');
  await page.click('.nav-item span:text-is("E-Rezept")');
  await page.click('.med-pick >> nth=0');
  await page.click('.med-pick >> nth=1');
  await shot('erezept-menue');
  await page.click('.actions-row .btn.primary');
  await shot('erezept-batch');
  await page.keyboard.press('Escape');
  await page.click('.nav-item >> text=Medikamentenkatalog');
  await page.fill('.med-panel input', 'ramip');
  await shot('katalog');
  // Datenschutz & Sicherheit (vorher alles nach oben scrollen)
  const top = () => page.evaluate(() => document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0; }));
  const shotTop = async (name) => { await page.waitForTimeout(800); await top(); await shot(name); };
  await page.click('.nav-item >> text=Datenschutz & Sicherheit');
  await shotTop('datenschutz');
  await page.click('.tab >> text=Protokoll');
  await shotTop('protokoll');
  await page.click('.nav-item >> text=Patienten');
  await page.click('.item.clickable >> nth=0');
  await page.click('.tab:text-is("Datenschutz")');
  await shotTop('patient-datenschutz');
  // Sperrbildschirm (zuletzt: danach ist die App gesperrt)
  await page.keyboard.press('Control+l');
  await page.waitForSelector('#li-pw');
  await shotTop('login');
  await browser.close();
})();
