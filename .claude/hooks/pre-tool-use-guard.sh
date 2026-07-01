#!/usr/bin/env bash
#
# Layer 4 — PreToolUse guard.
# Runs BEFORE every Bash tool call. Reads the tool call as JSON on stdin.
# Exit 0 = allow. Exit 2 = HARD BLOCK (stderr is shown to Claude as the reason).
#
# This is enforcement the model cannot bypass — unlike a CLAUDE.md "please don't",
# a confident agent literally cannot run a blocked command.
#
# Wired up in .claude/settings.json under hooks.PreToolUse (matcher "Bash").
# Docs: https://docs.claude.com/en/docs/claude-code/hooks
#
# TAILOR the BLOCKLIST below to YOUR infra (prod DB hosts, cloud accounts, etc.).

set -euo pipefail

# --- read the command being run ------------------------------------------------
payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"

# Nothing to inspect (non-Bash or malformed) → allow; other guards/permissions apply.
[ -z "$cmd" ] && exit 0

block() {
  # Exit 2 tells Claude Code to block the call and surface this message.
  echo "🚫 BLOCKED by harness pre-tool guard: $1" >&2
  echo "   Command: $cmd" >&2
  echo "   If this is genuinely needed, do it manually outside the agent." >&2
  exit 2
}

# --- 1. Destructive git / filesystem ------------------------------------------
case "$cmd" in
  *"git push --force"*|*"git push -f"*)        block "force-push can clobber shared history" ;;
  *"git reset --hard"*)                        block "hard reset destroys uncommitted work" ;;
  *"rm -rf /"*|*"rm -rf ~"*|*"rm -rf ."*)      block "recursive force-delete of a broad path" ;;
  *":(){:|:&};:"*)                             block "fork bomb" ;;
esac

# --- 2. Production reach (EDIT THESE for your infra) ---------------------------
# This is a browser-only static app: NO database, NO backend, NO cloud infra.
# Its ONLY production reach is the Vercel deploy triggered by a push to main.
# Block direct production deploys from the agent — ship via the normal git flow.
case "$cmd" in
  *"vercel --prod"*|*"vercel deploy --prod"*)      block "Vercel production deploy — ship via push to main, reviewed" ;;
  *"vercel promote"*)                              block "Vercel promote — production promotion needs human sign-off" ;;
esac
# (Generic data-store guards kept as a safety net even though this repo has none.)
case "$cmd" in
  *"DROP TABLE"*|*"DROP DATABASE"*|*"TRUNCATE"*)   block "destructive SQL DDL" ;;
  *"terraform apply"*)                             block "terraform apply — infra changes need human sign-off" ;;
  *"kubectl"*"delete"*)                            block "kubectl delete" ;;
esac

# --- 3. Secret exfiltration ----------------------------------------------------
case "$cmd" in
  *"cat "*".env"*|*"cat "*"id_rsa"*|*"cat "*".pem"*)   block "reading a secret file via shell (use deny-list paths)" ;;
  *"curl"*"| sh"*|*"wget"*"| sh"*|*"curl"*"| bash"*)   block "piping a remote script straight into a shell" ;;
esac

# --- 4. (Optional) TDD gate on critical paths ---------------------------------
# Uncomment to refuse edits to critical dirs unless a test file changed first.
# Implement the project-specific check in post-tool-use-verify.sh instead if it
# needs to inspect the working tree.

exit 0
