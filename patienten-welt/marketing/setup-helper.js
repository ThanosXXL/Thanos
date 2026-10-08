// Gemeinsame Hilfe für die Marketing-Skripte: Mock der Datei-Schnittstelle (window.welt) und automatische Einrichtung (Beispieldaten).
const PW = 'Marketing-Demo-Passwort-2026!';

// Läuft im Browser (addInitScript): ersetzt window.welt durch einen Speicher in sessionStorage.
function mockWelt() {
  const key = '__store';
  window.welt = {
    loadData: async () => JSON.parse(sessionStorage.getItem(key) || 'null'),
    saveData: async (d) => { sessionStorage.setItem(key, JSON.stringify(d)); return true; },
    saveTextFile: async () => ({ ok: true }),
    openTextFile: async () => null,
    deleteAllData: async () => { sessionStorage.removeItem(key); return true; }
  };
}

// Durchläuft den Einrichtungsassistenten mit Beispieldaten (Name, Passwort, Wiederherstellungsschlüssel bestätigen).
async function setupDemo(page, app) {
  await page.goto(app);
  await page.waitForSelector('#su-go');
  await page.fill('#su-name', 'Anna Berger');
  await page.fill('#su-pw1', PW);
  await page.fill('#su-pw2', PW);
  await page.selectOption('#su-mode', 'demo');
  await page.click('#su-go');
  await page.waitForSelector('#rk-confirm', { timeout: 60000 });
  await page.check('#rk-confirm');
  await page.click('#rk-go');
  await page.waitForSelector('#sidebar .nav-item', { timeout: 60000 });
}

module.exports = { PW, mockWelt, setupDemo };
