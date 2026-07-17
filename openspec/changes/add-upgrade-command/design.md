---
type: design
change: add-upgrade-command
tags: [openspec, type/design, capability/upgrade]
aliases: ["add-upgrade-command design"]
---

## Context

`init` copies `assets/schema.yaml` and `assets/templates/*.md` to `openspec/schemas/spec-driven/`, seeds `assets/obsidian.yaml` to `openspec/obsidian.yaml` and `assets/dashboard.base` to `openspec/dashboard.base` only when absent, and appends the `assets/config-rules.yaml` rules block as raw text into `openspec/config.yaml`'s `rules:` key (or prints it for manual merge if `rules:` already exists). None of this is versioned. `init --force` overwrites schema/templates unconditionally, including local edits. `npx github:` invocations always run the latest CLI code against whatever assets an adopter installed at any point in the past, with no signal that they have drifted.

## Goals / Non-Goals

**Goals:**
- Give adopters a way to detect which installed files differ from the packaged `assets/`.
- Refresh files the tool owns outright without ever touching files adopters are expected to customize.
- Keep the check deterministic and dependency-free: no manifest, no network, no version numbers.

**Non-Goals:**
- Changing `lib/init.mjs` behavior — `init`/`init --force` are untouched.
- Version stamps or manifests recording what was installed when; content comparison is the only source of truth.
- Structured YAML merging for the config-rules block — same never-structured-merge stance as `init`.
- A CI staleness gate that fails a repo's own CI when its installed assets drift from the openspec-obsidian release it depends on — plausible follow-up once `upgrade` exists to fix what the gate would flag.
- Upgrading the *content* of `openspec/obsidian.yaml` or `openspec/dashboard.base` — these are user-owned from the moment `init` seeds them; `upgrade` only reports that the packaged version differs.

## Decisions

- **Content comparison, LF-normalized, is the entire staleness model.** Both the installed file and the packaged `assets/` source are read and `\r\n` -> `\n` normalized before comparing; a byte-identical-after-normalization file is `current`, never `stale`, so an autocrlf checkout is not misreported. This avoids any manifest/version file and keeps `assetStates` a pure function of two directory trees.
- **Ownership is a fixed classification, not inferred.** `assetStates` hardcodes three groups: tool-owned (`schemas/spec-driven/schema.yaml`, `schemas/spec-driven/templates/*.md`), user-owned (`obsidian.yaml`, `dashboard.base`), append-only (`config.yaml` rules block, checked by substring containment of the LF-normalized packaged block rather than whole-file equality, since adopters add rules alongside it). This mirrors and reuses `init`'s own asset map rather than re-deriving paths independently.
- **`upgrade()` only ever writes tool-owned files**, and only when `status !== "current"`. User-owned and append-only statuses are surface-level report data; the function never opens those files for writing. This keeps the blast radius of a bug in `upgrade` bounded to files `init --force` would already overwrite.
- **`--dry-run` short-circuits before any `fs.writeFileSync`/`mkdirSync` call**, reusing the same `assetStates` result to print `WOULD UPDATE <path>` for each non-current tool-owned file, so dry-run and real-run share one code path up to the write boundary and cannot diverge in what they consider stale.
- **Guard on missing `openspec/schemas/spec-driven/`.** `upgrade` throws `UpgradeError` immediately if that directory does not exist, since there is nothing meaningful to diff — this is the "run init first" case, not a zero-drift case.
- **Command output follows the existing verb-prefixed stdout convention** (`UPDATED`, `SKIP … (current)`, `WOULD UPDATE`, terminal `UPGRADE OK`), matching `init`/`archive`/`hubs` logging so scripts and docs can grep it consistently.

## Risks / Trade-offs

- Content-only staleness cannot distinguish "adopter deliberately customized this tool-owned file" from "file is out of date" — both read as `stale` and get rewritten on a real run. This is accepted because tool-owned files (schema, templates) are not meant to be hand-edited; adopters who do so should fork the capability into their own template instead, and `--dry-run` lets them inspect before committing to a run.
- Without a CI gate (explicit non-goal here), staleness is opt-in — an adopter who never runs `upgrade` stays silently stale, same as today. The follow-up gate is deferred rather than bundled, keeping this change single-capability.
- The append-only report prints the whole packaged rules block on any drift, even a single added line elsewhere in `config.yaml`'s `rules:` key producing a substring match failure; adopters must eyeball the diff themselves, same limitation `init` already has.
