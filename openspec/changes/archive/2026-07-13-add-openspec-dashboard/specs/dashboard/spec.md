---
type: spec-delta
title: "add-openspec-dashboard dashboard delta"
change: add-openspec-dashboard
capability: dashboard
tags: [openspec, type/spec, capability/dashboard]
aliases: ["add-openspec-dashboard dashboard delta"]
main_spec: "[[specs/dashboard/spec|dashboard spec]]"
---

## ADDED Requirements

### Requirement: Generate a navigable overview of the openspec tree
The `dashboard` command SHALL write `openspec/dashboard.md` — a deterministic, idempotent overview that lists every active change with its task progress and completeness, the capability catalog with per-spec requirement counts, and archived changes — using path wikilinks so the note is navigable in Obsidian and feeds the graph, and it MUST compute all data from the vault filesystem without invoking the OpenSpec CLI.

#### Scenario: Active change reported with task progress
- **WHEN** an active change under `openspec/changes/` has some tasks checked and some unchecked
- **THEN** `dashboard` lists the change with its completed-over-total task count and a path wikilink to its proposal

#### Scenario: Regeneration is byte-identical
- **WHEN** `dashboard` runs twice with no intervening change to the vault
- **THEN** the second run produces a byte-identical `openspec/dashboard.md`

#### Scenario: Output stays in the tracked vault body
- **WHEN** `dashboard` writes its output
- **THEN** it writes to `openspec/dashboard.md` and never under the gitignored `openspec/.obsidian/`

### Requirement: Seed a companion Bases view
The `dashboard` command SHALL create `openspec/dashboard.base`, a native Obsidian Bases view over the artifact frontmatter, when that file is absent, and MUST NOT overwrite an existing `openspec/dashboard.base` unless `--force` is given.

#### Scenario: Base view seeded when absent
- **WHEN** `dashboard` runs and `openspec/dashboard.base` does not exist
- **THEN** it writes `openspec/dashboard.base` and logs the write

#### Scenario: Existing base view preserved
- **WHEN** `openspec/dashboard.base` already exists and `--force` is not given
- **THEN** `dashboard` leaves the file unchanged and logs a skip
