---
type: design
change: add-upstream-canary
tags: [openspec, type/design, capability/canary]
aliases: ["add-upstream-canary design"]
---

## Context

`.github/workflows/ci.yml` currently runs `test` (unit tests) and `specs` (installs `@fission-ai/openspec@1.4.1`, then `npm run opsx:validate` / `opsx:check`) on `pull_request` and push-to-`main`; `version` tags releases via GitVersion. The `1.4.1` pin exists so the merge gate never shifts mid-PR. Upstream has moved to `1.6.0` (2026-07-10); a live check that day confirmed `openspec@1.6.0 validate --all --strict` still passes 10/10 on this vault, but that confirmation lived only in a session, not in CI. Upstream 1.5 also shipped a beta "Stores" model flagged to eventually replace the `specs`/`changes` layout this repo's archive/backfill/dashboard modules re-derive; a canary is the cheapest early-warning signal for that class of break.

## Goals / Non-Goals

**Goals:**
- Continuously verify this vault against the latest published OpenSpec CLI release, without ever moving the pinned merge gate.
- Make a compatibility break visible in CI logs (failing job, printed version) the moment it lands upstream, and again weekly even with no repo activity.
- Record the last-verified compatibility range somewhere a reader sees it, not only in session memory.

**Non-Goals:**
- Changing the pinned `1.4.1` `specs` validate gate, or any publishing workflow.
- Any `lib/` code change — this is CI/docs only.
- Auto-bumping the pin, auto-filing issues on canary failure, or migrating to the Stores model — follow-ups if the canary fires.

## Decisions

- **New `canary` job, not a modification of `specs`.** Keeps the pinned gate's steps untouched and auditable; the canary is purely additive.
- **Steps:** `npm install -g @fission-ai/openspec@latest`, then `openspec --version` (so the exact failing version is visible in logs before validation runs), then `openspec validate --all --strict --no-interactive` against the repo vault. No `opsx:check` — that exercises this repo's own CLI, not upstream compatibility.
- **Triggers:** the job runs on the same `pull_request` and push-to-`main` events as `test`/`specs`, plus a workflow-level `schedule: - cron: '0 6 * * 1'` (Monday 06:00 UTC) so drift is caught during quiet weeks with no PR or push activity.
- **No `continue-on-error`.** A visibly red job is the intended signal, not a suppressed warning buried in a green checkmark.
- **Advisory by construction, not by configuration.** The repository's branch ruleset (`protect-main`) names no required status checks, so a failing `canary` job never blocks a PR from merging — this is a property of the existing ruleset, not something this change configures defensively. No `if: always()` continuation logic or required-checks edit is needed or in scope.
- **`specs` stays authoritative.** The canary never gates `version` or any other job, and nothing depends on it; it exists purely for visibility.
- **README documents the range, not a live badge.** One sentence in the CI-snippet/compatibility section states the pinned version (`1.4.1`) and the last canary-verified version with a date (`1.6.0`, `2026-07-17`), updated by hand when the canary is next re-verified — no automation to keep it current is introduced here.

## Risks / Trade-offs

- GitHub Actions `schedule` triggers only fire on the default branch, so the weekly run reflects `main`'s state, not open PRs — acceptable since the goal is ambient drift detection, not per-PR gating.
- A transient upstream publish flake (e.g. a bad npm release later yanked) can turn the canary red without a real compatibility break; because it is advisory, this costs a noisy log rather than a blocked merge.
- Weekly cadence means a same-day breaking release can go undetected for up to a week if no PR/push happens to trigger it in between; acceptable given the advisory intent and the low cost of the job.
- The README sentence is a manually maintained snapshot and will itself go stale between canary runs; documented as a known limitation rather than solved here (an auto-updating badge is a possible follow-up, out of scope).
</content>
<parameter name="i">Create design