// Erzeugt docs/demo-standalone.html: eine einzelne, eigenständige HTML-Datei
// mit eingebettetem CSS/JS (kein Bezug auf ../renderer/* nötig), damit sie
// heruntergeladen und offline im Browser geöffnet werden kann.
//
// Manuell ausführen, nachdem sich renderer/style.css, renderer/renderer.js
// oder docs/demo-shim.js geändert haben:
//   node docs/build-standalone-demo.js
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const template = fs.readFileSync(path.join(ROOT, 'docs', 'demo.html'), 'utf-8');
const style = fs.readFileSync(path.join(ROOT, 'renderer', 'style.css'), 'utf-8');
const shim = fs.readFileSync(path.join(ROOT, 'docs', 'demo-shim.js'), 'utf-8');
const rendererJs = fs.readFileSync(path.join(ROOT, 'renderer', 'renderer.js'), 'utf-8');

let out = template
  .replace(
    '<link rel="stylesheet" href="../renderer/style.css">',
    `<style>\n${style}\n</style>`
  )
  .replace(
    '<script src="demo-shim.js"></script>',
    `<script>\n${shim}\n</script>`
  )
  .replace(
    '<script src="../renderer/renderer.js"></script>',
    `<script>\n${rendererJs}\n</script>`
  )
  .replace(
    '<a href="download.html">⬇ Zur Download-Seite</a>',
    '<span>Eigenständige Offline-Demo</span>'
  );

out = out.replace('<title>Dozenten Dashboard – Demo</title>', '<title>Dozenten Dashboard – Demo (Offline)</title>');

fs.writeFileSync(path.join(ROOT, 'docs', 'demo-standalone.html'), out, 'utf-8');
console.log('docs/demo-standalone.html geschrieben (' + (out.length / 1024).toFixed(0) + ' KB).');
