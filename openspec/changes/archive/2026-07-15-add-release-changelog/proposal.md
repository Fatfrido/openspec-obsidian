---
type: proposal
title: "add-release-changelog proposal"
change: add-release-changelog
tags: [openspec, type/proposal, capability/changelog, capability/release]
aliases: ["add-release-changelog proposal"]
design: "[[changes/archive/2026-07-15-add-release-changelog/design|add-release-changelog design]]"
tasks: "[[changes/archive/2026-07-15-add-release-changelog/tasks|add-release-changelog tasks]]"
specs: ["[[changes/archive/2026-07-15-add-release-changelog/specs/changelog/spec|add-release-changelog changelog delta]]", "[[changes/archive/2026-07-15-add-release-changelog/specs/release/spec|add-release-changelog release delta]]"]
---

## Why

The repo uses Conventional Commits and GitVersion tags every `main` commit, but nothing records what a release contains. Adopters browsing the vault have no in-Obsidian answer to "what changed in v1.6.0?" — the history lives only in `git log`. Since one squash-merge = one conventional commit = one PR, a per-release changelog can be generated mechanically and linked into the existing spec graph (release entries -> archived changes).

## What Changes

- New `openspec-obsidian changelog` command (`lib/changelog.mjs`): given a release tag, it prepends a `## v<version> — <date>` section to `openspec/changelog.md` (creating the note with frontmatter when absent). The section lists every conventional commit since the previous release, bucketed Breaking / Features / Fixes / Internal, with commit subjects that mention an archived change id wikilinked to that archive dir.
- The previous release is self-anchored: it is the version in the topmost `## v` heading of the existing note — no GitHub API. A missing or section-less note bootstraps from full history. Re-running for the already-recorded version is a no-op.
- This is the first command that shells out to `git` (tags and log are unreachable from `node:fs`); it fails with a typed `ChangelogError` when git, the release tag, or the anchor tag is unavailable (e.g. shallow clone).
- `publish.yml` gains a `changelog` job with `needs: publish`, triggered only by a published GitHub Release: it checks out full history with tags, runs the command for the release tag, and commits `docs(changelog): <tag>` to `main`. Only successful releases are recorded; a failed publish writes nothing. Pushes with `GITHUB_TOKEN` do not retrigger workflows, so the commit is never tagged and cannot loop.
- README documents the command, the release procedure (bump `package.json` to match the tag, publish the GitHub Release), and the adopter workflow snippet.

## Capabilities

### New Capabilities

- `changelog`: generate and maintain a single release-anchored changelog note in the vault from Conventional Commit history between release tags.

### Modified Capabilities

- `release`: after a successful publish, the release workflow also generates the changelog section for the published tag and commits it to `main`.

## Impact

- New: `lib/changelog.mjs`, `test/changelog.test.mjs`.
- Modified: `bin/cli.mjs` (dispatch + USAGE), `.github/workflows/publish.yml`, `README.md`.
- No new npm dependencies; `git` becomes a runtime requirement for this command only. `openspec/changelog.md` is pipeline-owned and tracked; `backfill` already skips it (frontmatter present) and no `check` gate is added — PR checkouts are shallow and tagless, and invocation is the off-switch for adopters.
