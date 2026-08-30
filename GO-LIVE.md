# Go live — the complete walkthrough

Nothing here assumes you know anything. Follow it top to bottom. Total time: about 25 minutes, most of it waiting.

**Two rules before you start:**

1. **Copy and paste the commands.** Don't retype them — one wrong character and it fails.
2. **When you paste a password, nothing appears on screen.** No dots, no stars, nothing. That's normal, not broken. Type it and press Enter.

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

Look at the top of the window. You should see a button saying **Push origin** with a number next to it (probably **1**).

Click it.

Wait for the spinner to stop. That's it.

### Step 1.4 — Check it worked

Open this in your browser:

**https://github.com/u2berclubstudio/Restaurant-casestudy**

You should now see a list of files and folders — `assets`, `backend`, `deploy`, `t`, `index.html` and so on.

✅ **If you see those files, Part 1 is done.**

❌ **If it still looks empty:** GitHub Desktop is pointing at the wrong folder. Go back to Step 1.2.

---

# PART 2 — Connect to your server

*About 2 minutes.*

### Step 2.1 — Open Terminal

Press **Cmd + Space** (the spacebar). A search box appears.

Type **Terminal** and press **Enter**.

A white or black window opens with some text and a blinking cursor. This is Terminal. Don't be intimidated — you're just going to paste things into it.

### Step 2.2 — Connect

Copy this line and paste it into Terminal, then press **Enter**:

```bash
ssh root@129.121.123.192
```

**The first time only,** it may ask:

```
Are you sure you want to continue connecting (yes/no)?
```

Type **yes** and press Enter.

Then it asks for your password. **Paste your server password and press Enter.** Remember — nothing will appear on screen as you type. That's correct.

### Step 2.3 — Confirm you're in

You should now see something like:

```
root@hal-server-844323:~#
```

That `root@hal-server-844323` bit means you're on the server now, not your Mac.

✅ **Part 2 done.**

❌ **"Permission denied"** — wrong password. Press the up arrow to get the command back, press Enter, try again.

---

# PART 3 — Install the backend

*About 10 minutes. This is the main event.*

### Step 3.1 — Go to the right folder and get the new code

Copy and paste this whole block at once (it's three commands — that's fine, paste them together):

```bash
cd /opt/restaurant-casestudy
git pull
ls backend
```

You should see:

```
README-BACKEND.md  install-backend.sh  pb_hooks  pb_schema.json
```

❌ **If it says `ls: cannot access 'backend'`** — the code didn't arrive. Go back to Part 1 and make sure you pushed.

### Step 3.2 — Install a small tool the installer needs

```bash
apt-get install -y unzip
```

Wait for it to finish. Takes a few seconds.

### Step 3.3 — Run the installer

```bash
bash backend/install-backend.sh
```

Now it starts working. You'll see it print sections as it goes:

```
── 1. Checking the port ────────
  ✓ Port 8090 is free
── 2. Installing PocketBase ────
  ✓ Installed pocketbase v0.22.21
── 3. Installing server-side rules
  ✓ Permission rules installed
── 4. systemd service ──────────
  ✓ pocketbase-rcs running on 127.0.0.1:8090
── 5. Adding the API proxy to your vhost
  ✓ nginx -t passed, reloaded — your other sites untouched
```

**Let it run.** Don't press anything until it asks you a question.

### Step 3.4 — First question: the superuser

It stops and asks:

```
PocketBase needs a superuser account for its own dashboard.
Superuser email [honestdigitalmarketer@gmail.com]:
```

**Just press Enter** to accept your email.

```
Superuser password (min 10 chars):
```

Type a password. **At least 10 characters.** Nothing appears on screen — keep typing anyway, then press Enter.

📝 **Write this password down somewhere safe.** This is your emergency master key to the database.

### Step 3.5 — Second question: your staff account

```
Now create the staff account you'll actually sign in with on the site.
Staff email [honestdigitalmarketer@gmail.com]:
```

**Press Enter** to accept your email again.

```
Staff password (min 8 chars):
```

