# Backend — accounts, permissions and the admin panel

Adds real user accounts, per-user tool permissions, server-synced worksheets and an admin panel to the site.

Runs as **PocketBase** — one Go binary with an embedded SQLite database — on `127.0.0.1:8090`, proxied by nginx at `/api`. Exactly the pattern your n8n and studio apps already use. No public port, no Docker, no monthly cost.

---

## Install

From the repo on your server:

```bash
cd /opt/restaurant-casestudy
git pull
sudo bash backend/install-backend.sh
```

It will ask for two accounts:

1. **Superuser** — for PocketBase's own dashboard at `/_/`. Database-level access.
2. **Staff** — the account you sign in with on the site itself, which unlocks `/admin.html`.

Make them different passwords. The staff one is what you'll use day to day.

The script installs the binary, creates the systemd service, adds the `/api` proxy to your existing vhost (validating nginx before reloading, restoring the backup if it fails), imports the collections, and seeds the eight tools plus the editable homepage copy.

Re-running it is safe. It skips seeding if it has already run.

---

## The admin panel

`https://restaurantcasestudy.in/admin.html` — sign in with the staff account.

### Users & access
Every registered user with their plan, status and joined date. **Manage** opens a panel where you set:

- **Plan** — Free, Pro, or Staff (full admin)
- **Outlet limit** — how many locations they can create
- **Suspend** — blocks sign-in and every tool; their data is kept
- **Per-tool access** — for each of the eight tools: *Plan default*, *Always allow*, or *Always block*

Per-user settings beat the tool's general visibility. That's how you give one person early access to a Pro tool, or block a specific tool for an account that's abusing it.

### Tool visibility
The master switch for everyone:

| Setting | Who can use it |
|---|---|
| **Public** | Anyone, signed in or not |
| **Preview** | Anyone can use it; signing in is needed to save |
| **Requires sign-in** | Any account |
| **Pro plan only** | Paying accounts |
| **Invite only** | Nobody, unless you grant it per user |
| **Hidden** | Off the site entirely |

Also per tool: an **enabled** switch, and the message shown when someone hits the lock.

Changes are live immediately — no redeploy.

### Homepage
Edit the hero headline, the lede, the stats strip, the tools heading — and switch whole sections on or off for logged-out visitors (pricing block, FAQ, stats, the tool grid itself). Also a master switch to pause new signups.

### Leads
Every email captured, with CSV export.

### Announcement
A site-wide banner across every page. Choose the audience: everyone, logged-out only, signed-in only, free plan, or Pro.

---

## How permissions are actually enforced

This matters, so here is the honest picture.

**Enforced on the server** — cannot be bypassed:

- Reading or writing any worksheet. `pb_hooks/rcs.pb.js` checks tool access on every create and update, so `curl` gets a 403 just like the browser would.
- Reading anyone else's data. Collection rules scope every query to `user = @request.auth.id`.
- The outlet limit.
- Promoting yourself. A hook overwrites `plan`, `suspended` and `tool_overrides` on any self-update, so PATCHing your own record does nothing.
- Every admin route checks `plan = "staff"` server-side.

**Enforced in the interface only:**

- The tool *page* itself. `/t/menu.html` is a static file, so anyone can download it. On load it asks the server whether they may use it and shows a lock if not.

So a technically capable person could pull down the HTML and run the calculator locally against their own browser storage. What they cannot do is save it to an account, sync it, reach anyone else's data, or get anything the API holds.

For most products that's the right trade — the tool's value is in keeping the work, not in the arithmetic. If you'd rather lock the files themselves, add nginx `auth_request` against a PocketBase endpoint; the auth token is already mirrored into a cookie (`rcs_auth`) for exactly that. Ask and I'll wire it up.

---

## Day-to-day

```bash
systemctl status pocketbase-rcs        # is it running
journalctl -u pocketbase-rcs -f        # live logs
systemctl restart pocketbase-rcs       # after editing pb_hooks
```

Editing `pb_hooks/rcs.pb.js` needs a restart. Everything else is live.

### Backups — do this

`/opt/pocketbase-rcs/pb_data` holds every account and every worksheet. Losing it loses your users' work.

```bash
sudo tee /etc/cron.daily/backup-rcs >/dev/null <<'EOF'
#!/bin/sh
mkdir -p /var/backups/rcs
tar czf /var/backups/rcs/pb_data-$(date +\%F).tar.gz -C /opt/pocketbase-rcs pb_data
find /var/backups/rcs -name 'pb_data-*.tar.gz' -mtime +30 -delete
EOF
sudo chmod +x /etc/cron.daily/backup-rcs
```

Thirty daily snapshots, oldest pruned. Copy them off the server too — a backup on the same disk isn't a backup.

### Email

Password resets need SMTP. Until you configure it, reset emails won't send.

PocketBase dashboard → **Settings → Mail settings**. Any transactional provider works — Brevo, Resend, Mailgun, or Gmail SMTP with an app password for low volume. Set the sender to something at your own domain.

Test it by clicking "Forgot password" on the site.

---

## Files

```
backend/
  pb_schema.json        Collections, fields and access rules
  pb_hooks/rcs.pb.js    Permission logic + admin API routes  ← the important one
  install-backend.sh    One-command installer
```

Frontend pieces:

```
assets/api.js       Auth, data and admin client (no dependencies)
assets/admin.js     The admin panel
login/signup/forgot/reset/account.html
admin.html
```

---

## Upgrading PocketBase

The version is pinned to **0.22.21** in `install-backend.sh` because the hooks are written against that JavaScript API, and PocketBase changed hook signatures in 0.23. Bumping the version means updating `pb_hooks/rcs.pb.js` too — don't change the pin casually. Back up `pb_data` first either way.

---

## If something breaks

**Site loads, but sign-in fails with a network error**
PocketBase isn't running or the proxy is missing. Check `systemctl status pocketbase-rcs`, then `curl -s localhost:8090/api/health`.

**`/api/rcs/bootstrap` returns 404**
The hooks file didn't load. Check `journalctl -u pocketbase-rcs -n 50` for a JavaScript syntax error, then restart.

**Admin panel says "Staff only" for your own account**
Your account's plan isn't `staff`. Fix it in the PocketBase dashboard: `/_/` → Collections → users → your record → set plan to `staff`.

**Everything is fine but the tools all show as locked**
Your browser has a stale token. Sign out and back in.

**Locked out entirely**
The PocketBase superuser can always reset things at `/_/`. If you've lost that too:
```bash
sudo systemctl stop pocketbase-rcs
sudo -u pocketbase /opt/pocketbase-rcs/pocketbase admin update you@email.com NEWPASSWORD --dir=/opt/pocketbase-rcs/pb_data
sudo systemctl start pocketbase-rcs
```
