---
description: Run a feature autonomously through Spec → Plan → Work → Review → Release, escalating only genuine one-way-door decisions. Human review happens on the PR, not mid-flight.
argument-hint: <short description of the feature or the Linear/Jira ticket id>
---

Drive the change "$ARGUMENTS" through Plank's harness loop **autonomously**. The goal is a reviewable PR, not a series of approval prompts. Do not stop for human sign-off except on 🔴 one-way-door decisions (see the planner's escalation tiers).

**01–02 · Spec + Plan.** Delegate to the `planner` subagent. It resolves unknowns from `MEMORY.md`/`CLAUDE.md`, then codebase precedent, then staff-level judgment — recording 🟡 decisions as assumptions. If the code is unfamiliar, send the `explorer` first.
- **If the planner raises 🔴 escalations:** surface ONLY those to me, each with a recommended option and the default you'll take otherwise. Proceed on every non-blocked slice meanwhile.
- **If there are no 🔴 escalations:** proceed directly to Work. Do not ask me to approve the plan.

**03 · Work.** For each slice, delegate to the `implementer`. One slice at a time, TDD on critical paths. The post-tool hook self-verifies each edit; fix what it flags. Don't expand scope — note adjacent work back to the plan.

**04 · Review — cross-tool by default.** Whoever authored the change does **not** review it. Prefer the *complementary tool* as the independent reviewer: if the `codex` plugin is installed (`/codex:setup` → `ready: true`), route the branch diff to Codex — a different model catches blind spots a same-model self-review shares. If Codex isn't installed, delegate to the `reviewer` subagent (Claude reviewing Claude) and note that the review was same-model. Either way the reviewer re-runs the tests, tries to refute the change, and explicitly challenges the planner's 🟡 assumptions. This adversarial cross-tool review is what replaces a synchronous human plan-gate.

Drive the loop — **converge by severity, not zero findings:**
- Fix **only BLOCKING** findings (correctness / security / data-loss / broken contract / regression / unmet acceptance criterion). Record NITs (style, naming, optional refactors); never loop on them.
- After each fix, re-run the green-light (tests + lint + typecheck), then re-review.
- Bound the loop at **`REVIEW_MAX_ROUNDS`** (default 3): converged within the cap → proceed to Release; cap hit still blocking → **escalate, do not merge.**
- **Fail closed:** if the reviewer can't run or returns no parseable verdict, escalate — never substitute a silent self-review.

**05 · Release.** Once the reviewer approves:
- Run the full test + lint + typecheck suite from `CLAUDE.md`.
- Generate a walkthrough with `/walkthrough`.
- Append any 🟡 decisions and lessons to `MEMORY.md`.
- Open a PR (this is the one human touchpoint — permissions reserve `git push`/`gh pr create` for an OK). The PR body must include: the spec, the **Assumptions/decisions log**, what changed, and how it was verified — so a human reviews the *outcome* asynchronously in minutes.

Report at the end: what shipped, every 🟡 decision made, and any 🔴 item still awaiting my input.
