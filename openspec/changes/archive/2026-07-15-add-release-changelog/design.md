---
type: design
title: "add-release-changelog design"
change: add-release-changelog
tags: [openspec, type/design, capability/changelog, capability/release]
aliases: ["add-release-changelog design"]
---

## Context

GitVersion tags every `main` commit (`v0.1.0`…`v1.3.0` today), but a *release* is rarer: a manually published GitHub Release whose tag matches `package.json` (enforced by the `publish.yml` guard). Zero releases exist yet, so the first generated section bootstraps from full history. The vault already has one generated note (`dashboard.md`); its drift-gate pattern does not transfer here because changelog staleness is caused by other people's merges and PR checkouts are shallow and tagless.

## Goals / Non-Goals

**Goals:**
- One tracked note, `openspec/changelog.md`, readable and graph-linked in Obsidian.
- Entries exist for every published release, written exactly once, by the release pipeline.
- Zero npm dependencies; pure helpers testable without git.

**Non-Goals:**
- No per-release notes, no `releases.base` view.
- No `check`/CI drift gate and no `obsidian.yaml` toggle — the note is pipeline-owned; adopters opt in by wiring the workflow step (invocation is the off-switch, as with `hubs`).
- No GitHub API usage; no listing of intermediate GitVersion tags as entries.
- Not seeding `openspec/changelog.md` in this change — the first release creates it.

## Decisions

- **Self-anchoring previous release.** The generator parses the topmost `## v<version>` heading of the existing note to find the previous release; the commit range is `v<prev>..v<new>`. Missing note or no headings -> full history reachable from the release tag. This keeps the command git+fs only and makes anchor logic a pure helper.
- **Prepend-only sections, newest first.** Existing sections are never regenerated, so the note is immutable history; idempotency is "topmost section already at this version -> no-op status line, exit 0" (safe workflow re-runs).
- **Determinism.** Section date is the tagged commit's date (`git log -1 --format=%cs <tag>`), never "today"; entry order is `git log` order; identical repo state yields byte-identical output.
- **Bucketing from the commit message.** `!` marker or `BREAKING CHANGE` in the body -> Breaking; `feat` -> Features; `fix` -> Fixes; everything else (including non-conventional subjects) -> Internal. Complete data, curation happens at the view.
- **Archive linking by token match.** A subject containing a token equal to an archived change id links `[[changes/archive/<date>-<id>/proposal|<id>]]`; archive dirs are enumerated with `node:fs`. Archiving happens on the feature branch, so the dir exists on `main` before its release. No match -> plain entry.
- **git via `execFileSync`.** First `child_process` use in the codebase, isolated in thin wrappers in `lib/changelog.mjs`; all parsing/rendering helpers are pure and exported for `node:test`. Failures (no git, unknown tag, missing anchor tag in a shallow clone) throw `ChangelogError` naming the remedy.
- **Pipeline placement: `changelog` job in `publish.yml`, `needs: publish`.** Runs only on `release: published` (not `workflow_dispatch`), with `contents: write`, `fetch-depth: 0`, `fetch-tags: true`; commits `docs(changelog): <tag>` as github-actions[bot] and pushes to `main`. Only npm-published releases are recorded. Default-token pushes trigger no workflows: no CI run, no GitVersion tag, no loop.

## Risks / Trade-offs

- **Push race**: `main` may advance between checkout and push; the job pulls/rebases before pushing and a rerun is safe (idempotent no-op if already recorded).
- **Local clone lag**: after a release, local `main` lacks the bot commit until the next pull — cosmetic.
- **The changelog commit itself is never CI-tested or tagged** (no workflow trigger); it only touches `openspec/changelog.md`, and the next real commit's GitVersion bump absorbs it as a patch input.
- **Out-of-order releases** (publishing a tag older than the anchor) produce an empty or misleading range; the command errors when the release tag is reachable from the anchor.
