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

export CODEX_HOME="${CODEX_HOME:-$PWD/.codex}"
mkdir -p "$CODEX_HOME/projects"

bash scripts/refresh-codex-config.sh

if [ -f /root/.codex/auth.json ] && [ ! -f "$CODEX_HOME/auth.json" ]; then
  cp /root/.codex/auth.json "$CODEX_HOME/auth.json"
fi

AUTH_PATH="$CODEX_HOME/auth.json"
if [ ! -f "$AUTH_PATH" ]; then
  echo "please copy auth.json to $AUTH_PATH and press Enter"
  read -r
fi

source /usr/local/share/nvm/nvm.sh
nvm install 22
nvm use 22

command -v codex >/dev/null 2>&1 || npm install -g @openai/codex

echo "=== Codex config written to $CODEX_HOME/config.toml ==="

VSCODE_EXTENSION_ID="${CODEX_VSCODE_EXTENSION_ID:-openai.chatgpt}"
if command -v code >/dev/null 2>&1; then
  code --install-extension "$VSCODE_EXTENSION_ID" --force || true
elif command -v code-server >/dev/null 2>&1; then
  code-server --install-extension "$VSCODE_EXTENSION_ID" --force || true
else
  echo "VS Code CLI not found; skipping extension install ($VSCODE_EXTENSION_ID)."
fi

echo "=== Launching Codex ==="

exec codex --sandbox danger-full-access --ask-for-approval never
