#!/usr/bin/env bash
# =============================================================================
# Restaurant Casestudy — backend installer (PocketBase)
#
#   sudo bash backend/install-backend.sh
#
# Installs PocketBase as a systemd service on 127.0.0.1:8090 and adds an API
# proxy to the restaurantcasestudy.in vhost — the same pattern your n8n and
# studio apps already use.
#
# Safe on a shared box:
#   · binds to localhost only, never a public port
#   · edits only the restaurant-casestudy vhost
#   · validates nginx before reloading, and restores the backup if invalid
#   · re-runnable
# =============================================================================
set -euo pipefail

PB_VERSION="0.22.21"          # pinned: the hooks are written against this API
PB_DIR="/opt/pocketbase-rcs"
PB_PORT="8090"
SITE_CONF="/etc/nginx/sites-available/restaurant-casestudy"
SERVICE="pocketbase-rcs"
DOMAIN="${1:-restaurantcasestudy.in}"

C_OK=$'\033[0;32m'; C_WARN=$'\033[0;33m'; C_ERR=$'\033[0;31m'; C_INFO=$'\033[0;36m'; C_OFF=$'\033[0m'
ok()   { echo "${C_OK}  ✓${C_OFF} $*"; }
info() { echo "${C_INFO}  →${C_OFF} $*"; }
warn() { echo "${C_WARN}  !${C_OFF} $*"; }
die()  { echo "${C_ERR}  ✗ $*${C_OFF}" >&2; exit 1; }
hd()   { echo; echo "${C_INFO}── $* ────────────────────────────────${C_OFF}"; }

[[ $EUID -eq 0 ]] || die "Run with sudo:  sudo bash backend/install-backend.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
[[ -f "$SCRIPT_DIR/pb_schema.json" ]] || die "pb_schema.json not found next to this script."

echo
echo "  Restaurant Casestudy — backend install"
echo "  PocketBase $PB_VERSION on 127.0.0.1:$PB_PORT"
echo "  domain: $DOMAIN"

# ------------------------------------------------------------------ port free?
hd "1. Checking the port"
if ss -ltn 2>/dev/null | grep -q ":$PB_PORT "; then
  if systemctl is-active --quiet "$SERVICE" 2>/dev/null; then
    info "$SERVICE already owns port $PB_PORT — this is an upgrade."
  else
    die "Port $PB_PORT is already in use by something else. Free it, or edit PB_PORT at the top of this script."
  fi
else
  ok "Port $PB_PORT is free"
fi

# ------------------------------------------------------------------ binary
hd "2. Installing PocketBase"
mkdir -p "$PB_DIR"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) PB_ARCH="amd64" ;;
  aarch64|arm64) PB_ARCH="arm64" ;;
  *) die "Unsupported architecture: $ARCH" ;;
esac

if [[ -x "$PB_DIR/pocketbase" ]] && "$PB_DIR/pocketbase" --version 2>/dev/null | grep -q "$PB_VERSION"; then
  ok "PocketBase $PB_VERSION already installed"
else
  command -v unzip >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq unzip; }
  URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip"
  info "Downloading $URL"
  curl -fsSL "$URL" -o /tmp/pb.zip || die "Download failed. Check the server has outbound internet access."
  systemctl stop "$SERVICE" 2>/dev/null || true
  unzip -o -q /tmp/pb.zip -d "$PB_DIR" pocketbase
  rm -f /tmp/pb.zip
  chmod +x "$PB_DIR/pocketbase"
  ok "Installed $("$PB_DIR/pocketbase" --version)"
fi

# ------------------------------------------------------------------ hooks
hd "3. Installing server-side rules"
mkdir -p "$PB_DIR/pb_hooks"
cp "$SCRIPT_DIR/pb_hooks/rcs.pb.js" "$PB_DIR/pb_hooks/rcs.pb.js"
ok "Permission rules installed to $PB_DIR/pb_hooks/"

id -u pocketbase >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin pocketbase
chown -R pocketbase:pocketbase "$PB_DIR"

# ------------------------------------------------------------------ service
hd "4. systemd service"
cat > "/etc/systemd/system/${SERVICE}.service" <<EOF
[Unit]
Description=PocketBase (Restaurant Casestudy)
After=network.target

