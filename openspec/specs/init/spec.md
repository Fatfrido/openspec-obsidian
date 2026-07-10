---
type: spec
capability: init
tags: [openspec, type/spec, capability/init]
aliases: ["init spec"]
---

# init Specification

## Purpose

The `init` command bootstraps a repository into the Obsidian-aware OpenSpec conventions: it installs the workflow schema and artifact templates under `openspec/schemas/spec-driven/`, appends the authoring rules to `openspec/config.yaml`, and keeps the Obsidian vault workspace untracked. It is idempotent and refuses to run outside an OpenSpec repository.

## Requirements

### Requirement: Install the Obsidian-aware schema and templates
The `init` command SHALL copy the workflow schema and the four artifact templates into `openspec/schemas/spec-driven/`, skipping any target file that already exists unless `--force` is given.

#### Scenario: Fresh install
- **WHEN** `init` runs in an OpenSpec repository with no installed schema
- **THEN** it writes `schema.yaml` and the `proposal`, `spec`, `design`, and `tasks` templates, logging each `WROTE` path

#### Scenario: Existing files preserved without force
- **WHEN** a target file already exists and `--force` is not given
- **THEN** `init` leaves the file untouched and logs `SKIP <path> (exists; use --force)`

### Requirement: Append authoring rules and guard the repository
The `init` command SHALL fail when `openspec/config.yaml` is absent, and otherwise append the authoring `rules:` block to that file — or print it for manual merge when a top-level `rules:` key already exists — and ensure `openspec/.obsidian/` is listed in `.gitignore`.

#### Scenario: Rules appended to a clean config
- **WHEN** `openspec/config.yaml` exists with no top-level `rules:` key
- **THEN** `init` appends the rules block and adds `openspec/.obsidian/` to `.gitignore`

#### Scenario: Not an OpenSpec repository
- **WHEN** `openspec/config.yaml` does not exist
- **THEN** `init` throws an error telling the user to run `openspec init` first
