// Baut das animierte Demovideo: Jede Einstellung wird aus einer Animations-Zeitleiste (HTML/CSS, deterministisch
// pro Zeitpunkt) Frame für Frame gerendert und direkt an ffmpeg übergeben; die Hintergrundmusik bestimmt die Länge.
// Aufruf: node tools/build-video.js   (benötigt Playwright, ffmpeg/ffprobe; vorher tools/capture.js ausführen)
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const { once } = require('events');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const BASE = path.resolve(__dirname, '..');
const ROOT = path.resolve(BASE, '..');
const WORK = process.env.WORK_DIR || '/tmp/itw-video';
const MUSIC = path.join(BASE, 'assets', 'lounge-band-1.mp3');
const OUT = path.join(BASE, 'IT-WORLD-Compliance-Assistent-Demovideo.mp4');
const u = (p) => 'file://' + p;
const FONT = (f) => u(path.join(ROOT, 'renderer', 'fonts', f));
const LOGO = u(path.join(ROOT, 'build', 'icon.png'));
const FPS = 30, W = 1920, H = 1080;
const probe = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).toString());

const RECTS = JSON.parse(fs.readFileSync(path.join(BASE, 'screens', 'rects.json'), 'utf8'));
const shot = (n) => u(path.join(BASE, 'screens', n + '.png'));

// Szenen (Dauer in Sekunden, Überblendung 0,6 s zwischen den Szenen)
const XF = 0.6;
const scenes = [
  { kind: 'intro', dur: 4.5 },
  { kind: 'feat', dur: 4.067, img: '01-uebersicht', t: 'Ihr Compliance-Stand<br>auf einen Blick', b: ['Erfüllungsgrad je Regelwerk', 'Nächste Schritte und Termine', 'Nachweisquote im Blick'] },
  { kind: 'feat', dur: 4.067, img: '02-nis2-check', t: 'NIS2-Betroffenheit<br>prüfen', b: ['Sektor und Größe auswerten', '57 Anforderungen mit Hilfetexten', 'Rechtsgrundlagen im Blick'] },
  { kind: 'feat', dur: 4.067, img: '04-anforderung-dialog', t: 'Nachweise und<br>Fristen je Anforderung', b: ['Status, Verantwortliche, Fälligkeit', 'Nachweis-Datei verknüpfen', 'Automatische Wiedervorlage'] },
  { kind: 'feat', dur: 4.067, img: '11-vorfaelle', t: 'Meldefristen laufen<br>automatisch mit', b: ['NIS2: 24 Std. · 72 Std. · 1 Monat', 'DSGVO: 72 Stunden', 'Live-Countdown je Vorfall'] },
  { kind: 'feat', dur: 4.067, img: '06-vvt', t: 'Register und<br>Vorlagen', b: ['Verarbeitungsverzeichnis', 'Dienstleister und AV-Verträge', 'Anfragen, Schulungen, Vorlagen'] },
  { kind: 'feat', dur: 4.033, img: '19-sperrbildschirm', t: 'Verschlüsselt und<br>komplett offline', b: ['AES-256, Passwort und Auto-Sperre', 'Kein Netzwerk, keine Cloud', 'Ihre Daten bleiben bei Ihnen'] },
  { kind: 'outro', dur: 5.0 }
];
let acc = 0;
scenes.forEach((s) => { s.start = acc; s.end = acc + s.dur; acc += s.dur - XF; });
const TOTAL = scenes[scenes.length - 1].end;

