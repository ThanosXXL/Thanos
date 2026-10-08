// Gemeinsame Hilfe für die Marketing-Skripte: Mock der Datei-Schnittstelle und automatische Einrichtung (Beispieldaten).
const PW = 'Marketing-Demo-Passwort-2026!';

// Läuft im Browser (addInitScript): ersetzt window.docsAPI durch einen Speicher in sessionStorage.
function mockDocsApi() {
  const key = '__store';
  window.docsAPI = {
    loadData: async () => JSON.parse(sessionStorage.getItem(key) || 'null'),
    saveData: async (d) => { sessionStorage.setItem(key, JSON.stringify(d)); return true; },
    saveTextFile: async () => ({ ok: true }),
    openTextFile: async () => null
  };
}

// Durchläuft den Einrichtungsassistenten mit Beispieldaten und setzt Patienten (Index in der Namensliste) ins Wartezimmer.
async function setupDemo(page, app, wartend = []) {
  await page.goto(app);
  await page.waitForSelector('#su-go');
  await page.fill('#su-name', 'Dr. Erika Mustermann');
  await page.fill('#su-pw1', PW);
  await page.fill('#su-pw2', PW);
  await page.selectOption('#su-mode', 'demo');
  await page.click('#su-go');
  await page.waitForSelector('#rk-confirm', { timeout: 60000 });
  await page.check('#rk-confirm');
  await page.click('#rk-go');
  await page.waitForSelector('#sidebar .nav-item', { timeout: 60000 });
  for (const idx of wartend) {
    await page.click('.nav-item:has-text("Patienten")');
    await page.click(`.split .item.clickable >> nth=${idx}`);
    await page.click('button:has-text("Ins Wartezimmer")');
  }
  await page.click('.nav-item:has-text("Start")');
}

module.exports = { PW, mockDocsApi, setupDemo };
