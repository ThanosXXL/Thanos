const express = require('express');
const activateRoute = require('./routes/activate');
const validateRoute = require('./routes/validate');
const deactivateRoute = require('./routes/deactivate');

const app = express();
app.use(express.json({ limit: '16kb' }));

// Einfache Ratenbegrenzung pro IP, um Brute-Force auf Lizenzschlüssel zu
// erschweren, ohne eine zusätzliche Abhängigkeit einzuführen.
const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 30;

app.use('/api', (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WINDOW_MS;
  }
  entry.count += 1;
  hits.set(ip, entry);
  if (entry.count > MAX_PER_WINDOW) {
    return res.status(429).json({ error: 'Zu viele Anfragen, bitte kurz warten.' });
  }
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api', activateRoute);
app.use('/api', validateRoute);
app.use('/api', deactivateRoute);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler.' });
});

const port = process.env.PORT || 4400;
app.listen(port, () => {
  console.log(`SteuerWelt-Lizenzserver läuft auf Port ${port}`);
});
