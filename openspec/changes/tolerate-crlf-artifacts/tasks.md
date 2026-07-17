---
type: tasks
change: tolerate-crlf-artifacts
tags: [openspec, type/tasks, capability/archive]
aliases: ["tolerate-crlf-artifacts tasks"]
---

## 1. Read-boundary normalization

- [ ] 1.1 Add an exported `normalizeEol(text)` helper to `lib/archive.mjs` (`text.replace(/\r\n/g, "\n")`) and call it on the result of every `fs.readFileSync` on the parse/sync/check paths — `stripFrontmatter`/frontmatter parsing, `parseSpec`, `parseDelta`, `taskState`, and `moveChange`'s link-rewrite reads — leaving internal regexes and block-splitting logic LF-only — verify: `npm test`

## 2. CRLF regression coverage

- [ ] 2.1 Add CRLF twin tests to `test/archive.test.mjs`: for each of (a) delta + main spec sync, (b) frontmatter stripping, and (c) `tasks.md` checkbox counting via `check`, write the existing LF fixture content with `\r\n` line endings and assert the resulting output/behavior is byte-identical to the LF golden — verify: `node --test test/archive.test.mjs`

## 3. Validate

- [ ] 3.1 Validate the change artifacts — verify: `npm run opsx:validate`
