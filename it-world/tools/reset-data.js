'use strict';
// Löscht die lokale Datendatei – beim nächsten Start werden Demo-/Initialdaten neu angelegt.
const fs = require('node:fs');
const path = require('node:path');
const file = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'it-world-data.json');
try { fs.unlinkSync(file); console.log(`Gelöscht: ${file}`); }
catch (e) { console.log(e.code === 'ENOENT' ? 'Keine Datendatei vorhanden.' : e.message); }