Type a **different** password. At least 8 characters. Press Enter.

📝 **Write this one down too.** This is the one you'll use every day to log into your admin panel.

> **Why two passwords?** The first is for the database's own control room — you'll almost never use it. The second is your normal login on your own website. Keeping them separate means if one leaks, the other still protects you.

### Step 3.6 — Watch it finish

```
── 6. Creating collections and seed data ────
    collections imported
    8 tools seeded
    22 content keys seeded
    staff account created and promoted
── 7. Verifying ────
  ✓ API responding — 8 tools configured
  ✓ Reachable at https://restaurantcasestudy.in/api/rcs/bootstrap
── Done ────
  ✓ Backend live
```

✅ **If you see "Backend live", you're done with the hard part.**

❌ **If it stopped with a red ✗** — copy everything in the Terminal window, paste it to me, and I'll tell you exactly what to do. Nothing is broken; the script undoes its own changes if anything fails.

> **Re-running the installer?** It's safe. But when it asks for the superuser password the second time, **enter the same one you used before** — the account already exists and it just needs to sign in. If you've forgotten it, the guide's troubleshooting section at the bottom shows how to reset it.

---

# PART 4 — Check your site still works

*About 2 minutes. Do not skip this.*

### Step 4.1 — Your site

Open **https://restaurantcasestudy.in** in your browser.

Press **Cmd + Shift + R** (this forces a fresh load, ignoring anything saved).

You should see the homepage with the red theme, and in the top-right corner: **Sign in** and **Start free**.

### Step 4.2 — Your OTHER sites

**This is the important check.** Open one of your existing sites — `u2berclub.com`, or `madeinludhiana.com`.

It should load exactly as before.

✅ **Both loading? You're safe.** The installer validated nginx before touching anything, but seeing it yourself is worth thirty seconds.

---

# PART 5 — Log in and set things up

*About 5 minutes. The fun part.*

### Step 5.1 — Sign in

Go to **https://restaurantcasestudy.in/login.html**

- **Email:** honestdigitalmarketer@gmail.com
- **Password:** the **staff** password from Step 3.5

Click **Sign in**.

You land on your dashboard. Look at the top-right — it now shows your name instead of "Sign in", and there's a new **Admin** link.

### Step 5.2 — Open the admin panel

Click **Admin** in the top navigation. Or go straight to **https://restaurantcasestudy.in/admin.html**

You'll see six tabs across the top:

| Tab | What it does |
|---|---|
| **Overview** | How many users, outlets, worksheets, leads — and which tools people actually open |
| **Users & access** | Every user. Set their plan, block or grant individual tools, suspend them |
| **Tool visibility** | Who can use each of the eight tools |
| **Homepage** | Edit your homepage text, hide whole sections |
| **Leads** | Every email captured, with a CSV download |
| **Announcement** | A banner across the top of every page |

### Step 5.3 — Try it: change your homepage headline

1. Click the **Homepage** tab
2. Find **Hero headline**
3. Change the text to anything you like
4. Scroll down, click **Save homepage**
5. Open **https://restaurantcasestudy.in** in a new tab and press **Cmd + Shift + R**

Your new headline is there. **No redeploy, no code, no GitHub.**

Change it back if you want.

### Step 5.4 — Try it: lock a tool

1. Click the **Tool visibility** tab
2. Find **Menu Engineering Sheet**
3. Change its dropdown to **Pro plan only**
4. Click **Save tool settings**
5. Open **https://restaurantcasestudy.in/t/menu.html** in a **private/incognito window** (Cmd + Shift + N in Chrome)

You'll see a padlock and "This tool is part of the Pro plan."

That's the permission system working. Set it back to whatever you want.

### Step 5.5 — Understand the two levels of control

There are **two** places tool access is decided, and this trips people up:

- **Tool visibility tab** = the rule for *everybody*. "Menu Engineering is Pro-only."
- **Users & access tab → Manage** = the exception for *one person*. "…but Rahul gets it anyway."

