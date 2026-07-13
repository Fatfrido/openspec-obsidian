---
type: spec
capability: check
tags: [openspec, type/spec, capability/check]
aliases: ["check spec"]
---

# check Specification

## Purpose

The `check` command is the read-only CI gate for the archive workflow. It fails the build when any change has all of its tasks complete but has not yet been archived, ensuring a finished change can never merge with its delta specs left unsynced.

## Requirements

### Requirement: Fail when a complete change is unarchived
The `check` command SHALL exit non-zero and name the offending changes when any change has all tasks complete but still lives under `openspec/changes/`, and it MUST NOT modify any file so it is safe to run as a CI gate.

#### Scenario: Complete-but-unarchived change fails the gate
- **WHEN** a change has every task checked but has not been archived
- **THEN** `check` exits non-zero and prints the offending change ids with the remedy `run: openspec-obsidian archive`

#### Scenario: Clean repository passes
- **WHEN** no change is both complete and unarchived
- **THEN** `check` prints `CHECK OK` and exits zero without writing any file

### Requirement: Fail on a stale dashboard when the feature is enabled
When the `dashboard` feature toggle is enabled, the `check` command SHALL regenerate the dashboard content in memory and fail — naming the remedy — when `openspec/dashboard.md` is missing or differs from the regenerated content after newline normalization. When the toggle is disabled it MUST ignore the dashboard entirely, and it MUST NOT write any file in either case.

#### Scenario: Enabled and stale fails the gate
- **WHEN** the `dashboard` feature is enabled and `openspec/dashboard.md` is missing or does not match the regenerated content
- **THEN** `check` exits non-zero and prints the remedy `run: openspec-obsidian dashboard`

#### Scenario: Enabled and fresh passes
- **WHEN** the `dashboard` feature is enabled and `openspec/dashboard.md` matches the regenerated content after newline normalization
- **THEN** `check` passes without writing any file

#### Scenario: Disabled dashboard is ignored
- **WHEN** the `dashboard` feature is disabled and `openspec/dashboard.md` is stale or absent
- **THEN** `check` gates only on complete-but-unarchived changes
