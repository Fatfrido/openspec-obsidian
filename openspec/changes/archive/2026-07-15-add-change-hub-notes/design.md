---
type: design
title: "add-change-hub-notes design"
change: add-change-hub-notes
tags: [openspec, type/design, capability/hubs]
aliases: ["add-change-hub-notes design"]
---

## Context

Obsidian labels graph nodes by file basename only, and OpenSpec artifact basenames are fixed. Change directories, however, already carry the change id as their name — a sibling note `changes/<id>.md` inherits that unique name for free. Verified inert placement: `backfill.deriveArtifact` returns `null` for `changes/<id>.md` (no artifact pattern matches a bare file beside the change dirs), `dashboard.collectChanges` skips non-directories, and the OpenSpec CLI enumerates change directories only.

## Goals / Non-Goals

**Goals:**

- A natively-labeled anchor node per active change, doubling as a landing page (progress + links).
- Zero footprint unless the command is run; deterministic regeneration; safe cleanup.

**Non-Goals:**

- Hub notes for archived changes (the archive section of `dashboard.md` already covers history).
- Auto-invocation from `archive`, `backfill`, or CI — those commands stay hub-unaware.
- A `title` frontmatter key: the hub's basename is already the change id, so its graph label is correct natively (independent of the Front Matter Title work).

## Decisions

- **Location `openspec/changes/<id>.md`.** Same name as the change dir, adjacent to it; the graph node reads as the change. Lives in the tracked vault body, never under `openspec/.obsidian/`.
- **Frontmatter:** `type: hub`, `change: <id>`, `tags: [openspec, type/hub, capability/<c>…]` (one per delta capability), `aliases: ["<id> hub"]`. Links are authored one direction only (hub → artifacts) as path wikilinks with display labels; backlinks give the reverse.
- **Stale-hub cleanup is self-scoped.** Only `changes/*.md` files whose frontmatter declares `type: hub` are candidates for deletion (when `changes/<basename>/` no longer exists). A user's stray note without that marker is never touched.
- **New module `lib/hubs.mjs`** following the repo pattern: `HubsError`, pure exported helpers (collect + render), `hubs(root, { dryRun })`, synchronous `fs`, verb-prefixed status lines (`WROTE`, `REMOVED`, `DASHBOARD`-style summary), duplicated `walkMd`-style traversal and the `- [x]` / `- [ ]` progress regexes per module convention.
- **Opt-in = invocation.** No config flag, no plugin, no detection: not running the command is the off switch, which satisfies "if disabled, no additional artifacts are generated".

## Risks / Trade-offs

- [Hubs go stale between archive and the next `hubs` run — broken links in a leftover hub] → cleanup on every run; README documents "run `hubs` after `archive` if you use hubs".
- [A future change id colliding with a reserved name (`archive`)] → `archive` is excluded from active-change enumeration exactly as in `dashboard.collectChanges`.
- [Two sources of task-progress truth] → same regexes as `archive.taskState`; divergence would be caught by tests asserting identical counts.
