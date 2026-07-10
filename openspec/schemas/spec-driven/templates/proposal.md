---
type: proposal
change: <change-id>
tags: [openspec, type/proposal, capability/<capability>]
aliases: ["<change-id> proposal"]
design: "[[changes/<change-id>/design|<change-id> design]]"
tasks: "[[changes/<change-id>/tasks|<change-id> tasks]]"
specs: ["[[changes/<change-id>/specs/<capability>/spec|<change-id> <capability> delta]]"]
---

<!-- FRONTMATTER (Obsidian graph): keep this YAML block; the CLI ignores it, Obsidian uses it.
     - Replace <change-id> with this change's id and <capability> with the kebab-case capability name.
     - tags: add one `capability/<name>` per capability this change touches (leave `openspec` + `type/proposal`).
     - LINKS ARE VAULT-RELATIVE PATH WIKILINKS `[[path/to/file|Display]]` (path is relative to the vault root =
       openspec/, no `.md`). Obsidian resolves links by PATH/filename only — it does NOT resolve `[[alias]]`
       (aliases are autocomplete-only), so a bare `[[<change-id> design]]` would open a NEW empty file when clicked.
       The `aliases` key stays for search/autocomplete/display; it is not a link target.
     - specs: one entry per delta — `"[[changes/<change-id>/specs/<capability>/spec|<change-id> <capability> delta]]"`.
     - Links are authored ONE direction only (proposal -> design/tasks/deltas); Obsidian backlinks give the reverse.
     - NEVER put `#tags` or `[[wikilinks]]` inside requirement/scenario bodies (they pollute extracted text). -->

## Why

<!-- Explain the motivation for this change. What problem does this solve? Why now? -->

## What Changes

<!-- Describe what will change. Be specific about new capabilities, modifications, or removals. -->

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Replace <name> with kebab-case identifier (e.g., user-auth, data-export, api-rate-limiting). Each creates specs/<name>/spec.md -->
- `<name>`: <brief description of what this capability covers>

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
     Only list here if spec-level behavior changes. Each needs a delta spec file.
     Use existing spec names from openspec/specs/. Leave empty if no requirement changes. -->
- `<existing-name>`: <what requirement is changing>

## Impact

<!-- Affected code, APIs, dependencies, systems -->
