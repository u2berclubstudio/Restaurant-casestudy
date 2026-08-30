#!/usr/bin/env bash
# =============================================================================
# Restaurant Casestudy — preflight check
#
#   sudo bash deploy/preflight.sh
#
# READ-ONLY. Changes nothing, reloads nothing, installs nothing.
# Run this first to see exactly what is on the server and whether adding
# restaurantcasestudy.in can disturb the site you already have at the root.
# =============================================================================
set -uo pipefail

DOMAIN="${1:-restaurantcasestudy.in}"
EXPECTED_IP="129.121.123.192"

C_OK=$'\033[0;32m'; C_WARN=$'\033[0;33m'; C_ERR=$'\033[0;31m'
C_INFO=$'\033[0;36m'; C_DIM=$'\033[0;90m'; C_OFF=$'\033[0m'
ok()   { echo "${C_OK}  ✓${C_OFF} $*"; }
info() { echo "${C_INFO}  →${C_OFF} $*"; }
warn() { echo "${C_WARN}  !${C_OFF} $*"; }
bad()  { echo "${C_ERR}  ✗${C_OFF} $*"; }
dim()  { echo "${C_DIM}    $*${C_OFF}"; }
hd()   { echo; echo "${C_INFO}── $* ────────────────────────────────${C_OFF}"; }

ISSUES=0

echo
echo "  Preflight — nothing will be changed"
echo "  domain: $DOMAIN"
echo "  server: $EXPECTED_IP"

# ------------------------------------------------------------------ 1. stack
hd "1. What is serving your existing site"

PANEL=""
[[ -d /usr/local/cpanel  ]] && PANEL="cPanel"
[[ -d /usr/local/psa     ]] && PANEL="Plesk"
[[ -d /usr/local/lsws    ]] && PANEL="OpenLiteSpeed / CyberPanel"
[[ -d /www/server/panel  ]] && PANEL="aaPanel / BT Panel"
[[ -d /usr/local/CyberCP ]] && PANEL="CyberPanel"

if [[ -n "$PANEL" ]]; then
  warn "$PANEL is installed."
  dim "Add the domain through the panel instead of running setup.sh."
  dim "Point its document root at /var/www/restaurant-casestudy."
  ISSUES=$((ISSUES+1))
fi

WS=""
for s in nginx apache2 httpd caddy openlitespeed lshttpd; do
  if systemctl is-active --quiet "$s" 2>/dev/null; then WS="$s"; ok "$s is running"; fi
done
[[ -z "$WS" ]] && { bad "No known web server is running."; dim "If your site runs in Docker, setup.sh is not the right tool — tell me and I'll do a container config."; ISSUES=$((ISSUES+1)); }

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Ports}}' 2>/dev/null | grep -qE ':(80|443)->'; then
  warn "A Docker container is publishing port 80/443."
  dim "Your existing site may be containerised. Check before proceeding:"
  docker ps --format '      {{.Names}}  {{.Image}}  {{.Ports}}' 2>/dev/null | grep -E ':(80|443)->'
  ISSUES=$((ISSUES+1))
fi

# ------------------------------------------------------------------ 2. vhosts
hd "2. Sites already configured"

CLASH=0
if [[ "$WS" == "nginx" ]]; then
  DIRS=(/etc/nginx/sites-enabled /etc/nginx/conf.d)
  FOUND=0
  for d in "${DIRS[@]}"; do
    [[ -d "$d" ]] || continue
    while IFS= read -r f; do
      [[ -f "$f" || -L "$f" ]] || continue
      FOUND=$((FOUND+1))
      NAMES=$(grep -hoP '^\s*server_name\s+\K[^;]+' "$f" 2>/dev/null | tr '\n' ' ' | xargs || echo '(none)')
      ROOTS=$(grep -hoP '^\s*root\s+\K[^;]+' "$f" 2>/dev/null | head -1 | xargs || echo '-')
      DEF=""
      grep -qE 'listen[^;]*default_server' "$f" 2>/dev/null && DEF=" ${C_WARN}[default]${C_OFF}"
      echo "    • $(basename "$f")${DEF}"
      dim "server_name: $NAMES"
      dim "root:        $ROOTS"
      if echo " $NAMES " | grep -qE "[ ,]$DOMAIN[ ,;]|^$DOMAIN$"; then
        bad "This vhost already claims $DOMAIN — that IS a conflict."
        CLASH=1; ISSUES=$((ISSUES+1))
      fi
    done < <(find "$d" -maxdepth 1 \( -type f -o -type l \) 2>/dev/null | sort)
  done
  [[ $FOUND -eq 0 ]] && warn "No enabled nginx sites found — unusual if a site is live."

