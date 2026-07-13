---
type: spec-delta
title: "add-feature-toggles dashboard delta"
change: add-feature-toggles
capability: dashboard
tags: [openspec, type/spec, capability/dashboard]
aliases: ["add-feature-toggles dashboard delta"]
main_spec: "[[specs/dashboard/spec|dashboard spec]]"
---

## ADDED Requirements

### Requirement: Refuse to run when the dashboard feature is disabled
The `dashboard` command SHALL fail with an actionable error when the `dashboard` feature toggle is not enabled, naming `openspec/obsidian.yaml` and the exact setting to add, and SHALL behave as otherwise specified when the toggle is enabled.

#### Scenario: Disabled feature is an actionable error
- **WHEN** the `dashboard` feature is not enabled in `openspec/obsidian.yaml`
- **THEN** `dashboard` exits non-zero with an error that names `openspec/obsidian.yaml` and the `dashboard: true` setting

#### Scenario: Enabled feature runs normally
- **WHEN** the `dashboard` feature is enabled in `openspec/obsidian.yaml`
- **THEN** `dashboard` writes `openspec/dashboard.md` exactly as specified by this capability
