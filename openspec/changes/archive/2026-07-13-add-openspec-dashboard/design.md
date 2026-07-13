---
type: design
title: "add-openspec-dashboard design"
change: add-openspec-dashboard
tags: [openspec, type/design, capability/dashboard]
aliases: ["add-openspec-dashboard design"]
---

## Context

The `openspec/` vault has rich per-artifact frontmatter but no aggregate view. Obsidian here runs native-only (no community plugins) with the core Bases plugin enabled; Bases groups notes by frontmatter but cannot read note bodies, so task progress (checkboxes in `tasks.md`) and requirement counts are invisible to it. The OpenSpec peer CLI (v1.4.1) exposes this data via `status --json` / `show --json` / `validate --json`, but `archive` and `backfill` are deliberately CLI-free (pure `node:fs`).

## Goals / Non-Goals

**Goals:**
- One overview surface for changes, progress, capabilities, and archive, navigable in Obsidian.
- Deterministic, idempotent output that is golden-testable and CI-regenerable.

**Non-Goals:**
- No auto-opening "start page" (native Obsidian cannot; that needs a community plugin).
- No new frontmatter stamped onto authored artifacts.

## Decisions

- **Materialize to tracked files, do not query live.** Obsidian cannot run a CLI, so the dashboard is pre-generated: a Markdown note (`dashboard.md`) as the always-works layer plus a `.base` for live filtering. Both live at `openspec/` root (tracked), never in the gitignored `.obsidian/`. `deriveArtifact` returns null for these paths and `.base` is not `.md`, so `backfill`/`walkMd` never touch them.
- **Compute from `fs`, not the OpenSpec CLI.** Reuse `walkMd` / `deriveArtifact` / `taskState` and spec-block parsing to keep the zero-dependency, CLI-free spine. Depending on the peer CLI's JSON would add a runtime dependency and couple to its output shape (v1.4.1). An optional `openspec validate --json` health panel MAY be added later, degrading gracefully when the CLI is absent.
- **Progress lives in generated text, not stamped frontmatter.** Because Bases cannot count checkboxes, `taskState` computes progress into `dashboard.md`; source artifacts are not mutated, avoiding stale mutable properties and keeping authored frontmatter pure.
- **Determinism.** Sort changes and specs by id and emit stable output so re-runs are byte-identical, matching the golden-test discipline of `archive`/`backfill`.

## Risks / Trade-offs

- **Snapshot staleness:** `dashboard.md` reflects its last run. → Regenerate in CI and fail if the working tree is dirty; document the command so authors re-run it. Accept: it is a report, and CI already runs `check` / `validate`.
- **Two outputs (md + base):** slightly more surface. → The note guarantees zero-plugin usefulness; the base serves power users. Both stay within the one `dashboard` capability, so `init` is untouched.
- **Not a real homepage:** users must bookmark or open it. → Acceptable within native constraints; note it in README.
