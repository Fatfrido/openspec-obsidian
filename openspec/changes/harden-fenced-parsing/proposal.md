---
type: proposal
change: harden-fenced-parsing
tags: [openspec, type/proposal, capability/archive]
aliases: ["harden-fenced-parsing proposal"]
design: "[[changes/harden-fenced-parsing/design|harden-fenced-parsing design]]"
tasks: "[[changes/harden-fenced-parsing/tasks|harden-fenced-parsing tasks]]"
specs: ["[[changes/harden-fenced-parsing/specs/archive/spec|harden-fenced-parsing archive delta]]"]
---

## Why

OpenSpec 1.6 validation now accepts fenced code examples inside requirement and scenario bodies — including examples that demonstrate this tool's own schema syntax, such as a fenced block showing `### Requirement:` heading form. But `lib/archive.mjs`'s `parseDelta`, `parseBlocks`, and `parseSpec` treat any line starting `## ` or `### ` as structure, with no awareness of fences. A spec whose scenario legitimately shows such an example validates cleanly upstream and then is silently mis-split and corrupted the next time it is archived. This is the worst failure class available: validation passes, archive corrupts, and nobody notices until content has already gone missing.

## What Changes

- Add a pure `fenceMask(lines)` helper to `lib/archive.mjs` that marks each line as inside/outside a fenced code block, following CommonMark fenced-code rules (`>=3` backticks or tildes opening, matching-or-longer same-character closing, unclosed fence runs to end of input).
- Wire the mask into `parseDelta` (section-header matching), `parseBlocks` (block splitting), `parseSpec` (`## Requirements` head detection), and `parseRenames` (FROM/TO matching) so fenced lines are always treated as opaque content and carried verbatim into the enclosing block.
- `stripFrontmatter` is unaffected — frontmatter always precedes any fence.

## Capabilities

### Modified Capabilities

- `archive`: delta only ADDs a requirement (fence-aware parsing); no existing requirement text changes.

## Impact

- Modified: `lib/archive.mjs` (new `fenceMask` export, four call sites updated).
- New/modified tests: `test/archive.test.mjs` (fenced-content scenarios plus a golden byte-for-byte sync fixture).
- Non-goals (deliberately out of scope, follow-ups if ever needed): fence-awareness in `lib/dashboard.mjs` requirement counting, `lib/hubs.mjs`, and `lib/changelog.mjs`; indented (4-space) code blocks are not treated as fences.
