#!/usr/bin/env bash

# Codespace setup orchestrator.
# Called by postAttachCommand on every attach.
# Waits for .env to be valid and runs Taruvi + Codex setup.
# Dev server is started by the separate 'app' postAttachCommand key.

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
  echo "  ✅  Already set up."
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
