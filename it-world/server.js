'use strict';
/**
 * IT - World – SaaS ERP / CRM Business-Plattform
 * Start: npm start  (Node.js >= 22.5, keine weiteren Abhängigkeiten)
 */
const http = require('node:http');
const path = require('node:path');
const db = require('./src/db');
const { createApp } = require('./src/app');
const { seed } = require('./src/seed');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'it-world.db');

const database = db.open(DB_FILE);
seed(database, { demo: process.env.SEED_DEMO !== 'false' });

const handler = createApp(database, { dbFile: DB_FILE });
const server = http.createServer(handler);
server.keepAliveTimeout = 65_000;
server.listen(PORT, HOST, () => {
  console.log(`[IT-World] läuft auf http://localhost:${PORT}  (Datenbank: ${DB_FILE})`);
});

function shutdown() {
  console.log('[IT-World] wird beendet …');
  server.close(() => {
    try { database.close(); } catch { /* bereits geschlossen */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
