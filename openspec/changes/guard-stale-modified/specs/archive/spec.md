---
type: spec-delta
change: guard-stale-modified
capability: archive
tags: [openspec, type/spec, capability/archive]
aliases: ["guard-stale-modified archive delta"]
main_spec: "[[specs/archive/spec|archive spec]]"
---

## ADDED Requirements

### Requirement: Refuse stale MODIFIED requirements
The `archive` command SHALL refuse to apply a `MODIFIED` requirement block whose scenario headings are not a superset of the live requirement's scenario headings in `openspec/specs/<capability>/spec.md`, throwing before any change directory is moved and naming the change id, capability, requirement, and the missing scenario heading(s). A delta MAY intentionally remove a scenario by pairing `## REMOVED Requirements` with `## ADDED Requirements` for the same requirement in one delta.

#### Scenario: Stale MODIFIED block is rejected
- **WHEN** the live requirement in the main spec has a scenario that the incoming `MODIFIED` block does not restate
- **THEN** `archive` throws naming the missing scenario heading
- **AND** no change directory is moved

#### Scenario: MODIFIED block carrying every live scenario syncs
- **WHEN** a `MODIFIED` block restates every scenario present in the live requirement, whether unchanged or edited, and optionally adds new scenarios
- **THEN** `archive` applies the replacement and continues the sync

#### Scenario: Intentional removal via REMOVED then ADDED
- **WHEN** a single delta pairs `## REMOVED Requirements` naming a requirement with `## ADDED Requirements` re-adding the same requirement without one of its scenarios
- **THEN** `archive` applies the removal followed by the addition and does not treat the dropped scenario as stale
