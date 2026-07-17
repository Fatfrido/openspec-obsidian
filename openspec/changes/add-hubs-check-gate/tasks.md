---
type: tasks
change: add-hubs-check-gate
tags: [openspec, type/tasks, capability/check]
aliases: ["add-hubs-check-gate tasks"]
---

## 1. verifyHubs

- [ ] 1.1 Export `hubMarked` from `lib/hubs.mjs` (already used internally by `hubs()`'s stale-note cleanup) so `verifyHubs` can reuse it without duplicating the frontmatter scan — verify: `node --test test/hubs.test.mjs`
- [ ] 1.2 Add `export function verifyHubs(root = process.cwd())` to `lib/hubs.mjs`: scan `openspec/changes/*.md` for `type: hub` frontmatter via `hubMarked`; return immediately if none found; otherwise recompute via `collectHubs`/`renderHub` and throw `HubsError` (naming the note and the `openspec-obsidian hubs` / `npm run opsx:hubs` remedy) on a missing hub note for an active change, a content mismatch after `\r\n`→`\n` normalization, or an orphaned hub-marked note with no matching change directory; writes nothing — verify: `node --test test/hubs.test.mjs`

## 2. Wire into check

- [ ] 2.1 In `lib/archive.mjs`, import `verifyHubs` from `./hubs.mjs` and call it in `check()` immediately after the existing `verifyDashboard(root)` call, so a thrown `HubsError` propagates with the same exit-1 handling `bin/cli.mjs` already applies to known error classes — verify: `npm test`

## 3. Tests

- [ ] 3.1 Add to `test/hubs.test.mjs`: no hub notes present → `verifyHubs` returns without throwing and without evaluating any change — verify: `node --test test/hubs.test.mjs`
- [ ] 3.2 Add: a fixture with one fresh hub note whose source `tasks.md` checkbox is flipped after generation → `verifyHubs` throws `HubsError` naming the stale note and the remedy — verify: `node --test test/hubs.test.mjs`
- [ ] 3.3 Add: two active changes, only one has a hub note → `verifyHubs` throws `HubsError` naming the change missing its note — verify: `node --test test/hubs.test.mjs`
- [ ] 3.4 Add: a `type: hub` note at `openspec/changes/<id>.md` whose `openspec/changes/<id>/` directory does not exist → `verifyHubs` throws `HubsError` naming the orphaned note — verify: `node --test test/hubs.test.mjs`

## 4. Docs

- [ ] 4.1 Add a note to the README `hubs` section: once any hub note exists, `check` fails on drift (missing, stale, or orphaned) with the exact remedy command — verify: `grep -qi "check" README.md`

## 5. Validate

- [ ] 5.1 Validate the change artifacts — verify: `npm run opsx:validate`
