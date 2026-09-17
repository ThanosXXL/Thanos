const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 400 }, deviceScaleFactor: 4 });

  const logoPath = path.join(__dirname, 'assets', 'logo-original.jpg');
  const logoDataUri = 'data:image/jpeg;base64,' + require('fs').readFileSync(logoPath).toString('base64');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8">
  <style>
    html, body {
      margin: 0; padding: 0;
      width: 900px; height: 400px;
      background: transparent;
      display: flex; align-items: center; justify-content: center;
      font-family: sans-serif;
    }
    .stage {
      width: 820px;
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
      perspective: 1400px;
    }
    .plaque {
      position: relative;
      width: 760px;
      height: 240px;
      border-radius: 26px;
      background: linear-gradient(180deg, #fdfdfd 0%, #eef0f2 45%, #dfe2e6 55%, #f5f6f7 100%);
      transform: rotateX(10deg);
      transform-style: preserve-3d;
      box-shadow:
        0 2px 0 rgba(255,255,255,0.9) inset,
        0 -6px 10px rgba(0,0,0,0.10) inset,
        0 22px 34px rgba(20,20,25,0.35),
        0 4px 8px rgba(20,20,25,0.25);
      border: 1px solid rgba(120,120,120,0.35);
      overflow: hidden;
    }
    .logo-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 30px 60px;
      box-sizing: border-box;
      mix-blend-mode: multiply;
      -webkit-mask-image: radial-gradient(ellipse 42% 46% at 50% 50%, #000 30%, rgba(0,0,0,0.0) 100%);
      mask-image: radial-gradient(ellipse 42% 46% at 50% 50%, #000 30%, rgba(0,0,0,0.0) 100%);
      filter: saturate(1.1) contrast(1.08);
    }
    .logo-shadow {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 30px 60px;
      box-sizing: border-box;
      filter: drop-shadow(0 8px 8px rgba(0,0,0,0.35)) blur(0.3px);
      opacity: 0.9;
      -webkit-mask-image: radial-gradient(ellipse 42% 46% at 50% 50%, #000 30%, rgba(0,0,0,0.0) 100%);
      mask-image: radial-gradient(ellipse 42% 46% at 50% 50%, #000 30%, rgba(0,0,0,0.0) 100%);
    }
    /* glossy sweep highlight */
    .gloss {
      position: absolute;
      top: -20%;
      left: -10%;
      width: 120%;
      height: 65%;
      background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.35) 35%, rgba(255,255,255,0.0) 100%);
      border-radius: 50% 50% 60% 60% / 60% 60% 100% 100%;
      pointer-events: none;
      mix-blend-mode: screen;
    }
    .gloss-streak {
      position: absolute;
      top: 8%;
      left: 6%;
      width: 40%;
      height: 30%;
      background: linear-gradient(120deg, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%);
      filter: blur(2px);
      transform: rotate(-8deg);
      pointer-events: none;
    }
    .rim {
      position: absolute;
      inset: 0;
      border-radius: 26px;
      box-shadow: 0 0 0 2px rgba(255,255,255,0.6) inset;
      pointer-events: none;
    }
  </style>
  </head>
  <body>
    <div class="stage">
      <div class="plaque">
        <img class="logo-shadow" src="${logoDataUri}">
        <img class="logo-img" src="${logoDataUri}">
        <div class="gloss"></div>
        <div class="gloss-streak"></div>
        <div class="rim"></div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(150);
  const plaque = await page.$('.stage');
  await plaque.screenshot({ path: path.join(__dirname, 'assets', 'logo-3d-glossy.png'), omitBackground: true });
  await browser.close();
  console.log('logo-3d-glossy.png erstellt');
})();
