---
type: tasks
title: "adopt-openspec-obsidian tasks"
change: adopt-openspec-obsidian
tags: [openspec, type/tasks, capability/init, capability/backfill, capability/archive, capability/check]
aliases: ["adopt-openspec-obsidian tasks"]
---

## 1. Bootstrap

- [x] 1.1 Scaffold OpenSpec — verify: `openspec init --force` then `test -f openspec/config.yaml`
- [x] 1.2 Install Obsidian conventions — verify: `node bin/cli.mjs init` then `test -f openspec/schemas/spec-driven/schema.yaml`
- [x] 1.3 Add project context to config — verify: `grep -q '^context:' openspec/config.yaml`

## 2. Specs

- [x] 2.1 Author delta specs for init/backfill/archive/check — verify: `openspec validate adopt-openspec-obsidian --strict --no-interactive`
- [x] 2.2 Author proposal, design, and tasks with Obsidian frontmatter — verify: `node bin/cli.mjs backfill --dry-run` reports nothing to add

## 3. Integrate

- [x] 3.1 Sync + archive this change on the branch — verify: `node bin/cli.mjs archive` then `openspec validate --all --strict --no-interactive`
- [x] 3.2 Gate CI on validation and the archive check — verify: `node bin/cli.mjs check` prints `CHECK OK`
