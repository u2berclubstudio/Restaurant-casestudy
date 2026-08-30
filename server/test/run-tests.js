/**
 * Restaurant Casestudy — API tests.
 *
 * Boots the real server against a throwaway database and drives it over real
 * HTTP. Every permission claim in the README is asserted here.
 *
 *   cd server && npm test
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../app');

const DB = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rcs-test-')), 'test.db');

let passed = 0, failed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else {
    failed++; failures.push(name);
    console.log(`  \x1b[31m✗ ${name}\x1b[0m${detail ? '\n      ' + detail : ''}`);
  }
}
function group(title) { console.log(`\n\x1b[36m${title}\x1b[0m`); }

(async function main() {
  const app = createApp(DB);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  async function call(method, path_, { token, body } = {}) {
    const res = await fetch(base + path_, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) {}
    return { status: res.status, body: json, text };
  }

  /* ------------------------------------------------------------- health */
  group('Server starts');
  {
    const r = await call('GET', '/api/health');
    check('health responds 200', r.status === 200, `got ${r.status}`);
    check('8 tools seeded', r.body && r.body.tools === 8, `got ${r.body && r.body.tools}`);
  }

  /* ------------------------------------------------------------ signup */
  group('Signup and login');
  let free = {}, pro = {}, staff = {}, other = {};
  {
    let r = await call('POST', '/api/auth/signup',
      { body: { email: 'free@example.com', password: 'password123', name: 'Free Person' } });
    check('signup succeeds', r.status === 200 && !!r.body.token, r.text.slice(0, 120));
    free.token = r.body.token; free.id = r.body.user.id;
    check('new account is on the free plan', r.body.user.plan === 'free', JSON.stringify(r.body.user));
    check('password hash is never returned', !r.text.includes('scrypt'));

    r = await call('POST', '/api/auth/signup',
      { body: { email: 'free@example.com', password: 'password123' } });
    check('duplicate email rejected', r.status === 400, `got ${r.status}`);

    r = await call('POST', '/api/auth/signup',
      { body: { email: 'short@example.com', password: 'abc' } });
    check('short password rejected', r.status === 400);

    r = await call('POST', '/api/auth/signup',
      { body: { email: 'notanemail', password: 'password123' } });
    check('invalid email rejected', r.status === 400);

    // The attack the old backend needed a hook to stop.
    r = await call('POST', '/api/auth/signup',
      { body: { email: 'sneaky@example.com', password: 'password123', plan: 'staff', outlet_limit: 999 } });
    check('cannot sign up as staff', r.status === 200 && r.body.user.plan === 'free',
      JSON.stringify(r.body.user));
    check('cannot set own outlet limit at signup', r.body.user.outlet_limit === 1);

    r = await call('POST', '/api/auth/login',
      { body: { email: 'free@example.com', password: 'password123' } });
    check('login with correct password works', r.status === 200 && !!r.body.token);

    r = await call('POST', '/api/auth/login',
      { body: { email: 'free@example.com', password: 'wrongpassword' } });
    check('login with wrong password fails', r.status === 400);
    check('failure message does not reveal the email exists',
      r.body.message === 'Wrong email or password.', r.body && r.body.message);

    r = await call('POST', '/api/auth/login',
      { body: { email: 'nobody@example.com', password: 'password123' } });
    check('unknown email gives the identical message',
      r.body.message === 'Wrong email or password.');

    r = await call('GET', '/api/auth/me', { token: free.token });
    check('session token identifies the user', r.status === 200 && r.body.user.id === free.id);

    r = await call('GET', '/api/auth/me', { token: 'not-a-real-token' });
    check('forged token rejected', r.status === 401, `got ${r.status}`);
  }

  /* ------------------------------------------- create pro/staff accounts */
  {
    let r = await call('POST', '/api/auth/signup',
      { body: { email: 'pro@example.com', password: 'password123' } });
    pro.token = r.body.token; pro.id = r.body.user.id;

    r = await call('POST', '/api/auth/signup',
      { body: { email: 'staff@example.com', password: 'password123' } });
    staff.token = r.body.token; staff.id = r.body.user.id;

    r = await call('POST', '/api/auth/signup',
      { body: { email: 'other@example.com', password: 'password123' } });
    other.token = r.body.token; other.id = r.body.user.id;

    // Promote directly in the database, the way the installer does.
    app.locals.db.prepare("UPDATE users SET plan = 'staff', outlet_limit = 999 WHERE id = ?").run(staff.id);
    app.locals.db.prepare("UPDATE users SET plan = 'pro', outlet_limit = 999 WHERE id = ?").run(pro.id);
  }

  /* ------------------------------------------------------- self-promotion */
  group('A user cannot promote themselves');
  {
    let r = await call('PATCH', '/api/auth/profile',
      { token: free.token, body: { name: 'New Name', plan: 'staff', suspended: false, outlet_limit: 99 } });
    check('profile update succeeds', r.status === 200);
    check('name did change', r.body.user.name === 'New Name');
    check('plan did NOT change', r.body.user.plan === 'free', JSON.stringify(r.body.user));
    check('outlet limit did NOT change', r.body.user.outlet_limit === 1);

    r = await call('POST', '/api/admin/user/' + free.id,
      { token: free.token, body: { plan: 'staff' } });
    check('non-staff blocked from the admin API', r.status === 403, `got ${r.status}`);

    r = await call('GET', '/api/admin/users', { token: free.token });
    check('non-staff cannot list users', r.status === 403);

    r = await call('GET', '/api/admin/users');
    check('signed-out visitor cannot list users', r.status === 403);
  }

  /* ------------------------------------------------------- tool access */
  group('Tool permissions');
  {
    // Seeded defaults: purpose/idea/break-even public, the rest preview.
    let r = await call('GET', '/api/access/purpose');
    check('guest gets full access to a public tool', r.body.access === 'full', JSON.stringify(r.body));

    r = await call('GET', '/api/access/menu');
    check('guest gets preview on a preview tool', r.body.access === 'preview', JSON.stringify(r.body));

    r = await call('GET', '/api/access/menu', { token: free.token });
    check('signed-in user gets full on a preview tool', r.body.access === 'full');

    r = await call('GET', '/api/access/nonsense');
    check('unknown tool gives 404', r.status === 404);

    // Make one tool Pro-only and check every account state against it.
    await call('POST', '/api/admin/tools', {
      token: staff.token,
      body: { items: [{ slug: 'sop', visibility: 'pro', enabled: true, locked_message: 'Pro plan only.' }] },
    });

    r = await call('GET', '/api/access/sop');
    check('guest blocked from a Pro tool', r.body.access === 'none');
    r = await call('GET', '/api/access/sop', { token: free.token });
    check('free user blocked from a Pro tool', r.body.access === 'none');
    r = await call('GET', '/api/access/sop', { token: pro.token });
    check('pro user allowed', r.body.access === 'full');
    r = await call('GET', '/api/access/sop', { token: staff.token });
    check('staff always allowed', r.body.access === 'full');

    // Per-user override: hand this one free user the Pro tool.
    await call('POST', '/api/admin/user/' + free.id,
      { token: staff.token, body: { plan: 'free', tool_overrides: { sop: 'allow' } } });
    r = await call('GET', '/api/access/sop', { token: free.token });
    check('per-user allow override beats the Pro rule', r.body.access === 'full', JSON.stringify(r.body));

    // And block a tool for one person only.
    await call('POST', '/api/admin/user/' + free.id,
      { token: staff.token, body: { plan: 'free', tool_overrides: { sop: 'allow', purpose: 'deny' } } });
    r = await call('GET', '/api/access/purpose', { token: free.token });
    check('per-user deny override blocks a public tool', r.body.access === 'none');
    r = await call('GET', '/api/access/purpose', { token: other.token });
    check('the block applies to that user only', r.body.access === 'full');

    // An override naming a tool that doesn't exist must not be stored.
    await call('POST', '/api/admin/user/' + other.id,
      { token: staff.token, body: { plan: 'free', tool_overrides: { madeup: 'allow', sop: 'banana' } } });
    r = await call('GET', '/api/admin/users', { token: staff.token });
    const otherRow = r.body.items.find((u) => u.id === other.id);
    check('bogus overrides are discarded',
      Object.keys(otherRow.tool_overrides).length === 0, JSON.stringify(otherRow.tool_overrides));

    // Restore for later tests.
    await call('POST', '/api/admin/user/' + free.id,
      { token: staff.token, body: { plan: 'free', tool_overrides: {} } });
    await call('POST', '/api/admin/tools', {
      token: staff.token,
      body: { items: [{ slug: 'sop', visibility: 'preview', enabled: true }] },
    });
  }

  /* ---------------------------------------------------------- outlets */
  group('Outlets and the free plan limit');
  let outletA, outletB;
  {
    let r = await call('POST', '/api/outlets', { token: free.token, body: { name: 'Ludhiana Cafe', city: 'Ludhiana' } });
    check('first outlet created', r.status === 200 && !!r.body.id, r.text.slice(0, 120));
    outletA = r.body.id;

    r = await call('POST', '/api/outlets', { token: free.token, body: { name: 'Second Branch' } });
    check('free plan blocked from a second outlet', r.status === 403, `got ${r.status}`);
    check('the refusal explains why',
      /one outlet/i.test(r.body.message || ''), r.body && r.body.message);

    r = await call('POST', '/api/outlets', { token: pro.token, body: { name: 'Pro Outlet' } });
    check('pro account can create outlets', r.status === 200);
    outletB = r.body.id;

    r = await call('POST', '/api/outlets', { token: pro.token, body: { name: 'Pro Outlet 2' } });
    check('pro account can create a second outlet', r.status === 200);

    r = await call('GET', '/api/outlets', { token: free.token });
    check('outlet list is scoped to the owner', r.body.items.length === 1, JSON.stringify(r.body.items));

    r = await call('PATCH', '/api/outlets/' + outletB, { token: free.token, body: { name: 'Stolen' } });
    check("cannot rename another user's outlet", r.status === 404, `got ${r.status}`);

    r = await call('DELETE', '/api/outlets/' + outletB, { token: free.token });
    check("cannot delete another user's outlet", r.status === 404);

    r = await call('POST', '/api/outlets', { token: free.token, body: { name: '' } });
    check('outlet name is required', r.status === 400);
  }

  /* -------------------------------------------------------- worksheets */
  group('Worksheets save, sync and stay private');
  {
    let r = await call('PUT', '/api/worksheets', {
      token: free.token,
      body: { outlet: outletA, tool: 'break-even', data: { rent: 45000, covers: 28 }, progress: 60, score: 72, band: 'Solid' },
    });
    check('worksheet saved', r.status === 200, r.text.slice(0, 160));

    r = await call('GET', '/api/worksheets?outlet=' + outletA, { token: free.token });
    check('worksheet reads back', r.body.items.length === 1);
    check('the numbers survive the round trip',
      r.body.items[0].data.rent === 45000 && r.body.items[0].data.covers === 28,
      JSON.stringify(r.body.items[0].data));
    check('score and band survive', r.body.items[0].score === 72 && r.body.items[0].band === 'Solid');

    // Saving again must update, not duplicate.
    await call('PUT', '/api/worksheets', {
      token: free.token, body: { outlet: outletA, tool: 'break-even', data: { rent: 50000 }, progress: 70 },
    });
    r = await call('GET', '/api/worksheets?outlet=' + outletA, { token: free.token });
    check('re-saving updates rather than duplicating', r.body.items.length === 1, `${r.body.items.length} rows`);
    check('the update took effect', r.body.items[0].data.rent === 50000);

    r = await call('GET', '/api/worksheets?outlet=' + outletA, { token: other.token });
    check("another user sees none of it", r.body.items.length === 0, JSON.stringify(r.body.items));

    r = await call('PUT', '/api/worksheets', {
      token: other.token, body: { outlet: outletA, tool: 'menu', data: { x: 1 } },
    });
    check("cannot write into another user's outlet", r.status === 404, `got ${r.status}`);

    r = await call('PUT', '/api/worksheets', { body: { outlet: outletA, tool: 'menu', data: {} } });
    check('signed-out visitor cannot save at all', r.status === 401);

    r = await call('PUT', '/api/worksheets', {
      token: free.token, body: { outlet: outletA, tool: 'does-not-exist', data: {} },
    });
    check('unknown tool rejected', r.status === 400);
  }

  /* -------------------------------------------- gating enforced on write */
  group('A blocked tool cannot be saved to, even by curl');
  {
    await call('POST', '/api/admin/tools', {
      token: staff.token,
      body: { items: [{ slug: 'marketing', visibility: 'pro', enabled: true }] },
    });

    let r = await call('PUT', '/api/worksheets', {
      token: free.token, body: { outlet: outletA, tool: 'marketing', data: { plan: 'x' } },
    });
    check('free user refused a Pro tool on save', r.status === 403, `got ${r.status}`);
    check('refusal explains the Pro plan', /pro/i.test(r.body.message || ''), r.body && r.body.message);

    await call('POST', '/api/admin/tools', {
      token: staff.token,
      body: { items: [{ slug: 'marketing', visibility: 'hidden', enabled: false }] },
    });
    r = await call('PUT', '/api/worksheets', {
      token: pro.token, body: { outlet: outletB, tool: 'marketing', data: {} },
    });
    check('a disabled tool refuses even a Pro account', r.status === 403);

    await call('POST', '/api/admin/tools', {
      token: staff.token,
      body: { items: [{ slug: 'marketing', visibility: 'preview', enabled: true }] },
    });
  }

  /* --------------------------------------------------------- suspension */
  group('Suspension');
  {
    await call('POST', '/api/admin/user/' + other.id,
      { token: staff.token, body: { plan: 'free', suspended: true } });

    let r = await call('GET', '/api/auth/me', { token: other.token });
    check('suspending signs the user out immediately', r.status === 401, `got ${r.status}`);

    r = await call('POST', '/api/auth/login',
      { body: { email: 'other@example.com', password: 'password123' } });
    check('suspended user cannot log back in', r.status === 403);

    await call('POST', '/api/admin/user/' + other.id,
      { token: staff.token, body: { plan: 'free', suspended: false } });
    r = await call('POST', '/api/auth/login',
      { body: { email: 'other@example.com', password: 'password123' } });
    check('un-suspending restores access', r.status === 200);
    other.token = r.body.token;
  }

  /* ----------------------------------------------------- password change */
  group('Passwords');
  {
    let r = await call('POST', '/api/auth/password',
      { token: free.token, body: { current: 'wrongpassword', next: 'newpassword123' } });
    check('wrong current password refused', r.status === 400);

    r = await call('POST', '/api/auth/password',
      { token: free.token, body: { current: 'password123', next: 'short' } });
    check('short new password refused', r.status === 400);

    const oldToken = free.token;
    r = await call('POST', '/api/auth/password',
      { token: free.token, body: { current: 'password123', next: 'newpassword123' } });
    check('password change succeeds', r.status === 200 && !!r.body.token);
    free.token = r.body.token;

    r = await call('GET', '/api/auth/me', { token: oldToken });
    check('changing password signs out other devices', r.status === 401, `got ${r.status}`);

    r = await call('POST', '/api/auth/login',
      { body: { email: 'free@example.com', password: 'newpassword123' } });
    check('the new password works', r.status === 200);

    r = await call('POST', '/api/auth/login',
      { body: { email: 'free@example.com', password: 'password123' } });
    check('the old password no longer works', r.status === 400);

    // Admin resetting someone's password — the locked-out recovery path.
    r = await call('POST', `/api/admin/user/${free.id}/password`,
      { token: staff.token, body: { password: 'adminset123' } });
    check('admin can set a password', r.status === 200);

    r = await call('POST', '/api/auth/login',
      { body: { email: 'free@example.com', password: 'adminset123' } });
    check('the admin-set password works', r.status === 200);
    free.token = r.body.token;

    r = await call('POST', `/api/admin/user/${free.id}/password`,
      { token: free.token, body: { password: 'hackattempt' } });
    check('a non-admin cannot reset anyone\'s password', r.status === 403);
  }

  /* ------------------------------------------------------------ logout */
  group('Logout');
  {
    const r0 = await call('POST', '/api/auth/login',
      { body: { email: 'free@example.com', password: 'adminset123' } });
    const t = r0.body.token;
    await call('POST', '/api/auth/logout', { token: t });
    const r = await call('GET', '/api/auth/me', { token: t });
    check('token stops working after logout', r.status === 401, `got ${r.status}`);
  }

  /* ------------------------------------------------------- rate limiting */
  group('Brute force protection');
  {
    let last;
    for (let i = 0; i < 10; i++) {
      last = await call('POST', '/api/auth/login',
        { body: { email: 'ratelimit@example.com', password: 'guess' + i } });
    }
    check('repeated failures get rate limited', last.status === 429, `got ${last.status}`);
  }

  /* -------------------------------------------------------- bootstrap */
  group('Bootstrap');
  {
    let r = await call('GET', '/api/bootstrap');
    check('guest bootstrap works', r.status === 200, r.text.slice(0, 120));
    check('all 8 tools listed', r.body.tools.length === 8, `${r.body.tools.length}`);
    check('guest has no user', r.body.user === null);
    check('every tool carries an access decision',
      r.body.tools.every((t) => ['full', 'preview', 'none'].includes(t.access)));

    r = await call('GET', '/api/bootstrap', { token: staff.token });
    check('staff bootstrap identifies them as staff', r.body.user.plan === 'staff');
    check('staff see full access everywhere', r.body.tools.every((t) => t.access === 'full'));
  }

  /* ------------------------------------------------------------ admin */
  group('Admin panel data');
  {
    let r = await call('GET', '/api/admin/overview', { token: staff.token });
    check('overview loads', r.status === 200 && r.body.users_total >= 4, r.text.slice(0, 120));

    r = await call('GET', '/api/admin/users', { token: staff.token });
    check('user list loads', r.body.items.length >= 4);
    check('emails are visible to admins', r.body.items.every((u) => !!u.email));
    check('password hashes are not in the user list', !r.text.includes('scrypt'));

    r = await call('GET', '/api/admin/users?q=pro@example', { token: staff.token });
    check('user search filters', r.body.items.length === 1, `${r.body.items.length} results`);

    r = await call('POST', '/api/admin/user/' + staff.id,
      { token: staff.token, body: { plan: 'free' } });
    check('an admin cannot demote themselves by accident', r.status === 400, `got ${r.status}`);

    r = await call('POST', '/api/admin/user/' + free.id,
      { token: staff.token, body: { plan: 'banana' } });
    check('an invalid plan is rejected', r.status === 400);

    r = await call('POST', '/api/admin/user/' + free.id,
      { token: staff.token, body: { plan: 'pro' } });
    check('admin can upgrade someone to Pro', r.status === 200);
    r = await call('GET', '/api/bootstrap', { token: free.token });
    check('the upgrade takes effect immediately', r.body.user.plan === 'pro', JSON.stringify(r.body.user));

    r = await call('GET', '/api/admin/tools', { token: staff.token });
    check('tool settings load', r.body.items.length === 8);
  }

  /* ------------------------------------------------------------ leads */
  group('Leads');
  {
    let r = await call('POST', '/api/leads', { body: { email: 'lead@example.com', source: 'pricing' } });
    check('anyone can submit a lead', r.status === 200);

    r = await call('POST', '/api/leads', { body: { email: 'nope' } });
    check('invalid lead email rejected', r.status === 400);

    r = await call('GET', '/api/admin/leads', { token: staff.token });
    check('admin sees captured leads', r.body.items.length === 1);

    r = await call('GET', '/api/admin/leads', { token: free.token });
    check('non-admin cannot read leads', r.status === 403);

    const res = await fetch(base + '/api/admin/leads?format=csv', { headers: { Authorization: staff.token } });
    const csv = await res.text();
    check('CSV export works', csv.includes('lead@example.com') && csv.startsWith('email,source,created'));
  }

  /* --------------------------------------------------------- unknown */
  group('Unknown endpoints');
  {
    const r = await call('GET', '/api/nope/nothing/here');
    check('unknown API path gives a clean 404 JSON', r.status === 404 && !!r.body.message,
      r.text.slice(0, 120));
  }

  /* ----------------------------------------------------------- report */
  server.close();
  try { app.locals.db.close(); } catch (_) {}
  fs.rmSync(path.dirname(DB), { recursive: true, force: true });

  console.log(`\n${'─'.repeat(52)}`);
  if (failed === 0) {
    console.log(`\x1b[32m  ${passed} checks passed, 0 failed\x1b[0m\n`);
    process.exit(0);
  } else {
    console.log(`\x1b[31m  ${passed} passed, ${failed} FAILED\x1b[0m`);
    failures.forEach((f) => console.log(`    · ${f}`));
    console.log('');
    process.exit(1);
  }
})().catch((e) => {
  console.error('\nTest run crashed:', e);
  process.exit(1);
});
