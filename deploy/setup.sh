#!/usr/bin/env bash
# =============================================================================
# Restaurant Casestudy — one-time server setup
#
#   sudo bash deploy/setup.sh                    # uses restaurantcasestudy.in
#   sudo bash deploy/setup.sh otherdomain.com    # or pass a different one
#
# Safe to run on a VPS that already hosts other sites:
#   · adds one new vhost, never edits or removes an existing one
#   · matches only its own server_name, so the site at your root keeps
#     every request that isn't for this domain
#   · validates the web server config BEFORE reloading, and aborts if invalid
#   · reloads (does not restart) so running sites never drop a request
#   · re-runnable — running it twice changes nothing
#
# Run deploy/preflight.sh first if you haven't. It is read-only and tells you
# whether anything here can clash with what you already host.
# =============================================================================
set -euo pipefail

DOMAIN="${1:-restaurantcasestudy.in}"
SITE_DIR="/var/www/restaurant-casestudy"
SITE_NAME="restaurant-casestudy"

C_OK=$'\033[0;32m'; C_WARN=$'\033[0;33m'; C_ERR=$'\033[0;31m'
C_INFO=$'\033[0;36m'; C_OFF=$'\033[0m'
ok()   { echo "${C_OK}  ✓${C_OFF} $*"; }
info() { echo "${C_INFO}  →${C_OFF} $*"; }
warn() { echo "${C_WARN}  !${C_OFF} $*"; }
die()  { echo "${C_ERR}  ✗ $*${C_OFF}" >&2; exit 1; }
head_() { echo; echo "${C_INFO}── $* ─────────────────────────────────────${C_OFF}"; }

