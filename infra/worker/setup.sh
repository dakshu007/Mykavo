#!/usr/bin/env bash
# One-time bootstrap for a fresh Ubuntu server (Oracle Cloud Always Free,
# Hetzner, or any VPS). Installs Docker, clones MyKavo, and starts the worker.
#
#   curl -fsSL https://raw.githubusercontent.com/dakshu007/Mykavo/main/infra/worker/setup.sh | bash
#
# Then paste the worker environment file when prompted (see README.md).
set -euo pipefail

REPO_URL="https://github.com/dakshu007/Mykavo.git"
APP_DIR="$HOME/mykavo"
ENV_FILE="$APP_DIR/infra/worker/worker.env"

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

say "Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "Added $USER to the docker group."
fi

say "Fetching MyKavo"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin main --quiet
  git -C "$APP_DIR" reset --hard origin/main --quiet
else
  git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi

if [ ! -f "$ENV_FILE" ]; then
  say "Environment file missing"
  cat <<MSG
Create it now, then re-run this script:

  nano $ENV_FILE

Paste the contents of apps/worker/.env.production from the Mac. Strip any
surrounding quotes - docker compose passes values through literally, so
DATABASE_URL="postgres://..." would include the quote characters.

Required: DATABASE_URL, APP_URL, ARTIFACT_STORE, R2_ACCOUNT_ID,
R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, RESEND_API_KEY, EMAIL_FROM.
MSG
  exit 1
fi

say "Building and starting the worker (first build takes ~5-10 minutes)"
cd "$APP_DIR"
sudo docker compose -f infra/worker/compose.yml up -d --build

say "Done - following the log (Ctrl-C to stop watching; the worker keeps running)"
sudo docker logs -f --tail 30 mykavo-worker
