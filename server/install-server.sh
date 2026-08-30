#!/usr/bin/env bash
# =============================================================================
# Restaurant Casestudy — backend installer (Node + SQLite)
#
#   cd /opt/restaurant-casestudy && sudo bash server/install-server.sh
#
# Replaces the old PocketBase backend with the Node one. Safe on a box that
# hosts other sites:
#   · binds to 127.0.0.1 only, never a public port
#   · edits only the restaurant-casestudy vhost
#   · validates nginx before reloading, and restores the backup if invalid
#   · re-runnable — running it again just updates and restarts
# =============================================================================
set -euo pipefail

APP_DIR="/opt/restaurant-casestudy"
DATA_DIR="/var/lib/restaurant-casestudy"
DB_FILE="$DATA_DIR/data.db"
PORT="8090"
SERVICE="rcs-api"
SITE_CONF="/etc/nginx/sites-available/restaurant-casestudy"
RUN_USER="rcs"
NODE_MAJOR="22"

C_OK=$'\033[0;32m'; C_WARN=$'\033[0;33m'; C_ERR=$'\033[0;31m'; C_INFO=$'\033[0;36m'; C_OFF=$'\033[0m'
ok()   { echo "${C_OK}  ✓${C_OFF} $*"; }
info() { echo "${C_INFO}  →${C_OFF} $*"; }
warn() { echo "${C_WARN}  !${C_OFF} $*"; }
die()  { echo "${C_ERR}  ✗ $*${C_OFF}" >&2; exit 1; }
hd()   { echo; echo "${C_INFO}── $* ────────────────────────────────${C_OFF}"; }

[[ $EUID -eq 0 ]] || die "Run with sudo:  sudo bash server/install-server.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$SCRIPT_DIR/index.js" ]] || die "index.js not found next to this script."

echo
echo "  Restaurant Casestudy — Node backend"
echo "  127.0.0.1:$PORT · database $DB_FILE"

# ------------------------------------------------------- 1. retire PocketBase
hd "1. Removing the old PocketBase backend"
if systemctl list-unit-files 2>/dev/null | grep -q '^pocketbase-rcs\.service'; then
  systemctl stop pocketbase-rcs 2>/dev/null || true
  systemctl disable pocketbase-rcs 2>/dev/null || true
  rm -f /etc/systemd/system/pocketbase-rcs.service
  systemctl daemon-reload
  ok "pocketbase-rcs service stopped and removed"
else
  info "No PocketBase service found — nothing to stop"
fi

if [[ -d /opt/pocketbase-rcs ]]; then
  # Keep one copy of the data in case anything was already entered.
  PB_BACKUP="/root/pocketbase-rcs-final-backup-$(date +%Y%m%d%H%M%S).tar.gz"
  tar -czf "$PB_BACKUP" -C /opt pocketbase-rcs 2>/dev/null || true
  rm -rf /opt/pocketbase-rcs
  ok "PocketBase files removed (one backup kept at $PB_BACKUP)"
fi

# ------------------------------------------------------------------ 2. Node
hd "2. Checking Node"
NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  CUR="$(node -p 'process.versions.node.split(".").map(Number)[0]*1000 + process.versions.node.split(".").map(Number)[1]' 2>/dev/null || echo 0)"
  # node:sqlite needs 22.5 or newer.
  if [[ "$CUR" -ge 22005 ]]; then
    NEED_NODE=0
    ok "Node $(node -v) is recent enough"
  else
    warn "Node $(node -v) is too old for the built-in SQLite (need 22.5+)"
  fi
fi

if [[ "$NEED_NODE" -eq 1 ]]; then
  info "Installing Node $NODE_MAJOR from NodeSource…"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null 2>&1 \
    || die "Could not add the NodeSource repository."
  apt-get install -y nodejs >/dev/null 2>&1 || die "Could not install Node."
  ok "Installed Node $(node -v)"
fi

node -e 'require("node:sqlite")' 2>/dev/null \
  || die "This Node has no built-in SQLite. Install Node 22.5 or newer and re-run."
ok "SQLite is available from Node itself — nothing to compile"

# -------------------------------------------------------------- 3. app files
hd "3. Installing the application"
id -u "$RUN_USER" >/dev/null 2>&1 || {
  useradd --system --home "$DATA_DIR" --shell /usr/sbin/nologin "$RUN_USER"
  info "Created the '$RUN_USER' system user"
}
mkdir -p "$DATA_DIR"
chown -R "$RUN_USER":"$RUN_USER" "$DATA_DIR"
chmod 750 "$DATA_DIR"

cd "$SCRIPT_DIR"
info "Installing dependencies (express only)…"
npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1 || die "npm install failed."
ok "Dependencies installed"

# ----------------------------------------------------------------- 4. systemd
hd "4. Setting up the service"
cat > "/etc/systemd/system/$SERVICE.service" <<EOF
[Unit]
Description=Restaurant Casestudy API
After=network.target

[Service]
Type=simple
User=$RUN_USER
Group=$RUN_USER
WorkingDirectory=$SCRIPT_DIR
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=HOST=127.0.0.1
Environment=RCS_DB=$DB_FILE
ExecStart=$(command -v node) $SCRIPT_DIR/index.js
Restart=always
RestartSec=3
LimitNOFILE=4096

# Hardening — it only needs its own data directory
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=$DATA_DIR

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --quiet "$SERVICE"
systemctl restart "$SERVICE"

