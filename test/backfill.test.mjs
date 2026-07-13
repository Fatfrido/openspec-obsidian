// Tests for lib/backfill.mjs: deterministic frontmatter backfill for existing
// OpenSpec artifacts. Fixture trees are built in fs.mkdtempSync temp dirs and
// assertions are golden-string / byte-for-byte on real files.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { backfill, deriveArtifact, generateFrontmatter, BackfillError } from "../lib/backfill.mjs";

// --- fixture helpers -----------------------------------------------------

function mkRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "opsx-backfill-"));
}

function writeFile(root, relPath, content) {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function readFile(root, relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

const SPEC_BODY = `# widgets Specification

## Purpose

Widgets exist.

## Requirements

### Requirement: Widgets render
Widgets SHALL render.

#### Scenario: Renders
- **WHEN** drawn
- **THEN** visible
`;

const PROPOSAL_BODY = `## Why

Widgets need a home.

## What Changes

- Adds widgets.
`;

const DESIGN_BODY = `## Context

Design notes.
`;

const TASKS_BODY = `## 1. Build

- [x] 1.1 Build the widget
`;

const DELTA_BODY = `## ADDED Requirements

### Requirement: Widgets render
Widgets SHALL render.

#### Scenario: Renders
- **WHEN** drawn
- **THEN** visible
`;

// ==========================================================================
// deriveArtifact: path classification
// ==========================================================================

test("deriveArtifact classifies every artifact shape and ignores the rest", () => {
  assert.deepEqual(deriveArtifact("specs/widgets/spec.md"), {
    kind: "spec",
    capability: "widgets",
  });
  assert.deepEqual(deriveArtifact("changes/add-widgets/proposal.md"), {
    kind: "proposal",
    changeId: "add-widgets",
    prefix: "changes/add-widgets/",
  });
  assert.deepEqual(deriveArtifact("changes/add-widgets/specs/widgets/spec.md"), {
    kind: "delta",
    changeId: "add-widgets",
    capability: "widgets",
    prefix: "changes/add-widgets/",
  });
  assert.deepEqual(deriveArtifact("changes/archive/2026-01-02-add-widgets/tasks.md"), {
    kind: "tasks",
    changeId: "add-widgets",
    prefix: "changes/archive/2026-01-02-add-widgets/",
  });
  assert.deepEqual(deriveArtifact("changes/archive/2026-01-02-add-widgets/specs/widgets/spec.md"), {
    kind: "delta",
    changeId: "add-widgets",
    capability: "widgets",
    prefix: "changes/archive/2026-01-02-add-widgets/",
  });
  // Windows separators are normalized.
  assert.deepEqual(deriveArtifact("specs\\widgets\\spec.md"), {
    kind: "spec",
    capability: "widgets",
  });
  // Non-artifacts are ignored.
  assert.equal(deriveArtifact("changes/add-widgets/notes.md"), null);
  assert.equal(deriveArtifact("schemas/spec-driven/templates/proposal.md"), null);
  assert.equal(deriveArtifact("README.md"), null);
});

// ==========================================================================
// (a) bare artifacts get exact expected frontmatter (all five types)
// ==========================================================================

test("a. bare artifacts receive golden frontmatter for all five artifact types", async (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  // Active change: full artifact set.
  writeFile(root, "openspec/specs/widgets/spec.md", SPEC_BODY);
  writeFile(root, "openspec/changes/add-widgets/proposal.md", PROPOSAL_BODY);
  writeFile(root, "openspec/changes/add-widgets/design.md", DESIGN_BODY);
  writeFile(root, "openspec/changes/add-widgets/tasks.md", TASKS_BODY);
  writeFile(root, "openspec/changes/add-widgets/specs/widgets/spec.md", DELTA_BODY);
  // Archived dated change (proposal + tasks + delta; no design.md).
  writeFile(root, "openspec/changes/archive/2026-01-02-add-gizmos/proposal.md", PROPOSAL_BODY);
  writeFile(root, "openspec/changes/archive/2026-01-02-add-gizmos/tasks.md", TASKS_BODY);
  writeFile(root, "openspec/specs/gizmos/spec.md", SPEC_BODY);
  writeFile(root, "openspec/changes/archive/2026-01-02-add-gizmos/specs/gizmos/spec.md", DELTA_BODY);

  const { written, skipped } = backfill(root);
  assert.equal(written.length, 9, "all nine bare artifacts written");
  assert.equal(skipped.length, 0);

  // Main spec.
  assert.equal(
    readFile(root, "openspec/specs/widgets/spec.md"),
    `---
type: spec
title: "widgets spec"
capability: widgets
tags: [openspec, type/spec, capability/widgets]
aliases: ["widgets spec"]
---

${SPEC_BODY}`,
  );

  // Proposal (active change, full sibling set).
  assert.equal(
    readFile(root, "openspec/changes/add-widgets/proposal.md"),
    `---
type: proposal
title: "add-widgets proposal"
change: add-widgets
tags: [openspec, type/proposal, capability/widgets]
aliases: ["add-widgets proposal"]
design: "[[changes/add-widgets/design|add-widgets design]]"
tasks: "[[changes/add-widgets/tasks|add-widgets tasks]]"
specs: ["[[changes/add-widgets/specs/widgets/spec|add-widgets widgets delta]]"]
---

${PROPOSAL_BODY}`,
  );

  // Design.
  assert.equal(
    readFile(root, "openspec/changes/add-widgets/design.md"),
    `---
type: design
title: "add-widgets design"
change: add-widgets
tags: [openspec, type/design, capability/widgets]
aliases: ["add-widgets design"]
---

${DESIGN_BODY}`,
  );

  // Tasks.
  assert.equal(
    readFile(root, "openspec/changes/add-widgets/tasks.md"),
    `---
type: tasks
title: "add-widgets tasks"
change: add-widgets
tags: [openspec, type/tasks, capability/widgets]
aliases: ["add-widgets tasks"]
---

${TASKS_BODY}`,
  );

  // Delta.
  assert.equal(
    readFile(root, "openspec/changes/add-widgets/specs/widgets/spec.md"),
    `---
type: spec-delta
title: "add-widgets widgets delta"
change: add-widgets
capability: widgets
tags: [openspec, type/spec, capability/widgets]
aliases: ["add-widgets widgets delta"]
main_spec: "[[specs/widgets/spec|widgets spec]]"
---

${DELTA_BODY}`,
  );

  // Archived change: prefix is the dated archive path, id has the date stripped,
  // and the missing design.md means no design: key.
  const archProposal = readFile(root, "openspec/changes/archive/2026-01-02-add-gizmos/proposal.md");
  assert.equal(
    archProposal,
    `---
type: proposal
title: "add-gizmos proposal"
change: add-gizmos
tags: [openspec, type/proposal, capability/gizmos]
aliases: ["add-gizmos proposal"]
tasks: "[[changes/archive/2026-01-02-add-gizmos/tasks|add-gizmos tasks]]"
specs: ["[[changes/archive/2026-01-02-add-gizmos/specs/gizmos/spec|add-gizmos gizmos delta]]"]
---

${PROPOSAL_BODY}`,
  );
  assert.ok(!archProposal.includes("design:"), "no design key for a change without design.md");

  // Archived delta.
  assert.equal(
    readFile(root, "openspec/changes/archive/2026-01-02-add-gizmos/specs/gizmos/spec.md"),
    `---
type: spec-delta
title: "add-gizmos gizmos delta"
change: add-gizmos
capability: gizmos
tags: [openspec, type/spec, capability/gizmos]
aliases: ["add-gizmos gizmos delta"]
main_spec: "[[specs/gizmos/spec|gizmos spec]]"
---

${DELTA_BODY}`,
  );
});

// ==========================================================================
// (b) idempotency: second run writes nothing
// ==========================================================================

test("b. a second backfill run is a no-op (zero writes, bytes identical)", async (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  writeFile(root, "openspec/specs/widgets/spec.md", SPEC_BODY);
  writeFile(root, "openspec/changes/add-widgets/proposal.md", PROPOSAL_BODY);
  writeFile(root, "openspec/changes/add-widgets/tasks.md", TASKS_BODY);
  writeFile(root, "openspec/changes/add-widgets/specs/widgets/spec.md", DELTA_BODY);

  const first = backfill(root);
  assert.equal(first.written.length, 4);

  const snapshot = new Map(
    first.written.map((rel) => [rel, readFile(root, path.posix.join("openspec", rel))]),
  );

  const second = backfill(root);
  assert.equal(second.written.length, 0, "second run writes nothing");
  assert.equal(second.skipped.length, 4, "second run skips everything");
  for (const [rel, bytes] of snapshot) {
    assert.equal(readFile(root, path.posix.join("openspec", rel)), bytes, `${rel} unchanged`);
  }
});

// ==========================================================================
// (c) existing frontmatter untouched byte-for-byte
// ==========================================================================

test("c. a file with existing frontmatter is never modified", async (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const custom = `---
type: spec
title: "widgets spec"
capability: widgets
tags: [openspec, type/spec, capability/widgets, custom/handmade]
aliases: ["widgets spec", "my widgets"]
---

${SPEC_BODY}`;
  writeFile(root, "openspec/specs/widgets/spec.md", custom);

  const { written, skipped } = backfill(root);
  assert.equal(written.length, 0);
  assert.deepEqual(skipped, ["specs/widgets/spec.md"]);
  assert.equal(readFile(root, "openspec/specs/widgets/spec.md"), custom, "byte-for-byte untouched");
});

// ==========================================================================
// (d) proposal in a change without design.md omits the design: key
// ==========================================================================

test("d. proposal omits design:/tasks: keys when the sibling files are absent", async (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  writeFile(root, "openspec/specs/widgets/spec.md", SPEC_BODY);
  writeFile(root, "openspec/changes/add-widgets/proposal.md", PROPOSAL_BODY);
  writeFile(root, "openspec/changes/add-widgets/tasks.md", TASKS_BODY);
  writeFile(root, "openspec/changes/add-widgets/specs/widgets/spec.md", DELTA_BODY);
  // no design.md

  backfill(root);
  const proposal = readFile(root, "openspec/changes/add-widgets/proposal.md");
  assert.ok(!proposal.includes("design:"), "design key omitted");
  assert.ok(proposal.includes('tasks: "[[changes/add-widgets/tasks|add-widgets tasks]]"'));

  // Direct generateFrontmatter check: no siblings at all -> only base keys.
  const fm = generateFrontmatter(
    { kind: "proposal", changeId: "x", prefix: "changes/x/" },
    { design: false, tasks: false, deltaCaps: [] },
  );
  assert.equal(
    fm,
    `---
type: proposal
title: "x proposal"
change: x
tags: [openspec, type/proposal]
aliases: ["x proposal"]
---
`,
  );
});

// ==========================================================================
// (e) broken-link detection: delta without a main spec errors
// ==========================================================================

test("e. a delta whose capability has no main spec fails link verification", async (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  // Delta for "orphans", but openspec/specs/orphans/spec.md does not exist.
  writeFile(root, "openspec/changes/add-orphans/specs/orphans/spec.md", DELTA_BODY);

  assert.throws(
    () => backfill(root),
    (err) => {
      assert.ok(err instanceof BackfillError);
      assert.match(err.message, /specs\/orphans\/spec/);
      assert.match(err.message, /sync/i, "message tells the user to sync first");
      return true;
    },
  );
});

// ==========================================================================
// multi-delta change: multiple specs entries and capability tags
// ==========================================================================

test("multi-delta change produces one specs entry and capability tag per delta", async (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  writeFile(root, "openspec/specs/widgets/spec.md", SPEC_BODY);
  writeFile(root, "openspec/specs/gizmos/spec.md", SPEC_BODY);
  writeFile(root, "openspec/changes/add-both/proposal.md", PROPOSAL_BODY);
  writeFile(root, "openspec/changes/add-both/design.md", DESIGN_BODY);
  writeFile(root, "openspec/changes/add-both/tasks.md", TASKS_BODY);
  writeFile(root, "openspec/changes/add-both/specs/widgets/spec.md", DELTA_BODY);
  writeFile(root, "openspec/changes/add-both/specs/gizmos/spec.md", DELTA_BODY);

  backfill(root);
  const proposal = readFile(root, "openspec/changes/add-both/proposal.md");
  assert.ok(
    proposal.includes("tags: [openspec, type/proposal, capability/gizmos, capability/widgets]"),
    "one capability tag per delta, sorted",
  );
  assert.ok(
    proposal.includes(
      'specs: ["[[changes/add-both/specs/gizmos/spec|add-both gizmos delta]]", "[[changes/add-both/specs/widgets/spec|add-both widgets delta]]"]',
    ),
    "one specs entry per delta, sorted",
  );
  const design = readFile(root, "openspec/changes/add-both/design.md");
  assert.ok(design.includes("tags: [openspec, type/design, capability/gizmos, capability/widgets]"));
});

// ==========================================================================
// greenfield: empty openspec tree is a no-op
// ==========================================================================

test("an empty specs/changes tree is a summarized no-op", async (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "openspec"), { recursive: true });

  const { written, skipped } = backfill(root);
  assert.equal(written.length, 0);
  assert.equal(skipped.length, 0);
});

