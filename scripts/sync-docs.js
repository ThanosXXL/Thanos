const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'renderer');
const DEST = path.join(__dirname, '..', 'docs');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

fs.rmSync(DEST, { recursive: true, force: true });
copyRecursive(SRC, DEST);
fs.writeFileSync(path.join(DEST, '.nojekyll'), '');

console.log('renderer/ wurde nach docs/ synchronisiert (für GitHub Pages).');
