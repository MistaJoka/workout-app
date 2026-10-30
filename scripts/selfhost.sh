#!/usr/bin/env bash
# Self-host the PWA from this machine (PC now, Raspberry Pi 4 later) over
# Tailscale Funnel: public HTTPS at https://<machine>.<tailnet>.ts.net:10000/
# with no router changes. Funnel config persists across reboots.
#
#   bash scripts/selfhost.sh          build, publish, (re)enable funnel
#   bash scripts/selfhost.sh --stop   turn the funnel off
#
# The app is offline-first: once installed on the phone it runs without this
# machine. The host only needs to be on for first install and for updates.
set -euo pipefail

PORT="${SELFHOST_PORT:-10000}"           # funnel allows 443, 8443, 10000
LOCAL_PORT="${SELFHOST_LOCAL_PORT:-8795}" # local static server, 127.0.0.1 only
SITE="${SELFHOST_DIR:-$HOME/.local/share/workout-app/site}"
UNIT=workout-app-site.service
cd "$(dirname "$0")/.."
REPO="$PWD"

if [[ "${1:-}" == "--stop" ]]; then
  tailscale funnel --https="$PORT" off || true
  systemctl --user disable --now "$UNIT" || true
  exit 0
fi

VITE_BASE_PATH=/ npm run build
mkdir -p "$SITE"
# Copy the new build in place; --delete drops stale hashed assets.
rsync -a --delete dist/ "$SITE/"

# User service so the server survives logout/reboot. On a headless Pi also
# run once: sudo loginctl enable-linger "$USER"
mkdir -p "$HOME/.config/systemd/user"
cat > "$HOME/.config/systemd/user/$UNIT" <<UNIT
[Unit]
Description=Workout app PWA static server (Tailscale Funnel backend)

[Service]
ExecStart=/usr/bin/env python3 $REPO/scripts/selfhost-server.py $SITE $LOCAL_PORT
Restart=on-failure

[Install]
WantedBy=default.target
UNIT
systemctl --user daemon-reload
systemctl --user enable "$UNIT" >/dev/null 2>&1
systemctl --user restart "$UNIT"

tailscale funnel --bg --https="$PORT" "http://127.0.0.1:$LOCAL_PORT"
host="$(tailscale status --self --json | python3 -c 'import json,sys;print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')"
echo "Live at https://$host:$PORT/"
