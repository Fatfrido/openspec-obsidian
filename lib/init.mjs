// Install the Obsidian-aware OpenSpec schema, templates, and config rules into
// a target repo. Idempotent: existing files are skipped unless --force.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export class InitError extends Error {}

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");
const GITIGNORE_LINE = "openspec/.obsidian/";

export function init(root, { force = false } = {}) {
  const configPath = path.join(root, "openspec", "config.yaml");
  if (!fs.existsSync(configPath)) {
    throw new InitError(
      "ERROR: not an OpenSpec repo (openspec/config.yaml not found) \u2014 run 'openspec init' first",
    );
  }

  // Schema + templates.
  const copies = [
    ["schema.yaml", "openspec/schemas/spec-driven/schema.yaml"],
    ...["proposal", "design", "tasks", "spec"].map((t) => [
      `templates/${t}.md`,
      `openspec/schemas/spec-driven/templates/${t}.md`,
    ]),
  ];
  for (const [src, relDest] of copies) {
    const dest = path.join(root, ...relDest.split("/"));
    if (fs.existsSync(dest) && !force) {
      console.log(`SKIP ${relDest} (exists; use --force)`);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ASSETS, ...src.split("/")), dest);
    console.log(`WROTE ${relDest}`);
  }

  // Config rules: text-append is safe (rules: is a top-level YAML key);
  // never attempt structured YAML merging.
  const rules = fs.readFileSync(path.join(ASSETS, "config-rules.yaml"), "utf8");
  const config = fs.readFileSync(configPath, "utf8");
  if (/^rules:/m.test(config)) {
    console.log("NOTE: config.yaml already has rules: \u2014 merge the following manually:");
    console.log(rules);
  } else {
    fs.appendFileSync(configPath, "\n" + rules);
    console.log("WROTE openspec/config.yaml (appended rules:)");
  }

  // Keep the vault workspace state untracked.
  const giPath = path.join(root, ".gitignore");
  const gi = fs.existsSync(giPath) ? fs.readFileSync(giPath, "utf8") : "";
  if (gi.split(/\r?\n/).includes(GITIGNORE_LINE)) {
    console.log(`SKIP .gitignore (${GITIGNORE_LINE} already present)`);
  } else {
    const sep = gi.length && !gi.endsWith("\n") ? "\n" : "";
    fs.appendFileSync(giPath, `${sep}${GITIGNORE_LINE}\n`);
    console.log(`WROTE .gitignore (${GITIGNORE_LINE})`);
  }

  console.log(`
Next steps:
  1. openspec-obsidian backfill        # add frontmatter to existing artifacts (README: "Adopt in your repo")
  2. Open openspec/ as an Obsidian vault (.obsidian/ stays untracked).
  3. Add CI gates: openspec-obsidian check + openspec validate --all --strict --no-interactive (README: "CI snippets").
  4. Wire 'openspec-obsidian archive' into your apply flow (README: "Archive: when and how", "Agent/skill integration").`);
}
