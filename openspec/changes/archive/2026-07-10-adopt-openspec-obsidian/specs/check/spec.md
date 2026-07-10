---
type: spec-delta
change: adopt-openspec-obsidian
capability: check
tags: [openspec, type/spec, capability/check]
aliases: ["adopt-openspec-obsidian check delta"]
main_spec: "[[specs/check/spec|check spec]]"
---

## ADDED Requirements

### Requirement: Fail when a complete change is unarchived
The `check` command SHALL exit non-zero and name the offending changes when any change has all tasks complete but still lives under `openspec/changes/`, and it MUST NOT modify any file so it is safe to run as a CI gate.

#### Scenario: Complete-but-unarchived change fails the gate
- **WHEN** a change has every task checked but has not been archived
- **THEN** `check` exits non-zero and prints the offending change ids with the remedy `run: openspec-obsidian archive`

#### Scenario: Clean repository passes
- **WHEN** no change is both complete and unarchived
- **THEN** `check` prints `CHECK OK` and exits zero without writing any file
