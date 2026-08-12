// Admin-CLI zum Ausstellen neuer Lizenzschlüssel.
//
//   node scripts/create-license.js --customer "Kanzlei Müller" --seats 3
//
// Legt den Schlüssel in der lokalen SQLite-Datenbank an und gibt ihn aus,
// damit er an den Kunden weitergegeben werden kann.
const db = require('../src/db');
const { generateLicenseKey } = require('../src/license-key');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--customer') out.customer = argv[++i];
    else if (argv[i] === '--seats') out.seats = Number(argv[++i]);
  }
  return out;
}

const { customer, seats } = parseArgs(process.argv.slice(2));

if (!customer || !seats || !Number.isInteger(seats) || seats < 1) {
  console.error('Verwendung: node scripts/create-license.js --customer "Kanzlei Müller" --seats 3');
  process.exit(1);
}

let licenseKey = generateLicenseKey();
while (db.getLicenseByKey(licenseKey)) {
  licenseKey = generateLicenseKey();
}

db.createLicense({ licenseKey, customerName: customer, seats });

console.log('Lizenz erstellt:');
console.log(`  Kunde:           ${customer}`);
console.log(`  Geräteplätze:    ${seats}`);
console.log(`  Lizenzschlüssel: ${licenseKey}`);
