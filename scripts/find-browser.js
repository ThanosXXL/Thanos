/*
 * Findet eine lokal installierte Chromium/Chrome/Edge-Instanz fuer
 * Headless-Automatisierung (PDF-Rendering, Tests) - ganz ohne eigenen
 * Browser-Download. Wird von scripts/create-pdf.js und tests/run-tests.js
 * gemeinsam genutzt.
 */
const fs = require('fs');
const { execFileSync } = require('child_process');

function findBrowser() {
  const platform = process.platform;
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  if (platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    );
  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else {
    for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
      try {
        const found = execFileSync('which', [name], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        if (found) candidates.push(found);
      } catch (err) { /* nicht gefunden */ }
    }
  }
  return candidates.find((c) => c && fs.existsSync(c)) || null;
}

module.exports = { findBrowser };
