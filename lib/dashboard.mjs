// Generate a navigable overview of the openspec/ tree: active changes with task
// progress, the capability catalog with requirement counts, and archived history.
// Deterministic and idempotent; computed from the vault with node:fs, no OpenSpec
// CLI. Pure helpers are exported for tests; bin/cli.mjs dispatches dashboard().

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveArtifact } from "./backfill.mjs";
import { requirementHeading, stripFrontmatter } from "./archive.mjs";
import { featureEnabled } from "./features.mjs";

export class DashboardError extends Error {}

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");

// Recursive .md collector (duplicated per module by convention — no shared helper).
function walkMd(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkMd(p));
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// Task counts for a change's tasks.md. Mirrors archive.taskState's completion
// rule (>=1 done and zero open) but also returns the underlying counts.
function taskProgress(tasksPath) {
  if (!fs.existsSync(tasksPath)) return { done: 0, open: 0, total: 0, complete: false };
  const t = fs.readFileSync(tasksPath, "utf8");
  const done = (t.match(/- \[x\]/gi) || []).length;
  const open = (t.match(/- \[ \]/g) || []).length;
  return { done, open, total: done + open, complete: done >= 1 && open === 0 };
}

// Count "### Requirement:" headers in a main spec (reuses the spec-block primitive).
function countRequirements(specText) {
  return stripFrontmatter(specText)
    .split("\n")
    .filter((l) => requirementHeading(l) !== null).length;
}

const byKey = (key) => (a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0);

// Discover changes under openspec/changes. Returns { active, archived }, each
// sorted deterministically (active by id, archived by dated dir name).
export function collectChanges(root) {
  const changesDir = path.join(root, "openspec", "changes");
  const active = [];
  const archived = [];
  if (fs.existsSync(changesDir)) {
    for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
      if (!ent.isDirectory() || ent.name === "archive") continue;
      const id = ent.name;
      const dir = path.join(changesDir, id);
      const prog = taskProgress(path.join(dir, "tasks.md"));
      active.push({
        id,
        done: prog.done,
        open: prog.open,
        total: prog.total,
        complete: prog.complete,
        hasProposal: fs.existsSync(path.join(dir, "proposal.md")),
      });
    }
  }
  const archiveDir = path.join(changesDir, "archive");
  if (fs.existsSync(archiveDir)) {
    for (const ent of fs.readdirSync(archiveDir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const m = ent.name.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
      archived.push({
        dir: ent.name,
        id: m ? m[2] : ent.name,
        date: m ? m[1] : null,
        hasProposal: fs.existsSync(path.join(archiveDir, ent.name, "proposal.md")),
      });
    }
  }
  active.sort(byKey("id"));
  archived.sort(byKey("dir"));
  return { active, archived };
}

// Capability catalog: every main spec with its requirement count, sorted by id.
export function collectSpecs(root) {
  const openspecDir = path.join(root, "openspec");
  const specs = [];
  for (const file of walkMd(path.join(openspecDir, "specs"))) {
    const rel = path.relative(openspecDir, file).split(path.sep).join("/");
    const art = deriveArtifact(rel);
    if (!art || art.kind !== "spec") continue;
    specs.push({
      capability: art.capability,
      requirementCount: countRequirements(fs.readFileSync(file, "utf8")),
    });
  }
  specs.sort(byKey("capability"));
  return specs;
}

function changeItem(c) {
  const label = c.hasProposal ? `[[changes/${c.id}/proposal|${c.id}]]` : c.id;
  if (c.total === 0) return `- ${label} — no tasks`;
  const status = c.complete ? "complete" : "in progress";
  return `- ${label} — ${c.done}/${c.total} tasks, ${status}`;
}

function archiveItem(a) {
  const label = a.hasProposal ? `[[changes/archive/${a.dir}/proposal|${a.id}]]` : a.id;
  return a.date ? `- ${label} — ${a.date}` : `- ${label}`;
}

function specItem(s) {
  const plural = s.requirementCount === 1 ? "" : "s";
  return `- [[specs/${s.capability}/spec|${s.capability}]] — ${s.requirementCount} requirement${plural}`;
}