const CSS = `
@font-face{font-family:'Open Sans';font-weight:400;src:url('${FONT('OpenSans-Regular.ttf')}')}
@font-face{font-family:'Open Sans';font-weight:700;src:url('${FONT('OpenSans-Bold.ttf')}')}
*{box-sizing:border-box;margin:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#050403}
body{font-family:'Open Sans','Segoe UI',sans-serif;color:#f3e6c8;position:relative}
.abs{position:absolute}
.gold{color:#f7dc84;text-shadow:0 2px 0 #d9a93e,0 4px 0 #c0912f,0 6px 0 #a67820,0 8px 0 #8c6218,0 10px 0 #6f4b10,0 14px 14px rgba(0,0,0,.7),0 0 40px rgba(227,185,76,.4)}
.tile{position:absolute;background:#000;border:2px solid rgba(240,200,100,.65);border-radius:26px;overflow:hidden;box-shadow:0 10px 0 #040302,0 22px 46px rgba(0,0,0,.7),0 0 60px rgba(227,185,76,.35)}
.tile img{display:block;width:100%;height:100%}
.tag{position:absolute;text-align:center;font-weight:700;text-transform:uppercase;color:#f7dc84;text-shadow:0 2px 0 #7a5518,0 4px 0 #3d2a0a,0 0 22px rgba(227,185,76,.55);white-space:nowrap}
.win{position:absolute;left:590px;top:140px;width:1280px;height:800px;border-radius:18px;overflow:hidden;border:2px solid rgba(240,200,100,.55);box-shadow:0 12px 0 #040302,0 30px 70px rgba(0,0,0,.75),0 0 80px rgba(227,185,76,.22);background:#000}
.zw{position:absolute;left:0;top:0;width:1280px;height:800px;transform-origin:50% 50%}
.zw img{width:1280px;height:800px;display:block}
.spot{position:absolute;border:4px solid #f7dc84;border-radius:12px;box-shadow:0 0 0 3000px rgba(0,0,0,.5),0 0 26px rgba(247,220,132,.9),inset 0 0 18px rgba(247,220,132,.35)}
.ripple{position:absolute;border:4px solid #fff0b0;border-radius:50%}
.pill{display:inline-block;padding:8px 24px;border-radius:999px;font-weight:700;font-size:28px;color:#2a1b04;border:2px solid #ffe9a3;background:linear-gradient(180deg,#fff0b0,#f0cc66 32%,#c4912f 50%,#a87a22 52%,#dcae45 80%,#f4d478);box-shadow:inset 0 2px 0 #fff8d6,0 5px 0 #6b4a12,0 12px 22px rgba(0,0,0,.55)}
.bul{position:absolute;left:50px;width:520px;font-size:29px;line-height:1.3;padding-left:46px}
.bul i{position:absolute;left:0;top:0;font-style:normal;color:#f0cc66;font-weight:700}
.card{position:absolute;width:270px;height:250px;border-radius:20px;border:2px solid rgba(240,200,100,.6);background:linear-gradient(180deg,#2a200f,#0d0905);box-shadow:inset 0 2px 0 rgba(255,236,170,.25),0 8px 0 #040302,0 20px 40px rgba(0,0,0,.65);text-align:center;padding:22px 14px}
.copy{position:absolute;left:0;right:0;text-align:center;color:#b5a27a}
`;

