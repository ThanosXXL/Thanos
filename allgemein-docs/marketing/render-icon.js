// Rendert renderer/img/logo.svg als App-Icon build/icon.png (512x512, transparent).
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  await p.goto('file://' + path.resolve(__dirname, '../renderer/img/logo.svg'));
  await p.screenshot({ path: path.resolve(__dirname, '../build/icon.png'), omitBackground: true });
  await b.close();
})();
