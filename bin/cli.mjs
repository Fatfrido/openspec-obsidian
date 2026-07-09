#!/usr/bin/env node
// openspec-obsidian: navigate OpenSpec artifacts as an Obsidian vault.
// Commands: init | backfill | archive | check. Exit codes: 0 ok, 1 failure, 2 usage.

import path from "node:path";
import process from "node:process";
import { archive, check, ArchiveError } from "../lib/archive.mjs";
import { backfill, BackfillError } from "../lib/backfill.mjs";
import { init, InitError } from "../lib/init.mjs";

const USAGE = `Usage: openspec-obsidian <command> [options]

Commands:
  init      install the Obsidian-aware schema, templates, and config rules into an OpenSpec repo
  backfill  add Obsidian frontmatter to existing bare artifacts (idempotent)
  archive   sync delta specs into openspec/specs/ and move every all-tasks-complete change
            to openspec/changes/archive/YYYY-MM-DD-<id>/, rewriting its wikilinks
  check     exit 1 if any change is complete (all tasks checked) but not archived (CI gate)

Options:
  --root <dir>  repo root to operate on (default: current directory)
  --dry-run     backfill: print planned actions, write nothing
  --force       init: overwrite existing schema/template files
`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") {
      args.root = argv[++i];
      if (args.root === undefined) return null;
    } else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a.startsWith("-")) return null;
    else args._.push(a);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args || args._.length !== 1 || !["init", "backfill", "archive", "check"].includes(args._[0])) {
  console.error(USAGE);
  process.exit(2);
}

const root = path.resolve(args.root ?? process.cwd());
try {
  const cmd = args._[0];
  if (cmd === "init") init(root, { force: !!args.force });
  else if (cmd === "backfill") backfill(root, { dryRun: !!args.dryRun });
  else if (cmd === "archive") archive(root);
  else check(root);
} catch (err) {
  const known = err instanceof ArchiveError || err instanceof BackfillError || err instanceof InitError;
  console.error(known ? err.message : err);
  process.exit(1);
}
