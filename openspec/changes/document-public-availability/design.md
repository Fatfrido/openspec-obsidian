---
type: design
change: document-public-availability
tags: [openspec, type/design, capability/release]
aliases: ["document-public-availability design"]
---

## Context

The repo is now public and `openspec-obsidian@0.1.0` can publish to the public npm registry via `.github/workflows/publish.yml`, which authenticates with OIDC Trusted Publishing (no secret), gates on the release tag matching `package.json`, runs the tests, and emits provenance. The README predates this state: it says "No npm release yet," leads every example with `npx github:Fatfrido/openspec-obsidian`, and its Releasing section documents an `NPM_TOKEN` Automation-token flow the workflow does not use. No spec covers release/distribution — the four existing capabilities (`init`, `backfill`, `archive`, `check`) are CLI-command behaviors only.

## Goals / Non-Goals

**Goals:**
- A README that matches the public, published reality and the actual `publish.yml` auth model.
- A minimal `release` spec that states the release contract exactly as implemented, so CI `validate --strict` pins the docs to behavior.

**Non-Goals:**
- No change to `publish.yml` or any CLI behavior — the workflow already conforms; this change documents, it does not alter code.
- No new release tooling, badge service, or automation beyond what already exists.

## Decisions

- **npm is the canonical install; `github:` is the pin-a-commit fallback.** With the package public, `npx openspec-obsidian` is the friction-free path. Keep exactly one `npx github:Fatfrido/openspec-obsidian#<sha>` example — for pinning a commit / running ahead of a release — and place it in the CI snippet where reproducibility matters.
- **The Releasing section mirrors `publish.yml`.** Document the one-time Trusted Publisher setup on npmjs.com (provider GitHub Actions, repo `Fatfrido/openspec-obsidian`, workflow `publish.yml`), the tag-vs-version gate, and automatic provenance; delete the `NPM_TOKEN` instructions entirely. Leaving a token flow documented would send maintainers to configure a secret the workflow ignores.
- **New `release` capability, not a modified one.** No existing spec covers publishing/installation, and release is orthogonal to the four command capabilities — so it is a genuinely new capability, not a parallel rename of an existing one (satisfies the "don't mint parallel capabilities" rule because there is no existing counterpart).
- **Badges and Contributing are additive, static, and vendor-standard.** shields.io npm-version, CI-status, and license badges plus a one-line issues/Contributing pointer — public-repo table stakes with no runtime cost.

## Risks / Trade-offs

- **Docs drifting from `publish.yml` again** → the `release` spec plus CI `validate --strict` now pin the contract, so a future auth change must touch the spec, surfacing the stale doc in review.
- **Two install idioms may confuse readers** → lead unambiguously with npm and label the `github:` form as "pin a commit / run unreleased," so the fallback reads as intentional rather than redundant.
