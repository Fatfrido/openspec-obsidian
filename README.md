# openspec-obsidian

[![npm version](https://img.shields.io/npm/v/openspec-obsidian)](https://www.npmjs.com/package/openspec-obsidian)
[![CI](https://img.shields.io/github/actions/workflow/status/Fatfrido/openspec-obsidian/ci.yml?branch=main&label=CI)](https://github.com/Fatfrido/openspec-obsidian/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/github/license/Fatfrido/openspec-obsidian)](LICENSE)

Navigate [OpenSpec](https://github.com/Fission-AI/OpenSpec) artifacts as an Obsidian vault: frontmatter, path-wikilinks, tags, and a deterministic archive step with link rewrite.

## What & why

OpenSpec keeps a capability's history scattered across plain markdown: the live spec under `specs/<capability>/`, and every change that shaped it under `changes/<id>/` and `changes/archive/YYYY-MM-DD-<id>/`. Opening `openspec/` as an Obsidian vault unifies all of it into one graph: click from a proposal to its design, tasks, and delta specs; land on a main spec and see every delta that ever touched it via backlinks; filter by `capability/<name>` tag and get the full history of that capability across active and archived changes — no directory spelunking.

The conventions are pure frontmatter. The OpenSpec CLI (verified against v1.4.1) ignores the YAML block, so `validate --strict` and `show` behave identically with or without it.

## The conventions

### Frontmatter schema per artifact type

| Artifact | File | Keys |
|---|---|---|
| Main spec | `specs/<cap>/spec.md` | `type: spec`, `title: "<cap> spec"`, `capability`, `tags: [openspec, type/spec, capability/<cap>]`, `aliases: ["<cap> spec"]` |
| Proposal | `changes/<id>/proposal.md` | `type: proposal`, `title: "<id> proposal"`, `change`, `tags: [openspec, type/proposal, capability/<c>…]` (one per delta), `aliases: ["<id> proposal"]`, plus links: `design`, `tasks`, `specs` (each only if the target file exists) |
| Design | `changes/<id>/design.md` | `type: design`, `title: "<id> design"`, `change`, `tags: [openspec, type/design, capability/<c>…]`, `aliases: ["<id> design"]` |
| Tasks | `changes/<id>/tasks.md` | `type: tasks`, `title: "<id> tasks"`, `change`, `tags: [openspec, type/tasks, capability/<c>…]`, `aliases: ["<id> tasks"]` |
| Delta spec | `changes/<id>/specs/<cap>/spec.md` | `type: spec-delta`, `title: "<id> <cap> delta"`, `change`, `capability`, `tags: [openspec, type/spec, capability/<cap>]`, `aliases: ["<id> <cap> delta"]`, `main_spec: "[[specs/<cap>/spec\|<cap> spec]]"` |

Archived changes use the same shapes with the wikilink prefix `changes/archive/YYYY-MM-DD-<id>/`.

### Tag taxonomy

Three tag families, **frontmatter-only**: `openspec` (everything), `type/<artifact>` (`type/spec`, `type/proposal`, `type/design`, `type/tasks`), and `capability/<name>`. Never put inline `#tags` in artifact bodies — an inline tag inside a requirement line is absorbed into the CLI's extracted requirement text (verified gotcha).

### Path wikilinks, never aliases

Obsidian resolves `[[…]]` by **path/filename only** — aliases are autocomplete sugar, and a bare `[[my alias]]` opens a new empty note when clicked. Every link is therefore a vault-relative path wikilink with a display label: `[[changes/<id>/design|<id> design]]`. The `aliases` key stays for search and display; it is never a link target.

### One-direction linking

Links are authored one way only — proposal → design/tasks/deltas, delta → main spec. The reverse direction (main spec → its deltas, design → its proposal) comes free via Obsidian backlinks. No link maintenance in two places.

### Graph node labels — Front Matter Title (optional)

Obsidian labels every graph node with its file **basename**, and OpenSpec fixes those basenames (`proposal.md`, `design.md`, `tasks.md`, `spec.md`) — so the graph is a sea of identically-named `spec`/`proposal` nodes that can only be told apart by opening them. Aliases and link labels do not affect graph labels, and renaming artifact files would break the OpenSpec CLI and this tool's parsers.

Every artifact therefore carries a `title` key (mirroring its primary alias, e.g. `add-widgets proposal`, `backfill spec`) stamped by `backfill`. The community plugin [Front Matter Title](https://github.com/snezhig/obsidian-front-matter-title) renders that key as the node label everywhere — graph, explorer, search, tabs — with no filename changes:

1. Install **Front Matter Title** from Community Plugins and enable it.
2. Its default template is the `title` key, so no configuration is needed for the explorer/search/tab replacements.
3. Turn on the plugin's **Graph** feature (Settings → Front Matter Title → Features → Graph) to relabel graph nodes too.

Strictly optional: without the plugin, `title` is inert frontmatter — the OpenSpec CLI ignores it (`validate --strict` is unchanged) and the vault behaves exactly as before; the graph is just not as readable. `backfill` also inserts a missing `title` into artifacts that already have frontmatter, so vaults backfilled before this key existed converge on the next `backfill` run.

## Install

From the npm registry:

```bash
npx openspec-obsidian <command>          # run without installing
npm install --save-dev openspec-obsidian # or pin as a dev dependency
```

Pin an exact commit or run ahead of a release with the `github:` form: `npx github:Fatfrido/openspec-obsidian#<sha> <command>` runs straight from the repo. See [Releasing](#releasing-maintainers) for how versions reach npm.

## Adopt in your repo

Your repo must already be an OpenSpec project (`openspec init`, CLI v1.4.x). Then:

```bash
openspec-obsidian init        # install schema + templates + config rules; gitignore openspec/.obsidian/
openspec-obsidian backfill    # add frontmatter to every existing bare artifact
```

`init` installs the Obsidian-aware artifact templates into `openspec/schemas/spec-driven/` (existing files are skipped unless `--force`) and appends the authoring `rules:` block to `openspec/config.yaml` (printed for manual merge if you already have one). `backfill` is idempotent — files that already have frontmatter are never touched — and verifies every generated wikilink resolves before it succeeds; use `--dry-run` to preview. Then open `openspec/` as a vault in Obsidian; workspace state stays untracked via the gitignored `openspec/.obsidian/`.

## Optional features

Some capabilities are opt-in. They are controlled by a tool-owned config file, `openspec/obsidian.yaml`, holding a `features:` map of booleans:

```yaml
features:
  dashboard: true
```

Optional features default **off**: an absent file, an absent `features:` key, or an unlisted name all mean disabled. `openspec-obsidian init` seeds this file with every optional feature set to `false` and never overwrites it afterwards (not even with `--force`) — it records your choices, not reinstallable scaffolding. The core commands (`init`, `backfill`, `archive`, `check`) are never gated. Unknown feature names are ignored, so a newer config keeps working with an older tool.

Today the only optional feature is `dashboard` (below).

**Migration:** if you used the dashboard before feature toggles existed, `dashboard` now errors until you enable it — add the two `features:` lines above to `openspec/obsidian.yaml`. Existing dashboard output is otherwise unaffected.

## Dashboard

Generate a single navigable overview of the `openspec/` tree:

```bash
openspec-obsidian dashboard
```

> Requires the `dashboard` [optional feature](#optional-features): add `features:` with `dashboard: true` to `openspec/obsidian.yaml` first, or the command exits with an actionable error.

It writes `openspec/dashboard.md` — a deterministic, wikilinked summary of every active change (task progress and completeness), the capability catalog (requirement counts), and archived history — computed from the vault with `node:fs`, no OpenSpec CLI. It also seeds `openspec/dashboard.base`, a native [Obsidian Bases](https://help.obsidian.md/bases) view over artifact frontmatter, when that file is absent (`--force` overwrites it; `--dry-run` previews). Both outputs live in the tracked vault body, never in the gitignored `openspec/.obsidian/`.

The note is a snapshot: re-run `dashboard` whenever changes or specs move — in particular right after `archive` — so it stays current. When the `dashboard` feature is enabled, `check` fails on a missing or stale `openspec/dashboard.md` (see CI snippets below), so drift is caught without a separate step. Open `openspec/dashboard.md` in Obsidian as your entry point (bookmark it), or the `.base` for live filtering and sorting.

## Example: this repo dogfoods openspec-obsidian

`openspec/` in this repository is a worked example, produced by exactly the steps above. It was bootstrapped with `openspec init`, then `openspec-obsidian init`, and the CLI's own behavior was documented through the full workflow: the `adopt-openspec-obsidian` change (proposal + design + tasks + four delta specs) was authored and then synced and moved with `openspec-obsidian archive`. Browse:

- `openspec/specs/{init,backfill,archive,check}/spec.md` — the live capability specs (open `openspec/` as an Obsidian vault to walk the graph and tag taxonomy).
- `openspec/changes/archive/<date>-adopt-openspec-obsidian/` — the archived change, with its intra-change path wikilinks rewritten to the archived location.
- `.github/workflows/ci.yml` — the `specs` job gating on `openspec validate --all --strict` and `openspec-obsidian check`.

## Archive: when and how

**Recommendation: archive at apply-completion, on the PR branch.** When the last task checkbox flips to `- [x]`, run:

```bash
openspec-obsidian archive
```

It deterministically: syncs delta specs into `openspec/specs/` (ADDED/MODIFIED/REMOVED/RENAMED merge), moves each all-tasks-complete change to `openspec/changes/archive/YYYY-MM-DD-<id>/`, rewrites the change's intra-change wikilink prefixes, and verifies every link still resolves — failing loudly on a broken link or an existing archive target. Changes with open tasks are skipped.

Commit the result on the feature branch (convention: `docs(openspec): sync <caps> specs` + `chore(openspec): archive <id>`), then squash-merge — the archive commits fold into the change's single commit on main. After the move, re-run `openspec-obsidian dashboard` and stage the refreshed `openspec/dashboard.md` with the archive commit so the overview never drifts. **No AI or agent is required for any of this, and no archive commits ever land on main directly.** Gate it with `check` in CI (below) so a complete-but-unarchived change can never merge.

## CI snippets

```yaml
  specs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g @fission-ai/openspec@1.4.1
      - run: openspec validate --all --strict --no-interactive
      - run: npx github:Fatfrido/openspec-obsidian check
```

`check` exits 1 (naming the offenders) when any change has all tasks complete but still sits under `openspec/changes/`, and — when the `dashboard` feature is enabled — also when `openspec/dashboard.md` is missing or stale (remedy: re-run `dashboard`). This single gate replaces the old regenerate-and-diff steps. For reproducible CI, pin a commit: `npx github:Fatfrido/openspec-obsidian#<sha> check` (`npx github:` needs network + git in the runner).

## Agent/skill integration

Paste-ready final step for an apply skill/prompt (after the implementation commit, before pushing):

> **Sync + archive on the branch**: run `openspec-obsidian archive` from the repo root. It syncs delta specs into `openspec/specs/`, moves the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`, rewrites its intra-change path wikilinks, and verifies links resolve. If it prints `NOTHING TO ARCHIVE`, stop and report (a task checkbox is still open). Then run `openspec validate --all --strict --no-interactive`. Commit in two commits: `git add openspec/specs` → `docs(openspec): sync <caps> specs`; then `git add -A` → `chore(openspec): archive <name>`.

For a manual archive skill, keep one guardrail: archive via the deterministic `archive` command; never hand-`mv` a change dir (a bare `mv` leaves the moved change's path wikilinks pointing at the old location).

## Releasing (maintainers)

Publishing to npm is automated by [`.github/workflows/publish.yml`](.github/workflows/publish.yml) and authenticates tokenlessly via **OIDC Trusted Publishing** — no npm token or other long-lived secret is stored.

One-time setup: on npmjs.com, add a Trusted Publisher for `openspec-obsidian` — provider **GitHub Actions**, repository **`Fatfrido/openspec-obsidian`**, workflow file **`publish.yml`**. The workflow requests an `id-token` and npm trusts that OIDC identity to publish.

To cut a release:

1. Bump `version` in `package.json` (SemVer) and merge to `main`.
2. Create a GitHub Release with tag `v<version>` (e.g. `v0.1.0`) matching that version.

Publishing the Release runs the workflow: it verifies the release tag equals `v<version>` from `package.json` (failing the release without publishing if they differ), then runs `npm test` and `npm publish --access public`. Provenance is attested automatically by Trusted Publishing. `workflow_dispatch` allows a manual run against `main`. Nothing is ever published from a developer machine.

## Contributing

Issues and pull requests are welcome at [github.com/Fatfrido/openspec-obsidian](https://github.com/Fatfrido/openspec-obsidian/issues). Run `npm test` before opening a PR and follow the [Conventional Commits](https://www.conventionalcommits.org/) schema for commit and PR titles.

## Compatibility

Verified against **OpenSpec CLI v1.4.1**: `openspec validate --all --strict` passes on a fully backfilled repo, and `openspec show --json` requirement extraction is unchanged with frontmatter present. The reference implementation of these conventions lives in [Fatfrido/maniac](https://github.com/Fatfrido/maniac) (`openspec/` tree + `.github/scripts/archive-change.mjs`).
