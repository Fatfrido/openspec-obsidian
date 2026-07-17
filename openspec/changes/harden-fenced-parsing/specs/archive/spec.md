---
type: spec-delta
change: harden-fenced-parsing
capability: archive
tags: [openspec, type/spec, capability/archive]
aliases: ["harden-fenced-parsing archive delta"]
main_spec: "[[specs/archive/spec|archive spec]]"
---

## ADDED Requirements

### Requirement: Treat fenced code as opaque content
Archive parsing (`parseDelta`, `parseBlocks`, `parseSpec`, `parseRenames`) SHALL treat lines inside a fenced code block (opened by `>=3` backticks or `>=3` tildes, with up to 3 leading spaces, closed by a matching-or-longer run of the same character, or left open through end of input) as opaque content, never as `##`/`### ` structural headings, delta section headers, or rename FROM/TO lines. Fenced lines SHALL be carried verbatim into the enclosing block.

#### Scenario: Fenced requirement heading stays inside its scenario
- **WHEN** a scenario body contains a fenced block whose content includes a line starting `### Requirement:`
- **THEN** archive parsing keeps that fenced line inside the enclosing scenario block
- **AND** the fenced content is synced into the live spec byte-for-byte, unchanged

#### Scenario: Fenced delta section header is not a delta section
- **WHEN** a delta file contains a fenced block whose content includes a line reading `## MODIFIED Requirements`
- **THEN** `parseDelta` does not open a new `MODIFIED Requirements` section for that fenced line
- **AND** the line remains part of whichever block was already open

#### Scenario: Tilde fences behave like backtick fences
- **WHEN** a block is opened and closed with `~~~` instead of backticks
- **THEN** the lines between the tilde fences are treated as opaque content identically to a backtick-fenced block

#### Scenario: Unclosed fence makes the remainder opaque
- **WHEN** a file opens a fence with no matching closing fence before the end of the file
- **THEN** every line from the opening fence to end of file is treated as opaque content, including any line that would otherwise look like a structural heading
