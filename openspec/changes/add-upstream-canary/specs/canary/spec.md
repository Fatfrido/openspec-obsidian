---
type: spec-delta
change: add-upstream-canary
capability: canary
tags: [openspec, type/spec, capability/canary]
aliases: ["add-upstream-canary canary delta"]
main_spec: "[[specs/canary/spec|canary spec]]"
---

## ADDED Requirements

### Requirement: Validate the vault against the latest OpenSpec release
CI SHALL run a `canary` job that installs `@fission-ai/openspec@latest`, prints `openspec --version`, and runs `openspec validate --all --strict --no-interactive` against the repository vault on every pull request, on every push to `main`, and on a weekly schedule, with no `continue-on-error`, so upstream drift fails the job visibly while never blocking merges because the branch ruleset names no required status checks.

#### Scenario: Pull request or push run validates against latest
- **WHEN** a pull request is opened or updated, or a commit is pushed to `main`
- **THEN** the `canary` job installs `@fission-ai/openspec@latest`, logs `openspec --version`, and runs `openspec validate --all --strict --no-interactive`
- **AND** the pinned `specs` job runs independently against `@fission-ai/openspec@1.4.1` and remains the sole authoritative merge gate

#### Scenario: Weekly scheduled run detects drift on a quiet repo
- **WHEN** no pull request or push occurs for a week
- **THEN** the `canary` job still runs, triggered by the workflow's `schedule` cron for Monday 06:00 UTC

#### Scenario: Latest-release failure surfaces without blocking merges
- **WHEN** `@fission-ai/openspec@latest` breaks frontmatter tolerance, the delta-header grammar, or otherwise fails strict validation on this vault
- **THEN** the `canary` job fails red, visibly, with no `continue-on-error` suppressing it
- **AND** because the branch ruleset names no required status checks for `canary`, the failure does not block merging and the pinned `specs` job stays green

### Requirement: Surface the tested compatibility range
The README's CI-snippet/compatibility section SHALL name both the pinned OpenSpec CLI version used for the merge gate and the version last confirmed compatible by the canary, together with the date it was last verified.

#### Scenario: Reader finds the verified compatibility range
- **WHEN** a reader opens the README CI-snippet/compatibility section
- **THEN** it states the pinned version (`1.4.1`) used for the merge gate
- **AND** states the version last confirmed by the canary (`1.6.0`, verified 2026-07-17)
</content>
<parameter name="i">Create canary delta spec