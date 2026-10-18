// Baut das Demovideo: Szenen (HTML → 4K-PNG) + Ken-Burns + Überblendungen + Hintergrundmusik in exakt gleicher Länge.
// Aufruf: node tools/build-video.js   (benötigt Playwright, ffmpeg/ffprobe)
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const BASE = path.resolve(__dirname, '..');
const ROOT = path.resolve(BASE, '..');
const WORK = process.env.WORK_DIR || '/tmp/itw-video';
const MUSIC = path.join(BASE, 'assets', 'lounge-band-1.mp3');
const OUT = path.join(BASE, 'IT-WORLD-Compliance-Assistent-Demovideo.mp4');
const FONT = (f) => 'file://' + path.join(ROOT, 'renderer', 'fonts', f);
const LOGO = 'file://' + path.join(ROOT, 'build', 'icon.png');
const FPS = 30, XF = 18; // Überblendung 0,6 s

const probe = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).toString());

const CSS = `
@font-face{font-family:'Open Sans';font-weight:400;src:url('${FONT('OpenSans-Regular.ttf')}')}
@font-face{font-family:'Open Sans';font-weight:700;src:url('${FONT('OpenSans-Bold.ttf')}')}
*{box-sizing:border-box;margin:0}
body{width:1920px;height:1080px;overflow:hidden;font-family:'Open Sans','Segoe UI',sans-serif;color:#f3e6c8;
 background:radial-gradient(1100px 700px at 75% 20%,rgba(227,185,76,.22),transparent 70%),radial-gradient(900px 600px at 0% 100%,rgba(184,134,43,.16),transparent 70%),#050403;position:relative}
.gold{color:#f7dc84;text-shadow:0 2px 0 #d9a93e,0 4px 0 #c0912f,0 6px 0 #a67820,0 8px 0 #8c6218,0 10px 0 #6f4b10,0 14px 14px rgba(0,0,0,.7),0 0 40px rgba(227,185,76,.4)}
.tile{background:#000;border:2px solid rgba(240,200,100,.6);border-radius:26px;overflow:hidden;box-shadow:0 10px 0 #040302,0 22px 46px rgba(0,0,0,.7),0 0 60px rgba(227,185,76,.3)}
.tile img{display:block;width:100%;height:100%}
.pill{display:inline-block;padding:10px 26px;border-radius:999px;font-weight:700;font-size:30px;color:#2a1b04;border:2px solid #ffe9a3;
 background:linear-gradient(180deg,#fff0b0,#f0cc66 32%,#c4912f 50%,#a87a22 52%,#dcae45 80%,#f4d478);box-shadow:inset 0 2px 0 #fff8d6,0 6px 0 #6b4a12,0 14px 24px rgba(0,0,0,.55)}
.copy{position:absolute;left:0;right:0;bottom:26px;text-align:center;font-size:20px;color:#b5a27a;letter-spacing:.4px}
`;

const scenes = [
  { kind: 'intro', frames: 135 },
  { kind: 'feat', frames: 122, img: '01-uebersicht', t: 'Ihr Compliance-Stand<br>auf einen Blick', b: ['Erfüllungsgrad je Regelwerk', 'Nächste Schritte und Termine', 'Nachweisquote im Blick'] },
  { kind: 'feat', frames: 122, img: '02-nis2-check', t: 'NIS2-Betroffenheit<br>prüfen', b: ['Sektor und Größe auswerten', '57 Anforderungen mit Hilfetexten', 'Rechtsgrundlagen im Blick'] },
  { kind: 'feat', frames: 122, img: '04-anforderung-dialog', t: 'Nachweise und<br>Fristen je Anforderung', b: ['Status, Verantwortliche, Fälligkeit', 'Nachweis-Datei verknüpfen', 'Automatische Wiedervorlage'] },
  { kind: 'feat', frames: 122, img: '11-vorfaelle', t: 'Meldefristen laufen<br>automatisch mit', b: ['NIS2: 24 Std. · 72 Std. · 1 Monat', 'DSGVO: 72 Stunden', 'Live-Countdown je Vorfall'] },
  { kind: 'feat', frames: 122, img: '06-vvt', t: 'Register und<br>Vorlagen', b: ['Verarbeitungsverzeichnis', 'Dienstleister und AV-Verträge', 'Anfragen, Schulungen, Dokumentvorlagen'] },
  { kind: 'feat', frames: 121, img: '19-sperrbildschirm', t: 'Verschlüsselt und<br>komplett offline', b: ['AES-256, Passwort und Auto-Sperre', 'Kein Netzwerk, keine Cloud', 'Ihre Daten bleiben bei Ihnen'] },
  { kind: 'outro', frames: 150 }
];

