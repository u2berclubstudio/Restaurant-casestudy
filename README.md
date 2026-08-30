# Restaurant Casestudy

Eight working tools for restaurant owners, with an outlet-based freemium model. Plain static site — no build step, no server, no dependencies.

**Run it:** open `index.html`.

**Deploy it to a VPS:** see [`deploy/DEPLOY.md`](deploy/DEPLOY.md) — GitHub Desktop → clone on server → one setup script. Safe on a box that already hosts other sites.

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
t/*.html        The eight tool pages
deploy/         VPS deployment — configs, scripts and the walkthrough
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

Gating lives in `Plan.require(feature, cb)` in `assets/engine.js`. Free users hitting a Pro feature get an upgrade dialog rather than a dead button.

**Pro preview.** Until real checkout exists, visitors can switch Pro on locally to see what it does. It is clearly labelled as a preview, charges nothing, and only affects that browser. Set `allowProPreview: false` in `assets/config.js` once payments are live.

## Configure

Everything you need is in `assets/config.js`:

```js
pricing: {
  monthly: null,        // set a number and it renders; null shows "Coming soon"
  yearly:  null,
  checkoutUrl: null     // Razorpay / Stripe / Lemon Squeezy
},
leadEndpoint: null,     // POST target for {email, source, at}
allowProPreview: true,
freeOutlets: 1
```

**Email capture.** With `leadEndpoint: null` addresses only sit in the visitor's browser. Point it at anything accepting a JSON POST — Formspree, Getform, Basin, a Zapier webhook into Sheets or Mailchimp, or a Netlify Function. The `source` field tells you where each address came from (`pricing-notify`, `tool:break-even`, …).

## What is still front-end only

There is no backend. Consequences worth knowing before launch:

- **Plan state is local.** Anyone can flip themselves to Pro via devtools. Fine for validating demand; needs real auth plus a server check before you charge.
- **Data does not sync** across devices, and is lost if the visitor clears browsing data. Every tool pushes PDF export for this reason.
- **No accounts.** Emails are captured, but there is no login.

When you add a backend, the seams are already in the right places: `Account` and `Plan` in `engine.js` are the two objects to swap.

## Architecture

```
assets/app.css        Design system — deep red (#c41230) on white
assets/engine.js      Schema renderer, outlets, plans, gating, benchmarks, snapshots
assets/config.js      The only file you normally edit
assets/tools/*.js     One declarative schema per tool
```

Each tool is a single object. Field types: `text` · `number` · `money` · `date` · `textarea` · `select` · `radio` · `checks` · `ratings` · `table` (repeating rows with computed columns) · `info`.

A section can carry `metrics(data)` for live figures. Each tool has `result(data)` returning `{score, band, flags}`, and optionally `benchmarks(data)` returning Pro-only comparison rows. Copy `purpose.js` for a simple tool, `break-even.js` for a calculator-heavy one.

Storage keys are namespaced `rcs:` — `tool:<outletId>:<slug>`, `snap:<outletId>:<slug>`, plus `outlets`, `activeOutlet`, `plan`, `index`, `account`.

## Verified

Headless tests cover all fourteen pages: no JS errors anywhere, every internal link resolves, Free correctly locks benchmarks/export/extra outlets while Pro unlocks them, and the calculators reproduce their reference figures — ₹417 fixed cost per trading hour, 28 customers/day break-even at 60% contribution margin, ₹1,529 in-house occasion-package profit against a ₹1,151 loss when outsourced.
