---
type: spec
title: "hubs spec"
capability: hubs
tags: [openspec, type/spec, capability/hubs]
aliases: ["hubs spec"]
---

# hubs Specification

## Purpose

In Obsidian's graph every change renders as an anonymous cluster of identically-named nodes (`proposal`, `design`, `tasks`, `spec`) — nothing in the cluster carries the change's name, and there is no per-change landing page. A hub note whose filename IS the change id gives each cluster a natively-labeled anchor without renaming any OpenSpec artifact.

## Requirements

### Requirement: Generate a hub note per active change
The `hubs` command SHALL write one hub note at `openspec/changes/<id>.md` for every active change, carrying `type: hub` frontmatter, the change's completed-over-total task progress, and path wikilinks to the change's proposal, design, tasks, and delta specs, and regeneration MUST be deterministic and idempotent.

#### Scenario: Hub note written for an active change
- **WHEN** `hubs` runs and `openspec/changes/<id>/` contains artifacts
- **THEN** it writes `openspec/changes/<id>.md` linking the existing artifacts and stating the change's task progress

#### Scenario: Regeneration is byte-identical
- **WHEN** `hubs` runs twice with no intervening change to the vault
- **THEN** the second run produces byte-identical hub notes

### Requirement: Remove stale hub notes safely
The `hubs` command SHALL delete any hub note — a `changes/*.md` file whose frontmatter declares `type: hub` — whose change directory no longer exists, MUST NOT delete or modify files lacking that marker, and with `--dry-run` it MUST print planned writes and removals while writing nothing.

#### Scenario: Archived change's hub is removed
- **WHEN** a hub note exists for a change that has been moved under `changes/archive/`
- **THEN** the next `hubs` run deletes the stale hub note

#### Scenario: Non-hub note is preserved
- **WHEN** a `changes/*.md` file lacks `type: hub` frontmatter
- **THEN** `hubs` leaves it untouched

#### Scenario: Preview with dry-run
- **WHEN** `hubs --dry-run` runs
- **THEN** it prints the hub notes it would write or remove and writes nothing

### Requirement: Hub notes are opt-in and inert to the rest of the toolchain
Hub notes SHALL be created only by an explicit `hubs` invocation, and every other command MUST treat them as non-artifacts: `backfill` leaves them untouched, `dashboard` ignores them, and `archive` and `check` behavior is unaffected by their presence.

#### Scenario: No hubs without invocation
- **WHEN** any command other than `hubs` runs against a vault with no hub notes
- **THEN** no hub note is created

#### Scenario: Backfill skips hub notes
- **WHEN** `backfill` runs over a vault containing hub notes
- **THEN** every hub note remains byte-for-byte unchanged
