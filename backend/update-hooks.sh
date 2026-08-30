#!/usr/bin/env bash
# =============================================================================
# Restaurant Casestudy — refresh the backend rules and check the admin account
#
#   cd /opt/restaurant-casestudy && sudo bash backend/update-hooks.sh
#
# deploy/update.sh only syncs the website files. The server-side permission
# rules live outside the web root, in PocketBase's own directory, so they need
# this separate step. Nothing else is touched: no schema changes, no nginx,
# no data, no other sites.
# =============================================================================
set -euo pipefail

PB_DIR="/opt/pocketbase-rcs"
PB_PORT="8090"
SERVICE="pocketbase-rcs"
API="http://127.0.0.1:$PB_PORT"

C_OK=$'\033[0;32m'; C_WARN=$'\033[0;33m'; C_ERR=$'\033[0;31m'; C_INFO=$'\033[0;36m'; C_OFF=$'\033[0m'
ok()   { echo "${C_OK}  ✓${C_OFF} $*"; }
info() { echo "${C_INFO}  →${C_OFF} $*"; }
warn() { echo "${C_WARN}  !${C_OFF} $*"; }
die()  { echo "${C_ERR}  ✗ $*${C_OFF}" >&2; exit 1; }
hd()   { echo; echo "${C_INFO}── $* ────────────────────────────────${C_OFF}"; }

[[ $EUID -eq 0 ]] || die "Run with sudo:  sudo bash backend/update-hooks.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -d "$SCRIPT_DIR/pb_hooks" ]] || die "pb_hooks not found next to this script."
[[ -d "$PB_DIR" ]] || die "$PB_DIR not found. Run backend/install-backend.sh first."

# ------------------------------------------------------------------- 1. copy
hd "1. Installing the updated rules"
if [[ -d "$PB_DIR/pb_hooks" ]]; then
  BACKUP="$PB_DIR/pb_hooks.bak.$(date +%Y%m%d%H%M%S)"
  cp -r "$PB_DIR/pb_hooks" "$BACKUP"
  info "Previous rules backed up to $BACKUP"
fi
mkdir -p "$PB_DIR/pb_hooks"
cp -f "$SCRIPT_DIR/pb_hooks/"*.js "$PB_DIR/pb_hooks/"
chown -R pocketbase:pocketbase "$PB_DIR/pb_hooks" 2>/dev/null || true
ok "Rules copied to $PB_DIR/pb_hooks"

# ---------------------------------------------------------------- 2. restart
hd "2. Restarting PocketBase"
systemctl restart "$SERVICE"

for i in $(seq 1 30); do
  if curl -sf -o /dev/null "$API/api/health"; then break; fi
  sleep 1
done
systemctl is-active --quiet "$SERVICE" || {
  journalctl -u "$SERVICE" -n 30 --no-pager >&2
  die "PocketBase did not come back up — log above."
}
ok "$SERVICE running"

# ----------------------------------------------------------------- 3. verify
hd "3. Checking the routes"
BOOT_CODE=$(curl -s -o /tmp/rcs-boot.json -w "%{http_code}" "$API/api/rcs/bootstrap" || echo 000)
if [[ "$BOOT_CODE" == "200" ]]; then
  COUNT=$(python3 -c 'import json;print(len(json.load(open("/tmp/rcs-boot.json")).get("tools",[])))' 2>/dev/null || echo "?")
  ok "bootstrap OK — $COUNT tools visible to logged-out visitors"
else
  warn "bootstrap returned HTTP $BOOT_CODE:"
  head -c 400 /tmp/rcs-boot.json; echo
fi

ACC_CODE=$(curl -s -o /tmp/rcs-acc.json -w "%{http_code}" "$API/api/rcs/access/menu" || echo 000)
if [[ "$ACC_CODE" == "200" ]]; then
  ok "per-tool access check OK"
else
  warn "access check returned HTTP $ACC_CODE:"
  head -c 400 /tmp/rcs-acc.json; echo
fi
rm -f /tmp/rcs-boot.json /tmp/rcs-acc.json

# -------------------------------------------------- 4. who has admin rights?
hd "4. Accounts with admin rights"
echo
echo "  To list them I need the PocketBase superuser password"
echo "  (the FIRST password you set during install, min 10 characters)."
echo "  Press Enter to skip this check."
echo
read -r -s -p "  Superuser password: " SU_PASS; echo

if [[ -z "$SU_PASS" ]]; then
  warn "Skipped."
else
  SU_EMAIL="${SU_EMAIL:-honestdigitalmarketer@gmail.com}"
  AUTH_BODY=$(SU_EMAIL="$SU_EMAIL" SU_PASS="$SU_PASS" python3 -c \
    'import json,os;print(json.dumps({"identity":os.environ["SU_EMAIL"],"password":os.environ["SU_PASS"]}))')
  TOKEN=$(curl -sS -X POST "$API/api/admins/auth-with-password" \
      -H "Content-Type: application/json" -d "$AUTH_BODY" \
      | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))' 2>/dev/null || echo "")

  if [[ -z "$TOKEN" ]]; then
    warn "Could not sign in as superuser — wrong password? Skipping this check."
  else
    curl -sS -H "Authorization: $TOKEN" \
      "$API/api/collections/users/records?perPage=200&fields=email,plan,suspended" \
      | python3 -c '
import sys, json
rows = json.load(sys.stdin).get("items", [])
staff = [r for r in rows if r.get("plan") == "staff"]
print()
print("  %d account(s) total, %d with admin rights" % (len(rows), len(staff)))
print()
for r in rows:
    mark = "ADMIN " if r.get("plan") == "staff" else "      "
    print("   %s %-38s plan=%-6s%s" % (mark, r.get("email",""), r.get("plan") or "?",
          "  SUSPENDED" if r.get("suspended") else ""))
print()
if not staff:
    print("  !! No account has admin rights yet.")
    print("     Re-run backend/install-backend.sh to promote your account.")
'
  fi
fi

hd "Done"
ok "Backend rules updated"
echo
echo "  Now open  https://restaurantcasestudy.in/admin.html"
echo "  (hard-refresh with Cmd+Shift+R first)"
echo
