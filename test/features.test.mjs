// Tests for lib/features.mjs: the optional-feature toggle reader.
// Fixture trees are built in fs.mkdtempSync temp dirs; every disabled/enabled
// path plus the malformed-entry hard error is asserted.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readFeatures, featureEnabled, FeaturesError } from "../lib/features.mjs";

function mkRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "opsx-features-"));
}

function writeConfig(root, content) {
  fs.mkdirSync(path.join(root, "openspec"), { recursive: true });
  fs.writeFileSync(path.join(root, "openspec", "obsidian.yaml"), content);
}

test("absent file means every feature disabled", (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(readFeatures(root), {});
  assert.equal(featureEnabled(root, "dashboard"), false);
});

test("absent features: key means disabled", (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeConfig(root, "# no features block here\nother: value\n");
  assert.deepEqual(readFeatures(root), {});
  assert.equal(featureEnabled(root, "dashboard"), false);
});

test("dashboard: true is reported enabled", (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeConfig(root, "features:\n  dashboard: true\n");
  assert.equal(featureEnabled(root, "dashboard"), true);
});

test("dashboard: false is reported disabled", (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeConfig(root, "features:\n  dashboard: false\n");
  assert.equal(featureEnabled(root, "dashboard"), false);
});

test("unknown feature names are kept but do not affect known ones", (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeConfig(root, "features:\n  future-thing: true\n  dashboard: true\n");
  assert.deepEqual(readFeatures(root), { "future-thing": true, dashboard: true });
  assert.equal(featureEnabled(root, "dashboard"), true);
  assert.equal(featureEnabled(root, "nonexistent"), false);
});

test("blank lines and comments under features: are ignored", (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeConfig(root, "features:\n  # dashboard overview\n\n  dashboard: true\n");
  assert.equal(featureEnabled(root, "dashboard"), true);
});

test("a dedented line ends the features: block", (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeConfig(root, "features:\n  dashboard: true\nother: value\n");
  assert.deepEqual(readFeatures(root), { dashboard: true });
});

test("malformed entry under features: throws FeaturesError naming the file", (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeConfig(root, "features:\n  dashboard: yes\n");
  assert.throws(() => readFeatures(root), (err) => {
    assert.ok(err instanceof FeaturesError);
    assert.match(err.message, /openspec\/obsidian\.yaml/);
    return true;
  });
});
