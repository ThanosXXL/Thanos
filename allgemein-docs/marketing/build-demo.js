// Demo-Video (1920x1080): Intro-Karte + echte App-Tour (Cursor, Untertitel) + Outro-Karte,
// Hintergrundmusik aus build/samples/demo-musik.mp3 in exakt gleicher Länge.
// Aufruf: NODE_PATH=$(npm root -g) node build-demo.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { url, orb, page, captureFrames, encode } = require('./lib');

const FPS = 30;
const W = 1920, H = 1080;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-'));
const APP = 'file://' + path.resolve(__dirname, '../renderer/index.html');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const ff = (...args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });

const card = (kind) => {
  const a = (name, d, dur, ease = 'cubic-bezier(.2,.9,.25,1)') => `animation:${name} ${dur}ms ${ease} ${d}ms both`;
  const css = `@keyframes up{from{opacity:0;transform:translateY(50px)}to{opacity:1;transform:none}}
  @keyframes pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
  @keyframes logoIn{from{opacity:0;transform:scale(.25) rotateY(160deg)}to{opacity:1;transform:none}}
  @keyframes sweep{from{transform:translateX(-500px)}to{transform:translateX(500px)}}
  @keyframes bg{from{transform:translate(0,0) scale(1)}to{transform:translate(60px,-60px) scale(1.2)}}
  @keyframes fade{0%{opacity:0}12%{opacity:1}86%{opacity:1}100%{opacity:0}}`;
  const o = (c, g, s, st, d) => orb(c, g, s, `${st};${a('pop', d, 700, 'cubic-bezier(.2,1.6,.3,1)')}`);
  const body = kind === 'intro'
    ? `<img class="logo3d" src="${url('renderer/img/logo.svg')}" style="position:absolute;left:420px;top:250px;width:520px;height:520px;${a('logoIn', 0, 1100, 'cubic-bezier(.2,1.3,.3,1)')}">
       <div style="position:absolute;left:420px;top:250px;width:520px;height:520px;clip-path:circle(50%);overflow:hidden"><div class="sweep" style="${a('sweep', 1100, 900, 'ease-in-out')}"></div></div>
       <div class="title" style="position:absolute;left:1010px;top:340px;font-size:112px;${a('up', 800, 800)}">Allgemein<br><span class="accent">Docs</span></div>
       <div class="sub" style="position:absolute;left:1010px;top:640px;font-size:44px;${a('up', 1300, 800)}">Demoversion · Praxisverwaltung<br>die Spaß macht.</div>
       ${o('red', 'heart', 120, 'left:200px;top:200px', 1500)}${o('green', 'check', 100, 'left:260px;top:780px', 1800)}${o('gold', 'bell', 90, 'right:140px;top:140px', 2100)}${o('blue', 'chart', 110, 'right:200px;bottom:140px', 2400)}`
    : `<img class="logo3d" src="${url('renderer/img/logo.svg')}" style="position:absolute;left:700px;top:90px;width:520px;height:520px;${a('logoIn', 0, 1000, 'cubic-bezier(.2,1.3,.3,1)')}">
       <div class="title" style="position:absolute;left:0;right:0;top:640px;text-align:center;font-size:104px;${a('up', 600, 800)}">Jetzt <span class="accent">entdecken</span></div>
       <div style="position:absolute;left:0;right:0;top:810px;text-align:center;${a('up', 1000, 800)}"><span class="pill cta" style="font-size:48px;padding:24px 60px">Allgemein Docs</span></div>
       <div class="sub" style="position:absolute;left:0;right:0;top:960px;text-align:center;font-size:38px;${a('up', 1300, 800)}">Praxis. Einfach. Digital.</div>
       ${o('red', 'heart', 120, 'left:380px;top:200px', 900)}${o('blue', 'doc', 110, 'right:380px;top:180px', 1100)}`;
  return page(`<div class="canvas" style="width:${W}px;height:${H}px"><div class="glow" style="width:800px;height:800px;background:#2f80ed;left:-100px;top:100px;animation:bg 4000ms ease-in-out both"></div>
    <div style="position:absolute;inset:0;animation:fade 3500ms linear both">${body}</div></div>`, css);
};

