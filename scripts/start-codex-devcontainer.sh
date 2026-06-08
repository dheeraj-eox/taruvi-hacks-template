#!/usr/bin/env bash

# Taruvi + Codex setup script.
# Configures MCP, fetches the AI provider key, and writes Codex auth.
# Does NOT start the dev server — that is the orchestrator's job.
#
# Usage:
#   bash scripts/start-codex-devcontainer.sh                 # interactive
#   bash scripts/start-codex-devcontainer.sh --non-interactive  # automatic (called by codespace-first-run.sh)

set -euo pipefail

NON_INTERACTIVE=false
for arg in "$@"; do
  case "$arg" in
    --non-interactive) NON_INTERACTIVE=true ;;
  esac
done

cd "${WORKSPACE_FOLDER:-$PWD}"

export XDG_CONFIG_HOME=/tmp

[ -f .env ] || cp .env.example .env

# ── Load and validate Taruvi credentials ──────────────────────────────────────

if [ "$NON_INTERACTIVE" = "true" ]; then
  eval "$(bash scripts/sync-taruvi-env.sh .env)"
  export TARUVI_SITE_URL TARUVI_APP_SLUG TARUVI_API_KEY

  if [ -z "${TARUVI_SITE_URL//[[:space:]]/}" ] \
    || [ -z "${TARUVI_APP_SLUG//[[:space:]]/}" ] \
    || [ -z "${TARUVI_API_KEY//[[:space:]]/}" ]; then
    echo "  ❌  Taruvi credentials missing in .env." >&2
    echo "      Fill TARUVI_SITE_URL, TARUVI_APP_SLUG, and TARUVI_API_KEY, then retry." >&2
    exit 1
  fi
else
  # Interactive fallback: open .env and wait for the participant
  open_env_once() {
    [ "${ENV_FILE_OPENED:-0}" = "1" ] && return
    if command -v code >/dev/null 2>&1; then
      code .env >/dev/null 2>&1 || true
      ENV_FILE_OPENED=1
    fi
  }

  while true; do
    eval "$(bash scripts/sync-taruvi-env.sh .env)"
    export TARUVI_SITE_URL TARUVI_APP_SLUG TARUVI_API_KEY
    if [ -n "${TARUVI_SITE_URL//[[:space:]]/}" ] \
      && [ -n "${TARUVI_APP_SLUG//[[:space:]]/}" ] \
      && [ -n "${TARUVI_API_KEY//[[:space:]]/}" ]; then
      break
    fi
    open_env_once
    echo "Open .env, fill TARUVI_SITE_URL, TARUVI_APP_SLUG, and TARUVI_API_KEY, then save and press Enter."
    read -r
  done
fi

echo "  ✅  Taruvi credentials loaded."

# ── Codex config ──────────────────────────────────────────────────────────────
export CODEX_HOME="${CODEX_HOME:-$PWD/.codex}"
mkdir -p "$CODEX_HOME/projects"
bash scripts/refresh-codex-config.sh

# ── Update .mcp.json ──────────────────────────────────────────────────────────
[ -f .mcp.json ] || cp .mcp.example.json .mcp.json

python3 -c "
import json, os
with open('.mcp.json') as f:
    mcp = json.load(f)
if 'taruvi' in mcp.get('mcpServers', {}):
    mcp['mcpServers']['taruvi']['url'] = os.environ['TARUVI_SITE_URL'] + '/mcp/'
    mcp['mcpServers']['taruvi']['headers'] = {
        'Authorization': 'Api-Key ' + os.environ['TARUVI_API_KEY'],
        'X-App-Slug': os.environ['TARUVI_APP_SLUG']
    }
with open('.mcp.json', 'w') as f:
    json.dump(mcp, f, indent=2)
"
echo "  ✅  MCP server configured."

# ── Fetch AI provider key ─────────────────────────────────────────────────────
fetch_secret() {
  local name="$1"
  curl -sf \
    -H "Authorization: Api-Key ${TARUVI_API_KEY}" \
    "${TARUVI_SITE_URL}/api/secrets/${name}/?app=${TARUVI_APP_SLUG}" \
    2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('data',{}).get('value',{}).get('text',''); print(v) if v else sys.exit(1)" \
    2>/dev/null
}

PROVIDER_KEY=""
PROVIDER_VAR=""

if PROVIDER_KEY=$(fetch_secret OPENAI_API_KEY) && [ -n "$PROVIDER_KEY" ]; then
  PROVIDER_VAR="OPENAI_API_KEY"
elif PROVIDER_KEY=$(fetch_secret ANTHROPIC_API_KEY) && [ -n "$PROVIDER_KEY" ]; then
  PROVIDER_VAR="ANTHROPIC_API_KEY"
else
  echo "" >&2
  echo "  ❌  Could not fetch the AI provider key from Taruvi secrets." >&2
  echo "      Make sure onboarding step 6 (Register App) completed successfully." >&2
  echo "      If the problem persists, contact the hackathon admin." >&2
  exit 1
fi

mkdir -p "${XDG_CONFIG_HOME}/openai" "$HOME/.config/openai"

# The Taruvi secret may be a plain API key (sk-...) or a chatgpt OAuth auth
# JSON ({"auth_mode":"chatgpt","tokens":{...}}). Detect which and handle each.
if echo "$PROVIDER_KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'auth_mode' in d" 2>/dev/null; then
  # OAuth auth JSON — write directly to both VS Code extension paths and CLI path.
  # Do NOT write to .env or .bashrc since there is no plain API key to export.
  printf '%s\n' "$PROVIDER_KEY" \
    | tee "${XDG_CONFIG_HOME}/openai/auth.json" \
          "$HOME/.config/openai/auth.json" \
          "$CODEX_HOME/auth.json" > /dev/null
  echo "  ✅  AI provider credentials configured (OAuth mode)."
else
  # Plain API key — persist to .env, .bashrc, write {"apiKey":"..."} auth files,
  # and authenticate the Codex CLI.
  if grep -q "^${PROVIDER_VAR}=" .env; then
    sed -i "s|^${PROVIDER_VAR}=.*|${PROVIDER_VAR}=${PROVIDER_KEY}|" .env
  else
    echo "${PROVIDER_VAR}=${PROVIDER_KEY}" >> .env
  fi
  export "${PROVIDER_VAR}=${PROVIDER_KEY}"

  printf '{"apiKey":"%s"}\n' "$PROVIDER_KEY" \
    | tee "${XDG_CONFIG_HOME}/openai/auth.json" \
          "$HOME/.config/openai/auth.json" > /dev/null

  if grep -q "^export ${PROVIDER_VAR}=" ~/.bashrc 2>/dev/null; then
    sed -i "s|^export ${PROVIDER_VAR}=.*|export ${PROVIDER_VAR}=${PROVIDER_KEY}|" ~/.bashrc
  else
    echo "export ${PROVIDER_VAR}=${PROVIDER_KEY}" >> ~/.bashrc
  fi

  if [ "$PROVIDER_VAR" = "OPENAI_API_KEY" ] && command -v codex >/dev/null 2>&1; then
    printf '%s\n' "$PROVIDER_KEY" | codex login --with-api-key 2>/dev/null \
      && echo "  ✅  Codex CLI authenticated." \
      || echo "  ⚠️   Codex CLI login skipped — will use OPENAI_API_KEY env var."
  fi

  echo "  ✅  AI provider key configured."
fi
