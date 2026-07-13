---
type: tasks
title: "add-openspec-dashboard tasks"
change: add-openspec-dashboard
tags: [openspec, type/tasks, capability/dashboard]
aliases: ["add-openspec-dashboard tasks"]
---

## 1. Overview note

- [x] 1.1 Add `lib/dashboard.mjs` with pure exported helpers (`collectChanges`, `collectSpecs`, `renderDashboard`) reusing `walkMd` / `deriveArtifact` / `taskState` and spec-block parsing — verify: `node --test test/dashboard.test.mjs`
- [x] 1.2 Implement `dashboard(root, { dryRun, force })` writing `openspec/dashboard.md` deterministically and idempotently — verify: golden + byte-identical-rerun assertions in `node --test test/dashboard.test.mjs`
- [x] 1.3 Wire `dashboard` into `bin/cli.mjs` (dispatch, USAGE, exit codes; `--root`, `--dry-run`, `--force`) — verify: `node bin/cli.mjs dashboard --dry-run` prints planned output and an unknown command exits 2

## 2. Bases view

- [x] 2.1 Add `assets/dashboard.base` and seed it from the command when absent, respecting `--force` — verify: `node --test test/dashboard.test.mjs` covers created-when-absent and preserved-without-force

## 3. Integrate

- [x] 3.1 Regenerate this repo's dashboard and gate CI on staleness — verify: `node bin/cli.mjs dashboard` then `git diff --exit-code openspec/dashboard.md openspec/dashboard.base`
- [x] 3.2 Document the command in `README.md` and `AGENTS.md` — verify: `grep -q "dashboard" README.md`
