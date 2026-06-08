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

# ── Path B: pre-injected Codespace environment variables ──────────────────────
# When github-inject-secrets runs successfully the Build-a-thon platform injects
# TARUVI_SITE_URL / TARUVI_APP_SLUG / TARUVI_API_KEY as GitHub Codespace secrets
# (environment variables). Detect them and write into .env so the watcher and
# setup script pick them up without requiring manual input.
# Values are never printed — only a masked confirmation is shown.
_write_env_var() {
  local varname="$1" value="$2"
  if grep -q "^${varname}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${varname}=.*|${varname}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$varname" "$value" >> "$ENV_FILE"
  fi
}

# Accept both the TARUVI_-prefixed names and the lowercase names the onboarding
# app injects as GitHub Codespace secrets (site_url / app_slug / api_key).
_PRE_SITE="${TARUVI_SITE_URL:-${site_url:-}}"
_PRE_SLUG="${TARUVI_APP_SLUG:-${app_slug:-}}"
_PRE_KEY="${TARUVI_API_KEY:-${api_key:-}}"
_PREINJECTED=false

if [ -n "${_PRE_SITE//[[:space:]]/}" ] \
  && [ -n "${_PRE_SLUG//[[:space:]]/}" ] \
  && [ -n "${_PRE_KEY//[[:space:]]/}" ]; then
  _PREINJECTED=true
  _write_env_var "TARUVI_SITE_URL" "${_PRE_SITE%/}"
  _write_env_var "TARUVI_APP_SLUG" "$_PRE_SLUG"
  _write_env_var "TARUVI_API_KEY"  "$_PRE_KEY"
  echo ""
  echo "  ✅  Found pre-configured Taruvi credentials."
fi
unset _PRE_SITE _PRE_SLUG _PRE_KEY

# ── Path A: manual paste — open guide and .env (skipped when pre-injected) ────
if [ "$_PREINJECTED" = "false" ]; then
  code .codespace/START_HERE.md "$ENV_FILE" 2>/dev/null || true
  echo ""
  echo "  ┌──────────────────────────────────────────────────────┐"
  echo "  │   👋  Welcome to your Taruvi Hackathon Codespace     │"
  echo "  │                                                       │"
  echo "  │   Paste your TARUVI values into .env and save.       │"
  echo "  │   Everything else happens automatically.              │"
  echo "  └──────────────────────────────────────────────────────┘"
  echo ""
fi
unset _PREINJECTED _write_env_var

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
