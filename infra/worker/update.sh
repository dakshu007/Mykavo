#!/usr/bin/env bash
# Auto-deploy: pull main and rebuild ONLY when the commit actually changed.
#
# Run it from cron every few minutes to get the same behaviour the website
# already has - push to main, and the server updates itself. That removes the
# manual rsync-and-restart dance that previously made every worker fix a
# half-hour of copy-pasting.
#
#   */5 * * * * /home/ubuntu/mykavo/infra/worker/update.sh >> /home/ubuntu/mykavo-update.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/mykavo}"
cd "$APP_DIR"

git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0   # nothing new - stay quiet so the cron log stays readable
fi

echo "[$(date -u +%FT%TZ)] updating ${LOCAL:0:7} -> ${REMOTE:0:7}"
git reset --hard origin/main --quiet
docker compose -f infra/worker/compose.yml up -d --build
docker image prune -f --filter "dangling=true" >/dev/null   # reclaim disk
echo "[$(date -u +%FT%TZ)] worker now on ${REMOTE:0:7}"
