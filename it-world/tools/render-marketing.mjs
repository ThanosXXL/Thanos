// Erzeugt die Fiverr-/Marketing-Grafiken (marketing/output/*.png):
//  1. startet die App mit frischen Demo-Daten auf einem temporären Port,
//  2. nimmt Screenshots der wichtigsten Seiten auf (marketing/screens/),
//  3. rendert die HTML-Vorlagen in marketing/ zu PNG.
// Benötigt Playwright + Chromium (npm i -D playwright && npx playwright install chromium).
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MKT = path.join(ROOT, 'marketing');
const PORT = 8199;
const BASE = `http://localhost:${PORT}`;

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('Playwright fehlt: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const tmp = mkdtempSync(path.join(tmpdir(), 'itw-mkt-'));
const server = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
  env: { ...process.env, PORT: String(PORT), DATA_FILE: path.join(tmp, 'data.json'), DEMO_MODE: 'true', NODE_ENV: 'development' },
  stdio: 'inherit',
});
const exited = new Promise(r => server.once('exit', r));
const stop = async () => { server.kill('SIGTERM'); await exited; rmSync(tmp, { recursive: true, force: true }); };

try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${BASE}/healthz`)).ok) break; } catch { /* Server startet noch */ }
    await new Promise(r => setTimeout(r, 200));
  }
  const launchOpts = { args: ['--allow-file-access-from-files'] };
  if (process.env.CHROMIUM_PATH) launchOpts.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(launchOpts);

  // --- Screenshots der App ---
  mkdirSync(path.join(MKT, 'screens'), { recursive: true });
  async function login(page) {
    await page.goto(`${BASE}/login`);
    await page.fill('#email', 'admin@it-world.local');
    await page.fill('#password', 'ItWorld-Admin-2026');
    await page.click('#loginBtn');
    await page.waitForURL(`${BASE}/`);
  }
  const desk = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await login(desk);
  for (const r of ['overview', 'monitoring', 'tickets', 'deployments', 'users']) {
    await desk.goto(`${BASE}/#/${r}`);
    await desk.waitForTimeout(1200);
    await desk.screenshot({ path: path.join(MKT, 'screens', `${r}.png`) });
  }
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await login(mob);
  await mob.waitForTimeout(1200);
  await mob.screenshot({ path: path.join(MKT, 'screens', 'mobile-overview.png') });

  // --- Vorlagen rendern ---
  mkdirSync(path.join(MKT, 'output'), { recursive: true });
  const templates = [
    ['fiverr-thumbnail', 1280, 769],
    ['fiverr-gallery-features', 1280, 769],
    ['fiverr-gallery-security', 1280, 769],
    ['it-world-logo', 1024, 1024],
  ];
  for (const [name, width, height] of templates) {
    const p = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    await p.goto(pathToFileURL(path.join(MKT, `${name}.html`)).href);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(MKT, 'output', `${name}.png`) });
    console.log(`✔ marketing/output/${name}.png`);
    await p.close();
  }
  await browser.close();
} finally {
  await stop();
}
