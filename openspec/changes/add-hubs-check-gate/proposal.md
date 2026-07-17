---
type: proposal
change: add-hubs-check-gate
tags: [openspec, type/proposal, capability/check]
aliases: ["add-hubs-check-gate proposal"]
design: "[[changes/add-hubs-check-gate/design|add-hubs-check-gate design]]"
tasks: "[[changes/add-hubs-check-gate/tasks|add-hubs-check-gate tasks]]"
specs: ["[[changes/add-hubs-check-gate/specs/check/spec|add-hubs-check-gate check delta]]"]
---

## Why

`hubs` writes one `openspec/changes/<id>.md` note per active change, baking in task progress and artifact links. Nothing recomputes it after a checkbox flips, so a committed hub note silently drifts from the tasks it summarizes. `check` — the CI gate — already catches this exact failure mode for the dashboard (`verifyDashboard`), but never looks at hub notes: adopters who ran `hubs` once get a permanently stale landing page and no signal. Because `hubs` has no feature toggle, the gate must detect its own applicability rather than read a config flag.

## What Changes

- New read-only export `verifyHubs(root)` in `lib/hubs.mjs`, mirroring `verifyDashboard`'s shape: self-scoped, throws on drift, writes nothing.
- Self-detection: the gate engages iff at least one `openspec/changes/*.md` file carries `type: hub` frontmatter (reusing the existing `hubMarked` scan). Zero hub notes leaves the gate inert, so adopters who never invoked `hubs` are unaffected.
- When engaged, `verifyHubs` recomputes hub state via the existing pure `collectHubs`/`renderHub` and throws `HubsError` when: an active change has no hub note, a hub note's content differs from the freshly rendered output after newline normalization, or a hub-marked note exists for a change directory that no longer exists. Every failure names the offending note and the remedy: run `openspec-obsidian hubs` (or `npm run opsx:hubs`) and commit.
- `check()` in `lib/archive.mjs` calls `verifyHubs(root)` immediately after `verifyDashboard(root)`, so the CI gate stays a single call with unchanged exit code semantics (1 via the thrown error class).

## Capabilities

### Modified Capabilities

- `check`: delta only ADDs one requirement (hub-note staleness gate); no existing `check` requirement changes.

## Impact

- Modified: `lib/hubs.mjs` (new `verifyHubs` export), `lib/archive.mjs` (`check()` wiring), `test/hubs.test.mjs` (four new scenarios), `README.md` (note that `check` gates hub staleness once hub notes exist).
- No new files, no feature toggle, no CLI surface change — `check` remains a single command with the same non-zero exit contract.
