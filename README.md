# Restaurant Casestudy

Eight working tools for restaurant owners, with accounts, per-user permissions and an admin panel. Static frontend (no build step) plus a small Node + SQLite backend for auth and data.

**Run it:** open `index.html`.

**Going live, step by step:** see [`GO-LIVE.md`](GO-LIVE.md) — the complete beginner walkthrough, every click and command.

**Deploy it to a VPS:** see [`deploy/DEPLOY.md`](deploy/DEPLOY.md) — GitHub Desktop → clone on server → one setup script. Safe on a box that already hosts other sites.

**Accounts, permissions and admin:** see [`server/README.md`](server/README.md).

**Deploy it anywhere else:** drag this folder onto [netlify.com/drop](https://app.netlify.com/drop), or connect it to Netlify / Vercel / Cloudflare Pages with an empty build command.

## Pages

```
index.html      Marketing homepage — hero, tool grid, how it works, pricing preview, FAQ
pricing.html    Free vs Pro, full comparison table, founder-pricing capture
app.html        Dashboard — all eight scores for the active outlet, weakest link, resume
compare.html    Side-by-side outlet comparison (Pro)
about.html      Positioning and the data stance
privacy.html    What is stored and where
404.html        Branded not-found page
login / signup / forgot / reset / account.html
admin.html      Staff panel — users, permissions, content, leads, announcements
t/*.html        The eight tool pages
deploy/         VPS deployment — configs, scripts and the walkthrough
server/         Node API — auth, permissions, data, installer and tests
```

## Tools

| Slug | Tool |
|---|---|
| `purpose` | The Purpose Check |
| `idea` | The Idea Validator |
| `location` | Location Audit Scorecard |
| `break-even` | Budget & Break-Even Calculator |
| `menu` | Menu Engineering Sheet |
| `sop` | SOP Builder |
| `marketing` | 90-Day Marketing Planner |
| `revenue` | Dead Hours Revenue Planner |

## The freemium split

**Free** — all eight tools fully working, one outlet, live calculations, scored verdicts, every flagged warning. Permanent, no card, no signup.

**Pro** — unlimited outlets, side-by-side comparison, PDF report export, industry benchmarks, saved snapshots with version history.

Plans and per-tool access are set in the admin panel and enforced server-side by `server/auth.js` and `server/app.js`. The interface reads the same answers to decide what to show, but the API refuses anything the account isn't entitled to — `curl` gets the same 403 the browser does.

**Guests** can still use whatever the admin marks Public or Preview, with answers kept in their own browser. That's the on-ramp to signing up.

## Configure

Most day-to-day settings now live in the **admin panel** — homepage copy, section visibility, tool permissions, plans, announcements. No file editing, no redeploy.

`assets/config.js` holds only what the admin panel can't:

```js
apiBase: '/api',        // where the Node API is proxied
pricing: {
  monthly: null,        // fallback; the admin panel overrides
  checkoutUrl: null     // Razorpay / Stripe / Lemon Squeezy
},
leadEndpoint: null      // optional mirror of captured emails to a form service
```

**Captured emails** now go to the backend automatically and are visible under Admin → Leads with CSV export. `leadEndpoint` is only for also mirroring them somewhere else.

## What is and isn't enforced

**Enforced on the server** — cannot be bypassed from a browser:

- Reading or writing any worksheet (tool access is checked on every create and update)
- Reading anyone else's data (every query is scoped to the authenticated user)
- The outlet limit
- Self-promotion — a hook reverts `plan`, `suspended` and `tool_overrides` on self-updates
- Every admin route checks `plan = "staff"`

**Interface only:** the tool *page* is a static file, so anyone can download `/t/menu.html` and run the calculator locally. They cannot save it, sync it, or reach any other account's data. To lock the files themselves, add nginx `auth_request` — the token is already mirrored to an `rcs_auth` cookie for that.

## Architecture

```
assets/app.css        Design system — deep red (#c41230) on white
assets/engine.js      Schema renderer, outlets, gating, sync, benchmarks, snapshots
assets/api.js         Auth + data client (dependency-free, no CDN)
assets/admin.js       The admin panel
assets/config.js      Endpoint and pricing fallbacks
assets/tools/*.js     One declarative schema per tool
server/               Node API — auth, permissions, data, tests
```

Each tool is a single object. Field types: `text` · `number` · `money` · `date` · `textarea` · `select` · `radio` · `checks` · `ratings` · `table` (repeating rows with computed columns) · `info`.

A section can carry `metrics(data)` for live figures. Each tool has `result(data)` returning `{score, band, flags}`, and optionally `benchmarks(data)` returning Pro-only comparison rows. Copy `purpose.js` for a simple tool, `break-even.js` for a calculator-heavy one.

Signed-in users' worksheets live in the `worksheets` table keyed by user + outlet + tool. Guests fall back to `localStorage` under the `rcs:` prefix, which also acts as the offline cache when the API is unreachable.

## Verified

Headless tests cover all 21 pages against four account states (guest, free, pro, staff): no JS errors anywhere, every internal link resolves, the permission gate returns exactly the right state for each tool and account combination, worksheets sync for signed-in users and never for guests, and a non-staff account hitting `/admin.html` is blocked.

The calculators still reproduce their reference figures — ₹417 fixed cost per trading hour, 28 customers/day break-even at 60% contribution margin, ₹1,529 in-house occasion-package profit against a ₹1,151 loss when outsourced.