[Service]
Type=simple
User=pocketbase
Group=pocketbase
WorkingDirectory=$PB_DIR
ExecStart=$PB_DIR/pocketbase serve --http=127.0.0.1:$PB_PORT --dir=$PB_DIR/pb_data --hooksDir=$PB_DIR/pb_hooks
Restart=always
RestartSec=5
LimitNOFILE=4096

# Hardening — it only needs its own directory
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=$PB_DIR

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --quiet "$SERVICE"
systemctl restart "$SERVICE"
sleep 3
systemctl is-active --quiet "$SERVICE" || {
  journalctl -u "$SERVICE" -n 25 --no-pager >&2
  die "PocketBase failed to start — log above."
}
ok "$SERVICE running on 127.0.0.1:$PB_PORT"

# ------------------------------------------------------------------ nginx
hd "5. Adding the API proxy to your vhost"
[[ -f "$SITE_CONF" ]] || die "$SITE_CONF not found. Run deploy/setup.sh first."

if grep -q "rcs-api-proxy" "$SITE_CONF"; then
  ok "Proxy block already present"
else
  BACKUP="$SITE_CONF.bak.$(date +%Y%m%d%H%M%S)"
  cp "$SITE_CONF" "$BACKUP"
  info "Backed up to $BACKUP"

  PROXY=$(cat <<'NGINX'

    # ---- rcs-api-proxy ------------------------------------------------------
    # Everything under /api/ and the PocketBase dashboard at /_/ goes to the
    # local PocketBase instance. Static files are still served from disk.
    location /api/ {
        proxy_pass http://127.0.0.1:PB_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
        client_max_body_size 20M;
    }

    location /_/ {
        proxy_pass http://127.0.0.1:PB_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    # ---- end rcs-api-proxy --------------------------------------------------
NGINX
)
  PROXY="${PROXY//PB_PORT_PLACEHOLDER/$PB_PORT}"

  # Insert before the final closing brace of the first server block.
  python3 - "$SITE_CONF" <<PYEOF
import sys, re
path = sys.argv[1]
src = open(path).read()
block = '''$PROXY'''
depth = 0; start = None; end = None
for i, ch in enumerate(src):
    if ch == '{':
        if depth == 0 and start is None: start = i
        depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0 and start is not None:
            end = i; break
if end is None:
    sys.exit("could not locate the server block")
open(path, 'w').write(src[:end] + block + "\n" + src[end:])
PYEOF

  if nginx -t 2>/tmp/nginx-api.log; then
    systemctl reload nginx
    ok "nginx -t passed, reloaded — your other sites untouched"
  else
    cat /tmp/nginx-api.log >&2
    cp "$BACKUP" "$SITE_CONF"
    nginx -t >/dev/null 2>&1 && systemctl reload nginx
    die "nginx config test failed. Your original vhost has been restored."
  fi
fi

# ------------------------------------------------------------------ seed
hd "6. Creating collections and seed data"
API="http://127.0.0.1:$PB_PORT"

if [[ -f "$PB_DIR/pb_data/.rcs_seeded" ]]; then
  ok "Already seeded — skipping (delete $PB_DIR/pb_data/.rcs_seeded to force)"
  SKIP_SEED=1
else
  SKIP_SEED=0
fi

if [[ $SKIP_SEED -eq 0 ]]; then
  echo
  echo "  PocketBase needs a superuser account for its own dashboard."
  echo "  This is separate from the site's staff login, which comes next."
  read -r -p "  Superuser email [${CERTBOT_EMAIL:-honestdigitalmarketer@gmail.com}]: " SU_EMAIL
  SU_EMAIL="${SU_EMAIL:-honestdigitalmarketer@gmail.com}"
  read -r -s -p "  Superuser password (min 10 chars): " SU_PASS; echo
  [[ ${#SU_PASS} -ge 10 ]] || die "Password too short."

  systemctl stop "$SERVICE"
  sudo -u pocketbase "$PB_DIR/pocketbase" admin create "$SU_EMAIL" "$SU_PASS" --dir="$PB_DIR/pb_data" >/dev/null 2>&1 \
    || warn "Superuser may already exist — continuing."
  systemctl start "$SERVICE"
  sleep 3
  ok "Superuser ready"

  TOKEN=$(curl -fsS -X POST "$API/api/admins/auth-with-password" \
    -H 'Content-Type: application/json' \
    -d "{\"identity\":\"$SU_EMAIL\",\"password\":\"$SU_PASS\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])') \
    || die "Could not authenticate as superuser."

  info "Importing collections…"
  python3 - "$SCRIPT_DIR/pb_schema.json" "$API" "$TOKEN" <<'PYEOF'
import json, sys, urllib.request
schema_path, api, token = sys.argv[1], sys.argv[2], sys.argv[3]
collections = json.load(open(schema_path))
req = urllib.request.Request(
    api + "/api/collections/import",
    data=json.dumps({"collections": collections, "deleteMissing": False}).encode(),
    headers={"Content-Type": "application/json", "Authorization": token},
    method="PUT")
try:
    urllib.request.urlopen(req).read()
    print("    collections imported")
except urllib.error.HTTPError as e:
    print("    import failed:", e.read().decode()[:600]); sys.exit(1)
PYEOF

  info "Seeding tools and site copy…"
  python3 - "$API" "$TOKEN" <<'PYEOF'
import json, sys, urllib.request
api, token = sys.argv[1], sys.argv[2]

def post(path, payload):
    req = urllib.request.Request(api + path, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": token}, method="POST")
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if "already exists" in body or "value must be unique" in body:
            return None
        print("      warn:", body[:200]); return None

TOOLS = [
 ("purpose","🪞","The Purpose Check","Why are you really opening a restaurant? The honest mirror before you spend a rupee.","public"),
 ("idea","💡","The Idea Validator","Everyone loves your food. But will they pay for it? Pressure-test the concept.","public"),
 ("location","📍","Location Audit Scorecard","Rent maths, footfall counts, competition map. Do not sign the lease without it.","preview"),
 ("break-even","🧮","Budget & Break-Even Calculator","How many customers a day you actually need — and whether your budget survives.","public"),
 ("menu","🍽️","Menu Engineering Sheet","Cost every dish, kill the Dogs, find your Stars, fix the food cost.","preview"),
 ("sop","📋","SOP Builder","Write the five systems that make your restaurant run without you.","login"),
 ("marketing","📣","90-Day Marketing Planner","From zero awareness to full tables, week by week.","login"),
 ("revenue","🕯️","Dead Hours Revenue Planner","Four revenue streams from the kitchen you already have.","pro"),
]
for i,(slug,icon,title,blurb,vis) in enumerate(TOOLS, 1):
    post("/api/collections/tools/records", {
        "slug": slug, "title": title, "icon": icon, "blurb": blurb,
        "position": i, "visibility": vis, "enabled": True, "locked_message": ""})
print("    %d tools seeded" % len(TOOLS))

CONTENT = [
 ("hero_eyebrow","Free for your first outlet · No card","hero","Hero badge","text",1),
 ("hero_title","Nine out of ten restaurants close. Usually for reasons a spreadsheet could have caught.","hero","Hero headline","textarea",2),
 ("hero_lede","Restaurant Casestudy turns the eight decisions that decide whether a restaurant survives into working tools that score your answers and tell you exactly what is wrong.","hero","Hero paragraph","textarea",3),
 ("hero_cta","Start free","hero","Primary button","text",4),
 ("stat_1_value","60%","stats","Stat 1 number","text",10),
 ("stat_1_label","close within year one","stats","Stat 1 label","text",11),
 ("stat_2_value","90%","stats","Stat 2 number","text",12),
 ("stat_2_label","close within five years","stats","Stat 2 label","text",13),
 ("stat_3_value","8","stats","Stat 3 number","text",14),
 ("stat_3_label","tools, one per failure point","stats","Stat 3 label","text",15),
 ("stat_4_value","10%","stats","Stat 4 number","text",16),
 ("stat_4_label","the rent ratio most miss","stats","Stat 4 label","text",17),
 ("tools_heading","Eight tools. Eight ways restaurants die.","tools","Tools section heading","text",20),
 ("tools_intro","Each one saves as you type and produces a scored verdict with specific flagged problems — not a generic checklist.","tools","Tools section intro","textarea",21),
 ("show_pricing_section","true","toggles","Show pricing on homepage","bool",30),
 ("show_faq_section","true","toggles","Show FAQ on homepage","bool",31),
 ("show_stats_strip","true","toggles","Show the statistics strip","bool",32),
 ("signup_enabled","true","toggles","Allow new signups","bool",33),
 ("logged_out_can_browse_tools","true","toggles","Logged-out visitors see the tool grid","bool",34),
 ("pro_price_monthly","","pricing","Pro monthly price (blank = Coming soon)","text",40),
 ("pro_price_yearly","","pricing","Pro yearly price","text",41),
 ("support_email","honestdigitalmarketer@gmail.com","contact","Support email","text",50),
]
for key,val,grp,label,kind,pos in CONTENT:
    post("/api/collections/site_content/records", {
        "key": key, "value": val, "group": grp, "label": label, "kind": kind, "position": pos})
print("    %d content keys seeded" % len(CONTENT))
PYEOF

  echo
  echo "  Now create the staff account you'll actually sign in with on the site."
  read -r -p "  Staff email [$SU_EMAIL]: " ST_EMAIL
  ST_EMAIL="${ST_EMAIL:-$SU_EMAIL}"
  read -r -s -p "  Staff password (min 8 chars): " ST_PASS; echo
  [[ ${#ST_PASS} -ge 8 ]] || die "Password too short."

  python3 - "$API" "$TOKEN" "$ST_EMAIL" "$ST_PASS" <<'PYEOF'
import json, sys, urllib.request
api, token, email, password = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
def call(path, payload, method="POST"):
    req = urllib.request.Request(api+path, data=json.dumps(payload).encode(),
        headers={"Content-Type":"application/json","Authorization":token}, method=method)
    return json.loads(urllib.request.urlopen(req).read())
try:
    rec = call("/api/collections/users/records", {
        "email": email, "password": password, "passwordConfirm": password,
        "name": "Atul", "plan": "free", "emailVisibility": False})
    call("/api/collections/users/records/" + rec["id"], {"plan": "staff", "outlet_limit": 999}, "PATCH")
    print("    staff account created and promoted")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    if "already" in body or "unique" in body:
        print("    a user with that email already exists — promote it from the PocketBase dashboard")
    else:
        print("    warn:", body[:300])
PYEOF

  touch "$PB_DIR/pb_data/.rcs_seeded"
  chown pocketbase:pocketbase "$PB_DIR/pb_data/.rcs_seeded"
fi

# ------------------------------------------------------------------ verify
hd "7. Verifying"
sleep 1
CODE=$(curl -s -o /tmp/bootstrap.json -w '%{http_code}' "$API/api/rcs/bootstrap" || echo 000)
if [[ "$CODE" == "200" ]]; then
  COUNT=$(python3 -c 'import json;print(len(json.load(open("/tmp/bootstrap.json"))["tools"]))' 2>/dev/null || echo "?")
  ok "API responding — $COUNT tools configured"
else
  warn "Bootstrap returned HTTP $CODE. Check: journalctl -u $SERVICE -n 40"
fi

PUB=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/api/rcs/bootstrap" || echo 000)
[[ "$PUB" == "200" ]] && ok "Reachable at https://$DOMAIN/api/rcs/bootstrap" \
                      || warn "Public API returned HTTP $PUB — check the nginx proxy block."

hd "Done"
echo
ok "Backend live"
echo
echo "    Site admin panel:        https://$DOMAIN/admin.html   (sign in as staff)"
echo "    PocketBase dashboard:    https://$DOMAIN/_/           (superuser)"
echo "    Service:                 systemctl status $SERVICE"
echo "    Logs:                    journalctl -u $SERVICE -f"
echo "    Data + backups:          $PB_DIR/pb_data"
echo
warn "Back up $PB_DIR/pb_data regularly — it holds every user account and worksheet."
echo
