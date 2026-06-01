#!/usr/bin/env bash
set -euo pipefail

URL="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"

echo ""
echo "  🌐  ${URL}"
echo ""
echo "  ↑ Click the URL above to open the app in a new browser tab."
echo "  Log in there first, then come back — the preview will reflect your session."
echo ""

# Best-effort: try to open Simple Browser inside VS Code
code --command simpleBrowser.show "$URL" 2>/dev/null || true
