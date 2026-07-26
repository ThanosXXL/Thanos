// Renders the HTML handbooks produced by build_handbooks.py into PDFs.
// Run: node render_pdfs.js
const { chromium } = require('playwright');
const path = require('path');

const PLATFORMS = ['web', 'windows', 'macos', 'linux', 'ios', 'android'];
const DIST_DIR = path.join(__dirname, 'dist');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
  for (const id of PLATFORMS) {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(DIST_DIR, `handbook_${id}.html`));
    await page.waitForTimeout(150);
    const outPath = path.join(DIST_DIR, `MyWorkOut_Handbuch_${id}.pdf`);
    await page.pdf({
      path: outPath,
      printBackground: true,
      preferCSSPageSize: true,
    });
    console.log('rendered', outPath);
    await page.close();
  }
  await browser.close();
})();
