#!/usr/bin/env bash
#
# Layer 4 — secret-file guard (PreToolUse on Read/Edit/Write).
# Blocks the agent from reading or writing secret files BY PATH, in EVERY
# permission mode. This matters because `bypassPermissions` skips the
# `deny` list in settings.json — so the only thing standing between an
# autonomous agent and your `.env` is this hook, which runs regardless of mode.
#
# Reads the tool call as JSON on stdin. Exit 0 = allow, Exit 2 = HARD BLOCK
# (stderr shown to Claude). Wired in settings.json hooks.PreToolUse
# (matcher "Read|Edit|Write").
#
# TAILOR the patterns to your repo's secret locations.

set -uo pipefail

payload="$(cat)"
file="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)"

# Nothing to inspect → allow.
[ -z "$file" ] && exit 0

base="${file##*/}"

block() {
  echo "🚫 BLOCKED by secret-file guard: $1" >&2
  echo "   Path: $file" >&2
  echo "   Secrets must not be read/written by the agent — handle them yourself." >&2
  exit 2
}

case "$file" in
  *.pem|*.key|*/id_rsa|*/id_ed25519|*/id_rsa.pub) block "private key / certificate" ;;
  */secrets/*|*/.secrets/*)                       block "secrets directory" ;;
esac

case "$base" in
  .env|.env.*|*.env)                              block "environment / secrets file" ;;
  credentials|credentials.json|service-account*.json) block "credentials file" ;;
  .npmrc|.pypirc|.netrc)                           block "auth token file" ;;
esac

exit 0
