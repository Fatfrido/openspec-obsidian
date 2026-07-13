---
type: tasks
change: add-frontmatter-titles
tags: [openspec, type/tasks, capability/backfill]
aliases: ["add-frontmatter-titles tasks"]
---

## 1. Title stamping

- [ ] 1.1 Extend `generateFrontmatter` in `lib/backfill.mjs` to emit `title` (mirroring the primary alias) immediately after `type` for all five artifact kinds, updating the golden frontmatter assertions in `test/backfill.test.mjs` in the same step — verify: `node --test test/backfill.test.mjs`

## 2. Title upsert

- [ ] 2.1 Insert a missing `title` into artifacts that already carry frontmatter (after the `type:` line when present, else after the opening fence), leaving `title`-bearing files byte-for-byte unchanged and honoring `--dry-run` — verify: `node --test test/backfill.test.mjs`
- [ ] 2.2 Add upsert tests: exactly-one-line diff on an annotated artifact, byte-identical second run, dry-run writes nothing — verify: `node --test test/backfill.test.mjs`

## 3. Integrate

- [ ] 3.1 Re-backfill this repo's vault so every artifact carries `title` — verify: `node bin/cli.mjs backfill --dry-run` reports nothing left to write, then `npm test`
- [ ] 3.2 Document the optional Front Matter Title plugin in `README.md` (what it fixes, default `title` template, graph feature toggle; vault unchanged without it) — verify: `grep -qi "front matter title" README.md`
