/**
 * Restaurant Casestudy — SQLite adapter.
 *
 * WHY THIS EXISTS
 * The obvious choice, better-sqlite3, is a native module: installing it can
 * mean compiling C++ on the server, and when that fails you are left staring
 * at a node-gyp backtrace. Node 22.5+ ships SQLite built in, so the default
 * path here needs no compiler, no prebuilt binary and no download.
 *
 * If better-sqlite3 does happen to be installed, it is used instead — it is
 * modestly faster. Both are wrapped in the same tiny surface so nothing else
 * in the codebase has to care which one is running.
 */
'use strict';

/** Node's sqlite may report counts as BigInt; the rest of the code wants numbers. */
function num(v) {
  return typeof v === 'bigint' ? Number(v) : v;
}

function wrapNodeSqlite() {
  const { DatabaseSync } = require('node:sqlite');

  return function openDb(file) {
    const db = new DatabaseSync(file);

    const handle = {
      driver: 'node:sqlite',
      exec(sql) { db.exec(sql); },
      prepare(sql) {
        const stmt = db.prepare(sql);
        return {
          run: (...a) => {
            const r = stmt.run(...a);
            return { changes: num(r.changes), lastInsertRowid: num(r.lastInsertRowid) };
          },
          get: (...a) => stmt.get(...a),
          all: (...a) => stmt.all(...a),
        };
      },
      // better-sqlite3 gives you db.transaction(fn); this mirrors it.
      transaction(fn) {
        return (...args) => {
          handle.exec('BEGIN');
          try {
            const out = fn(...args);
            handle.exec('COMMIT');
            return out;
          } catch (e) {
            try { handle.exec('ROLLBACK'); } catch (_) {}
            throw e;
          }
        };
      },
      close() { try { db.close(); } catch (_) {} },
    };
    return handle;
  };
}

function wrapBetterSqlite() {
  const Database = require('better-sqlite3');

  return function openDb(file) {
    const db = new Database(file);
    return {
      driver: 'better-sqlite3',
      exec: (sql) => db.exec(sql),
      prepare: (sql) => {
        const stmt = db.prepare(sql);
        return {
          run: (...a) => {
            const r = stmt.run(...a);
            return { changes: num(r.changes), lastInsertRowid: num(r.lastInsertRowid) };
          },
          get: (...a) => stmt.get(...a),
          all: (...a) => stmt.all(...a),
        };
      },
      transaction: (fn) => db.transaction(fn),
      close: () => { try { db.close(); } catch (_) {} },
    };
  };
}

let openDb = null;
let driver = 'none';

// Env override exists so the test suite can prove BOTH drivers work.
const forced = process.env.RCS_SQLITE_DRIVER || '';

if (forced !== 'node') {
  try { openDb = wrapBetterSqlite(); driver = 'better-sqlite3'; } catch (_) { /* not installed */ }
}
if (!openDb) {
  try { openDb = wrapNodeSqlite(); driver = 'node:sqlite'; } catch (_) { /* too old */ }
}
if (!openDb) {
  throw new Error(
    'No SQLite available. Either use Node 22.5 or newer (recommended), ' +
    'or run `npm install better-sqlite3` in the server directory.'
  );
}

module.exports = { openDb, driver };
