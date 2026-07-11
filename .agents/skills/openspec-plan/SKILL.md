---
name: openspec-plan
description: Plan mode → OpenSpec artifacts. Turn an approved plan into a change dir (proposal, delta specs, optional design, tasks) following the OpenSpec spec-driven workflow.
argument-hint: [change-id] — kebab-case; omit to derive from the plan
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(openspec:*)
---

You are in **OpenSpec Plan mode**. Convert the plan below into OpenSpec change
artifacts under `openspec/changes/<change-id>/`. Author the content by hand,
following the workflow's authoring rules. Do not invoke any CLI to write
requirement content — you author, tooling only mechanizes.

## Input
- Plan: $ARGUMENTS
  (If empty, use the approved plan already in context. If neither exists, STOP
  and ask for the plan.)
- `change-id`: first argument if kebab-case; otherwise derive a short kebab-case
  id from the plan's intent (e.g. `add-json-content-layer`).

## Step 0 — Ground in real spec state first (do NOT skip)
1. `openspec list` and read `openspec/specs/` (the live capabilities).
2. Read `openspec/config.yaml` and `openspec/schemas/*/schema.yaml` — those
   `instruction`/`rules` blocks are the authoritative authoring rules; obey them.
3. Per capability the plan touches, decide **new** (mint `specs/<cap>/spec.md`)
   vs **existing** (author a MODIFIED/REMOVED/RENAMED delta against the real
   requirement — never mint a parallel capability).
Prefer **one capability per change**; if the plan spans several, split into
multiple change dirs and say so.

## Step 1 — proposal.md  (`openspec/changes/<id>/proposal.md`)
Sections (≤ ~400 words, focus on *why* not *how*):
- `## Why` — the problem/opportunity, and why now.
- `## What Changes` — bullets; mark **BREAKING** where it applies.
- `## Capabilities` — `### New Capabilities` / `### Modified Capabilities`,
  kebab-case names. This is the contract with the specs phase; research existing
  specs before filling it.
- `## Impact` — affected code, APIs, dependencies, systems.

## Step 2 — delta specs  (`openspec/changes/<id>/specs/<cap>/spec.md`, one per capability)
Delta headers: `## ADDED Requirements`, `## MODIFIED Requirements`,
`## REMOVED Requirements` (`**Reason**` + `**Migration**`), `## RENAMED
Requirements` (FROM:/TO:). Rules that **fail silently** if broken:
- `### Requirement: <name>` then normative text using **SHALL/MUST**.
- `#### Scenario: <name>` — **exactly four hashtags** — with `**WHEN**`/`**THEN**`.
- **Every requirement has ≥ 1 scenario.**
- **MODIFIED** restates the **COMPLETE** requirement block (description + ALL
  scenarios, unchanged and changed alike) — archive merges by whole-block
  replacement, so a partial MODIFIED silently drops the omitted scenarios.
- Keep requirement/scenario lines plain prose — no decorative tags or link
  markup inside them (it pollutes the CLI's extracted requirement text).

## Step 3 — design.md  (`openspec/changes/<id>/design.md`) — CONDITIONAL
Create only if any apply: cross-cutting change, new external dependency,
significant data-model change, security/performance/migration complexity, or
ambiguity worth resolving before coding. Sections: `## Context`,
`## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`. Record only
decisions that **constrain implementation**; no speculative alternatives.

## Step 4 — tasks.md  (`openspec/changes/<id>/tasks.md`)
`## N. Group` headings; tasks as `- [ ] N.M description`. Every task **names its
verification command**. **Order tasks so the project builds and existing tests
pass after each one.**

## Step 5 — Verify
- `openspec validate --all --strict --no-interactive` must pass.
- **Do NOT archive** — archiving is deterministic and happens post-apply, when
  the last task checkbox flips.

## (Optional) Obsidian graph layer
If this repo uses openspec-obsidian, add the frontmatter/wikilink/tag layer
deterministically after authoring — do NOT hand-write it:
`npx github:Fatfrido/openspec-obsidian backfill` (idempotent; `--dry-run` to
preview). It reconstructs the whole graph layer from the files on disk. Skip
this step entirely in a plain OpenSpec repo.

## Output
Report the created files, the capability classification (new vs modified) with
evidence from `openspec/specs/`, and the exact `validate` result. If the plan
forced a multi-capability split, list each change dir.
