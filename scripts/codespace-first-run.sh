#!/usr/bin/env bash

# Codespace first-run orchestrator.
# Called by postAttachCommand on every attach.
# Waits for .env to be valid, runs setup once, then starts the dev server.

set -uo pipefail

MARKER=".codespace/.setup-complete"
ENV_FILE=".env"

# ── Prerequisites ──────────────────────────────────────────────────────────────
[ -f .mcp.json ]   || cp .mcp.example.json .mcp.json
[ -f "$ENV_FILE" ] || cp .env.example "$ENV_FILE"
mkdir -p .codex/projects .codespace

# ── Open guide and .env ────────────────────────────────────────────────────────
code .codespace/START_HERE.md "$ENV_FILE" 2>/dev/null || true

echo ""
echo "  ┌──────────────────────────────────────────────────────┐"
echo "  │   👋  Welcome to your Taruvi Hackathon Codespace     │"
echo "  │                                                       │"
echo "  │   Paste your TARUVI values into .env and save.       │"
echo "  │   Everything else happens automatically.              │"
echo "  └──────────────────────────────────────────────────────┘"
echo ""

# ── Env validation ─────────────────────────────────────────────────────────────
env_is_valid() {
  local site slug key
  site=$(grep -E "^TARUVI_SITE_URL=.+" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '[:space:]')
  slug=$(grep -E "^TARUVI_APP_SLUG=.+" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '[:space:]')
  key=$(grep  -E "^TARUVI_API_KEY=.+"  "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '[:space:]')
  [ -n "$site" ] && [ -n "$slug" ] && [ -n "$key" ]
}

# ── Skip setup on re-attach if already complete and env is still valid ─────────
if [ -f "$MARKER" ] && env_is_valid; then
  echo "  ✅  Already set up — starting dev server..."
  echo ""
else
  # Wait for participant to save a valid .env
  until env_is_valid; do
    sleep 2
  done

  echo "  ✅  Taruvi credentials detected. Running setup..."
  echo ""

  setup_ok=true
  bash scripts/start-codex-devcontainer.sh --non-interactive || setup_ok=false

  if [ "$setup_ok" = "false" ]; then
    echo ""
    echo "  ⚠️   Setup encountered an issue."
    echo "       Your app will still start."
    echo "       Use the '🔁 Retry Setup' button to try again."
    echo ""
  else
    touch "$MARKER"
    echo "  ✅  Setup complete."
    echo ""
  fi
fi

# ── Best-effort open Codex sidebar ────────────────────────────────────────────
# chatgpt.openSidebar is the correct command per developers.openai.com/codex/ide/commands
# This may open a new browser tab in Codespaces web — treated as best-effort only.
code --command chatgpt.openSidebar 2>/dev/null || true

# ── Start dev server ──────────────────────────────────────────────────────────
echo "  🚀  Starting app on port 5173..."
echo ""

source /usr/local/share/nvm/nvm.sh 2>/dev/null || true
nvm use 22 --silent 2>/dev/null || true

exec npm run dev -- --host 0.0.0.0 --port 5173
