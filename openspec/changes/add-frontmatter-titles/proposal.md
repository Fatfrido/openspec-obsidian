---
type: proposal
title: "add-frontmatter-titles proposal"
change: add-frontmatter-titles
tags: [openspec, type/proposal, capability/backfill]
aliases: ["add-frontmatter-titles proposal"]
design: "[[changes/add-frontmatter-titles/design|add-frontmatter-titles design]]"
tasks: "[[changes/add-frontmatter-titles/tasks|add-frontmatter-titles tasks]]"
specs: ["[[changes/add-frontmatter-titles/specs/backfill/spec|add-frontmatter-titles backfill delta]]"]
---

## Why

Obsidian's graph view labels every node with its file basename — and OpenSpec fixes those basenames (`proposal.md`, `design.md`, `tasks.md`, `spec.md`), so the graph is a sea of identically-named nodes that can only be told apart by opening them. Aliases do not affect graph labels, and renaming artifact files would break the OpenSpec CLI and this tool's parsers. The community plugin Front Matter Title renders a frontmatter `title` key as the node label everywhere (graph, explorer, search, tabs), which fixes the graph without touching a single filename.

## What Changes

- `backfill` stamps a `title` key — mirroring the artifact's primary alias, e.g. `add-frontmatter-titles proposal`, `backfill spec` — into every frontmatter block it generates.
- `backfill` also inserts a missing `title` into artifacts that already carry frontmatter, so previously backfilled vaults (and artifacts created by templates or archive sync) converge on the next run. Artifacts whose frontmatter already has a `title` stay byte-for-byte unchanged.
- `README.md` documents the optional plugin setup. Strictly optional: without the plugin, `title` is inert frontmatter — the OpenSpec CLI ignores it and the vault behaves exactly as today (the graph is just not nice).
- This repo's vault is re-backfilled so every artifact carries a `title` (dogfood).

## Capabilities

### New Capabilities

- _None._

### Modified Capabilities

- `backfill`: frontmatter blocks gain a `title` key, and the idempotency rule is refined — files with frontmatter but no `title` receive exactly the missing key instead of being skipped.

## Impact

- `lib/backfill.mjs` (`generateFrontmatter` + a title-upsert pass), `test/backfill.test.mjs` (goldens for all five artifact kinds, upsert + idempotency cases).
- `README.md` (plugin section), `openspec/` vault files re-stamped.
- No change to `init`, `archive`, `dashboard`, or `check`: `backfill` stays the sole frontmatter owner; artifacts other commands create without `title` gain it on the next backfill run.
