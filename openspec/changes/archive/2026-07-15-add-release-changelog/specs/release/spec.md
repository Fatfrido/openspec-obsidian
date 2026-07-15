---
type: spec-delta
title: "add-release-changelog release delta"
change: add-release-changelog
capability: release
tags: [openspec, type/spec, capability/release]
aliases: ["add-release-changelog release delta"]
main_spec: "[[specs/release/spec|release spec]]"
---

## ADDED Requirements

### Requirement: Changelog recorded after successful publish
The release workflow SHALL run a changelog job only when triggered by a published GitHub Release and only after the publish job succeeds. The job SHALL check out `main` with full history and tags, run the changelog command for the release tag, and — when the note changed — commit it as `docs(changelog): <tag>` and push to `main` using the workflow token, so the commit triggers no further workflow runs and receives no version tag. A failed publish SHALL record no changelog entry.

#### Scenario: Successful release lands a changelog commit
- **WHEN** a GitHub Release for `v1.8.0` is published and the publish job succeeds
- **THEN** a `docs(changelog): v1.8.0` commit updating `openspec/changelog.md` is pushed to `main`

#### Scenario: Failed publish records nothing
- **WHEN** a GitHub Release is published but the publish job fails (e.g. tag/version mismatch)
- **THEN** the changelog job does not run and `openspec/changelog.md` is unchanged

#### Scenario: Workflow re-run does not duplicate the section
- **WHEN** the release workflow for `v1.8.0` is re-run after its changelog commit already landed
- **THEN** the changelog command reports a no-op and the job pushes nothing
