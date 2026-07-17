---
type: tasks
change: add-upgrade-command
tags: [openspec, type/tasks, capability/upgrade]
aliases: ["add-upgrade-command tasks"]
---

## 1. Upgrade helpers and command

- [ ] 1.1 Add `lib/upgrade.mjs`: `UpgradeError` class; `assetStates(root, assetsDir)` walking the packaged `assets/` tree and classifying each installed counterpart as `{relpath, status: "current"|"stale"|"missing", ownership: "tool"|"user"|"append-only"}` via LF-normalized content comparison (whole-file equality for tool/user-owned, substring containment for the append-only config-rules block); `upgrade(root, {dryRun})` that throws `UpgradeError` when `openspec/schemas/spec-driven/` is absent, otherwise rewrites/creates non-current tool-owned files (skipped entirely under `dryRun`), never writes user-owned or append-only files, and logs `UPDATED <path>` / `SKIP <path> (current)` / `WOULD UPDATE <path>` / a final `UPGRADE OK` — verify: `npm test`

## 2. CLI wiring

- [ ] 2.1 Wire `upgrade` into `bin/cli.mjs`: dispatch case parsing `--root` and `--dry-run`, USAGE text describing the flags, and `UpgradeError` added to the known-error union mapped to exit 1 — verify: `node bin/cli.mjs upgrade --root <tmpdir-without-schemas> --dry-run` prints an `UpgradeError` message and exits 1, and the same command against a tmpdir that has run `init` first prints `WOULD UPDATE`/`SKIP` lines and exits 0

## 3. Tests

- [ ] 3.1 Add `test/upgrade.test.mjs` covering: a stale tool-owned template is detected and reported `stale`; a CRLF-only difference from the packaged asset is reported `current`, not `stale`; a missing tool-owned file is reported `missing` and gets created on `upgrade()`; `obsidian.yaml`/`dashboard.base` drift is reported but never written; a config-rules mismatch prints the packaged block and leaves `config.yaml` byte-unchanged; `--dry-run` writes nothing and prints `WOULD UPDATE` lines; the missing-`schemas/spec-driven/` guard throws `UpgradeError` — verify: `node --test test/upgrade.test.mjs`

## 4. Documentation

- [ ] 4.1 Add a README section documenting `openspec-obsidian upgrade [--root <dir>] [--dry-run]`: what it detects, what it rewrites vs. only reports, and a pointer to the `UPGRADING.md` convention for the manual-merge case it surfaces — verify: `grep -q "openspec-obsidian upgrade" README.md && grep -q "UPGRADING.md" README.md`

## 5. Spec validation

- [ ] 5.1 Validate the new `upgrade` capability delta against the OpenSpec schema — verify: `npm run opsx:validate`
