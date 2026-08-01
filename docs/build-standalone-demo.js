// Erzeugt eigenständige, einzeln herunterladbare Demo-Dateien mit eingebettetem
// CSS/JS (kein Bezug auf ../renderer/* nötig), damit sie offline im Browser
// geöffnet werden können.
//
// Manuell ausführen, nachdem sich renderer/style.css, renderer/renderer.js,
// docs/demo-shim.js oder docs/demo-inventar-shim.js geändert haben:
//   node docs/build-standalone-demo.js
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const style = fs.readFileSync(path.join(ROOT, 'renderer', 'style.css'), 'utf-8');
const rendererJs = fs.readFileSync(path.join(ROOT, 'renderer', 'renderer.js'), 'utf-8');

function build({ templateFile, shimFile, shimTag, outFile, titleFrom, titleTo, footerLinkTag }) {
  const template = fs.readFileSync(path.join(ROOT, 'docs', templateFile), 'utf-8');
  const shim = fs.readFileSync(path.join(ROOT, 'docs', shimFile), 'utf-8');

  let out = template
    .replace(
      '<link rel="stylesheet" href="../renderer/style.css">',
      `<style>\n${style}\n</style>`
    )
    .replace(
      shimTag,
      `<script>\n${shim}\n</script>`
    )
    .replace(
      '<script src="../renderer/renderer.js"></script>',
      `<script>\n${rendererJs}\n</script>`
    )
    .replace(
      footerLinkTag,
      '<span>Eigenständige Offline-Demo</span>'
    )
    .replace(titleFrom, titleTo);

  fs.writeFileSync(path.join(ROOT, 'docs', outFile), out, 'utf-8');
  console.log('docs/' + outFile + ' geschrieben (' + (out.length / 1024).toFixed(0) + ' KB).');
}

build({
  templateFile: 'demo.html',
  shimFile: 'demo-shim.js',
  shimTag: '<script src="demo-shim.js"></script>',
  outFile: 'demo-standalone.html',
  titleFrom: '<title>Dozenten Dashboard – Demo</title>',
  titleTo: '<title>Dozenten Dashboard – Demo (Offline)</title>',
  footerLinkTag: '<a href="download.html">⬇ Zur Download-Seite</a>'
});

build({
  templateFile: 'demo-inventar.html',
  shimFile: 'demo-inventar-shim.js',
  shimTag: '<script src="demo-inventar-shim.js"></script>',
  outFile: 'demo-inventar-standalone.html',
  titleFrom: '<title>Inventar - Dashboard – Demo</title>',
  titleTo: '<title>Inventar - Dashboard – Demo (Offline)</title>',
  footerLinkTag: '<a href="download.html">⬇ Zur Download-Seite</a>'
});