// ==========================================================================
// dry-run: reports plan, writes nothing
// ==========================================================================

test("dry-run reports planned writes without touching any file", async (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  writeFile(root, "openspec/specs/widgets/spec.md", SPEC_BODY);

  const { written } = backfill(root, { dryRun: true });
  assert.deepEqual(written, ["specs/widgets/spec.md"], "planned write reported");
  assert.equal(readFile(root, "openspec/specs/widgets/spec.md"), SPEC_BODY, "file untouched");
});

// ==========================================================================
// title upsert: annotated artifact without a title gains exactly the title
// ==========================================================================

const ANNOTATED_NO_TITLE = `---
type: spec
capability: widgets
tags: [openspec, type/spec, capability/widgets]
aliases: ["widgets spec"]
---

${SPEC_BODY}`;

test("title upsert: annotated artifact without a title gains exactly one line", async (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  writeFile(root, "openspec/specs/widgets/spec.md", ANNOTATED_NO_TITLE);

  const { written, skipped } = backfill(root);
  assert.deepEqual(written, ["specs/widgets/spec.md"], "upsert counts as a write");
  assert.equal(skipped.length, 0);

  const after = readFile(root, "openspec/specs/widgets/spec.md");
  // Byte-for-byte: exactly the title line inserted after `type:`.
  assert.equal(
    after,
    `---
type: spec
title: "widgets spec"
capability: widgets
tags: [openspec, type/spec, capability/widgets]
aliases: ["widgets spec"]
---

${SPEC_BODY}`,
  );

  // The diff is exactly one line: the title.
  const before = ANNOTATED_NO_TITLE.split("\n");
  const now = after.split("\n");
  assert.equal(now.length, before.length + 1, "exactly one line added");
  assert.deepEqual(now.slice(0, 2).concat(now.slice(3)), before, "only the title line is new");
  assert.equal(now[2], 'title: "widgets spec"');

  // Second run is byte-identical (title now present -> skipped).
  const second = backfill(root);
  assert.equal(second.written.length, 0, "second run writes nothing");
  assert.deepEqual(second.skipped, ["specs/widgets/spec.md"], "second run skips");
  assert.equal(readFile(root, "openspec/specs/widgets/spec.md"), after, "byte-identical");
});

test("title upsert: --dry-run reports the upsert without writing", async (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  writeFile(root, "openspec/specs/widgets/spec.md", ANNOTATED_NO_TITLE);

  const { written } = backfill(root, { dryRun: true });
  assert.deepEqual(written, ["specs/widgets/spec.md"], "planned upsert reported");
  assert.equal(
    readFile(root, "openspec/specs/widgets/spec.md"),
    ANNOTATED_NO_TITLE,
    "file untouched under dry-run",
  );
});

test("title upsert: no type: line inserts the title after the opening fence", async (t) => {
  const root = mkRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  // A spec whose frontmatter has no type: key at all.
  const noType = `---
capability: widgets
aliases: ["widgets spec"]
---

${SPEC_BODY}`;
  writeFile(root, "openspec/specs/widgets/spec.md", noType);

  backfill(root);
  assert.equal(
    readFile(root, "openspec/specs/widgets/spec.md"),
    `---
title: "widgets spec"
capability: widgets
aliases: ["widgets spec"]
---

${SPEC_BODY}`,
    "title inserted immediately after the opening fence",
  );
});
