---
description: Independent cross-tool review of the current branch — the *other* tool reviews the diff (Codex when installed, else the reviewer subagent), one pass, severity-tagged verdict.
argument-hint: (optional) a focus area, e.g. "security" or "the migration"
---

Review the changes on the current branch with **a different tool than the one that wrote them**. Independence is the entire point: a same-model self-review shares the author's blind spots; a different model doesn't. Focus: ${ARGUMENTS:-everything that changed}.

## Who reviews (whoever implemented does NOT review)
1. Show the diff scope first: `git diff --stat main...HEAD`.
2. **Prefer Codex as the independent reviewer.** If the `codex` plugin is installed, have Codex review the branch diff instead of Claude:
   - Confirm readiness (`/codex:setup`, or `codex-companion.mjs setup --json` → require `ready: true`).
   - Run the review (`/codex:review --base main`, or `codex-companion.mjs adversarial-review --wait --json --base main`). It returns a structured verdict — `approve` / `needs-attention` — with severity-tagged findings (`critical|high|medium|low`).
3. **Codex not installed → fall back to the `reviewer` subagent** (Claude reviewing Claude). This is allowed, but **say so explicitly** in the verdict — never present a same-model review as if it were cross-tool.

## Severity is what makes the verdict meaningful
Tag every finding, because only the blocking ones matter for a merge decision:
- **BLOCKING** — a correctness bug, a security or data-loss risk, a broken public contract/API, a regression, or an unmet acceptance criterion from the spec. (Codex `critical`/`high` are candidates; the definition wins over the raw label.)
- **NIT** — style, naming, formatting, subjective preference, optional refactors, doc wording, speculative "could also." (Codex `medium`/`low`.) **Record these; they never block.**

## Output
Return one verdict line — `VERDICT: APPROVED` (no BLOCKING findings) or `VERDICT: CHANGES_REQUESTED` (≥1 BLOCKING) — plus:
- **Reviewer:** which tool actually reviewed (`codex` / `claude-fallback`).
- **Blocking:** each as `file:line — what's wrong — what "good" looks like`.
- **Nits:** recorded, non-blocking.
- **Evidence:** tests re-run and whether they fail without the change.

The change against any spec in the branch, the `CLAUDE.md` "do not touch" list, and the `MEMORY.md` failure log is in scope for the reviewer.

**Fail closed.** If the chosen reviewer can't run, or returns no parseable verdict → **escalate, do not approve.** Never substitute a silent self-review for the cross-tool review.

Do not fix anything in this command — **review only**, one pass. The bounded fix → re-review → converge loop is driven by `/feature` (step 04). If you want fixes, run `/feature` or hand the findings to the implementer.
