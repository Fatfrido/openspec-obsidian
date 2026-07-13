---
type: spec-delta
change: add-feature-toggles
capability: init
tags: [openspec, type/spec, capability/init]
aliases: ["add-feature-toggles init delta"]
main_spec: "[[specs/init/spec|init spec]]"
---

## ADDED Requirements

### Requirement: Seed the feature toggle file
The `init` command SHALL write `openspec/obsidian.yaml` with every optional feature disabled when the file is absent, and MUST NOT modify an existing `openspec/obsidian.yaml` even when `--force` is given, because the file records the adopter's choices rather than reinstallable scaffolding.

#### Scenario: Toggle file seeded when absent
- **WHEN** `init` runs and `openspec/obsidian.yaml` does not exist
- **THEN** it writes the file with all optional features set to false and logs the write

#### Scenario: Existing toggle file preserved under force
- **WHEN** `openspec/obsidian.yaml` exists and `init` runs with `--force`
- **THEN** the file is left byte-identical and a skip is logged
