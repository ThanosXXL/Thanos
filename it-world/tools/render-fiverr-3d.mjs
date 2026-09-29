// Rendert die 5 Fiverr-Galeriebilder im 3D-/Hochglanz-Stil (marketing/output/fiverr-3d-*.png, 1280×769 @2x):
// startet die App mit Demo-Daten, nimmt Screenshots auf (Desktop, Tablet, Handy) und rendert
// die Vorlagen marketing/fiverr-3d-*.html. Benötigt Playwright + Chromium.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MKT = path.join(ROOT, 'marketing');
const SHOTS = path.join(MKT, 'screens', 'demo');
const PORT = 8196;
const BASE = `http://localhost:${PORT}`;

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('Playwright fehlt: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const tmp = mkdtempSync(path.join(tmpdir(), 'itw-3d-'));
const server = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
  env: { ...process.env, PORT: String(PORT), DATA_FILE: path.join(tmp, 'data.json'), DEMO_MODE: 'true', NODE_ENV: 'development' },
  stdio: 'ignore',
});
const exited = new Promise(r => server.once('exit', r));

try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${BASE}/healthz`)).ok) break; } catch { /* Server startet noch */ }
    await new Promise(r => setTimeout(r, 200));
  }
  const launchOpts = { args: ['--allow-file-access-from-files'] };
  if (process.env.CHROMIUM_PATH) launchOpts.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(launchOpts);

  // --- Screenshots ---
  mkdirSync(SHOTS, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const desk = await ctx.newPage();
  await desk.goto(`${BASE}/login`);
  await desk.fill('#email', 'admin@it-world.local');
  await desk.fill('#password', 'ItWorld-Admin-2026');
  await desk.click('#loginBtn');
  await desk.waitForURL(`${BASE}/`);
  for (const r of ['overview', 'monitoring', 'tickets', 'deployments', 'users']) {
    await desk.goto(`${BASE}/#/${r}`);
    await desk.waitForTimeout(1200);
    await desk.screenshot({ path: path.join(SHOTS, `${r}.png`) });
  }
  const cookies = await ctx.cookies();
  for (const [name, width, height] of [['tablet', 820, 1180], ['mobile', 390, 844]]) {
    const c = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
    await c.addCookies(cookies);
    const p = await c.newPage();
    await p.goto(`${BASE}/#/overview`);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(SHOTS, `${name}.png`) });
    await c.close();
  }
  await ctx.close();

  // --- Vorlagen rendern ---
  mkdirSync(path.join(MKT, 'output'), { recursive: true });
  const templates = readdirSync(MKT).filter(f => /^fiverr-3d-\d.*\.html$/.test(f)).sort();
  for (const file of templates) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 769 }, deviceScaleFactor: 2 });
    await p.goto(pathToFileURL(path.join(MKT, file)).href);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(1500);
    const out = path.join(MKT, 'output', file.replace(/\.html$/, '.png'));
    await p.screenshot({ path: out });
    console.log(`✔ ${path.relative(ROOT, out)}`);
    await p.close();
  }
  await browser.close();
} finally {
  server.kill('SIGTERM');
  await exited;
  rmSync(tmp, { recursive: true, force: true });
}