const PAGE_JS = `
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const seg=(u,a,b)=>clamp((u-a)/(b-a));
const ease={out:x=>1-Math.pow(1-x,3),inOut:x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2,back:x=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);}};
const mk=(tag,cls,parent,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;(parent||document.body).appendChild(e);return e;};
const S=CFG.scenes; const els=[];
const bg=mk('div','abs',document.body); bg.style.cssText='left:0;top:0;width:${W}px;height:${H}px';
const sparks=[]; for(let i=0;i<34;i++){const d=mk('div','abs',document.body);const r=6+(i*7%9);d.style.cssText='width:'+r+'px;height:'+r+'px;border-radius:50%;background:radial-gradient(circle,#fff0b0,#e3b94c 60%,transparent 70%)';sparks.push({d,seed:i,r});}
const NS='http://www.w3.org/2000/svg';
S.forEach((s,i)=>{
  const L=mk('div','abs',document.body); L.style.cssText='left:0;top:0;width:${W}px;height:${H}px'; const o={s,L};
  if(s.kind==='intro'){
    o.halo=mk('div','abs',L); o.halo.style.cssText='left:420px;top:-130px;width:1080px;height:1080px;border-radius:50%;filter:blur(30px);-webkit-mask-image:radial-gradient(closest-side,transparent 55%,#000 70%,transparent 100%);mask-image:radial-gradient(closest-side,transparent 55%,#000 70%,transparent 100%)';
    o.tile=mk('div','tile',L,'<img src="'+CFG.logo+'">'); o.tile.style.cssText='left:580px;top:20px;width:740px;height:740px';
    o.tag=mk('div','tag',L,'IT Solutions'); o.tag.style.cssText='left:0;width:${W}px;top:782px;font-size:62px;letter-spacing:16px';
    o.chars=[]; const t=mk('div','abs gold',L); t.style.cssText='left:0;width:${W}px;top:872px;text-align:center;font-size:80px;font-weight:700;letter-spacing:1px';
    'Compliance-Assistent'.split('').forEach(ch=>{const c=mk('span','',t,ch===' '?'&nbsp;':ch);c.style.display='inline-block';o.chars.push(c);});
    o.sub=mk('div','abs',L,'NIS2 · DSGVO · IT-SICHERHEIT'); o.sub.style.cssText='left:0;width:${W}px;top:985px;text-align:center;font-size:36px;letter-spacing:7px';
  } else if(s.kind==='feat'){
    o.tile=mk('div','tile',L,'<img src="'+CFG.logo+'">'); o.tile.style.cssText='left:50px;top:40px;width:230px;height:230px';
    o.tag=mk('div','tag',L,'IT Solutions'); o.tag.style.cssText='left:50px;width:230px;top:286px;font-size:23px;letter-spacing:4px';
    o.title=mk('div','abs gold',L,s.t); o.title.style.cssText='left:50px;top:352px;width:520px;font-size:50px;font-weight:700;line-height:1.15';
    o.buls=s.b.map((x,k)=>{const b=mk('div','bul',L,'<i>✔</i>'+x); b.style.top=(578+k*74)+'px'; return b;});
    o.win=mk('div','win',L); o.zw=mk('div','zw',o.win,'<img src="'+s.imgUrl+'">');
    const sc=1280/1440; const r=s.rect; o.tr={x:r.x*sc,y:r.y*sc,w:r.w*sc,h:r.h*sc};
    o.spot=mk('div','spot',o.zw); o.rip=mk('div','ripple',o.zw);
    const svg=document.createElementNS(NS,'svg'); svg.setAttribute('width','40'); svg.setAttribute('height','48'); svg.setAttribute('viewBox','0 0 24 34');
    svg.style.cssText='position:absolute;filter:drop-shadow(0 4px 6px rgba(0,0,0,.7)) drop-shadow(0 0 10px rgba(247,220,132,.8))';
    const p=document.createElementNS(NS,'path'); p.setAttribute('d','M2 2 L2 28 L9 21 L14 32 L19 30 L14 19 L23 19 Z'); p.setAttribute('fill','#fff'); p.setAttribute('stroke','#2a1b04'); p.setAttribute('stroke-width','2'); p.setAttribute('stroke-linejoin','round'); svg.appendChild(p); o.zw.appendChild(svg); o.cur=svg;
  } else {
    o.tile=mk('div','tile',L,'<img src="'+CFG.logo+'">'); o.tile.style.cssText='left:110px;top:60px;width:700px;height:700px';
    o.tag=mk('div','tag',L,'IT Solutions'); o.tag.style.cssText='left:110px;width:700px;top:784px;font-size:56px;letter-spacing:14px';
    o.title=mk('div','abs gold',L,'IT-WORLD<br>Compliance-Assistent'); o.title.style.cssText='left:930px;top:80px;width:920px;font-size:66px;font-weight:700;line-height:1.1';
    o.sub=mk('div','abs',L,'Checklisten · Nachweise · Fristen<br>für NIS2, DSGVO und IT-Sicherheit'); o.sub.style.cssText='left:930px;top:250px;width:920px;font-size:36px;line-height:1.45';
    o.cards=CFG.pkgs.map((p,k)=>{const c=mk('div','card',L,'<span class="pill">'+p.n+'</span><div class="pr" style="font-size:50px;font-weight:700;color:#f7dc84;margin:14px 0 4px"></div><div style="font-size:22px;line-height:1.35">'+p.d+'</div>'); c.style.left=(930+k*295)+'px'; c.style.top='450px'; c.pr=c.querySelector('.pr'); c.val=p.v; return c;});
    o.note=mk('div','abs',L,'Mit PDF-Benutzerhandbuch · Läuft offline auf Windows, macOS und Linux'); o.note.style.cssText='left:930px;top:735px;width:930px;font-size:26px;color:#b5a27a';
    o.copy=mk('div','copy',L,'© 2026 IT-WORLD · Alle Rechte vorbehalten · Vervielfältigung und Weitergabe untersagt · Orientierungshilfe, keine Rechtsberatung'); o.copy.style.cssText+=';bottom:26px;font-size:20px';
  }
  if(s.kind==='feat'){ const c=mk('div','copy',L,'© 2026 IT-WORLD · Alle Rechte vorbehalten · Darstellung mit fiktiven Beispieldaten'); c.style.cssText+=';left:50px;text-align:left;bottom:34px;font-size:18px'; }
  els.push(o);
});
const fade=mk('div','abs',document.body); fade.style.cssText='left:0;top:0;width:${W}px;height:${H}px;background:#000;pointer-events:none';
const fmt=n=>Math.round(n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.');

function render(t){
  bg.style.background='radial-gradient(1100px 700px at '+(72+9*Math.sin(t*.45))+'% '+(18+7*Math.cos(t*.33))+'%,rgba(227,185,76,.24),transparent 70%),radial-gradient(900px 600px at '+(6+5*Math.sin(t*.3))+'% '+(96+3*Math.cos(t*.4))+'%,rgba(184,134,43,.18),transparent 70%),#050403';
  sparks.forEach(p=>{const sp=26+(p.seed%7)*9; const y=${H}+40-((t*sp+p.seed*131)%(${H}+80)); const x=(p.seed*277%${W})+Math.sin(t*.8+p.seed)*26; p.d.style.transform='translate('+x+'px,'+y+'px)'; p.d.style.opacity=(.25+.35*Math.sin(t*2.2+p.seed*1.7)**2).toFixed(3);});
  els.forEach((o,i)=>{
    const s=o.s, u=t-s.start; const first=i===0, last=i===els.length-1;
    const op=(first?1:ease.out(seg(t,s.start,s.start+${XF})))*(last?1:1-ease.out(seg(t,s.end-${XF},s.end)));
    o.L.style.opacity=op.toFixed(3); o.L.style.display=op<=0.001?'none':'block'; if(op<=0.001) return;
    const pop=(el,a,b,f)=>{const p=seg(u,a,b); const e=ease.back(p); el.style.transform='scale('+(f?f(e):e)+')'; el.style.opacity=clamp(p*3).toFixed(3);};
    if(s.kind==='intro'){
      o.halo.style.background='conic-gradient(from '+(t*50)+'deg,rgba(255,240,176,.0),rgba(247,220,132,.9),rgba(255,240,176,.0) 35%,rgba(196,145,47,.8) 60%,rgba(255,240,176,.0))';
      o.halo.style.opacity=(.35+.25*Math.sin(t*2)).toFixed(3);
      const p=seg(u,.1,1.0); o.tile.style.transform='translateY('+(Math.sin(t*1.4)*6)+'px) scale('+(.55+.45*ease.back(p))+')'; o.tile.style.opacity=clamp(p*3).toFixed(3);
      const g=seg(u,.9,1.5); o.tag.style.opacity=g.toFixed(3); o.tag.style.transform='translateY('+((1-ease.out(g))*24)+'px)';
      o.chars.forEach((c,k)=>{const q=seg(u,1.3+k*.045,1.3+k*.045+.35); c.style.opacity=q.toFixed(3); c.style.transform='translateY('+((1-ease.out(q))*34)+'px)';});
      const sq=seg(u,2.5,3.1); o.sub.style.opacity=sq.toFixed(3); o.sub.style.transform='translateY('+((1-ease.out(sq))*20)+'px)';
    } else if(s.kind==='feat'){
      const p=seg(u,.05,.7); o.tile.style.transform='scale('+(.6+.4*ease.back(p))+')'; o.tile.style.opacity=clamp(p*3).toFixed(3);
      const g=seg(u,.4,.9); o.tag.style.opacity=g.toFixed(3);
      const tq=seg(u,.2,.9); o.title.style.opacity=tq.toFixed(3); o.title.style.transform='translateX('+((1-ease.out(tq))*-70)+'px)';
      o.buls.forEach((b,k)=>{const q=seg(u,1.0+k*.42,1.0+k*.42+.5); b.style.opacity=q.toFixed(3); b.style.transform='translateX('+((1-ease.out(q))*-50)+'px)';});
      const w=seg(u,.15,1.1), we=ease.out(w);
      o.win.style.opacity=clamp(w*2.5).toFixed(3);
      o.win.style.transform='perspective(2200px) translateX('+((1-we)*220)+'px) rotateY('+((1-we)*-12)+'deg) scale('+(.9+.1*we)+')';
      const dur=s.dur, zm=1+.035*seg(u,1.0,dur); o.zw.style.transform='scale('+zm.toFixed(4)+')';
      // Spotlight: schrumpft vom Gesamtbild auf den Zielbereich, danach pulsierend
      const f=ease.inOut(seg(u,1.7,2.6)), tr=o.tr, full={x:0,y:0,w:1280,h:800}, pad=8;
      const lx=full.x+(tr.x-pad-full.x)*f, ly=full.y+(tr.y-pad-full.y)*f, lw=full.w+(tr.w+2*pad-full.w)*f, lh=full.h+(tr.h+2*pad-full.h)*f;
      const pulse=1+.012*Math.sin(t*5)*seg(u,2.6,3);
      o.spot.style.cssText+=';left:'+lx+'px;top:'+ly+'px;width:'+lw+'px;height:'+lh+'px;opacity:'+ease.out(seg(u,1.6,2.0)).toFixed(3)+';transform:scale('+pulse+')';
      // Cursor wandert zum Ziel und klickt
      const cx0=1180, cy0=740, cx1=tr.x+tr.w*.6, cy1=tr.y+tr.h*.55, m=ease.inOut(seg(u,.9,1.9));
      const cx=cx0+(cx1-cx0)*m, cy=cy0+(cy1-cy0)*m; o.cur.style.left=cx+'px'; o.cur.style.top=cy+'px'; o.cur.style.opacity=(clamp(seg(u,.8,1.1))*(1-seg(u,3.1,3.5))).toFixed(3);
      const rq=seg(u,1.95,2.6), rr=10+70*ease.out(rq); o.rip.style.cssText+=';left:'+(cx1-rr)+'px;top:'+(cy1-rr)+'px;width:'+(2*rr)+'px;height:'+(2*rr)+'px;opacity:'+((1-rq)*(rq>0?1:0)).toFixed(3);
    } else {
      const p=seg(u,.1,1.0); o.tile.style.transform='scale('+(.6+.4*ease.back(p))+')'; o.tile.style.opacity=clamp(p*3).toFixed(3);
      const g=seg(u,.6,1.2); o.tag.style.opacity=g.toFixed(3);
      const tq=seg(u,.3,1.0); o.title.style.opacity=tq.toFixed(3); o.title.style.transform='translateY('+((1-ease.out(tq))*40)+'px)';
      const sq=seg(u,.7,1.4); o.sub.style.opacity=sq.toFixed(3); o.sub.style.transform='translateY('+((1-ease.out(sq))*30)+'px)';
      o.cards.forEach((c,k)=>{const q=seg(u,1.3+k*.35,1.3+k*.35+.7), e=ease.back(q); c.style.opacity=clamp(q*3).toFixed(3); c.style.transform='translateY('+((1-e)*120)+'px)'; c.pr.textContent=fmt(c.val*ease.out(seg(u,1.5+k*.35,2.6+k*.35)))+' €';});
      const nq=seg(u,3.2,3.8); o.note.style.opacity=nq.toFixed(3); o.copy.style.opacity=seg(u,3.4,4).toFixed(3);
    }
  });
  fade.style.opacity=Math.max(1-seg(t,0,.5), seg(t,CFG.total-.65,CFG.total)).toFixed(3);
}
`;

