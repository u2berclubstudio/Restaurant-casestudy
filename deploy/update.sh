#!/usr/bin/env bash
# =============================================================================
# Restaurant Casestudy — deploy an update
#
#   cd /opt/restaurant-casestudy && sudo bash deploy/update.sh
#
# Pulls the latest commit and syncs it to the web root. Touches nothing else
# on the server — no config changes, no service restarts.
# =============================================================================
set -euo pipefail

SITE_DIR="/var/www/restaurant-casestudy"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

C_OK=$'\033[0;32m'; C_ERR=$'\033[0;31m'; C_INFO=$'\033[0;36m'; C_OFF=$'\033[0m'
ok()   { echo "${C_OK}  ✓${C_OFF} $*"; }
info() { echo "${C_INFO}  →${C_OFF} $*"; }
die()  { echo "${C_ERR}  ✗ $*${C_OFF}" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run with sudo:  sudo bash deploy/update.sh"
[[ -d "$REPO_DIR/.git" ]] || die "$REPO_DIR is not a git clone. Did you clone the repo?"
[[ -d "$SITE_DIR" ]] || die "$SITE_DIR doesn't exist. Run deploy/setup.sh first."

cd "$REPO_DIR"

# Git refuses to operate in a directory owned by another user — this is that fix.
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

BEFORE="$(git rev-parse --short HEAD)"
info "Currently at $BEFORE"

info "Fetching…"
git fetch --quiet origin
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git reset --hard --quiet "origin/$BRANCH"

AFTER="$(git rev-parse --short HEAD)"
if [[ "$BEFORE" == "$AFTER" ]]; then
  ok "Already up to date ($AFTER) — re-syncing files anyway"
else
  ok "Updated $BEFORE → $AFTER"
  git --no-pager log --oneline "$BEFORE..$AFTER" | sed 's/^/      /'
fi

info "Syncing to $SITE_DIR…"
if command -v rsync >/dev/null 2>&1; then
  # 'server' must never reach the web root — it holds the backend source and
  # node_modules, and everything under the web root is publicly readable.
  rsync -a --delete \
        --exclude '.git' --exclude '.gitignore' --exclude 'deploy' \
        --exclude 'server' --exclude 'backend' \
        --exclude 'README.md' --exclude 'GO-LIVE.md' --exclude '.DS_Store' \
        "$REPO_DIR"/ "$SITE_DIR"/
else
  find "$SITE_DIR" -mindepth 1 -delete
  (cd "$REPO_DIR" && tar --exclude=.git --exclude=deploy --exclude=server \
       --exclude=backend --exclude=README.md --exclude=GO-LIVE.md \
       --exclude=.gitignore --exclude=.DS_Store -cf - .) | (cd "$SITE_DIR" && tar -xf -)
fi

# Belt and braces: if an older deploy already put them there, take them away.
rm -rf "$SITE_DIR/server" "$SITE_DIR/backend" "$SITE_DIR/deploy"

WEBUSER="www-data"; id -u nginx >/dev/null 2>&1 && WEBUSER="nginx"
chown -R "$WEBUSER":"$WEBUSER" "$SITE_DIR"
find "$SITE_DIR" -type d -exec chmod 755 {} \;
find "$SITE_DIR" -type f -exec chmod 644 {} \;

ok "$(find "$SITE_DIR" -type f | wc -l | tr -d ' ') files live at $SITE_DIR"
echo
ok "Deployed. No service restart needed — static files are picked up immediately."
echo "  If you don't see the change, hard-refresh: Cmd+Shift+R"
echo
