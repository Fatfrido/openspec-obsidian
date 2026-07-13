---
type: proposal
change: add-contribution-gates
tags: [openspec, type/proposal, capability/contributing]
aliases: ["add-contribution-gates proposal"]
design: "[[changes/add-contribution-gates/design|add-contribution-gates design]]"
tasks: "[[changes/add-contribution-gates/tasks|add-contribution-gates tasks]]"
specs: ["[[changes/add-contribution-gates/specs/contributing/spec|add-contribution-gates contributing delta]]"]
---

## Why

The SDLC guarantees specs and code merge together, but nothing guarantees documentation merges with them: a feature can ship with the README untouched, and a breaking change can land with no upgrade path for adopters. Documentation quality cannot be judged mechanically, so enforcement must be layered — generation-time rules plan the docs, the PR template forces explicit triage, and CI verifies the right files were touched. Separately, this is a public repo whose contributor onboarding is three README lines, while the real workflow (branch-per-change, archive-on-branch, drift gates) lives only in the agent-facing `AGENTS.md`.

## What Changes

- New `CONTRIBUTING.md`: environment setup, test command, pinned OpenSpec CLI, change-lifecycle summary (linking `AGENTS.md` for depth), and a table of every docs CI gate with the local command that pre-empts it. The README contributing section slims to a link.
- New `UPGRADING.md`: one section per breaking-or-manually-migrated change, written as adopter instructions (the exact command to run or CI snippet delta). The README adoption section links it.
- New `docs` CI job (pure Node, zero deps): lints the PR title as a Conventional Commit; `feat` titles must touch `README.md` (escape label `docs:none`); breaking declarations (`!` title marker or `BREAKING CHANGE` body footer) and any `assets/` diff must touch `UPGRADING.md` (escape label `migration:auto`) — `assets/` changes never reach existing adopters automatically because `init` does not overwrite.
- PR template gains a "Docs & compatibility" section: docs checkbox plus breaking-change triage (none / automatic / manual with upgrade guide).
- `openspec/config.yaml` rules: proposals declare breaking-change triage and documentation impact; designs prefer automatic migration; tasks name each affected adopter surface (README sections, CLI usage text, `assets/`).

## Capabilities

### New Capabilities

- `contributing`: contributor onboarding and the documentation/compatibility gates every pull request passes.

### Modified Capabilities

- _None._

## Impact

- New files: `CONTRIBUTING.md`, `UPGRADING.md`, `.github/scripts/docs-gate.mjs`, `test/docs-gate.test.mjs`.
- Modified: `.github/workflows/ci.yml` (one job), `.github/pull_request_template.md`, `openspec/config.yaml` (rules), `README.md` (links).
- No `lib/`, `bin/`, or `assets/` changes — tool behavior is untouched.
