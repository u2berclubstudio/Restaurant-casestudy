/**
 * Restaurant Casestudy — database.
 *
 * One SQLite file. No migrations framework: the schema is created if missing
 * and every column add is guarded, so restarting on an existing database is
 * always safe.
 */
'use strict';

const { openDb } = require('./sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const TOOLS = [
  ['purpose',    '🪞', 'The Purpose Check',              'Why are you really opening a restaurant? The honest mirror before you spend a rupee.', 'public'],
  ['idea',       '💡', 'The Idea Validator',             'Everyone loves your food. But will they pay for it? Pressure-test the concept.',        'public'],
  ['location',   '📍', 'Location Audit Scorecard',       'Rent maths, footfall counts, competition map. Do not sign the lease without it.',       'preview'],
  ['break-even', '🧮', 'Budget & Break-Even Calculator', 'How many customers a day you actually need — and whether your budget survives.',       'public'],
  ['menu',       '🍽️', 'Menu Engineering Sheet',         'Cost every dish, kill the Dogs, find your Stars, fix the food cost.',                  'preview'],
  ['sop',        '📋', 'SOP Builder',                    'Write the five systems that make your restaurant run without you.',                    'preview'],
  ['marketing',  '📣', '90-Day Marketing Planner',       'From zero awareness to full tables, week by week.',                                     'preview'],
  ['revenue',    '🕯️', 'Dead Hours Revenue Planner',     'Four revenue streams from the kitchen you already have.',                               'preview'],
];

function newId() {
  return crypto.randomBytes(9).toString('base64url');
}

function nowIso() {
  return new Date().toISOString();
}

function open(file) {
  const dir = path.dirname(file);
  if (dir && dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = openDb(file);
  db.exec('PRAGMA journal_mode = WAL');   // survives a crash mid-write
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id             TEXT PRIMARY KEY,
      email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash  TEXT NOT NULL,
      name           TEXT NOT NULL DEFAULT '',
      restaurant     TEXT NOT NULL DEFAULT '',
      city           TEXT NOT NULL DEFAULT '',
      plan           TEXT NOT NULL DEFAULT 'free',
      plan_expires   TEXT NOT NULL DEFAULT '',
      suspended      INTEGER NOT NULL DEFAULT 0,
      tool_overrides TEXT NOT NULL DEFAULT '{}',
      outlet_limit   INTEGER NOT NULL DEFAULT 1,
      admin_note     TEXT NOT NULL DEFAULT '',
      created        TEXT NOT NULL,
      last_seen      TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created    TEXT NOT NULL,
      expires    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS tools (
      slug           TEXT PRIMARY KEY,
      title          TEXT NOT NULL,
      icon           TEXT NOT NULL DEFAULT '',
      blurb          TEXT NOT NULL DEFAULT '',
      position       INTEGER NOT NULL DEFAULT 0,
      visibility     TEXT NOT NULL DEFAULT 'preview',
      enabled        INTEGER NOT NULL DEFAULT 1,
      locked_message TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS outlets (
      id       TEXT PRIMARY KEY,
      user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name     TEXT NOT NULL,
      city     TEXT NOT NULL DEFAULT '',
      format   TEXT NOT NULL DEFAULT '',
      archived INTEGER NOT NULL DEFAULT 0,
      created  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_outlets_user ON outlets(user_id);

    CREATE TABLE IF NOT EXISTS worksheets (
      id        TEXT PRIMARY KEY,
      user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      outlet_id TEXT NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
      tool      TEXT NOT NULL,
      data      TEXT NOT NULL DEFAULT '{}',
      progress  INTEGER NOT NULL DEFAULT 0,
      score     INTEGER NOT NULL DEFAULT 0,
      band      TEXT NOT NULL DEFAULT '',
      updated   TEXT NOT NULL,
      UNIQUE (user_id, outlet_id, tool)
    );
    CREATE INDEX IF NOT EXISTS idx_ws_user ON worksheets(user_id);

    CREATE TABLE IF NOT EXISTS snapshots (
      id        TEXT PRIMARY KEY,
      user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      outlet_id TEXT NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
      tool      TEXT NOT NULL,
      label     TEXT NOT NULL DEFAULT '',
      score     INTEGER NOT NULL DEFAULT 0,
      data      TEXT NOT NULL DEFAULT '{}',
      created   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_snap_user ON snapshots(user_id, tool);

    CREATE TABLE IF NOT EXISTS leads (
      id      TEXT PRIMARY KEY,
      email   TEXT NOT NULL,
      source  TEXT NOT NULL DEFAULT '',
      note    TEXT NOT NULL DEFAULT '',
      created TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id      TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      tool    TEXT NOT NULL DEFAULT '',
      type    TEXT NOT NULL,
      created TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created);
  `);

  seedTools(db);
  return db;
}

/** Insert any tool that isn't there yet. Never overwrites your admin edits. */
function seedTools(db) {
  const has = db.prepare('SELECT slug FROM tools WHERE slug = ?');
  const ins = db.prepare(`INSERT INTO tools (slug, title, icon, blurb, position, visibility, enabled, locked_message)
                          VALUES (?, ?, ?, ?, ?, ?, 1, '')`);
  TOOLS.forEach((t, i) => {
    const [slug, icon, title, blurb, visibility] = t;
    if (!has.get(slug)) ins.run(slug, title, icon, blurb, i + 1, visibility);
  });
}

/** Delete expired sessions. Called on boot and hourly. */
function sweepSessions(db) {
  return db.prepare('DELETE FROM sessions WHERE expires < ?').run(nowIso()).changes;
}

module.exports = { open, newId, nowIso, sweepSessions, TOOLS };
