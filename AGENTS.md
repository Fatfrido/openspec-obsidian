# Repository Guidelines

## Project Overview

`openspec-obsidian` is a small Node ESM command-line tool that layers **Obsidian-vault conventions onto [OpenSpec](https://github.com/Fission-AI/OpenSpec) artifacts** so an `openspec/` directory can be browsed as a linked knowledge graph. It adds YAML frontmatter (type, tags, aliases), path-based wikilinks, and a tag taxonomy to specs/proposals/designs/tasks, and provides a deterministic archive step that syncs delta specs into the live specs and rewrites links when a change completes. The OpenSpec CLI (verified v1.4.1) ignores the injected frontmatter, so `validate --strict` behaves identically.

There is no runtime application — the deliverable is the CLI plus the static `assets/` it installs. It publishes as `bin/openspec-obsidian` and is typically run via `npx github:Fatfrido/openspec-obsidian <cmd>`.

## Architecture & Data Flow

Single entrypoint dispatches to four self-contained lib modules:

```
bin/cli.mjs ──▶ lib/init.mjs      (seed schema + templates + config rules)
            ├─▶ lib/backfill.mjs  (add frontmatter to existing bare artifacts)
            ├─▶ lib/archive.mjs   (sync deltas → specs, move completed changes; also: check)
            └─▶ lib/dashboard.mjs (generate openspec/dashboard.md + seed dashboard.base)
```

- **`bin/cli.mjs`** is the *only* file that touches `process.argv`/`process.exit`. It parses args (hand-rolled `parseArgs`, no library), resolves `root = path.resolve(args.root ?? process.cwd())`, calls exactly one lib function inside a `try/catch`, and maps thrown typed errors to exit codes.
- Each lib module **re-derives `path.join(root, "openspec")` locally** — there is deliberately no shared `paths` helper. `walkMd(dir)` (recursive `.md` collector) and the wikilink regex `/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g` are duplicated verbatim across `backfill.mjs`, `archive.mjs`, and `dashboard.mjs`.
- **Frontmatter and wikilinks are hand-built strings** — no YAML library, no markdown parser. `backfill.generateFrontmatter()` and `archive.newSpecHead()` each emit equivalent blocks independently.
- **Operational order:** `init` → `backfill` → author changes under `openspec/changes/<id>/` → `archive` → `check` (CI gate).
- **Consistency guarantees:** `backfill` post-write-verifies that every generated `[[target|alias]]` resolves to `openspec/<target>.md` on disk (else `BackfillError`). `archive` **syncs all complete changes into main specs before moving any change dir** ("a hard error aborts before any move so a failed run never leaves a half-archived change"), stamps `YYYY-MM-DD`, rewrites intra-change link prefixes, and re-verifies links after the move.
- `archive`/`check` write GitHub Actions job outputs (`archived=`, `synced_caps=`) to `$GITHUB_OUTPUT` when that env var is set; `check` is strictly read-only.

## Key Directories

| Path | Purpose |
|---|---|
| `bin/` | CLI entrypoint (`cli.mjs`) — arg parsing, dispatch, exit codes |
| `lib/` | Command implementations: `init.mjs`, `backfill.mjs`, `archive.mjs`, `dashboard.mjs` |
| `assets/` | Static data: `schema.yaml`, `config-rules.yaml`, `templates/*.md` (installed by `init`), `dashboard.base` (seeded by `dashboard`) |
| `assets/templates/` | Obsidian-aware artifact scaffolds: `proposal.md`, `spec.md`, `design.md`, `tasks.md` |
| `test/` | `node:test` suites, one per lib module (`archive.test.mjs`, `backfill.test.mjs`, `dashboard.test.mjs`) |
| `.github/workflows/` | `ci.yml` — runs `npm test` on Node 20 |

`files: ["bin", "lib", "assets"]` in `package.json` — only these three dirs are published.

## Development Commands

```bash
npm test                 # node --test test/*.test.mjs  (Node's native runner)

# CLI (run against a repo root that is already an OpenSpec project)
node bin/cli.mjs init [--root <dir>] [--force]      # install schema/templates/rules
node bin/cli.mjs backfill [--root <dir>] [--dry-run]# add frontmatter (idempotent)
node bin/cli.mjs archive [--root <dir>]             # sync deltas + archive complete changes
node bin/cli.mjs check [--root <dir>]               # CI gate: exit 1 if complete-but-unarchived
node bin/cli.mjs dashboard [--root <dir>] [--dry-run] [--force]  # generate openspec/dashboard.md + seed dashboard.base
```

There are **no build, lint, or format scripts** — `package.json` declares only `test`. No bundler/transpiler (ships `.mjs` directly).

Flags: `--root <dir>` (all commands, default cwd), `--dry-run` (`backfill`, `dashboard`), `--force` (`init` overwrites schema/template files; `dashboard` overwrites `dashboard.base`).

## Change Lifecycle (SDLC)

One OpenSpec change = one branch = one PR. Specs and code always merge together so `main` is never spec-inconsistent.

1. **Explore** — `/opsx:explore` (non-mutating) until the idea is crisp. Cheap to abandon; nothing is written.
2. **Propose** — branch `feat/<change-id>` off `main`, run `/opsx:propose`, then `openspec validate "<change-id>" --strict`. Commit artifacts: `docs(openspec): propose <change-id>`. **Human reviews proposal + delta specs here — this is the cheapest point to catch a wrong build.**
3. **Apply** — `/opsx:apply` implements tasks. Commit per task group (`feat(scope): …`), flipping `- [x]` in `tasks.md` in the same commit as the code it tracks.
4. **Verify** — `npm test` (Node's native runner; all `test/*.test.mjs` pass). Add or extend a `node:test` suite for any behavior change.
5. **Sync + Archive (automatic, at apply-time)** — the final `/opsx:apply` step (all tasks
   complete) runs `npm run opsx:archive`: it syncs delta specs into
   `openspec/specs/`, moves the change to `openspec/changes/archive/YYYY-MM-DD-<change-id>/`,
   and rewrites its wikilinks; then `npm run opsx:dashboard` refreshes `openspec/dashboard.md` and `npm run opsx:validate` must pass and the results
   are committed on the feature branch as `docs(openspec): sync …` + `chore(openspec): archive …`
   before the PR is readied. CI runs `npm run opsx:check` and fails any
   complete-but-unarchived change. `/opsx:sync` / `/opsx:archive` remain as manual fallbacks
   (offline cleanup, changes without PRs).
6. **PR** — push, open a PR titled with Conventional Commits and fill in the PR template
   (`.github/pull_request_template.md`). CI gates on `npm test`, `npm run opsx:validate`, and the
   archive gate (`npm run opsx:check`) plus a dashboard-staleness gate (`npm run opsx:dashboard` then `git diff --exit-code`); on a push to `main`, GitVersion tags the release commit.
   Squash-merge whenever CI is green; delete the branch.

Working with a high-reasoning model (Opus-class): spend it on **explore + propose** (design is where wrong turns are expensive); `apply` on a well-specified `tasks.md` is mechanical and any model can drive it. Keep changes small — one capability per change; if a proposal wants two capabilities, split it. `openspec/config.yaml` context/rules are injected into every artifact generation — maintain them there instead of re-explaining conventions per session.

## Code Conventions & Common Patterns

- **ESM only.** `"type": "module"`, `.mjs` extensions, `node:`-prefixed builtin imports (`import fs from "node:fs"`). Named exports; `bin/cli.mjs` imports specific functions + error classes from each lib.
- **Synchronous `fs` throughout** — `existsSync`/`readFileSync`/`writeFileSync`/`mkdirSync`/`copyFileSync`/`appendFileSync`/`renameSync`. No `fs/promises`, no `async` I/O (commands are `async`-free; only tests use `async (t)`).
- **Typed error classes as the failure channel.** Each lib exports `class XError extends Error {}` (`InitError`, `BackfillError`, `ArchiveError`, `DashboardError`) and *throws* on failure. `bin/cli.mjs` catches: known error → print `err.message`; unknown → print raw `err`; then `process.exit(1)`.
- **Exit codes:** `0` ok, `1` failure (any thrown error), `2` usage (bad/missing command → prints `USAGE` to stderr).
- **Status logging via verb-prefixed lines** to stdout: `WROTE`, `SKIP … (exists; use --force)`, `ADD`, `ARCHIVED`, `NOTHING TO ARCHIVE`, `CHECK OK`, `BACKFILL OK`, `DASHBOARD`. Errors go to stderr.
- **Pure, exported helpers for testability.** `archive.mjs` exports 12 symbols (`parseBlocks`, `parseDelta`, `parseSpec`, `applyOps`, `syncChange`, `moveChange`, `taskState`, `check`, …); `backfill.mjs` exports `deriveArtifact`, `generateFrontmatter`, `backfill`. Tests call these directly (no subprocess).
- **Never structured-merge YAML.** `init` appends the `rules:` block as raw text to `openspec/config.yaml` (prints for manual merge if a `rules:` already exists) — comment: "never attempt structured YAML merging".
- **Path normalization for Windows:** `deriveArtifact` normalizes `\` → `/` before matching; artifact paths are classified by regex against `specs/<cap>/spec.md`, `changes/<id>/…`, `changes/archive/<date>-<id>/…`.
- **Convention rules the tool enforces** (see `assets/config-rules.yaml`, README): frontmatter-only tags (never inline `#tags` in requirement bodies), path wikilinks with display labels `[[changes/<id>/design|<id> design]]` (never bare aliases), and one-direction linking (proposal→design/tasks/deltas, delta→main spec; reverse comes free via Obsidian backlinks).
- **OpenSpec artifacts:** a change is a dir `openspec/changes/<id>/` with `proposal.md`, `design.md`, `tasks.md`. Spec deltas use section headers `## ADDED|MODIFIED|REMOVED|RENAMED Requirements`. Tasks are tracked as `- [ ]` / `- [x]` and flipped as work completes; sync merges deltas into `openspec/specs/<capability>/spec.md`.
- **Workflow guardrail (from the skills):** never copy the `context`/`rules` blocks from `openspec/config.yaml` into generated artifact files; always verify each artifact file exists after writing.
- **Runtime sync:** `.claude` and `.pi` skill bodies are near-identical mirrors — when editing one, update the other (differences are only invocation syntax: colon `/opsx:name` vs hyphen `/opsx-name`).
- **Git:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, …) for commits and PR titles. Work on a feature branch; never commit directly to `main`.

## Important Files

- `bin/cli.mjs` — entrypoint; `parseArgs`, command dispatch, exit-code mapping, `USAGE` text.
- `lib/archive.mjs` — largest module; delta parsing (`parseDelta`/`parseBlocks`/`applyOps` for ADDED/MODIFIED/REMOVED/RENAMED), `syncChange`, `moveChange` (link rewrite + verify), `taskState` (counts `- [x]`/`- [ ]`), `archive`, `check`.
- `lib/backfill.mjs` — `deriveArtifact` (classify by path), `generateFrontmatter` (per-kind YAML block), idempotent `backfill` (skips files starting with `---`), post-write link verification.
- `lib/dashboard.mjs` — `collectChanges`/`collectSpecs`/`renderDashboard` (pure, exported) + `dashboard()`; computes task progress and requirement counts from `fs` and writes `openspec/dashboard.md` (deterministic), seeding `openspec/dashboard.base` when absent.
- `lib/init.mjs` — copies `assets/schema.yaml` → `openspec/schemas/spec-driven/schema.yaml` and `assets/templates/*.md` → `openspec/schemas/spec-driven/templates/`, appends config rules, gitignores `openspec/.obsidian/`. Guards: throws if `openspec/config.yaml` absent.
- `assets/schema.yaml` — OpenSpec workflow graph: `artifacts` (id/generates/template/instruction/requires) + `apply` block.
- `assets/config-rules.yaml` — `rules:` map (proposal/specs/design/tasks) spliced into `openspec/config.yaml`.
- `assets/templates/{proposal,spec,design,tasks}.md` — scaffolds; frontmatter uses `<change-id>`/`<capability>` angle-bracket tokens and `<!-- … -->` body placeholders (no Mustache `{{ }}`).
- `assets/dashboard.base` — Obsidian Bases view seeded by `dashboard` into `openspec/dashboard.base` (native DB view over artifact frontmatter).
- `package.json` — `bin` mapping, `engines.node >= 20`, `files` whitelist, single `test` script.
- `.github/workflows/ci.yml` — CI definition.
- `README.md` — authoritative spec of the conventions, adoption steps, and CI snippets.

## Runtime/Tooling Preferences

- **Runtime:** Node.js **>= 20** (`engines.node`), and CI pins `node-version: 20` exactly. Uses `node --test` (native runner) — do not add jest/mocha/vitest.
- **Package manager: npm.** No `packageManager` field, no `bun.lockb`/`yarn.lock`/`pnpm-lock.yaml`; CI runs `npm test`. Do not introduce Bun/Yarn/pnpm.
- **Zero dependencies.** `package.json` declares no `dependencies` or `devDependencies`; the tool relies only on Node builtins. Keep it dependency-free — hand-rolled parsing/frontmatter is intentional.
- No linter, formatter, or bundler is configured. `.gitignore` ignores only `node_modules/`.
- License: MIT.

## Testing & QA

- **Framework:** Node's built-in runner — `import { test } from "node:test"` + `import assert from "node:assert/strict"`. No external test deps.
- **Run:** `npm test` (`node --test test/*.test.mjs`). CI runs the same on every PR and on push to `main`.
- **Structure:** one test file per lib module (`archive.test.mjs`, `backfill.test.mjs`, `dashboard.test.mjs`). Top-level `test(name, async (t) => …)`; `archive.test.mjs` nests `await t.test("sub-case", …)` for related sub-scenarios (numbered cases 1–8).
- **Fixtures:** each test builds a real temp OpenSpec tree via `fs.mkdtempSync(path.join(os.tmpdir(), "opsx-…"))`, writes files with a `writeFile(root, rel, content)` helper (`mkdirSync {recursive:true}` first), and tears down with `t.after(() => fs.rmSync(root, {recursive:true, force:true}))`.
- **Assertion style:** determinism-focused — golden **byte-for-byte** `assert.equal` on full file contents, plus `assert.throws` matching the custom error class (`ArchiveError`/`BackfillError`) and a message regex for every error path (missing headings, existing archive target, unresolved links, incomplete tasks).
- **Coverage focus:** delta ops + idempotency + wikilink rewrite/resolution + `check` gate (`archive.test.mjs`); artifact classification, golden frontmatter for all five artifact types, idempotency, dry-run, and link-verification failure (`backfill.test.mjs`).
- **Gap to note:** `lib/init.mjs` has **no dedicated test file**; no coverage tooling is configured. Prefer adding pure, directly-importable helpers when extending, so new behavior is unit-testable without a subprocess.
