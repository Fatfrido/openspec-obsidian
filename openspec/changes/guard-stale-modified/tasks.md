---
type: tasks
change: guard-stale-modified
tags: [openspec, type/tasks, capability/archive]
aliases: ["guard-stale-modified tasks"]
---

## 1. Guard implementation

- [ ] 1.1 Add exported `scenarioHeadings(lines)` to `lib/archive.mjs`: return the trimmed `#### Scenario:` heading text found in `lines`, in document order — verify: `npm test`
- [ ] 1.2 In `applyOps`'s `MODIFIED` branch, before `blocks[i] = nb`, compare `scenarioHeadings(blocks[i].lines)` against `scenarioHeadings(nb.lines)`; if any live heading is missing from the incoming set, throw `ArchiveError` naming the change id, capability, requirement heading, and the missing scenario heading(s), plus the re-copy guidance — verify: `npm test`

## 2. Test coverage

- [ ] 2.1 Add `test/archive.test.mjs` cases for: a stale `MODIFIED` block (live has a scenario the delta lacks) throwing `ArchiveError` naming the missing scenario; a `MODIFIED` block carrying every live scenario (plus edits and new scenarios) syncing successfully; and a `## REMOVED Requirements` followed by `## ADDED Requirements` for the same requirement in one delta performing the intentional removal without throwing — verify: `node --test test/archive.test.mjs`
- [ ] 2.2 Add a test asserting the abort-before-move property: a two-change fixture where the second change's delta is stale MODIFIED SHALL throw and leave both change directories in place (neither moved to `changes/archive/`) — verify: `node --test test/archive.test.mjs`

## 3. Documentation

- [ ] 3.1 Document the split-op escape hatch (`## REMOVED Requirements` then `## ADDED Requirements` for the same requirement, in one delta) under the README "The conventions" section — verify: `node -e "if(!require('fs').readFileSync('README.md','utf8').includes('REMOVED Requirements')) process.exit(1)"`

## 4. Validation

- [ ] 4.1 Validate the authored artifacts — verify: `npm run opsx:validate`
