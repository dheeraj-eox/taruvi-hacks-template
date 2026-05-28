#!/usr/bin/env bash

set -euo pipefail

cd "${WORKSPACE_FOLDER:-$PWD}"

export XDG_CONFIG_HOME=/tmp

if [ ! -f .env ]; then
  cp .env.example .env
fi

open_env_once_if_possible() {
  if [ "${ENV_FILE_OPENED:-0}" = "1" ]; then
    return
  fi

  if command -v code >/dev/null 2>&1; then
    code .env >/dev/null 2>&1 || true
    ENV_FILE_OPENED=1
  elif command -v code-server >/dev/null 2>&1; then
    code-server .env >/dev/null 2>&1 || true
    ENV_FILE_OPENED=1
  fi
}

while true; do
  eval "$(bash scripts/sync-taruvi-env.sh .env)"

  if [ -n "${TARUVI_SITE_URL//[[:space:]]/}" ] \
    && [ -n "${TARUVI_API_KEY//[[:space:]]/}" ] \
    && [ -n "${TARUVI_APP_SLUG//[[:space:]]/}" ]; then
    break
  fi

  open_env_once_if_possible
  echo "Open .env and fill TARUVI_SITE_URL, TARUVI_APP_SLUG, and TARUVI_API_KEY, then save and press Enter to retry."
  read -r
done

echo "✅ Taruvi credentials loaded."

export CODEX_HOME="${CODEX_HOME:-$PWD/.codex}"
mkdir -p "$CODEX_HOME/projects"

bash scripts/refresh-codex-config.sh

echo "🔑 Fetching AI provider key from your app secrets..."

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
  echo "✅ Found OPENAI_API_KEY."
elif PROVIDER_KEY=$(fetch_secret ANTHROPIC_API_KEY) && [ -n "$PROVIDER_KEY" ]; then
  PROVIDER_VAR="ANTHROPIC_API_KEY"
  echo "✅ Found ANTHROPIC_API_KEY."
else
  echo ""
  echo "❌ Could not find OPENAI_API_KEY or ANTHROPIC_API_KEY in your app secrets."
  echo "   Make sure onboarding step 6 (Register App) completed successfully,"
  echo "   then try again. If the problem persists, contact the hackathon admin."
  exit 1
fi

# Persist key in .env and export for this session
if grep -q "^${PROVIDER_VAR}=" .env; then
  sed -i "s|^${PROVIDER_VAR}=.*|${PROVIDER_VAR}=${PROVIDER_KEY}|" .env
else
  echo "${PROVIDER_VAR}=${PROVIDER_KEY}" >> .env
fi
export "${PROVIDER_VAR}=${PROVIDER_KEY}"

# Update .mcp.json with participant's own credentials
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
echo "✅ MCP server configured."

source /usr/local/share/nvm/nvm.sh
nvm install 22
nvm use 22

command -v codex >/dev/null 2>&1 || npm install -g @openai/codex

VSCODE_EXTENSION_ID="${CODEX_VSCODE_EXTENSION_ID:-openai.chatgpt}"
if command -v code >/dev/null 2>&1; then
  code --install-extension "$VSCODE_EXTENSION_ID" --force || true
elif command -v code-server >/dev/null 2>&1; then
  code-server --install-extension "$VSCODE_EXTENSION_ID" --force || true
else
  echo "VS Code CLI not found; skipping extension install ($VSCODE_EXTENSION_ID)."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ All set! Launching Codex..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec codex --sandbox danger-full-access --ask-for-approval never
