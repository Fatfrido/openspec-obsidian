---
type: tasks
title: "document-public-availability tasks"
change: document-public-availability
tags: [openspec, type/tasks, capability/release]
aliases: ["document-public-availability tasks"]
---

## 1. README install & examples

- [x] 1.1 Rewrite the **Install** section so `npx openspec-obsidian` / `npm install --save-dev openspec-obsidian` is canonical, drop "No npm release yet," and keep one `npx github:Fatfrido/openspec-obsidian#<sha>` line labelled as the pin-a-commit / run-unreleased fallback — verify: `grep -n "No npm release yet" README.md` returns nothing
- [x] 1.2 Switch the primary command examples in **Adopt in your repo**, **Archive: when and how**, and **Agent/skill integration** to the bare `openspec-obsidian <cmd>` form, keeping the `github:` form only in the **CI snippets** block for commit pinning — verify: `grep -n "github:Fatfrido/openspec-obsidian" README.md` shows matches only in the Install fallback and the CI snippet
- [x] 1.3 Add npm-version, CI-status, and license badges under the title and a one-line Contributing/issues pointer — verify: `grep -n "img.shields.io" README.md` shows the badges

## 2. README releasing section

- [x] 2.1 Rewrite **Releasing (maintainers)** to document OIDC Trusted Publishing (one-time Trusted Publisher setup on npmjs.com — provider GitHub Actions, repo `Fatfrido/openspec-obsidian`, workflow `publish.yml`), the release-tag-vs-`package.json`-version gate, and automatic provenance; remove every `NPM_TOKEN` instruction — verify: `grep -n "NPM_TOKEN" README.md` returns nothing and `grep -n "Trusted Publishing" README.md` matches
- [x] 2.2 Cross-check the rewritten section against `.github/workflows/publish.yml` (release + `workflow_dispatch` triggers, tag check, `npm publish --access public`) so no claim contradicts the workflow — verify: read `publish.yml` and confirm each README statement maps to a workflow step

## 3. Validate the change

- [x] 3.1 Confirm the change validates against the new `release` spec — verify: `openspec validate document-public-availability --strict --no-interactive` reports valid and `npm test` stays green (no code touched)
- [x] 3.2 Confirm the Obsidian frontmatter layer is complete on all change artifacts — verify: `node bin/cli.mjs backfill --dry-run` lists them as `SKIP … (has frontmatter)`, never "would add"
