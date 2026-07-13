// Tests for lib/init.mjs: focused on the feature-toggle seeding contract —
// seed openspec/obsidian.yaml when absent, never overwrite it (even with --force).
// Fixture trees are built in fs.mkdtempSync temp dirs.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { init } from "../lib/init.mjs";

const ASSET_TOGGLE = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "obsidian.yaml"),
  "utf8",
);

function mkRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "opsx-init-"));
  // init requires an existing OpenSpec project (openspec/config.yaml).
  fs.mkdirSync(path.join(root, "openspec"), { recursive: true });
  fs.writeFileSync(path.join(root, "openspec", "config.yaml"), "project:\n  name: test\n");
  return root;
}

function readToggle(root) {
  return fs.readFileSync(path.join(root, "openspec", "obsidian.yaml"), "utf8");
}

test("init seeds openspec/obsidian.yaml with all features off when absent", (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  init(root);
  assert.equal(readToggle(root), ASSET_TOGGLE, "seeded toggle matches the shipped asset");
  assert.match(ASSET_TOGGLE, /^features:\s*$/m, "asset has a features: block");
  assert.match(ASSET_TOGGLE, /dashboard:\s*false/, "optional features default off");
});

test("init never overwrites an existing toggle file, even with --force", (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const custom = "features:\n  dashboard: true\n  # my choices\n";
  fs.writeFileSync(path.join(root, "openspec", "obsidian.yaml"), custom);

  init(root, { force: true });
  assert.equal(readToggle(root), custom, "locally edited toggle left byte-identical under --force");
});
