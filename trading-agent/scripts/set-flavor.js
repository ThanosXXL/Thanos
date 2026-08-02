const fs = require('fs');
const path = require('path');

const flavor = process.argv[2] === 'demo' ? 'demo' : 'live';
const isDemo = flavor === 'demo';

const content = `window.IS_DEMO = ${isDemo};\n`;
fs.writeFileSync(path.join(__dirname, '..', 'renderer', 'buildFlavor.js'), content);

console.log(`[set-flavor] Build-Variante: ${flavor}`);
