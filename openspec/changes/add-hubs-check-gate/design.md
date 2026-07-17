---
type: design
change: add-hubs-check-gate
tags: [openspec, type/design, capability/check]
aliases: ["add-hubs-check-gate design"]
---

## Context

`hubs` is opt-in by invocation only — there is no `features.hubs` toggle like `dashboard` has. `lib/dashboard.mjs` already solves the identical staleness problem for `openspec/dashboard.md` via `verifyDashboard(root)`, gated on `featureEnabled(root, "dashboard")` and called from `check()` in `lib/archive.mjs`. `lib/hubs.mjs` already exports the two pure primitives a mirror gate needs: `collectHubs(root)` (active changes + task progress + artifact links) and `renderHub(hub)` (deterministic note text), plus an internal `hubMarked(text)` frontmatter scan used by `hubs()`'s own stale-note cleanup.

## Goals / Non-Goals

**Goals:**
- A committed, drifted hub note fails CI the same way a drifted dashboard does.
- Adopters who never ran `hubs` see no behavior change and no new config surface.
- `check` stays read-only and its exit-code contract (0/1) is unchanged.

**Goals — no new toggle:** the gate's own presence check (`type: hub` frontmatter) replaces a `features.hubs` entry; `hubs` continuing to have no toggle is intentional and this change does not add one.

**Non-Goals:**
- Auto-regenerating or fixing hub notes from `check` — it only detects and reports, exactly like the dashboard gate.
- Any change to `hubs()`'s own write/cleanup behavior.
- A `features.hubs` toggle — self-detection replaces it by design.

## Decisions

- **Self-detection, not a feature toggle.** `verifyHubs` scans `openspec/changes/*.md` (top-level only, not `archive/`) for `type: hub` frontmatter using the existing `hubMarked` helper (exported for this use). Finding zero hub notes returns immediately — the gate is inert, matching "opt-in by invocation."
- **Recompute via existing pure exports.** `verifyHubs` calls `collectHubs(root)` then `renderHub` per active change — no new collection logic, so hub content and its staleness check can never diverge in interpretation.
- **Three failure modes, one error class.** `HubsError`, thrown on first violation found, in this order for determinism: (1) an active change with no `openspec/changes/<id>.md` hub note, (2) a hub note present but not byte-equal to the re-rendered output after `\r\n` → `\n` normalization (mirrors `verifyDashboard`'s `norm`), (3) a `type: hub` note whose `<id>` has no corresponding directory under `openspec/changes/` (orphan). Every message names the specific note and ends with the fixed remedy string: `` run `openspec-obsidian hubs` (or `npm run opsx:hubs`) and commit ``.
- **Call site and ordering.** `check()` calls `verifyDashboard(root)` then `verifyHubs(root)` — both read-only, both throwing before any write occurs elsewhere in `check()`; ordering only affects which error surfaces first when both are stale.
- **No new npm script required by the gate itself**, but `opsx:hubs` is referenced in remedy text and MUST already exist (or is added) in `package.json` so the guidance is runnable as printed.

## Risks / Trade-offs

- A repo that ran `hubs` once and later deletes all hub notes silently re-disables the gate (self-detection has no memory) — accepted, matches "opt-in by invocation" semantics exactly.
- Comparing `renderHub` output field-by-field would give more precise diffs than whole-note byte comparison, but whole-note comparison matches `verifyDashboard`'s precedent and keeps `verifyHubs` a small, obviously-correct function.
