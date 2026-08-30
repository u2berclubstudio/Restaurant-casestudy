/**
 * Restaurant Casestudy — server entry point.
 *
 * Binds to 127.0.0.1 only. nginx is what faces the internet; this process is
 * never directly reachable, which is why there is no TLS or CORS here.
 */
'use strict';

const { createApp } = require('./app');
const { sweepSessions } = require('./db');

const PORT = parseInt(process.env.PORT, 10) || 8090;
const HOST = process.env.HOST || '127.0.0.1';
const DB_FILE = process.env.RCS_DB || '/var/lib/restaurant-casestudy/data.db';

const app = createApp(DB_FILE);

const server = app.listen(PORT, HOST, () => {
  console.log(`[rcs] listening on ${HOST}:${PORT}`);
  console.log(`[rcs] database ${DB_FILE}`);
});

// Expired sessions would otherwise pile up forever.
setInterval(() => {
  try {
    const n = sweepSessions(app.locals.db);
    if (n) console.log(`[rcs] cleared ${n} expired session(s)`);
  } catch (e) {
    console.error('[rcs] session sweep failed:', e.message);
  }
}, 3600 * 1000).unref();

function shutdown(signal) {
  console.log(`[rcs] ${signal} — shutting down`);
  server.close(() => {
    try { app.locals.db.close(); } catch (_) {}
    process.exit(0);
  });
  // Don't hang forever on a stuck connection.
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
