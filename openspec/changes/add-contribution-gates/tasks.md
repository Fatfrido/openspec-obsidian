---
type: tasks
change: add-contribution-gates
tags: [openspec, type/tasks, capability/contributing]
aliases: ["add-contribution-gates tasks"]
---

## 1. Docs gate

- [ ] 1.1 Add `.github/scripts/docs-gate.mjs`: pure exported `evaluateGate({title, body, labels, changedFiles})` returning violations (Conventional Commit title lint; `feat` requires `README.md` unless `docs:none`; `!` marker, `BREAKING CHANGE` footer, or `assets/` path requires `UPGRADING.md` unless `migration:auto`) plus an entry point reading `PR_TITLE`/`PR_BODY`/`PR_LABELS`/`CHANGED_FILES` env that exits non-zero listing violations — verify: `node --test test/docs-gate.test.mjs`
- [ ] 1.2 Add `test/docs-gate.test.mjs` covering the matrix: each trigger passing and failing, each escape label, title lint accept/reject, and the entry-point exit behavior — verify: `npm test`

## 2. CI wiring

- [ ] 2.1 Add a `docs` job to `.github/workflows/ci.yml` (pull-request events only, full-depth checkout) that feeds the script `github.event.pull_request` title/body/labels and `git diff --name-only origin/main...HEAD`, and extend the `pull_request` trigger with `types: [opened, edited, synchronize, reopened, labeled, unlabeled]` — verify: `PR_TITLE='feat: x' CHANGED_FILES='lib/a.mjs' node .github/scripts/docs-gate.mjs` exits 1 and the same with `CHANGED_FILES='README.md'` exits 0

## 3. Contributor and upgrade docs

- [ ] 3.1 Add `CONTRIBUTING.md`: environment (Node >= 20, npm, zero deps, no build/lint), `npm test`, `npm i -g @fission-ai/openspec@1.4.1` for local validate, six-bullet change lifecycle linking `AGENTS.md`, the CI gate table with escape labels and local pre-flight commands, and a pointer to `.claude/commands/opsx/` for agent users — verify: `grep -q "openspec@1.4.1" CONTRIBUTING.md && grep -q "docs:none" CONTRIBUTING.md`
- [ ] 3.2 Add `UPGRADING.md` seeded with the entry convention (one `##` section per change, newest first, imperative adopter instructions, version stamped at release) — verify: `grep -qi "upgrade" UPGRADING.md`
- [ ] 3.3 Slim the README contributing section to a link to `CONTRIBUTING.md` and link `UPGRADING.md` from the adoption section — verify: `grep -q "CONTRIBUTING.md" README.md && grep -q "UPGRADING.md" README.md`

## 4. Triage plumbing

- [ ] 4.1 Add the "Docs & compatibility" section to `.github/pull_request_template.md`: docs-updated checkbox and breaking-change triage line (none / automatic via named command / manual with `UPGRADING.md` entry) — verify: `grep -q "Docs & compatibility" .github/pull_request_template.md`
- [ ] 4.2 Extend `openspec/config.yaml` rules: proposal breaking-change triage + documentation impact, design prefer-automatic-migration, tasks name affected adopter surfaces — verify: `npm run opsx:validate`
