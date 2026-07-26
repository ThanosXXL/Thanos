/*
 * Leichtgewichtige Regressionstests fuer Music Heaven (Browser-Variante).
 *
 * Startet den lokalen Server (scripts/serve.js), oeffnet die App in einer
 * lokal installierten Chromium/Chrome/Edge-Instanz (kein Browser-Download -
 * siehe scripts/find-browser.js, dasselbe Prinzip wie beim PDF-Handbuch) und
 * prueft die wichtigsten Ablaeufe end-to-end: Equipment-Pads, Vocals-Stile,
 * Fixed-Groups (Drums/EFX/Loops/Scratch), Sequencer-Aufnahme, Upload+Auto-Mix.
 *
 * Ausfuehren: npm test
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
const { findBrowser } = require('../scripts/find-browser');

const PORT = Number(process.env.TEST_PORT) || 4399;
const BASE_URL = `http://localhost:${PORT}/index.html`;

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      http.get(url, (res) => { res.resume(); resolve(); }).on('error', () => {
        if (Date.now() > deadline) reject(new Error('Server nicht erreichbar: ' + url));
        else setTimeout(tryOnce, 150);
      });
    };
    tryOnce();
  });
}

// Erzeugt eine kurze Test-Ton-WAV-Datei (Sinuston), ganz ohne externe Abhaengigkeiten.
function writeTestTone(filePath, freq, seconds) {
  const sr = 44100;
  const n = sr * seconds;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const s = Math.sin((2 * Math.PI * freq * i) / sr) * 0.3 * 32767;
    data.writeInt16LE(Math.round(s), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sr, 24); header.writeUInt32LE(sr * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(filePath, Buffer.concat([header, data]));
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'OK  ' : 'FEHLER'} ${name}${detail ? ' - ' + detail : ''}`);
}

async function main() {
  const browserPath = findBrowser();
  if (!browserPath) {
    console.log('Kein Chromium/Chrome/Edge gefunden - Tests koennen nicht laufen.');
    console.log('Chrome/Chromium installieren oder CHROME_PATH setzen, siehe scripts/find-browser.js.');
    process.exit(1);
  }

  let chromium;
  try {
    ({ chromium } = require('playwright-core'));
  } catch (err) {
    console.log('playwright-core nicht installiert - bitte zuerst "npm install" ausfuehren.');
    process.exit(1);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-heaven-test-'));
  const toneA = path.join(tmpDir, 'tone-a.wav');
  const toneB = path.join(tmpDir, 'tone-b.wav');
  writeTestTone(toneA, 440, 2);
  writeTestTone(toneB, 330, 2);

  const server = spawn(process.execPath, [path.join(__dirname, '..', 'scripts', 'serve.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore'
  });

  let browser;
  try {
    await waitForServer(BASE_URL, 10000);

    browser = await chromium.launch({
      executablePath: browserPath,
      args: ['--autoplay-policy=no-user-gesture-required']
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(200);

    // ---- App laedt mit Browser-Fallback-API ----
    const hasApi = await page.evaluate(() => !!window.musicHeaven && !!window.__isBrowserFallback);
    record('App laedt mit Browser-Fallback-API', hasApi);

    // ---- Tab-Wechsel ----
    await page.click('.tab-btn[data-tab="create"]');
    await page.waitForTimeout(100);
    const createActive = await page.evaluate(() => document.getElementById('tab-create').classList.contains('active'));
    record('Tab-Wechsel zu Ordner 2', createActive);

    // ---- Alle festen Equipment-Pads vorhanden & antestbar ----
    const fixedVoices = [
      'kick', 'snare', 'hihat', 'openhat', 'clap',
      'riser', 'downlifter', 'impact', 'noisesweep', 'reversecymbal',
      'drumloop', 'bassloop', 'percloop', 'arploop',
      'scratchbaby', 'scratchchirp', 'scratchtransformer', 'scratchcrab', 'scratchflare', 'scratchtear'
    ];
    let allVoicesOk = true;
    for (const v of fixedVoices) {
      const btn = await page.$(`.pad[data-voice="${v}"]`);
      if (!btn) { allVoicesOk = false; console.log(`  fehlt: .pad[data-voice="${v}"]`); continue; }
      await btn.click();
      await page.waitForTimeout(15);
    }
    record('Alle Drums/EFX/Loops/Scratch-Pads vorhanden & antestbar', allVoicesOk);

    // ---- Alle Vocals-Stile vorhanden, klickbar, aria-pressed korrekt ----
    const vocalStyles = ['gesang', 'woerter', 'chor', 'rapsoul', 'house', 'jazz', 'pop', 'hiphop'];
    let vocalOk = true;
    for (const style of vocalStyles) {
      const btn = await page.$(`.pad[data-vocal-style="${style}"]`);
      if (!btn) { vocalOk = false; console.log(`  fehlt: .pad[data-vocal-style="${style}"]`); continue; }
      await btn.click();
      await page.waitForTimeout(15);
      const pressed = await btn.getAttribute('aria-pressed');
      if (pressed !== 'true') { vocalOk = false; console.log(`  aria-pressed falsch bei "${style}": ${pressed}`); }
    }
    record('Alle 8 Vocals-Stile vorhanden, klickbar, aria-pressed korrekt', vocalOk);

    // ---- Fixed-Group hinzufuegen + Duplikat-Schutz ----
    await page.click('[data-add-fixed="scratch"]');
    await page.waitForTimeout(100);
    const rowsAfterFirst = await page.evaluate(() => document.querySelectorAll('.seq-row').length);
    await page.click('[data-add-fixed="scratch"]');
    await page.waitForTimeout(100);
    const rowsAfterSecond = await page.evaluate(() => document.querySelectorAll('.seq-row').length);
    record('Scratch zur Spur hinzufuegen + Duplikat-Schutz', rowsAfterFirst === 6 && rowsAfterSecond === 6,
      `rows: ${rowsAfterFirst} -> ${rowsAfterSecond}`);

    // ---- Sequencer: Abhoeren & Aufnehmen -> Speichern ----
    await page.click('.seq-row:nth-child(1) .seq-cell[data-step="0"]');
    await page.click('#seq-preview-btn');
    let seqSaveOk = true;
    try {
      await page.waitForSelector('#seq-save-panel:not(.hidden)', { timeout: 15000 });
    } catch (err) { seqSaveOk = false; }
    record('Sequencer: Abhoeren & Aufnehmen zeigt Save-Panel', seqSaveOk);

    if (seqSaveOk) {
      await page.fill('#seq-name', 'Test-Musikstück');
      await page.click('#seq-save-internal');
      await page.waitForTimeout(300);
      const libCount = await page.evaluate(() => document.querySelectorAll('#library-list li:not(.empty)').length);
      record('Musikstück in Bibliothek gespeichert', libCount >= 1, `Eintraege: ${libCount}`);
    }

    // ---- Ordner 1: Upload + Auto-Mix ----
    await page.click('.tab-btn[data-tab="upload"]');
    await page.waitForTimeout(100);
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#btn-upload')
    ]);
    await chooser.setFiles([toneA, toneB]);
    await page.waitForTimeout(300);
    const uploadCount = await page.evaluate(() => document.querySelectorAll('#upload-list li:not(.empty)').length);
    record('Zwei Test-Tracks hochgeladen', uploadCount === 2, `Anzahl: ${uploadCount}`);

    await page.selectOption('#mix-track-a', { index: 1 });
    await page.selectOption('#mix-track-b', { index: 2 });
    await page.$eval('#mix-crossfade', (el) => { el.value = '1'; el.dispatchEvent(new Event('input')); });
    await page.click('#mix-preview-btn');
    let mixSaveOk = true;
    try {
      await page.waitForSelector('#mix-save-panel:not(.hidden)', { timeout: 15000 });
    } catch (err) { mixSaveOk = false; }
    record('Mix: Abhoeren & Aufnehmen zeigt Save-Panel', mixSaveOk);

    if (mixSaveOk) {
      await page.click('#mix-save-internal');
      await page.waitForTimeout(300);
      const libCount = await page.evaluate(() => document.querySelectorAll('#library-list li:not(.empty)').length);
      record('Mix in Bibliothek gespeichert', libCount >= 2, `Eintraege: ${libCount}`);
    }

    record('Keine Konsolen-/Seitenfehler waehrend der Tests', errors.length === 0, errors.join(' | '));
  } finally {
    if (browser) await browser.close();
    server.kill();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} Tests bestanden.`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
