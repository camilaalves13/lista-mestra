---
description: Generate a self-contained HTML flash-session walkthrough of a change, for a 60-second team alignment.
argument-hint: (optional) what the walkthrough should cover, defaults to the current branch diff
---

Produce a single self-contained `walkthrough.html` explaining ${ARGUMENTS:-the changes on the current branch} for a quick flash session — the goal is for a teammate to understand the decision and the change in under a minute, with **no meeting**.

Steps:
1. Gather the material: `git diff --stat main...HEAD`, the key diffs, and the spec/plan if one exists in the branch.
2. Start from `.claude/walkthrough.html` as the base. Keep it **one file, no external assets** (inline CSS, inline SVG) so it opens anywhere and pastes into Slack/Notion.
3. Fill the slides:
   - **What & why** — the outcome in one sentence + the problem it solves.
   - **The decision** — the key architectural/design choice and the alternative we rejected (the "so you don't have to read the arch doc" slide).
   - **What changed** — the 3–5 files/areas that matter, as `file:line`, with a one-line each.
   - **How it was verified** — tests, the reviewer's verdict.
   - **Risk / watch-out** — anything to monitor after release.
4. Keep it skimmable: short bullets, one idea per slide, arrow-key navigation already wired in the template.
5. Save it next to the change (e.g. `./walkthrough.html` or `docs/walkthroughs/<feature>.html`) and tell me the path.

This is the Release-stage evidence artifact. Favor clarity over completeness — it's a flash session, not documentation.
