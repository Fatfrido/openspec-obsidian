---
type: proposal
title: "add-openspec-dashboard proposal"
change: add-openspec-dashboard
tags: [openspec, type/proposal, capability/dashboard]
aliases: ["add-openspec-dashboard proposal"]
design: "[[changes/archive/2026-07-13-add-openspec-dashboard/design|add-openspec-dashboard design]]"
tasks: "[[changes/archive/2026-07-13-add-openspec-dashboard/tasks|add-openspec-dashboard tasks]]"
specs: ["[[changes/archive/2026-07-13-add-openspec-dashboard/specs/dashboard/spec|add-openspec-dashboard dashboard delta]]"]
---

## Why

The `openspec/` tree is browsable file-by-file, but there is no single overview of what is in flight — which changes are active, how far their tasks have progressed, what capabilities exist. Obsidian's native Bases plugin can group artifacts by frontmatter, but it cannot read task checkboxes or requirement bodies, so the most useful signals (progress, requirement counts, "ready to archive") are invisible without a generated summary.

## What Changes

- Add a new `openspec-obsidian dashboard` command that generates `openspec/dashboard.md`: a deterministic, wikilinked overview of active changes (with task progress and completeness), the capability catalog (with requirement counts), and archived history.
- Compute everything from the vault with the existing `fs` parsers (`walkMd`, `deriveArtifact`, `taskState`, spec-block parsing) — no OpenSpec CLI dependency, matching the CLI-free design of `archive`/`backfill`.
- Seed a companion `openspec/dashboard.base` (native Obsidian Bases view) for live filtering/sorting over artifact frontmatter, created only when absent (`--force` to overwrite).
- Both outputs live in the tracked vault body (`openspec/`), never in the gitignored `openspec/.obsidian/`.

## Capabilities

### New Capabilities
- `dashboard`: generate a tracked, navigable overview of the `openspec/` tree (changes, progress, capability catalog, archive) plus a companion Bases view, computed from the vault without the OpenSpec CLI.

### Modified Capabilities
- _None._

## Impact

- New `lib/dashboard.mjs` (pure exported helpers + `dashboard()`), dispatched from `bin/cli.mjs` (USAGE, exit codes); new `assets/dashboard.base`.
- New `test/dashboard.test.mjs` (golden + idempotency).
- `openspec/dashboard.md` + `openspec/dashboard.base` generated in this repo (dogfood).
- `.github/workflows/ci.yml`: regenerate the dashboard and fail if stale.
- `README.md` / `AGENTS.md`: document the command.
- No behavior change to `init`, `backfill`, `archive`, or `check`.