elif [[ "$WS" == "apache2" || "$WS" == "httpd" ]]; then
  D=/etc/apache2/sites-enabled; [[ "$WS" == "httpd" ]] && D=/etc/httpd/conf.d
  while IFS= read -r f; do
    [[ -f "$f" || -L "$f" ]] || continue
    NAMES=$(grep -hoP '^\s*Server(Name|Alias)\s+\K.*' "$f" 2>/dev/null | tr '\n' ' ' | xargs || echo '(none)')
    ROOTS=$(grep -hoP '^\s*DocumentRoot\s+\K.*' "$f" 2>/dev/null | head -1 | xargs || echo '-')
    echo "    • $(basename "$f")"
    dim "ServerName:   $NAMES"
    dim "DocumentRoot: $ROOTS"
    if echo " $NAMES " | grep -q " $DOMAIN "; then
      bad "This vhost already claims $DOMAIN — that IS a conflict."
      CLASH=1; ISSUES=$((ISSUES+1))
    fi
  done < <(find "$D" -maxdepth 1 \( -type f -o -type l \) 2>/dev/null | sort)
fi

echo
if [[ $CLASH -eq 0 ]]; then
  ok "No existing vhost claims $DOMAIN."
  dim "Your root site keeps every request that isn't for $DOMAIN."
  dim "This is name-based virtual hosting: an exact server_name match wins,"
  dim "and everything else falls through to the default as it does today."
fi

# --------------------------------------------------------------- 3. conflicts
hd "3. Path and port conflicts"

if [[ -e /var/www/restaurant-casestudy ]]; then
  warn "/var/www/restaurant-casestudy already exists — setup.sh would overwrite its contents."
  dim "$(find /var/www/restaurant-casestudy -type f 2>/dev/null | wc -l | xargs) files currently there"
else
  ok "/var/www/restaurant-casestudy is free"
fi
[[ -e /opt/restaurant-casestudy ]] && warn "/opt/restaurant-casestudy already exists (an earlier clone?)" \
                                   || ok "/opt/restaurant-casestudy is free"

if command -v ss >/dev/null 2>&1; then
  echo
  info "Listening on 80/443:"
  ss -ltnp 2>/dev/null | awk 'NR==1 || /:80 |:443 /' | sed 's/^/    /'
fi

# ------------------------------------------------------------------ 4. dns
hd "4. DNS"

MYIP="$(curl -fsS --max-time 6 https://api.ipify.org 2>/dev/null || echo '')"
[[ -n "$MYIP" ]] && info "This server's public IP: $MYIP"
if [[ -n "$MYIP" && "$MYIP" != "$EXPECTED_IP" ]]; then
  warn "That differs from the $EXPECTED_IP you gave me. Make sure you're on the right box."
  ISSUES=$((ISSUES+1))
fi

for h in "$DOMAIN" "www.$DOMAIN"; do
  IP="$(getent ahostsv4 "$h" 2>/dev/null | awk '{print $1; exit}')"
  if [[ -z "$IP" ]]; then
    bad "$h does not resolve — add an A record pointing to $EXPECTED_IP"
    ISSUES=$((ISSUES+1))
  elif [[ -n "$MYIP" && "$IP" != "$MYIP" ]]; then
    warn "$h → $IP (not this server). Cloudflare proxy? Otherwise fix the A record."
    ISSUES=$((ISSUES+1))
  else
    ok "$h → $IP"
  fi
done

# ------------------------------------------------------------------ 5. tools
hd "5. Required tools"
for c in git rsync curl; do
  command -v "$c" >/dev/null 2>&1 && ok "$c" || { warn "$c missing — apt-get install -y $c"; }
done
command -v certbot >/dev/null 2>&1 && ok "certbot ($(certbot --version 2>&1 | head -1))" \
  || info "certbot not installed — setup.sh will install it"

if command -v certbot >/dev/null 2>&1; then
  echo
  info "Certificates already on this server (yours will be added, none replaced):"
  certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains' | sed 's/^/    /' || dim "(none)"
fi

# ------------------------------------------------------------------ verdict
hd "Verdict"
echo
if [[ $CLASH -eq 1 ]]; then
  bad "STOP. An existing vhost already claims $DOMAIN."
  echo "    Resolve that first — running setup.sh now could take traffic from a live site."
elif [[ $ISSUES -eq 0 ]]; then
  ok "All clear. Your existing root site will not be affected."
  echo
  echo "    Next:  sudo bash deploy/setup.sh"
else
  warn "$ISSUES thing(s) to look at above — most are warnings, not blockers."
  echo
  echo "    If DNS is the only complaint, fix the A records and re-run this."
  echo "    Otherwise:  sudo bash deploy/setup.sh"
fi
echo