for _ in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/api/health" && break
  sleep 1
done
systemctl is-active --quiet "$SERVICE" || {
  journalctl -u "$SERVICE" -n 30 --no-pager >&2
  die "The API did not start — log above."
}
ok "$SERVICE running on 127.0.0.1:$PORT"

# ------------------------------------------------------------------ 5. nginx
hd "5. Pointing nginx at the new backend"
[[ -f "$SITE_CONF" ]] || die "$SITE_CONF not found. Run deploy/setup.sh first."

BACKUP="$SITE_CONF.bak.$(date +%Y%m%d%H%M%S)"
cp "$SITE_CONF" "$BACKUP"
info "Backed up to $BACKUP"

# Drop the old PocketBase proxy (including its /_/ admin route) if present.
python3 - "$SITE_CONF" "$PORT" <<'PYEOF'
import re, sys
path, port = sys.argv[1], sys.argv[2]
conf = open(path).read()

# Remove any previous proxy block we installed, old or new.
conf = re.sub(r'\n\s*# ---- rcs-api-proxy.*?# ---- end rcs-api-proxy[^\n]*\n', '\n', conf, flags=re.S)
conf = re.sub(r'\n\s*# ---- rcs-api-proxy.*?(?=\n\s{4}location / )', '\n', conf, flags=re.S)
conf = re.sub(r'\n\s*location /_/ \{.*?\n\s*\}\n', '\n', conf, flags=re.S)
conf = re.sub(r'\n\s*location /api/ \{.*?\n\s*\}\n', '\n', conf, flags=re.S)

block = """
    # ---- rcs-api-proxy ------------------------------------------------------
    # The Node API. Bound to localhost, so this is the only way in.
    location /api/ {
        proxy_pass http://127.0.0.1:%s;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        client_max_body_size 4m;
    }
    # ---- end rcs-api-proxy --------------------------------------------------
""" % port

# Insert just before the first `location / {` in each server block.
if 'rcs-api-proxy' not in conf:
    conf = re.sub(r'(\n\s{4}location / \{)', block + r'\1', conf, count=0)

open(path, 'w').write(conf)
print("  proxy block written")
PYEOF

if nginx -t >/dev/null 2>&1; then
  systemctl reload nginx
  ok "nginx -t passed and reloaded — your other sites untouched"
else
  cp "$BACKUP" "$SITE_CONF"
  nginx -t || true
  die "nginx rejected the config. Your original file has been restored, nothing changed."
fi

# ------------------------------------------------------------- 6. admin user
hd "6. Your admin account"
echo
echo "  This is the account you sign in with at /login.html."
echo "  It is also your admin — there is only one password to remember now."
echo
read -r -p "  Email [honestdigitalmarketer@gmail.com]: " AD_EMAIL
AD_EMAIL="${AD_EMAIL:-honestdigitalmarketer@gmail.com}"

while :; do
  read -r -s -p "  Password (at least 8 characters): " AD_PASS; echo
  [[ ${#AD_PASS} -ge 8 ]] && break
  warn "Too short — try again."
done

ADMIN_EMAIL="$AD_EMAIL" ADMIN_PASSWORD="$AD_PASS" RCS_DB="$DB_FILE" \
  node "$SCRIPT_DIR/make-admin.js" || die "Could not create the admin account."
chown "$RUN_USER":"$RUN_USER" "$DB_FILE"* 2>/dev/null || true
systemctl restart "$SERVICE"
sleep 2

# ---------------------------------------------------------------- 7. verify
hd "7. Verifying"
HEALTH=$(curl -s "http://127.0.0.1:$PORT/api/health" || echo "")
echo "$HEALTH" | grep -q '"ok":true' \
  && ok "API healthy — $(echo "$HEALTH" | grep -o '"tools":[0-9]*' | cut -d: -f2) tools configured" \
  || die "API is not responding. Check: journalctl -u $SERVICE -n 40"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: restaurantcasestudy.in" \
  "http://127.0.0.1/api/bootstrap" || echo 000)
[[ "$CODE" == "200" ]] \
  && ok "Reachable through nginx at /api/bootstrap" \
  || warn "Through nginx got HTTP $CODE — check the vhost if the site misbehaves"

LOGIN=$(curl -s -X POST "http://127.0.0.1:$PORT/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$(ADMIN_EMAIL="$AD_EMAIL" ADMIN_PASSWORD="$AD_PASS" python3 -c \
      'import json,os;print(json.dumps({"email":os.environ["ADMIN_EMAIL"],"password":os.environ["ADMIN_PASSWORD"]}))')" \
  || echo "")
echo "$LOGIN" | grep -q '"token"' \
  && ok "Signed in as $AD_EMAIL successfully" \
  || die "Could not sign in with the account just created. Response: ${LOGIN:0:200}"

echo "$LOGIN" | grep -q '"plan":"staff"' \
  && ok "The account has admin rights" \
  || warn "The account exists but is not staff — re-run this script"

hd "Done"
ok "Backend live"
echo
echo "  Sign in:  https://restaurantcasestudy.in/login.html"
echo "  Admin:    https://restaurantcasestudy.in/admin.html"
echo
echo "  Useful later:"
echo "    systemctl status $SERVICE          # is it running?"
echo "    journalctl -u $SERVICE -n 50       # what went wrong?"
echo "    sqlite3 $DB_FILE .dump > backup.sql"
echo
