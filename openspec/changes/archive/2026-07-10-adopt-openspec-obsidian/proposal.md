---
type: proposal
title: "adopt-openspec-obsidian proposal"
change: adopt-openspec-obsidian
tags: [openspec, type/proposal, capability/init, capability/backfill, capability/archive, capability/check]
aliases: ["adopt-openspec-obsidian proposal"]
design: "[[changes/archive/2026-07-10-adopt-openspec-obsidian/design|adopt-openspec-obsidian design]]"
tasks: "[[changes/archive/2026-07-10-adopt-openspec-obsidian/tasks|adopt-openspec-obsidian tasks]]"
specs: ["[[changes/archive/2026-07-10-adopt-openspec-obsidian/specs/init/spec|adopt-openspec-obsidian init delta]]", "[[changes/archive/2026-07-10-adopt-openspec-obsidian/specs/backfill/spec|adopt-openspec-obsidian backfill delta]]", "[[changes/archive/2026-07-10-adopt-openspec-obsidian/specs/archive/spec|adopt-openspec-obsidian archive delta]]", "[[changes/archive/2026-07-10-adopt-openspec-obsidian/specs/check/spec|adopt-openspec-obsidian check delta]]"]
---

## Why

openspec-obsidian installs Obsidian-vault conventions onto OpenSpec artifacts, yet its own repository shipped without any OpenSpec specs of its own. Adopting the tool here makes the repository dogfood the exact conventions it installs and serve as a worked, navigable example for anyone evaluating it.

## What Changes

- Bootstrap OpenSpec (`openspec init`) and run `openspec-obsidian init` to install the Obsidian-aware schema, templates, and authoring rules.
- Document the CLI's existing behavior as four capability specs — `init`, `backfill`, `archive`, and `check` — authored through the full proposal → specs → design → tasks → archive workflow.
- Gate this repository's CI on `openspec validate --all --strict` and `openspec-obsidian check`.

## Capabilities

### New Capabilities
- `init`: install the Obsidian-aware schema, templates, and authoring rules into an OpenSpec repository.
- `backfill`: add Obsidian frontmatter to existing bare artifacts, idempotently and with link verification.
- `archive`: sync delta specs into the live specs and move all-tasks-complete changes, rewriting wikilinks.
- `check`: fail CI when a change is complete but still unarchived.

### Modified Capabilities
- _None — this is the one-time baseline adoption change (see design.md)._

## Impact

- New `openspec/` tree: `config.yaml`, `schemas/spec-driven/`, `specs/`, and this change (archived on completion).
- `.github/workflows/ci.yml`: adds a `specs` job gating on OpenSpec validation and the archive `check`.
- `README.md`: a note pointing readers at this repo as a worked example.
- `.gitignore`: `openspec/.obsidian/` (vault workspace stays untracked).
- No behavior change to `bin/`, `lib/`, or `assets/`.
