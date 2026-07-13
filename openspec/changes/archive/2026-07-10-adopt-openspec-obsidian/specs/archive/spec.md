---
type: spec-delta
title: "adopt-openspec-obsidian archive delta"
change: adopt-openspec-obsidian
capability: archive
tags: [openspec, type/spec, capability/archive]
aliases: ["adopt-openspec-obsidian archive delta"]
main_spec: "[[specs/archive/spec|archive spec]]"
---

## ADDED Requirements

### Requirement: Sync delta specs into the live specs
The `archive` command SHALL merge every complete change's delta specs into `openspec/specs/` — applying ADDED, MODIFIED, REMOVED, and RENAMED operations by whole requirement block — before moving any change directory, so a hard error aborts the run before it can leave a half-archived change.

#### Scenario: ADDED requirement creates or updates a main spec
- **WHEN** a complete change contains a delta with `## ADDED Requirements`
- **THEN** `archive` writes those requirement blocks into `openspec/specs/<capability>/spec.md`, creating the spec if it does not yet exist

#### Scenario: Sync aborts before any move on error
- **WHEN** a `MODIFIED` delta names a requirement that is absent from the main spec
- **THEN** `archive` throws and no change directory is moved

### Requirement: Move completed changes and rewrite wikilinks
The `archive` command SHALL move each change whose tasks are all complete to `openspec/changes/archive/YYYY-MM-DD-<id>/`, rewrite the change's intra-change wikilink prefixes to the archived location, verify every rewritten link still resolves, and MUST skip any change that still has open tasks.

#### Scenario: Complete change is archived with rewritten links
- **WHEN** every task in a change is checked
- **THEN** `archive` moves the change under the dated archive directory and updates its `changes/<id>/` wikilink prefixes to `changes/archive/<date>-<id>/`

#### Scenario: Incomplete change is skipped
- **WHEN** a change still has an unchecked task
- **THEN** `archive` leaves it in place and logs a `SKIP` line naming the reason
