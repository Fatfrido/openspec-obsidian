---
type: design
title: "add-feature-toggles design"
change: add-feature-toggles
tags: [openspec, type/design, capability/features, capability/dashboard, capability/check, capability/init]
aliases: ["add-feature-toggles design"]
---

## Context

The dashboard command (merged via add-openspec-dashboard) participates unconditionally in the CI recipe and the apply flow. The user requires optionality for the dashboard and for future features, explicitly including features that produce no artifact — so enablement must come from configuration, not from artifact presence.

## Goals / Non-Goals

**Goals:**
- One explicit, config-driven enablement signal readable by CLI commands, CI, and agent skills.
- Optional features are opt-in (default off); enabling is a one-line edit.
- Adopter CI stays a single command: `check` enforces whatever is enabled.

**Non-Goals:**
- Gating core commands (`init`, `backfill`, `archive`, `check`) — they are the product, not features.
- `archive` auto-refreshing the dashboard (would add a side effect beyond sync+move; separate change if ever wanted).
- Per-feature sub-options; the format merely leaves room for them.

## Decisions

- **Separate tool-owned file `openspec/obsidian.yaml`, not a block in `openspec/config.yaml`.** Empirically, OpenSpec 1.4.1 tolerates a foreign top-level key in config.yaml (validate --all --strict, list --json, status --json all pass with an appended block), but forward compatibility of OpenSpec's parser is outside our control and our reader would have to parse a block embedded in a file whose surrounding content we do not own. Owning the whole file makes the zero-dependency parser trivial and removes the coupling permanently. `walkMd` collects only `.md`, so the file is invisible to backfill, archive, and dashboard.
- **Format: top-level `features:` map of booleans** (`dashboard: true`). Explicit disable reads better than a presence list, and a future feature can nest options without breaking the parser. Absent file, absent `features:` key, or unlisted name = disabled. Unknown names are ignored (a newer config must not break an older tool). A line under `features:` that is not `name: true|false` throws `FeaturesError` naming the file — silent misconfiguration would read as "mysteriously off".
- **New `lib/features.mjs`** exporting `FeaturesError`, `readFeatures(root)`, and `featureEnabled(root, name)` for direct unit testing. Cross-module imports are established convention (dashboard.mjs already imports from archive.mjs and backfill.mjs).
- **`dashboard` throws when disabled** instead of silently no-opping: one source of truth, no toggle/artifact drift, and the error names the exact fix (`features:` with `dashboard: true` in `openspec/obsidian.yaml`).
- **Staleness gate lives in `dashboard.mjs` as `verifyDashboard(root)`**, and the `check` CLI command calls `check(root)` then `verifyDashboard(root)`. Putting the gate inside `archive.check()` would create an ESM import cycle (archive -> dashboard -> archive); composing the two gates in `bin/cli.mjs` keeps modules acyclic at the cost of relaxing the "one lib call per command" convention for `check` only. Comparison is newline-normalized (CRLF checkouts) against in-memory `renderDashboard` output; `dashboard.base` is excluded because it is seeded once and user-owned afterwards. `verifyDashboard` writes nothing, so `check` stays read-only.
- **`init` seeds `assets/obsidian.yaml` -> `openspec/obsidian.yaml` only when absent, and never overwrites — not even with `--force`.** The file records the adopter's choices; it is configuration, not reinstallable scaffolding like schema/templates.

## Risks / Trade-offs

- **Breaking for existing dashboard users**: after upgrading, `dashboard` errors until they add the toggle. Acceptable pre-1.0; README carries a migration note and the error message is the instruction.
- One more file in the vault directory; mitigated by init seeding it and README documenting it.
- The hand-rolled parser accepts only the shapes we document; anything fancier (anchors, nesting under a feature) is a hard error by design.
