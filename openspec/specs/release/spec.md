---
type: spec
capability: release
tags: [openspec, type/spec, capability/release]
aliases: ["release spec"]
---

# release Specification

## Purpose

The repository is now public and `openspec-obsidian` can publish to the public npm registry, but `README.md` was written for the private, pre-release era: it declares "No npm release yet," leads every example with `npx github:Fatfrido/openspec-obsidian`, and its Releasing section tells maintainers to add an `NPM_TOKEN` secret — yet `.github/workflows/publish.yml` authenticates tokenlessly via OIDC Trusted Publishing. New users are pointed at the wrong install path and maintainers at setup the workflow ignores.

## Requirements

### Requirement: Public npm distribution
The package SHALL be published to the public npm registry under the name `openspec-obsidian` with `publishConfig.access` set to `public`, so that any user can run `npx openspec-obsidian <command>` or install it as a dependency without npm authentication.

#### Scenario: Install without credentials
- **WHEN** a user with no npm credentials runs `npx openspec-obsidian <command>`
- **THEN** npm fetches the public package and executes its `openspec-obsidian` bin

### Requirement: Release-triggered publish gated on version
Publishing SHALL be performed only by the CI release workflow, triggered by a published GitHub Release or a manual dispatch. When triggered by a Release, the workflow MUST verify the release tag equals `v<version>` from `package.json` and MUST fail without publishing when they differ. On a successful publish the package MUST be uploaded to the public npm registry with build provenance.

#### Scenario: Matching tag publishes with provenance
- **WHEN** a GitHub Release is published whose tag equals `v<version>` from `package.json`
- **THEN** the workflow runs the test suite and publishes the package to the public npm registry with provenance

#### Scenario: Mismatched tag aborts the release
- **WHEN** a GitHub Release is published whose tag does not equal `v<version>` from `package.json`
- **THEN** the workflow fails with an error and does not publish

### Requirement: Tokenless authentication via Trusted Publishing
The release workflow SHALL authenticate to npm using OIDC Trusted Publishing granted through an `id-token` write permission, and MUST NOT require an `NPM_TOKEN` or any other long-lived npm secret.

#### Scenario: Publish authenticates via OIDC
- **WHEN** the release workflow authenticates to the npm registry
- **THEN** it uses the GitHub Actions OIDC identity registered as a Trusted Publisher and references no `NPM_TOKEN` secret
