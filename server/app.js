/**
 * Restaurant Casestudy — the API.
 *
 * Every permission is enforced here, on the server. The browser interface uses
 * the same answers to decide what to show, but curl gets exactly the same 403
 * that Chrome does.
 *
 * Exported as a factory so the tests can run it against a temporary database.
 */
'use strict';

const express = require('express');
const { open, newId, nowIso, sweepSessions } = require('./db');
const A = require('./auth');

const MAX_JSON = '2mb';               // worksheets can hold a long menu table
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 8;

function createApp(dbFile) {
  const db = open(dbFile);
  sweepSessions(db);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);       // nginx sits in front
  app.use(express.json({ limit: MAX_JSON }));

  /* ------------------------------------------------------------- helpers */

  const fail = (res, code, message) => res.status(code).json({ message });

  // Wrap an async handler so a thrown error becomes a clean 500, never a hang.
  const go = (fn) => (req, res) => {
    try {
      return fn(req, res);
    } catch (e) {
      console.error('[rcs]', req.method, req.path, '->', e && e.message);
      return fail(res, 500, 'Server error: ' + (e && e.message ? e.message : 'unknown'));
    }
  };

  function tokenFrom(req) {
    const h = req.get('authorization') || '';
    if (h) return h.replace(/^Bearer\s+/i, '').trim();
    const cookie = req.get('cookie') || '';
    const m = cookie.match(/(?:^|;\s*)rcs_auth=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  // Attaches req.user (or null). Never rejects — routes decide what they need.
  app.use((req, _res, next) => {
    req.token = tokenFrom(req);
    req.user = req.token ? A.userForToken(db, req.token) : null;
    next();
  });

  const requireUser = (req, res, next) => {
    if (!req.user) return fail(res, 401, 'Sign in first.');
    if (req.user.suspended) return fail(res, 403, 'Your account is suspended.');
    next();
  };

  const requireStaff = (req, res, next) => {
    if (!req.user || req.user.plan !== 'staff') return fail(res, 403, 'Staff only.');
    next();
  };

  function touch(userId) {
    try { db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(nowIso(), userId); } catch (_) {}
  }

  function toolBySlug(slug) {
    const t = db.prepare('SELECT * FROM tools WHERE slug = ?').get(slug);
    if (!t) return null;
    return { ...t, enabled: !!t.enabled };
  }

  function allTools() {
    return db.prepare('SELECT * FROM tools ORDER BY position').all()
      .map((t) => ({ ...t, enabled: !!t.enabled }));
  }

  function logEvent(userId, type, tool) {
    try {
      db.prepare('INSERT INTO events (id, user_id, tool, type, created) VALUES (?, ?, ?, ?, ?)')
        .run(newId(), userId || null, tool || '', type, nowIso());
    } catch (_) {}
  }

  /* -------------------------------------------------------- login limiter */
  // Small in-memory guard against password guessing. Resets on restart, which
  // is fine — it exists to slow a script down, not to be a security boundary.
  const failures = new Map();
  function failureKey(req, email) { return (req.ip || '') + '|' + String(email || '').toLowerCase(); }
  function tooManyFailures(key) {
    const rec = failures.get(key);
    if (!rec) return false;
    if (Date.now() - rec.first > LOGIN_WINDOW_MS) { failures.delete(key); return false; }
    return rec.count >= LOGIN_MAX_FAILURES;
  }
  function noteFailure(key) {
    const rec = failures.get(key);
    if (!rec || Date.now() - rec.first > LOGIN_WINDOW_MS) failures.set(key, { first: Date.now(), count: 1 });
    else rec.count += 1;
  }

  /* ------------------------------------------------------------ meta */

  app.get('/api/health', go((_req, res) => {
    res.json({ ok: true, tools: allTools().length, time: nowIso() });
  }));

  /* ------------------------------------------------------------ auth */

  app.post('/api/auth/signup', go((req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(res, 400, 'Enter a valid email address.');
    if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters.');

    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
      return fail(res, 400, 'An account with that email already exists.');
    }

    const id = newId();
    // plan, suspended and outlet_limit are set here, never taken from the
    // request — otherwise anyone could sign up as staff.
    db.prepare(`INSERT INTO users (id, email, password_hash, name, restaurant, city,
                                   plan, suspended, tool_overrides, outlet_limit, created)
                VALUES (?, ?, ?, ?, ?, ?, 'free', 0, '{}', 1, ?)`)
      .run(id, email, A.hashPassword(password),
           String(req.body.name || '').slice(0, 120),
           String(req.body.restaurant || '').slice(0, 160),
           String(req.body.city || '').slice(0, 120),
           nowIso());

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    logEvent(id, 'signup', '');
    res.json({ token: A.createSession(db, id), user: A.publicUser(user) });
  }));

  app.post('/api/auth/login', go((req, res) => {
    const email = String(req.body.email || req.body.identity || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const key = failureKey(req, email);

    if (tooManyFailures(key)) {
      return fail(res, 429, 'Too many failed attempts. Wait 15 minutes and try again.');
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    // Same message either way: revealing which emails exist helps an attacker.
    if (!user || !A.verifyPassword(password, user.password_hash)) {
      noteFailure(key);
      return fail(res, 400, 'Wrong email or password.');
    }
    if (user.suspended) return fail(res, 403, 'Your account is suspended. Please get in touch.');

    failures.delete(key);
    touch(user.id);
    logEvent(user.id, 'login', '');
    res.json({ token: A.createSession(db, user.id), user: A.publicUser(user) });
  }));

  app.post('/api/auth/logout', go((req, res) => {
    A.destroySession(db, req.token);
    res.json({ ok: true });
  }));

  app.get('/api/auth/me', go((req, res) => {
    if (!req.user) return fail(res, 401, 'Not signed in.');
    touch(req.user.id);
    res.json({ user: A.publicUser(req.user) });
  }));

  app.patch('/api/auth/profile', requireUser, go((req, res) => {
    // Deliberately a whitelist. plan, suspended, tool_overrides and
    // outlet_limit are absent, so a user cannot promote themselves.
    db.prepare('UPDATE users SET name = ?, restaurant = ?, city = ? WHERE id = ?')
      .run(String(req.body.name ?? req.user.name).slice(0, 120),
           String(req.body.restaurant ?? req.user.restaurant).slice(0, 160),
           String(req.body.city ?? req.user.city).slice(0, 120),
           req.user.id);
    res.json({ user: A.publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
  }));

  app.post('/api/auth/password', requireUser, go((req, res) => {
    const current = String(req.body.current || '');
    const next = String(req.body.next || '');
    if (next.length < 8) return fail(res, 400, 'New password must be at least 8 characters.');
    if (!A.verifyPassword(current, req.user.password_hash)) {
      return fail(res, 400, 'Your current password is wrong.');
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(A.hashPassword(next), req.user.id);
    A.destroyAllSessions(db, req.user.id);          // sign out other devices
    res.json({ token: A.createSession(db, req.user.id), ok: true });
  }));

  /* ------------------------------------------------------- bootstrap */

  app.get('/api/bootstrap', go((req, res) => {
    const tools = allTools().map((t) => {
      const a = A.accessFor(t, req.user);
      return {
        slug: t.slug, title: t.title, icon: t.icon, blurb: t.blurb,
        position: t.position, visibility: t.visibility, enabled: t.enabled,
        access: a.access, reason: a.reason,
      };
    });
    res.json({
      user: A.publicUser(req.user),
      tools,
      content: {},          // homepage copy lives in the HTML for now
      announcement: null,
    });
  }));

  app.get('/api/access/:slug', go((req, res) => {
    const tool = toolBySlug(req.params.slug);
    if (!tool) return res.status(404).json({ access: 'none', reason: 'Unknown tool.' });
    const a = A.accessFor(tool, req.user);
    res.json({ slug: tool.slug, title: tool.title, access: a.access, reason: a.reason });
  }));

  /* --------------------------------------------------------- outlets */

  app.get('/api/outlets', requireUser, go((req, res) => {
    res.json({
      items: db.prepare('SELECT * FROM outlets WHERE user_id = ? AND archived = 0 ORDER BY created')
        .all(req.user.id),
    });
  }));

  app.post('/api/outlets', requireUser, go((req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name) return fail(res, 400, 'Give the outlet a name.');

    if (req.user.plan !== 'staff') {
      const limit = req.user.outlet_limit || (req.user.plan === 'pro' ? 999 : 1);
      const existing = db.prepare('SELECT COUNT(*) n FROM outlets WHERE user_id = ? AND archived = 0')
        .get(req.user.id).n;
      if (existing >= limit) {
        return fail(res, 403, limit === 1
          ? 'The free plan covers one outlet. Upgrade to Pro to add more.'
          : `You've reached your limit of ${limit} outlets.`);
      }
    }

    const id = newId();
    db.prepare('INSERT INTO outlets (id, user_id, name, city, format, archived, created) VALUES (?, ?, ?, ?, ?, 0, ?)')
      .run(id, req.user.id, name.slice(0, 120),
           String(req.body.city || '').slice(0, 120),
           String(req.body.format || '').slice(0, 60), nowIso());
    res.json(db.prepare('SELECT * FROM outlets WHERE id = ?').get(id));
  }));

  app.patch('/api/outlets/:id', requireUser, go((req, res) => {
    const row = db.prepare('SELECT * FROM outlets WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!row) return fail(res, 404, 'No such outlet.');
    db.prepare('UPDATE outlets SET name = ?, city = ?, format = ?, archived = ? WHERE id = ?')
      .run(String(req.body.name ?? row.name).slice(0, 120),
           String(req.body.city ?? row.city).slice(0, 120),
           String(req.body.format ?? row.format).slice(0, 60),
           req.body.archived === undefined ? row.archived : (req.body.archived ? 1 : 0),
           row.id);
    res.json(db.prepare('SELECT * FROM outlets WHERE id = ?').get(row.id));
  }));

  app.delete('/api/outlets/:id', requireUser, go((req, res) => {
    const n = db.prepare('DELETE FROM outlets WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.id).changes;
    if (!n) return fail(res, 404, 'No such outlet.');
    res.json({ ok: true });
  }));

  /* ------------------------------------------------------ worksheets */

  const shapeWorksheet = (w) => w && ({
    id: w.id, outlet: w.outlet_id, tool: w.tool,
    data: JSON.parse(w.data || '{}'),
    progress: w.progress, score: w.score, band: w.band, updated: w.updated,
  });

  app.get('/api/worksheets', requireUser, go((req, res) => {
    const outlet = String(req.query.outlet || '');
    const rows = outlet
      ? db.prepare('SELECT * FROM worksheets WHERE user_id = ? AND outlet_id = ?').all(req.user.id, outlet)
      : db.prepare('SELECT * FROM worksheets WHERE user_id = ?').all(req.user.id);
    res.json({ items: rows.map(shapeWorksheet) });
  }));

  app.put('/api/worksheets', requireUser, go((req, res) => {
    const outletId = String(req.body.outlet || '');
    const toolSlug = String(req.body.tool || '');

    const outlet = db.prepare('SELECT id FROM outlets WHERE id = ? AND user_id = ?')
      .get(outletId, req.user.id);
    if (!outlet) return fail(res, 404, 'No such outlet.');

    // The real gate. Interface state is irrelevant here.
    const tool = toolBySlug(toolSlug);
    if (!tool) return fail(res, 400, 'Unknown tool.');
    const a = A.accessFor(tool, req.user);
    if (a.access !== 'full') return fail(res, 403, a.reason || "You don't have access to this tool.");

    const payload = JSON.stringify(req.body.data ?? {});
    const existing = db.prepare('SELECT id FROM worksheets WHERE user_id = ? AND outlet_id = ? AND tool = ?')
      .get(req.user.id, outletId, toolSlug);

    if (existing) {
      db.prepare('UPDATE worksheets SET data = ?, progress = ?, score = ?, band = ?, updated = ? WHERE id = ?')
        .run(payload, req.body.progress | 0, req.body.score | 0,
             String(req.body.band || ''), nowIso(), existing.id);
    } else {
      db.prepare(`INSERT INTO worksheets (id, user_id, outlet_id, tool, data, progress, score, band, updated)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(newId(), req.user.id, outletId, toolSlug, payload,
             req.body.progress | 0, req.body.score | 0, String(req.body.band || ''), nowIso());
    }

    const saved = db.prepare('SELECT * FROM worksheets WHERE user_id = ? AND outlet_id = ? AND tool = ?')
      .get(req.user.id, outletId, toolSlug);
    res.json(shapeWorksheet(saved));
  }));

  /* ------------------------------------------------------- snapshots */

  app.get('/api/snapshots', requireUser, go((req, res) => {
    const rows = db.prepare(`SELECT * FROM snapshots WHERE user_id = ? AND outlet_id = ? AND tool = ?
                             ORDER BY created DESC LIMIT 50`)
      .all(req.user.id, String(req.query.outlet || ''), String(req.query.tool || ''));
    res.json({ items: rows.map((s) => ({ ...s, data: JSON.parse(s.data || '{}') })) });
  }));

  app.post('/api/snapshots', requireUser, go((req, res) => {
    const outlet = db.prepare('SELECT id FROM outlets WHERE id = ? AND user_id = ?')
      .get(String(req.body.outlet || ''), req.user.id);
    if (!outlet) return fail(res, 404, 'No such outlet.');
    const id = newId();
    db.prepare(`INSERT INTO snapshots (id, user_id, outlet_id, tool, label, score, data, created)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, req.user.id, outlet.id, String(req.body.tool || ''),
           String(req.body.label || '').slice(0, 120), req.body.score | 0,
           JSON.stringify(req.body.data ?? {}), nowIso());
    res.json(db.prepare('SELECT * FROM snapshots WHERE id = ?').get(id));
  }));

  app.delete('/api/snapshots/:id', requireUser, go((req, res) => {
    const n = db.prepare('DELETE FROM snapshots WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.id).changes;
    if (!n) return fail(res, 404, 'No such snapshot.');
    res.json({ ok: true });
  }));

  /* ------------------------------------------------- leads and events */

  app.post('/api/leads', go((req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(res, 400, 'Enter a valid email address.');
    db.prepare('INSERT INTO leads (id, email, source, note, created) VALUES (?, ?, ?, ?, ?)')
      .run(newId(), email, String(req.body.source || 'site').slice(0, 80),
           String(req.body.note || '').slice(0, 500), nowIso());
    res.json({ ok: true });
  }));

  app.post('/api/events', go((req, res) => {
    logEvent(req.user ? req.user.id : null, String(req.body.type || 'tool_open'), String(req.body.tool || ''));
    res.json({ ok: true });
  }));

  /* ------------------------------------------------------------ admin */

  app.get('/api/admin/overview', requireStaff, go((_req, res) => {
    const one = (sql, ...p) => db.prepare(sql).get(...p).n;
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const opens = {};
    db.prepare('SELECT tool, COUNT(*) n FROM events WHERE created >= ? AND type = ? GROUP BY tool')
      .all(since, 'tool_open')
      .forEach((r) => { opens[r.tool || 'unknown'] = r.n; });

    res.json({
      users_total: one('SELECT COUNT(*) n FROM users'),
      users_pro: one('SELECT COUNT(*) n FROM users WHERE plan = ?', 'pro'),
      users_suspended: one('SELECT COUNT(*) n FROM users WHERE suspended = 1'),
      outlets: one('SELECT COUNT(*) n FROM outlets'),
      worksheets: one('SELECT COUNT(*) n FROM worksheets'),
      leads: one('SELECT COUNT(*) n FROM leads'),
      opens_30d: opens,
    });
  }));

  app.get('/api/admin/users', requireStaff, go((req, res) => {
    const q = String(req.query.q || '').trim();
    const rows = q
      ? db.prepare(`SELECT * FROM users WHERE email LIKE ? OR name LIKE ? OR restaurant LIKE ?
                    ORDER BY created DESC LIMIT 500`).all(`%${q}%`, `%${q}%`, `%${q}%`)
      : db.prepare('SELECT * FROM users ORDER BY created DESC LIMIT 500').all();

    res.json({
      items: rows.map((u) => ({
        id: u.id, email: u.email, name: u.name, restaurant: u.restaurant, city: u.city,
        plan: u.plan, suspended: !!u.suspended,
        tool_overrides: A.parseOverrides(u),
        outlet_limit: u.outlet_limit, admin_note: u.admin_note,
        created: u.created, last_seen: u.last_seen,
      })),
    });
  }));

  app.post('/api/admin/user/:id', requireStaff, go((req, res) => {
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!target) return fail(res, 404, 'No such user.');

    // Stop an admin locking themselves out by accident.
    if (target.id === req.user.id && req.body.plan && req.body.plan !== 'staff') {
      return fail(res, 400, "You can't remove your own admin access here.");
    }
    if (req.body.plan && !['free', 'pro', 'staff'].includes(req.body.plan)) {
      return fail(res, 400, 'Plan must be free, pro or staff.');
    }

    let overrides = target.tool_overrides;
    if (req.body.tool_overrides && typeof req.body.tool_overrides === 'object') {
      const clean = {};
      const valid = new Set(allTools().map((t) => t.slug));
      Object.keys(req.body.tool_overrides).forEach((k) => {
        const v = req.body.tool_overrides[k];
        if (valid.has(k) && (v === 'allow' || v === 'deny')) clean[k] = v;
      });
      overrides = JSON.stringify(clean);
    }

    db.prepare(`UPDATE users SET plan = ?, suspended = ?, tool_overrides = ?,
                                 outlet_limit = ?, admin_note = ?, plan_expires = ?
                WHERE id = ?`)
      .run(req.body.plan || target.plan,
           req.body.suspended ? 1 : 0,
           overrides,
           parseInt(req.body.outlet_limit, 10) || target.outlet_limit,
           String(req.body.admin_note ?? target.admin_note).slice(0, 2000),
           String(req.body.plan_expires ?? target.plan_expires),
           target.id);

    // Suspending someone should take effect now, not in two weeks.
    if (req.body.suspended) A.destroyAllSessions(db, target.id);

    res.json({ ok: true });
  }));

  /**
   * Set a user's password. This is how you help someone who is locked out,
   * since there are no reset emails yet.
   */
  app.post('/api/admin/user/:id/password', requireStaff, go((req, res) => {
    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!target) return fail(res, 404, 'No such user.');
    const password = String(req.body.password || '');
    if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters.');

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(A.hashPassword(password), target.id);
    A.destroyAllSessions(db, target.id);
    res.json({ ok: true });
  }));

  app.get('/api/admin/tools', requireStaff, go((_req, res) => {
    res.json({ items: allTools() });
  }));

  app.post('/api/admin/tools', requireStaff, go((req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const valid = ['public', 'preview', 'login', 'pro', 'invite', 'hidden'];
    const stmt = db.prepare(`UPDATE tools SET visibility = ?, enabled = ?, locked_message = ?,
                                              blurb = ?, position = ? WHERE slug = ?`);
    const tx = db.transaction((list) => {
      list.forEach((it) => {
        const cur = db.prepare('SELECT * FROM tools WHERE slug = ?').get(String(it.slug || ''));
        if (!cur) return;
        stmt.run(valid.includes(it.visibility) ? it.visibility : cur.visibility,
                 it.enabled ? 1 : 0,
                 String(it.locked_message ?? cur.locked_message).slice(0, 400),
                 String(it.blurb ?? cur.blurb).slice(0, 400),
                 it.position === undefined ? cur.position : (parseInt(it.position, 10) || 0),
                 cur.slug);
      });
    });
    tx(items);
    res.json({ ok: true, items: allTools() });
  }));

  app.get('/api/admin/leads', requireStaff, go((req, res) => {
    const rows = db.prepare('SELECT * FROM leads ORDER BY created DESC LIMIT 5000').all();
    if (req.query.format === 'csv') {
      const esc = (s) => '"' + String(s || '').replace(/"/g, '""') + '"';
      const csv = 'email,source,created\n' +
        rows.map((r) => [esc(r.email), esc(r.source), esc(r.created)].join(',')).join('\n') + '\n';
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="leads.csv"');
      return res.send(csv);
    }
    res.json({ items: rows });
  }));

  /* --------------------------------------------------------- fallback */

  app.use('/api', (_req, res) => fail(res, 404, 'Unknown endpoint.'));

  app.locals.db = db;
  return app;
}

module.exports = { createApp };
