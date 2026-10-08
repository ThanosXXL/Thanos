// Erzeugt App-Screenshots (Beispieldaten) für die Marketing-Bilder.
// Aufruf: NODE_PATH=$(npm root -g) node capture-shots.js
const { chromium } = require('playwright');
const path = require('path');
const { PW, mockWelt, setupDemo } = require('./setup-helper');
const APP = 'file://' + path.resolve(__dirname, '../renderer/index.html');
const OUT = path.join(__dirname, 'shots');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1040 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(new Date().setHours(10, 15, 0, 0)));
  await page.addInitScript(mockWelt);

  // Einrichtung (Bildschirme vor dem Start der App)
  await page.goto(APP);
  await page.waitForSelector('#su-go');
  await page.fill('#su-name', 'Anna Berger');
  await page.fill('#su-pw1', PW);
  await page.fill('#su-pw2', PW);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'einrichtung.jpg'), type: 'jpeg', quality: 92 });
  await setupDemo(page, APP);
  await page.waitForTimeout(800);
  const nav = (label) => page.click(`#sidebar .nav-item:has(span:text-is("${label}"))`);
  const shot = async (name, wait = 1600) => { await page.waitForTimeout(wait); await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 92 }); };

  await shot('start', 2200);
  await nav('Medikamente');
  await page.check('.item >> nth=0 >> input[type=checkbox]');
  await shot('medikamente');
  await nav('Meine Werte');
  await shot('werte', 2200);
  await nav('Laborergebnisse');
  await shot('labor');
  await page.click('tr[data-param="LDL-Cholesterin"]');
  await shot('labor-detail', 2000);
  await page.click('#kind-bar');
  await shot('labor-balken', 1600);
  await page.keyboard.press('Escape');
  await nav('Befunde');
  await shot('befunde');
  await nav('Vorsorge & Impfungen');
  await shot('vorsorge');
  await nav('Medikamentensuche');
  await page.fill('#kat-input', 'ramip');
  await shot('katalog');
  await nav('E-Rezepte');
  await shot('erezepte');
  await page.click('.er-card >> nth=0');
  await shot('erezept', 1200);
  await page.keyboard.press('Escape');
  await nav('Krankmeldungen');
  await shot('krankmeldungen');
  await page.click('.item[data-au] >> nth=0');
  await shot('au', 1200);
  await page.keyboard.press('Escape');
  await nav('Überweisungen');
  await shot('ueberweisungen');
  await nav('Gesundheitskarte');
  await shot('karte', 1800);
  await nav('Datenschutz & Sicherheit');
  await shot('datenschutz', 2200);
  await page.click('.tabs .tab:text-is("Meine Daten")');
  await shot('daten');
  await page.click('.tabs .tab:text-is("Passwort & Sperre")');
  await shot('zugang');
  await nav('Demo & Medien');
  await shot('medien');
  await page.keyboard.press('Control+l');
  await page.waitForSelector('#li-pw');
  await shot('sperre', 900);
  await browser.close();
  console.log('Screenshots fertig:', OUT);
})();