// Render the dashboard note from collected data. Deterministic: identical input
// yields byte-identical output.
export function renderDashboard({ active = [], archived = [], specs = [] } = {}) {
  const out = [
    "---",
    "type: dashboard",
    "tags: [openspec, type/dashboard]",
    'aliases: ["openspec dashboard"]',
    "---",
    "",
    "# OpenSpec Dashboard",
    "",
    "<!-- Generated by `openspec-obsidian dashboard`. Re-run to refresh; do not edit by hand. -->",
    "",
    "## Active changes",
    "",
  ];
  if (active.length === 0) out.push("_No active changes._");
  else for (const c of active) out.push(changeItem(c));

  out.push("", "## Capabilities", "");
  if (specs.length === 0) out.push("_No capabilities yet._");
  else for (const s of specs) out.push(specItem(s));

  out.push("", "## Archive", "");
  if (archived.length === 0) out.push("_Nothing archived yet._");
  else for (const a of archived) out.push(archiveItem(a));

  return out.join("\n") + "\n";
}

// Write openspec/dashboard.md (always regenerated) and seed openspec/dashboard.base
// from the shipped asset when absent (overwritten only with force). Both live in
// the tracked vault body, never under the gitignored openspec/.obsidian/.
// Returns { md, written, skipped } (openspec-relative paths). dryRun writes nothing.
export function dashboard(root = process.cwd(), { dryRun = false, force = false } = {}) {
  if (!featureEnabled(root, "dashboard")) {
    throw new DashboardError(
      "ERROR: dashboard feature is disabled \u2014 add 'features:' with 'dashboard: true' to openspec/obsidian.yaml to enable it",
    );
  }
  const openspecDir = path.join(root, "openspec");
  if (!fs.existsSync(openspecDir)) {
    throw new DashboardError(`ERROR: no openspec/ directory under ${root}`);
  }

  const { active, archived } = collectChanges(root);
  const specs = collectSpecs(root);
  const md = renderDashboard({ active, archived, specs });

  const written = [];
  const skipped = [];

  const mdPath = path.join(openspecDir, "dashboard.md");
  if (dryRun) {
    console.log("DASHBOARD openspec/dashboard.md (dry-run, not written):\n");
    console.log(md);
  } else {
    fs.writeFileSync(mdPath, md);
    console.log("WROTE openspec/dashboard.md");
    written.push("dashboard.md");
  }

  const basePath = path.join(openspecDir, "dashboard.base");
  const baseExists = fs.existsSync(basePath);
  if (baseExists && !force) {
    console.log("SKIP openspec/dashboard.base (exists; use --force)");
    skipped.push("dashboard.base");
  } else if (dryRun) {
    console.log(
      `DASHBOARD openspec/dashboard.base (dry-run, would ${baseExists ? "overwrite" : "create"})`,
    );
  } else {
    fs.copyFileSync(path.join(ASSETS, "dashboard.base"), basePath);
    console.log("WROTE openspec/dashboard.base");
    written.push("dashboard.base");
  }

  return { md, written, skipped };
}

// Read-only staleness gate for the `check` command. No-op when the dashboard
// feature is disabled. When enabled, regenerate the note in memory and throw
// DashboardError (naming the remedy) if openspec/dashboard.md is missing or
// differs after newline normalization. Writes nothing.
export function verifyDashboard(root = process.cwd()) {
  if (!featureEnabled(root, "dashboard")) return;

  const { active, archived } = collectChanges(root);
  const specs = collectSpecs(root);
  const expected = renderDashboard({ active, archived, specs });

  const mdPath = path.join(root, "openspec", "dashboard.md");
  const norm = (s) => s.replace(/\r\n/g, "\n");
  const remedy = "run: openspec-obsidian dashboard";
  if (!fs.existsSync(mdPath)) {
    throw new DashboardError(`ERROR: openspec/dashboard.md is missing \u2014 ${remedy}`);
  }
  if (norm(fs.readFileSync(mdPath, "utf8")) !== norm(expected)) {
    throw new DashboardError(`ERROR: openspec/dashboard.md is stale \u2014 ${remedy}`);
  }
}
