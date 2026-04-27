#!/usr/bin/env bash
# Orchestrate the v2 demo recording end-to-end.
#
# Assumes:
#   - docker compose stack is up
#   - scripts/setup-demo-v2.sh was run (ngrok + webhook + creds synced)
#   - scripts/telegram-login.mjs was run (telegram-state.json saved)
#
# The recording script self-bootstraps:
#   - if demo-context.json doesn't exist, it sends "olá" to the bot itself
#     and runs scripts/seed-demo-from-tg.ts before starting the recording.
#
# Run:   bash scripts/run-demo-v2.sh
set -euo pipefail
cd "$(dirname "$0")/.."

C="\033[36m"; G="\033[32m"; R="\033[31m"; N="\033[0m"

# Refresh credentials + webhook (idempotent)
bash scripts/setup-demo-v2.sh

echo ""
echo -e "${C}== record (Chromium HEADED — não interaja com a janela) ==${N}"
node scripts/record-demo-v2-tg.mjs

echo ""
echo -e "${G}✓ done.${N} mp4 at docs/demo-sprint-4.mp4"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 docs/demo-sprint-4.mp4 \
  | xargs -I{} echo "  duration: {}s"
