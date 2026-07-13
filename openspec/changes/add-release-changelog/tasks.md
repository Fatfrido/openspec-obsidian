---
type: tasks
title: "add-release-changelog tasks"
change: add-release-changelog
tags: [openspec, type/tasks, capability/changelog, capability/release]
aliases: ["add-release-changelog tasks"]
---

## 1. Changelog module

- [ ] 1.1 Add `lib/changelog.mjs` with `ChangelogError` and pure exported helpers: anchor parsing (topmost `## v` heading), commit bucketing (Breaking/Features/Fixes/Internal incl. `!`/`BREAKING CHANGE` detection), archive-id token matching, section rendering, and note prepend/create with frontmatter. Verify: `node --test test/changelog.test.mjs`.
- [ ] 1.2 Add thin git wrappers (`execFileSync` git: tag existence, `%cs` date, range log with subjects+bodies) and the `changelog(root, {release, dryRun})` entry composing them: self-anchored range, idempotent no-op, typed errors for missing git/tag/anchor. Verify: `node --test test/changelog.test.mjs`.
- [ ] 1.3 Add `test/changelog.test.mjs` (node:test, mkdtemp fixture repos built with real `git init`/commits/tags): golden byte-for-byte note for bootstrap and incremental sections, subsumed intermediate tags, bucketing incl. breaking precedence, archive wikilink match/no-match, dry-run, no-op re-run, and `assert.throws` ChangelogError for unknown tag. Verify: `npm test`.

## 2. CLI wiring

- [ ] 2.1 Dispatch `changelog` in `bin/cli.mjs` (`--root`, `--release <tag>`, `--dry-run`), extend USAGE, map `ChangelogError` to exit 1. Verify: `node bin/cli.mjs changelog --release v0.0.0 --root <fixture>` exits 1 with the typed message; `npm test`.

## 3. Release pipeline

- [ ] 3.1 Add the `changelog` job to `.github/workflows/publish.yml`: `needs: publish`, `if: github.event_name == 'release'`, `permissions: contents: write`, checkout `main` with `fetch-depth: 0` + `fetch-tags: true`, run `node bin/cli.mjs changelog --release "$TAG"`, commit `docs(changelog): <tag>` as github-actions[bot] and push (pull --rebase first; skip push when clean). Verify: `npx --yes yaml-lint .github/workflows/publish.yml`; end-to-end on first real release.

## 4. Documentation

- [ ] 4.1 README: add `changelog` to the command table and document the note format, self-anchoring, and the adopter workflow snippet; update the Releasing section with the release procedure (bump `package.json` to the target tag version, publish the GitHub Release on that tag, changelog commit follows automatically). Verify: `npm test`; proofread rendered README.

## 5. Dogfood and archive

- [ ] 5.1 Run `npm run opsx:validate`, `npm run opsx:check`, and `npm test`; then sync + archive this change (`npm run opsx:archive`, `npm run opsx:dashboard`) on the feature branch. Verify: all three commands pass and CI is green.
