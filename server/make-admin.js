/**
 * Create or promote an admin account.
 *
 *   RCS_DB=/var/lib/restaurant-casestudy/data.db \
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret123 node make-admin.js
 *
 * Values come from the environment rather than the command line so the
 * password never appears in `ps` output or your shell history.
 *
 * Safe to re-run: an existing account is promoted and its password reset,
 * which is also how you recover if you forget it.
 */
'use strict';

const { open, newId, nowIso } = require('./db');
const A = require('./auth');

const DB_FILE = process.env.RCS_DB || '/var/lib/restaurant-casestudy/data.db';
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('ADMIN_EMAIL is missing or not a valid email address.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

const db = open(DB_FILE);
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existing) {
  db.prepare(`UPDATE users SET password_hash = ?, plan = 'staff', suspended = 0,
                               outlet_limit = 999 WHERE id = ?`)
    .run(A.hashPassword(password), existing.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
  console.log(`Updated ${email} — admin rights granted, password reset.`);
} else {
  db.prepare(`INSERT INTO users (id, email, password_hash, name, plan, suspended,
                                 tool_overrides, outlet_limit, created)
              VALUES (?, ?, ?, '', 'staff', 0, '{}', 999, ?)`)
    .run(newId(), email, A.hashPassword(password), nowIso());
  console.log(`Created ${email} as an admin account.`);
}

const n = db.prepare("SELECT COUNT(*) n FROM users WHERE plan = 'staff'").get().n;
console.log(`${n} account(s) now have admin rights.`);
db.close();
