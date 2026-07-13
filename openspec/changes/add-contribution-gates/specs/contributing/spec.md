---
type: spec-delta
change: add-contribution-gates
capability: contributing
tags: [openspec, type/spec, capability/contributing]
aliases: ["add-contribution-gates contributing delta"]
main_spec: "[[specs/contributing/spec|contributing spec]]"
---

## ADDED Requirements

### Requirement: Contributor guide
The repository SHALL provide a `CONTRIBUTING.md` documenting the development environment (Node >= 20, npm, zero dependencies, no build or lint step), the test command, the pinned OpenSpec CLI install, a summary of the change lifecycle deferring to `AGENTS.md` for depth, and every docs CI gate together with its escape label and the local command that pre-empts it. The README contributing section SHALL link to it.

#### Scenario: New contributor finds the workflow
- **WHEN** a contributor opens `CONTRIBUTING.md`
- **THEN** it names the test command, the pinned OpenSpec CLI version, and the change lifecycle
- **AND** lists each docs gate with its escape label and a local pre-flight command

### Requirement: Upgrade guide
The repository SHALL maintain an `UPGRADING.md` in which every breaking change that is not migrated automatically adds a section of adopter-facing instructions — the exact command to run or configuration delta to apply — newest first, one section per change.

#### Scenario: Manual migration documented
- **WHEN** a change requires adopters to act, for example an updated `assets/` file that `init` does not overwrite in existing repos
- **THEN** `UPGRADING.md` gains a section with the exact instructions in the same pull request

### Requirement: Feature documentation gate
CI SHALL fail a pull request whose Conventional Commit title has type `feat` when the diff does not modify `README.md`, unless the pull request carries the `docs:none` label.

#### Scenario: Feature without documentation fails
- **WHEN** a pull request titled with type `feat` does not modify `README.md`
- **AND** it does not carry the `docs:none` label
- **THEN** the docs job fails naming the missing documentation

#### Scenario: Internal feature escapes with label
- **WHEN** a `feat` pull request carries the `docs:none` label
- **THEN** the docs job does not require `README.md` changes

### Requirement: Breaking change gate
CI SHALL fail a pull request that declares a breaking change (a `!` marker in the title or a `BREAKING CHANGE` footer in the body) or that modifies any file under `assets/`, when the diff does not modify `UPGRADING.md`, unless the pull request carries the `migration:auto` label.

#### Scenario: Declared breaking change without upgrade guide fails
- **WHEN** a pull request title carries the `!` marker
- **AND** the diff does not modify `UPGRADING.md` and the `migration:auto` label is absent
- **THEN** the docs job fails

#### Scenario: Assets change without upgrade guide fails
- **WHEN** a pull request modifies a file under `assets/` with no breaking marker in its title
- **AND** the diff does not modify `UPGRADING.md` and the `migration:auto` label is absent
- **THEN** the docs job fails, because installed `assets/` content never reaches existing adopters automatically

#### Scenario: Automatic migration escapes with label
- **WHEN** a breaking pull request carries the `migration:auto` label
- **THEN** the docs job does not require `UPGRADING.md` changes

### Requirement: Pull request title lint
CI SHALL fail a pull request whose title does not parse as a Conventional Commit: a type, an optional parenthesized scope, an optional `!` marker, a colon, and a description.

#### Scenario: Non-conventional title fails
- **WHEN** a pull request title does not match the Conventional Commit form
- **THEN** the docs job fails showing the expected form

### Requirement: Documentation planning rules
The OpenSpec config rules SHALL instruct generated proposals to declare a breaking-change triage (none, automatic with the converging command named, or manual with an upgrade guide) and their documentation impact; instruct designs to prefer automatic migration over manual steps; and instruct tasks to name each affected adopter surface (README sections, CLI usage text, `assets/` files).

#### Scenario: Generated proposal declares triage
- **WHEN** a proposal artifact is generated under the installed rules
- **THEN** it contains a breaking-change declaration and a documentation impact statement
