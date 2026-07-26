// Screenshots the running app (expects it served at http://localhost:8123,
// e.g. via `npm run web` from the fitness-app/ directory) for embedding into
// the handbooks. Re-run this after any visual change to the app, then
// build_handbooks.py + render_pdfs.js to refresh the PDFs.
const { chromium } = require('playwright');
const path = require('path');

const APP_URL = process.env.MYWORKOUT_URL || 'http://localhost:8123/index.html';
const OUT_DIR = path.join(__dirname, 'screenshots');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await page.goto(APP_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(200);

  await page.screenshot({ path: path.join(OUT_DIR, 'shot_tasks.png') });

  await page.click('.tab-btn[data-tab="plans"]');
  await page.click('.start-callout .btn-primary');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT_DIR, 'shot_goal.png') });

  await page.click('.option-card[data-goal="aufbau"]');
  await page.waitForTimeout(150);
  await page.click('.chip[data-muscle="brust"]');
  await page.click('.chip[data-muscle="arme"]');
  await page.screenshot({ path: path.join(OUT_DIR, 'shot_muscle.png') });

  await page.click('#muscleStartBtn');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, 'shot_announce.png') });

  await page.waitForTimeout(1800);
  await page.click('.active-session .check-btn');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT_DIR, 'shot_session.png') });

  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT_DIR, 'shot_plan.png') });

  await browser.close();
})();
