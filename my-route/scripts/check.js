// Sicherheits-Prüfung für den Quellcode (läuft in CI und per `npm run check`).
// Schlägt fehl, wenn gefährliche Muster auftauchen oder wichtige Schutzeinstellungen fehlen.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf-8');
const problems = [];
const fail = (msg) => problems.push(msg);

const codeFiles = ['main.js', 'preload.js', 'lib/security.js', 'lib/store.js', 'lib/updater.js', 'renderer/renderer.js'];
const forbidden = [
  [/\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|document\.write/, 'unsichere HTML-Einfügung'],
  [/\beval\s*\(|new Function\s*\(/, 'dynamische Codeausführung'],
  [/setAttribute\(\s*['"]style['"]/, 'Inline-Style per setAttribute (bricht die CSP)'],
  [/http:\/\/(?!\*\/\*|www\.w3\.org\/2000\/svg)/, 'unverschlüsselte http://-Adresse'],
  [/nodeIntegration\s*:\s*true|webSecurity\s*:\s*false|allowRunningInsecureContent\s*:\s*true|contextIsolation\s*:\s*false|sandbox\s*:\s*false/, 'abgeschwächte Electron-Einstellung'],
  [/enableRemoteModule|webviewTag\s*:\s*true/, 'veraltete/unsichere Electron-Funktion']
];
for (const file of codeFiles) {
  const text = read(file).replace(/(^|\s)\/\/.*$/gm, '$1');
  for (const [re, what] of forbidden) if (re.test(text)) fail(`${file}: ${what}`);
}

// shell.openExternal nur im Hauptprozess und nur hinter der Link-Prüfung
const main = read('main.js');
if ((main.match(/shell\.openExternal/g) || []).length !== 1) fail('main.js: shell.openExternal muss genau einmal vorkommen');
if (!/isAllowedExternalUrl\(url\)[\s\S]{0,200}shell\.openExternal/.test(main)) fail('main.js: shell.openExternal ohne isAllowedExternalUrl-Prüfung');
for (const need of ['contextIsolation: true', 'nodeIntegration: false', 'sandbox: true', 'webviewTag: false', 'will-attach-webview', 'setPermissionRequestHandler', 'requestSingleInstanceLock', 'isTrustedSender'])
  if (!main.includes(need)) fail(`main.js: "${need}" fehlt`);
if (/ipcMain\.handle\(/.test(main.replace(/function handle[\s\S]*?\n}\n/, ''))) fail('main.js: IPC-Handler müssen über handle() (mit Absender-Prüfung) registriert werden');

// CSP der Oberfläche
const html = read('renderer/index.html');
const csp = (html.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
for (const need of ["default-src 'none'", "connect-src 'none'", "script-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "require-trusted-types-for 'script'"])
  if (!csp.includes(need)) fail(`index.html: CSP enthält "${need}" nicht`);
if (/unsafe-(inline|eval)/.test(csp)) fail('index.html: CSP erlaubt unsafe-inline/eval');
if (/<script(?![^>]*\bsrc=)[^>]*>/.test(html)) fail('index.html: Inline-Skript gefunden');
if (/\sstyle=|\son[a-z]+=/.test(html)) fail('index.html: Inline-Style oder Inline-Event-Handler gefunden');

// Pakete: Fuses und Update-Quelle
const pkg = JSON.parse(read('package.json'));
const fuses = (pkg.build && pkg.build.electronFuses) || {};
if (fuses.runAsNode !== false || fuses.enableNodeOptionsEnvironmentVariable !== false || fuses.enableNodeCliInspectArguments !== false || fuses.onlyLoadAppFromAsar !== true)
  fail('package.json: Electron-Fuses nicht gehärtet');
const pub = (pkg.build && pkg.build.publish && pkg.build.publish[0]) || {};
if (!/^https:\/\//.test(pub.url || '')) fail('package.json: Update-Quelle muss https:// sein');

if (problems.length) {
  console.error('Sicherheits-Prüfung FEHLGESCHLAGEN:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log('Sicherheits-Prüfung bestanden.');