async function renderCard(browser, kind) {
  const f = path.join(TMP, kind + '.html');
  fs.writeFileSync(f, card(kind));
  const dir = path.join(TMP, kind + '-frames');
  await captureFrames(browser, f, { width: W, height: H, fps: FPS, duration: 3.5, dir });
  const out = path.join(TMP, kind + '.mp4');
  ff('-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), out);
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

async function recordTour(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: path.join(TMP, 'rec'), size: { width: W, height: H } } });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date(new Date().setHours(10, 15, 0, 0)));
  await p.addInitScript(() => {
    const key = '__store';
    window.docsAPI = {
      loadData: async () => JSON.parse(sessionStorage.getItem(key) || 'null'),
      saveData: async (d) => { sessionStorage.setItem(key, JSON.stringify(d)); return true; },
      exportBackup: async () => true, importBackup: async () => null
    };
    window.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = `#fc{position:fixed;left:0;top:0;width:34px;height:34px;z-index:9999;pointer-events:none;filter:drop-shadow(0 4px 6px rgba(0,0,0,.6));transition:none}
        .ripple{position:fixed;z-index:9998;width:20px;height:20px;margin:-10px;border-radius:50%;border:4px solid #4cc9f0;pointer-events:none;animation:rp .6s ease-out forwards}
        @keyframes rp{to{transform:scale(4);opacity:0}}
        #cap{position:fixed;left:50%;bottom:46px;transform:translate(-50%,20px);z-index:9997;padding:18px 40px;border-radius:999px;font:700 34px 'Open Sans',sans-serif;color:#fff;
          background:linear-gradient(180deg,rgba(60,120,230,.92),rgba(20,60,160,.92));border:2px solid rgba(255,255,255,.5);box-shadow:0 18px 40px rgba(0,0,0,.5),inset 0 2px 0 rgba(255,255,255,.55);opacity:0;transition:opacity .4s,transform .4s;white-space:nowrap}
        #cap.on{opacity:1;transform:translate(-50%,0)}`;
      document.head.appendChild(st);
      const c = document.createElement('div');
      c.id = 'fc';
      c.innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M3 2l7 19 3-8 8-3z" fill="#fff" stroke="#0b1f4b" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      document.body.appendChild(c);
      const cap = document.createElement('div');
      cap.id = 'cap';
      document.body.appendChild(cap);
      document.addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, true);
      document.addEventListener('mousedown', (e) => { const r = document.createElement('div'); r.className = 'ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 700); }, true);
      window.__cap = (t) => { cap.classList.remove('on'); if (t) setTimeout(() => { cap.textContent = t; cap.classList.add('on'); }, 350); };
    });
  });
  await p.goto(APP);
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    const st = JSON.parse(sessionStorage.getItem('__store'));
    const now = Date.now();
    st.wartezimmer = [
      { id: 'w2', patientId: st.patienten[4].id, terminId: null, seit: now - 9 * 60000, status: 'wartet' },
      { id: 'w4', patientId: st.patienten[3].id, terminId: null, seit: now - 3 * 60000, status: 'wartet' }
    ];
    sessionStorage.setItem('__store', JSON.stringify(st));
  });
  await p.reload();
  await p.waitForTimeout(500);

  const cap = (t) => p.evaluate((x) => window.__cap(x), t);
  const hold = (ms) => p.waitForTimeout(ms);
  const click = async (sel, opts = {}) => {
    const loc = p.locator(sel).first();
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await p.mouse.move(x, y, { steps: 28 });
    await hold(280);
    await p.mouse.click(x, y);
    await hold(opts.after ?? 600);
  };

  await p.mouse.move(1500, 800);
  await cap('Ihr Praxistag auf einen Blick'); await hold(2800);
  await cap('Karte einlesen – Patient wird sofort erkannt');
  await click('.nav-item >> text=Karte & E-Rezept', { after: 700 });
  await click('.view .btn.primary >> text=Karte einlesen', { after: 3600 });
  await cap('E-Rezept direkt auf der Karte ausstellen');
  await click('text=E-Rezept ausstellen', { after: 900 });
  await click('.modal button[type=submit]', { after: 3600 });
  await p.keyboard.press('Escape'); await hold(500);
  await click('text=Akte öffnen', { after: 900 });
  await cap('Patientenakte mit Textbausteinen');
  await click('.tab >> text=Karteikarte');
  await click('.chip >> nth=0', { after: 450 }); await click('.chip >> nth=2', { after: 450 });
  await click('text=Eintrag speichern', { after: 1200 });
  await cap('Laborergebnisse mit Ampel und Verlauf');
  await click('.nav-item >> text=Laborergebnisse', { after: 900 });
  await click('.item.clickable >> nth=0', { after: 3000 });
  await p.keyboard.press('Escape'); await hold(400);
  await cap('Medikamente als E-Rezept – mehrere auf einmal');
  await click('.nav-item span:text-is("E-Rezept")', { after: 900 });
  await click('.med-pick >> nth=0', { after: 500 });
  await click('.med-pick >> nth=1', { after: 500 });
  await click('.actions-row .btn.primary', { after: 3800 });
  await p.keyboard.press('Escape'); await hold(500);
  await cap('Papierrezept – direkt aus der Medikation');
  await click('.nav-item >> text=Rezepte', { after: 700 });
  await click('.view .btn.primary >> text=Rezept ausstellen', { after: 900 });
  await p.selectOption('select[name=art]', 'p'); await hold(500);
  await click('.modal button[type=submit]', { after: 2800 });
  await p.keyboard.press('Escape'); await hold(400);
  await cap('Krankmeldung – digital an Krankenkasse & Arbeitgeber');
  await click('.nav-item >> text=Krankmeldung', { after: 700 });
  await click('.view .btn.primary >> text=Krankmeldung erstellen', { after: 900 });
  await p.locator('.modal select').last().selectOption('nein'); await hold(600);
  await click('.modal button[type=submit]', { after: 1800 });
  await click('.au-digital .btn', { after: 3800 });
  await p.keyboard.press('Escape'); await hold(400);
  await cap('Überweisung an Fachärzte');
  await click('.nav-item >> text=Überweisungen', { after: 700 });
  await click('.view .btn.primary >> text=Überweisung erstellen', { after: 900 });
  await click('.modal button[type=submit]', { after: 2800 });
  await p.keyboard.press('Escape'); await hold(400);
  await cap('Wartezimmer mit Live-Wartezeit');
  await click('.nav-item >> text=Wartezimmer', { after: 1500 });
  await click('text=Aufrufen >> nth=0', { after: 1600 });
  await cap('Vorsorge & Recall – nie wieder etwas vergessen');
  await click('.nav-item >> text=Vorsorge', { after: 2600 });
  await cap('Auswertung – Ihre Praxis in Zahlen');
  await click('.nav-item >> text=Auswertung', { after: 2800 });
  await cap('Globale Suche mit Strg + K');
  await hold(500); await p.keyboard.press('Control+k'); await hold(400);
  await p.keyboard.type('schn', { delay: 220 }); await hold(1800);
  await p.keyboard.press('Escape');
  await cap(''); await hold(500);
  await ctx.close();
  const vid = fs.readdirSync(path.join(TMP, 'rec')).find((f) => f.endsWith('.webm'));
  const out = path.join(TMP, 'tour.mp4');
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(TMP, 'rec', vid)]).toString());
  ff('-i', path.join(TMP, 'rec', vid), '-vf', `scale=${W}:${H}:flags=lanczos,fps=${FPS},fade=t=in:st=0:d=0.5,fade=t=out:st=${(dur - 0.5).toFixed(2)}:d=0.5,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', out);
  return out;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const intro = await renderCard(browser, 'intro');
  const tour = await recordTour(browser);
  const outro = await renderCard(browser, 'outro');
  await browser.close();
  const list = path.join(TMP, 'list.txt');
  fs.writeFileSync(list, [intro, tour, outro].map((f) => `file '${f}'`).join('\n'));
  const joined = path.join(TMP, 'joined.mp4');
  ff('-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined);
  const duration = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=duration', '-of', 'csv=p=0', joined]).toString());
  const out = path.resolve(__dirname, '../renderer/media/allgemein-docs-demo.mp4');
  encode({ inputArgs: ['-i', joined], duration: Math.round(duration * 1000) / 1000, out, fps: FPS });
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('Demo fertig:', out, duration.toFixed(2) + ' s');
})();
