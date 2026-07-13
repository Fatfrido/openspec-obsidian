---
type: spec
capability: features
tags: [openspec, type/spec, capability/features]
aliases: ["features spec"]
---

# features Specification

## Purpose

The dashboard is wired unconditionally into the lifecycle recipes: the README CI snippet regenerates it and diffs for drift, and the apply flow refreshes it after every archive. An adopter who does not want a generated dashboard has no first-class way to say so, and every future optional feature would face the same problem. Detecting enablement from generated artifacts alone was rejected because upcoming features may not produce a sentinel artifact, so the tool needs an explicit, config-driven toggle that every consumer (CLI commands, CI gate, agent skills) reads as the single source of truth.

## Requirements

### Requirement: Read feature toggles from a tool-owned config file
The tool SHALL read optional-feature toggles from `openspec/obsidian.yaml`, a file it owns exclusively, parsing a top-level `features:` map of boolean values with a zero-dependency parser. It MUST treat an absent file, an absent `features:` key, or an unlisted feature name as disabled, MUST ignore unknown feature names so a newer config keeps working with an older tool, and MUST fail with a typed error naming the file when an entry under `features:` is not of the form `name: true|false`.

#### Scenario: Feature enabled
- **WHEN** `openspec/obsidian.yaml` contains a `features:` map with `dashboard: true`
- **THEN** the `dashboard` feature is reported enabled

#### Scenario: Absent file means disabled
- **WHEN** `openspec/obsidian.yaml` does not exist
- **THEN** every optional feature is reported disabled

#### Scenario: Unknown feature names are ignored
- **WHEN** the `features:` map contains a name the tool does not recognize
- **THEN** reading toggles succeeds and known features keep their configured values

#### Scenario: Malformed entry is a hard error
- **WHEN** a line under `features:` is not of the form `name: true|false`
- **THEN** reading toggles throws a typed error that names `openspec/obsidian.yaml`

### Requirement: Core commands are never feature-gated
The `init`, `backfill`, `archive`, and `check` commands SHALL run regardless of feature toggles; only optional features consult `openspec/obsidian.yaml`.

#### Scenario: Core workflow without a toggle file
- **WHEN** `openspec/obsidian.yaml` does not exist
- **THEN** `backfill`, `archive`, and `check` operate exactly as specified for their capabilities
