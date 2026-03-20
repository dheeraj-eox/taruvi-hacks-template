#!/usr/bin/env bash

set -euo pipefail

if [ ! -f .env ]; then
  cp .env.example .env
fi

set -a
source .env
set +a

BASE_URL="${VITE_TARUVI_BASE_URL:-}"
BASE_URL="${BASE_URL%/}"
MCP_URL="${BASE_URL}/mcp/"

mkdir -p .codex

cat > .codex/config.toml <<EOF
[mcp_servers.taruvi]
url = "${MCP_URL}"

[mcp_servers.taruvi.http_headers]
Accept = "application/json, text/event-stream"

[mcp_servers.taruvi.env_http_headers]
Authorization = "TARUVI_AUTH_HEADER"
X-App-Slug = "VITE_TARUVI_APP_SLUG"

[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
env_vars = ["CONTEXT7_API_KEY"]

[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest"]

[mcp_servers.chrome-devtools]
command = "npx"
args = ["@anthropic-ai/chrome-devtools-mcp@latest"]
EOF

