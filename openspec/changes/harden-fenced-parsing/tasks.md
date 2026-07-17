---
type: tasks
change: harden-fenced-parsing
tags: [openspec, type/tasks, capability/archive]
aliases: ["harden-fenced-parsing tasks"]
---

## 1. Fence-aware parsing

- [ ] 1.1 Add pure exported `fenceMask(lines)` to `lib/archive.mjs`: per-line boolean array, CommonMark-basic fenced-code detection (`>=3` backtick or tilde opener with up to 3 leading spaces, same-character closer with `>=` mark count, unclosed fence masks to EOF) — verify: `npm test`
- [ ] 1.2 Wire `fenceMask` into `parseDelta` (section-header regex skips masked lines), `parseBlocks` (block-splitting skips masked lines, carries them into the open block verbatim), `parseSpec` (`## Requirements` head search skips masked lines), and `parseRenames` (FROM/TO matching skips masked lines) — verify: `npm test`

## 2. Regression coverage

- [ ] 2.1 Add scenarios to `test/archive.test.mjs`: a fenced `### Requirement:` line inside a scenario body stays part of the enclosing block; a fenced `## MODIFIED Requirements` line is not treated as a delta section header; tilde fences (`~~~`) behave like backtick fences; an unclosed fence makes the remainder of the file opaque to structural parsing — verify: `node --test test/archive.test.mjs`
- [ ] 2.2 Add a golden fixture test: archive a delta spec containing a fenced markdown example through the full sync path and assert the fenced block's bytes are identical before and after — verify: `node --test test/archive.test.mjs`

## 3. Validate

- [ ] 3.1 Validate the new change artifacts — verify: `npm run opsx:validate`
