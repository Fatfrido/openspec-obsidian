---
type: proposal
change: add-change-hub-notes
tags: [openspec, type/proposal, capability/hubs]
aliases: ["add-change-hub-notes proposal"]
design: "[[changes/add-change-hub-notes/design|add-change-hub-notes design]]"
tasks: "[[changes/add-change-hub-notes/tasks|add-change-hub-notes tasks]]"
specs: ["[[changes/add-change-hub-notes/specs/hubs/spec|add-change-hub-notes hubs delta]]"]
---

## Why

In Obsidian's graph every change renders as an anonymous cluster of identically-named nodes (`proposal`, `design`, `tasks`, `spec`) — nothing in the cluster carries the change's name, and there is no per-change landing page. A hub note whose filename IS the change id gives each cluster a natively-labeled anchor without renaming any OpenSpec artifact.

## What Changes

- Add an opt-in `openspec-obsidian hubs` command that writes one hub note per active change at `openspec/changes/<id>.md`: `type: hub` frontmatter, the change's task progress, and path wikilinks to its proposal, design, tasks, and delta specs.
- Rerunning `hubs` regenerates deterministically and deletes stale hub notes whose change directory is gone (archived or removed); `--dry-run` previews both.
- Strictly optional: hub notes exist only if the command is invoked — no other command creates them, and `backfill`, `dashboard`, `archive`, `check`, and the OpenSpec CLI all ignore them. Never run it and the vault contains no extra artifacts.
- Document the command and a graph color-groups tip (color by the existing `type/*` tags) in `README.md`.

## Capabilities

### New Capabilities

- `hubs`: generate a named per-change anchor note (links + task progress) for the Obsidian graph, with deterministic regeneration and stale-hub cleanup, computed from the vault filesystem without the OpenSpec CLI.

### Modified Capabilities

- _None._

## Impact

- New `lib/hubs.mjs` (pure exported helpers + `hubs()`), dispatched from `bin/cli.mjs` (USAGE, exit codes); new `test/hubs.test.mjs`; `opsx:hubs` npm script.
- `README.md` / `AGENTS.md`: document the command.
- No behavior change to `init`, `backfill`, `archive`, `check`, or `dashboard`; no CI gate (opt-in output, and this repo has zero active changes on `main`, so dogfooding generates nothing).
