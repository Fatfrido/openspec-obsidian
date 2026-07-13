---
type: design
change: add-contribution-gates
tags: [openspec, type/design, capability/contributing]
aliases: ["add-contribution-gates design"]
---

## Context

Current CI gates are all mechanical (tests, `opsx:validate`, `opsx:check`, dashboard drift); the PR template carries no docs or breaking-change triage; the README contributing section is three lines. Adopter-facing documentation is split across two surfaces: prose (README adoption/CI-snippet sections, CLI usage text) and docs-as-artifacts (`assets/` — schema instructions, config rules, templates that `init` installs into adopter repos and deliberately never overwrites afterwards).

## Goals / Non-Goals

**Goals:**
- Documentation merges with the code it documents; a PR cannot silently skip it.
- Breaking changes prefer automatic migration (idempotent commands converging, like the backfill upsert); when manual steps remain, adopters get exact instructions in `UPGRADING.md`.
- A public contributor learns the whole workflow from one screen.

**Non-Goals:**
- Judging documentation *quality* in CI — a gate can only verify a file was touched; quality lives in the generation rules and human review at propose time.
- Changing `assets/config-rules.yaml` (rules installed into adopter repos) — adopters have their own doc surfaces; possible follow-up.
- Version-staleness detection in adopter repos; Danger.js or LLM-based review gates.

## Decisions

- **Three-layer enforcement.** `openspec/config.yaml` rules demand content at artifact generation (the only layer that can); the PR template demands explicit human triage; CI is a file-touched backstop. Accepting that CI cannot judge adequacy is deliberate.
- **Gate logic is a pure Node helper, not inline shell.** `.github/scripts/docs-gate.mjs` exports `evaluateGate({title, body, labels, changedFiles})` returning violations; a tiny env-reading entry point (`PR_TITLE`, `PR_BODY`, `PR_LABELS`, `CHANGED_FILES`) exits non-zero listing them. This matches the repo's pure-exported-helpers convention and gets full `node:test` coverage without a subprocess or a live PR.
- **Triggers:** title must match Conventional Commits (`type(scope)!: description`); type `feat` requires `README.md` in the diff; a breaking declaration (`!` marker or `BREAKING CHANGE` in the body) or any path under `assets/` requires `UPGRADING.md` in the diff. The `assets/` path trigger exists because `init` never overwrites installed files — existing adopters go silently stale, which is a manual migration by definition, and it fires even when the author forgot the `!` marker.
- **Escape labels:** `docs:none` (internal-only feature), `migration:auto` (a command converges adopters automatically). The workflow's `pull_request` trigger gains `types: [opened, edited, synchronize, reopened, labeled, unlabeled]` so toggling a label or fixing a title re-evaluates the gate; re-running the other jobs on those events is an accepted cost.
- **Changed files** come from `git diff --name-only origin/main...HEAD` (merge-base form) on a full-depth checkout — no third-party changed-files action.
- **`CONTRIBUTING.md` is a thin entry point; `AGENTS.md` stays authoritative** for architecture and conventions (same anti-drift reasoning as the `.claude`/`.pi` mirror rule). The gate table lives only in `CONTRIBUTING.md`.
- **`UPGRADING.md` entries are imperative adopter instructions**, newest first, one `##` section per change, version-stamped at release from the GitVersion tag. Not added to the npm `files` whitelist — it is a repo doc.

## Risks / Trade-offs

- File-touched is a proxy, not proof, of documentation — mitigated by the generation rules and template triage.
- False positives (e.g. a `feat` with no user-visible surface) require a maintainer to apply an escape label; acceptable for a low-traffic repo.
- Title lint hardens what was previously convention; contributors learn the rule from `CONTRIBUTING.md` and the failing check's message.
- This change's own apply PR must pass the gates it introduces (`feat` title + README touched) — dogfooding, verified in tasks.
