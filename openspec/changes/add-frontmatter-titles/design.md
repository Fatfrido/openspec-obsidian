---
type: design
change: add-frontmatter-titles
tags: [openspec, type/design, capability/backfill]
aliases: ["add-frontmatter-titles design"]
---

## Context

Obsidian resolves graph node labels from file basenames only; `aliases` and link display text are ignored there. The vault already carries a unique human-readable name per artifact — `aliases[0]` (`"<change-id> proposal"`, `"<capability> spec"`, `"<change-id> <capability> delta"`), emitted by `generateFrontmatter`. The Front Matter Title plugin's default template is `title`, a key no artifact currently has. Backfill today skips any file whose first line is `---`, so a new key can never reach already-annotated vaults without an upsert path.

## Goals / Non-Goals

**Goals:**

- Every OpenSpec artifact carries `title` mirroring its primary alias, stamped and repaired by `backfill` alone.
- Zero behavior change for vaults without the plugin; zero new dependencies or config flags.

**Non-Goals:**

- Touching `archive.newSpecHead`, `init` templates, or `dashboard` output — their title-less output converges on the next `backfill` run, keeping this a single-capability change.
- Plugin detection, installation, or configuration beyond README documentation.
- Titles for non-artifact notes (`dashboard.md` and hub-style notes already have unique basenames).

## Decisions

- **`title` value = primary alias.** One naming source; no second derivation to drift. Emitted as `title: "<value>"` immediately after the `type:` line in generated blocks.
- **Upsert is line-based, not YAML-parsed.** Matching the repo rule "never attempt structured YAML merging": scan the frontmatter fence for a line starting `title:`; if absent, insert a single `title` line after the `type:` line (or after the opening fence when no `type:` exists). Everything else in the file is untouched, so the upsert diff is exactly one line.
- **Idempotency contract shifts from file-level to key-level.** Old rule: first line `---` ⇒ skip. New rule: skip only when `title` is already present. Second runs remain byte-identical.
- **`--dry-run` covers upserts** the same way it covers new frontmatter blocks; the post-write wikilink verification is unaffected (upserts generate no links).

## Risks / Trade-offs

- [All backfill goldens change] → mechanical one-line addition per golden; updated in the same task as the code.
- [Already-published vaults get a one-line diff per artifact on next backfill] → expected and desired; idempotent afterwards.
- [A hand-authored `title` differing from the alias is preserved, not corrected] → acceptable: upsert only fills missing keys, never overwrites user intent.
