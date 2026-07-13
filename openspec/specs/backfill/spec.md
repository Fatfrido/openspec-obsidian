---
type: spec
title: "backfill spec"
capability: backfill
tags: [openspec, type/spec, capability/backfill]
aliases: ["backfill spec"]
---

# backfill Specification

## Purpose

The `backfill` command retrofits Obsidian frontmatter onto OpenSpec artifacts that predate the conventions. It classifies each artifact by its vault path, prepends the matching frontmatter block, and verifies that every generated path wikilink resolves — idempotently, so files that already carry frontmatter are never touched.

## Requirements

### Requirement: Add frontmatter to bare artifacts idempotently
The `backfill` command SHALL add the per-type Obsidian frontmatter block to every OpenSpec artifact that lacks one, and MUST leave any file whose first line is already `---` untouched.

#### Scenario: Bare artifact gains frontmatter
- **WHEN** `backfill` finds an artifact whose content does not start with `---`
- **THEN** it prepends the frontmatter block for that artifact type and logs an `ADD` line

#### Scenario: Already-annotated artifact is skipped
- **WHEN** an artifact already begins with a `---` frontmatter fence
- **THEN** `backfill` leaves the file byte-for-byte unchanged

### Requirement: Verify generated wikilinks and support dry-run
The `backfill` command SHALL verify that every path wikilink it generates resolves to a file on disk and fail otherwise, and with `--dry-run` it MUST print the planned actions while writing nothing.

#### Scenario: Preview with dry-run
- **WHEN** `backfill --dry-run` runs
- **THEN** it prints the artifacts it would annotate and writes no files

#### Scenario: Unresolved link aborts
- **WHEN** a generated wikilink target does not exist on disk
- **THEN** `backfill` throws a link-verification error instead of leaving a broken link
