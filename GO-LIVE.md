# Go live — the complete walkthrough

Nothing here assumes you know anything. Follow it top to bottom. About 15 minutes, most of it waiting.

**Two rules before you start:**

1. **Copy and paste the commands.** Don't retype them — one wrong character and it fails.
2. **When you type a password, nothing appears on screen.** No dots, no stars, nothing. That's normal, not broken. Type it and press Enter.

---

# PART 1 — Send the code to GitHub

*On your Mac. About 3 minutes.*

### Step 1.1 — Open GitHub Desktop

Find it in Applications and open it.

### Step 1.2 — Make sure it's pointing at the right folder

Look at the **top-left corner**. It should say **Restaurant-casestudy**.

**If it says something else,** click that box → **Add** → **Add Existing Repository** → **Choose…** → navigate to:

```
u2ber club → claude agents → Restaurant Casestudy  APP  (book) → website
```

Select the **`website`** folder. Not the folder above it. Click **Add Repository**.

> ⚠️ **This is the one thing you must get right.** The folder above `website` contains your book drafts. If you point GitHub Desktop at that one, your unpublished manuscript gets uploaded to a public repository.

### Step 1.3 — Push

At the top you'll see **Push origin** with a number next to it. Click it. Wait for the spinner to stop.

### Step 1.4 — Check it worked

Open **https://github.com/u2berclubstudio/Restaurant-casestudy**

You should see `assets`, `server`, `deploy`, `t`, `index.html` and so on.

✅ **Files there? Part 1 done.**

❌ **Still empty?** GitHub Desktop is pointing at the wrong folder. Back to Step 1.2.

---

# PART 2 — Connect to your server

*About 2 minutes.*

### Step 2.1 — Open Terminal

Press **Cmd + Space**, type **Terminal**, press **Enter**.

### Step 2.2 — Connect

```bash
ssh root@129.121.123.192
```

Paste your server password and press Enter. Nothing appears as you type — that's correct.

### Step 2.3 — Confirm you're in

You should see something like `root@hal-server-844323:~#`. That means you're on the server, not your Mac.

✅ **Part 2 done.**

❌ **"Permission denied"** — wrong password. Press the up arrow, Enter, try again.

---

# PART 3 — Get the new code and deploy the site

*About 2 minutes.*

Paste this whole block at once:

```bash
cd /opt/restaurant-casestudy
git pull
sudo bash deploy/update.sh
```

You'll see it list the files it copied and finish with **"Deployed."**

---

# PART 4 — Install the backend

*About 5 minutes. This is the main event.*

```bash
sudo bash server/install-server.sh
```

It works through seven steps and prints each one:

```
── 1. Removing the old PocketBase backend ──
  ✓ pocketbase-rcs service stopped and removed
── 2. Checking Node ────────────────────────
  ✓ Node v22.x is recent enough
  ✓ SQLite is available from Node itself — nothing to compile
── 3. Installing the application ───────────
── 4. Setting up the service ───────────────
  ✓ rcs-api running on 127.0.0.1:8090
── 5. Pointing nginx at the new backend ────
  ✓ nginx -t passed and reloaded — your other sites untouched
```

**Let it run.** Don't press anything until it asks a question.

### It asks for your admin account

```
  Email [honestdigitalmarketer@gmail.com]:
```

**Press Enter** to accept your email.

```
  Password (at least 8 characters):
```

Type a password and press Enter. Nothing appears on screen — keep going.

> 💡 **One password now, not two.** The old setup needed a separate database password. This one doesn't — the account you sign in with *is* the admin account.

📝 **Write it down.** If you lose it, you'll need to run this installer again to set a new one.

### It finishes by testing itself

```
── 7. Verifying ──────────────
  ✓ API healthy — 8 tools configured
  ✓ Reachable through nginx at /api/bootstrap
  ✓ Signed in as honestdigitalmarketer@gmail.com successfully
  ✓ The account has admin rights
── Done ──────────────────────
  ✓ Backend live
```

That third line is the important one: **it actually logs in as you before declaring success.** If it says that, signing in through the website will work.

❌ **Stopped with a red ✗?** Copy everything in Terminal and send it to me. Nothing is broken — the installer restores its own changes if anything fails.

---

# PART 5 — Check nothing else broke

*One minute. Do not skip this.*

Open one of your other sites — **u2berclub.com** or **madeinludhiana.com**. It should load exactly as before.

The installer validates nginx before reloading and restores the backup if the config is invalid, but seeing it yourself is worth thirty seconds.

---

# PART 6 — Sign in

Go to **https://restaurantcasestudy.in/login.html**

Press **Cmd + Shift + R** first — this forces a fresh load and ignores anything your browser saved.

- **Email:** honestdigitalmarketer@gmail.com
- **Password:** the one from Part 4

Once you're in, the top-right shows your name and an **Admin** link.

---

# What you can do in the admin panel

**Users & access** — every account, with **Manage** on each one:

- **Plan** — free / pro / staff (staff means another admin)
- **Suspend** — blocks sign-in and every tool; their data is kept
- **Outlet limit** — how many restaurants they can track
- **Each of the 8 tools** — *Plan default* / *Always allow* / *Always block*, per person
- **Private note** — only admins see it
- **Set a new password for them** — the recovery path, see below

**Tool visibility** — the global rule per tool: *Public* (anyone), *Preview* (guests can try but not save), *Requires sign-in*, *Pro only*, *Invite only*, *Hidden*. Plus an on/off switch and the message shown on the padlock screen. Saves apply immediately.

**Leads** — captured emails, with CSV export.

**Overview** — counts and which tools were opened most in the last 30 days.

**Homepage** — not switched on yet. The headline and statistics live in `index.html` for now.

---

# Someone forgot their password

There are no reset emails yet, so you do it:

1. **Admin** → **Users & access**
2. **Manage** next to their name
3. Scroll to **Set a new password for them**
4. Type one, click **Set password**
5. Tell them what it is

It signs them out everywhere immediately.

---

# Everyday commands

Deploy a change you've pushed:

```bash
cd /opt/restaurant-casestudy && git pull && sudo bash deploy/update.sh
```

If you changed anything in `server/`, also restart the backend:

```bash
sudo systemctl restart rcs-api
```

Is it running?

```bash
systemctl status rcs-api
```

What went wrong?

```bash
journalctl -u rcs-api -n 50
```

Back up everyone's data (do this occasionally):

```bash
sudo cp /var/lib/restaurant-casestudy/data.db ~/rcs-backup-$(date +%F).db
```

That single file holds every account, outlet and worksheet. Copy it somewhere off the server and you can rebuild from nothing.

---

# Still outstanding

Things deliberately left for later, so you know they're choices and not oversights:

- **Password reset emails.** You reset passwords by hand for now.
- **Automatic backups.** The command above is manual.
- **Payments.** No Razorpay yet — Pro exists as a permission level, nothing charges for it.
- **Homepage editing from the admin panel.**
- **HTTPS certificate renewal.** Your certificate expires **28 November 2026** and will not renew itself, because it was issued by DNS validation. Put a reminder in your calendar for mid-November.
