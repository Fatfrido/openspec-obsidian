---
type: proposal
change: add-feature-toggles
tags: [openspec, type/proposal, capability/features, capability/dashboard, capability/check, capability/init]
aliases: ["add-feature-toggles proposal"]
design: "[[changes/archive/2026-07-13-add-feature-toggles/design|add-feature-toggles design]]"
tasks: "[[changes/archive/2026-07-13-add-feature-toggles/tasks|add-feature-toggles tasks]]"
specs: ["[[changes/archive/2026-07-13-add-feature-toggles/specs/features/spec|add-feature-toggles features delta]]", "[[changes/archive/2026-07-13-add-feature-toggles/specs/dashboard/spec|add-feature-toggles dashboard delta]]", "[[changes/archive/2026-07-13-add-feature-toggles/specs/check/spec|add-feature-toggles check delta]]", "[[changes/archive/2026-07-13-add-feature-toggles/specs/init/spec|add-feature-toggles init delta]]"]
---

## Why

The dashboard is wired unconditionally into the lifecycle recipes: the README CI snippet regenerates it and diffs for drift, and the apply flow refreshes it after every archive. An adopter who does not want a generated dashboard has no first-class way to say so, and every future optional feature would face the same problem. Detecting enablement from generated artifacts alone was rejected because upcoming features may not produce a sentinel artifact, so the tool needs an explicit, config-driven toggle that every consumer (CLI commands, CI gate, agent skills) reads as the single source of truth.

## What Changes

- New tool-owned config file `openspec/obsidian.yaml` holding a `features:` map of booleans, read by a new `lib/features.mjs` with a zero-dependency hand-rolled parser. Absent file, absent key, or unlisted feature means disabled; optional features are opt-in.
- `dashboard` refuses to run when the `dashboard` feature is disabled, with an error naming the exact setting to add.
- `check` gains a dashboard-staleness gate when the feature is enabled (regenerate in memory, compare newline-normalized; stays read-only), so an adopter's CI collapses to just `check`.
- `init` seeds `openspec/obsidian.yaml` with all optional features off when the file is absent; it never overwrites an existing one.
- This repo dogfoods the result: commits its own toggle file with `dashboard: true` and drops the two dashboard steps from `ci.yml`.

## Capabilities

### New Capabilities
- `features`: reading optional-feature toggles from the tool-owned `openspec/obsidian.yaml` — parse rules, defaults, error behavior, and the guarantee that core commands are never gated.

### Modified Capabilities
- `dashboard`: gated on the `dashboard` toggle; disabled is an actionable error.
- `check`: enforces dashboard freshness only when the feature is enabled.
- `init`: seeds the toggle file when absent.

## Impact

- Code: `lib/features.mjs` (new), `lib/dashboard.mjs`, `lib/init.mjs`, `bin/cli.mjs` (check dispatch + usage text), `assets/obsidian.yaml` (new seed).
- Tests: new `test/features.test.mjs` and `test/init.test.mjs`; extended `test/dashboard.test.mjs`.
- Repo: `.github/workflows/ci.yml`, `openspec/obsidian.yaml`, `README.md`, `AGENTS.md`.
- Migration: existing dashboard users must add `features:` with `dashboard: true` (documented in README).
