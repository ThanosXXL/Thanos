#!/usr/bin/env node
// Baut Gig-Titelbild (PNG) und Demovideo (MP4, Musik in gleicher Länge) aus config.js.
//   node build.cjs                 -> alles, DE + EN, Ausgabe nach ../
//   node build.cjs de --cover      -> nur deutsches Titelbild
//   node build.cjs en --video      -> nur englisches Video
//   node build.cjs all --out /pfad -> anderes Ausgabeverzeichnis
// Benötigt: Node 18+, `playwright` (mit Chromium) und `ffmpeg` im PATH.
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const langArg = args.find((a) => ['de', 'en', 'all'].includes(a)) || 'all';
const langs = langArg === 'all' ? ['de', 'en'] : [langArg];
const onlyCover = args.includes('--cover'), onlyVideo = args.includes('--video');
const out = path.resolve(opt('--out') || path.join(__dirname, '..'));
const music = path.resolve(opt('--music') || path.join(__dirname, '..', 'musik', 'lounge-band-1.mp3'));
const FPS = 30, DURATION = 890 / FPS; // 890 Bilder = 29,667 s (gleich lang wie die 29,65-s-Musik)
const frames = +process.env.DEBUG_FRAMES || 890;
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  for (const lang of langs) {
    if (!onlyVideo) {
      const pg = await browser.newPage({ viewport: { width: 1280, height: 769 }, deviceScaleFactor: 2 });
      await pg.goto('file://' + path.join(__dirname, 'cover.html') + '?lang=' + lang);
      await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(1200);
      await pg.screenshot({ path: path.join(out, `gig-titelbild-react-nextjs-${lang}.png`) });
      await pg.close(); console.log('Titelbild', lang);
    }
    if (!onlyCover) {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vid-' + lang + '-'));
      const pg = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      await pg.goto('file://' + path.join(__dirname, 'video.html') + '?lang=' + lang);
      await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(800);
      for (let f = 0; f < frames; f++) {
        await pg.evaluate((t) => render(t), f / FPS);
        await pg.screenshot({ path: path.join(tmp, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
      }
      await pg.close();
      const d = (frames / FPS).toFixed(4);
      const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.jpg'), '-i', music,
        '-filter_complex', `[1:a]afade=t=in:d=0.6,afade=t=out:st=${(d - 1.4).toFixed(2)}:d=1.4,apad,atrim=duration=${d}[a]`,
        '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
        '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', d, path.join(out, `IT-World-ReactNextJS-Demo-${lang}.mp4`)], { stdio: 'inherit' });
      fs.rmSync(tmp, { recursive: true, force: true });
      if (r.status !== 0) throw new Error('ffmpeg fehlgeschlagen');
      console.log('Video', lang);
    }
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
