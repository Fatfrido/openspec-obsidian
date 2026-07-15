---
type: spec-delta
title: "add-release-changelog changelog delta"
change: add-release-changelog
capability: changelog
tags: [openspec, type/spec, capability/changelog]
aliases: ["add-release-changelog changelog delta"]
main_spec: "[[specs/changelog/spec|changelog spec]]"
---

## ADDED Requirements

### Requirement: Release-anchored changelog note
The `changelog` command SHALL, given a release tag `v<version>`, prepend a `## v<version> — <date>` section to `openspec/changelog.md`, creating the note with YAML frontmatter (`type: changelog`) when absent. The section SHALL cover every commit in `v<previous>..v<version>`, where the previous release is the version named by the topmost `## v` heading of the existing note; when the note is absent or has no version headings, the section SHALL cover all history reachable from the release tag. The section date SHALL be the tagged commit's author-independent commit date, and identical repository state SHALL yield byte-identical output. Existing sections SHALL never be modified.

#### Scenario: First release bootstraps from full history
- **WHEN** `changelog --release v1.6.0` runs and `openspec/changelog.md` does not exist
- **THEN** the note is created with frontmatter and a single `## v1.6.0` section listing all commits reachable from `v1.6.0`

#### Scenario: Subsequent release covers the gap since the anchor
- **WHEN** the topmost heading of the existing note is `## v1.6.0 — 2026-07-20` and `changelog --release v1.8.0` runs
- **THEN** a `## v1.8.0` section listing exactly the commits in `v1.6.0..v1.8.0` is prepended and the `v1.6.0` section is preserved byte-for-byte

#### Scenario: Intermediate tags are subsumed, not listed
- **WHEN** tags `v1.6.1` and `v1.7.0` exist between the anchor `v1.6.0` and the release tag `v1.8.0`
- **THEN** the generated section lists the commits those tags point to as entries, and no intermediate tag appears as a heading

### Requirement: Conventional Commit bucketing
Entries within a section SHALL be grouped into `Breaking`, `Features`, `Fixes`, and `Internal` subsections in that order, derived from the commit message: a `!` before the subject's colon or a `BREAKING CHANGE` footer SHALL bucket as Breaking, `feat` type as Features, `fix` type as Fixes, and every other commit — including non-conventional subjects — as Internal. Empty subsections SHALL be omitted.

#### Scenario: Types map to subsections
- **WHEN** the range contains `feat(backfill): stamp titles`, `fix: handle CRLF`, and `ci: pin node`
- **THEN** the section renders a Features entry, a Fixes entry, and an Internal entry, in that subsection order

#### Scenario: Breaking marker wins over type
- **WHEN** the range contains `feat(init)!: drop legacy layout`
- **THEN** the entry is rendered under Breaking and not under Features

### Requirement: Archived change wikilinks
When a commit subject contains a token equal to the change id of a directory under `openspec/changes/archive/`, the entry SHALL wikilink that id to the archived proposal as `[[changes/archive/<date>-<id>/proposal|<id>]]`. Subjects matching no archived change SHALL render as plain text.

#### Scenario: Subject naming an archived change is linked
- **WHEN** a commit subject contains `(add-frontmatter-titles)` and `openspec/changes/archive/2026-07-13-add-frontmatter-titles/` exists
- **THEN** the rendered entry links `[[changes/archive/2026-07-13-add-frontmatter-titles/proposal|add-frontmatter-titles]]`

#### Scenario: Infrastructure commit stays plain
- **WHEN** a commit subject `ci: auto-version main commits` matches no archived change id
- **THEN** the entry is rendered without any wikilink

### Requirement: Idempotent re-run and typed failures
When the topmost section of the note already names the requested release version, the command SHALL write nothing, report a status line, and exit 0. The command SHALL throw a `ChangelogError` (CLI exit 1) when git is unavailable, when the release tag is unknown, or when the anchor tag is unreachable — each message naming the remedy. A `--dry-run` flag SHALL print the would-be section without writing.

#### Scenario: Re-run for the recorded release is a no-op
- **WHEN** `changelog --release v1.8.0` runs and the topmost heading already is `## v1.8.0`
- **THEN** the note is unchanged and the command exits 0 with a status line

#### Scenario: Unknown release tag is an actionable error
- **WHEN** `changelog --release v9.9.9` runs and no such tag exists
- **THEN** the command fails with a `ChangelogError` naming the missing tag and suggesting a full-history, tag-fetching checkout