function sceneHtml(s) {
  if (s.kind === 'intro') {
    return `<html><head><style>${CSS}</style></head><body>
      <div class="tile" style="position:absolute;left:560px;top:30px;width:800px;height:800px"><img src="${LOGO}"></div>
      <div style="position:absolute;left:0;right:0;top:850px;text-align:center">
        <div class="gold" style="font-size:78px;font-weight:700;letter-spacing:1px">Compliance-Assistent</div>
        <div style="font-size:36px;letter-spacing:6px;margin-top:22px;color:#f3e6c8">NIS2 · DSGVO · IT-SICHERHEIT</div></div></body></html>`;
  }
  if (s.kind === 'outro') {
    return `<html><head><style>${CSS}</style></head><body>
      <div class="tile" style="position:absolute;left:150px;top:150px;width:780px;height:780px"><img src="${LOGO}"></div>
      <div style="position:absolute;left:1020px;top:210px;width:800px">
        <div class="gold" style="font-size:70px;font-weight:700;line-height:1.1">IT-WORLD<br>Compliance-Assistent</div>
        <div style="font-size:38px;margin:34px 0 40px;line-height:1.5">Checklisten · Nachweise · Fristen<br>für NIS2, DSGVO und IT-Sicherheit</div>
        <div style="display:flex;gap:18px"><span class="pill">Basic</span><span class="pill">Standard</span><span class="pill">Premium</span></div>
        <div style="font-size:26px;color:#b5a27a;margin-top:44px">Mit PDF-Benutzerhandbuch · Läuft offline auf Windows, macOS und Linux</div></div>
      <div class="copy">© 2026 IT-WORLD · Alle Rechte vorbehalten · Vervielfältigung und Weitergabe untersagt · Orientierungshilfe, keine Rechtsberatung</div></body></html>`;
  }
  const img = 'file://' + path.join(BASE, 'screens', s.img + '.png');
  return `<html><head><style>${CSS}
   .win{position:absolute;left:590px;top:140px;width:1280px;height:800px;border-radius:18px;overflow:hidden;border:2px solid rgba(240,200,100,.55);box-shadow:0 12px 0 #040302,0 30px 70px rgba(0,0,0,.75),0 0 80px rgba(227,185,76,.22)}
   .win img{width:1280px;height:800px;display:block}
   li{list-style:none;font-size:29px;margin-bottom:16px;padding-left:44px;position:relative;line-height:1.3}
   li:before{content:'✔';position:absolute;left:0;color:#f0cc66;font-weight:700}
  </style></head><body>
   <div class="tile" style="position:absolute;left:50px;top:60px;width:230px;height:230px"><img src="${LOGO}"></div>
   <div style="position:absolute;left:50px;top:340px;width:520px">
     <div class="gold" style="font-size:50px;font-weight:700;line-height:1.15;margin-bottom:34px">${s.t}</div>
     <ul>${s.b.map((x) => `<li>${x}</li>`).join('')}</ul></div>
   <div class="win"><img src="${img}"></div>
   <div class="copy" style="left:0;right:0;text-align:left;padding-left:50px;bottom:36px;font-size:18px">© 2026 IT-WORLD · Alle Rechte vorbehalten · Darstellung mit fiktiven Beispieldaten</div></body></html>`;
}

(async () => {
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(WORK, { recursive: true });
  const dur = probe(MUSIC);
  const total = scenes.reduce((n, s) => n + s.frames, 0) - (scenes.length - 1) * XF;
  console.log('Musik:', dur.toFixed(3), 's · Video:', (total / FPS).toFixed(3), 's (', total, 'Frames )');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  for (let i = 0; i < scenes.length; i++) {
    const f = path.join(WORK, `scene${i}.html`);
    fs.writeFileSync(f, sceneHtml(scenes[i]));
    await page.goto('file://' + f);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(WORK, `scene${i}.png`) });
  }
  await browser.close();

  // ffmpeg: Ken-Burns je Szene, Überblendungen, Musik exakt auf Videolänge
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  scenes.forEach((s, i) => args.push('-i', path.join(WORK, `scene${i}.png`)));
  args.push('-i', MUSIC);
  let fc = '';
  scenes.forEach((s, i) => {
    const D = s.frames;
    const z = i % 2 === 0 ? `1+0.045*on/${D}` : `1.045-0.045*on/${D}`;
    fc += `[${i}:v]zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${D}:s=1920x1080:fps=${FPS},format=yuv420p,setsar=1[v${i}];`;
  });
  let acc = 0, last = 'v0';
  for (let i = 1; i < scenes.length; i++) {
    acc += scenes[i - 1].frames - XF;
    const out = i === scenes.length - 1 ? 'vx' : `x${i}`;
    fc += `[${last}][v${i}]xfade=transition=fade:duration=${XF / FPS}:offset=${(acc / FPS).toFixed(4)}[${out}];`;
    last = out;
  }
  const vend = total / FPS;
  fc += `[vx]fade=t=in:st=0:d=0.5,fade=t=out:st=${(dur - 0.7).toFixed(3)}:d=0.65[vout];`;
  fc += `[${scenes.length}:a]atrim=0:${dur.toFixed(5)},afade=t=in:st=0:d=0.4,afade=t=out:st=${(dur - 1.6).toFixed(3)}:d=1.5[aout]`;
  args.push('-filter_complex', fc, '-map', '[vout]', '-map', '[aout]', '-t', dur.toFixed(5),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-movflags', '+faststart', OUT);
  console.log('ffmpeg …');
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  console.log('Fertig:', OUT);
  for (const sel of ['v:0', 'a:0']) console.log(sel, execFileSync('ffprobe', ['-v', 'error', '-select_streams', sel, '-show_entries', 'stream=codec_name,duration,width,height', '-of', 'csv=p=0', OUT]).toString().trim());
  console.log('Container:', probe(OUT).toFixed(3), 's  (Musik: ' + dur.toFixed(3) + ' s)');
})();
