---
type: tasks
change: add-change-hub-notes
tags: [openspec, type/tasks, capability/hubs]
aliases: ["add-change-hub-notes tasks"]
---

## 1. Hub generation

- [ ] 1.1 Add `lib/hubs.mjs` with `HubsError`, pure exported helpers (collect active changes with links and task progress; render a hub note), and `hubs(root, { dryRun })` writing `openspec/changes/<id>.md` per active change — verify: `node --test test/hubs.test.mjs`
- [ ] 1.2 Add golden + determinism tests: full-content golden for a hub note, byte-identical second run — verify: `node --test test/hubs.test.mjs`

## 2. Stale cleanup

- [ ] 2.1 Delete hub notes (`changes/*.md` with `type: hub` frontmatter) whose change directory no longer exists; preserve non-hub notes; `--dry-run` prints planned writes and removals without touching the vault — verify: `node --test test/hubs.test.mjs`

## 3. Wire up

- [ ] 3.1 Dispatch `hubs` in `bin/cli.mjs` (USAGE, `HubsError` in the known-error union, `--root`/`--dry-run`) and add the `opsx:hubs` npm script — verify: `node bin/cli.mjs hubs --dry-run` prints planned output and an unknown command still exits 2
- [ ] 3.2 Add inertness tests: `backfill` leaves a hub note byte-for-byte unchanged, and `dashboard` output is identical with and without hub notes present — verify: `node --test test/hubs.test.mjs`

## 4. Document

- [ ] 4.1 Document `hubs` (opt-in semantics, run-after-archive tip) and the graph color-groups tip in `README.md` and `AGENTS.md` — verify: `grep -q "hubs" README.md`
