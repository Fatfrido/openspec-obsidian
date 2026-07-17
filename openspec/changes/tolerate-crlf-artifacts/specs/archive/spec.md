---
type: spec-delta
change: tolerate-crlf-artifacts
capability: archive
tags: [openspec, type/spec, capability/archive]
aliases: ["tolerate-crlf-artifacts archive delta"]
main_spec: "[[specs/archive/spec|archive spec]]"
---

## ADDED Requirements

### Requirement: Tolerate CRLF line endings in artifacts
Every read of a `openspec/` artifact file on the parse, sync, and check paths in `lib/archive.mjs` SHALL normalize `\r\n` line endings to `\n` before the content reaches any parser, via a single exported `normalizeEol` helper called at the read boundary. Output SHALL always be written with LF line endings, regardless of the input file's line-ending style. This requirement does not cover `backfill`, `dashboard`, `hubs`, or `changelog` (separate follow-up changes), does not preserve CRLF on output, and does not change any `.gitattributes` policy.

#### Scenario: CRLF delta and CRLF main spec sync to LF output matching their LF twins
- **WHEN** a delta spec and its main spec are both authored with `\r\n` line endings and archived through `sync`
- **THEN** the synced main spec content is byte-identical to the result of archiving the same delta and main spec authored with `\n` line endings
- **AND** the written file uses LF line endings throughout, with no embedded `\r`

#### Scenario: CRLF frontmatter strips correctly
- **WHEN** an artifact file's frontmatter fence lines are `"---\r\n"` instead of `"---\n"`
- **THEN** `stripFrontmatter` removes the frontmatter block exactly as it would for the LF-authored equivalent
- **AND** no `\r`-suffixed fence line leaks into the parsed body

#### Scenario: CRLF tasks.md checkbox counting matches LF
- **WHEN** a change's `tasks.md` uses `\r\n` line endings and every checkbox is checked (`- [x]`)
- **THEN** `taskState` reports the same completed/total counts as the LF-authored equivalent
- **AND** `check` detects the change as complete-but-unarchived exactly as it would for the LF-authored equivalent
