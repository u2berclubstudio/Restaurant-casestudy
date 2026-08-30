/**
 * Restaurant Casestudy — passwords, sessions and the permission rules.
 *
 * Passwords use scrypt from Node's own crypto module, so there is no native
 * dependency to compile and nothing to go wrong at install time.
 *
 * Sessions are opaque random tokens. Only their SHA-256 hash is stored, so a
 * stolen copy of the database cannot be used to impersonate anyone. They are
 * revocable, which JWTs are not.
 */
'use strict';

const crypto = require('crypto');
const { newId, nowIso } = require('./db');

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const SESSION_DAYS = 14;

/* ------------------------------------------------------------- passwords */

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, SCRYPT.keylen, {
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024,
  });
  return ['scrypt', SCRYPT.N, salt.toString('base64'), key.toString('base64')].join('$');
}

function verifyPassword(password, stored) {
  try {
    const [scheme, n, saltB64, keyB64] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(keyB64, 'base64');
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: parseInt(n, 10), r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024,
    });
    // Constant-time: a timing difference would leak how much of the hash matched.
    return crypto.timingSafeEqual(actual, expected);
  } catch (_) {
    return false;
  }
}

/* -------------------------------------------------------------- sessions */

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, created, expires) VALUES (?, ?, ?, ?)')
    .run(hashToken(token), userId, nowIso(), expires);
  return token;
}

function userForToken(db, token) {
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.* FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires > ?
  `).get(hashToken(token), nowIso());
  return row || null;
}

function destroySession(db, token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

/** Used when an admin changes someone's password: log them out everywhere. */
function destroyAllSessions(db, userId) {
  return db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId).changes;
}

/* ----------------------------------------------------------- permissions */

/** Public shape of a user record. Never leaks password_hash. */
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    restaurant: u.restaurant,
    city: u.city,
    plan: u.plan,
    suspended: !!u.suspended,
    outlet_limit: u.outlet_limit || (u.plan === 'free' ? 1 : 999),
  };
}

function parseOverrides(user) {
  if (!user) return {};
  try {
    const parsed = JSON.parse(user.tool_overrides || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

/**
 * The single source of truth for "may this person use this tool".
 * Returns { access: 'full' | 'preview' | 'none', reason }
 *
 *   full    — may open the tool and save answers
 *   preview — may open and use it, but not save (drives signup)
 *   none    — may not open it at all
 */
function accessFor(tool, user) {
  const plan = user ? user.plan : '';

  // Staff see everything, always — for support and for your own testing.
  if (plan === 'staff') return { access: 'full', reason: 'staff' };

  if (user && user.suspended) {
    return { access: 'none', reason: 'Your account is suspended. Please get in touch.' };
  }

  if (!tool || !tool.enabled) {
    return { access: 'none', reason: (tool && tool.locked_message) || 'This tool is temporarily unavailable.' };
  }

  // An explicit per-user decision beats the tool's general visibility setting.
  const ov = parseOverrides(user)[tool.slug];
  if (ov === 'deny') {
    return { access: 'none', reason: tool.locked_message || "This tool isn't available on your account." };
  }
  if (ov === 'allow') return { access: 'full', reason: 'granted' };

  switch (tool.visibility) {
    case 'public':
      return { access: 'full', reason: 'public' };

    case 'preview':
      return user
        ? { access: 'full', reason: 'signed in' }
        : { access: 'preview', reason: 'Create a free account to save your answers.' };

    case 'login':
      return user
        ? { access: 'full', reason: 'signed in' }
        : { access: 'none', reason: 'Sign in to use this tool.' };

    case 'pro':
      if (!user) return { access: 'none', reason: 'Sign in with a Pro account to use this tool.' };
      if (plan === 'pro') {
        if (user.plan_expires && new Date(user.plan_expires).getTime() < Date.now()) {
          return { access: 'none', reason: 'Your Pro plan has expired.' };
        }
        return { access: 'full', reason: 'pro' };
      }
      return { access: 'none', reason: tool.locked_message || 'This tool is part of the Pro plan.' };

    case 'invite':
      return { access: 'none', reason: tool.locked_message || 'This tool is invite-only.' };

    case 'hidden':
    default:
      return { access: 'none', reason: "This tool isn't available." };
  }
}

module.exports = {
  hashPassword, verifyPassword,
  createSession, userForToken, destroySession, destroyAllSessions,
  publicUser, parseOverrides, accessFor,
  SESSION_DAYS,
};
