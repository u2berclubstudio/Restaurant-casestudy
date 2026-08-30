# The backend

Express + SQLite. Two files of logic, one file of routes, and a test suite that runs the whole thing.

## Why it looks like this

**No native dependencies.** SQLite comes from Node itself (`node:sqlite`, Node 22.5+), so installing on a server never involves compiling C++. `express` is the only dependency and it is pure JavaScript. If `better-sqlite3` happens to be installed it gets used instead — `sqlite.js` picks whichever is available.

**Sessions, not JWTs.** A session is a random token; only its SHA-256 hash is stored. That makes sessions revocable — suspending an account or changing a password signs that person out everywhere, immediately. A JWT cannot be withdrawn once issued.

**scrypt for passwords**, from Node's own crypto module. No bcrypt, no native build.

**Bound to 127.0.0.1.** nginx is the only thing that can reach it, which is why there is no TLS or CORS handling here.

## Files

```
index.js            Entry point — port, database path, graceful shutdown
app.js              Every route. Permission checks live here
auth.js             Passwords, sessions, and accessFor() — the permission rule
db.js               Schema, seed data, session sweeping
sqlite.js           Driver adapter (node:sqlite or better-sqlite3)
make-admin.js       Create or promote an admin account
install-server.sh   VPS installer
test/               The test suites
```

## Running it locally

```bash
npm install
RCS_DB=./dev.db PORT=8090 npm start
```

## Tests

```bash
npm test           # 93 checks — the API on its own
npm run test:e2e   # 34 checks — the real website driven headlessly (needs jsdom)
npm run test:all   # both
```

`npm test` boots the real server against a throwaway database and drives it over HTTP. It asserts every security claim: that a user cannot promote themselves, cannot read another account's worksheets, cannot save to a tool they are blocked from, that suspension takes effect immediately, that changing a password invalidates other sessions, and that repeated failed logins get rate limited.

`npm run test:e2e` serves the actual site files and runs the real pages in jsdom against the real API — proving `api.js`, `engine.js` and `admin.js` work together before anything is deployed.

## The permission rule

One function, `accessFor(tool, user)` in `auth.js`, returns `full`, `preview` or `none`. Everything else defers to it: the bootstrap call, the per-tool check, and the guard on saving a worksheet.

Order of precedence:

1. **Staff** — always `full`
2. **Suspended** — always `none`
3. **Tool disabled** — `none`
4. **Per-user override** — `allow` or `deny` beats everything below
5. **Tool visibility** — public / preview / login / pro / invite / hidden

## What is and isn't enforced

**Enforced on the server** — cannot be bypassed from a browser:

- Reading or writing any worksheet
- Reading anyone else's data — every query is scoped to the authenticated user
- The outlet limit
- Self-promotion — the profile endpoint whitelists name, restaurant and city only
- Every admin route checks `plan = 'staff'`

**Interface only:** tool pages are static files, so anyone can download `/t/menu.html` and run the calculator locally. They cannot save it, sync it, or reach another account's data.

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8090` | Port to listen on |
| `HOST` | `127.0.0.1` | Never make this `0.0.0.0` — nginx is the front door |
| `RCS_DB` | `/var/lib/restaurant-casestudy/data.db` | The database file |
| `RCS_SQLITE_DRIVER` | auto | Set to `node` to force the built-in driver |

## Backups

Everything is one file:

```bash
sudo cp /var/lib/restaurant-casestudy/data.db ~/rcs-backup-$(date +%F).db
```

Copy it off the server and you can rebuild from nothing.