The per-user setting always wins. That's how you give a specific customer early access, or block a specific tool for someone abusing it.

---

# PART 6 — Two things before real users arrive

## 6.1 — Turn on password reset emails

Right now, if someone clicks "Forgot password", nothing sends. Here's the fix.

**Step 1.** Go to **https://restaurantcasestudy.in/_/**

**Step 2.** Log in with the **superuser** email and password (Step 3.4 — the first one).

**Step 3.** Click the **⚙️ Settings** gear in the left sidebar → **Mail settings**.

**Step 4.** Turn on **Use SMTP mail server**.

**Step 5.** Fill in your email provider's details. If you don't have one, [Brevo](https://www.brevo.com) is free for 300 emails a day:

| Field | What to put |
|---|---|
| SMTP server host | Your provider gives you this, e.g. `smtp-relay.brevo.com` |
| Port | `587` |
| Username | From your provider |
| Password | From your provider |
| Sender name | `Restaurant Casestudy` |
| Sender address | `noreply@restaurantcasestudy.in` |

**Step 6.** Click **Save changes**, then **Send test email** to yourself.

**Step 7.** Check it arrived. If it did, go to your site's "Forgot password" page and try a real reset.

## 6.2 — Set up automatic backups

`pb_data` now holds every user account and every worksheet. If the server dies without a backup, that's gone permanently.

Back in Terminal (still connected to the server), paste this whole block:

```bash
tee /etc/cron.daily/backup-rcs >/dev/null <<'EOF'
#!/bin/sh
mkdir -p /var/backups/rcs
tar czf /var/backups/rcs/pb_data-$(date +\%F).tar.gz -C /opt/pocketbase-rcs pb_data
find /var/backups/rcs -name 'pb_data-*.tar.gz' -mtime +30 -delete
EOF
chmod +x /etc/cron.daily/backup-rcs
/etc/cron.daily/backup-rcs
ls -lh /var/backups/rcs
```

The last line should show a `.tar.gz` file. That's your first backup, and one will now be made every night, keeping the last 30 days.

> **Do this too:** every so often, download one of those files to your Mac. A backup sitting on the same server that might die isn't really a backup.

---

# You're done

Type this to disconnect from the server:

```bash
exit
```

## What you now have

- **https://restaurantcasestudy.in** — your live site
- **https://restaurantcasestudy.in/admin.html** — your admin panel (staff password)
- **https://restaurantcasestudy.in/_/** — the database control room (superuser password, rarely needed)

## Making changes from now on

**Changing text, tool access, or who sees what?** Just use the admin panel. Nothing else needed.

**Changing the actual code?** Three steps:

1. Edit files on your Mac
2. GitHub Desktop → type a short summary → **Commit to main** → **Push origin**
3. In Terminal:
   ```bash
   ssh root@129.121.123.192
   cd /opt/restaurant-casestudy && bash deploy/update.sh
   ```

---

# When something goes wrong

**"I can't log in to the admin panel"**
You're probably using the superuser password. The site login uses the **staff** password (Step 3.5).

**"It says Staff only"**
You're logged in with the wrong account, or your account isn't marked as staff. Go to `/_/` with the superuser, click **users**, find your record, set **plan** to `staff`, save. Then sign out and back in on the site.

**"Everything shows as locked"**
Your browser has an old login saved. Sign out, then sign in again.

**"The site loads but sign-in gives a network error"**
The backend has stopped. In Terminal:
```bash
ssh root@129.121.123.192
systemctl restart pocketbase-rcs
systemctl status pocketbase-rcs
```
You want to see `active (running)` in green.

**"I've completely locked myself out"**
Reset the superuser password:
```bash
systemctl stop pocketbase-rcs
sudo -u pocketbase /opt/pocketbase-rcs/pocketbase admin update honestdigitalmarketer@gmail.com YOURNEWPASSWORD --dir=/opt/pocketbase-rcs/pb_data
systemctl start pocketbase-rcs
```

**Anything else** — copy what Terminal says and send it to me. Error messages look scary but they usually name the exact problem.
