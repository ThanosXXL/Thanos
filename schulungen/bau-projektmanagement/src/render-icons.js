const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const icons = require('./svg-icons');

const outDir = path.join(__dirname, 'assets', 'icons');
fs.mkdirSync(outDir, { recursive: true });

function pxFromViewBox(viewBox, scale) {
  const [, , w, h] = viewBox.split(' ').map(Number);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const all = [...icons.days, icons.participants, icons.exam, icons.heroSkyline];
  for (const icon of all) {
    const scale = icon.name === 'hero-skyline' ? 1.6 : 3;
    const { w, h } = pxFromViewBox(icon.viewBox, scale);
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await page.setContent(`<!DOCTYPE html><html><head><style>
      html,body{margin:0;padding:0;background:transparent;}
      svg{display:block;width:${w}px;height:${h}px;}
    </style></head><body>${icon.svg}</body></html>`);
    await page.waitForTimeout(60);
    await page.screenshot({ path: path.join(outDir, icon.name + '.png'), omitBackground: true });
    await page.close();
    console.log('erstellt:', icon.name + '.png', `${w}x${h}`);
  }
  await browser.close();
})();
