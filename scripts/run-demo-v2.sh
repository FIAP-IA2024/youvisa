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

# The recording script uses Playwright + modern JS (optional chaining,
# top-level await). It needs Node ≥ 18. We pick the newest installed
# Node we can find — preferring nvm's latest, then PATH.
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
NODE_BIN=""
if [ -d "$NVM_DIR/versions/node" ]; then
  LATEST_NODE=$(ls -1 "$NVM_DIR/versions/node" 2>/dev/null | sort -V | tail -1 || true)
  if [ -n "$LATEST_NODE" ] && [ -x "$NVM_DIR/versions/node/$LATEST_NODE/bin/node" ]; then
    NODE_BIN="$NVM_DIR/versions/node/$LATEST_NODE/bin/node"
  fi
fi
if [ -z "$NODE_BIN" ]; then
  NODE_BIN=$(command -v node || true)
fi
if [ -z "$NODE_BIN" ]; then
  echo -e "${R}node not found. install Node ≥ 18 (e.g., 'nvm install 22').${N}"
  exit 1
fi
NODE_MAJOR=$("$NODE_BIN" -e 'console.log(process.versions.node.split(".")[0])')
if [ "${NODE_MAJOR:-0}" -lt 18 ]; then
  echo -e "${R}Node $($NODE_BIN -v) is too old (need ≥ 18). Install with: nvm install 22${N}"
  exit 1
fi
echo -e "${C}using node: $NODE_BIN ($($NODE_BIN -v))${N}"

# Refresh credentials + webhook (idempotent)
bash scripts/setup-demo-v2.sh

echo ""
echo -e "${C}== record (Chromium HEADED — não interaja com a janela) ==${N}"
"$NODE_BIN" scripts/record-demo-v2-tg.mjs

echo ""
echo -e "${G}✓ done.${N} mp4 at docs/demo-sprint-4.mp4"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 docs/demo-sprint-4.mp4 \
  | xargs -I{} echo "  duration: {}s"