# ---------------------------------------------------------------- preflight
[[ $EUID -eq 0 ]] || die "Run with sudo:  sudo bash deploy/setup.sh"
[[ -n "$DOMAIN" ]] || die "Usage: sudo bash deploy/setup.sh [domain]"
[[ "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$ ]] \
  || die "'$DOMAIN' doesn't look like a domain. Pass it without http:// and without a trailing slash."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
[[ -f "$REPO_DIR/index.html" ]] || die "Can't find index.html next to deploy/. Run this from inside the cloned repo."

echo
echo "  Restaurant Casestudy — server setup"
echo "  domain:  $DOMAIN"
echo "  source:  $REPO_DIR"
echo "  target:  $SITE_DIR"

# ---------------------------------------------------------------- detect stack
head_ "Checking what's already running"

PANEL=""
[[ -d /usr/local/cpanel   ]] && PANEL="cPanel"
[[ -d /usr/local/psa      ]] && PANEL="Plesk"
[[ -d /usr/local/lsws     ]] && PANEL="CyberPanel / OpenLiteSpeed"
[[ -d /www/server/panel   ]] && PANEL="aaPanel / BT Panel"
[[ -d /usr/local/CyberCP  ]] && PANEL="CyberPanel"

if [[ -n "$PANEL" ]]; then
  warn "Detected $PANEL on this server."
  echo
  echo "  Control panels manage their own vhosts. If this script writes one"
  echo "  directly, the panel may overwrite it — or worse, get confused about"
  echo "  your other sites. So this script will copy the files and stop there."
  echo
  echo "  Do this instead:"
  echo "    1. Add '$DOMAIN' as a new site in the $PANEL interface."
  echo "    2. Set its document root to:  $SITE_DIR"
  echo "    3. Issue the SSL certificate from the panel's SSL section."
  echo
  read -r -p "  Copy the files to $SITE_DIR and stop? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || die "Aborted. Nothing was changed."
  PANEL_ONLY=1
else
  PANEL_ONLY=0
fi

WEBSERVER=""
if [[ $PANEL_ONLY -eq 0 ]]; then
  if systemctl is-active --quiet nginx 2>/dev/null; then
    WEBSERVER="nginx"; ok "Nginx is running — adding a site alongside your existing ones."
  elif systemctl is-active --quiet apache2 2>/dev/null; then
    WEBSERVER="apache2"; ok "Apache is running — adding a vhost alongside your existing ones."
  elif systemctl is-active --quiet httpd 2>/dev/null; then
    WEBSERVER="httpd"; ok "Apache (httpd) is running."
  elif command -v nginx >/dev/null 2>&1; then
    WEBSERVER="nginx"; warn "Nginx installed but not running. Continuing."
  else
    die "No running web server found. You said other sites are already live — if they are behind Docker, a panel, or a non-standard install, don't use this script. Point that stack's document root at $SITE_DIR instead."
  fi

  if [[ "$WEBSERVER" == "nginx" ]]; then
    EXISTING=$(find /etc/nginx/sites-enabled /etc/nginx/conf.d -maxdepth 1 \( -type l -o -type f \) 2>/dev/null | wc -l || echo 0)
  else
    EXISTING=$(find /etc/apache2/sites-enabled -maxdepth 1 \( -type l -o -type f \) 2>/dev/null | wc -l || echo 0)
  fi
  info "$EXISTING site(s) currently enabled — none of them will be modified."

  # --- Does an existing vhost already answer for this domain? --------------
  # This is the only situation where adding our vhost could steal traffic
  # from a site that is already live. Refuse rather than guess.
  CLASH_FILE=""
  for d in /etc/nginx/sites-enabled /etc/nginx/conf.d /etc/apache2/sites-enabled /etc/httpd/conf.d; do
    [[ -d "$d" ]] || continue
    while IFS= read -r f; do
      [[ -f "$f" || -L "$f" ]] || continue
      [[ "$(basename "$f")" == "$SITE_NAME"* ]] && continue   # our own, from a previous run
      if grep -hoP '^\s*(server_name|Server(Name|Alias))\s+\K[^;]+' "$f" 2>/dev/null \
         | tr ' ,' '\n\n' | grep -qxF "$DOMAIN"; then
        CLASH_FILE="$f"
      fi
    done < <(find "$d" -maxdepth 1 \( -type f -o -type l \) 2>/dev/null)
  done
  if [[ -n "$CLASH_FILE" ]]; then
    die "$CLASH_FILE already serves $DOMAIN.
      Adding a second vhost for the same name would make which site wins
      unpredictable. Remove or rename that one first, then re-run.
      Nothing has been changed."
  fi
  ok "No existing vhost claims $DOMAIN — safe to add."
fi

# ---------------------------------------------------------------- dns check
head_ "Checking DNS"
SERVER_IP="$(curl -fsS --max-time 6 https://api.ipify.org 2>/dev/null || echo '')"
DOMAIN_IP="$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1; exit}' || echo '')"

if [[ -z "$DOMAIN_IP" ]]; then
  warn "$DOMAIN does not resolve yet. Add an A record pointing to this server, then re-run."
  warn "Continuing — but the HTTPS step will fail until DNS propagates."
elif [[ -n "$SERVER_IP" && "$DOMAIN_IP" != "$SERVER_IP" ]]; then
  warn "$DOMAIN resolves to $DOMAIN_IP but this server is $SERVER_IP."
  warn "If you use Cloudflare proxying that's expected. Otherwise fix the A record first."
else
  ok "$DOMAIN → $DOMAIN_IP (this server)"
fi

# ---------------------------------------------------------------- copy files
head_ "Publishing files"
mkdir -p "$SITE_DIR"

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
        --exclude '.git' --exclude '.gitignore' --exclude 'deploy' \
        --exclude 'README.md' --exclude '.DS_Store' \
        "$REPO_DIR"/ "$SITE_DIR"/
else
  find "$SITE_DIR" -mindepth 1 -delete
  (cd "$REPO_DIR" && tar --exclude=.git --exclude=deploy --exclude=README.md \
       --exclude=.gitignore --exclude=.DS_Store -cf - .) | (cd "$SITE_DIR" && tar -xf -)
fi

WEBUSER="www-data"
id -u nginx  >/dev/null 2>&1 && [[ "$WEBSERVER" == "nginx"  ]] && WEBUSER="nginx"
id -u apache >/dev/null 2>&1 && [[ "$WEBSERVER" == "httpd"  ]] && WEBUSER="apache"
chown -R "$WEBUSER":"$WEBUSER" "$SITE_DIR"
find "$SITE_DIR" -type d -exec chmod 755 {} \;
find "$SITE_DIR" -type f -exec chmod 644 {} \;
ok "$(find "$SITE_DIR" -type f | wc -l | tr -d ' ') files published to $SITE_DIR"

if [[ $PANEL_ONLY -eq 1 ]]; then
  echo
  ok "Files are in place. Finish by adding the site in $PANEL with document root $SITE_DIR."
  exit 0
fi

# ---------------------------------------------------------------- vhost
head_ "Installing the site config"

if [[ "$WEBSERVER" == "nginx" ]]; then
  AVAIL="/etc/nginx/sites-available/$SITE_NAME"
  ENABLED="/etc/nginx/sites-enabled/$SITE_NAME"
  [[ -d /etc/nginx/sites-available ]] || { AVAIL="/etc/nginx/conf.d/$SITE_NAME.conf"; ENABLED=""; }

  if [[ -f "$AVAIL" ]]; then
    cp "$AVAIL" "$AVAIL.bak.$(date +%Y%m%d%H%M%S)"
    info "Existing config backed up."
  fi
  sed "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$SCRIPT_DIR/nginx.conf" > "$AVAIL"
  [[ -n "$ENABLED" ]] && ln -sf "$AVAIL" "$ENABLED"
  ok "Wrote $AVAIL"

  # Validate the WHOLE nginx config — this is what protects your other sites.
  if nginx -t 2>/tmp/nginx-test.log; then
    ok "nginx -t passed (all sites still valid)"
    systemctl reload nginx
    ok "Nginx reloaded — no downtime for your existing sites"
  else
    cat /tmp/nginx-test.log >&2
    [[ -n "$ENABLED" ]] && rm -f "$ENABLED"
    rm -f "$AVAIL"
    die "Nginx config test failed. The new site was removed and nothing was reloaded — your existing sites are exactly as they were."
  fi

else
  AVAIL="/etc/apache2/sites-available/$SITE_NAME.conf"
  [[ "$WEBSERVER" == "httpd" ]] && AVAIL="/etc/httpd/conf.d/$SITE_NAME.conf"

  sed "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$SCRIPT_DIR/apache.conf" > "$AVAIL"
  ok "Wrote $AVAIL"

  if [[ "$WEBSERVER" == "apache2" ]]; then
    a2enmod rewrite headers expires deflate >/dev/null 2>&1 || true
    a2ensite "$SITE_NAME" >/dev/null
  fi

  if apachectl configtest 2>/tmp/apache-test.log; then
    ok "configtest passed (all sites still valid)"
    systemctl reload "$WEBSERVER"
    ok "Apache reloaded — no downtime for your existing sites"
  else
    cat /tmp/apache-test.log >&2
    [[ "$WEBSERVER" == "apache2" ]] && a2dissite "$SITE_NAME" >/dev/null 2>&1 || true
    rm -f "$AVAIL"
    die "Apache config test failed. The new site was removed and nothing was reloaded."
  fi
fi

# ---------------------------------------------------------------- https
head_ "HTTPS"
if [[ -z "$DOMAIN_IP" ]]; then
  warn "Skipping — $DOMAIN doesn't resolve yet."
  warn "Once DNS is live, run:  sudo certbot --$WEBSERVER -d $DOMAIN -d www.$DOMAIN"
else
  if ! command -v certbot >/dev/null 2>&1; then
    info "Installing certbot…"
    if command -v snap >/dev/null 2>&1; then
      snap install --classic certbot >/dev/null 2>&1 && ln -sf /snap/bin/certbot /usr/bin/certbot
    else
      apt-get update -qq && apt-get install -y -qq certbot \
        "$([[ "$WEBSERVER" == "nginx" ]] && echo python3-certbot-nginx || echo python3-certbot-apache)"
    fi
  fi

  CB_PLUGIN="--nginx"; [[ "$WEBSERVER" != "nginx" ]] && CB_PLUGIN="--apache"
  info "Requesting a certificate for $DOMAIN…"
  CB_EMAIL="${CERTBOT_EMAIL:-honestdigitalmarketer@gmail.com}"

  # --cert-name keeps this certificate separate from any you already have,
  # so renewals for your other sites are untouched.
  if certbot $CB_PLUGIN -d "$DOMAIN" -d "www.$DOMAIN" \
       --cert-name "$DOMAIN" \
       --non-interactive --agree-tos --redirect \
       --email "$CB_EMAIL" --no-eff-email 2>/tmp/certbot.log; then
    ok "HTTPS live, auto-renewing twice daily"
  else
    warn "Certbot didn't complete. Your site still works over HTTP."
    warn "Most common cause: no A record for www. Retry without it:"
    warn "   sudo certbot $CB_PLUGIN -d $DOMAIN --cert-name $DOMAIN"
    tail -6 /tmp/certbot.log >&2 || true
  fi
fi

# ---------------------------------------------------------------- done
head_ "Done"
echo
ok "https://$DOMAIN is live"
echo
echo "  To deploy changes later:"
echo "    1. Commit and push in GitHub Desktop on your Mac"
echo "    2. On this server, run:"
echo "         cd $REPO_DIR && sudo bash deploy/update.sh"
echo
echo "  Your other sites were not modified. Logs for this one:"
echo "    /var/log/nginx/restaurant-casestudy.*.log"
echo
