---
type: design
change: adopt-openspec-obsidian
tags: [openspec, type/design, capability/init, capability/backfill, capability/archive, capability/check]
aliases: ["adopt-openspec-obsidian design"]
---

## Context

The tool already exists and is fully implemented (`bin/cli.mjs` + `lib/{init,backfill,archive}.mjs`). This change does not add product behavior; it retro-documents the shipped CLI as OpenSpec specs so the repository dogfoods its own conventions and doubles as an example vault.

## Goals / Non-Goals

**Goals:**
- Establish accurate baseline specs for the four CLI commands.
- Exercise the real authoring path (delta specs) and the real `archive` command, so the resulting `openspec/` tree is genuine, not hand-faked.
- Keep `openspec validate --all --strict` and `openspec-obsidian check` green in CI.

**Non-Goals:**
- No new CLI features, flags, or output changes.
- No changes to the published package surface (`bin`, `lib`, `assets`).

## Decisions

- **One baseline change introduces all four capabilities.** The authoring rule "one capability per change" governs ongoing changes. Adoption on an existing codebase is the recognized exception: a single baseline change documents every existing capability at once. Subsequent changes in this repo will follow one-capability-per-change.
- **Let `archive` generate the live specs.** The main specs under `openspec/specs/` are produced by running `openspec-obsidian archive` on this change's `## ADDED` delta specs, not hand-written, so the specs and the delta history cannot drift and the archive path itself is tested.
- **Per-capability Purpose is refined after sync.** `archive` seeds each new spec's `## Purpose` from the proposal's `## Why`; each spec's Purpose is then edited to describe that one capability.

## Risks / Trade-offs

- A single capability graph would be simpler, but four capabilities make the tag taxonomy (`capability/<name>`) and Obsidian backlinks meaningful — the whole point of the tool. → Accept the multi-capability baseline; document the exception here.
- The active change is complete on landing, so CI must archive it on the branch before merge or `check` fails. → That is the intended workflow and is exercised as part of this change.
