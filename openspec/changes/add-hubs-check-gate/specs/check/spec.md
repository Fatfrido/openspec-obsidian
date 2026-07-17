---
type: spec-delta
change: add-hubs-check-gate
capability: check
tags: [openspec, type/spec, capability/check]
aliases: ["add-hubs-check-gate check delta"]
main_spec: "[[specs/check/spec|check spec]]"
---

## ADDED Requirements

### Requirement: Fail on stale hub notes when hub notes exist
The `check` command SHALL detect whether any `openspec/changes/*.md` file carries `type: hub` frontmatter. When none do, it MUST NOT evaluate hub notes at all. When at least one does, it SHALL regenerate hub content in memory via the same logic `hubs` uses and exit non-zero — naming the offending note and the remedy — when an active change has no hub note, when an existing hub note's content differs from the regenerated content after newline normalization, or when a hub-marked note has no corresponding change directory. It MUST NOT write any file in any case.

#### Scenario: No hub notes leaves the gate inert
- **WHEN** `check` runs and no file under `openspec/changes/` carries `type: hub` frontmatter
- **THEN** `check` passes without evaluating hub notes

#### Scenario: Stale hub note fails the gate
- **WHEN** a hub note at `openspec/changes/<id>.md` exists for an active change
- **AND** the change's `tasks.md` has been edited since the hub note was generated, so regenerated content differs after newline normalization
- **THEN** `check` fails, naming the stale hub note and the remedy to run `openspec-obsidian hubs` (or `npm run opsx:hubs`) and commit

#### Scenario: Active change missing its hub note fails the gate
- **WHEN** at least one hub note exists elsewhere under `openspec/changes/`
- **AND** an active change has no corresponding `openspec/changes/<id>.md` hub note
- **THEN** `check` fails, naming the change missing its hub note

#### Scenario: Orphaned hub note fails the gate
- **WHEN** a file at `openspec/changes/<id>.md` carries `type: hub` frontmatter
- **AND** the directory `openspec/changes/<id>/` does not exist
- **THEN** `check` fails, naming the orphaned hub note
