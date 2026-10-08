// Gemeinsame Gestaltung für Instagram-Bilder, Reel und Demo-Video (3D-Hochglanz, Navy, Open Sans)
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const url = (p) => 'file://' + path.join(ROOT, p);
const shot = (n) => 'file://' + path.join(__dirname, 'shots', n + '.png');

const ICON = {
  cross: '<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" fill="#fff"/>',
  check: '<path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
  clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M12 7v5.5l3.5 2" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>',
  doc: '<path d="M6 3h9l4 4v14H6z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path d="M9 12h7M9 16h7" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  heart: '<path d="M12 20C5 15 3 11.5 3 8.8 3 6.5 4.8 5 7 5c2 0 3.5 1 5 3 1.5-2 3-3 5-3 2.2 0 4 1.5 4 3.8 0 2.7-2 6.2-9 11.2z" fill="#fff"/>',
  chart: '<path d="M5 20V10M12 20V4M19 20v-7" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>'
};

const CSS = `
@font-face{font-family:'Open Sans';src:url('${url('renderer/fonts/OpenSans-Regular.ttf')}');font-weight:400}
@font-face{font-family:'Open Sans';src:url('${url('renderer/fonts/OpenSans-Bold.ttf')}');font-weight:700}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#071634;font-family:'Open Sans','Segoe UI',Arial,sans-serif;color:#fff}
.canvas{position:relative;width:100%;height:100%;overflow:hidden;
  background:radial-gradient(900px 700px at 85% -5%,#2d6be0 0%,transparent 60%),radial-gradient(800px 800px at -10% 105%,#123c9c 0%,transparent 60%),linear-gradient(160deg,#143a86,#0b1f4b 55%,#061330)}
.canvas::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.035) 0 2px,transparent 2px 90px);pointer-events:none}
.glow{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55;pointer-events:none}
.logo3d{filter:drop-shadow(0 30px 40px rgba(0,0,0,.55)) drop-shadow(0 0 60px rgba(76,201,240,.45))}
.title{font-weight:700;letter-spacing:-1px;line-height:1.04;text-shadow:0 6px 24px rgba(0,0,0,.45)}
.sub{color:rgba(255,255,255,.82);line-height:1.35}
.accent{background:linear-gradient(180deg,#bff1ff,#4cc9f0 60%,#2f9bf0);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 4px 12px rgba(76,201,240,.45))}
.stage{perspective:2000px}
.device{position:relative;border-radius:30px;padding:0;overflow:hidden;background:#06143a;
  border:3px solid transparent;background-clip:padding-box;
  box-shadow:0 0 0 3px rgba(255,255,255,.28),0 60px 100px rgba(0,0,0,.6),0 0 90px rgba(76,201,240,.28);
  transform-style:preserve-3d;-webkit-box-reflect:below 14px linear-gradient(transparent 72%,rgba(255,255,255,.22))}
.device .bar{height:34px;background:linear-gradient(180deg,#27427f,#14285c);display:flex;gap:9px;align-items:center;padding-left:18px}
.device .bar i{width:13px;height:13px;border-radius:50%;background:#ff7e86;box-shadow:inset 0 2px 3px rgba(255,255,255,.6)}
.device .bar i:nth-child(2){background:#ffd166}.device .bar i:nth-child(3){background:#5bf0a8}
.device img{display:block;width:100%}
.device::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.28) 0%,rgba(255,255,255,.06) 28%,transparent 42%);pointer-events:none}
.orb{position:absolute;border-radius:50%;display:grid;place-items:center;
  box-shadow:inset -10px -16px 30px rgba(0,0,0,.35),inset 8px 10px 22px rgba(255,255,255,.5),0 30px 40px rgba(0,0,0,.45)}
.orb::before{content:'';position:absolute;left:16%;top:8%;width:52%;height:34%;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,0));transform:rotate(-18deg)}
.orb svg{width:48%;height:48%;filter:drop-shadow(0 4px 3px rgba(0,0,0,.35));position:relative}
.pill{display:inline-flex;align-items:center;gap:12px;padding:14px 30px;border-radius:999px;font-weight:700;
  background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,.06));border:2px solid rgba(255,255,255,.4);
  box-shadow:0 16px 30px rgba(0,0,0,.35),inset 0 2px 0 rgba(255,255,255,.6);backdrop-filter:blur(6px)}
.pill.cta{background:linear-gradient(180deg,#7fdcff,#2f80ed 55%,#1b5fc9);border-color:rgba(255,255,255,.6)}
.foot{position:absolute;left:0;right:0;text-align:center;color:rgba(255,255,255,.75);font-weight:700;letter-spacing:.5px}
.sweep{position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.35) 50%,transparent 60%);mix-blend-mode:screen;pointer-events:none}
`;

const orb = (color, glyph, size, style = '') => {
  const grad = {
    blue: 'radial-gradient(circle at 35% 30%,#8fe3ff,#2a8cf0 45%,#0b3a9e)',
    red: 'radial-gradient(circle at 35% 30%,#ffa0aa,#ee2f4d 50%,#8a0f2a)',
    green: 'radial-gradient(circle at 35% 30%,#b8ffd9,#2fd88a 50%,#0a7a4a)',
    gold: 'radial-gradient(circle at 35% 30%,#fff1b8,#f2b632 50%,#9a6410)'
  }[color];
  return `<div class="orb" style="width:${size}px;height:${size}px;background:${grad};${style}"><svg viewBox="0 0 24 24">${ICON[glyph]}</svg></div>`;
};

const page = (body, extraCss = '') => `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${CSS}${extraCss}</style></head><body>${body}</body></html>`;

module.exports = { ROOT, url, shot, CSS, ICON, orb, page };

// ---- Video-Helfer -------------------------------------------------------
const { execFileSync } = require('child_process');
const MUSIC = path.join(ROOT, 'build', 'samples', 'demo-musik.mp3');

// Rendert deterministisch Bild für Bild: alle CSS-Animationen werden auf Zeit t gesetzt.
async function captureFrames(browser, htmlFile, { width, height, fps, duration, dir }) {
  const fs = require('fs');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto('file://' + htmlFile);
  await page.waitForTimeout(800);
  const total = Math.round(duration * fps);
  for (let i = 0; i < total; i++) {
    const t = (i / fps) * 1000;
    await page.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), t);
    await page.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 93 });
  }
  await page.close();
  return total;
}

// Kodiert Bilder/Video + Musik. Die Musik wird per -stream_loop wiederholt und exakt auf die
// Videolänge gekürzt (atrim), mit weichem Ein-/Ausblenden.
function encode({ video, music = MUSIC, duration, out, fps = 30, inputArgs }) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error', ...(inputArgs || ['-framerate', String(fps), '-i', video]),
    '-stream_loop', '-1', '-i', music,
    '-filter_complex', `[1:a]atrim=duration=${duration},asetpts=N/SR/TB,afade=t=in:st=0:d=1,afade=t=out:st=${(duration - 2).toFixed(3)}:d=2,volume=0.9[a]`,
    '-map', '0:v', '-map', '[a]', '-t', String(duration),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '192k', out];
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
}

module.exports.captureFrames = captureFrames;
module.exports.encode = encode;
module.exports.MUSIC = MUSIC;
