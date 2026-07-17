---
type: design
change: harden-fenced-parsing
tags: [openspec, type/design, capability/archive]
aliases: ["harden-fenced-parsing design"]
---

## Context

`lib/archive.mjs` splits spec and delta markdown by scanning for lines starting `## ` or `### `, with no concept of a fenced code block. OpenSpec 1.6's validator now tolerates fenced examples inside requirement/scenario bodies (verified live: `openspec@1.6.0 validate --all --strict` passes 10/10 on this vault), which widens the set of specs that validate but that our archive step can silently mis-parse — for example a scenario demonstrating this tool's own `### Requirement:` syntax inside a fence. `applyOps` then does an unconditional `blocks[i] = nb` replace on whatever the (mis-)split produced, so the corruption is silent, not a crash.

## Goals / Non-Goals

**Goals:**
- A fenced line that happens to look like a `##`/`### ` heading is never treated as delta/spec/rename structure.
- Fenced content survives an archive sync byte-for-byte.
- The fix is a small, pure, testable primitive reused at every parsing call site, not four ad-hoc patches.

**Non-Goals:**
- Fence-awareness in `lib/dashboard.mjs` requirement/scenario counting, `lib/hubs.mjs` progress rendering, or `lib/changelog.mjs` section parsing — none of them do structural line-splitting on `##`/`### `; if that changes, follow-up changes apply this same primitive.
- Indented (4-space) code blocks — CommonMark treats them as code, but OpenSpec's own schema and this repo's authoring rules only ever use fenced blocks; adding indent-based detection would be speculative scope with no known trigger.
- Info-string parsing (language tags like ```` ```md ````) beyond ignoring the trailing text on the opening fence line.

## Decisions

- **`fenceMask(lines)` is a new pure export in `lib/archive.mjs`.** Given the array of lines a parser already has in hand, it returns a same-length boolean array, `true` where the line is inside (or itself opens/closes) a fence. It is computed once per parse call and threaded into the existing scan, not recomputed per line.
- **CommonMark-basic fence rules only:** an opening fence is a line with up to 3 leading spaces followed by `>=3` backticks or `>=3` tildes; the closing fence must use the same character and have a mark count `>=` the opener's; an opening line's own content still counts as "inside" (the fence markers themselves are masked `true` alongside the body). An unclosed fence (no matching closer before EOF) masks every remaining line to EOF, matching CommonMark's own unclosed-fence behavior.
- **Every structural scan skips masked lines.** `parseDelta`'s `^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements\s*$` test, `parseBlocks`'s `## `/`### ` split, `parseSpec`'s `## Requirements` head search, and `parseRenames`'s FROM/TO line matching all consult the mask for the current line index and skip (treat as ordinary content) when masked. Masked lines are always appended verbatim to whatever block is currently open — they are never dropped or rewritten.
- **`stripFrontmatter` needs no change.** It operates before any fence can appear (frontmatter is always the first `---`-delimited block at the top of the file), so fence detection starts only on the lines that remain after frontmatter is stripped.

## Risks / Trade-offs

- A hand-rolled CommonMark subset can diverge from a full CommonMark implementation on edge cases (e.g. fences inside blockquotes, four-space-indented fences); scoped explicitly to the plain top-level fences this repo's own schema and specs use, with the indented-block case called out as a non-goal above rather than silently mishandled.
- Every call site touched is a parsing hot path for archive/check; the golden byte-for-byte fixture test guards against a regression in the common (no-fence) case as well as the new fenced case.
