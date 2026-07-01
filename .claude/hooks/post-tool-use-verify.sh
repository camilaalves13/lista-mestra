#!/usr/bin/env bash
#
# Layer 4 + Layer 5 — PostToolUse verify + observe.
# Runs AFTER every Edit/Write. Two jobs:
#   1. Self-verification loop: lint/typecheck the file that just changed and feed
#      failures straight back to Claude so it fixes them WITHOUT a human prompting.
#   2. Observability: append a one-line session log (Layer 5) for later review.
#
# Exit 0 = silent OK. Exit 2 = surface stderr to Claude (it will try to fix).
# Keep this FAST — it runs on every edit. Lint a single file, not the repo.
#
# Wired up in .claude/settings.json under hooks.PostToolUse (matcher "Edit|Write").

set -uo pipefail

payload="$(cat)"
file="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
log_dir="${CLAUDE_PROJECT_DIR:-.}/.claude/logs"
mkdir -p "$log_dir"
log="$log_dir/session-verify.log"

stamp() { date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "ts"; }
record() { echo "$(stamp) $1 ${file:-?}" >> "$log"; }

[ -z "$file" ] && exit 0
[ ! -f "$file" ] && exit 0

problems=""

case "$file" in
  # --- TypeScript / JavaScript -------------------------------------------------
  *.ts|*.tsx|*.js|*.jsx)
    if command -v pnpm >/dev/null 2>&1 && [ -f package.json ]; then
      # Lint just the changed file; capture failures.
      if ! out="$(pnpm exec eslint "$file" 2>&1)"; then
        problems="ESLint:\n$out"
      fi
    fi
    ;;
  # --- Python ------------------------------------------------------------------
  *.py)
    if command -v ruff >/dev/null 2>&1; then
      if ! out="$(ruff check "$file" 2>&1)"; then
        problems="Ruff:\n$out"
      fi
    fi
    ;;
esac

if [ -n "$problems" ]; then
  record "VERIFY_FAIL"
  # Exit 2 → Claude sees this and self-corrects, no human in the loop.
  printf '⚠️  Verification failed on %s. Fix before continuing:\n%b\n' "$file" "$problems" >&2
  exit 2
fi

record "VERIFY_OK"
exit 0
