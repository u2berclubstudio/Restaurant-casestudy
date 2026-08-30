/**
 * Restaurant Casestudy — end-to-end tests.
 *
 * Serves the real website files, boots the real API, and drives the actual
 * pages in a headless browser. This is what proves api.js, engine.js and
 * admin.js work together before anything reaches the server.
 *
 *   cd server && npm run test:e2e
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { createApp } = require('../app');

const SITE = path.resolve(__dirname, '../..');
const DB = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rcs-e2e-')), 'e2e.db');

let passed = 0, failed = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else { failed++; failures.push(name); console.log(`  \x1b[31m✗ ${name}\x1b[0m${detail ? '\n      ' + detail : ''}`); }
}
function group(t) { console.log(`\n\x1b[36m${t}\x1b[0m`); }

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
};

(async function main() {
  let JSDOM;
  try { ({ JSDOM } = require('jsdom')); }
  catch (_) {
    console.log('\n  jsdom is not installed — skipping the browser tests.');
    console.log('  Install it with:  npm install --no-save jsdom\n');
    process.exit(0);
  }

  // One server that serves both the site files and the API, so the pages run
  // on a single origin exactly as they do behind nginx.
  const api = createApp(DB);
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) return api(req, res);

    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(SITE, rel);
    if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const post = (p, body, token) => fetch(base + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

  // Accounts the pages will sign in as.
  const staffRes = await post('/api/auth/signup', { email: 'boss@example.com', password: 'password123' });
  api.locals.db.prepare("UPDATE users SET plan='staff', outlet_limit=999 WHERE id=?").run(staffRes.body.user.id);
  const memberRes = await post('/api/auth/signup', { email: 'member@example.com', password: 'password123' });

  /** Load a page in jsdom, wait for its scripts to settle, return the window. */
  async function load(url, { token, user } = {}) {
    const errors = [];
    const dom = new JSDOM('', {
      url: base + url,
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true,
      beforeParse(win) {
        // jsdom has no fetch, and Node's global fetch refuses relative URLs —
        // which is exactly what api.js uses ('/api/...'). Resolve them here.
        win.fetch = (input, init) => fetch(new URL(String(input), base), init);
        win.confirm = () => true;
        win.alert = () => {};
        win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
        win.scrollTo = () => {};
        win.onerror = (m) => errors.push(String(m));
        win.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
        if (token) {
          win.localStorage.setItem('rcs:token', JSON.stringify(token));
          win.localStorage.setItem('rcs:user', JSON.stringify(user));
        }
      },
    });

    const html = await fetch(base + url).then((r) => r.text());
    dom.window.document.open();
    dom.window.document.write(html);
    dom.window.document.close();

    await new Promise((r) => setTimeout(r, 900));   // let boot() finish its calls
    return { win: dom.window, doc: dom.window.document, errors, dom };
  }

  const text = (doc) => (doc.body && doc.body.textContent || '').replace(/\s+/g, ' ');

  /* --------------------------------------------------------- public pages */
  group('Public pages load without errors');
  for (const page of ['/index.html', '/pricing.html', '/login.html', '/signup.html', '/app.html', '/t/break-even.html']) {
    const { doc, errors, dom } = await load(page);
    check(`${page} renders`, (doc.body && doc.body.children.length > 0), 'empty body');
    check(`${page} has no JavaScript errors`, errors.length === 0, errors.join(' | ').slice(0, 200));
    dom.window.close();
  }

  /* ------------------------------------------------------------ guest view */
  group('Signed-out visitor');
  {
    const { doc, dom } = await load('/index.html');
    const nav = doc.querySelector('[data-nav]');
    check('nav offers a way in', /sign in|start free/i.test(nav ? nav.textContent : ''),
      nav && nav.textContent.trim().slice(0, 80));
    check('the tool grid is visible', doc.querySelectorAll('.tool-card').length === 8,
      `${doc.querySelectorAll('.tool-card').length} cards`);
    dom.window.close();
  }

  /* ------------------------------------------------------------ signing in */
  group('Signing in through the real login form');
  {
    const { win, doc, dom } = await load('/login.html');
    doc.querySelector('#email').value = 'member@example.com';
    doc.querySelector('#pw').value = 'password123';
    doc.querySelector('form').dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 900));

    const token = JSON.parse(win.localStorage.getItem('rcs:token') || 'null');
    check('a session token is stored', !!token, 'no token in localStorage');
    const stored = JSON.parse(win.localStorage.getItem('rcs:user') || 'null');
    check('the account is remembered', stored && stored.email === 'member@example.com',
      JSON.stringify(stored));
    dom.window.close();
  }

  {
    const { doc, errors, dom } = await load('/login.html');
    doc.querySelector('#email').value = 'member@example.com';
    doc.querySelector('#pw').value = 'definitelywrong';
    doc.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 800));
    // login.html rewrites auth errors into its own friendlier sentence.
    check('a wrong password shows a message, not a crash',
      /did not work|wrong email or password/i.test(doc.querySelector('#msg').textContent),
      JSON.stringify(doc.querySelector('#msg').textContent));
    check('no JavaScript error on failed login', errors.length === 0, errors.join(' | ').slice(0, 160));
    dom.window.close();
  }

  /* ------------------------------------------------------- signed-in pages */
  group('Signed-in member');
  const member = { token: memberRes.body.token, user: memberRes.body.user };
  {
    const { doc, errors, dom } = await load('/app.html', member);
    check('dashboard loads for a signed-in user', errors.length === 0, errors.join(' | ').slice(0, 200));
    const nav = doc.querySelector('[data-nav]');
    check('nav no longer offers "Sign in"', !/sign in/i.test(nav ? nav.textContent : ''),
      nav && nav.textContent.trim().slice(0, 90));
    check('a normal member gets no Admin link', !/admin/i.test(nav ? nav.textContent : ''),
      nav && nav.textContent.trim().slice(0, 90));
    dom.window.close();
  }

  {
    const { doc, errors, dom } = await load('/t/break-even.html', member);
    check('a tool page loads signed in', errors.length === 0, errors.join(' | ').slice(0, 200));
    check('the worksheet actually rendered fields',
      doc.querySelectorAll('input, select, textarea').length > 3,
      `${doc.querySelectorAll('input, select, textarea').length} fields`);
    check('no padlock for a tool this account may use',
      !/create a free account to save/i.test(text(doc)));
    dom.window.close();
  }

  /* ------------------------------------------------------------ admin gate */
  group('Admin panel access');
  {
    const { doc, dom } = await load('/admin.html', member);
    check('a non-admin is refused', /does not have admin access|staff/i.test(text(doc)),
      text(doc).slice(0, 200));
    dom.window.close();
  }

  const staff = { token: staffRes.body.token, user: { ...staffRes.body.user, plan: 'staff' } };
  {
    const { doc, errors, dom } = await load('/admin.html', staff);
    check('an admin gets in', !/does not have admin access/i.test(text(doc)), text(doc).slice(0, 200));
    check('no JavaScript errors in the admin panel', errors.length === 0, errors.join(' | ').slice(0, 250));

    // The Users and Tools tabs fetch on first click, so click them.
    doc.querySelector('[data-tab="users"]').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 600));

    const rows = doc.querySelectorAll('#userRows tr');
    check('the user list is populated', rows.length >= 2, `${rows.length} rows`);
    check('both accounts are listed', /member@example\.com/.test(text(doc)));
    check('the reset-password control is present', !!doc.querySelector('#umSetPass'));

    doc.querySelector('[data-tab="tools"]').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 600));
    const toolRows = doc.querySelectorAll('#toolRows tr');
    check('all 8 tools appear in Tool visibility', toolRows.length === 8, `${toolRows.length} rows`);

    doc.querySelector('[data-tab="content"]').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    check('the Homepage tab explains itself rather than sitting blank',
      /isn't switched on yet/i.test(text(doc)));
    dom.window.close();
  }

  /* ---------------------------------------------- permission change is live */
  group('A permission change reaches the browser');
  {
    // Block one tool for the member, then load that tool page as them.
    await post(`/api/admin/user/${memberRes.body.user.id}`,
      { plan: 'free', tool_overrides: { 'break-even': 'deny' } }, staffRes.body.token);

    const { doc, dom } = await load('/t/break-even.html', member);
    check('the blocked tool shows a locked state',
      !/data-sync/.test(doc.body.innerHTML) || /isn't available|locked|no access/i.test(text(doc)),
      text(doc).slice(0, 220));
    check('the worksheet fields are gone',
      doc.querySelectorAll('#tool input, #tool select, #tool textarea').length === 0,
      `${doc.querySelectorAll('#tool input, #tool select, #tool textarea').length} fields still present`);
    dom.window.close();

    await post(`/api/admin/user/${memberRes.body.user.id}`,
      { plan: 'free', tool_overrides: {} }, staffRes.body.token);
  }

  /* ------------------------------------------------------------- reporting */
  server.close();
  try { api.locals.db.close(); } catch (_) {}
  fs.rmSync(path.dirname(DB), { recursive: true, force: true });

  console.log(`\n${'─'.repeat(52)}`);
  if (failed === 0) {
    console.log(`\x1b[32m  ${passed} checks passed, 0 failed\x1b[0m\n`);
    process.exit(0);
  }
  console.log(`\x1b[31m  ${passed} passed, ${failed} FAILED\x1b[0m`);
  failures.forEach((f) => console.log(`    · ${f}`));
  console.log('');
  process.exit(1);
})().catch((e) => {
  console.error('\nTest run crashed:', e);
  process.exit(1);
});
