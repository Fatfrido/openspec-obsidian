---
type: spec-delta
change: add-upgrade-command
capability: upgrade
tags: [openspec, type/spec, capability/upgrade]
aliases: ["add-upgrade-command upgrade delta"]
main_spec: "[[specs/upgrade/spec|upgrade spec]]"
---

## ADDED Requirements

### Requirement: Detect stale installed assets
The tool SHALL provide `assetStates(root, assetsDir)` that compares each installed tool-owned or user-owned file under `openspec/` against its counterpart in the packaged `assets/` directory, after normalizing line endings to `\n` on both sides, and classify it as `current`, `stale`, or `missing`.

#### Scenario: Stale template detected after normalization
- **WHEN** an installed template under `openspec/schemas/spec-driven/templates/` has content that differs from the packaged asset beyond line-ending differences
- **THEN** `assetStates` reports that file with status `stale`

#### Scenario: CRLF-only difference is not stale
- **WHEN** an installed asset differs from the packaged asset only in line-ending style (`\r\n` vs `\n`)
- **THEN** `assetStates` reports that file with status `current`

### Requirement: Refresh tool-owned assets only
The `upgrade(root, {dryRun})` command SHALL rewrite tool-owned files (the schema and its templates) in place when their status is `stale`, create them when `missing`, and SHALL NOT write user-owned files (`openspec/obsidian.yaml`, `openspec/dashboard.base`) regardless of their status. It SHALL throw `UpgradeError` when `openspec/schemas/spec-driven/` does not exist.

#### Scenario: Stale schema or template is rewritten
- **WHEN** `upgrade` runs against a repo where a tool-owned file is `stale`
- **THEN** that file's content is replaced with the packaged asset content
- **AND** the command logs `UPDATED <path>` for it

#### Scenario: User-owned files are never written
- **WHEN** `openspec/obsidian.yaml` or `openspec/dashboard.base` differs from its packaged counterpart
- **THEN** `upgrade` does not modify that file
- **AND** the difference is reported as informational only

#### Scenario: Missing tool-owned file is created
- **WHEN** a tool-owned file present in the packaged `assets/` is absent from the installed repo
- **THEN** `upgrade` creates it with the packaged content
- **AND** the command logs `UPDATED <path>` for it

#### Scenario: Dry run reports without writing
- **WHEN** `upgrade` runs with `dryRun: true` against a repo with at least one stale or missing tool-owned file
- **THEN** no file on disk is modified or created
- **AND** the command logs `WOULD UPDATE <path>` for each such file instead of `UPDATED <path>`

#### Scenario: Missing schemas directory guards the run
- **WHEN** `upgrade` runs against a repo where `openspec/schemas/spec-driven/` does not exist
- **THEN** it throws `UpgradeError` directing the adopter to run `init` first
- **AND** no file is written

### Requirement: Report configuration rule drift for manual merge
When the packaged config-rules block (LF-normalized) does not appear as a substring of `openspec/config.yaml` (also LF-normalized), `upgrade` SHALL print the packaged block for manual merge and SHALL NOT modify `openspec/config.yaml`.

#### Scenario: Changed packaged rules print for manual merge
- **WHEN** the packaged config-rules block is not found within the installed `openspec/config.yaml`
- **THEN** `upgrade` prints the packaged rules block to guide a manual merge
- **AND** `openspec/config.yaml` is left byte-for-byte unchanged
