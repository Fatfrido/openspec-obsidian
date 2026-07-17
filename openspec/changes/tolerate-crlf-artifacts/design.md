---
type: design
change: tolerate-crlf-artifacts
tags: [openspec, type/design, capability/archive]
aliases: ["tolerate-crlf-artifacts design"]
---

## Context

`lib/archive.mjs` splits file content on `"\n"` throughout: `stripFrontmatter` compares each line to the literal string `"---"`, so a CRLF file's frontmatter fence line is actually `"---\r"` and never matches, leaking the frontmatter block into the parsed body; `parseSpec`'s block reassembly joins on `"\n"`, so a CRLF input file produces spec text with mixed `\n`/`\r\n` endings; `taskState`'s `- [x]`/`- [ ]` checkbox regex and `parseDelta`'s `^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements\s*$` heading regex happen to tolerate a trailing `\r` because `\s` and the checkbox pattern don't anchor past it — accidental, not designed, and unverified by any test. Windows adopters with `core.autocrlf=true` end up with CRLF working-tree files; this repo's own checkout already shows line-ending-only diffs on several tracked files, and the test suite only exercises LF fixtures.

## Goals / Non-Goals

**Goals:**
- Every `fs.readFileSync` on the parse/sync/check paths in `lib/archive.mjs` (including `moveChange`'s link-rewrite reads) tolerates CRLF input identically and deliberately.
- Output is always LF, unconditionally — matches the existing golden tests and the convention that this tool owns and rewrites the files it touches.
- Internal parsing logic (regexes, block splitting) stays LF-only; CRLF handling lives in exactly one place.

**Non-Goals:**
- CRLF tolerance in `lib/backfill.mjs`, `lib/dashboard.mjs`, `lib/hubs.mjs`, or `lib/changelog.mjs` — each has its own read paths; follow-up changes will reuse the same helper once this one lands.
- Preserving the original line ending style on output. The tool always writes LF.
- Any change to `.gitattributes` or a repo-level line-ending policy — this change fixes parser behavior, not working-tree conventions.

## Decisions

- **Single exported helper, called at the read boundary only.** `normalizeEol(text)` returns `text.replace(/\r\n/g, "\n")`. It is exported from `lib/archive.mjs` and called immediately after every `fs.readFileSync(..., "utf8")` on the parse/sync/check paths, before the text reaches any parser.
- **CRLF only, not lone `\r`.** A bare `\r` (old Mac Classic line ending) is not a real-world artifact ending in this codebase or in adopter repos; special-casing it would add complexity for a case that doesn't occur. `autocrlf`/editor-produced files are always `\r\n` or `\n`.
- **Output is always LF.** A CRLF-authored spec that gets synced is thereby normalized to LF on rewrite. This is documented as intended one-way normalization: `git` with `autocrlf=true` reconverts LF back to CRLF on checkout, so the working-tree appearance for an `autocrlf` adopter is unchanged even though the blob committed is LF.
- **No `\r` special-casing inside parsers.** `stripFrontmatter`, `parseSpec`, `parseDelta`, `taskState`, and `moveChange`'s link rewriting keep their existing LF-only regexes and split logic; normalization happens once, upstream of all of them, so the accidental partial tolerance in `taskState`/`parseDelta` is replaced by one designed guarantee instead of patched piecemeal.

## Risks / Trade-offs

- Normalizing at read time could mask genuinely corrupted mixed-encoding files; out of scope — this change targets the common CRLF-working-copy case, not general encoding validation.
- A CRLF-authored spec synced for the first time will show as a full-file rewrite (all lines touched) in its diff, since every `\r\n` becomes `\n`; acceptable, one-time cost, consistent with the tool always owning its output.
- Per-read `String.replace` is a negligible cost given artifact file sizes.
