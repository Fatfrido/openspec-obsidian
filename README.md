# openspec-obsidian

Navigate [OpenSpec](https://github.com/Fission-AI/OpenSpec) artifacts as an Obsidian vault: frontmatter, path-wikilinks, tags, and a deterministic archive step with link rewrite.

## What & why

OpenSpec keeps a capability's history scattered across plain markdown: the live spec under `specs/<capability>/`, and every change that shaped it under `changes/<id>/` and `changes/archive/YYYY-MM-DD-<id>/`. Opening `openspec/` as an Obsidian vault unifies all of it into one graph: click from a proposal to its design, tasks, and delta specs; land on a main spec and see every delta that ever touched it via backlinks; filter by `capability/<name>` tag and get the full history of that capability across active and archived changes — no directory spelunking.

The conventions are pure frontmatter. The OpenSpec CLI (verified against v1.4.1) ignores the YAML block, so `validate --strict` and `show` behave identically with or without it.

## The conventions

### Frontmatter schema per artifact type

| Artifact | File | Keys |
|---|---|---|
| Main spec | `specs/<cap>/spec.md` | `type: spec`, `capability`, `tags: [openspec, type/spec, capability/<cap>]`, `aliases: ["<cap> spec"]` |
| Proposal | `changes/<id>/proposal.md` | `type: proposal`, `change`, `tags: [openspec, type/proposal, capability/<c>…]` (one per delta), `aliases: ["<id> proposal"]`, plus links: `design`, `tasks`, `specs` (each only if the target file exists) |
| Design | `changes/<id>/design.md` | `type: design`, `change`, `tags: [openspec, type/design, capability/<c>…]`, `aliases: ["<id> design"]` |
| Tasks | `changes/<id>/tasks.md` | `type: tasks`, `change`, `tags: [openspec, type/tasks, capability/<c>…]`, `aliases: ["<id> tasks"]` |
| Delta spec | `changes/<id>/specs/<cap>/spec.md` | `type: spec-delta`, `change`, `capability`, `tags: [openspec, type/spec, capability/<cap>]`, `aliases: ["<id> <cap> delta"]`, `main_spec: "[[specs/<cap>/spec\|<cap> spec]]"` |

Archived changes use the same shapes with the wikilink prefix `changes/archive/YYYY-MM-DD-<id>/`.

### Tag taxonomy

Three tag families, **frontmatter-only**: `openspec` (everything), `type/<artifact>` (`type/spec`, `type/proposal`, `type/design`, `type/tasks`), and `capability/<name>`. Never put inline `#tags` in artifact bodies — an inline tag inside a requirement line is absorbed into the CLI's extracted requirement text (verified gotcha).

### Path wikilinks, never aliases

Obsidian resolves `[[…]]` by **path/filename only** — aliases are autocomplete sugar, and a bare `[[my alias]]` opens a new empty note when clicked. Every link is therefore a vault-relative path wikilink with a display label: `[[changes/<id>/design|<id> design]]`. The `aliases` key stays for search and display; it is never a link target.

### One-direction linking

Links are authored one way only — proposal → design/tasks/deltas, delta → main spec. The reverse direction (main spec → its deltas, design → its proposal) comes free via Obsidian backlinks. No link maintenance in two places.

## Adopt in your repo

Your repo must already be an OpenSpec project (`openspec init`, CLI v1.4.x). Then:

```bash
npx github:Fatfrido/openspec-obsidian init        # install schema + templates + config rules; gitignore openspec/.obsidian/
npx github:Fatfrido/openspec-obsidian backfill    # add frontmatter to every existing bare artifact
```

`init` installs the Obsidian-aware artifact templates into `openspec/schemas/spec-driven/` (existing files are skipped unless `--force`) and appends the authoring `rules:` block to `openspec/config.yaml` (printed for manual merge if you already have one). `backfill` is idempotent — files that already have frontmatter are never touched — and verifies every generated wikilink resolves before it succeeds; use `--dry-run` to preview. Then open `openspec/` as a vault in Obsidian; workspace state stays untracked via the gitignored `openspec/.obsidian/`.

## Example: this repo dogfoods openspec-obsidian

`openspec/` in this repository is a worked example, produced by exactly the steps above. It was bootstrapped with `openspec init`, then `openspec-obsidian init`, and the CLI's own behavior was documented through the full workflow: the `adopt-openspec-obsidian` change (proposal + design + tasks + four delta specs) was authored and then synced and moved with `openspec-obsidian archive`. Browse:

- `openspec/specs/{init,backfill,archive,check}/spec.md` — the live capability specs (open `openspec/` as an Obsidian vault to walk the graph and tag taxonomy).
- `openspec/changes/archive/<date>-adopt-openspec-obsidian/` — the archived change, with its intra-change path wikilinks rewritten to the archived location.
- `.github/workflows/ci.yml` — the `specs` job gating on `openspec validate --all --strict` and `openspec-obsidian check`.

## Archive: when and how

**Recommendation: archive at apply-completion, on the PR branch.** When the last task checkbox flips to `- [x]`, run:

```bash
npx github:Fatfrido/openspec-obsidian archive
```

It deterministically: syncs delta specs into `openspec/specs/` (ADDED/MODIFIED/REMOVED/RENAMED merge), moves each all-tasks-complete change to `openspec/changes/archive/YYYY-MM-DD-<id>/`, rewrites the change's intra-change wikilink prefixes, and verifies every link still resolves — failing loudly on a broken link or an existing archive target. Changes with open tasks are skipped.

Commit the result on the feature branch (convention: `docs(openspec): sync <caps> specs` + `chore(openspec): archive <id>`), then squash-merge — the archive commits fold into the change's single commit on main. **No AI or agent is required for any of this, and no archive commits ever land on main directly.** Gate it with `check` in CI (below) so a complete-but-unarchived change can never merge.

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

`check` exits 1 (naming the offenders) when any change has all tasks complete but still sits under `openspec/changes/`. For reproducible CI, pin a commit: `npx github:Fatfrido/openspec-obsidian#<sha> check` (`npx github:` needs network + git in the runner).

## Agent/skill integration

Paste-ready final step for an apply skill/prompt (after the implementation commit, before pushing):

> **Sync + archive on the branch**: run `npx github:Fatfrido/openspec-obsidian archive` from the repo root. It syncs delta specs into `openspec/specs/`, moves the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`, rewrites its intra-change path wikilinks, and verifies links resolve. If it prints `NOTHING TO ARCHIVE`, stop and report (a task checkbox is still open). Then run `openspec validate --all --strict --no-interactive`. Commit in two commits: `git add openspec/specs` → `docs(openspec): sync <caps> specs`; then `git add -A` → `chore(openspec): archive <name>`.

For a manual archive skill, keep one guardrail: archive via the deterministic `archive` command; never hand-`mv` a change dir (a bare `mv` leaves the moved change's path wikilinks pointing at the old location).

## Compatibility

Verified against **OpenSpec CLI v1.4.1**: `openspec validate --all --strict` passes on a fully backfilled repo, and `openspec show --json` requirement extraction is unchanged with frontmatter present. The reference implementation of these conventions lives in [Fatfrido/maniac](https://github.com/Fatfrido/maniac) (`openspec/` tree + `.github/scripts/archive-change.mjs`).
