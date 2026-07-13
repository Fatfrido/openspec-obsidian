---
type: tasks
change: add-feature-toggles
tags: [openspec, type/tasks, capability/features, capability/dashboard, capability/check, capability/init]
aliases: ["add-feature-toggles tasks"]
---

## 1. Feature toggle config

- [ ] 1.1 Add `assets/obsidian.yaml` (top-level `features:` map with every optional feature set to `false`, brief usage comment) and `lib/features.mjs` exporting `FeaturesError`, `readFeatures(root)`, and `featureEnabled(root, name)`: absent file or absent `features:` key returns no enabled features; entries must match `name: true|false`; unknown names are kept but harmless; any other line under `features:` throws `FeaturesError` naming `openspec/obsidian.yaml`. Verify: `npm test`
- [ ] 1.2 Add `test/features.test.mjs` covering: absent file (disabled), `dashboard: true` (enabled), `dashboard: false` (disabled), unknown feature name ignored, malformed entry throws `FeaturesError` with a message regex naming the file. Verify: `node --test test/features.test.mjs`

## 2. Gate the dashboard command

- [ ] 2.1 In `lib/dashboard.mjs`, make `dashboard()` throw `DashboardError` when `featureEnabled(root, "dashboard")` is false, with a message naming `openspec/obsidian.yaml` and the `dashboard: true` setting; commit this repo's own `openspec/obsidian.yaml` with `dashboard: true` in the same task so dogfooding keeps working. Verify: `npm test && node bin/cli.mjs dashboard --dry-run`
- [ ] 2.2 Extend `test/dashboard.test.mjs`: disabled (no toggle file) throws `DashboardError` matching a message regex; enabled fixture writes `openspec/dashboard.md` as before (existing golden tests updated to enable the feature). Verify: `node --test test/dashboard.test.mjs`

## 3. Staleness gate in check

- [ ] 3.1 In `lib/dashboard.mjs`, add exported `verifyDashboard(root)`: no-op when the feature is disabled; when enabled, regenerate via `renderDashboard` in memory and throw `DashboardError` with remedy `run: openspec-obsidian dashboard` when `openspec/dashboard.md` is missing or differs after newline normalization; writes nothing. In `bin/cli.mjs`, make the `check` command call `check(root)` then `verifyDashboard(root)`. Verify: `npm test && node bin/cli.mjs check`
- [ ] 3.2 Extend `test/dashboard.test.mjs` for `verifyDashboard`: disabled+stale passes, enabled+fresh passes, enabled+stale throws, enabled+missing throws (message regex each). Verify: `node --test test/dashboard.test.mjs`

## 4. Seed toggles in init

- [ ] 4.1 In `lib/init.mjs`, copy `assets/obsidian.yaml` to `openspec/obsidian.yaml` when absent (log the write); when present, skip and leave the file byte-identical even with `--force`. Verify: `npm test`
- [ ] 4.2 Add `test/init.test.mjs` covering: fresh run seeds `openspec/obsidian.yaml` (golden content), second run with `--force` leaves a locally edited file byte-identical. Verify: `node --test test/init.test.mjs`

## 5. Repo dogfood, CI, and docs

- [ ] 5.1 Remove the dashboard regeneration and drift-diff steps from `.github/workflows/ci.yml` (the `check` staleness gate now covers freshness). Verify: `node bin/cli.mjs check` exits 0 locally with a fresh dashboard
- [ ] 5.2 Update `README.md` (new "Optional features" section: the toggle file, opt-in default, enabling the dashboard, migration note for existing dashboard users; simplify the CI snippet to `check` only), `AGENTS.md` (architecture, commands, SDLC step 5 made conditional on the toggle, CI gate description), and the `USAGE` text in `bin/cli.mjs` (dashboard line mentions the toggle). Verify: `npm test`
