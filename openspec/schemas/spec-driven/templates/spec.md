---
type: spec-delta
change: <change-id>
capability: <capability>
tags: [openspec, type/spec, capability/<capability>]
aliases: ["<change-id> <capability> delta"]
main_spec: "[[specs/<capability>/spec|<capability> spec]]"
---

<!-- FRONTMATTER (Obsidian graph): keep this YAML block; the CLI ignores it, Obsidian uses it.
     - Replace <change-id> with this change's id and <capability> with THIS delta's capability (one delta = one capability).
     - main_spec is a VAULT-RELATIVE PATH WIKILINK to the synced main spec: "[[specs/<capability>/spec|<capability> spec]]".
       Obsidian resolves links by PATH only (NOT by `[[alias]]`), so use the path. It resolves once the main spec exists
       at openspec/specs/<capability>/spec.md (created at sync); until then it is a forward reference and shows unresolved.
       This path is stable across archiving (the main spec never moves), so the link survives.
     - Reverse navigation (main spec -> its deltas, proposal -> this delta) comes free via Obsidian backlinks.
     - CRITICAL: NEVER put `#tags` or `[[wikilinks]]` inside `### Requirement:` lines or `#### Scenario:` bodies —
       inline markup there is absorbed into the CLI's extracted requirement text. All tags/links live in this frontmatter only. -->

## ADDED Requirements

### Requirement: <!-- requirement name -->
<!-- requirement text -->

#### Scenario: <!-- scenario name -->
- **WHEN** <!-- condition -->
- **THEN** <!-- expected outcome -->
