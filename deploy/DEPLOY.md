# Deploying restaurantcasestudy.in

| | |
|---|---|
| **Domain** | `restaurantcasestudy.in` |
| **Server** | `129.121.123.192` |
| **Repo** | `github.com/u2berclubstudio/Restaurant-casestudy` *(public)* |
| **Web root** | `/var/www/restaurant-casestudy` |
| **Git clone** | `/opt/restaurant-casestudy` |

Everything here is additive: one new folder, one new vhost. Your existing sites are never edited, and the setup script refuses to reload the web server if the config doesn't validate.

Total time: about 15 minutes.

---

## About the site you already have at the root

This is the part worth understanding, because it's the thing you're right to be cautious about — and the answer is that there's no conflict.

Web servers route by **hostname**, not by folder. Your server already looks at the `Host:` header on every request and picks a vhost. Right now anything arriving at that IP falls through to your existing site, because nothing else claims a name.

Adding this site adds one rule: *"requests for `restaurantcasestudy.in` go to `/var/www/restaurant-casestudy`."* Everything else — your root site, its domain, direct hits on the IP — carries on exactly as before. An exact hostname match always wins over the default, so your existing site keeps every request that isn't for this specific domain.

The one situation that would be a genuine problem is if a vhost **already listed `restaurantcasestudy.in`** in its `server_name`. Both `preflight.sh` and `setup.sh` check for that by exact match and refuse to continue if they find it.

Two things that are *not* affected either:

- **Your existing SSL certificates.** Certbot issues a separate certificate named for this domain and leaves your other renewals alone.
- **Your existing logs.** This site writes to its own `restaurant-casestudy.*.log` files.

---

## Before you start

You'll need:

- SSH access to `129.121.123.192` (root or a sudo user)
- Access to your domain registrar's DNS panel for `restaurantcasestudy.in`
- **GitHub Desktop** on your Mac
- A **GitHub account**

---

## Step 1 — Push the site to GitHub

**Already done for you:** the `website` folder is now a Git repository, wired to your remote, with everything committed and ready. You just need to send it.

