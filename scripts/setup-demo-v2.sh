#!/usr/bin/env bash
# Bring the YOUVISA stack to a state ready for the v2 (real-Telegram) demo.
#
# Idempotent. Runs:
#   1. Sync fresh Claude OAuth token from macOS Keychain into agent container
#      (the container's /home/node/.claude/.credentials.json is the source of
#      truth for claude-vision.ts; tokens expire ~ every 8 hours)
#   2. Start ngrok tunnel pointing at localhost:7777 (agent service)
#   3. Re-point Telegram webhook at <ngrok-url>/telegram/webhook
#   4. Print a summary so the user can sanity-check
#
# Usage:
#   ./scripts/setup-demo-v2.sh
#
# Prereqs:
#   - docker compose stack already up  (make start all)
#   - ngrok configured (~/Library/Application Support/ngrok/ngrok.yml present)
#   - .env contains TELEGRAM_BOT_TOKEN
set -euo pipefail

cd "$(dirname "$0")/.."

# Colors
G="\033[32m"; R="\033[31m"; Y="\033[33m"; C="\033[36m"; N="\033[0m"

echo -e "${C}== YOUVISA demo v2 setup ==${N}"

# ---- 1. Sync fresh Claude credentials ----
echo -e "${Y}[1/4]${N} Syncing fresh Claude OAuth token from Keychain"
if ! security find-generic-password -s "Claude Code-credentials" -w > /tmp/fresh-creds.json 2>/dev/null; then
  echo -e "${R}  could not read credentials from macOS Keychain (run \`claude\` once first?)${N}"
  exit 1
fi
expires_ms=$(python3 -c "import json,sys;d=json.load(open('/tmp/fresh-creds.json'));print(d['claudeAiOauth']['expiresAt'])")
expires_human=$(date -r $((expires_ms/1000)))
echo -e "${G}  ✓${N} fresh token (expires $expires_human)"

if ! docker ps --format '{{.Names}}' | grep -q '^youvisa-agent$'; then
  echo -e "${R}  agent container not running. run: docker compose up -d${N}"
  exit 1
fi
docker cp /tmp/fresh-creds.json youvisa-agent:/home/node/.claude/.credentials.json
docker exec --user root youvisa-agent sh -c \
  'chown node:node /home/node/.claude/.credentials.json && chmod 600 /home/node/.claude/.credentials.json'
echo -e "${G}  ✓${N} synced into agent container"

# ---- 2. Start (or reuse) ngrok ----
echo -e "${Y}[2/4]${N} ngrok tunnel"
if curl -s -m 2 http://127.0.0.1:4040/api/tunnels > /dev/null 2>&1; then
  echo -e "${G}  ✓${N} ngrok already running"
else
  nohup ngrok http 7777 --log=/tmp/ngrok.log > /dev/null 2>&1 & disown
  for _ in 1 2 3 4 5 6 7 8; do
    sleep 1
    if curl -s -m 1 http://127.0.0.1:4040/api/tunnels > /dev/null 2>&1; then
      break
    fi
  done
fi
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['tunnels'][0]['public_url'])")
echo -e "${G}  ✓${N} tunnel: $NGROK_URL"

# ---- 3. Set Telegram webhook (with secret_token) ----
echo -e "${Y}[3/4]${N} Setting Telegram webhook"
TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' .env | cut -d= -f2)
if [[ -z "$TOKEN" ]]; then
  echo -e "${R}  TELEGRAM_BOT_TOKEN not found in .env${N}"
  exit 1
fi

# Generate a webhook secret on first run; persist to .env so the agent
# container reads the same value. Telegram echoes it back in the
# X-Telegram-Bot-Api-Secret-Token header, which the webhook handler
# verifies — closes the unauthenticated-webhook attack surface.
WEBHOOK_SECRET=$( (grep '^TELEGRAM_WEBHOOK_SECRET=' .env 2>/dev/null || true) | cut -d= -f2)
if [[ -z "$WEBHOOK_SECRET" ]]; then
  WEBHOOK_SECRET=$(openssl rand -hex 32)
  echo "TELEGRAM_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env
  echo -e "${G}  ✓${N} generated TELEGRAM_WEBHOOK_SECRET (persisted to .env)"
  # Restart agent so it picks up the new env var
  docker compose restart agent > /dev/null 2>&1 || true
fi

RESP=$(curl -s -X POST "https://api.telegram.org/bot$TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$NGROK_URL/telegram/webhook\",\"secret_token\":\"$WEBHOOK_SECRET\",\"drop_pending_updates\":true,\"allowed_updates\":[\"message\"]}")
if echo "$RESP" | grep -q '"ok":true'; then
  echo -e "${G}  ✓${N} webhook → $NGROK_URL/telegram/webhook (signed)"
else
  echo -e "${R}  $RESP${N}"; exit 1
fi

# ---- 4. Quick smoke (lightweight reachability — skip pipeline) ----
echo -e "${Y}[4/4]${N} Health check"
HEALTH=$(curl -s -m 3 http://localhost:7777/health || echo '')
if echo "$HEALTH" | grep -q '"ok":true\|"status":"ok"'; then
  echo -e "${G}  ✓${N} agent /health OK"
else
  echo -e "${Y}  agent /health unexpected: ${HEALTH:0:120}${N}"
fi

echo ""
echo -e "${C}== Ready ==${N}"
echo "  ngrok dashboard: http://127.0.0.1:4040"
echo "  bot username:    @youvisa_test_assistant_s3_bot"
echo ""
echo "Next:"
echo "  1. node scripts/telegram-login.mjs   (one time — saves session)"
echo "  2. send 'olá' to the bot from your Telegram (creates user)"
echo "  3. node scripts/record-demo-v2-tg.mjs (records the video)"
