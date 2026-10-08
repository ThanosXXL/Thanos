// Erzeugt App-Screenshots (Beispieldaten) für die Marketing-Bilder.
// Aufruf: NODE_PATH=$(npm root -g) node capture-shots.js
const { chromium } = require('playwright');
const path = require('path');
const APP = 'file://' + path.resolve(__dirname, '../renderer/index.html');
const OUT = path.join(__dirname, 'shots');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1040 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(new Date().setHours(10, 15, 0, 0)));
  await page.addInitScript(() => {
    const key = '__store';
    window.docsAPI = {
      loadData: async () => JSON.parse(sessionStorage.getItem(key) || 'null'),
      saveData: async (d) => { sessionStorage.setItem(key, JSON.stringify(d)); return true; },
      exportBackup: async () => true, importBackup: async () => null
    };
  });
  await page.goto(APP);
  await page.waitForTimeout(800);
  // Wartezimmer füllen
  await page.evaluate(() => {
    const st = JSON.parse(sessionStorage.getItem('__store'));
    const now = Date.now();
    st.wartezimmer = [
      { id: 'w1', patientId: st.patienten[1].id, terminId: null, seit: now - 14 * 60000, status: 'behandlung' },
      { id: 'w2', patientId: st.patienten[4].id, terminId: null, seit: now - 9 * 60000, status: 'wartet' },
      { id: 'w3', patientId: st.patienten[0].id, terminId: null, seit: now - 4 * 60000, status: 'wartet' },
      { id: 'w4', patientId: st.patienten[3].id, terminId: null, seit: now - 1 * 60000, status: 'wartet' }
    ];
    sessionStorage.setItem('__store', JSON.stringify(st));
  });
  await page.reload();
  await page.waitForTimeout(1600);
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
  await browser.close();
})();
