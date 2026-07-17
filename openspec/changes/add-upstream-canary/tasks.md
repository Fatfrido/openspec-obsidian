---
type: tasks
change: add-upstream-canary
tags: [openspec, type/tasks, capability/canary]
aliases: ["add-upstream-canary tasks"]
---

## 1. CI wiring

- [ ] 1.1 Add a `canary` job to `.github/workflows/ci.yml`: checkout, `actions/setup-node@v4` at `node-version: 20`, `npm install -g @fission-ai/openspec@latest`, `openspec --version`, then `openspec validate --all --strict --no-interactive`; no `continue-on-error` — verify: `node -e "require('node:fs').readFileSync('.github/workflows/ci.yml','utf8').includes('openspec@latest') || process.exit(1)"`
- [ ] 1.2 Add a workflow-level `schedule: - cron: '0 6 * * 1'` trigger alongside the existing `pull_request`/`push` triggers, so `canary` also runs weekly (Monday 06:00 UTC) with no PR or push activity — verify: `node -e "require('node:fs').readFileSync('.github/workflows/ci.yml','utf8').includes(\"cron: '0 6 * * 1'\") || process.exit(1)"`
- [ ] 1.3 Confirm `canary` sets no `continue-on-error` anywhere in its step list and depends on nothing (`specs` stays independent and authoritative) — verify: `node -e "const s=require('node:fs').readFileSync('.github/workflows/ci.yml','utf8'); const m=s.match(/canary:[\s\S]*?(?=\n  \w+:\n|$)/); (m && !m[0].includes('continue-on-error')) || process.exit(1)"` — note: YAML job behavior itself cannot be fully unit-tested from Node; final confirmation is a `workflow_dispatch`/PR run showing the `canary` job appears, installs `@latest`, and runs to completion (red or green) independent of `specs`.

## 2. Docs

- [ ] 2.1 Add one sentence to README's CI-snippet/compatibility section documenting the `canary` job and the currently verified version range (`1.4.1` pinned, `1.6.0` canary-verified 2026-07-17) — verify: `node -e "const s=require('node:fs').readFileSync('README.md','utf8'); (s.includes('canary') && s.includes('1.6.0')) || process.exit(1)"`

## 3. Validation

- [ ] 3.1 Validate the new `canary` change artifacts with the pinned CLI — verify: `npm run opsx:validate`
</content>
<parameter name="i">Create tasks