(async () => {
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(WORK, { recursive: true });
  const dur = probe(MUSIC);
  const frames = Math.ceil(dur * FPS);
  console.log('Musik:', dur.toFixed(3), 's · Szenen gesamt:', TOTAL.toFixed(3), 's · Frames:', frames);

  const cfg = {
    logo: LOGO, total: dur,
    pkgs: [{ n: 'Basic', v: 1800, d: 'Vollversion<br>+ Handbuch' }, { n: 'Standard', v: 3800, d: '+ Einrichtung<br>und Onboarding' }, { n: 'Premium', v: 7579, d: '+ Anpassung, Workshop<br>und Support' }],
    scenes: scenes.map((s) => Object.assign({}, s, s.img ? { imgUrl: shot(s.img), rect: RECTS[s.img] } : {}))
  };
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><script>const CFG=${JSON.stringify(cfg)};${PAGE_JS}</script></body></html>`;
  const file = path.join(WORK, 'anim.html');
  fs.writeFileSync(file, html);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('Seitenfehler:', e.message); });
  await page.goto(u(file));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all(Array.from(document.images).map((i) => (i.complete ? 1 : new Promise((r) => (i.onload = r))))));

  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', 'pipe:0', '-i', MUSIC,
    '-filter_complex', `[1:a]atrim=0:${dur.toFixed(5)},volume=4dB,alimiter=limit=0.95,afade=t=in:st=0:d=0.4,afade=t=out:st=${(dur - 1.6).toFixed(3)}:d=1.5[aout]`,
    '-map', '0:v', '-map', '[aout]', '-t', dur.toFixed(5),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-movflags', '+faststart', OUT];
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = once(ff, 'close');
  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => render(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    if (f % 100 === 0) console.log('Frame', f, '/', frames);
    if (process.env.KEEP_FRAMES && [30, 100, 160, 230, 330, 420, 560, 700, 780, 860].includes(f)) fs.writeFileSync(path.join(WORK, `f${f}.jpg`), buf);
  }
  ff.stdin.end();
  const [code] = await done;
  await browser.close();
  if (code !== 0) throw new Error('ffmpeg Fehlercode ' + code);
  console.log('Fertig:', OUT);
  for (const sel of ['v:0', 'a:0']) console.log(sel, execFileSync('ffprobe', ['-v', 'error', '-select_streams', sel, '-show_entries', 'stream=codec_name,duration,width,height,nb_frames', '-of', 'csv=p=0', OUT]).toString().trim());
  console.log('Container:', probe(OUT).toFixed(3), 's  (Musik: ' + dur.toFixed(3) + ' s)  ' + (fs.statSync(OUT).size / 1e6).toFixed(1) + ' MB');
})().catch((e) => { console.error(e); process.exit(1); });
