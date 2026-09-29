// Rendert das Demo-/Promo-Video (marketing/output/it-world-demo.mp4, 1920×1080, 30 fps):
//  1. startet die App mit frischen Demo-Daten und nimmt Screenshots auf (marketing/screens/demo/),
//  2. setzt marketing/demo-video.html Bild für Bild über renderAt(t) und fotografiert jeden Frame,
//  3. baut mit ffmpeg das MP4 – exakt so lang wie die Musik (marketing/audio/demo-music.mp3).
// Benötigt Playwright + Chromium sowie ffmpeg/ffprobe (PATH oder FFMPEG_PATH/FFPROBE_PATH).
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MKT = path.join(ROOT, 'marketing');
const MUSIC = process.env.MUSIC_PATH || path.join(MKT, 'audio', 'demo-music.mp3');
const OUT = path.join(MKT, 'output', 'it-world-demo.mp4');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';
const FPS = 30;
const PORT = 8197;
const BASE = `http://localhost:${PORT}`;

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('Playwright fehlt: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

// Videolänge = Musiklänge
const probe = spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', MUSIC], { encoding: 'utf8' });
const DURATION = parseFloat(probe.stdout);
if (!(DURATION > 0)) { console.error(`Musik nicht lesbar: ${MUSIC}\n${probe.stderr || probe.error || ''}`); process.exit(1); }
const FRAMES = Math.round(DURATION * FPS);
console.log(`Musik: ${DURATION.toFixed(2)} s → ${FRAMES} Frames`);

const tmp = mkdtempSync(path.join(tmpdir(), 'itw-demo-'));
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

  // ---------- 1. App-Screenshots ----------
  const shots = path.join(MKT, 'screens', 'demo');
  mkdirSync(shots, { recursive: true });
  async function login(page) {
    await page.goto(`${BASE}/login`);
    await page.screenshot({ path: path.join(shots, 'login.png') });
    await page.fill('#email', 'admin@it-world.local');
    await page.fill('#password', 'ItWorld-Admin-2026');
    await page.click('#loginBtn');
    await page.waitForURL(`${BASE}/`);
  }
  const desk = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await login(desk);
  for (const r of ['overview', 'monitoring', 'incidents', 'tickets', 'deployments', 'users', 'audit']) {
    await desk.goto(`${BASE}/#/${r}`);
    await desk.waitForTimeout(1200);
    await desk.screenshot({ path: path.join(shots, `${r}.png`) });
  }
  await desk.goto(`${BASE}/#/incidents`);
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await mob.context().addCookies(await desk.context().cookies());
  await mob.goto(`${BASE}/#/overview`);
  await mob.waitForTimeout(1500);
  await mob.screenshot({ path: path.join(shots, 'mobile.png'), fullPage: true });
  await desk.close(); await mob.close();

  // ---------- 2. Frames rendern ----------
  const frames = path.join(tmp, 'frames');
  mkdirSync(frames);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(`${pathToFileURL(path.join(MKT, 'demo-video.html')).href}?d=${DURATION}`);
  await page.evaluate(() => window.demoReady);
  await page.waitForTimeout(500);
  const started = Date.now();
  for (let f = 0; f < FRAMES; f++) {
    await page.evaluate((t) => window.renderAt(t), f / FPS);
    await page.screenshot({ path: path.join(frames, `${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 });
    if (f % 90 === 0) console.log(`  Frame ${f}/${FRAMES}  (${Math.round((Date.now() - started) / 1000)} s)`);
  }
  await browser.close();

  // ---------- 3. Encodieren: Bild + Musik, gleiche Länge ----------
  mkdirSync(path.dirname(OUT), { recursive: true });
  const fadeOut = Math.max(0, DURATION - 1.2).toFixed(2);
  const r = spawnSync(FFMPEG, ['-y', '-framerate', String(FPS), '-i', path.join(frames, '%05d.jpg'), '-i', MUSIC,
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-af', `afade=t=in:d=0.2,afade=t=out:st=${fadeOut}:d=1.2`, '-c:a', 'aac', '-b:a', '192k',
    '-t', DURATION.toFixed(3), '-movflags', '+faststart', OUT], { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg fehlgeschlagen:\n${(r.stderr || String(r.error)).slice(-2000)}`);
  console.log(`✔ ${path.relative(ROOT, OUT)}`);
} finally {
  server.kill('SIGTERM');
  await exited;
  rmSync(tmp, { recursive: true, force: true });
}