1. Open **GitHub Desktop**
2. If it shows `Restaurant-casestudy` as missing or empty, choose **File → Add Local Repository** and pick:
   ```
   .../Restaurant Casestudy  APP  (book)/website
   ```
   That folder *is* the repository now. (GitHub Desktop had cloned the empty repo into a subfolder, which would have left you editing one copy and publishing another — that's been corrected.)
3. You'll see one commit waiting: *"Add Restaurant Casestudy site"*
4. Click **Push origin**

Then reload `https://github.com/u2berclubstudio/Restaurant-casestudy` — you should see 34 files: the HTML pages, `assets/`, `t/` and `deploy/`.

> **Your repo is public.** That's fine for this code — there are no secrets in it, and `assets/config.js` holds only placeholders. But it does mean the repository must stay scoped to the `website` folder. Your book drafts live in the folder *above* it and are not tracked; keep it that way. If you'd rather not think about it, switch the repo to Private in **Settings → General → Danger Zone → Change visibility** — cloning still works, step 4 covers the token.

---

## Step 2 — Point the domain at the server

In your registrar's DNS panel for `restaurantcasestudy.in`, add exactly these two records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `129.121.123.192` | Auto / 3600 |
| A | `www` | `129.121.123.192` | Auto / 3600 |

Delete any existing A or CNAME record on `@` or `www` that points somewhere else — parking pages from the registrar are the usual culprit.

DNS usually propagates in 5–30 minutes. Check from your Mac's Terminal:

```bash
dig +short restaurantcasestudy.in
dig +short www.restaurantcasestudy.in
```

Both should print `129.121.123.192`. Until they do, the HTTPS step will fail — everything else still works.

> **Using Cloudflare?** Set both records to **DNS only** (grey cloud) until the certificate is issued. With the orange cloud on, `dig` returns Cloudflare's IP and Let's Encrypt validation can fail. Switch it back on afterwards if you want.

---

## Step 3 — Connect to your server

From your Mac's Terminal:

```bash
ssh root@129.121.123.192
```

Or with a sudo user: `ssh youruser@129.121.123.192`

---

## Step 4 — Clone the repo on the server

```bash
sudo mkdir -p /opt && cd /opt
sudo git clone https://github.com/u2berclubstudio/Restaurant-casestudy.git restaurant-casestudy
cd restaurant-casestudy
```

The repo is public, so this needs no credentials.

**If you later switch the repo to private,** GitHub will ask for credentials and reject your password. Use a token instead:

1. On GitHub: **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token**
2. Tick only the **`repo`** scope. Set an expiry you're comfortable with.
3. Copy the token — you'll only see it once.
4. Clone using it:

```bash
sudo git clone https://u2berclubstudio:ghp_yourtokenhere@github.com/u2berclubstudio/Restaurant-casestudy.git restaurant-casestudy
```

The token is then stored in the clone's remote URL, so future pulls work without re-entering it.

> `/opt` holds the Git clone — the working copy. The live site gets copied to `/var/www/` in the next step. Keeping them separate means your `.git` folder is never web-accessible.

---

## Step 5 — Run the preflight check

**Do this before anything else.** It's read-only — it changes nothing, reloads nothing, installs nothing. It just tells you what's on the server and whether adding this site can disturb what's already there.

```bash
sudo bash deploy/preflight.sh
```

It reports:

- Which web server is running, and whether a control panel is managing it
- **Every vhost currently configured**, with its `server_name` and document root — so you can see your root site listed and confirm it isn't claiming `restaurantcasestudy.in`
- Whether `/var/www/restaurant-casestudy` or `/opt/restaurant-casestudy` already exist
- Whether DNS resolves to this server yet
- Which SSL certificates already exist (none of which will be touched)

It ends with a clear verdict. If it says **STOP**, don't run setup — send me the output and I'll tell you what to do.

---

## Step 6 — Run setup

```bash
sudo bash deploy/setup.sh
```

The domain is already baked in, so no argument is needed. (Pass one — `sudo bash deploy/setup.sh otherdomain.com` — only if you want a different domain.)

The script will:

1. **Detect what's running** — Nginx, Apache, or a control panel like cPanel / Plesk / CyberPanel / aaPanel
2. **Refuse to continue** if any existing vhost already claims `restaurantcasestudy.in`
3. **Check DNS** and warn if the domain doesn't resolve to this server
4. **Copy the site** to `/var/www/restaurant-casestudy` with correct ownership and permissions
5. **Write one new vhost** for this domain only
6. **Validate the entire web server config** with `nginx -t` (or `apachectl configtest`)
7. **Reload, not restart** — your existing sites keep serving throughout
8. **Issue a free Let's Encrypt certificate** and set up the HTTPS redirect

**If validation fails at step 6**, the script deletes the new vhost and exits without reloading anything. Your existing sites stay exactly as they were, byte for byte.

**If you're on a control panel**, the script stops after step 4 and tells you to add the site through the panel's own interface — pointing its document root at `/var/www/restaurant-casestudy`. Writing configs behind a panel's back is how people break their other sites.

---

## Step 7 — Check it

Visit `https://restaurantcasestudy.in`. Then confirm:

- [ ] Homepage loads with the red theme and no missing fonts
- [ ] A tool page works — try `/t/break-even` and type a few numbers in
- [ ] The outlet bar appears at the top of tool pages
- [ ] `/pricing` loads without the `.html` (both forms work)
- [ ] `/deploy/setup.sh` returns 404 — server files are not public
- [ ] A made-up URL like `/nonsense` shows the branded 404 page
- [ ] Padlock icon in the address bar
- [ ] **Your existing root site still loads** — open it and confirm

If anything looks unstyled, hard-refresh with `Cmd+Shift+R`.

---

## Deploying changes later

This is the loop you'll use from now on:

**On your Mac:**
1. Edit files in the `website` folder
2. GitHub Desktop → write a summary → **Commit to main**
3. Click **Push origin**

**On the server:**
```bash
cd /opt/restaurant-casestudy && sudo bash deploy/update.sh
```

That pulls the new commit, syncs it to the web root, fixes permissions, and prints what changed. No restart needed — static files are served immediately.

### Making it one command

Add this to your Mac's `~/.zshrc`:

```bash
alias deploy-rcs="ssh root@129.121.123.192 'cd /opt/restaurant-casestudy && bash deploy/update.sh'"
```

Then after each push, just run `deploy-rcs`.

### Or fully automatic

If you'd rather not touch the server at all, add a webhook or a GitHub Action that SSHs in and runs `update.sh` on every push to `main`. Worth doing once you're deploying more than a few times a week — ask and I'll set it up.

---

## Before you go live

Two things in `assets/config.js` are still placeholders:

```js
leadEndpoint: null,     // emails go nowhere until you set this
allowProPreview: true,  // anyone can unlock Pro locally
```

- **`leadEndpoint`** — until you point this at a form service (Formspree, Getform, a Zapier webhook), captured emails only sit in the visitor's browser. You will collect nothing.
- **`allowProPreview`** — fine while you're validating demand. Set it to `false` before you charge anyone.

And a reminder from the main README: **plan state is client-side**. Anyone can flip themselves to Pro with devtools. That's acceptable for a launch that's measuring interest; it needs real auth and a server-side check before money changes hands.

---

## Troubleshooting

**"nginx: [emerg] duplicate default server"**
Another site is already claiming `default_server` on port 80. The supplied config doesn't use `default_server`, so this points at a pre-existing conflict — check `grep -r default_server /etc/nginx/sites-enabled/`.

**Certbot fails: "Domain does not resolve"**
DNS hasn't propagated. Wait and re-run just the certificate step:
```bash
sudo certbot --nginx -d restaurantcasestudy.in -d www.restaurantcasestudy.in --cert-name restaurantcasestudy.in
```

**Certbot fails on the www subdomain**
You probably have no `www` A record. Either add one, or issue for the bare domain only:
```bash
sudo certbot --nginx -d restaurantcasestudy.in --cert-name restaurantcasestudy.in
```

**403 Forbidden**
Permissions. Re-run:
```bash
sudo chown -R www-data:www-data /var/www/restaurant-casestudy
sudo find /var/www/restaurant-casestudy -type d -exec chmod 755 {} \;
sudo find /var/www/restaurant-casestudy -type f -exec chmod 644 {} \;
```

**Site shows an old version after deploying**
Browser cache. Hard-refresh with `Cmd+Shift+R`. HTML is served with `no-cache` so this should be rare; CSS and JS are cached for 7 days, so if you changed those and need them live immediately, rename the file or add `?v=2` to the `<link>`/`<script>` tag.

**Git says "detected dubious ownership"**
```bash
sudo git config --global --add safe.directory /opt/restaurant-casestudy
```
`update.sh` already does this, but you may hit it running `git` manually.

**I need to undo everything**
```bash
sudo rm /etc/nginx/sites-enabled/restaurant-casestudy
sudo nginx -t && sudo systemctl reload nginx
sudo rm -rf /var/www/restaurant-casestudy /opt/restaurant-casestudy
```
Removes only this site. Nothing else on the server is affected.

---

## What lives where

| Path | What it is |
|---|---|
| `/opt/restaurant-casestudy` | Git clone — pull here, never edit by hand |
| `/var/www/restaurant-casestudy` | Live web root — synced from the clone |
| `/etc/nginx/sites-available/restaurant-casestudy` | The vhost — the only file added to your web server config |
| `/var/log/nginx/restaurant-casestudy.*.log` | This site's logs, separate from your others |
| `/etc/letsencrypt/live/restaurantcasestudy.in/` | The certificate |
