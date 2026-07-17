---
type: proposal
change: guard-stale-modified
tags: [openspec, type/proposal, capability/archive]
aliases: ["guard-stale-modified proposal"]
design: "[[changes/guard-stale-modified/design|guard-stale-modified design]]"
tasks: "[[changes/guard-stale-modified/tasks|guard-stale-modified tasks]]"
specs: ["[[changes/guard-stale-modified/specs/archive/spec|guard-stale-modified archive delta]]"]
---

## Why

`applyOps` in `lib/archive.mjs` replaces a `MODIFIED` requirement block unconditionally: `blocks[i] = nb`. If change A archives first and adds a scenario to a requirement, change B's `MODIFIED` block — copied from the spec before A landed — silently deletes A's scenario the moment B syncs, because B's block never had it to begin with. The repo's own config rule already mandates that `MODIFIED` blocks restate the complete requirement (description plus every scenario, kept and changed alike); a block missing a live scenario is stale by definition and should be rejected, not merged. Upstream OpenSpec fixed exactly this class of bug in v1.6 ("Stale MODIFIED requirements stop instead of silently deleting scenarios added by an earlier archive"). This change closes the same gap here.

## What Changes

- Add a pure exported helper `scenarioHeadings(lines)` to `lib/archive.mjs` that collects trimmed `#### Scenario:` heading text from a requirement block.
- At sync time, before applying a `MODIFIED` op, compare the live requirement's scenario headings against the incoming block's: any live heading absent from the incoming block throws `ArchiveError` naming the change id, capability, requirement, and the missing scenario headings, with guidance to re-copy the current requirement block from `openspec/specs/<cap>/spec.md` and re-apply edits. This preserves the existing all-or-nothing ordering — the guard fires before any change directory moves.
- Document the intentional-removal escape hatch (author `## REMOVED Requirements` followed by `## ADDED Requirements` for the same requirement in one delta) in the error guidance and in the README conventions section.

## Capabilities

### New Capabilities

- _None._

### Modified Capabilities

- `archive`: this delta only ADDs a requirement (`Refuse stale MODIFIED requirements`); no existing `archive` requirement is restated or changed.

## Impact

- Modified: `lib/archive.mjs` (new helper + guard in `applyOps`), `test/archive.test.mjs` (new coverage), `README.md` (conventions section documents the escape hatch).
- No CLI, schema, or asset changes; behavior change is additive-restrictive (previously-silent data loss now throws).
