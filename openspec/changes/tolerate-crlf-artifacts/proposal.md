---
type: proposal
change: tolerate-crlf-artifacts
tags: [openspec, type/proposal, capability/archive]
aliases: ["tolerate-crlf-artifacts proposal"]
design: "[[changes/tolerate-crlf-artifacts/design|tolerate-crlf-artifacts design]]"
tasks: "[[changes/tolerate-crlf-artifacts/tasks|tolerate-crlf-artifacts tasks]]"
specs: ["[[changes/tolerate-crlf-artifacts/specs/archive/spec|tolerate-crlf-artifacts archive delta]]"]
---

## Why

Every parser in `lib/archive.mjs` assumes LF line endings, but tolerance is inconsistent rather than designed: `stripFrontmatter` compares lines to `"---"` exactly, so a CRLF file (`"---\r"`) never strips and frontmatter leaks into the parsed body; `parseSpec` reassembles blocks by joining with `"\n"`, producing mixed endings from CRLF input; `taskState`'s checkbox regex and `parseDelta`'s `\s*$` heading regex happen to tolerate a trailing `\r` by accident, not by intent. An adopter on Windows with `core.autocrlf=true` gets CRLF artifact files in the working tree — this repo's own checkout already shows the symptom (line-ending-only diffs on multiple tracked files). Tests cover LF fixtures only, so this gap has no regression coverage.

## What Changes

- Add an exported `normalizeEol(text)` helper (`text.replace(/\r\n/g, "\n")`) and wire it into every `fs.readFileSync` call on the parse/sync/check paths in `lib/archive.mjs`, including `moveChange`'s link-rewrite reads.
- Internal parsers and regexes stay LF-only — no `\r` special-casing scattered through the codebase; all CRLF handling is centralized at the read boundary.
- Output remains always LF (matching current golden tests and the tool-owned-file convention): a CRLF-authored spec that gets synced is normalized to LF on rewrite, documented as intended one-way normalization. `git` `autocrlf` reconverts on checkout, so working-tree appearance is unchanged for `autocrlf` adopters.
- Add CRLF twin tests to `test/archive.test.mjs` asserting byte-identical output to the existing LF goldens.
- Non-goals: CRLF tolerance in `backfill`/`dashboard`/`hubs`/`changelog` (separate follow-up changes sharing the helper), preserving CRLF on output, and any `.gitattributes` policy change.

## Capabilities

### New Capabilities

- _None._

### Modified Capabilities

- `archive`: this delta only ADDs one new requirement (CRLF read-boundary tolerance); existing archive requirements are unchanged.

## Impact

- Modified: `lib/archive.mjs` (new exported `normalizeEol` helper, wired at every read site on the parse/sync/check paths).
- Modified: `test/archive.test.mjs` (CRLF twin coverage for delta/spec sync, frontmatter stripping, and checkbox counting).
- No CLI surface change; behavior for LF-only repositories is identical before and after.
