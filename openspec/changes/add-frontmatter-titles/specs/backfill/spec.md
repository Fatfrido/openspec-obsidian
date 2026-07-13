---
type: spec-delta
change: add-frontmatter-titles
capability: backfill
tags: [openspec, type/spec, capability/backfill]
aliases: ["add-frontmatter-titles backfill delta"]
main_spec: "[[specs/backfill/spec|backfill spec]]"
---

## MODIFIED Requirements

### Requirement: Add frontmatter to bare artifacts idempotently
The `backfill` command SHALL add the per-type Obsidian frontmatter block — including a `title` key whose value names the artifact after its primary alias (for example `add-frontmatter-titles proposal` or `backfill spec`) — to every OpenSpec artifact that lacks one, SHALL insert exactly the missing `title` key into any artifact whose existing frontmatter lacks it, and MUST leave any artifact whose frontmatter already carries a `title` byte-for-byte unchanged.

#### Scenario: Bare artifact gains frontmatter
- **WHEN** `backfill` finds an artifact whose content does not start with `---`
- **THEN** it prepends the frontmatter block for that artifact type, including its `title`, and logs an `ADD` line

#### Scenario: Annotated artifact without title gains only the title
- **WHEN** an artifact already begins with a `---` frontmatter fence but its frontmatter has no `title` key
- **THEN** `backfill` inserts a single `title` line and changes nothing else in the file

#### Scenario: Artifact with title is skipped
- **WHEN** an artifact's frontmatter already contains a `title` key
- **THEN** `backfill` leaves the file byte-for-byte unchanged
