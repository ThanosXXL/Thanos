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

// Wartet auf eine Bedingung statt auf eine feste Zeitspanne - robuster gegen
// variable Laufzeiten (z. B. CPU-lastiges MP3-Encoding vor einem Bibliotheks-Save).
async function waitForCondition(fn, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await fn();
    if (last) return last;
    await new Promise((r) => setTimeout(r, 50));
  }
  return last;
}

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
    // Headless Chromium haengt beim File-System-Access-Dialog (kein User-Gesture-Handling) -
    // fuer Tests deaktivieren, damit "Extern speichern unter..." auf den Download-Fallback geht.
    await page.addInitScript(() => { delete window.showSaveFilePicker; });

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
      'conga', 'bongo', 'shaker', 'tabla', 'cajon',
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
    record('Alle Drums/Percussion/EFX/Loops/Scratch-Pads vorhanden & antestbar', allVoicesOk);

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

    // ---- Gitarre- & Synth-Stile (generischer Stil-Umschalter) ----
    let styleGroupOk = true;
    for (const [base, styles] of [['guitar', ['akustik', 'electric']], ['synth', ['lead', 'pad']]]) {
      for (const style of styles) {
        const btn = await page.$(`.equipment-group[data-melodic="${base}"] .pad[data-style="${style}"]`);
        if (!btn) { styleGroupOk = false; console.log(`  fehlt: [data-melodic="${base}"] [data-style="${style}"]`); continue; }
        await btn.click();
        await page.waitForTimeout(15);
        const pressed = await btn.getAttribute('aria-pressed');
        if (pressed !== 'true') { styleGroupOk = false; console.log(`  aria-pressed falsch bei ${base}/${style}: ${pressed}`); }
      }
    }
    record('Gitarre- & Synth-Stile vorhanden, klickbar, aria-pressed korrekt', styleGroupOk);

    // ---- Streicher & Blaeser antestbar ----
    let orchestralOk = true;
    for (const base of ['strings', 'brass']) {
      const btn = await page.$(`[data-add-melodic="${base}"]`);
      if (!btn) { orchestralOk = false; console.log(`  fehlt: [data-add-melodic="${base}"]`); }
    }
    record('Streicher & Bläser als Equipment vorhanden', orchestralOk);

    // ---- Fixed-Group hinzufuegen + Duplikat-Schutz ----
    await page.click('[data-add-fixed="scratch"]');
    await page.waitForTimeout(100);
    const rowsAfterFirst = await page.evaluate(() => document.querySelectorAll('.seq-row').length);
    await page.click('[data-add-fixed="scratch"]');
    await page.waitForTimeout(100);
    const rowsAfterSecond = await page.evaluate(() => document.querySelectorAll('.seq-row').length);
    record('Scratch zur Spur hinzufuegen + Duplikat-Schutz', rowsAfterFirst === 6 && rowsAfterSecond === 6,
      `rows: ${rowsAfterFirst} -> ${rowsAfterSecond}`);

    // ---- 32-Step/2-Takte-Option: Steps im ueberlappenden Bereich bleiben erhalten ----
    await page.click('.seq-row:nth-child(1) .seq-cell[data-step="0"]');
    await page.click('.seq-row:nth-child(1) .seq-cell[data-step="4"]');
    await page.selectOption('#seq-bars', '2');
    await page.waitForTimeout(100);
    const stepsAfterResize = await page.evaluate(() => document.querySelectorAll('.seq-row:nth-child(1) .seq-cell').length);
    const preservedAfterResize = await page.evaluate(() => {
      const cells = document.querySelectorAll('.seq-row:nth-child(1) .seq-cell[data-step="0"], .seq-row:nth-child(1) .seq-cell[data-step="4"]');
      return Array.from(cells).every((c) => c.classList.contains('on'));
    });
    record('32-Step-Option: Umschalten auf 2 Takte erhaelt bestehende Steps',
      stepsAfterResize === 32 && preservedAfterResize, `steps: ${stepsAfterResize}`);

    // ---- Mute/Solo pro Spur ----
    await page.click('.seq-row:nth-child(2) [data-mute]');
    const muteActive = await page.evaluate(() => document.querySelector('.seq-row:nth-child(2) [data-mute]').classList.contains('active'));
    await page.click('.seq-row:nth-child(2) [data-mute]'); // wieder entstummen
    await page.click('.seq-row:nth-child(3) [data-solo]');
    const soloActive = await page.evaluate(() => document.querySelector('.seq-row:nth-child(3) [data-solo]').classList.contains('active'));
    await page.click('.seq-row:nth-child(3) [data-solo]'); // Solo wieder aus
    record('Mute/Solo-Buttons pro Spur schalten um', muteActive && soloActive);

    // ---- Master-Lautstaerke ----
    await page.$eval('#seq-master', (el) => { el.value = '55'; el.dispatchEvent(new Event('input')); });
    await page.waitForTimeout(50);
    const masterLabel = await page.evaluate(() => document.getElementById('seq-master-value').textContent);
    record('Master-Lautstaerke-Regler aktualisiert Anzeige', masterLabel === '55', `Wert: ${masterLabel}`);

    // ---- Sequencer-Pattern-Persistenz (localStorage-Entwurf ueberlebt Reload) ----
    await page.waitForTimeout(200);
    await page.reload({ waitUntil: 'load' });
    await page.click('.tab-btn[data-tab="create"]');
    await page.waitForTimeout(200);
    const draftRestored = await page.evaluate(() => {
      const rows = document.querySelectorAll('.seq-row').length;
      const steps = document.querySelectorAll('.seq-row:nth-child(1) .seq-cell').length;
      const master = document.getElementById('seq-master').value;
      const stepsOn = Array.from(document.querySelectorAll('.seq-row:nth-child(1) .seq-cell[data-step="0"], .seq-row:nth-child(1) .seq-cell[data-step="4"]'))
        .every((c) => c.classList.contains('on'));
      return rows === 6 && steps === 32 && master === '55' && stepsOn;
    });
    record('Sequencer-Pattern bleibt nach Neuladen erhalten (Entwurf)', draftRestored);

    // ---- Sequencer: Abhoeren & Aufnehmen -> Speichern ----
    await page.click('#seq-record-btn');
    let seqSaveOk = true;
    try {
      await page.waitForSelector('#seq-save-panel:not(.hidden)', { timeout: 15000 });
    } catch (err) { seqSaveOk = false; }
    record('Sequencer: Abhoeren & Aufnehmen zeigt Save-Panel', seqSaveOk);

    if (seqSaveOk) {
      // ---- WAV-Export: als Standard vorausgewaehlt, erzeugt gueltige RIFF/WAVE-Datei ----
      const wavIsDefault = await page.evaluate(() => document.getElementById('seq-format').value === 'wav');
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        page.click('#seq-save-external')
      ]);
      const downloadPath = await download.path();
      const wavBuf = fs.readFileSync(downloadPath);
      const isValidWav = wavBuf.toString('ascii', 0, 4) === 'RIFF' && wavBuf.toString('ascii', 8, 12) === 'WAVE';
      record('WAV ist Standardformat & Export erzeugt gueltige WAV-Datei',
        wavIsDefault && isValidWav && download.suggestedFilename().endsWith('.wav'));

      // ---- MP3-Export: fuer unterwegs (Handy/Tablet/Auto/andere Player) ----
      await page.click('#seq-record-btn');
      await page.waitForSelector('#seq-save-panel:not(.hidden)', { timeout: 15000 });
      await page.selectOption('#seq-format', 'mp3');
      const [mp3Download] = await Promise.all([
        page.waitForEvent('download', { timeout: 20000 }),
        page.click('#seq-save-external')
      ]);
      const mp3Path = await mp3Download.path();
      const mp3Buf = fs.readFileSync(mp3Path);
      const isValidMp3 = mp3Buf.length > 0 && mp3Buf[0] === 0xff && (mp3Buf[1] & 0xe0) === 0xe0;
      record('MP3-Export erzeugt gueltige MPEG-Audiodatei',
        isValidMp3 && mp3Download.suggestedFilename().endsWith('.mp3'), `Groesse: ${mp3Buf.length} Bytes`);

      // Export leert Blob & Panel wieder - fuer den Bibliotheks-Test neu aufnehmen.
      await page.click('#seq-record-btn');
      await page.waitForSelector('#seq-save-panel:not(.hidden)', { timeout: 15000 });
      await page.selectOption('#seq-format', 'wav');
      await page.fill('#seq-name', 'Test-Musikstück');
      await page.click('#seq-save-internal');
      const libCount = await waitForCondition(async () => {
        const n = await page.evaluate(() => document.querySelectorAll('#library-list li:not(.empty)').length);
        return n >= 1 ? n : null;
      }, 5000) || 0;
      record('Musikstück in Bibliothek gespeichert', libCount >= 1, `Eintraege: ${libCount}`);
    }

    // ---- Globale Werkzeugleiste: spiegelt aktiven Tab & loest Aktionen aus ----
    const globalLabelsCreate = await page.evaluate(() => ({
      listen: document.getElementById('global-listen-btn').textContent,
      record: document.getElementById('global-record-btn').textContent
    }));
    await page.click('.tab-btn[data-tab="upload"]');
    await page.waitForTimeout(100);
    const globalLabelsUpload = await page.evaluate(() => ({
      listen: document.getElementById('global-listen-btn').textContent,
      record: document.getElementById('global-record-btn').textContent
    }));
    await page.click('.tab-btn[data-tab="create"]');
    await page.waitForTimeout(100);
    record('Globale Werkzeugleiste spiegelt Anhören/Aufnehmen als getrennte Optionen',
      globalLabelsCreate.listen.includes('Anhören') && globalLabelsCreate.record.includes('Aufnehmen') &&
      globalLabelsUpload.listen.includes('Anhören') && globalLabelsUpload.record.includes('Aufnehmen'));

    // ---- Globale "Öffnen"-Schaltfläche (Browser-Fallback: springt zur Bibliothek) ----
    await page.click('#global-open-btn');
    await page.waitForTimeout(400);
    const openFeedbackOk = await page.evaluate(() => {
      const toast = document.getElementById('toast');
      return !toast.classList.contains('hidden') && toast.textContent.includes('Browser');
    });
    record('Globale "Öffnen"-Schaltfläche zeigt Browser-Hinweis', openFeedbackOk);

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

    // ---- "Anhören" (nur abspielen) ist von "Aufnehmen" getrennt - kein Save-Panel danach ----
    await page.click('#mix-listen-btn');
    let listenTogglesToStop = true;
    try {
      await page.waitForFunction(() => document.getElementById('mix-listen-btn').textContent.includes('Stop'), { timeout: 5000 });
    } catch (err) { listenTogglesToStop = false; }
    await page.waitForFunction(() => document.getElementById('mix-listen-btn').textContent.includes('Anhören'), { timeout: 15000 });
    const savePanelStillHidden = await page.evaluate(() => document.getElementById('mix-save-panel').classList.contains('hidden'));
    record('"Anhören" spielt nur ab - kein Save-Panel, getrennt von "Aufnehmen"',
      listenTogglesToStop && savePanelStillHidden);

    await page.click('#mix-record-btn');
    let mixSaveOk = true;
    try {
      await page.waitForSelector('#mix-save-panel:not(.hidden)', { timeout: 15000 });
    } catch (err) { mixSaveOk = false; }
    record('Mix: Abhoeren & Aufnehmen zeigt Save-Panel', mixSaveOk);

    if (mixSaveOk) {
      await page.click('#mix-save-internal');
      const libCount = await waitForCondition(async () => {
        const n = await page.evaluate(() => document.querySelectorAll('#library-list li:not(.empty)').length);
        return n >= 2 ? n : null;
      }, 5000) || 0;
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
