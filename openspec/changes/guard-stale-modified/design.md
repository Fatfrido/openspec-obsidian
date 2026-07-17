---
type: design
change: guard-stale-modified
tags: [openspec, type/design, capability/archive]
aliases: ["guard-stale-modified design"]
---

## Context

`applyOps(blocks, sections, ctx)` in `lib/archive.mjs` handles the `MODIFIED` op by locating the live block via `find(nb.heading)` and then doing `blocks[i] = nb` unconditionally (line ~178) — the incoming delta block wins outright, regardless of what the live block currently contains. When two changes touch the same requirement and archive in sequence, the second change's delta was authored (and copied into its `changes/<id>/specs/<cap>/spec.md`) before the first change's edit landed in `openspec/specs/<cap>/spec.md`. The second change's whole-block replacement then drops whatever the first change added, with no error — exactly the bug upstream OpenSpec fixed in v1.6.

## Goals / Non-Goals

**Goals:**
- Detect a stale `MODIFIED` block — one missing a scenario the live requirement already has — before any data is overwritten, and abort the whole sync (no change directory moves) with a message that tells the author exactly what to do.
- Keep the fix a pure, unit-testable function addition; no change to `parseDelta`/`parseBlocks` structure.
- Preserve a way to intentionally remove a scenario without tripping the guard.

**Non-Goals:**
- Detecting staleness in `ADDED`/`REMOVED`/`RENAMED` ops — only `MODIFIED` silently drops data via whole-block replacement.
- Semantic diffing of scenario bodies (WHEN/THEN/AND lines) — only heading presence is checked; a scenario whose body changed is a normal, allowed edit.
- Fence-aware parsing of `#### Scenario:` headings — out of scope for this change; `parseBlocks` already treats any `#### `/`### ` line as structure, and this guard reuses that structure as-is.

## Decisions

- **Guard rule: scenario-heading superset.** For each `MODIFIED` block, compute `scenarioHeadings(liveBlock.lines)` and `scenarioHeadings(nb.lines)` (both trimmed `#### Scenario:` text, in document order). If any live heading is absent from the incoming set, throw `ArchiveError` before assigning `blocks[i] = nb`, naming the change id, capability, requirement heading, and the missing scenario heading(s) verbatim, plus: "re-copy the current requirement block from openspec/specs/<cap>/spec.md into the delta and re-apply your edits". A rename is indistinguishable from a removal-plus-addition under this rule and is intentionally treated as removal — the "add a stale-refresh checkpoint" outcome is the desired workflow, not a false positive to special-case.
- **New helper, not inline logic.** `scenarioHeadings(lines)` is exported from `lib/archive.mjs` alongside `parseBlocks`/`applyOps` so it is directly unit-testable (list in, list out) without constructing fixture change directories.
- **Escape hatch: split the op.** A delta that legitimately drops a scenario authors `## REMOVED Requirements` (the full current block, satisfying the guard trivially since REMOVED is unconditional) followed by `## ADDED Requirements` re-adding the requirement with the scenario omitted — `parseDelta`/`applyOps` already apply sections in document order, so no parser change is needed. Documented in the `ArchiveError` guidance and the README conventions section.
- **Guard runs entirely inside the existing sync-before-move phase.** `applyOps` already runs for every complete change before any `fs.renameSync` (see `check`'s existing "Sync aborts before any move on error" behavior); the new throw is just another `ArchiveError` in that same phase, so no ordering change is needed to keep the all-or-nothing guarantee.

## Risks / Trade-offs

- A legitimate concurrent edit to the *same* scenario body (not heading) from two different changes is still silently last-write-wins — accepted, matches upstream's scope (heading presence only).
- Authors hitting the guard must learn the split-op escape hatch; mitigated by spelling it out in the error message itself, not just docs.
- Slightly more restrictive than before: some previously-succeeding archives will now fail until the delta is refreshed — this is the intended behavior change (silent data loss to loud stop).
