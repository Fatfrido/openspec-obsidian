---
type: proposal
title: "document-public-availability proposal"
change: document-public-availability
tags: [openspec, type/proposal, capability/release]
aliases: ["document-public-availability proposal"]
design: "[[changes/archive/2026-07-13-document-public-availability/design|document-public-availability design]]"
tasks: "[[changes/archive/2026-07-13-document-public-availability/tasks|document-public-availability tasks]]"
specs: ["[[changes/archive/2026-07-13-document-public-availability/specs/release/spec|document-public-availability release delta]]"]
---

## Why

The repository is now public and `openspec-obsidian` can publish to the public npm registry, but `README.md` was written for the private, pre-release era: it declares "No npm release yet," leads every example with `npx github:Fatfrido/openspec-obsidian`, and its Releasing section tells maintainers to add an `NPM_TOKEN` secret — yet `.github/workflows/publish.yml` authenticates tokenlessly via OIDC Trusted Publishing. New users are pointed at the wrong install path and maintainers at setup the workflow ignores.

## What Changes

- Rewrite the **Install** section so `npx openspec-obsidian` / `npm install --save-dev openspec-obsidian` is the canonical path and "No npm release yet" is removed; keep `npx github:Fatfrido/openspec-obsidian#<sha>` only as an edge/pin-a-commit fallback.
- Switch the primary command examples (Adopt, Archive, Agent/skill) to the bare `openspec-obsidian <cmd>` form, keeping the `github:` form only where pinning a commit matters (the CI snippet).
- Rewrite **Releasing (maintainers)** to match `publish.yml`: tokenless OIDC Trusted Publishing (one-time Trusted Publisher setup on npmjs.com; **no** `NPM_TOKEN`), the release-tag-must-match-`package.json`-version gate, and automatic provenance.
- Add public-repo affordances near the title: npm-version, CI, and license badges plus a short Contributing/issues pointer.
- Formalize the previously-unspecced release behavior as a new `release` capability spec — the contract `publish.yml` already implements — so CI's `validate --strict` gate can check the docs against a spec.

## Capabilities

### New Capabilities
- `release`: how the tool reaches users — published to the public npm registry, release triggered by a GitHub Release with a version/tag gate, authenticated tokenlessly via OIDC Trusted Publishing, and installable via `npx`/`npm install` without credentials.

### Modified Capabilities
- _None._ No behavior change to `init`, `backfill`, `archive`, or `check`.

## Impact

- `README.md`: Install, Adopt, Archive, CI, Agent, and Releasing sections rewritten; badges + Contributing added.
- New `openspec/specs/release/spec.md` (from this change's delta, synced at archive).
- No code change: `bin/`, `lib/`, `assets/`, and `.github/workflows/publish.yml` already conform.
