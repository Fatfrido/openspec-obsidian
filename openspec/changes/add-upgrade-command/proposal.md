---
type: proposal
change: add-upgrade-command
tags: [openspec, type/proposal, capability/upgrade]
aliases: ["add-upgrade-command proposal"]
design: "[[changes/add-upgrade-command/design|add-upgrade-command design]]"
tasks: "[[changes/add-upgrade-command/tasks|add-upgrade-command tasks]]"
specs: ["[[changes/add-upgrade-command/specs/upgrade/spec|add-upgrade-command upgrade delta]]"]
---

## Why

`init` installs snapshots of `assets/` (`schema.yaml`, `templates/*.md`, the `config.yaml` rules block) into adopter repos and never touches them again. When openspec-obsidian ships improved assets, adopters have no path forward: `init --force` clobbers local edits, doing nothing means silent staleness, and `npx github:` users always run HEAD CLI code against arbitrarily old installed assets. There is not even a way to detect that assets have drifted. The merged `add-contribution-gates` change explicitly non-goal'd this; this change is the follow-up.

## What Changes

- New command `openspec-obsidian upgrade [--root <dir>] [--dry-run]` and new `lib/upgrade.mjs` exporting `UpgradeError` and pure helpers: `assetStates(root, assetsDir)` (per-file `{relpath, status, ownership}`) and `upgrade(root, {dryRun})`.
- Staleness is a plain content comparison against the packaged `assets/`, LF-normalized on both sides — no version bookkeeping, no manifest, so `init` stays untouched and the check stays deterministic.
- Three ownership classes drive the action taken: tool-owned files (schema, templates) are rewritten when stale or created when missing; user-owned files (`obsidian.yaml`, `dashboard.base`) are never written, drift is INFO-only; the append-only config-rules block is report-only — a containment check against `config.yaml`, printing the packaged block for manual merge on mismatch, mirroring `init`'s existing never-structured-merge stance.
- `--dry-run` prints `WOULD UPDATE <path>` and writes nothing; a real run logs `UPDATED <path>` / `SKIP <path> (current)` per file and ends with `UPGRADE OK`. Running against a repo with no `openspec/schemas/spec-driven/` throws, directing the adopter to run `init` first.
- `bin/cli.mjs` gains the `upgrade` dispatch entry, USAGE text, and the `UpgradeError` -> exit 1 mapping.
- README gains an upgrade section pointing adopters at the command and the `UPGRADING.md` convention for the manual-merge case.

## Capabilities

### New Capabilities

- `upgrade`: detects and refreshes stale tool-owned assets that `init` installed, and reports drift in user-owned and append-only assets for manual handling.

## Impact

- New files: `lib/upgrade.mjs`, `test/upgrade.test.mjs`.
- Modified: `bin/cli.mjs` (dispatch, USAGE, error union), `README.md` (upgrade section).
- No changes to `lib/init.mjs`, `assets/`, `openspec/obsidian.yaml`, or `openspec/dashboard.base` content.
