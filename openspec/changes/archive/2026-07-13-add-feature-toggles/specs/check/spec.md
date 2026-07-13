---
type: spec-delta
change: add-feature-toggles
capability: check
tags: [openspec, type/spec, capability/check]
aliases: ["add-feature-toggles check delta"]
main_spec: "[[specs/check/spec|check spec]]"
---

## ADDED Requirements

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
