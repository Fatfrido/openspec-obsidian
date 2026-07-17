---
type: proposal
change: add-upstream-canary
tags: [openspec, type/proposal, capability/canary]
aliases: ["add-upstream-canary proposal"]
design: "[[changes/add-upstream-canary/design|add-upstream-canary design]]"
tasks: "[[changes/add-upstream-canary/tasks|add-upstream-canary tasks]]"
specs: ["[[changes/add-upstream-canary/specs/canary/spec|add-upstream-canary canary delta]]"]
---

## Why

CI's `specs` job validates this vault only against `@fission-ai/openspec@1.4.1`, pinned so the merge gate never moves under a PR's feet. Upstream is already at 1.6.0, and 1.5 shipped a beta "Stores" model that is slated to eventually replace the `specs`/`changes` layout this tool re-derives in several modules. Nothing in CI detects the day a newer release tightens frontmatter tolerance, changes the delta-header grammar, or ships a breaking layout change — compatibility with `@latest` is currently re-verified by hand, once per exploration session, with no record between sessions.

## What Changes

- Add a `canary` job to `.github/workflows/ci.yml`: installs `@fission-ai/openspec@latest`, prints `openspec --version` so the failing version is visible in logs, and runs `openspec validate --all --strict --no-interactive` against the repo vault.
- Triggers: the same `pull_request` and push-to-`main` events as the existing jobs, plus a weekly `schedule` cron (Monday 06:00 UTC) so drift is caught even when the repo is quiet.
- The job does not set `continue-on-error`: a red job is the signal. The repository's branch ruleset names no required status checks, so a red canary is advisory by construction — it never blocks merging.
- The pinned `specs` job is untouched and stays the sole authoritative merge gate; the canary never replaces or gates on it.
- README's CI-snippet/compatibility section gains one sentence documenting the canary and the currently verified version range (1.4.1 pinned, 1.6.0 canary-verified 2026-07-17).

## Capabilities

### New Capabilities

- `canary`: an advisory CI job that continuously validates this vault against the latest published OpenSpec CLI release, surfacing upstream drift without touching the pinned merge gate.

### Modified Capabilities

- _None._

## Impact

- Modified: `.github/workflows/ci.yml` (one new `canary` job plus a workflow-level `schedule` trigger), `README.md` (one sentence in the CI-snippet/compatibility section).
- No `lib/`, `bin/`, or `assets/` changes — tool behavior is untouched.
- No change to the pinned `1.4.1` validate gate and no change to publishing.
</content>
<parameter name="i">Create proposal